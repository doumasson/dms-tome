#!/usr/bin/env python3
"""DungeonMind Autonomous Build Agent — builds game features, assets, and fixes.
   NEVER writes tests. Uses Playwright screenshots as READ-ONLY visual feedback."""

import subprocess, json, time, os, sys, signal, datetime, urllib.request
import tempfile
from pathlib import Path

REPO_DIR   = Path.home() / "dms-tome"
LOG_DIR    = Path.home() / "agent-logs"
SHOT_DIR   = Path.home() / "agent-screenshots"
LOG_DIR.mkdir(exist_ok=True)
SHOT_DIR.mkdir(exist_ok=True)
PA_DB      = Path.home() / "pa/data/pa.db"

MEMORY_FILES = [
    "CLAUDE.md", "AGENTS.md", "docs/ARCHITECTURE.md",
    "tasks/status.md", "tasks/todo.md", "tasks/lessons.md",
]

MAX_ITERATIONS = 50
PAUSE_BETWEEN  = 10
AGENT_BRANCH   = "agent-dev"
TELEGRAM_USER  = "5678604724"
DEV_PORT       = 5173
PLAYWRIGHT_BIN = str(Path.home() / "dms-tome/node_modules/playwright")


def log(msg):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    logfile = LOG_DIR / f"agent-{datetime.date.today()}.log"
    with open(logfile, "a") as f:
        f.write(line + "\n")


def notify(msg):
    token = os.environ.get("PA_TELEGRAM_TOKEN", "")
    if not token:
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
        "--allowedTools", "Edit,Write,Read,Glob,Grep,Bash",
        "--model", "claude-haiku-4-5-20251001",
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


def vite_build():
    rc, out, err = run(["npm", "run", "build"], timeout=300)
    return rc == 0, (out + "\n" + err)[-1000:]


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


def take_screenshots(iteration):
    """Read-only visual check. Agent CANNOT modify this function or the screenshot script.
    Returns a text description of what the game looks like right now."""
    log("  -> Taking screenshots...")
    shot_dir = SHOT_DIR / f"iter-{iteration:02d}"
    shot_dir.mkdir(exist_ok=True)

    script = f"""
const {{ chromium }} = require('{PLAYWRIGHT_BIN}');
(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const page = await browser.newPage();
  await page.setViewportSize({{ width: 1280, height: 800 }});
  const result = {{ shots: [], errors: [], headings: [], buttons: [], url: '', title: '' }};
  try {{
    await page.goto('http://localhost:{DEV_PORT}', {{ waitUntil: 'networkidle', timeout: 20000 }});
    await page.waitForTimeout(3000);
    await page.screenshot({{ path: '{shot_dir}/01-landing.png' }});
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

    // Try to get console errors
    const consoleErrors = [];
    page.on('console', msg => {{
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    }});
    await page.waitForTimeout(2000);
    result.consoleErrors = consoleErrors;

  }} catch(e) {{ result.errors.push(e.message); }}
  finally {{ await browser.close(); }}
  console.log(JSON.stringify(result));
}})();
"""

    script_path = Path(tempfile.mktemp(suffix=".js"))
    script_path.write_text(script)

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
        if r.get("consoleErrors"):
            desc += f"CONSOLE ERRORS: {r['consoleErrors'][:5]}. "
        if not r.get("errors") and not r.get("consoleErrors"):
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

SYSTEM_RULES = """
=== DUNGEONMIND BUILD AGENT — ABSOLUTE RULES ===

You are an autonomous build agent. You build game features, assets, and fixes.

## NEVER DO THESE (violating any = wasted iteration):
- NEVER write test files (.test.js, .spec.js)
- NEVER run npx playwright, npx vitest, or npm test
- NEVER modify the screenshot/playwright pipeline
- NEVER spend an iteration on documentation, refactoring, or tooling alone
- NEVER mark things done in markdown without writing actual game code

## ALWAYS DO THESE:
- Read tasks/todo.md — pick the top unchecked item
- Read tasks/lessons.md — avoid repeating past mistakes
- Build it in real source code (src/, public/, scripts/)
- Run `npm run build` to verify it compiles
- If the build fails, fix the build errors FIRST
- Update tasks/status.md when you complete a feature
- Check off the item in tasks/todo.md when done

## SCREENSHOTS (read-only visual feedback):
You will receive a description of what the game looks like in the browser.
Use this to understand the current state of the UI. DO NOT try to fix
the screenshot pipeline — it is not your responsibility. Focus only on
improving the actual game code based on what you see.

## COMPLETION FORMAT — end every response with:
BUILT: src/path/to/file.jsx (or FIXED: description)
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

### What the game looks like right now (from screenshots):
{screenshot_desc}

### Project memory (CLAUDE.md, status.md, lessons.md):
{memory}

=== YOUR TASK ===

{task_instruction}

ONE real code change per iteration. Build it. Verify with `npm run build`.
"""

TASK_BUILD_BROKEN = """The build is FAILING. Fix the build errors shown above.
Do NOT add features — just make `npm run build` pass clean."""

TASK_PICK_FROM_TODO = """Pick the top unchecked item from todo.md above.
Build it. If the item is too large for one iteration, do the smallest
meaningful piece and leave the rest for next iteration.

Focus on shipping visible gameplay improvements — things a player would notice.
Use the screenshot description to understand what the game currently looks like
and what needs work."""


# ─── MAIN LOOP ─────────────────────────────────────────────────────────────────

def main():
    log("================================")
    log("  DungeonMind Build Agent")
    log("================================")

    def handler(sig, frame):
        log("Interrupted...")
        git_commit("interrupted")
        notify("DungeonMind Agent stopped.")
        sys.exit(0)
    signal.signal(signal.SIGINT, handler)

    git_pull()
    notify("DungeonMind Build Agent started")

    session_id = None

    for i in range(1, MAX_ITERATIONS + 1):
        log(f"\n--- ITERATION {i}/{MAX_ITERATIONS} ---")

        # Pull latest (in case human pushed changes)
        if i > 1:
            git_pull()

        # Check build
        build_ok, build_out = vite_build()
        log(f"Build: {'OK' if build_ok else 'FAILED'}")

        # Take screenshots if build passes
        screenshot_desc = "Build failed — fix build first"
        if build_ok:
            screenshot_desc = take_screenshots(i)

        # Decide task
        if not build_ok:
            task_instruction = TASK_BUILD_BROKEN
        else:
            task_instruction = TASK_PICK_FROM_TODO

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
            f"DungeonMind [{i}/{MAX_ITERATIONS}]\n"
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
    notify("DungeonMind Build Agent finished.")


if __name__ == "__main__":
    main()
