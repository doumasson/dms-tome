# Combat System V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full 5e combat on the PixiJS tilemap — enemies visible during exploration, proximity-triggered encounters via AI DM, movement with terrain costs, AoE spell targeting with visual previews, skill checks with modifier UI, and condition enforcement.

**Architecture:** Enemies are placed in areas alongside NPCs using the same areaBuilder pipeline. Encounter zones trigger AI DM prompts on proximity. Combat uses edge-based pathfinding with terrain cost extensions. AoE targeting renders via PIXI.Graphics overlays. Skill checks surface a HUD panel with modifier toggles. All combat state broadcasts via existing liveChannel pattern.

**Tech Stack:** PixiJS v8, React, Zustand, Claude API (Haiku), existing pathfinding/collision, existing encounter store.

**Spec:** `docs/superpowers/specs/2026-03-19-combat-system-v2-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/encounterZones.js` | Proximity detection, zone trigger tracking, DM prompt generation |
| `src/lib/encounterZones.test.js` | Tests for proximity detection |
| `src/lib/combatMovement.js` | Movement cost calculation: terrain, diagonal, ally/enemy blocking |
| `src/lib/combatMovement.test.js` | Tests for movement cost |
| `src/engine/AoEOverlay.js` | PIXI.Graphics AoE shape rendering (cone, sphere, line, cube) |
| `src/engine/AoEOverlay.test.js` | Tests for geometry calculations |
| `src/components/SkillCheckPanel.jsx` | Skill check prompt UI with modifier toggles |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/areaBuilder.js` | Enemy placement loop (mirrors NPC pattern) |
| `src/lib/campaignGenerator.js` | Output enemies + encounterZones in area briefs |
| `src/lib/narratorApi.js` | Encounter context in system prompt, skill check + encounter zone parsing |
| `src/lib/pathfinding.js` | Add `getReachableTilesEdge` with terrain cost, add cost-aware pathfinding |
| `src/engine/TokenLayer.js` | Enemy token rendering (red tint, HP bars in combat) |
| `src/engine/PixiApp.jsx` | AoE overlay layer, combat click targeting |
| `src/GameV2.jsx` | Encounter zone proximity checks, combat movement flow, skill check handling |
| `src/store/useStore.js` | Enemy state in area data, encounter zone triggered flags |
| `src/hud/CombatActionBar.jsx` | Condition-based action gating |
| `src/lib/liveChannel.js` | `broadcastEncounterZoneTrigger` helper |

---

### Task 1: Enemy Placement in areaBuilder

**Files:**
- Modify: `src/lib/areaBuilder.js`
- Modify: `src/lib/campaignGenerator.js`

Add enemy placement to the area build pipeline, mirroring the NPC pattern. Enemies are defined in area briefs and placed at POI positions.

- [ ] **Step 1: Add enemy placement loop to areaBuilder**

In `src/lib/areaBuilder.js`, after the NPC placement loop (after line ~214), add an enemy placement loop. Import nothing new — follows the exact same pattern.

The brief already has `npcs` — add support for `enemies` in the destructured brief fields. Each enemy has `{ name, position (POI label), count, stats, attacks }`.

```js
// After "// 10. Place NPCs" section, add:
// 11. Place enemies
const placedEnemies = []
for (const enemy of (brief.enemies || [])) {
  const poiLabel = enemy.position
  const pos = positions[poiLabel]
  const matchedPoi = matchedPois.find(p => (p.label || p.id) === poiLabel)
  const chunkW = matchedPoi?.chunk.width || 6
  const chunkH = matchedPoi?.chunk.height || 6
  const baseX = pos ? pos.x + Math.floor(chunkW / 2) : Math.floor(width / 2)
  const baseY = pos ? pos.y + Math.floor(chunkH / 2) : Math.floor(height / 2)

  for (let i = 0; i < (enemy.count || 1); i++) {
    // Spread multiple enemies around the center
    const offsetX = i === 0 ? 0 : ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2))
    const offsetY = i === 0 ? 0 : ((i % 3 === 0 ? 1 : 0))
    placedEnemies.push({
      id: `${enemy.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
      name: i > 0 ? `${enemy.name} ${i + 1}` : enemy.name,
      position: { x: baseX + offsetX, y: baseY + offsetY },
      stats: enemy.stats || { hp: 10, ac: 12, speed: 30 },
      attacks: enemy.attacks || [{ name: 'Attack', bonus: '+3', damage: '1d6+1' }],
      isEnemy: true,
    })
  }
}
```

Add `enemies: placedEnemies` and `encounterZones: brief.encounterZones || []` to the return object (alongside `npcs`, `buildings`, etc.).

- [ ] **Step 2: Update campaignGenerator to output enemies**

In `src/lib/campaignGenerator.js`, find the prompt that generates area briefs. Add enemies and encounterZones to the expected output format. The AI should output enemies alongside NPCs when the area has hostile creatures.

Add to the area brief schema in the generation prompt:
```
"enemies": [{ "name": "Goblin", "position": "poi_label", "count": 3, "stats": { "hp": 7, "ac": 15, "speed": 30, "cr": "1/4" }, "attacks": [{ "name": "Scimitar", "bonus": "+4", "damage": "1d6+2" }] }],
"encounterZones": [{ "id": "zone_id", "triggerRadius": 5, "enemies": ["Goblin"], "dmPrompt": "Description of what the party sees" }]
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/areaBuilder.js src/lib/campaignGenerator.js
git commit -m "feat: add enemy placement to areaBuilder pipeline"
```

---

### Task 2: Enemy Token Rendering

**Files:**
- Modify: `src/engine/TokenLayer.js`
- Modify: `src/GameV2.jsx`

Render enemy tokens on the tilemap during exploration with red tint and enemy nameplate.

- [ ] **Step 1: Pass enemies to token rendering**

In `src/GameV2.jsx`, find where `tokens` array is built for PixiApp (search for `tokens={`). Add enemies from `zone.enemies` to the tokens array:

```js
const enemyTokens = (zone?.enemies || []).map(e => ({
  id: e.id,
  name: e.name,
  x: e.position.x,
  y: e.position.y,
  color: 0x8b0000,        // dark red fill
  borderColor: 0xff3333,   // bright red border
  isEnemy: true,
  isNpc: false,
}))
// Merge with existing player + NPC tokens
const allTokens = [...playerTokens, ...npcTokens, ...enemyTokens]
```

- [ ] **Step 2: Add HP bar rendering for combat mode**

In `src/engine/TokenLayer.js`, in the `renderTokens` function, after the name label, add HP bar for enemy tokens when in combat:

```js
if (token.isEnemy && token.showHpBar && token.currentHp != null) {
  const barWidth = radius * 1.6
  const barHeight = 4
  const hpPct = Math.max(0, token.currentHp / token.maxHp)
  const hpBar = new PIXI.Graphics()
  // Background (dark red)
  hpBar.rect(-barWidth / 2, -radius - 8, barWidth, barHeight).fill(0x3a0000)
  // Foreground (green → red based on %)
  const hpColor = hpPct > 0.5 ? 0x44aa44 : hpPct > 0.25 ? 0xcc8800 : 0xcc2222
  hpBar.rect(-barWidth / 2, -radius - 8, barWidth * hpPct, barHeight).fill(hpColor)
  group.addChild(hpBar)
}
```

- [ ] **Step 3: Verify build and that enemies appear on map**

Run: `npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/engine/TokenLayer.js src/GameV2.jsx
git commit -m "feat: render enemy tokens on tilemap with red tint and HP bars"
```

---

### Task 3: Encounter Zone Proximity Detection

**Files:**
- Create: `src/lib/encounterZones.js`
- Create: `src/lib/encounterZones.test.js`
- Modify: `src/GameV2.jsx`
- Modify: `src/lib/narratorApi.js`

Detect when a player enters an encounter zone radius and prompt the AI DM.

- [ ] **Step 1: Write tests for proximity detection**

```js
// src/lib/encounterZones.test.js
import { describe, it, expect } from 'vitest'
import { checkEncounterProximity } from './encounterZones.js'

describe('checkEncounterProximity', () => {
  const zones = [
    { id: 'goblin_camp', center: { x: 20, y: 15 }, triggerRadius: 5, triggered: false },
    { id: 'bandit_lair', center: { x: 40, y: 30 }, triggerRadius: 3, triggered: false },
  ]

  it('returns zone when player within radius', () => {
    const result = checkEncounterProximity({ x: 22, y: 15 }, zones)
    expect(result).toBeTruthy()
    expect(result.id).toBe('goblin_camp')
  })

  it('returns null when player outside all radii', () => {
    const result = checkEncounterProximity({ x: 0, y: 0 }, zones)
    expect(result).toBeNull()
  })

  it('returns null for already-triggered zones', () => {
    const triggered = [{ ...zones[0], triggered: true }, zones[1]]
    const result = checkEncounterProximity({ x: 22, y: 15 }, triggered)
    expect(result).toBeNull()
  })

  it('uses Euclidean distance', () => {
    // Exactly at radius boundary (5 tiles)
    const result = checkEncounterProximity({ x: 25, y: 15 }, zones)
    expect(result).toBeTruthy()
    // Just outside radius
    const outside = checkEncounterProximity({ x: 26, y: 15 }, zones)
    expect(outside).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/encounterZones.test.js`

- [ ] **Step 3: Implement proximity detection**

```js
// src/lib/encounterZones.js

/**
 * Check if playerPos is within any untriggered encounter zone.
 * @param {{ x: number, y: number }} playerPos
 * @param {Array<{ id, center: {x,y}, triggerRadius, triggered }>} zones
 * @returns {object|null} The triggered zone, or null
 */
export function checkEncounterProximity(playerPos, zones) {
  for (const zone of zones) {
    if (zone.triggered) continue
    const dx = playerPos.x - zone.center.x
    const dy = playerPos.y - zone.center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= zone.triggerRadius) return zone
  }
  return null
}

/**
 * Build the DM prompt for an encounter zone trigger.
 */
export function buildEncounterPrompt(zone, partyDescription) {
  return `ENCOUNTER ZONE TRIGGERED: ${zone.dmPrompt || 'The party approaches a dangerous area.'}

The party is ${Math.round(zone._distance || 0)} tiles away. ${partyDescription}

Decide how to proceed:
- Do the enemies notice the party? Is there an opportunity for stealth or roleplay?
- If combat should begin immediately, set startCombat to true.
- If you want the party to roll a skill check first (e.g., Stealth), use the skillCheck field.
- You may narrate the scene and let the party decide how to approach.`
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/encounterZones.test.js`
Expected: 4 tests pass

- [ ] **Step 5: Wire proximity check into GameV2**

In `src/GameV2.jsx`, add a useEffect that checks encounter zones on player movement:

```js
import { checkEncounterProximity, buildEncounterPrompt } from './lib/encounterZones'

// After player position changes, check encounter zones
useEffect(() => {
  if (!zone?.encounterZones || !playerPos || inCombat) return
  const pos = playerPosRef.current

  // Build zone list with resolved center positions
  const zones = zone.encounterZones.map(ez => ({
    ...ez,
    center: ez.center || ez.position || { x: 0, y: 0 },
    triggered: ez._triggered || false,
  }))

  const triggered = checkEncounterProximity(pos, zones)
  if (!triggered) return

  // Mark as triggered so it doesn't fire again
  triggered._triggered = true

  // Broadcast zone trigger to all clients
  if (dmMode) {
    broadcastEncounterAction({ type: 'encounter-zone-triggered', zoneId: triggered.id })
  }

  // Send encounter context to AI DM
  const prompt = buildEncounterPrompt(triggered, '')
  // Add as a system-level message that triggers DM response
  addNarratorMessage({ role: 'user', speaker: 'System', text: prompt })
  // The narrator response handler already processes startCombat and skillCheck
  // When startCombat: true is returned, call startEncounter() with zone enemies
  // and broadcast via broadcastEncounterAction({ type: 'combat-start', ... })
}, [playerPos])
```

- [ ] **Step 6: Update narratorApi to include encounter zones in system prompt**

In `src/lib/narratorApi.js`, in `buildSystemPrompt`, after the enemy list, add encounter zone context:

```js
const encounterZoneList = (currentScene?.encounterZones || [])
  .filter(ez => !ez._triggered)
  .map(ez => `- ${ez.id}: ${ez.dmPrompt || 'hostile area'} (radius: ${ez.triggerRadius} tiles)`)
  .join('\n')
const encounterContext = encounterZoneList
  ? `\nEncounter zones (untriggered):\n${encounterZoneList}`
  : ''
```

- [ ] **Step 7: Verify build**

Run: `npx vite build`

- [ ] **Step 8: Commit**

```bash
git add src/lib/encounterZones.js src/lib/encounterZones.test.js src/GameV2.jsx src/lib/narratorApi.js
git commit -m "feat: encounter zone proximity detection with AI DM prompt"
```

---

### Task 4: Edge-Based Movement Range (getReachableTilesEdge)

**Files:**
- Modify: `src/lib/pathfinding.js`
- Modify: `src/lib/pathfinding.test.js`

The existing `getReachableTiles` uses a `boolean[][]` grid (V1 legacy). Create `getReachableTilesEdge` that works with the V2 edge-based collision system and supports terrain cost.

- [ ] **Step 1: Write tests**

```js
// Add to src/lib/pathfinding.test.js
import { getReachableTilesEdge } from './pathfinding.js'

describe('getReachableTilesEdge', () => {
  it('returns tiles within movement range', () => {
    const width = 10, height = 10
    const wallEdges = new Uint8Array(width * height)
    const cellBlocked = new Uint8Array(width * height)
    const result = getReachableTilesEdge(
      { wallEdges, cellBlocked }, width, height,
      { x: 5, y: 5 }, 3, null, new Set()
    )
    expect(result.has('5,5')).toBe(true)
    expect(result.has('5,2')).toBe(true)  // 3 tiles north
    expect(result.has('5,1')).toBe(false)  // 4 tiles north — out of range
  })

  it('respects wall edges', () => {
    const width = 10, height = 10
    const wallEdges = new Uint8Array(width * height)
    const cellBlocked = new Uint8Array(width * height)
    // Block north edge of cell (5,5)
    wallEdges[5 * width + 5] |= 0x1 // EDGE_N
    const result = getReachableTilesEdge(
      { wallEdges, cellBlocked }, width, height,
      { x: 5, y: 5 }, 3, null, new Set()
    )
    expect(result.has('5,4')).toBe(false)  // Blocked by wall
    expect(result.has('5,6')).toBe(true)   // South is fine
  })

  it('doubles cost for difficult terrain', () => {
    const width = 10, height = 10
    const wallEdges = new Uint8Array(width * height)
    const cellBlocked = new Uint8Array(width * height)
    const terrainCost = new Uint8Array(width * height)
    terrainCost[4 * width + 5] = 2 // Cell (5,4) is difficult terrain
    const result = getReachableTilesEdge(
      { wallEdges, cellBlocked }, width, height,
      { x: 5, y: 5 }, 2, terrainCost, new Set()
    )
    // Moving north costs 2 (difficult), so only 1 tile of budget left (not enough for another difficult)
    expect(result.has('5,4')).toBe(true)
    expect(result.has('5,3')).toBe(false)  // Would cost 2 more, total 4 > budget 2... wait
    // Actually: start at (5,5), move to (5,4) costs 2. Budget is 2. So (5,4) reachable, (5,3) not.
    expect(result.has('5,3')).toBe(false)
  })

  it('blocks enemy-occupied tiles', () => {
    const width = 10, height = 10
    const wallEdges = new Uint8Array(width * height)
    const cellBlocked = new Uint8Array(width * height)
    const enemyTiles = new Set(['5,4']) // Enemy at (5,4)
    const result = getReachableTilesEdge(
      { wallEdges, cellBlocked }, width, height,
      { x: 5, y: 5 }, 3, null, enemyTiles
    )
    expect(result.has('5,4')).toBe(false) // Blocked by enemy
    expect(result.has('5,3')).toBe(false) // Can't path through enemy
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/pathfinding.test.js`

- [ ] **Step 3: Implement getReachableTilesEdge**

Add to `src/lib/pathfinding.js` (MUST be in this file since it uses the non-exported `isEdgeBlocked` function):

```js
/**
 * Flood-fill reachable tiles using edge-based collision + terrain cost.
 * @param {{ wallEdges: Uint8Array, cellBlocked: Uint8Array }} collisionData
 * @param {number} width
 * @param {number} height
 * @param {{ x: number, y: number }} start
 * @param {number} maxCost — max movement in tiles (e.g., speed/5 = 6 for 30ft)
 * @param {Uint8Array|null} terrainCost — per-tile cost multiplier (0 or 1 = normal, 2 = difficult)
 * @param {Set<string>} blockedTiles — enemy-occupied tiles (impassable)
 * @returns {Set<string>} reachable tile keys "x,y"
 */
export function getReachableTilesEdge(collisionData, width, height, start, maxCost, terrainCost, blockedTiles) {
  const { wallEdges, cellBlocked } = collisionData
  const reachable = new Set()
  const costs = new Float32Array(width * height).fill(Infinity)
  const startIdx = start.y * width + start.x
  costs[startIdx] = 0
  reachable.add(`${start.x},${start.y}`)

  // Priority queue (simple sorted array — areas are small enough)
  const queue = [{ x: start.x, y: start.y, cost: 0 }]
  const dirs = [
    { dx: 0, dy: -1 }, // N
    { dx: 1, dy: 0 },  // E
    { dx: 0, dy: 1 },  // S
    { dx: -1, dy: 0 }, // W
  ]

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const { x, y, cost } = queue.shift()
    if (cost > costs[y * width + x]) continue

    for (const { dx, dy } of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const ni = ny * width + nx
      if (cellBlocked[ni] === 1) continue
      if (blockedTiles.has(`${nx},${ny}`)) continue
      if (isEdgeBlocked(wallEdges, width, x, y, nx, ny)) continue

      const tileCost = (terrainCost && terrainCost[ni] >= 2) ? 2 : 1
      const newCost = cost + tileCost
      if (newCost > maxCost) continue
      if (newCost >= costs[ni]) continue

      costs[ni] = newCost
      reachable.add(`${nx},${ny}`)
      queue.push({ x: nx, y: ny, cost: newCost })
    }
  }

  return reachable
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/pathfinding.test.js`
Expected: All existing tests pass + 4 new tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/pathfinding.js src/lib/pathfinding.test.js
git commit -m "feat: add getReachableTilesEdge with terrain cost and enemy blocking"
```

---

### Task 5: Combat Movement on Tilemap

**Files:**
- Modify: `src/GameV2.jsx`
- Modify: `src/engine/MovementRange.js`

Wire `getReachableTilesEdge` into the combat movement flow. When it's a player's turn, show reachable tiles, allow click-to-move within movement budget.

- [ ] **Step 1: Update MovementRange to use edge-based reachability**

In `src/engine/MovementRange.js`, update `renderMovementRange` to accept a `Set<string>` directly (from `getReachableTilesEdge`) instead of computing it internally:

```js
export function renderMovementRange(container, reachableTiles, tileSize, color = 0x44aa44) {
  clearMovementRange(container)
  for (const key of reachableTiles) {
    const [x, y] = key.split(',').map(Number)
    const g = new PIXI.Graphics()
    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
    g.fill({ color, alpha: 0.2 })
    g.stroke({ width: 1, color, alpha: 0.4 })
    container.addChild(g)
  }
}
```

- [ ] **Step 2: Wire combat movement in GameV2**

In `src/GameV2.jsx`, in the combat tile-click handler, compute reachable tiles from the active combatant's position using `getReachableTilesEdge`:

```js
// When it's the player's turn in combat, compute and show movement range
useEffect(() => {
  if (!inCombat || !zone?.wallEdges) return
  const active = encounter.combatants?.[encounter.currentTurn]
  if (!active || active.isEnemy || !active.position) return

  const enemyTiles = new Set(
    encounter.combatants
      .filter(c => c.isEnemy && c.currentHp > 0 && c.position)
      .map(c => `${c.position.x},${c.position.y}`)
  )
  const reachable = getReachableTilesEdge(
    { wallEdges: zone.wallEdges, cellBlocked: zone.cellBlocked || new Uint8Array(zone.width * zone.height) },
    zone.width, zone.height,
    active.position,
    active.remainingMove || Math.floor((active.speed || 30) / 5),
    null, // terrainCost — add when terrain tagging exists
    enemyTiles
  )
  const grid = stageLayersRef.current?.grid
  if (grid) renderMovementRange(grid, reachable, zone.tileSize || 200)

  return () => { if (grid) clearMovementRange(grid) }
}, [encounter.currentTurn, encounter.phase, inCombat])
```

When the player clicks a tile during combat, check if it's in the reachable set, pathfind to it, animate the token, and deduct movement:

```js
// In the tile click handler, add combat movement branch:
if (inCombat) {
  const active = encounter.combatants?.[encounter.currentTurn]
  if (!active || active.isEnemy) return
  if (!reachableTiles.has(`${x},${y}`)) return // Not in range

  const path = findPathEdge(
    { wallEdges: zone.wallEdges, cellBlocked: zone.cellBlocked },
    zone.width, zone.height, active.position, { x, y }
  )
  if (!path) return

  const cost = path.length - 1 // tiles moved
  useMovement(active.id, cost)
  moveToken(active.id, x, y, cost)
  animateTokenAlongPath(active.id, path, null, null, zone.tileSize || 200)
  broadcastEncounterAction({ type: 'move-token', id: active.id, position: { x, y }, cost })
}
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/GameV2.jsx src/engine/MovementRange.js
git commit -m "feat: wire combat movement with edge-based reachability and enemy blocking"
```

---

### Task 6: Attack Targeting on Tilemap

**Files:**
- Modify: `src/GameV2.jsx`
- Modify: `src/hud/CombatActionBar.jsx`

When player clicks "Attack" in action bar, enter targeting mode. Highlight valid targets. Click an enemy token to resolve the attack.

- [ ] **Step 1: Add targeting mode state**

In `src/GameV2.jsx`, add state for targeting mode:

```js
const [targetingMode, setTargetingMode] = useState(null)
// null | 'attack' | 'spell' | { type: 'spell', spell: spellData }
```

When CombatActionBar fires `onAction('attack')`, set targeting mode:

```js
function handleCombatAction(type) {
  if (type === 'attack') {
    setTargetingMode('attack')
    return
  }
  // ... other types
}
```

- [ ] **Step 2: Handle target click**

In the tile click handler, when `targetingMode === 'attack'`:

```js
if (targetingMode === 'attack') {
  // Check if clicked tile has an enemy
  const target = encounter.combatants.find(c =>
    c.isEnemy && c.currentHp > 0 && c.position?.x === x && c.position?.y === y
  )
  if (!target) return // Clicked empty tile — ignore

  const active = encounter.combatants[encounter.currentTurn]
  // Range check: adjacent for melee (distance <= 1), weapon range for ranged
  // Chebyshev distance (diagonal = 1 tile for adjacency checks)
  const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
  const weapon = active.attacks?.[0] || { name: 'Unarmed', bonus: '+0', damage: '1' }
  const isRanged = weapon.range != null
  const maxRange = isRanged ? Math.floor((weapon.range || 80) / 5) : 1

  if (dist > maxRange) {
    addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target out of range.' })
    return
  }

  // Resolve attack (reuse existing logic from handleCombatAction)
  const bonus = parseInt(weapon.bonus) || 0
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + bonus
  const hit = d20 === 20 || total >= (target.ac || 10)
  const damage = hit ? rollDamage(weapon.damage).total : 0

  if (hit && damage > 0) applyEncounterDamage(target.id, damage)
  useAction(active.id)
  setTargetingMode(null)

  const entry = hit
    ? `${active.name} → ${target.name}: HIT! d20(${d20})+${bonus}=${total} vs AC ${target.ac}. ${damage} damage.`
    : `${active.name} → ${target.name}: MISS. d20(${d20})+${bonus}=${total} vs AC ${target.ac}.`
  addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
  broadcastEncounterAction({ type: 'attack', attackerId: active.id, targetId: target.id, hit, damage, log: entry })
}
```

- [ ] **Step 3: Highlight valid targets**

When `targetingMode === 'attack'`, render highlight rings on valid enemy tokens. Add a highlight container in PixiApp or reuse the grid layer.

- [ ] **Step 4: Add Escape to cancel targeting**

```js
useEffect(() => {
  if (!targetingMode) return
  const onKey = (e) => { if (e.key === 'Escape') setTargetingMode(null) }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [targetingMode])
```

- [ ] **Step 5: Verify build**

Run: `npx vite build`

- [ ] **Step 6: Commit**

```bash
git add src/GameV2.jsx src/hud/CombatActionBar.jsx
git commit -m "feat: click-to-target attack resolution on tilemap"
```

---

### Task 7: AoE Spell Targeting Overlay

**Files:**
- Create: `src/engine/AoEOverlay.js`
- Create: `src/engine/AoEOverlay.test.js`
- Modify: `src/engine/PixiApp.jsx`
- Modify: `src/GameV2.jsx`

Render AoE shape previews (sphere, cone, line, cube) as PIXI.Graphics overlays. Player hovers to preview, clicks to confirm.

- [ ] **Step 1: Write geometry tests**

```js
// src/engine/AoEOverlay.test.js
import { describe, it, expect } from 'vitest'
import { getTilesInSphere, getTilesInCone, getTilesInLine, getTilesInCube } from './AoEOverlay.js'

describe('AoE geometry', () => {
  it('sphere returns tiles within radius', () => {
    const tiles = getTilesInSphere({ x: 5, y: 5 }, 2) // 2-tile radius
    expect(tiles).toContainEqual({ x: 5, y: 5 })
    expect(tiles).toContainEqual({ x: 5, y: 3 })
    expect(tiles).not.toContainEqual({ x: 5, y: 2 })
  })

  it('cone returns tiles in 15ft cone (3 tiles)', () => {
    const tiles = getTilesInCone({ x: 5, y: 5 }, 'N', 3)
    expect(tiles.length).toBeGreaterThan(0)
    // Cone north should include tiles north of caster
    expect(tiles.some(t => t.y < 5)).toBe(true)
    // Should not include tiles south of caster
    expect(tiles.every(t => t.y <= 5)).toBe(true)
  })

  it('line returns tiles along a direction', () => {
    const tiles = getTilesInLine({ x: 5, y: 5 }, 'E', 4) // 4-tile line east
    expect(tiles).toContainEqual({ x: 6, y: 5 })
    expect(tiles).toContainEqual({ x: 9, y: 5 })
  })

  it('cube returns square area', () => {
    const tiles = getTilesInCube({ x: 5, y: 5 }, 3) // 3x3 cube
    expect(tiles.length).toBe(9)
  })
})
```

- [ ] **Step 2: Implement geometry functions**

```js
// src/engine/AoEOverlay.js
import * as PIXI from 'pixi.js'

export function getTilesInSphere(center, radiusTiles) {
  const tiles = []
  for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
    for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) <= radiusTiles) {
        tiles.push({ x: center.x + dx, y: center.y + dy })
      }
    }
  }
  return tiles
}

export function getTilesInCone(origin, direction, lengthTiles) {
  // 16-direction cone — compute tiles within a 53-degree arc
  const tiles = []
  const dirVectors = {
    N: { dx: 0, dy: -1 }, NE: { dx: 1, dy: -1 }, E: { dx: 1, dy: 0 }, SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 }, SW: { dx: -1, dy: 1 }, W: { dx: -1, dy: 0 }, NW: { dx: -1, dy: -1 },
    NNE: { dx: 0.4, dy: -1 }, ENE: { dx: 1, dy: -0.4 }, ESE: { dx: 1, dy: 0.4 }, SSE: { dx: 0.4, dy: 1 },
    SSW: { dx: -0.4, dy: 1 }, WSW: { dx: -1, dy: 0.4 }, WNW: { dx: -1, dy: -0.4 }, NNW: { dx: -0.4, dy: -1 },
  }
  const dir = dirVectors[direction] || dirVectors.N
  const angle = Math.atan2(dir.dy, dir.dx)
  const halfAngle = Math.PI / 3 // ~53 degrees (5e cone)

  for (let dy = -lengthTiles; dy <= lengthTiles; dy++) {
    for (let dx = -lengthTiles; dx <= lengthTiles; dx++) {
      if (dx === 0 && dy === 0) continue
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > lengthTiles) continue
      const tileAngle = Math.atan2(dy, dx)
      let angleDiff = Math.abs(tileAngle - angle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      if (angleDiff <= halfAngle) {
        tiles.push({ x: origin.x + dx, y: origin.y + dy })
      }
    }
  }
  return tiles
}

export function getTilesInLine(origin, direction, lengthTiles) {
  const dirVectors = {
    N: { dx: 0, dy: -1 }, NE: { dx: 1, dy: -1 }, E: { dx: 1, dy: 0 }, SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 }, SW: { dx: -1, dy: 1 }, W: { dx: -1, dy: 0 }, NW: { dx: -1, dy: -1 },
  }
  const dir = dirVectors[direction] || dirVectors.N
  const tiles = []
  for (let i = 1; i <= lengthTiles; i++) {
    tiles.push({ x: origin.x + dir.dx * i, y: origin.y + dir.dy * i })
  }
  return tiles
}

export function getTilesInCube(center, sizeTiles) {
  const half = Math.floor(sizeTiles / 2)
  const tiles = []
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      tiles.push({ x: center.x + dx, y: center.y + dy })
    }
  }
  return tiles
}

/**
 * Render AoE preview overlay on the grid.
 */
export function renderAoEPreview(container, tiles, tileSize, color = 0xff4400) {
  clearAoEPreview(container)
  for (const { x, y } of tiles) {
    const g = new PIXI.Graphics()
    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
    g.fill({ color, alpha: 0.3 })
    g.stroke({ width: 2, color, alpha: 0.6 })
    g._isAoE = true
    container.addChild(g)
  }
}

export function clearAoEPreview(container) {
  for (let i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i]._isAoE) {
      container.children[i].destroy()
      container.removeChildAt(i)
    }
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/AoEOverlay.test.js`

- [ ] **Step 4: Wire AoE targeting into GameV2**

When `targetingMode` is a spell with an area type, track mouse position and render preview. On click, resolve saves for affected tokens.

This is a multi-part integration. Break into sub-steps:

**4a: Enter spell targeting mode**
When CombatActionBar fires `onAction('cast')`, show spell list. On spell select:
```js
setTargetingMode({ type: 'spell', spell: selectedSpell })
```

**4b: Mouse hover preview**
In PixiApp's pointer move handler, when `targetingMode.type === 'spell'`:
```js
const spell = targetingMode.spell
const tiles = spell.areaType === 'sphere' ? getTilesInSphere(hoverTile, spell.areaSize / 5)
  : spell.areaType === 'cone' ? getTilesInCone(casterPos, directionFromMouse, spell.areaSize / 5)
  : spell.areaType === 'line' ? getTilesInLine(casterPos, dirFromMouse, spell.areaSize / 5)
  : spell.areaType === 'cube' ? getTilesInCube(hoverTile, spell.areaSize / 5)
  : [] // single target
renderAoEPreview(gridContainer, tiles, tileSize)
```

**4c: Click to confirm — resolve saves and damage**
```js
// Find affected combatants
const affected = encounter.combatants.filter(c =>
  c.currentHp > 0 && c.position && affectedTiles.some(t => t.x === c.position.x && t.y === c.position.y)
)
// Compute spell save DC: 8 + proficiency + spellcasting modifier
const prof = Math.floor((caster.level - 1) / 4) + 2
const castMod = Math.floor(((caster.stats?.[spell.castingAbility] || 10) - 10) / 2)
const saveDC = 8 + prof + castMod

// Roll saves for each affected target
import { rollDamage } from '../lib/dice.js'
const baseDmg = rollDamage(spell.damage).total
for (const target of affected) {
  const saveMod = Math.floor(((target.stats?.[spell.saveAbility] || 10) - 10) / 2)
  const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod
  const saved = saveRoll >= saveDC
  const damage = saved && spell.halfOnSave ? Math.floor(baseDmg / 2) : saved ? 0 : baseDmg
  if (damage > 0) applyEncounterDamage(target.id, damage)
  if (!saved && spell.condition) addEncounterCondition(target.id, spell.condition)
  addNarratorMessage({ role: 'dm', speaker: 'Combat',
    text: `${target.name}: ${spell.saveAbility.toUpperCase()} save ${saveRoll} vs DC ${saveDC} — ${saved ? 'SAVE' : 'FAIL'} (${damage} damage)`
  })
}
broadcastEncounterAction({ type: 'aoe-resolve', spellName: spell.name, results: [...] })
useAction(caster.id)
setTargetingMode(null)
clearAoEPreview(gridContainer)
```

**4d: Broadcast all results**
All damage application and condition changes are broadcast via existing `broadcastEncounterAction` calls within `applyEncounterDamage` and `addEncounterCondition`.

- [ ] **Step 5: Verify build**

Run: `npx vite build`

- [ ] **Step 6: Commit**

```bash
git add src/engine/AoEOverlay.js src/engine/AoEOverlay.test.js src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: AoE spell targeting with visual preview overlays and save resolution"
```

---

### Task 8: Skill Check Panel

**Files:**
- Create: `src/components/SkillCheckPanel.jsx`
- Modify: `src/GameV2.jsx`
- Modify: `src/store/useStore.js`

Surface a HUD panel when the AI DM requests a skill check. Shows modifier, optional toggles (Guidance, Bardic Inspiration, Lucky, advantage), and roll button.

- [ ] **Step 1: Add skill check state to store**

In `src/store/useStore.js`, add:

```js
pendingSkillCheck: null, // { skill, dc, reason, targets, type }
setPendingSkillCheck: (check) => set({ pendingSkillCheck: check }),
clearPendingSkillCheck: () => set({ pendingSkillCheck: null }),
```

- [ ] **Step 2: Parse skill check from narrator response**

In `src/GameV2.jsx`, in the narrator response handler (where `result.startCombat` is already checked), add:

```js
if (result?.skillCheck) {
  const { setPendingSkillCheck } = useStore.getState()
  setPendingSkillCheck(result.skillCheck)
}
```

- [ ] **Step 3: Create SkillCheckPanel component**

```jsx
// src/components/SkillCheckPanel.jsx
import { useState } from 'react'
import useStore from '../store/useStore'

export default function SkillCheckPanel() {
  const check = useStore(s => s.pendingSkillCheck)
  const clearCheck = useStore(s => s.clearPendingSkillCheck)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const myCharacter = useStore(s => s.myCharacter)

  const [useGuidance, setUseGuidance] = useState(false)
  const [useBardic, setUseBardic] = useState(false)
  const [useLucky, setUseLucky] = useState(false)
  const [result, setResult] = useState(null)

  if (!check) return null

  const skill = check.skill
  const modifier = getSkillModifier(myCharacter, skill)

  function handleRoll() {
    let d20 = Math.floor(Math.random() * 20) + 1
    let total = d20 + modifier
    let extras = ''

    if (useGuidance) {
      const guidanceRoll = Math.floor(Math.random() * 4) + 1
      total += guidanceRoll
      extras += ` +${guidanceRoll} (Guidance)`
    }
    if (useBardic) {
      const bardicDie = Math.floor(Math.random() * 6) + 1 // Simplified — should use bard level die
      total += bardicDie
      extras += ` +${bardicDie} (Bardic Inspiration)`
    }

    const pass = total >= check.dc
    const entry = `${myCharacter?.name || 'You'} rolled ${skill}: ${total} (d20: ${d20} + ${modifier}${extras}) — ${pass ? 'Success' : 'Failure'}`
    addNarratorMessage({ role: 'user', speaker: myCharacter?.name || 'Player', text: entry })
    // Broadcast result to all players
    broadcastEncounterAction({ type: 'skill-check-result', characterName: myCharacter?.name, skill, total, pass })

    setResult({ d20, total, pass })
    setTimeout(() => { clearCheck(); setResult(null) }, 2000)
  }

  return (
    <div style={{
      position: 'absolute', bottom: '50%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
      borderRadius: 8, padding: 16, minWidth: 280, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8',
    }}>
      <div style={{ fontSize: 14, color: '#d4af37', marginBottom: 8 }}>{skill} Check</div>
      <div style={{ fontSize: 12, marginBottom: 12, opacity: 0.8 }}>{check.reason}</div>
      <div style={{ fontSize: 16, marginBottom: 12 }}>Modifier: {modifier >= 0 ? '+' : ''}{modifier}</div>

      {/* Optional modifier toggles */}
      <div style={{ marginBottom: 12, fontSize: 11 }}>
        <label><input type="checkbox" checked={useGuidance} onChange={e => setUseGuidance(e.target.checked)} /> Guidance (+1d4)</label><br/>
        <label><input type="checkbox" checked={useBardic} onChange={e => setUseBardic(e.target.checked)} /> Bardic Inspiration</label><br/>
        <label><input type="checkbox" checked={useLucky} onChange={e => setUseLucky(e.target.checked)} /> Lucky</label>
      </div>

      {result ? (
        <div style={{ fontSize: 20, textAlign: 'center', color: result.pass ? '#44aa44' : '#cc3333' }}>
          {result.total} — {result.pass ? 'SUCCESS' : 'FAILURE'}
        </div>
      ) : (
        <button onClick={handleRoll} style={{
          width: '100%', padding: 10, background: '#d4af37', color: '#1a1614',
          border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
          fontSize: 14, fontWeight: 'bold',
        }}>
          Roll
        </button>
      )}
    </div>
  )
}

function getSkillModifier(character, skill) {
  if (!character) return 0
  const stats = character.stats || character.abilityScores || {}
  const skillToAbility = {
    'Perception': 'wis', 'Stealth': 'dex', 'Athletics': 'str', 'Acrobatics': 'dex',
    'Investigation': 'int', 'Arcana': 'int', 'History': 'int', 'Nature': 'int',
    'Religion': 'int', 'Insight': 'wis', 'Medicine': 'wis', 'Survival': 'wis',
    'Animal Handling': 'wis', 'Deception': 'cha', 'Intimidation': 'cha',
    'Performance': 'cha', 'Persuasion': 'cha', 'Sleight of Hand': 'dex',
  }
  const ability = skillToAbility[skill] || 'str'
  const score = stats[ability] || 10
  return Math.floor((score - 10) / 2)
}
```

- [ ] **Step 4: Render SkillCheckPanel in GameV2**

Add `<SkillCheckPanel />` to the GameV2 JSX output, after the HUD.

- [ ] **Step 5: Verify build**

Run: `npx vite build`

- [ ] **Step 6: Commit**

```bash
git add src/components/SkillCheckPanel.jsx src/store/useStore.js src/GameV2.jsx
git commit -m "feat: skill check panel with modifier toggles and roll animation"
```

---

### Task 9: Condition Enforcement in Action Bar

**Files:**
- Modify: `src/hud/CombatActionBar.jsx`

Gate action bar buttons based on active conditions. Stunned/Paralyzed/Incapacitated/Unconscious disable all actions except End Turn.

- [ ] **Step 1: Add condition checks to CombatActionBar**

```js
// In CombatActionBar.jsx
const conditions = new Set(active?.conditions || [])
const canAct = !conditions.has('Stunned') && !conditions.has('Paralyzed')
  && !conditions.has('Incapacitated') && !conditions.has('Unconscious')
const canAttack = canAct && !conditions.has('Charmed') // Charmed can't attack charmer — simplified to can't attack
const canMove = !conditions.has('Stunned') && !conditions.has('Paralyzed')
  && !conditions.has('Grappled') && !conditions.has('Restrained')
  && !conditions.has('Unconscious')
const isProne = conditions.has('Prone')
```

Disable buttons:
```jsx
<button disabled={!canAttack} onClick={() => handleAction('attack')}>ATTACK</button>
<button disabled={!canAct} onClick={() => handleAction('cast')}>CAST</button>
<button disabled={!canMove} onClick={() => handleAction('move')}>MOVE</button>
<button disabled={!canAct} onClick={() => handleAction('dodge')}>DODGE</button>
<button disabled={!canMove} onClick={() => handleAction('dash')}>DASH</button>
{isProne && <button onClick={() => handleAction('standup')}>STAND UP</button>}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/hud/CombatActionBar.jsx
git commit -m "feat: condition-based action gating in combat action bar"
```

---

### Task 10: Enemy AI (Grunt + Boss)

**Files:**
- Modify: `src/lib/enemyAi.js` (or create if it doesn't exist)
- Modify: `src/store/useStore.js` (update runEnemyTurn)

Grunt enemies use pathfinding to approach and attack. Boss enemies (CR >= 5, flagged boss, or solo) get a Claude API call for tactical decisions.

- [ ] **Step 1: Check if enemyAi.js exists**

Search for `src/lib/enemyAi.js`. If it exists, read it and extend. If not, create it.

- [ ] **Step 2: Implement grunt AI**

```js
// src/lib/enemyAi.js
import { findPathEdge } from './pathfinding.js'

/**
 * Compute grunt enemy action — move toward nearest target, attack if adjacent.
 */
export function computeGruntAction(enemy, combatants, collisionData, width, height) {
  const targets = combatants.filter(c => !c.isEnemy && c.currentHp > 0 && c.position)
  if (!targets.length) return { action: 'wait' }

  // Find nearest target
  let nearest = null, minDist = Infinity
  for (const t of targets) {
    const dx = t.position.x - enemy.position.x
    const dy = t.position.y - enemy.position.y
    const dist = Math.max(Math.abs(dx), Math.abs(dy)) // Chebyshev for adjacency
    if (dist < minDist) { minDist = dist; nearest = t }
  }

  if (!nearest) return { action: 'wait' }

  // Adjacent? Attack.
  if (minDist <= 1) {
    const weapon = enemy.attacks?.[0] || { name: 'Attack', bonus: '+3', damage: '1d6+1' }
    const bonus = parseInt(weapon.bonus) || 0
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const hit = d20 === 20 || total >= (nearest.ac || 10)
    const damage = hit ? rollDamage(weapon.damage).total : 0
    return {
      action: 'attack',
      targetId: nearest.id,
      hit, damage, d20, bonus, total,
      weapon: weapon.name,
      narrative: hit
        ? `${enemy.name} strikes ${nearest.name} with ${weapon.name} for ${damage} damage!`
        : `${enemy.name} swings at ${nearest.name} with ${weapon.name} but misses!`,
    }
  }

  // Not adjacent — pathfind toward target, move within speed budget
  const maxTiles = Math.floor((enemy.speed || 30) / 5)
  const path = findPathEdge(collisionData, width, height, enemy.position, nearest.position)
  if (!path || path.length <= 1) return { action: 'wait' }

  // Move as far as speed allows
  const moveEnd = path[Math.min(maxTiles, path.length - 1)]
  const movePath = path.slice(0, Math.min(maxTiles + 1, path.length))

  // If we end up adjacent after moving, also attack
  const distAfterMove = Math.abs(moveEnd.x - nearest.position.x) + Math.abs(moveEnd.y - nearest.position.y)
  if (distAfterMove <= 1) {
    const weapon = enemy.attacks?.[0] || { name: 'Attack', bonus: '+3', damage: '1d6+1' }
    const bonus = parseInt(weapon.bonus) || 0
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const hit = d20 === 20 || total >= (nearest.ac || 10)
    const damage = hit ? rollDamage(weapon.damage).total : 0
    return {
      action: 'move-attack',
      moveTo: moveEnd, movePath,
      targetId: nearest.id,
      hit, damage, d20, bonus, total,
      weapon: weapon.name,
      narrative: `${enemy.name} charges toward ${nearest.name}! ${hit ? `${damage} damage!` : 'But misses!'}`,
    }
  }

  return {
    action: 'move',
    moveTo: moveEnd,
    movePath,
    narrative: `${enemy.name} advances toward the party.`,
  }
}

// Import rollDamage from existing dice.js — do NOT duplicate:
// import { rollDamage } from './dice.js'
// Usage: rollDamage(weapon.damage).total
```

- [ ] **Step 3: Wire into runEnemyTurn in useStore**

Update the existing `runEnemyTurn` in `src/store/useStore.js` to use `computeGruntAction` for grunt enemies and fall back to the existing AI call for bosses (CR >= 5 and flagged/solo).

- [ ] **Step 4: Verify build and existing tests**

Run: `npx vite build && npx vitest run src/lib/pathfinding.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/lib/enemyAi.js src/store/useStore.js
git commit -m "feat: grunt enemy AI with pathfinding movement and melee attacks"
```
