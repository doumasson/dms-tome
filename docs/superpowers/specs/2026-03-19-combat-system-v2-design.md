# Combat System V2 — Design Specification

> **Date:** 2026-03-19
> **Status:** Draft
> **Branch:** `phase1/tilemap-renderer-hud`

---

## 1. Overview

Port the V1 combat system to work natively on the PixiJS tilemap with full 5e rules compliance. Three tightly coupled subsystems:

1. **Enemy Presence** — Enemies visible on the map during exploration, encounter zones with proximity-triggered AI DM decisions
2. **Combat on Tilemap** — Movement, targeting, and AoE all operate on the tile grid with proper 5e rules
3. **Skill Checks** — Mechanical resolution with player-facing UI for modifiers and features

### Goals
- Enemies are visible tokens on the map before combat starts
- AI DM decides when combat triggers (allowing stealth, roleplay, ambush)
- Full 5e movement rules (speed limits, difficult terrain, ally/enemy blocking, diagonal cost)
- AoE spell targeting with visual previews (cone, sphere, line, cube)
- Skill check prompts with optional modifier toggles (Guidance, Bardic Inspiration, Lucky, advantage)
- Conditions mechanically enforce action restrictions

### Non-Goals
- Line-of-sight raycasting through walls (future enhancement)
- Cover mechanics (+2/+5 AC from half/three-quarters cover)
- Opportunity attacks (future enhancement — requires movement interrupts)
- Mounted combat

---

## 2. Enemy Presence on the Tilemap

### 2.1 Enemy Data in Area Briefs

Enemies are defined in area briefs alongside NPCs. The AI campaign generator outputs them as part of the area description.

```json
{
  "enemies": [
    {
      "name": "Goblin Scout",
      "position": "goblin_camp",
      "count": 3,
      "stats": { "hp": 7, "ac": 15, "speed": 30, "cr": "1/4" },
      "attacks": [{ "name": "Scimitar", "bonus": "+4", "damage": "1d6+2" }],
      "abilities": []
    }
  ],
  "encounterZones": [
    {
      "id": "goblin_camp",
      "triggerRadius": 5,
      "enemies": ["Goblin Scout"],
      "difficulty": "easy",
      "dmPrompt": "The party approaches a goblin camp. Three goblins sit around a smoldering fire, gnawing on stolen rations."
    }
  ]
}
```

### 2.2 Enemy Placement

`areaBuilder` places enemy tokens at their POI positions using the same pattern as NPC placement (see `areaBuilder.js` lines 187-214 for the NPC loop):

1. `buildAreaFromBrief` destructures `enemies` and `encounterZones` from the brief alongside existing fields
2. Enemy placement loop mirrors NPC placement: for each enemy group, find the POI position, offset individual enemies by 1-2 tiles around the center
3. Output stored as `zone.enemies[]` in the area object (same shape as tokens: `{ id, name, position: {x,y}, stats, attacks, isEnemy: true }`)
4. `encounterZones` stored as `zone.encounterZones[]` with resolved center positions (POI label → tile coords)

### 2.3 Enemy Token Rendering

Enemy tokens render on the PixiJS token layer during exploration:
- Red-tinted circles (vs gold for players, white for NPCs)
- Enemy name displayed below token
- Non-interactive during exploration (no click-to-chat like NPCs)
- Visible from any distance (no fog-of-war gating in v1 — future enhancement)

### 2.4 Encounter Zone Proximity Trigger

Each encounter zone has a `triggerRadius` (in tiles). When any player token moves within the radius of an encounter zone center:

1. System checks if this zone has already been triggered (one-shot per zone)
2. If not triggered, sends a context prompt to the AI DM:
   - Includes: zone `dmPrompt`, enemy descriptions, party composition, distance
   - AI DM decides: narrate scene, allow stealth/roleplay, or start combat
3. AI DM response format:
   ```json
   {
     "narration": "Three goblins look up from their fire, startled...",
     "startCombat": false,
     "skillCheck": { "skill": "Stealth", "dc": 12, "targets": "all", "reason": "to avoid being noticed" }
   }
   ```
   OR:
   ```json
   {
     "narration": "The goblins shriek and draw their weapons!",
     "startCombat": true,
     "enemies": [/* enemy array from zone data */]
   }
   ```
4. If `startCombat: true`, the encounter initiates with the zone's enemies
5. Zone marked as triggered — won't fire again on subsequent approaches

### 2.5 Encounter Initiation

When combat starts (from proximity trigger or AI DM decision):
1. Camera locks to encounter area bounds (already implemented)
2. Grid tint shifts red (already implemented)
3. Initiative rolled for all combatants (existing system)
4. Initiative strip appears (existing system)
5. Host broadcasts encounter initiation to all clients via `broadcastEncounterAction` (enemy data, initiative order, encounter zone ID). Non-host clients receive and initialize their local combat state.
6. Enemy tokens transition from exploration rendering to combat rendering (HP bars appear)
7. Action bar activates for the first player turn

---

## 3. Combat on the Tilemap

### 3.1 Movement

Movement uses the existing click-to-move pathfinding but with combat restrictions:

**Speed** — Each character has a movement speed (default 30ft = 6 tiles at 5ft/tile). Movement remaining shown numerically near the token. `getReachableTiles` (already exists) computes the highlight overlay.

**Difficult Terrain** — Tiles tagged `difficult` in chunk data cost 2x movement (1 tile = 10ft instead of 5ft). `getReachableTilesEdge` (new) and `findPathEdge` must factor terrain cost into their calculations.

**Moving Through Allies** — Allowed at normal cost per 5e PHB. Characters cannot end their movement on an ally-occupied tile. Pathfinding permits traversal but excludes ally tiles as valid end positions.

**Moving Through Enemies** — Blocked entirely. Enemy-occupied tiles are impassable during pathfinding (unless character has specific features like Halfling's "move through creatures one size larger").

**getReachableTilesEdge** — The existing `getReachableTiles` uses a `boolean[][]` walkGrid incompatible with the V2 edge-based collision system. A new `getReachableTilesEdge(collisionData, width, height, start, maxTiles, terrainCost, occupiedTiles)` function must be created that respects `wallEdges`, `cellBlocked`, terrain costs, and enemy blocking. Returns a `Set<string>` of reachable tile keys.

**Diagonal Movement** — 5e optional grid rule: first diagonal costs 5ft, second costs 10ft, alternating. Implemented in pathfinding cost calculation.

**Dash** — Doubles available movement for the turn. Already tracked in action economy (`movementUsed`).

**Disengage** — Uses action. Allows movement without provoking opportunity attacks (future: when OAs are implemented, this flag prevents them).

**Standing from Prone** — Costs half total movement speed. "Stand Up" button appears in action bar when prone.

### 3.2 Attack Targeting

**Weapon Data** — Weapon stats (reach, range, damage, properties) sourced from equipped weapon in `character_data.equippedItems`, resolved against SRD equipment JSON (`src/data/srd/`). If no weapon equipped, defaults to Unarmed Strike (1 + STR modifier bludgeoning).

**Melee Attacks:**
1. Player clicks "Attack" in action bar
2. Valid targets highlight (adjacent enemies within weapon reach — 5ft default, 10ft for reach weapons)
3. Player clicks an enemy token
4. System rolls d20 + attack bonus vs target AC
5. On hit: roll damage, apply to target HP
6. Results narrated in session log and broadcast

**Ranged Attacks:**
1. Player clicks "Attack", selects ranged weapon
2. Valid targets highlight within weapon range (e.g., shortbow = 80ft normal / 320ft long range)
3. Long range = disadvantage on attack roll
4. Player clicks target, resolution same as melee
5. Ranged attack within 5ft of enemy = disadvantage (unless crossbow expert feat)

### 3.3 Spell Targeting & AoE Previews

When a player casts a spell, the targeting mode depends on the spell's area type. All previews render as semi-transparent PIXI.Graphics overlays on the tile grid.

**Single Target** (e.g., Guiding Bolt, Hold Person):
- Valid targets highlight within spell range
- Click a token to target
- Spell attack roll or save as appropriate

**Sphere/Radius** (e.g., Fireball — 20ft radius):
- Mouse hover shows a circular overlay centered on the cursor tile
- Overlay color: orange/red semi-transparent
- All tokens within the radius highlight
- Click to confirm placement
- Each affected token rolls the appropriate save (DEX for Fireball)
- Damage applied based on save result (half on success if applicable)

**Cone** (e.g., Burning Hands — 15ft cone):
- Cone extends from caster in the direction of the mouse cursor
- Cone rotates as mouse moves (snapped to 16 directions for better coverage in corridors)
- Affected tiles highlight within the cone geometry
- Click to confirm direction
- Save rolls for affected tokens
- **Note:** 5e RAW allows cones from any edge/corner of caster's space. 16-direction snapping is a gameplay simplification for grid-based play, documented as a known deviation.

**Line** (e.g., Lightning Bolt — 100ft line, 5ft wide):
- Line extends from caster through cursor position
- 1-tile-wide beam rendered along the path
- Click to confirm
- Save rolls for affected tokens

**Cube** (e.g., Thunderwave — 15ft cube):
- Square overlay at cursor position
- Click to confirm
- Save rolls for affected tokens

**Self/Radius** (e.g., Shield of Faith, Cure Wounds on self):
- Auto-targets caster or prompts for ally target
- No AoE preview needed

**Implementation Notes:**
- AoE geometry calculations exist in V1's `SpellEffectLayer.jsx` — port the math
- Render via PIXI.Graphics (circles, polygons, rectangles) instead of SVG
- Persistent spell effects (concentration AoEs like Spirit Guardians) remain on the grid until concentration breaks
- Spell range, area size, and save type come from SRD spell data (already bundled)

### 3.4 Save Resolution for AoE

When an AoE spell lands:
1. System identifies all tokens within the area
2. For each affected token:
   - Roll d20 + relevant save modifier (DEX, CON, WIS, etc.)
   - Compare vs caster's spell save DC (8 + proficiency + spellcasting modifier)
   - Apply full damage on fail, half on success (if spell allows)
   - Apply conditions on fail (if spell applies conditions)
3. Results displayed: "Goblin 1: DEX save 8 vs DC 15 — FAIL (22 fire damage)"
4. All results broadcast to multiplayer clients

### 3.5 Enemy AI

**Grunt Enemies (CR < 5):**
- Simple pathfinding: move toward nearest visible enemy (player token)
- If adjacent to a target: melee attack
- If ranged and in range: ranged attack (prefer not moving)
- If no valid target in range: Dash toward nearest
- Processed by host client, results broadcast

**Boss/Elite Enemies (CR >= 5 AND flagged as boss, or solo enemy in encounter):**
- Max 2 Claude API calls per combat round (to control cost)
- Claude API call per turn with tactical context:
  - Current HP, position, available actions
  - All combatant positions and conditions
  - Concentration spells active
- AI chooses: target selection, movement path, action, bonus action
- Response parsed into game actions, executed and broadcast
- Fallback to grunt AI if API call fails

**All Enemy Turns:**
- Host processes enemy turns sequentially
- Each action narrated in session log
- Damage, conditions, movement broadcast to all clients
- 5-second timeout per enemy turn (grunt), 10-second for boss API calls

---

## 4. Skill Checks

### 4.1 AI DM Trigger

The AI DM can request skill checks in its response:
```json
{
  "skillCheck": {
    "skill": "Perception",
    "dc": 14,
    "reason": "to notice the tripwire across the corridor",
    "targets": "all",
    "type": "ability"
  }
}
```

Fields:
- `skill`: Any 5e skill (Perception, Stealth, Athletics, etc.) or ability (Strength, Dexterity, etc.)
- `dc`: Difficulty class
- `reason`: Displayed to players
- `targets`: `"all"` | `"nearest"` (the player who triggered the proximity/interaction event) | specific character name
- `type`: `"ability"` (skill/ability check) | `"save"` (saving throw)

### 4.2 Player UI

When a skill check is requested:

1. **Skill Check Panel** appears in the HUD (ornate dark panel, doesn't block map)
2. Shows: skill name, reason, character's modifier (e.g., "Perception +5")
3. **Optional Modifier Toggles** (shown if available):
   - Guidance: +1d4 (if Guidance spell active on character)
   - Bardic Inspiration: +die (if available, shows die size based on bard level)
   - Lucky: spend 1 luck point to roll additional d20 and choose
   - Advantage/Disadvantage: toggle (auto-set if conditions apply, e.g., Poisoned = disadvantage on ability checks)
4. **Roll Button** — Player clicks to roll
5. **Animation** — d20 rolls visually, modifier added, total displayed
6. **Result** — Pass/fail determined by DC, sent to AI DM
7. AI DM narrates outcome in next response

### 4.3 Passive Checks

For Passive Perception and similar passive checks:
- System calculates: `10 + skill modifier + relevant bonuses`
- No player interaction — checked silently
- If passive score >= DC: AI DM narrates discovery
- If passive score < DC: Nothing happens (player unaware)
- Disadvantage on passive = -5 to passive score

### 4.4 Saving Throws

Saving throws use the same UI as skill checks but:
- Triggered by spell effects, traps, environmental hazards
- Show save modifier instead of skill modifier
- Optional modifiers limited to features that apply to saves (e.g., Paladin's Aura of Protection adds CHA modifier to saves within 10ft)
- Results affect spell damage/conditions as described in §3.4

### 4.5 Broadcast

All skill check results broadcast to all players:
- Session log entry: "Taaaco rolled Perception: 19 (d20: 14 + 5) — Success"
- AI DM receives the result and narrates accordingly
- DC is visible to the rolling player but hidden from others (DM decides what to reveal)

---

## 5. Condition Enforcement

### 5.1 Condition Effects on Actions

Conditions mechanically restrict what a character can do. The action bar greys out unavailable actions.

| Condition | Speed | Actions | Attacks | Spells | Saves |
|---|---|---|---|---|---|
| Prone | Crawl only (half speed). Standing = half movement. | Normal | Melee vs prone: advantage. Ranged >5ft: disadvantage. | Normal | — |
| Restrained | 0 | Normal | Disadvantage. Attacks against: advantage. | Normal | DEX disadvantage |
| Grappled | 0 | Normal (can attempt escape as action) | Normal | Normal | — |
| Stunned | 0 | None | Can't attack | Can't cast | Auto-fail STR/DEX |
| Paralyzed | 0 | None | Can't attack | Can't cast | Auto-fail STR/DEX. Melee hits auto-crit. |
| Incapacitated | Normal | None | Can't attack | Can't cast | — |
| Frightened | Can't move closer to source | Normal | Disadvantage (source visible) | Normal | Ability checks disadvantage |
| Blinded | Normal | Normal | Disadvantage | Normal | Attacks against: advantage |
| Poisoned | Normal | Normal | Disadvantage | Normal | Ability checks disadvantage |
| Charmed | Normal | Can't attack charmer | Can't target charmer harmfully | — | — |
| Unconscious | 0 | None | Can't attack | Can't cast | Auto-fail STR/DEX. Melee auto-crit. |

### 5.2 UI Enforcement

- Action bar buttons disabled when condition prevents them (Stunned = all greyed)
- "Stand Up" button appears when Prone (costs half movement)
- Movement highlight excludes tiles closer to fear source when Frightened
- Advantage/disadvantage auto-applied to rolls based on conditions
- Concentration CON save auto-triggered on damage (DC = max(10, half damage taken))

### 5.3 Existing V1 Systems to Reuse

These V1 systems are already implemented and should be wired into V2:
- Condition tracking per combatant (`encounter.combatants[].conditions`)
- Advantage/disadvantage calculation in `AttackPanel.jsx`
- Concentration tracking and CON save auto-trigger
- Death saves (3 successes = stabilize, 3 failures = death)
- Action economy tracking (`actionsUsed`, `bonusActionsUsed`, `movementUsed`)

---

## 6. Implementation Priority

These should be built in order since each depends on the previous:

1. **Enemy data model + placement** — Add enemies to area briefs, place in areaBuilder, render tokens
2. **Encounter zones + proximity trigger** — Zone detection, AI DM prompt, combat initiation
3. **Combat movement** — `getReachableTilesEdge` (edge-based), speed limits, difficult terrain, ally/enemy blocking, diagonal costs
4. **Attack targeting on tilemap** — Click-to-target for melee/ranged, damage resolution
5. **AoE spell targeting** — Cone/sphere/line/cube previews via PIXI.Graphics, save resolution
6. **Skill check UI** — Panel, modifier toggles, roll animation, broadcast
7. **Condition enforcement** — Gate action bar, affect pathfinding, auto-apply adv/disadvantage
8. **Enemy AI** — Grunt pathfinding + boss Claude API tactical decisions

---

## 7. Files Affected

### New Files
- `src/engine/AoEOverlay.js` — PIXI.Graphics AoE shape rendering (cone, sphere, line, cube)
- `src/engine/CombatMovement.js` — Movement cost calculation with terrain, ally blocking, diagonal rules
- `src/components/SkillCheckPanel.jsx` — Skill check prompt UI with modifier toggles
- `src/lib/encounterZones.js` — Proximity detection, zone trigger tracking, DM prompt generation

### Modified Files
- `src/lib/areaBuilder.js` — Enemy placement alongside NPCs
- `src/lib/campaignGenerator.js` — Output enemies and encounterZones in area briefs
- `src/engine/PixiApp.jsx` — Enemy token rendering, AoE overlay layer, combat movement highlights
- `src/engine/TokenLayer.js` — Red tint for enemy tokens, HP bars in combat mode
- `src/GameV2.jsx` — Encounter zone proximity checks, combat flow, skill check handling
- `src/lib/narratorApi.js` — Encounter context in system prompt, skill check parsing
- `src/lib/pathfinding.js` — Terrain cost, ally/enemy blocking, diagonal movement cost
- `src/store/useStore.js` — Enemy state in area data, encounter zone triggered flags
- `src/hud/CombatActionBar.jsx` — Condition-based action gating, spell targeting mode
- `src/components/combat/AttackPanel.jsx` — Port targeting logic to PixiJS click targets
