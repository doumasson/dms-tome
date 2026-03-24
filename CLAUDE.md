# DungeonMind — CLAUDE.md

## Agent Behavior — READ THIS FIRST

### ABSOLUTE RULES (never violate)

1. **DO NOT WRITE TESTS.** No Playwright tests. No Vitest tests. No test files. No test iterations. The game has 1,111+ tests already — that's enough. Every iteration must produce **game code, assets, or bug fixes**. If you catch yourself writing a `.test.js` file or a `.spec.js` file, STOP and build a feature instead.
2. **BUILD toward the vision.** Every iteration must move the game closer to the North Star (see below). Read `tasks/status.md` before each session to know what's done and what's needed.
3. **Self-heal.** If the build breaks, fix it. If a feature you built causes errors, fix them. Don't move on leaving broken code behind. Run `npm run build` to verify before committing.
4. **Simplicity first.** Minimal code impact. Find root causes, no temporary fixes.
5. **File size limit: ~400 lines per component.** Extract sub-components to `src/components/<domain>/`, helpers to `src/lib/`. Parent files are thin orchestrators.
6. **Autonomous bug fixing.** Given a bug report, just fix it. Point at logs/errors, then resolve. Zero hand-holding.
7. **Always signal completion.** End every response with `--- Response complete ---`.
8. **Lessons file.** After ANY correction from the user, update `tasks/lessons.md` with the pattern. Review at session start.

### What an iteration looks like
1. Read `tasks/status.md` and `tasks/todo.md` — understand current state
2. Read `tasks/lessons.md` — don't repeat past mistakes
3. Pick the highest-priority incomplete work (feature, fix, or asset)
4. Build it in source code (`src/`, `public/`, `scripts/`)
5. Run `npm run build` — verify it compiles
6. Commit and push
7. Update `tasks/status.md` with what you built
8. Move to the next item

### What NOT to do
- Do NOT write tests (Playwright, Vitest, or any other test framework)
- Do NOT refactor working code unless it's blocking a feature
- Do NOT add documentation files unless asked
- Do NOT spend iterations on tooling, CI, or infrastructure
- Do NOT run `npx playwright` or `npx vitest` — just build the game

## What This Project Is

**DungeonMind is a real SRD 5.1 multiplayer game where The Narrator is AI.**

Players open a browser and play SRD 5.1 together — no human Narrator required. The AI Narrator narrates the story, voices NPCs, runs enemy combat, calls for skill checks, adjudicates rules, and advances the plot. 1–6 human players join via invite code.

This is not a campaign manager or helper tool. This is a game.

## Critical Architecture

### Multiplayer-Only
- **All players are human.** The AI is The Narrator, not a player.
- **The host's client** runs in `dmMode` — handles AI enemy turns and broadcasts all AI-originated state changes via Supabase Realtime.
- **All encounter state must be broadcast** to every client. Always call `broadcastEncounterAction` and `broadcastNarratorMessage` for AI-originated changes.
- **If a feature only works for the host and not other players, it's broken.**
- `dmMode` = "this client is the host running The Narrator" — NOT "solo play."

### North Star: Organic Living-World RPG
A living world you explore — not a chatbot you type at.

- Players move tokens freely on the scene map
- Approaching an NPC/building triggers a contextual prompt organically
- Combat erupts when The Narrator decides — tokens transition to combat grid
- Victory fades back to world map; players continue exploring
- If a feature feels like organic RPG gameplay, ship it. If it feels like a chatbot UI, rethink it.

### Product Layout
- **Top ~55%:** Scene image (full-bleed, no white space) with grid overlay + tokens
- **Bottom ~45%:** Narrator chat. Scene descriptions auto-post. Players type/speak actions. The Narrator responds.
- Each player has their own screen/device. All state syncs via Supabase Realtime.

## SRD 5.1 Rules — Non-Negotiable

- Real 5e SRD rules. All 12 classes, all races, all spells, all monsters. No simplified mechanics.
- **Action economy is sacred:** 1 action, 1 bonus action (if applicable), movement up to speed per turn. No two leveled spells in one turn. UI must prevent illegal actions.
- **Spells are spatial:** Cone/line/sphere targeting via SVG overlays on the battle map. Player aims, confirms. Affected tokens auto-highlighted before confirmation.
- **Players roll for themselves. The Narrator rolls for enemies/NPCs.**
- **Session persistence:** HP, spell slots, conditions, gold persist between sessions. Nothing resets on logout. Players must rest per 5e rules to recover.

## Tech Stack
- React + Vite, Zustand (client state)
- Supabase (auth, PostgreSQL, Realtime broadcast) — user data only
- Vercel (hosting, auto-deploy on push)
- Anthropic Claude API (`claude-haiku-4-5-20251001` for Narrator speed)
- Pollinations.ai (free scene + token image gen, no API key)
- Web Speech API (TTS narration + push-to-talk)
- Bundled SRD JSON (~2-3MB, all 5e free content — classes, races, spells, monsters, equipment)

## Database (Supabase)
- `profiles` — id, email, name, avatar_url
- `campaigns` — id, name, host_user_id, invite_code, campaign_data, settings
- `campaign_members` — campaign_id, user_id, role
- `characters` — id, owner_user_id, name, class, race, level, character_data (player-owned, portable)
- `campaign_characters` — campaign_id, character_id, current_hp, spell_slots_used, conditions, position, gold

## Campaign JSON Schema
```json
{
  "title": "Campaign Name",
  "scenes": [{
    "title": "Scene Title",
    "text": "Narrative for players.",
    "dmNotes": "Private DM context.",
    "fogOfWar": true,
    "isEncounter": true,
    "enemies": [{
      "name": "Goblin",
      "hp": 7, "ac": 15, "speed": 30,
      "stats": { "str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8 },
      "attacks": [{ "name": "Scimitar", "bonus": "+4", "damage": "1d6+2" }],
      "startPosition": { "x": 4, "y": 3 }
    }]
  }]
}
```

## Project State
Feature status, backlog, and priorities are tracked in `tasks/status.md`. **Read it before planning new work or assessing what exists.** Update it when features are completed, changed, or added to backlog.

## Design Rules
- Dark fantasy theme, gold accents (`#d4af37`), deep brown/black backgrounds
- Scene image bleeds edge to edge — no white space visible
- Big click targets (TV/tablet use at a table)
- Narrator-only info: dashed red border, `rgba(200,80,80,0.8)` label
- Spell/ability effects render on the scene image, not in a sidebar
- Grid always visible; activates for turn-based movement in combat

## Git Workflow
```
git add . && git commit -m "Description" && git push
```
Vercel auto-deploys in ~30 seconds.

## Task Management
- `tasks/status.md` — Feature status, backlog, and priorities. The source of truth for what's built.
- `tasks/todo.md` — Current sprint / active work items with checkable items.
- `tasks/lessons.md` — Patterns to avoid. Update after any correction from user.
