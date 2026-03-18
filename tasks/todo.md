# DM's Tome — Build Plan

## Phase 1: Core Gameplay (This Session) — HIGH PRIORITY

### 1. Action Economy Enforcement
**Goal:** Each turn has exactly 1 action, 1 bonus action, movement up to speed. UI prevents illegal moves.

- [ ] Add `actionsUsed`, `bonusActionsUsed` to each encounter combatant in `useStore.js`
- [ ] `moveToken()`: deduct from `remainingMove`, block movement if 0
- [ ] `nextEncounterTurn()`: reset all three counters on turn advance
- [ ] `useAction()` / `useBonusAction()` store actions that mark them spent and broadcast
- [ ] Movement: clicking a cell calculates grid distance cost; block if insufficient remaining move
- [ ] Show remaining movement squares highlighted on the grid when token selected
- [ ] Dash action: costs 1 action, grants +speed movement
- [ ] Disengage, Dodge, Help, Hide as valid action menu entries
- [ ] EncounterView: grey-out / disable action buttons when action/bonus already spent

### 2. Bundled SRD Data
**Goal:** All 5e SRD content as static JSON in `src/data/`. Used by spells, classes, actions, character builder.

- [ ] `src/data/spells.js` — all SRD spells (name, level, school, range, area type + size, damage, save, description)
- [ ] `src/data/classes.js` — all 12 classes (hit die, saves, proficiencies, features by level, spell list, casting type)
- [ ] `src/data/races.js` — all SRD races (speed, traits, stat bonuses)
- [ ] `src/data/actions.js` — standard combat actions (Attack, Dash, Disengage, Dodge, Help, Hide, Ready, Search)
- [ ] `src/data/equipment.js` — weapons + armor with stats
- [ ] Monsters already exist in `src/data/monsters.js` ✓

### 3. Class-Aware Action Menus
**Goal:** Replace generic Attack/Spell buttons with class-specific panels. Only legal actions shown for current turn state.

- [ ] New component `src/components/ActionPanel.jsx`
  - Sections: Actions | Bonus Actions | Movement
  - Items grey out when spent (actionsUsed, bonusActionsUsed, remainingMove)
  - Uses SRD class data from `src/data/classes.js`
- [ ] Fighter: Attack (Extra Attack at 5), Action Surge, Second Wind (bonus)
- [ ] Wizard/Sorcerer: Leveled spells by slot, cantrips, Arcane Recovery
- [ ] Rogue: Attack (Sneak Attack auto-check), Cunning Action (Dash/Disengage/Hide as bonus)
- [ ] Cleric: Spells, Channel Divinity, cantrips
- [ ] Barbarian: Attack, Rage (bonus), Reckless Attack
- [ ] Paladin: Attack, Divine Smite (triggered on hit), Lay on Hands, spells
- [ ] Ranger: Attack, Hunter's Mark, spells
- [ ] Monk: Attack, Flurry of Blows (bonus), Step of the Wind, ki abilities
- [ ] Bard: Attack, spells, Bardic Inspiration (bonus)
- [ ] Druid: Spells, Wild Shape (bonus)
- [ ] Warlock: Eldritch Blast, Pact Magic slots, invocations
- [ ] Wire ActionPanel into EncounterView for active player's turn only

### 4. AI Enemy Turns
**Goal:** When it's an enemy's turn, AI decides + executes full turn automatically. No human input required.

- [ ] `triggerEnemyTurn(combatant, encounter, party, apiKey)` in `narratorApi.js`
  - Structured prompt: enemy stats, positions of all combatants, valid actions
  - Returns JSON: `{ action, target, moveToPosition, attackRoll, damage, conditions, narrative }`
- [ ] `useStore.js`: when `nextEncounterTurn()` lands on an enemy, auto-call `triggerEnemyTurn()`
- [ ] Apply results: move token, deduct HP, add conditions, narrate in NarratorPanel as DM message
- [ ] After enemy turn resolves: auto-advance to next combatant
- [ ] Enemy token images: check sprite library (`src/data/monsterSprites.js`) first, Pollinations fallback

### 5. Interactive Spell Targeting
**Goal:** Spells render their area on the battle grid. Player aims, confirms, damage/saves resolve.

- [ ] New component `src/components/SpellTargeting.jsx` — SVG overlay on EncounterView grid
- [ ] `CONE` mode: 15/30/60ft cone from caster token, rotates with mouse, highlights tokens inside
- [ ] `LINE` mode: 5ft-wide × 30/60/100ft line, rotates, highlights tokens
- [ ] `SPHERE` mode: click point on map, renders radius circle, highlights tokens within
- [ ] `SINGLE_TARGET` mode: hover over enemy token to highlight, click to confirm
- [ ] On confirm: for player targets → spawn save-request button in chat; for enemy targets → AI rolls save silently, applies damage
- [ ] Spell metadata (range, area type, area size, save type, damage) from `src/data/spells.js`
- [ ] Wire into ActionPanel: clicking a spell opens SpellTargeting with correct shape/size

## Phase 2: Character System — MEDIUM PRIORITY

### 6. DB Schema Migration — Character Portability
**Goal:** Characters owned by player profile, portable across campaigns.

- [ ] New Supabase table: `characters` (id, owner_user_id, name, class, race, background, level, character_data, created_at, updated_at)
- [ ] New Supabase table: `campaign_characters` (id, campaign_id, character_id, current_hp, spell_slots_used, conditions, position_x, position_y, gold, joined_at)
- [ ] Migration script: populate `characters` from existing `campaign_members.character_data`
- [ ] Update `useStore.js`: load/save characters from new tables
- [ ] Update `CampaignSelect.jsx` and `CharacterCreate.jsx` to use new tables
- [ ] Character transfer rules: identity transfers, level/equipment/gold resets to level 1 defaults

### 7. Full Character Builder
**Goal:** Full SRD-backed character creation wizard using bundled data.

- [ ] Rebuild `CharacterCreate.jsx` as multi-step wizard:
  1. Race — show traits, speed, stat bonuses from `src/data/races.js`
  2. Class — show hit die, features at level 1 from `src/data/classes.js`
  3. Background — skills, equipment, feature
  4. Ability Scores — standard array, point buy, or 4d6-drop-lowest
  5. Starting Equipment — from class + background
  6. Spells Known (casters only) — from class spell list
  7. Name, appearance, backstory
- [ ] Auto-calculate: HP, AC (armor + DEX), saves, skill proficiencies, spell slots
- [ ] Save to `characters` table (player-owned, not campaign-specific)

### 8. Level Up Flow
**Goal:** After AI declares level up, player levels their character in-app.

- [ ] `LevelUpModal.jsx`: new class features, HP roll (or fixed), spell slots, new spells known
- [ ] Persists to `characters` table
- [ ] AI DM narrates level up in NarratorPanel

## Phase 3: World Systems — MEDIUM PRIORITY

### 9. Fog of War
**Goal:** Dungeon scenes hide unexplored grid squares. Shared party vision.

- [ ] Add `fogOfWar: boolean` and `revealedCells: Set<string>` to encounter state
- [ ] EncounterView: dark overlay on unrevealed cells
- [ ] Auto-reveal cells within 30ft (6 squares) of any player token on move
- [ ] Sync revealed cells via Supabase Realtime broadcast
- [ ] Scene-level fog setting from campaign JSON (`fogOfWar: true`)
- [ ] ON by default for dungeon/indoor scenes, OFF for town/outdoor
- [ ] Host toggle override

### 10. Rest System
**Goal:** Long/short rest with majority vote. Persistent resources between sessions.

- [ ] `RestModal.jsx` — shows rest type, vote status, 60s timer
  - Majority vote to proceed
  - AFK players auto-yes after timer
  - Host force option
- [ ] Store: `proposeRest(type)` / `voteRest(playerId, vote)` / `resolveRest(type)`
- [ ] Long rest: full HP, all spell slots restored, all class resources reset
- [ ] Short rest: spend hit dice for HP, recharge short-rest features (Action Surge, Channel Divinity, Ki, etc)
- [ ] Broadcast via Supabase Realtime
- [ ] AI DM narrates the rest and time passage

## Review
_(filled in after implementation)_
