#!/usr/bin/env python3
"""Autonomous Build Agent — config-driven, project-agnostic.
   Point it at any repo with a CLAUDE.md and tasks/todo.md and let it build.
   Uses Playwright screenshots as READ-ONLY visual feedback (if enabled).
   NEVER writes tests."""

import subprocess, json, time, os, sys, signal, datetime, urllib.request
import tempfile
from pathlib import Path

# ─── ENSURE PATH ──────────────────────────────────────────────────────────────
# When launched from systemd/Popen, ~/.local/bin may not be on PATH
_extra_paths = [
    str(Path.home() / ".local" / "bin"),
    str(Path.home() / ".npm-global" / "bin"),
]
for p in _extra_paths:
    if p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")

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
    max_turns = str(CFG.get("max_turns", 200))
    cmd = [
        "claude", "-p", prompt,
        "--output-format", "json",
        "--max-turns", max_turns,
        "--dangerously-skip-permissions",
        "--allowedTools", ALLOWED_TOOLS,
    ]
    # Only add --model if explicitly set and not "subscription" (default uses Claude subscription)
    if MODEL and MODEL != "subscription":
        cmd += ["--model", MODEL]
    if resume_id:
        cmd += ["--resume", resume_id]
    log("  -> Invoking Claude Code...")
    rc, stdout, stderr = run(cmd, timeout=2400)  # 40 min — let it work
    if rc != 0 and not stdout:
        log(f"  X Claude error: {stderr[:300]}")
        return f"ERROR: {stderr[:300]}", None
    try:
        data = json.loads(stdout)
        return data.get("result", stdout), data.get("session_id")
    except json.JSONDecodeError:
        return stdout, None


# ─── MEMORY (self-learning system) ─────────────────────────────────────────────

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


async def save_fix(error_sig, fix_text, file_affected=""):
    """When the agent fixes a build error, remember the error→fix mapping."""
    try:
        import aiosqlite
        async with aiosqlite.connect(PA_DB) as db:
            await db.execute(
                """INSERT INTO agent_fixes
                   (error_signature, fix_that_worked, file_affected, last_used)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(error_signature) DO UPDATE SET
                   fix_that_worked=excluded.fix_that_worked,
                   times_applied=times_applied+1,
                   last_used=excluded.last_used""",
                (error_sig[:200], fix_text[:500], file_affected,
                 datetime.datetime.now().isoformat()),
            )
            await db.commit()
        log(f"  -> Saved fix: {error_sig[:60]}...")
    except Exception as e:
        log(f"  ! Fix save failed: {e}")


async def get_known_fixes(error_output):
    """Check if we've seen this error before and know how to fix it."""
    try:
        import aiosqlite
        async with aiosqlite.connect(PA_DB) as db:
            db.row_factory = aiosqlite.Row
            # Search for matching error signatures
            rows = await db.execute_fetchall(
                "SELECT error_signature, fix_that_worked, times_applied FROM agent_fixes ORDER BY times_applied DESC LIMIT 20"
            )
            matches = []
            error_lower = error_output.lower()
            for r in rows:
                if r["error_signature"].lower() in error_lower or any(
                    word in error_lower for word in r["error_signature"].lower().split()[:3]
                ):
                    matches.append(f"- KNOWN FIX ({r['times_applied']}x): {r['error_signature'][:80]} -> {r['fix_that_worked'][:100]}")
            return "\n".join(matches[:5]) if matches else ""
    except Exception:
        return ""


async def get_lessons():
    """Read all lessons from the database."""
    try:
        import aiosqlite
        async with aiosqlite.connect(PA_DB) as db:
            db.row_factory = aiosqlite.Row
            rows = await db.execute_fetchall(
                "SELECT lesson, source FROM agent_lessons ORDER BY id DESC LIMIT 30"
            )
            if rows:
                return "\n".join(f"- [{r['source']}] {r['lesson']}" for r in rows)
            return ""
    except Exception:
        return ""


async def get_recent_iterations(n=5):
    """Read recent iteration history so the agent doesn't repeat itself."""
    try:
        import aiosqlite
        async with aiosqlite.connect(PA_DB) as db:
            db.row_factory = aiosqlite.Row
            rows = await db.execute_fetchall(
                "SELECT iteration, build_status, what_happened FROM agent_iterations ORDER BY id DESC LIMIT ?",
                (n,)
            )
            if rows:
                return "\n".join(
                    f"- iter {r['iteration']} [{r['build_status']}]: {r['what_happened'][:120]}"
                    for r in rows
                )
            return ""
    except Exception:
        return ""


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

    # Self-healing Playwright flow: creates test data if missing, audits UI at every step
    script_content = """
const { chromium } = require('%PLAYWRIGHT%');
const dir = '%SHOTDIR%';

async function snap(page, name, result) {
  await page.screenshot({ path: dir + '/' + name + '.png' });
  result.shots.push(name);
}

async function audit(page) {
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3')).map(e => e.textContent.trim()).filter(Boolean).slice(0, 10));
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(e => e.textContent.trim()).filter(t => t && t.length < 40).slice(0, 20));
  const errors = await page.evaluate(() => {
    const f = [];
    if ((document.body.innerText || '').includes('Something went wrong')) f.push('ERROR_BOUNDARY');
    document.querySelectorAll('.error,[class*="error"],[class*="Error"]').forEach(e => {
      const t = e.textContent.trim(); if (t && t.length < 200) f.push(t);
    });
    return f;
  });
  const styleIssues = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('div,button,section,aside,nav,header').forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.backgroundColor === 'rgb(255, 255, 255)') {
        const c = el.className?.toString()?.substring(0, 30) || el.tagName;
        issues.push('WHITE_BG:' + c);
      }
    });
    return issues.slice(0, 5);
  });
  const canvas = await page.$('canvas');
  return { headings, buttons, errors, styleIssues, hasCanvas: !!canvas };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const result = { shots: [], screens: [], errors: [], finalScreen: 'unknown', hasCanvas: false, actions: [] };

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200)); });
  page.on('pageerror', err => consoleErrors.push('UNCAUGHT: ' + err.message.substring(0, 200)));

  try {
    // === STEP 1: LOAD & LOGIN (wait for auth + data fetch) ===
    await page.goto('http://localhost:%PORT%', { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(5000);  // Extra time for auto-login + Supabase campaign fetch
    let info = await audit(page);
    await snap(page, '01-dashboard', result);
    result.screens.push({ step: 'dashboard', ...info });

    if (info.errors.length > 0) {
      result.finalScreen = 'DASHBOARD_ERROR: ' + info.errors.join('; ');
      throw new Error('stop');
    }

    // === STEP 2: CAMPAIGN — click it (seed script ensures it exists) ===
    // CampaignSelect uses inline styles (no CSS class). Click the first button
    // that looks like a campaign card (not nav buttons like Sign Out/Create/Join).
    async function findAndClickCampaign() {
      return await page.evaluate(() => {
        const skip = ['sign out','create new','join campaign','⚙','copy','invite'];
        const buttons = Array.from(document.querySelectorAll('button'));
        const allBtnTexts = buttons.map(b => b.textContent.trim().substring(0, 50));
        // Find a campaign card: any button that's not a nav action
        for (const btn of buttons) {
          const t = btn.textContent.trim().toLowerCase();
          if (t.length > 2 && !skip.some(w => t.includes(w))) {
            btn.click();
            return { clicked: btn.textContent.trim().substring(0, 40), allButtons: allBtnTexts };
          }
        }
        return { clicked: null, allButtons: allBtnTexts };
      });
    }
    let clickResult = await findAndClickCampaign();
    let clicked = clickResult?.clicked;
    if (!clicked) {
      // Campaign data might not have loaded yet — wait and retry
      result.actions.push('RETRY_WAIT: buttons=' + JSON.stringify(clickResult?.allButtons || []));
      await page.waitForTimeout(5000);
      // Reload page to trigger fresh fetch
      await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(5000);
      clickResult = await findAndClickCampaign();
      clicked = clickResult?.clicked;
    }
    if (!clicked) {
      info = await audit(page);
      await snap(page, '02-no-campaign', result);
      result.screens.push({ step: 'no_campaign', ...info });
      result.finalScreen = 'DASHBOARD_NO_CAMPAIGN: buttons found: ' + info.buttons.join(', ');
      throw new Error('stop');
    }
    result.actions.push('CLICKED_CAMPAIGN: ' + clicked);
    await page.waitForTimeout(4000);
    info = await audit(page);
    await snap(page, '02-after-campaign', result);
    result.screens.push({ step: 'after_campaign', ...info });

    if (info.errors.length > 0) {
      result.finalScreen = 'CAMPAIGN_CRASHED: ' + info.errors.join('; ');
      throw new Error('stop');
    }

    // === STEP 3: CHARACTER — click it (seed script ensures it exists) ===
    const isCharSelect = info.headings.some(h => /champion|character/i.test(h));
    if (isCharSelect) {
      const charCard = await page.$('div[style*="cursor: pointer"][style*="#1a1006"]');
      if (charCard) {
        result.actions.push('CLICKING_CHARACTER');
        await charCard.click();
        await page.waitForTimeout(5000);
      } else {
        // Character might already be selected if campaign_members has character_data
        // Wait and check if we auto-advanced
        await page.waitForTimeout(3000);
        const stillCharSelect = (await audit(page)).headings.some(h => /champion|character/i.test(h));
        if (stillCharSelect) {
          info = await audit(page);
          await snap(page, '03-no-character', result);
          result.screens.push({ step: 'no_character', ...info });
          result.finalScreen = 'CHARACTER_SELECT_STUCK: seed script created character but UI does not show it. Buttons: ' + info.buttons.join(', ');
          throw new Error('stop');
        }
      }

      info = await audit(page);
      await snap(page, '03-after-character', result);
      result.screens.push({ step: 'after_character', ...info });

      if (info.errors.length > 0) {
        result.finalScreen = 'CHARACTER_CRASHED: ' + info.errors.join('; ');
        throw new Error('stop');
      }
    }

    // === STEP 4: GAME — audit final state ===
    await page.waitForTimeout(2000);
    info = await audit(page);
    await snap(page, '04-game', result);
    result.hasCanvas = info.hasCanvas;
    result.screens.push({ step: 'game', ...info });

    if (info.hasCanvas) {
      result.finalScreen = 'GAME_RUNNING';
      // Extra audit: check for HUD elements, visible UI panels
      const gameUI = await page.evaluate(() => {
        const found = [];
        if (document.querySelector('canvas')) found.push('CANVAS');
        if (document.querySelector('[class*="hud" i], [class*="HUD"]')) found.push('HUD');
        if (document.querySelector('[class*="narrator" i]')) found.push('NARRATOR');
        if (document.querySelector('[class*="minimap" i]')) found.push('MINIMAP');
        if (document.querySelector('[class*="health" i], [class*="hp" i]')) found.push('HEALTH');
        if (document.querySelector('[class*="chat" i], [class*="log" i]')) found.push('CHAT');
        return found;
      });
      result.gameUI = gameUI;
    } else if (info.errors.length > 0) {
      result.finalScreen = 'GAME_ERROR: ' + info.errors.join('; ');
    } else {
      result.finalScreen = 'GAME_STUCK: ' + info.headings.join(', ') + ' | ' + info.buttons.slice(0, 5).join(', ');
    }

  } catch(e) {
    if (e.message !== 'stop') result.errors.push('NAV_ERROR: ' + e.message);
  }
  finally {
    result.errors = [...new Set(result.screens.flatMap(s => s.errors || []))];
    result.consoleErrors = consoleErrors.slice(0, 5);
    result.allStyleIssues = [...new Set(result.screens.flatMap(s => s.styleIssues || []))];
    await browser.close();
  }
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

        desc = f"FINAL SCREEN: {r.get('finalScreen', 'unknown')}. "
        desc += f"Canvas: {r.get('hasCanvas', False)}. "
        actions = r.get('actions', [])
        if actions:
            desc += f"Actions taken: {actions}. "
        game_ui = r.get('gameUI', [])
        if game_ui:
            desc += f"Game UI found: {game_ui}. "
        screens = r.get('screens', [])
        for s in screens:
            desc += f"\n  [{s.get('step', '?')}] h={s.get('headings', [])} b={s.get('buttons', [])[:6]}"
            if s.get('errors'):
                desc += f" ERR={s['errors']}"
            if s.get('styleIssues'):
                desc += f" STYLE={s['styleIssues']}"
        all_errors = r.get('errors', [])
        if all_errors:
            desc += f"\nUI ERRORS: {all_errors}"
        console_errors = r.get('consoleErrors', [])
        if console_errors:
            desc += f"\nCONSOLE ERRORS: {console_errors}"
        all_style = r.get('allStyleIssues', [])
        if all_style:
            desc += f"\nSTYLE ISSUES: {all_style}"
        log(f"  -> {desc[:600]}")
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
=== {PROJECT_NAME.upper()} BUILD AGENT — YOU ARE AN AUTONOMOUS SOFTWARE ENGINEER ===

You are a senior software engineer building {PROJECT_NAME} autonomously.
You read the todo list, pick work, write real code, and ship it. Every iteration.

## RULES:
1. Read tasks/todo.md — pick the TOP unchecked item
2. Read tasks/lessons.md — don't repeat past mistakes
3. WRITE CODE. Real source files in src/, public/, scripts/
4. Run `{BUILD_CMD}` — if it fails, fix it
5. Check off what you completed in tasks/todo.md
6. Update tasks/status.md when features are done
7. NEVER write test files. NEVER run test commands.
8. NEVER spend an iteration just verifying or confirming things work.
   If the build passes and screenshots show no errors, BUILD THE NEXT FEATURE.
9. NEVER repeat work from a previous iteration. Check the history.

## SCREENSHOTS (visual feedback EVERY iteration):
You get a description of what the app looks like at each screen.
The screenshots tell you what's ACTUALLY rendering — not just what compiles.
- If the flow is BLOCKED (error boundary, missing data), fix THAT first
- If a component looks unstyled/broken in screenshots, fix THAT
- UI/UX matters as much as functionality — a feature that works but looks
  like default HTML is NOT done. It must match the dark fantasy design rules.
DO NOT modify the screenshot pipeline.

## COMPLETION FORMAT:
BUILT: path/to/file
WHAT: one-line description of what you built
BUILD: PASS or FAIL
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

### Lessons learned (from database — DO NOT repeat these mistakes):
{lessons}

### Known fixes for past errors:
{known_fixes}

### Recent iteration history (do NOT repeat the same work):
{recent_history}

### Project memory:
{memory}

=== YOUR TASK ===

{task_instruction}

ONE code change per iteration. Be efficient — read only files you need.
Fix or build ONE thing, then verify with `""" + BUILD_CMD + """`.
If you learned something new, append ONE line to tasks/lessons.md.
"""

TASK_BUILD_BROKEN = """The build is FAILING. Fix the build errors shown above.
Check "Known fixes" — you may have fixed this before.
Just make the build pass. Then the next iteration will build features."""

TASK_FLOW_BLOCKED = """The screenshot flow is STUCK and not reaching the game.
The Playwright script tries to self-heal: if no campaign exists it tries to create one,
if no character exists it tries to create one. But something is still blocking.

Look at the "Actions taken" and screen descriptions:
- DASHBOARD_NO_CAMPAIGN: the create campaign flow failed. Fix the campaign creation UI.
- CAMPAIGN_CRASHED / ERROR_BOUNDARY: a component crashed. Read console errors, find the bug.
- CHARACTER_SELECT_STUCK: character creation or selection is broken.
- CHARACTER_CREATION: the agent reached the character builder — it needs to work end-to-end.
- GAME_STUCK: game loaded but canvas didn't render. Check GameV2.jsx and PixiApp.

CRITICAL: DO NOT break the human login flow (Discord OAuth).
The test uses VITE_DEV_AUTO_LOGIN — that's a separate code path.
Fix the actual crash/bug, not the auth.

Also check STYLE ISSUES — if any screen has white backgrounds or unstyled elements,
fix those too. Every screen must match the dark fantasy design rules."""

TASK_PICK_FROM_TODO = """The game is reachable and working. Now BUILD FEATURES.

Pick the TOP unchecked item from todo.md. Do NOT skip items.

EFFICIENCY: You know the codebase. Don't re-read CLAUDE.md or status.md.
Go directly to the file you need to edit. Make the change. Run the build. Done.

Example good iteration:
1. Read todo.md → top item is "combat feedback — damage numbers"
2. Read src/engine/TokenLayer.js (the file that renders tokens)
3. Add floating damage number rendering
4. npm run build → PASS
5. Done. Commit.

Example BAD iteration (wastes turns):
1. Read CLAUDE.md, AGENTS.md, ARCHITECTURE.md, status.md...
2. Grep for 20 different things...
3. Read 15 files...
4. Hit turn limit before writing any code

WRITE CODE FIRST. Read only the 1-2 files you need to edit."""


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

    # Seed test data (campaign + character) — idempotent, only creates if missing
    seed_script = AGENT_DIR / "seed-test-data.js"
    if seed_script.exists():
        log("  -> Seeding test data...")
        rc, out, err = run(["node", str(seed_script)], cwd=REPO_DIR, timeout=30)
        if rc == 0:
            log(f"  -> Seed: {out.strip()}")
        else:
            log(f"  ! Seed failed: {err[:200]}")

    notify(f"{PROJECT_NAME} Build Agent started ({MAX_ITERATIONS} iterations)")

    import asyncio, uuid
    session_id = None
    prev_build_ok = True  # Track if last iteration had a broken build

    for i in range(1, MAX_ITERATIONS + 1):
        log(f"\n--- ITERATION {i}/{MAX_ITERATIONS} ---")

        # Pull latest (in case human pushed changes)
        if i > 1:
            git_pull()

        # Check build
        build_ok, build_out = project_build()
        log(f"Build: {'OK' if build_ok else 'FAILED'}")

        # Take screenshots EVERY iteration — the agent must SEE what it builds
        if not build_ok:
            screenshot_desc = "Build failed — fix build first"
            task_instruction = TASK_BUILD_BROKEN
        else:
            screenshot_desc = take_screenshots(i)
            if "GAME" not in screenshot_desc and "canvas" not in screenshot_desc.lower():
                task_instruction = TASK_FLOW_BLOCKED
            else:
                task_instruction = TASK_PICK_FROM_TODO

        # ─── SELF-LEARNING: read from memory DB ───
        lessons = asyncio.run(get_lessons()) or "(none yet)"
        recent_history = asyncio.run(get_recent_iterations(5)) or "(first run)"
        known_fixes = ""
        if not build_ok:
            known_fixes = asyncio.run(get_known_fixes(build_out)) or "(no matching fixes in database)"
        log(f"  Lessons: {len(lessons.splitlines())} | History: {len(recent_history.splitlines())} entries")

        # Build prompt
        prompt = PROMPT_TEMPLATE.format(
            i=i,
            todo=read_todo()[:2000],
            build="PASS" if build_ok else "FAIL",
            output=build_out[-500:],
            screenshot_desc=screenshot_desc[:600],
            lessons=lessons[:1500],
            known_fixes=known_fixes[:500],
            recent_history=recent_history[:1000],
            memory=read_memory()[:4000],
            task_instruction=task_instruction,
        )

        # Run Claude
        response, new_session = run_claude(prompt, session_id if i > 1 else None)
        if new_session:
            session_id = new_session
        log(f"Response: {response[:200]}...")

        # ─── SELF-LEARNING: save what happened ───
        asyncio.run(write_to_memory(
            run_id=str(uuid.uuid4())[:8],
            iteration=i,
            build_status="PASS" if build_ok else "FAIL",
            screenshot_desc=screenshot_desc[:500],
            what_happened=response[:500],
            files_changed="",
            succeeded=build_ok,
        ))

        # If build was broken and now it's fixed, save the error→fix mapping
        if not prev_build_ok:
            new_build_ok, _ = project_build()
            if new_build_ok:
                error_sig = build_out[:200].strip()
                asyncio.run(save_fix(error_sig, response[:300]))
                log("  -> Self-healed! Fix saved to memory.")

        prev_build_ok = build_ok

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
