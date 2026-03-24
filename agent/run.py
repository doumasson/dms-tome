#!/usr/bin/env python3
"""Autonomous Build Agent — config-driven, project-agnostic.
   Point it at any repo with a CLAUDE.md and tasks/todo.md and let it build.
   Uses Playwright screenshots as READ-ONLY visual feedback (if enabled).
   NEVER writes tests."""

import subprocess, json, time, os, sys, signal, datetime, urllib.request
import tempfile
from pathlib import Path

# ─── CONFIG ────────────────────────────────────────────────────────────────────

AGENT_DIR = Path(__file__).parent
CONFIG_PATH = AGENT_DIR / "config.json"

def load_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            return json.load(f)
    return {}

CFG = load_config()

PROJECT_NAME   = CFG.get("project_name", "Project")
REPO_DIR       = Path(os.path.expanduser(CFG.get("repo_dir", "~/project")))
AGENT_BRANCH   = CFG.get("branch", "main")
MODEL          = CFG.get("model", "claude-haiku-4-5-20251001")
MAX_ITERATIONS = CFG.get("max_iterations", 50)
PAUSE_BETWEEN  = CFG.get("pause_between_secs", 10)
DEV_PORT       = CFG.get("dev_port", 5173)
MEMORY_FILES   = CFG.get("memory_files", ["CLAUDE.md", "tasks/todo.md"])
ALLOWED_TOOLS  = CFG.get("allowed_tools", "Edit,Write,Read,Glob,Grep,Bash")
SCREENSHOTS_ON = CFG.get("screenshots_enabled", True)
TELEGRAM_USER  = CFG.get("telegram_user", "")
BUILD_CMD      = CFG.get("build_cmd", "npm run build")

LOG_DIR  = Path.home() / "agent-logs"
SHOT_DIR = Path.home() / "agent-screenshots"
LOG_DIR.mkdir(exist_ok=True)
SHOT_DIR.mkdir(exist_ok=True)
PA_DB = Path.home() / "pa/data/pa.db"


# ─── LOGGING & NOTIFICATIONS ──────────────────────────────────────────────────

def log(msg):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    logfile = LOG_DIR / f"agent-{datetime.date.today()}.log"
    with open(logfile, "a") as f:
        f.write(line + "\n")


def notify(msg):
    token = os.environ.get("PA_TELEGRAM_TOKEN", "")
    if not token or not TELEGRAM_USER:
        return
    try:
        data = json.dumps({"chat_id": TELEGRAM_USER, "text": msg[:4000]}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data, headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        log(f"  ! Telegram failed: {e}")


# ─── SHELL HELPERS ─────────────────────────────────────────────────────────────

def run(cmd, cwd=None, timeout=60):
    try:
        r = subprocess.run(cmd, cwd=cwd or REPO_DIR,
                          capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"
    except Exception as e:
        return -1, "", str(e)


def run_claude(prompt, resume_id=None):
    cmd = [
        "claude", "-p", prompt,
        "--output-format", "json",
        "--max-turns", "200",
        "--dangerously-skip-permissions",
        "--allowedTools", ALLOWED_TOOLS,
        "--model", MODEL,
    ]
    if resume_id:
        cmd += ["--resume", resume_id]
    log("  -> Invoking Claude Code...")
    rc, stdout, stderr = run(cmd, timeout=2400)
    if rc != 0 and not stdout:
        log(f"  X Claude error: {stderr[:300]}")
        return f"ERROR: {stderr[:300]}", None
    try:
        data = json.loads(stdout)
        return data.get("result", stdout), data.get("session_id")
    except json.JSONDecodeError:
        return stdout, None


# ─── MEMORY ────────────────────────────────────────────────────────────────────

async def write_to_memory(run_id, iteration, build_status, screenshot_desc,
                          what_happened, files_changed, succeeded):
    try:
        import aiosqlite
        async with aiosqlite.connect(PA_DB) as db:
            await db.execute(
                """INSERT INTO agent_iterations
                   (run_id, iteration, build_status, screenshot_desc,
                    what_happened, files_changed, succeeded)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (run_id, iteration, build_status, screenshot_desc,
                 what_happened, files_changed, int(succeeded))
            )
            await db.commit()
    except Exception as e:
        log(f"  ! Memory write failed: {e}")


# ─── GIT ───────────────────────────────────────────────────────────────────────

def git_pull():
    run(["git", "checkout", AGENT_BRANCH])
    run(["git", "pull", "origin", AGENT_BRANCH])


def git_commit(msg):
    run(["git", "add", "-A"])
    rc, _, _ = run(["git", "commit", "-m", f"[agent] {msg}"])
    if rc == 0:
        run(["git", "push", "origin", AGENT_BRANCH])
        log(f"  pushed: {msg}")
    else:
        log("  ~ nothing to commit")


# ─── BUILD ─────────────────────────────────────────────────────────────────────

def project_build():
    parts = BUILD_CMD.split()
    rc, out, err = run(parts, timeout=300)
    return rc == 0, (out + "\n" + err)[-1000:]


# ─── PROJECT FILES ─────────────────────────────────────────────────────────────

def read_memory():
    result = []
    for fname in MEMORY_FILES:
        fpath = REPO_DIR / fname
        if fpath.exists():
            content = fpath.read_text(encoding="utf-8", errors="replace")[:3000]
            result.append(f"\n### {fname}\n{content}")
    return "\n".join(result)


def read_todo():
    fpath = REPO_DIR / "tasks" / "todo.md"
    if fpath.exists():
        return fpath.read_text(encoding="utf-8", errors="replace")
    return "(no todo.md found)"


# ─── SCREENSHOTS (read-only visual feedback) ──────────────────────────────────

def take_screenshots(iteration):
    """Spin up dev server, grab a headless screenshot, describe what's on screen.
    The Claude agent CANNOT modify this — it's read-only visual feedback."""
    if not SCREENSHOTS_ON:
        return "Screenshots disabled in config."

    playwright_bin = str(REPO_DIR / "node_modules" / "playwright")
    if not Path(playwright_bin).exists():
        return "Playwright not installed in project — skipping screenshots."

    log("  -> Taking screenshots...")
    shot_dir = SHOT_DIR / f"iter-{iteration:02d}"
    shot_dir.mkdir(exist_ok=True)

    # Write a temporary node script — agent never sees or edits this
    script_content = """
const { chromium } = require('%PLAYWRIGHT%');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const result = { shots: [], errors: [], headings: [], buttons: [], url: '', title: '' };
  try {
    await page.goto('http://localhost:%PORT%', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '%SHOTDIR%/01-landing.png' });
    result.shots.push('01-landing.png');
    result.url = page.url();
    result.title = await page.title();
    result.headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(e => e.textContent.trim()).filter(t => t).slice(0, 10)
    );
    result.buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map(e => e.textContent.trim()).filter(t => t && t.length < 40).slice(0, 20)
    );
    const visErrors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.error,[class*="error"],[class*="Error"]'))
        .map(e => e.textContent.trim()).filter(t => t && t.length < 200)
    );
    result.errors = visErrors;
  } catch(e) { result.errors.push(e.message); }
  finally { await browser.close(); }
  console.log(JSON.stringify(result));
})();
""".replace('%PLAYWRIGHT%', playwright_bin.replace('\\', '/')
   ).replace('%PORT%', str(DEV_PORT)
   ).replace('%SHOTDIR%', str(shot_dir).replace('\\', '/'))

    script_path = Path(tempfile.mktemp(suffix=".js"))
    script_path.write_text(script_content)

    dev_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(DEV_PORT), "--host"],
        cwd=REPO_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    try:
        log("  -> Waiting for dev server...")
        time.sleep(15)
        rc, out, err = run(["node", str(script_path)], cwd=REPO_DIR, timeout=90)
        if rc != 0:
            log(f"  ! Screenshot failed: {err[:200]}")
            return "Screenshots failed — build may have issues"
        try:
            lines = [l for l in out.strip().split('\n') if l.strip()]
            r = json.loads(lines[-1])
        except Exception:
            return "Screenshot parse failed"

        desc = f"Page title: '{r.get('title', '?')}' URL: {r.get('url', '?')}. "
        desc += f"Headings: {r.get('headings', [])}. "
        desc += f"Buttons: {r.get('buttons', [])}. "
        if r.get("errors"):
            desc += f"VISIBLE ERRORS: {r['errors']}. "
        else:
            desc += "No errors detected. "
        log(f"  -> {desc[:200]}")
        return desc
    finally:
        dev_proc.terminate()
        try:
            dev_proc.wait(timeout=5)
        except Exception:
            dev_proc.kill()
        script_path.unlink(missing_ok=True)


# ─── PROMPTS ───────────────────────────────────────────────────────────────────

SYSTEM_RULES = f"""
=== {PROJECT_NAME.upper()} BUILD AGENT — ABSOLUTE RULES ===

You are an autonomous build agent for {PROJECT_NAME}. You build features, assets, and fixes.

## NEVER DO THESE (violating any = wasted iteration):
- NEVER write test files (.test.js, .spec.js, .test.py, etc.)
- NEVER run test commands (playwright, vitest, pytest, jest, etc.)
- NEVER modify the screenshot/playwright pipeline
- NEVER spend an iteration on documentation, refactoring, or tooling alone
- NEVER mark things done in markdown without writing actual code

## ALWAYS DO THESE:
- Read tasks/todo.md — pick the top unchecked item
- Read tasks/lessons.md — avoid repeating past mistakes
- Build it in real source code
- Run `{BUILD_CMD}` to verify it compiles
- If the build fails, fix the build errors FIRST
- Update tasks/status.md when you complete a feature
- Check off the item in tasks/todo.md when done

## SCREENSHOTS (read-only visual feedback):
You will receive a description of what the app looks like in the browser.
Use this to understand the current state. DO NOT try to fix the screenshot
pipeline — it is not your responsibility.

## COMPLETION FORMAT — end every response with:
BUILT: path/to/file (or FIXED: description)
BUILD: PASS or FAIL
COMMITTED: yes or no
--- Response complete ---
"""

PROMPT_TEMPLATE = SYSTEM_RULES + """
=== ITERATION {i} ===

### Current todo.md:
{todo}

### Build status: {build}
### Build output (last 500 chars):
```
{output}
```

### What the app looks like right now (from screenshots):
{screenshot_desc}

### Project memory:
{memory}

=== YOUR TASK ===

{task_instruction}

ONE real code change per iteration. Build it. Verify with `""" + BUILD_CMD + """`.
"""

TASK_BUILD_BROKEN = """The build is FAILING. Fix the build errors shown above.
Do NOT add features — just make the build pass clean."""

TASK_PICK_FROM_TODO = """Pick the top unchecked item from todo.md above.
Build it. If the item is too large for one iteration, do the smallest
meaningful piece and leave the rest for next iteration.

Focus on shipping visible improvements — things a user would notice.
Use the screenshot description to understand the current state."""


# ─── MAIN LOOP ─────────────────────────────────────────────────────────────────

def main():
    log("================================")
    log(f"  {PROJECT_NAME} Build Agent")
    log(f"  Repo: {REPO_DIR}")
    log(f"  Branch: {AGENT_BRANCH}")
    log(f"  Model: {MODEL}")
    log("================================")

    def handler(sig, frame):
        log("Interrupted...")
        git_commit("interrupted")
        notify(f"{PROJECT_NAME} Agent stopped.")
        sys.exit(0)
    signal.signal(signal.SIGINT, handler)

    git_pull()
    notify(f"{PROJECT_NAME} Build Agent started ({MAX_ITERATIONS} iterations)")

    session_id = None

    for i in range(1, MAX_ITERATIONS + 1):
        log(f"\n--- ITERATION {i}/{MAX_ITERATIONS} ---")

        # Pull latest (in case human pushed changes)
        if i > 1:
            git_pull()

        # Check build
        build_ok, build_out = project_build()
        log(f"Build: {'OK' if build_ok else 'FAILED'}")

        # Take screenshots if build passes
        screenshot_desc = "Build failed — fix build first"
        if build_ok:
            screenshot_desc = take_screenshots(i)

        # Decide task
        task_instruction = TASK_BUILD_BROKEN if not build_ok else TASK_PICK_FROM_TODO

        # Build prompt
        prompt = PROMPT_TEMPLATE.format(
            i=i,
            todo=read_todo()[:2000],
            build="PASS" if build_ok else "FAIL",
            output=build_out[-500:],
            screenshot_desc=screenshot_desc[:600],
            memory=read_memory()[:4000],
            task_instruction=task_instruction,
        )

        # Run Claude
        response, new_session = run_claude(prompt, session_id if i > 1 else None)
        if new_session:
            session_id = new_session
        log(f"Response: {response[:200]}...")

        # Record to memory DB
        import asyncio, uuid
        asyncio.run(write_to_memory(
            run_id=str(uuid.uuid4())[:8],
            iteration=i,
            build_status="PASS" if build_ok else "FAIL",
            screenshot_desc=screenshot_desc[:500],
            what_happened=response[:500],
            files_changed="",
            succeeded=build_ok,
        ))

        # Commit whatever Claude built
        git_commit(f"iteration {i}")

        # Notify
        notify(
            f"{PROJECT_NAME} [{i}/{MAX_ITERATIONS}]\n"
            f"Build: {'OK' if build_ok else 'FAIL'}\n"
            f"{screenshot_desc[:150]}\n"
            f"{response[:200]}"
        )

        log(f"Sleeping {PAUSE_BETWEEN}s...")
        time.sleep(PAUSE_BETWEEN)

    log("================================")
    log("Agent run complete.")
    log("================================")
    git_commit("agent run complete")
    notify(f"{PROJECT_NAME} Build Agent finished {MAX_ITERATIONS} iterations.")


if __name__ == "__main__":
    main()
