# Roof-Lift Buildings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buildings display tiled roof textures that fade out when a player enters, revealing the interior — Baldur's Gate style.

**Architecture:** Roofs are rendered as a PixiJS container above props but below grid/tokens (so players are always visible). Each building gets roof tiles stamped during area generation based on chunk tags. RoofManager (already exists) tracks reveal state. The PixiApp ticker reads reveal state and animates roof sprite alpha per building using a pre-built spatial lookup grid. GameV2 registers buildings into RoofManager and triggers reveal checks on player movement.

**Known gap:** Roof reveal state does not persist across sessions (spec §4.2 calls for this). Will be addressed as a follow-up.

**Tech Stack:** PixiJS v8 (Sprite, Container, alpha), existing RoofManager, existing TileAtlasV2, existing areaBuilder pipeline.

---

### Task 1: Roof Style Mapping

**Files:**
- Create: `src/lib/roofStyles.js`
- Test: `src/lib/roofStyles.test.js`

Define which roof tile IDs map to which building types, with deterministic per-building variant selection.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/roofStyles.test.js
import { describe, it, expect } from 'vitest'
import { resolveRoofTile } from './roofStyles.js'

describe('resolveRoofTile', () => {
  it('returns a hay roof tile for tavern tags', () => {
    const tile = resolveRoofTile(['tavern', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_hay_/)
  })

  it('returns a slate roof tile for temple tags', () => {
    const tile = resolveRoofTile(['temple', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_slate_/)
  })

  it('returns a tile roof for shop tags', () => {
    const tile = resolveRoofTile(['shop', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_tile_/)
  })

  it('returns null for dungeon/underground tags', () => {
    const tile = resolveRoofTile(['dungeon', 'underground'], 0)
    expect(tile).toBeNull()
  })

  it('different buildingIndex gives different variants', () => {
    const results = new Set()
    for (let i = 0; i < 20; i++) {
      results.add(resolveRoofTile(['tavern', 'settlement'], i))
    }
    expect(results.size).toBeGreaterThan(1)
  })

  it('defaults to hay for unrecognized tags', () => {
    const tile = resolveRoofTile(['unknown'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_hay_/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/roofStyles.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```js
// src/lib/roofStyles.js

const HAY_TILES = [
  'atlas-floors:roof_texture_hay_01_a1',
  'atlas-floors:roof_texture_hay_02_a1',
  'atlas-floors:roof_texture_hay_03_a1',
  'atlas-floors:roof_texture_hay_04_a1',
  'atlas-floors:roof_texture_hay_05_a1',
]

const SLATE_TILES = [
  'atlas-floors:roof_texture_slate_black_a1',
  'atlas-floors:roof_texture_slate_blue_a1',
  'atlas-floors:roof_texture_slate_mossy_a1',
  'atlas-floors:roof_texture_slate_purple_a1',
]

const TILE_TILES = [
  'atlas-floors:roof_texture_tile_black_a1',
  'atlas-floors:roof_texture_tile_blue_a1',
]

// Tags that map to slate (important/wealthy buildings)
const SLATE_TAGS = new Set(['temple', 'guild', 'castle', 'noble', 'library', 'palace'])
// Tags that map to tile (commercial/sturdy buildings)
const TILE_TAGS = new Set(['shop', 'blacksmith', 'forge', 'warehouse', 'armory', 'market'])
// Tags that suppress roofs entirely
const NO_ROOF_TAGS = new Set(['dungeon', 'underground', 'cave', 'outdoor', 'terrain', 'clearing'])

/**
 * Resolve a roof tile ID based on chunk tags and building index.
 * @param {string[]} tags — chunk tags (e.g., ['tavern', 'settlement'])
 * @param {number} buildingIndex — index for deterministic variant selection
 * @returns {string|null} tile ID or null if no roof
 */
export function resolveRoofTile(tags, buildingIndex) {
  const tagSet = new Set(tags)

  // No roof for underground/outdoor
  for (const t of NO_ROOF_TAGS) {
    if (tagSet.has(t)) return null
  }

  // Pick material based on tags
  let pool = HAY_TILES
  for (const t of SLATE_TAGS) {
    if (tagSet.has(t)) { pool = SLATE_TILES; break }
  }
  if (pool === HAY_TILES) {
    for (const t of TILE_TAGS) {
      if (tagSet.has(t)) { pool = TILE_TILES; break }
    }
  }

  return pool[buildingIndex % pool.length]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/roofStyles.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/roofStyles.js src/lib/roofStyles.test.js
git commit -m "feat: add roof style resolver mapping chunk tags to FA roof tiles"
```

---

### Task 2: Generate Roof Tiles in areaBuilder

**Files:**
- Modify: `src/lib/areaBuilder.js` (building loop ~line 89-98, palette building ~line 66-70)
- Modify: `src/lib/areaStorage.js` (loadArea — no changes needed, roof layer already handled by stampChunk)

Wire `resolveRoofTile` into the building loop so each building's roof layer gets filled with the appropriate roof tile. Currently chunks have empty roof layers (all zeros) — we fill them programmatically during area assembly.

- [ ] **Step 1: Write a test for roof layer generation**

```js
// Add to an existing areaBuilder test file, or create src/lib/roofStyles.test.js (append)
import { resolveRoofTile } from './roofStyles.js'

it('resolveRoofTile returns non-null for building tags', () => {
  // Tavern chunk tags should produce a hay roof
  const tile = resolveRoofTile(['tavern', 'settlement', 'indoor'], 0)
  expect(tile).toBeTruthy()
  expect(tile).toMatch(/^atlas-floors:roof_texture_/)
})
```

- [ ] **Step 2: REPLACE the existing building block in areaBuilder**

In `src/lib/areaBuilder.js`, add import at the top:
```js
import { resolveRoofTile } from './roofStyles.js'
```

Then **REPLACE** the existing `if (poi.chunk.type === 'building')` block (lines 89-98) — do NOT add alongside it:

```js
if (poi.chunk.type === 'building') {
  const roofTileId = resolveRoofTile(poi.chunk.tags || [], buildings.length)
  if (roofTileId) {
    if (!tileToIndex.has(roofTileId)) {
      tileToIndex.set(roofTileId, palette.length)
      palette.push(roofTileId)
    }
    const roofTileIdx = tileToIndex.get(roofTileId)
    // Fill roof layer over building bounds
    for (let ry = pos.y; ry < pos.y + poi.chunk.height; ry++) {
      for (let rx = pos.x; rx < pos.x + poi.chunk.width; rx++) {
        if (rx >= 0 && ry >= 0 && rx < width && ry < height) {
          layers.roof[ry * width + rx] = roofTileIdx
        }
      }
    }
  }

  buildings.push({
    id: poi.label || poi.id,
    x: pos.x,
    y: pos.y,
    width: poi.chunk.width,
    height: poi.chunk.height,
    roofTile: roofTileId,
  })
}
```

- [ ] **Step 3: Verify build and tests pass**

Run: `npx vite build && npx vitest run src/lib/roofStyles.test.js`
Expected: Build succeeds, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/areaBuilder.js src/lib/roofStyles.test.js
git commit -m "feat: fill roof layer with tag-based roof tiles during area generation"
```

---

### Task 3: Add Roof Container to PixiApp

**Files:**
- Modify: `src/engine/PixiApp.jsx` (layer setup ~line 72-81, ticker ~line 195-223, new roof render effect)

Add a `roof` container between `props` and `grid` in the layer stack (above props but BELOW tokens so players are always visible), and render roof tiles from `zone.layers.roof` using the existing `renderV2Layer` function. Initially render at full opacity (no reveal logic yet).

- [ ] **Step 1: Add roof to layer stack**

In `PixiApp.jsx`, update the layers object. Roof goes between props and grid:

```js
const layers = {
  floor: new PIXI.Container(),
  walls: new PIXI.Container(),
  props: new PIXI.Container(),
  roof: new PIXI.Container(),    // ← above props, below grid/tokens
  grid: new PIXI.Container(),
  tokens: new PIXI.Container(),
  fog: new PIXI.Container(),
  exits: new PIXI.Container(),
}
```

- [ ] **Step 2: Render roof tiles in the ticker**

In the ticker function, after `renderV2Layer(props, ...)`, add:

```js
if (zone.layers?.roof) {
  renderV2Layer(roof, zone.layers.roof, zone.width, zone.height, tileSize, tileAtlas, bounds)
}
```

Destructure `roof` from `stageLayersRef.current` alongside the other layers.

Update the cleanup return to explicitly clear roof:

```js
return () => {
  app.ticker.remove(tickerFn)
  clearV2Layer(floor)
  clearV2Layer(walls)
  clearV2Layer(props)
  clearV2Layer(roof)  // ← add this
}
```

- [ ] **Step 3: Verify build passes and roof tiles appear**

Run: `npx vite build`
Expected: Build succeeds. On refresh, buildings should be covered by roof tiles.

- [ ] **Step 4: Commit**

```bash
git add src/engine/PixiApp.jsx
git commit -m "feat: add roof container to PixiApp layer stack and render roof tiles"
```

---

### Task 4: Wire RoofManager Registration

**Files:**
- Modify: `src/GameV2.jsx` (~line 149-161, roof manager setup)
- Modify: `src/engine/RoofLayer.js` (update `registerBuilding` to accept areaBuilder format)

Currently RoofManager exists but no buildings are registered. Wire it so buildings from the zone data get registered, and door cells get detected from the walls layer palette.

- [ ] **Step 1: Update RoofManager.registerBuilding to accept areaBuilder format**

The existing `registerBuilding` expects `{ id, position: {x,y}, width, height, doors: [{x,y}] }` but areaBuilder outputs `{ id, x, y, width, height }`. Update to accept both:

```js
registerBuilding(building) {
  const posX = building.x ?? building.position?.x ?? 0
  const posY = building.y ?? building.position?.y ?? 0
  const b = {
    ...building,
    minX: posX,
    minY: posY,
    maxX: posX + building.width,
    maxY: posY + building.height,
  }
  this.buildings.set(building.id, b)
  this.revealed.set(building.id, false)

  for (const door of building.doors || []) {
    this._doorSet.add(`${door.x},${door.y}`)
  }
}
```

- [ ] **Step 2: Register buildings and detect doors in GameV2**

In the existing roof manager useEffect in GameV2, add building registration when zone data is available. Detect door cells by scanning `zone.layers.walls` + `zone.palette` for 'door' tiles, and associate them with their building by position:

```js
// In the roof manager setup useEffect, before updateRevealStates:
useEffect(() => {
  if (!zone?.useCamera || !zone?.buildings) return
  const rm = roofManagerRef.current
  // Clear and re-register
  rm.buildings.clear()
  rm.revealed.clear()
  rm._doorSet.clear()

  // Detect door cells from walls layer
  const doors = []
  if (zone.layers?.walls && zone.palette) {
    const w = zone.width
    for (let i = 0; i < zone.layers.walls.length; i++) {
      const pIdx = zone.layers.walls[i]
      if (pIdx === 0) continue
      const tileId = zone.palette[pIdx] || ''
      if (tileId.includes('door')) {
        doors.push({ x: i % w, y: Math.floor(i / w) })
      }
    }
  }

  for (const b of zone.buildings) {
    // Find doors within this building's bounds
    const buildingDoors = doors.filter(d =>
      d.x >= b.x && d.x < b.x + b.width && d.y >= b.y && d.y < b.y + b.height
    )
    rm.registerBuilding({ ...b, doors: buildingDoors })
  }
}, [zone?.buildings, currentAreaId])
```

- [ ] **Step 3: Add test for flat {x, y} format and run all RoofLayer tests**

Add to `src/engine/RoofLayer.test.js`:

```js
it('accepts flat x/y format from areaBuilder', () => {
  const mgr = new RoofManager()
  mgr.registerBuilding({ id: 'shop', x: 5, y: 10, width: 8, height: 6, doors: [] })
  expect(mgr.getBuildingAt(8, 13)).toBe('shop')
  expect(mgr.getBuildingAt(0, 0)).toBeNull()
})
```

Run: `npx vitest run src/engine/RoofLayer.test.js`
Expected: PASS (6 tests — 5 existing + 1 new)

- [ ] **Step 4: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/engine/RoofLayer.js src/GameV2.jsx
git commit -m "feat: wire RoofManager building registration with door detection"
```

---

### Task 5: Roof Alpha Animation in PixiApp

**Files:**
- Modify: `src/engine/PixiApp.jsx` (add roofManager prop, animate roof alpha per building)
- Modify: `src/GameV2.jsx` (pass roofManager to PixiApp)

The key visual feature: smoothly fade roof alpha between 0 and 1 based on RoofManager reveal state. Use a pre-built spatial lookup grid (tile → buildingId) for O(1) per-sprite alpha assignment in the ticker.

- [ ] **Step 1: Pass roofManager and build spatial lookup**

In `GameV2.jsx`, add `roofManager={roofManagerRef.current}` to the PixiApp component props.

In `PixiApp.jsx`, accept `roofManager` in the destructured props. Add refs:

```js
const roofAlphaRef = useRef({})       // { buildingId: currentAlpha }
const roofBuildingGridRef = useRef(null) // Uint8Array: tileIndex → buildingIndex+1 (0=none)
```

- [ ] **Step 2: Build the spatial lookup grid when zone loads**

In the effect that runs when zone/buildings change, pre-compute a grid mapping each tile to its building:

```js
// Inside the atlasReady / zone effect, after WallRenderer setup or as a separate effect:
useEffect(() => {
  if (!zone?.buildings || !zone?.width) {
    roofBuildingGridRef.current = null
    roofAlphaRef.current = {}
    return
  }
  const grid = new Uint8Array(zone.width * zone.height)
  for (let bi = 0; bi < zone.buildings.length; bi++) {
    const b = zone.buildings[bi]
    for (let y = b.y; y < b.y + b.height && y < zone.height; y++) {
      for (let x = b.x; x < b.x + b.width && x < zone.width; x++) {
        if (x >= 0 && y >= 0) grid[y * zone.width + x] = bi + 1
      }
    }
  }
  roofBuildingGridRef.current = grid
  roofAlphaRef.current = {}
}, [zone?.buildings, zone?.width])
```

- [ ] **Step 3: Animate roof alpha per-sprite in the ticker**

In the ticker, after rendering roof tiles:

```js
// Animate roof alpha per building
if (roofManager && zone?.buildings) {
  const FADE_SPEED = 1 / 400 // full fade in 400ms
  for (const b of zone.buildings) {
    const target = roofManager.isRevealed(b.id) ? 0 : 1
    const current = roofAlphaRef.current[b.id] ?? 1
    if (current !== target) {
      const delta = FADE_SPEED * ticker.deltaMS
      roofAlphaRef.current[b.id] = target < current
        ? Math.max(target, current - delta)
        : Math.min(target, current + delta)
    }
  }

  // Apply alpha using pre-built spatial grid — O(1) per sprite
  const roofContainer = stageLayersRef.current.roof
  const grid = roofBuildingGridRef.current
  if (grid) {
    for (const child of roofContainer.children) {
      const tx = Math.floor(child.x / tileSize)
      const ty = Math.floor(child.y / tileSize)
      const bi = grid[ty * zone.width + tx]
      if (bi > 0) {
        child.alpha = roofAlphaRef.current[zone.buildings[bi - 1].id] ?? 1
      }
    }
  }
}
```

- [ ] **Step 4: Update roof reveal in GameV2**

The existing useEffect at line 153 already calls `rm.updateRevealStates(positions)` on playerPos changes. Ensure it runs — no changes needed if it already fires on `playerPos`.

- [ ] **Step 5: Clean up roofAlphaRef in ticker effect teardown**

Add to the ticker effect cleanup:

```js
return () => {
  app.ticker.remove(tickerFn)
  clearV2Layer(floor)
  clearV2Layer(walls)
  clearV2Layer(props)
  clearV2Layer(roof)
  roofAlphaRef.current = {}  // ← clear animation state
}
```

- [ ] **Step 6: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: animate roof fade with 400ms ease on building enter/exit"
```

---

### Task 6: Reset Roof Alpha on Area Transition

**Files:**
- Modify: `src/GameV2.jsx` (area transition handler)

When the player transitions to a new area, reset all roof alpha states so buildings start with roofs visible.

- [ ] **Step 1: Clear roofAlpha on area change**

In GameV2, in the area transition handler or the effect that fires on `currentAreaId` change, reset the roof manager:

```js
// In the currentAreaId change effect (or area activation):
roofManagerRef.current = new RoofManager()
```

This is already partially happening since the registration useEffect re-runs on `currentAreaId` change.

- [ ] **Step 2: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: reset roof state on area transition"
```

---

### Task 7: Multiplayer Roof Broadcast

**Files:**
- Modify: `src/lib/liveChannel.js` (add `broadcastRoofReveal`)
- Modify: `src/GameV2.jsx` (broadcast on reveal change, listen for roof broadcasts)

Host broadcasts roof state changes. Non-host clients apply them.

- [ ] **Step 1: Add broadcast helper**

In `src/lib/liveChannel.js`, add:

```js
export function broadcastRoofReveal(buildingId, revealed) {
  broadcast({ type: 'roof-reveal', buildingId, revealed })
}
```

- [ ] **Step 2: Broadcast in GameV2 when reveal state changes**

In the roof reveal useEffect, after `rm.updateRevealStates(positions)`, broadcast changes if this client is the host:

```js
const changes = rm.updateRevealStates(positions)
if (changes.length > 0 && dmMode) {
  for (const { buildingId, revealed } of changes) {
    broadcastRoofReveal(buildingId, revealed)
  }
}
```

- [ ] **Step 3: Listen for roof broadcasts**

In the existing broadcast listener in GameV2, add a case for `roof-reveal`:

```js
case 'roof-reveal':
  roofManagerRef.current.setRevealed(msg.buildingId, msg.revealed)
  break
```

- [ ] **Step 4: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/lib/liveChannel.js src/GameV2.jsx
git commit -m "feat: broadcast roof reveal state for multiplayer sync"
```
