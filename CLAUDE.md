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

## The Vision

**DM's Tome is a real D&D 5e roleplaying game where the Dungeon Master is AI.**

You and your friends sit down to play D&D — you've got your characters, your group chat, your vibe. The one thing missing is a human DM. DM's Tome fills that seat with AI. The AI narrates the story, voices NPCs, runs enemy combat, calls for skill checks, adjudicates rules, and advances the plot. The game still feels like sitting around a table with your boys — the banter, the chaos, the "wait what do I even do" moments — but the DM role is fully automated.

This is not a campaign manager or a helper tool. This is a game. Players open a browser and play D&D together right now, with no extra setup and no human DM required.

## Product Feel

Think **Icewind Dale / Baldur's Gate meets a live D&D session.**

- Top ~55% of the screen: the scene. An AI-generated image of where the party is, with draggable player tokens and enemy tokens. In combat this becomes the battle grid.
- Bottom ~45%: the narrator chat. The scene description auto-posts when a scene loads. Players type or speak their actions. The AI DM responds, drives the story, triggers combat, calls for rolls.
- No menus in the way. No "click here to open the DM panel." It's all on screen, all the time.

## Core Design Principles

1. **The AI DM runs everything.** Story narration, NPC dialogue, enemy turns, saving throw adjudication, loot drops, scene transitions — all AI. Players never need to touch a DM panel. A "DM mode" exists only for a human to optionally oversee or override.

2. **Real D&D 5e rules, no shortcuts.** Classes, races, ability scores, AC, saving throws, spell slots, conditions, concentration, move speed, action economy — all enforced. Do not invent simplified mechanics. If something is in the 5e SRD, implement it correctly.

3. **Action economy is sacred.** Each turn: 1 action, 1 bonus action (if applicable), movement up to speed. Dash doubles movement as an action. You cannot cast two leveled spells in one turn. You cannot attack unlimited times. The UI must physically prevent illegal actions mid-turn.

4. **Spells and abilities are interactive, not buttons.** Targeting is spatial:
   - Cone spells (Burning Hands, Thunderwave): a cone shape renders on the scene, player rotates it with the mouse, clicks to confirm. Tokens inside the cone are hit.
   - Line spells (Lightning Bolt): a line extends from the caster, player aims it, clicks to fire.
   - Sphere/circle (Fireball): player clicks a point on the map, sphere radius renders, confirms.
   - Single target: player clicks an enemy token.
   - Affected tokens are auto-highlighted before confirmation so the player knows what they're about to hit.

5. **Players roll for themselves. AI rolls for enemies/NPCs.** When a roll is required, the player's chat shows a "Roll [skill/save] DC [X]" button they click to auto-roll (d20 + modifier). The AI DM calls for NPC/enemy rolls, computes them, and narrates results — players never touch enemy math.

6. **Multiplayer is the default mode.** Everyone joins the same campaign via invite code. All state — token positions, combat turns, HP, conditions, narrator chat — syncs in real time via Supabase Realtime. The game works with 1–6 players. No human DM required at all.

7. **Immersion first.** The scene image is always full-bleed (no white space). Tokens are on the image. The narrator chat looks like a game interface, not a chatbot. Sound (TTS narration) is on by default. Dark fantasy aesthetic throughout.

## How It Works

### Session Flow (no human DM needed)
1. One player creates a campaign (fills out settings, gets a JSON prompt, pastes it to Claude to generate the campaign, imports the JSON).
2. They share an invite code with friends.
3. Everyone signs in, joins, picks a character.
4. The first scene image loads. The AI narrator auto-posts the scene description and begins narrating.
5. Players interact via the chat. The AI drives everything from here — NPCs, encounters, story beats.
6. When combat triggers, the battle grid activates, initiative is rolled, turns proceed under full 5e rules.
7. The story advances through scenes until the campaign ends.

### Campaign Setup (for a human who wants to prep)
- Create campaign → fill tone/theme/character slots → copy the generated prompt → paste into Claude AI to generate JSON → import JSON.
- The human just sets the stage. Once the session starts, AI runs it.

## Tech Stack
- React + Vite (frontend)
- Zustand (client state)
- Supabase (auth, PostgreSQL, Realtime broadcast)
- Vercel (hosting, auto-deploy on push)
- Anthropic Claude API (AI DM narrator — `claude-haiku-4-5-20251001` for speed)
- Pollinations.ai (free scene image generation — no API key needed)
- Web Speech API (TTS narration + push-to-talk input)

## Database Tables (Supabase)
- `profiles` (id, email, name, avatar_url, created_at)
- `campaigns` (id, name, dm_user_id, invite_code, campaign_data, settings, created_at, updated_at)
- `campaign_members` (id, campaign_id, user_id, role [dm/player], character_data, joined_at)

## Campaign JSON Schema (what the AI generates)
```json
{
  "title": "Campaign Name",
  "scenes": [
    {
      "title": "Scene Title",
      "text": "Narrative description shown to players.",
      "dmNotes": "Private DM context.",
      "isEncounter": true,
      "enemies": [
        { "name": "Goblin", "hp": 7, "ac": 15, "speed": 30,
          "stats": { "str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8 },
          "attacks": [{ "name": "Scimitar", "bonus": "+4", "damage": "1d6+2" }] }
      ]
    }
  ]
}
```

## Built & Working
- Google sign-in, campaign creation wizard, JSON import
- Scene viewer (full-height AI image, draggable tokens, overlay controls)
- AI narrator chat (always-inline, auto-narrates scenes, broadcasts to all players)
- Combat tracker (initiative order, HP, conditions, death saves, concentration)
- Realtime multiplayer sync via Supabase broadcast (combat state, narrator messages, scene changes)
- Turn gating — only the active player can take actions; DM can always override
- Character sheets, dice roller, loot generator, notes
- Free scene image gen (Pollinations.ai, fetch+retry, blob URL)
- API key sharing — DM's Claude key shared to all players via Supabase settings

## In Progress / What's Next
Priority order:

### 1. D&D Action Economy (HIGH)
Every combatant gets per-turn: 1 action, 1 bonus action (if class has one), movement up to speed.
- Track `actionsUsed`, `bonusActionsUsed`, `movementUsed` on each combatant per turn
- Dash = action, grants extra movement equal to speed
- UI disables action buttons once action is spent; re-enables on Next Turn
- Disengage, Dodge, Help, Hide as valid action choices

### 2. Interactive Spell Targeting (HIGH)
Replace the "AoE button" with real spatial targeting on the scene image.
- Cone, line, sphere, single-target modes
- SVG/canvas overlay renders the shape as player aims
- Tokens inside the area are highlighted
- On confirm: hit tokens roll saves (via chat button), AI processes enemy saves silently

### 3. AI Enemy Turns (HIGH — core to no-DM play)
When it's an enemy's turn, AI automatically:
- Decides action (attack nearest player, cast spell, move)
- Rolls attack/damage
- Applies results (HP changes, conditions)
- Narrates what happened in chat
- Calls Next Turn
No human input required for enemy turns.

### 4. Class-Aware Action Menus (MEDIUM)
Replace generic Attack/Spell buttons with class-specific panels:
- Wizard/Sorcerer: spell slots, known spells, spell school tags
- Fighter: Action Surge, Second Wind, fighting style bonuses
- Rogue: Sneak Attack condition check, Cunning Action bonus actions
- Cleric: Channel Divinity, spell slots, domain features
- Ranger, Paladin, Barbarian, Bard, Druid, Monk, Warlock — each correct

### 5. Conditions System (MEDIUM)
Properly implement: Blinded, Charmed, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.
Each has mechanical effects that must be enforced in combat (e.g., Prone = disadvantage on attack rolls, half movement to stand).

### 6. Token Sync (MEDIUM)
Broadcast token position changes via Supabase Realtime so all players see tokens move.

## Design Rules
- Dark fantasy theme, gold accents (`#d4af37`), deep brown/black backgrounds
- No white space visible — scene image bleeds edge to edge in the top half
- Big click targets — this is used at a table on a TV or tablet
- DM-only info: dashed red border, `rgba(200,80,80,0.8)` label
- Spell/ability effects: render on the scene image, not in a sidebar
- Never break immersion with generic "button UI" for things that should feel like gameplay

## Git Workflow
```
git add . && git commit -m "Description" && git push
```
Vercel auto-deploys in ~30 seconds.