# Session Plan — 2026-03-18

## Features to Build

### 1. Fix concentration auto-clear [TRIVIAL]
- `applyEncounterDamage` logs "BROKEN" but doesn't clear concentration
- Fix: when `pass === false`, call clearConcentration(targetId) and broadcast

### 2. Campaign In-App Generator [MEDIUM]
- Add "✨ Generate with AI" button in CampaignImporter
- Inline form: title, tone, # scenes
- Calls Claude Haiku with structured prompt → auto-validates → auto-loads
- No copy/paste required

### 3. 60-Second Player Turn Timer [MEDIUM]  
- Add countdown timer in CombatPhase when it's a player's turn
- Visual ring/bar with time remaining
- Auto-end turn at 0 (with broadcast to other clients)
- Only applies to player turns, not enemy turns

### 4. Short Rest Hit Dice UI [MEDIUM]
- RestModal currently calls shortRest() which only restores class resources, not HP
- Add per-character hit dice spending step after vote resolves
- Show hit die type (d6/d8/d10/d12) per class, remaining count
- Roll button: d[hitDie] + CON mod → add to HP (cannot exceed maxHp)
- Update shortRest() to accept and apply HP recovery + track hit dice used

### 5. Cantrip Gain on Level-Up [SMALL]
- Cantrip gains per class at specific levels:
  - Wizard: lvl 4 (+1), lvl 10 (+1) — total 5 cantrips
  - Sorcerer: lvl 4 (+1), lvl 10 (+1) — total 6 cantrips
  - Warlock: lvl 4 (+1), lvl 10 (+1) — total 4 cantrips
  - Bard: lvl 4 (+1), lvl 10 (+1) — total 4 cantrips
  - Cleric: lvl 4 (+1), lvl 10 (+1) — total 5 cantrips
  - Druid: lvl 4 (+1), lvl 10 (+1) — total 4 cantrips
- Add `CANTRIP_GAINS` table to SpellPickPanel
- If current level-up grants a cantrip, add cantrip pick step in LevelUpModal

### 6. Portable Characters + Profile [LARGE]
Requires TWO parts:
  
**Part A — DB Migration (user must run in Supabase SQL Editor)**
- migration SQL already exists at supabase/migrations/001_character_portability.sql
- BUG in migration: campaigns.dm_user_id → fix to host_user_id
- User runs it once in Supabase dashboard

**Part B — Frontend**
- CharacterCreate.jsx: save to `characters` table (not just campaign_members)
- Load user's characters from `characters` table on sign-in
- Pre-game "My Characters" screen: shows owned chars, lets user pick one or create new
- CharacterSelect.jsx: lobby screen shown when joining a campaign without a character
- `characters` Zustand slice: myCharacters[], loadMyCharacters(), saveCharacter()
- Campaign join flow: pick existing character OR create new

## Free-form DM Prompting — Already Built ✓
Players can already type any creative action in the narrator chat at any time.
During combat, just type in the chat: "I grab the chandelier chain and swing at the goblin"
→ DM AI processes it as a narrative action and responds.
The floor system (click to claim the floor) prevents two players from talking at once.
No additional build needed — just confirm to user in response.

## Order of Execution
1. Concentration auto-clear (5 min)
2. Cantrip level-up (30 min)
3. 60-second turn timer (45 min)
4. Short rest hit dice (60 min)
5. Campaign in-app generator (60 min)
6. Portable characters — Part A: fix migration SQL + give user instructions
7. Portable characters — Part B: frontend (largest, ~2 hrs)
