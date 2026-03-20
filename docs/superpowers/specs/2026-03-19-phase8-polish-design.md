# Phase 8 Polish — Design Spec

> 6 features: Portrait Selection, Mobile Responsive, Opportunity Attacks, Cover Mechanics, Larger Areas + Multi-Floor, Dungeon Generation.
> Pitched roofs excluded — blocked on slope/edge FA assets.

---

## 1. Character Portrait Selection UI

**Approach:** Modal overlay on the Identity step of character creation.

### Behavior
1. On the Identity step (StepIdentity in CharacterCreate.jsx), a "Choose Portrait" button appears next to the DiceBear preview.
2. Clicking it opens a dark fantasy modal with a filterable portrait grid.
3. Portraits auto-filter by **race** (exact match) and **class archetype** (martial/caster/divine/rogue).
4. "Show All" toggle removes filters.
5. Click a portrait to select — gold border highlights it. Click again to deselect.
6. Confirm closes modal, updates the character preview live.
7. If no portraits match or library is empty, show "No portraits for [race] [class] yet" with DiceBear fallback.
8. "Skip" / closing the modal keeps the auto-generated DiceBear portrait.

### Data Model
```
public/portraits/manifest.json
{
  "portraits": [
    {
      "id": "human-fighter-01",
      "file": "human-fighter-01.webp",
      "tags": {
        "race": ["human"],
        "archetype": ["martial"],
        "class": ["fighter", "paladin", "ranger"],
        "gender": ["male"]
      }
    }
  ]
}
```

- Portrait images live in `public/portraits/`.
- Manifest is loaded once on modal open (cached).
- Character object stores: `portrait: "portraits/human-fighter-01.webp"` (local path) or DiceBear URL (fallback).
- Same `portrait` field as today — no schema change.
- `characters.portrait_url` in DB updated to match.

### Archetype Mapping
| Archetype | Classes |
|-----------|---------|
| martial | Fighter, Barbarian, Monk, Ranger |
| caster | Wizard, Sorcerer, Warlock |
| divine | Cleric, Paladin |
| rogue | Rogue, Bard |

### Files
- Modify: `src/components/CharacterCreate.jsx` (add button + modal trigger on Identity step)
- Create: `src/components/PortraitPickerModal.jsx` (~150 lines — modal, grid, filter logic)
- Create: `public/portraits/manifest.json` (empty portraits array initially)
- No backend changes.

### V2 HUD Integration
- `PartyPortraits.jsx` currently shows emoji placeholders. Wire it to render the `portrait` URL as an `<img>` inside the portrait frame.

---

## 2. Mobile/Tablet Responsive Breakpoints

**Approach:** Collapse to drawer below 768px.

### Breakpoints
| Tier | Width | Behavior |
|------|-------|----------|
| Desktop | > 1024px | No changes — current layout |
| Tablet | 768–1024px | Shrink portraits (40x50), narrow action area (180px), smaller fonts |
| Phone | < 768px | Drawer mode — full-screen map, pull-up bottom sheet |

### Phone Layout (< 768px)
1. **PixiJS canvas fills entire viewport** — no bottom bar visible by default.
2. **Bottom sheet handle** — small tab at bottom edge. Drag/tap to pull up.
3. **Bottom sheet contains:** PartyPortraits (small circles), SessionLog, ActionArea/CombatActionBar.
4. **Combat mode:** Floating minimal action bar overlay (3 primary buttons: Attack, Cast, Move) above the canvas. Full action bar in the drawer.
5. **Party portraits** become 32px circles in a horizontal strip at top of the sheet.

### Tablet Adjustments (768–1024px)
- PartyPortraits: 40w x 50h (from 58x72)
- ActionArea: 180px wide (from 240px)
- Session log font: 10px (from 11px)
- Combat buttons: keep current layout, reduce padding
- Portrait names: truncate with ellipsis at 6ch

### Touch Targets
- All interactive elements: minimum 44x44px (Apple HIG)
- Combat buttons: 48px minimum height on tablet/phone
- Pinch-to-zoom on PixiJS canvas already supported via Camera

### Mobile Touch Interactions
- **NPC/exit interaction:** E-key has no mobile equivalent. Add tap-on-NPC/exit detection (PixiApp already has click detection — ensure touch events are wired the same way).
- **Camera pan:** WASD/arrow keys need a mobile alternative. Two-finger drag to pan (distinct from pinch-to-zoom). Camera.js already supports pointer-based pan.
- **Token drag:** Ensure touch drag works for token movement (test on actual device).

### Files
- Modify: `src/hud/hud.css` (add @media queries)
- Modify: `src/hud/BottomBar.jsx` (conditional drawer vs inline)
- Modify: `src/hud/PartyPortraits.jsx` (responsive sizing)
- Modify: `src/hud/ActionArea.jsx` (responsive width)
- Modify: `src/hud/CombatActionBar.jsx` (floating overlay on phone)
- Create: `src/hud/BottomDrawer.jsx` (~100 lines — slide-up panel with handle)

---

## 3. Opportunity Attacks

**Approach:** Auto-scan path + single confirm/cancel warning, then auto-resolve.

### Flow
1. Player clicks MOVE → reachable tiles highlight (unchanged).
2. Player clicks a destination tile.
3. System computes path via `findPathEdge()`.
4. **Pre-scan every step** for OA triggers: does this step leave any enemy's melee reach?
5. **If OAs found →** popup: "This path provokes attacks of opportunity from [Goblin, Orc]. Move anyway?"
6. **Confirm →** movement begins. At each OA trigger tile, brief pause, enemy rolls melee attack, result logged to session. Movement continues (or stops if player drops to 0 HP).
7. **Cancel →** stays put, player picks a different path.

### OA Trigger Logic
```js
// chebyshev() extracted to src/lib/gridUtils.js as a shared utility
// (currently inlined in GameV2, enemyAi, CombatPhase, SpellTargeting)
function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

function findOATriggers(path, enemies, moverDisengaged) {
  if (moverDisengaged) return []  // Disengage prevents all OAs
  const triggers = []
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i], to = path[i + 1]
    for (const enemy of enemies) {
      if (enemy.reactionUsed) continue
      if (enemy.hp <= 0) continue
      const adjBefore = chebyshev(from, enemy.position) <= 1
      const adjAfter = chebyshev(to, enemy.position) <= 1
      if (adjBefore && !adjAfter) {
        triggers.push({ step: i, enemy, tile: from })
      }
    }
  }
  return triggers
}
```

### New Combatant State
```js
reactionUsed: false   // 1 per round, resets at start of their turn
disengaged: false     // set when Disengage action taken, resets at turn start
```

### Disengage Action
- **DISENGAGE button must be added** to CombatActionBar.jsx (currently missing — only DODGE, DASH, HIDE, SAY exist).
- Add as secondary action button alongside Dodge/Dash/Hide.
- Wire it: set `disengaged: true` + consume action via `useAction()`, broadcast `{ type: 'disengage', id }`.
- When `disengaged`, `findOATriggers()` returns empty → no popup, no OAs.

### Enemy AI
- Enemy movement also triggers OAs from adjacent players.
- Auto-resolved (no popup) — logged to session.
- Grunt AI can check OA cost before pathing (prefer safe routes).

### Turn Reset
- `nextTurn` in useStore.js must reset `reactionUsed` and `disengaged` on the combatant whose turn is starting.
- These resets must be included in the `broadcastEncounterAction({ type: 'next-turn' })` payload so non-host clients stay in sync.

### Broadcast
- New action types:
  - `{ type: 'opportunity-attack', attackerId, targetId, roll, total, damage, hit }`
  - `{ type: 'disengage', id }` — marks combatant as disengaged for all clients
- All clients see OA resolve in session log.

### Files
- Create: `src/lib/gridUtils.js` (~15 lines — shared `chebyshev()` utility, replacing inline copies)
- Create: `src/lib/opportunityAttack.js` (~60 lines — findOATriggers, resolveOA)
- Create: `src/lib/opportunityAttack.test.js`
- Modify: `src/GameV2.jsx` (combat movement handler — pre-scan + popup + step-by-step resolve)
- Modify: `src/store/useStore.js` (add reactionUsed, disengaged to combatant state; reset in nextTurn)
- Modify: `src/hud/CombatActionBar.jsx` (add DISENGAGE button + wire mechanic)
- Modify: `src/lib/enemyAi.js` (check OA triggers on enemy movement)

---

## 4. Cover Mechanics

**Approach:** Wall-edge ray-cast + furniture grants half cover and difficult terrain in combat.

### Cover Rules (5e)
| Type | AC Bonus | DEX Save Bonus | Trigger |
|------|----------|----------------|---------|
| Half | +2 | +2 | 1 wall edge or furniture between attacker and target |
| Three-quarters | +5 | +5 | 2+ wall edges between attacker and target |
| Full | Can't target | — | Already handled by wall collision / LOS |

- Cover applies to **all attack rolls** (including melee across a wall edge) and **DEX saving throws** (AoE spells). Per 5e PHB p.196, cover is not ranged-only — a wall between a melee attacker and target still grants cover.

### Detection Algorithm
```js
// Note: isEdgeBlocked is currently module-private in pathfinding.js.
// Must export it from pathfinding.js and import in cover.js.

function calculateCover(attackerPos, targetPos, wallEdges, propCover, width) {
  // Bresenham line from attacker center to target center
  // Deliberate simplification: single center-to-center ray instead of
  // DMG corner-to-corner (4 rays). Sufficient for tile-based grid.
  const line = bresenhamLine(attackerPos, targetPos)
  let wallCrossings = 0
  let propCrossings = 0

  for (let i = 0; i < line.length - 1; i++) {
    const from = line[i], to = line[i + 1]
    if (isEdgeBlocked(wallEdges, width, from.x, from.y, to.x, to.y)) {
      wallCrossings++
    }
    if (propCover.has(`${to.x},${to.y}`)) {
      propCrossings++
    }
  }

  const total = wallCrossings + propCrossings
  if (total >= 2) return 'three-quarters' // +5 AC
  if (total >= 1) return 'half'           // +2 AC
  return 'none'
}
```

### Furniture in Combat
- **Exploration mode:** furniture is walkable (no change).
- **Combat mode:** furniture tiles become:
  - **Difficult terrain** — cost 2 in `terrainCost` array (read by `getReachableTilesEdge`)
  - **Cover providers** — added to `propCover` set for ray-cast checks
- When combat starts: scan props layer, set terrain costs for furniture tiles to 2.
- When combat ends: reset terrain costs to 1.
- Build `propCover` Set from props layer (furniture tile IDs that grant cover).
- `propCover` Set stored in encounter state alongside `terrainCost`, so non-host clients can compute cover locally for UI indicators.

### UI Integration
- Attack log shows cover: "Goblin has half cover (+2 AC)" in session log.
- AC displayed as `base + cover` in attack roll results.
- Cover applies automatically — no player action needed.
- Small shield icon on target token overlay when in cover (optional polish).

### Files
- Create: `src/lib/cover.js` (~80 lines — calculateCover, bresenhamLine, propCover set builder)
- Create: `src/lib/cover.test.js`
- Modify: `src/lib/pathfinding.js` (export `isEdgeBlocked` so cover.js can import it)
- Modify: `src/GameV2.jsx` (attack resolution — call calculateCover, apply AC bonus)
- Modify: `src/GameV2.jsx` (combat start/end — toggle furniture terrain costs, build propCover set)
- Modify: `src/lib/enemyAi.js` (AI considers cover when picking targets)

---

## 5. Larger Areas + Multi-Floor Buildings

### Brief-Driven Sizing
Area size scales with content:
```js
function calculateAreaSize(brief) {
  const poiCount = brief.pois?.length || 3
  const width = Math.min(120, Math.max(40, poiCount * 12))
  const height = Math.round(width * 0.75)
  return { width, height }
}
```
- 3 POIs → 40x30 (small village)
- 6 POIs → 72x54 (town)
- 10+ POIs → 120x90 (city/wilderness)
- AI campaign generator picks size based on POI count, or brief can override with explicit width/height.

### Position Resolution for Larger Areas
- Current `resolvePositions` uses a 5x5 grid (25 cells). For 10+ POIs, multiple chunks may land in the same cell.
- Add overlap detection: if a POI position is already occupied, nudge to nearest free cell.
- Consider upgrading to a larger grid (8x8) for areas > 80 tiles wide.

### Multi-Floor via Linked Areas
Floors are separate areas connected by stair exits. Same area transition system used for outdoor exits.

**Building entry from outdoor areas:** When a player approaches a building door in the outdoor area, the existing roof-lift reveals the interior (single-floor buildings work as today). For multi-floor buildings, the ground floor interior IS the outdoor building's revealed space — same as now. A stair tile within that building acts as an exit to the upper/lower floor area. The roof-lift system is unchanged; multi-floor just adds stair exits inside buildings.

**New brief fields:**
```json
{
  "parentArea": "area-village",    // outdoor area this building belongs to
  "floorLevel": 2,                 // display hint (1 = ground, 2 = upper, -1 = basement)
  "exits": [
    {
      "type": "stairs_down",       // "stairs_up" | "stairs_down" | "ladder"
      "targetArea": "area-village",
      "label": "Stairs Down",
      "spawnAt": "The Rusty Nail"  // POI label — player appears at this building
    }
  ]
}
```

**Exit types:**
| Type | Visual | Use Case |
|------|--------|----------|
| `stairs_up` | Upward arrow icon | Going to upper floors |
| `stairs_down` | Downward arrow icon | Going to lower floors / basements |
| `ladder` | Ladder icon | Caves, rough vertical transitions |
| (default) | Door/path icon | Outdoor area transitions (existing) |

**AI campaign generator instructions:**
- Generate multi-floor briefs for buildings that warrant it: taverns, inns, castles, dungeons, caves.
- Small buildings (shops, houses, cottages) stay single-floor.
- Dungeons always get at least 2 levels.
- Each floor is its own area brief with `parentArea` link.

### New Curated Chunks (~25 new)

**Buildings — multi-room with internal walls:**
- Tavern Ground (16x12) — common room, kitchen, storeroom, stairs
- Tavern Upper (16x12) — hallway, 4 guest rooms, stairs
- Inn Ground (14x10) — lobby, dining room, stairs
- Inn Upper (14x10) — corridor, 3 rooms, stairs
- Castle Hall (20x16) — great hall, throne area, side chambers
- Barracks (12x10) — bunks, armory, training area
- Library (10x10) — shelves, reading nooks, study
- Warehouse (14x8) — open floor, crate stacks, office
- Chapel (8x10) — nave, altar, vestry
- Stable (12x6) — stalls, hay storage, tack room
- Cottage (6x6) — single room with hearth

**Dungeon Rooms:**
- Dungeon Hall (16x10) — pillared hall
- Prison Cells (12x8) — row of cells, guard post
- Throne Room (14x14) — boss arena
- Treasure Vault (8x8) — locked room, chests
- Torture Chamber (8x8) — dark room, implements
- Ritual Chamber (10x10) — magic circles, altars

**Terrain + Landmarks:**
- Pond (8x8), Farm Plot (10x6), Campsite (6x6)
- Graveyard (10x8), Ruins (10x8)
- Fountain (4x4), Bridge (12x4), Cave Entrance (8x6)

**Total: ~36 chunks (11 existing + 25 new).** All multi-room buildings include internal wall edge data for room subdivision.

### Density & Fill Improvements
- **Scatter fill:** After chunk stamping, sprinkle random props (trees, rocks, bushes) in empty terrain areas.
- **Edge padding:** 3-tile border of heavy terrain (trees/rocks) around map edges for natural boundaries.

### Files
- Modify: `src/lib/areaBuilder.js` (brief-driven sizing, multi-floor exit handling, scatter fill, edge padding)
- Modify: `src/lib/campaignGenerator.js` (prompt update for multi-floor generation, size calculation)
- Modify: `src/GameV2.jsx` (stair exit rendering — up/down/ladder icons)
- Create: 25 new chunk files in `src/data/chunks/{buildings,rooms,terrain,landmarks,encounters}/`
- Modify: `src/data/chunks/index.js` (register new chunks)

---

## 6. Dungeon Area Generation

**Approach:** Hybrid — BSP layout + chunk fill where available, procedural fallback where not.

### Pipeline (theme = "dungeon" | "cave" | "crypt" | "sewer")
1. **BSP generates room layout** via `dungeonGenerator.js` — outputs rooms (rectangles) + corridors + door positions.
2. **For each BSP room**, attempt to match a dungeon chunk by size + tags.
   - Match criteria: chunk fits within room bounds, tags match theme.
   - If match found: stamp chunk into room (same remapping pipeline).
   - If no match: **procedural fill** — floor tiles + random prop scatter (tables, crates, barrels, etc.).
3. **Corridors** rendered as 2-tile-wide carved paths with floor tiles and auto-generated wall edges.
4. **Doors** placed at BSP-computed intersections (room-corridor boundaries).
5. **Torch light sources** placed at corridor intervals (every 6-8 tiles).
6. **Enemies** placed using position keywords: `random_room`, `boss_room`, `guard_corridor`.

### Dungeon Brief Config
```json
{
  "theme": "cave",
  "dungeonConfig": {
    "minRooms": 5,
    "maxRooms": 8,
    "corridorWidth": 2
  }
}
```
- When `dungeonConfig` is present (or theme is dungeon/cave/crypt/sewer), areaBuilder uses BSP pipeline instead of chunk-stamping pipeline.
- `minRooms` / `maxRooms` passed directly to `generateDungeon()`.
- `corridorWidth` defaults to 2.

### Enemy Position Keywords
| Keyword | Placement |
|---------|-----------|
| `random_room` | Scatter across random rooms (not starting room) |
| `boss_room` | Furthest room from entrance (or largest room) |
| `guard_corridor` | Placed in corridors between rooms |
| `entrance` | Near the entry stairs/door |

### Theme Tile Variants
| Theme | Floor | Walls | Props |
|-------|-------|-------|-------|
| `dungeon` | Brick/stone | Cut stone | Iron doors, sconces, chains |
| `cave` | Rough stone | Natural rock | Stalagmites, bones, pools |
| `crypt` | Marble/slate | Marble walls | Sarcophagi, candles, urns |
| `sewer` | Wet stone | Mossy stone | Grates, pipes, refuse |

### Procedural Room Fill (fallback when no chunk matches)
1. Fill room with theme floor tiles.
2. Random prop placement (1-3 props per room): furniture, containers, light sources.
3. 20% chance of difficult terrain patch (rubble, water, webs).
4. Boss room gets special props: throne, altar, treasure chest.

### Theme Registration
- `crypt` and `sewer` themes are NOT yet defined in `WALL_STYLES` (wallAutotile.js). Must add entries.
- These themes also need floor/prop tile mappings in the atlas. If tiles aren't available yet, fall back to `dungeon` theme visually.

### Files
- Modify: `src/lib/areaBuilder.js` (detect dungeon theme → delegate to dungeonBuilder)
- Modify: `src/lib/dungeonGenerator.js` (add corridorWidth param, return corridor geometry not just center lines)
- Create: `src/lib/dungeonBuilder.js` (~250 lines — BSP-to-area conversion: room matching, chunk stamping, corridor carving with wall edge generation, procedural room fill, door placement, torch placement, enemy positioning)
- Create: `src/lib/dungeonBuilder.test.js`
- Modify: `src/lib/wallAutotile.js` (add crypt and sewer WALL_STYLES entries)

---

## Non-Goals
- Pitched roof visuals (blocked on FA slope/edge assets — **reminder: import these when available**)
- Multi-floor vertical rendering (isometric/3D) — floors are flat separate areas
- Real-time lighting engine — ambient glow exists, sufficient for now
- Map editor UI — areas are procedurally generated, not hand-placed
