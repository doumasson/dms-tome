## Workflow Orchestration

### 1. Plan Node Default
Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions). If something goes sideways, STOP and re-plan immediately — don't keep pushing. Use plan mode for verification steps, not just building. Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy
Use subagents liberally to keep main context window clean. Offload research, exploration, and parallel analysis to subagents. For complex problems, throw more compute at it via subagents. One task per subagent for focused execution.

### 3. Self-Improvement Loop
After ANY correction from the user: update `tasks/lessons.md` with the pattern. Write rules for yourself that prevent the same mistake. Ruthlessly iterate on these lessons until mistake rate drops. Review lessons at session start for relevant project.

### 4. Verification Before Done
Never mark a task complete without proving it works. Diff behavior between main and your changes when relevant. Ask yourself: "Would a staff engineer approve this?" Run tests, check logs, demonstrate correctness.

### 5. Demand Elegance (Balanced)
For non-trivial changes: pause and ask "is there a more elegant way?" If a fix feels hacky: "Knowing everything I know now, implement the elegant solution." Skip this for simple, obvious fixes — don't over-engineer. Challenge your own work before presenting it.

### 6. Autonomous Bug Fixing
When given a bug report: just fix it. Don't ask for hand-holding. Point at logs, errors, failing tests — then resolve them. Zero context switching required from the user. Fix failing CI tests without being told how.

## Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

# DM's Tome

## What Is This
A multiplayer D&D 5e campaign management app. Users sign in with Google, create or join campaigns, and play together. DMs generate campaigns using AI prompts, then import the JSON to run sessions.

## Tech Stack
- React + Vite
- Zustand (state management)
- Supabase (auth + database)
- Vercel (hosting)

## Database Tables (in Supabase)
- profiles (id, email, name, avatar_url, created_at)
- campaigns (id, name, dm_user_id, invite_code, campaign_data, settings, created_at, updated_at)
- campaign_members (id, campaign_id, user_id, role [dm/player], character_data, joined_at)

## User Flows

### DM Flow:
1. Sign in with Google
2. Click "Create New Campaign"
3. Step 1: Campaign name and basic settings
4. Step 2: Tone, themes, length
5. Step 3: Character info
6. Step 4: Generate prompt (copy to AI)
7. Step 5: Upload JSON file or paste JSON
8. Enter campaign as DM
9. Share invite code with players

### Player Flow:
1. Get invite code from DM
2. Sign in with Google
3. Enter invite code
4. Create/upload character
5. Join campaign

## Campaign JSON Import
- Primary: Upload .json file
- Secondary: Paste JSON text
- Must clean AI output:
  - Replace \[ with [
  - Replace \] with ]
  - Remove markdown code blocks
  - Trim whitespace

## Features Built
- Google sign-in
- Campaign select screen
- Campaign creation wizard
- Prompt generator
- JSON import with validation
- Dice roller
- Combat tracker
- Character sheets
- Scene viewer
- DM mode toggle

## Features Needed
- Encounter generator with SRD monsters
- Loot generator
- Character editing locked to DM mode only
- Invite code sharing
- Real-time multiplayer sync
- Better mobile responsiveness

## Design Rules
- Dark fantasy theme with gold accents
- DM-only info has dashed red border
- Big click targets (used at gaming table)
- Mobile responsive

## Git Workflow
After changes run: git add . && git commit -m "Description" && git push
Vercel auto-deploys in 30 seconds.

## Future Phases
- Phase 1 (NOW): Local DM tool with campaign import
- Phase 2: Multiplayer online (players connect remotely)
- Phase 3: VR tabletop