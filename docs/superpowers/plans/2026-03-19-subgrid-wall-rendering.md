# Sub-Grid Wall Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace solid-fill wall cells with thin, architecturally detailed walls on cell edges using Fantasy Assets connector tiles and autotile pattern matching.

**Architecture:** A build-time step extracts edge data from the existing walls layer into a Uint8Array bitfield. A new WallRenderer places FA connector sprites at sub-grid positions on cell edges. Pathfinding switches from cell-blocked to edge-blocked collision.

**Tech Stack:** PixiJS v8, Vitest, Zustand

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/wallEdgeExtractor.js` | NEW: Extract wall edge bitfield from walls layer + floor backfill |
| `src/lib/wallEdgeExtractor.test.js` | NEW: Tests for edge extraction |
| `src/lib/wallAutotile.js` | NEW: WALL_STYLES config, resolveWallTile(), resolveCornerTile() |
| `src/lib/wallAutotile.test.js` | NEW: Tests for tile resolution |
| `src/engine/WallRenderer.js` | NEW: PixiJS wall edge sprite renderer |
| `src/lib/pathfinding.js` | MODIFY: Add edge-based findPathEdge(), keep old findPath() |
| `src/lib/pathfinding.test.js` | MODIFY: Add edge-based pathfinding tests |
| `src/lib/areaBuilder.js` | MODIFY: Add wall edge extraction + new collision build |
| `src/engine/PixiApp.jsx` | MODIFY: Replace walls renderV2Layer with WallRenderer |
| `src/GameV2.jsx` | MODIFY: Switch walkData to edge-based collision |

---

### Task 1: Wall Edge Extractor

**Files:**
- Create: `src/lib/wallEdgeExtractor.js`
- Create: `src/lib/wallEdgeExtractor.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/lib/wallEdgeExtractor.test.js
import { describe, it, expect } from 'vitest'
import { extractWallEdges, NORTH, EAST, SOUTH, WEST, DOOR_N, DOOR_E, DOOR_S, DOOR_W } from './wallEdgeExtractor.js'

describe('extractWallEdges', () => {
  // Helper: create a grid from a visual map
  // W = wall, D = door, F = floor, . = empty
  function makeGrid(rows, palette, doorSet) {
    const height = rows.length
    const width = rows[0].length
    const walls = new Uint16Array(width * height)
    const floor = new Uint16Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = rows[y][x]
        if (ch === 'W') walls[y * width + x] = 1       // wall tile
        else if (ch === 'D') walls[y * width + x] = 2   // door tile
        else if (ch === 'F') floor[y * width + x] = 3   // floor tile
      }
    }
    return extractWallEdges(walls, floor, palette, doorSet, width, height)
  }

  const palette = ['', 'stone_wall', 'door_metal', 'brick_floor']
  const doorSet = new Set(['door_metal'])

  it('single wall cell surrounded by empty — edges on all 4 sides', () => {
    const { wallEdges } = makeGrid([
      '...',
      '.W.',
      '...',
    ], palette, doorSet)
    const center = 1 * 3 + 1
    expect(wallEdges[center] & NORTH).toBeTruthy()
    expect(wallEdges[center] & EAST).toBeTruthy()
    expect(wallEdges[center] & SOUTH).toBeTruthy()
    expect(wallEdges[center] & WEST).toBeTruthy()
  })

  it('wall cell adjacent to wall cell — no edge between them', () => {
    const { wallEdges } = makeGrid([
      '...',
      'WW.',
      '...',
    ], palette, doorSet)
    const left = 1 * 3 + 0
    const right = 1 * 3 + 1
    // Left cell has no east edge, right cell has no west edge
    expect(wallEdges[left] & EAST).toBeFalsy()
    expect(wallEdges[right] & WEST).toBeFalsy()
  })

  it('door cell gets door bits not wall bits', () => {
    const { wallEdges } = makeGrid([
      '.D.',
      '...',
    ], palette, doorSet)
    const door = 0 * 3 + 1
    expect(wallEdges[door] & DOOR_S).toBeTruthy()
    expect(wallEdges[door] & SOUTH).toBeFalsy() // wall bit NOT set
  })

  it('map boundary creates edges', () => {
    const { wallEdges } = makeGrid([
      'W',
    ], palette, doorSet)
    expect(wallEdges[0] & NORTH).toBeTruthy()
    expect(wallEdges[0] & EAST).toBeTruthy()
    expect(wallEdges[0] & SOUTH).toBeTruthy()
    expect(wallEdges[0] & WEST).toBeTruthy()
  })

  it('backfills floor under wall cells from neighbors', () => {
    // Wall row with floor below — floor should be backfilled under walls
    const { floor } = makeGrid([
      'WWW',
      'FFF',
    ], palette, doorSet)
    // Top row wall cells should now have floor backfilled
    expect(floor[0]).toBe(3)
    expect(floor[1]).toBe(3)
    expect(floor[2]).toBe(3)
  })

  it('no backfill when wall cell already has floor', () => {
    const width = 3, height = 1
    const walls = new Uint16Array([1, 0, 0])
    const floor = new Uint16Array([3, 3, 0])  // wall cell at 0 already has floor
    const { floor: outFloor } = extractWallEdges(walls, floor, palette, doorSet, width, height)
    expect(outFloor[0]).toBe(3) // unchanged
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/wallEdgeExtractor.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement wallEdgeExtractor.js**

```javascript
// src/lib/wallEdgeExtractor.js

// Edge bit constants
export const NORTH  = 0x1
export const EAST   = 0x2
export const SOUTH  = 0x4
export const WEST   = 0x8
export const DOOR_N = 0x10
export const DOOR_E = 0x20
export const DOOR_S = 0x40
export const DOOR_W = 0x80

const DIR_BITS = [
  { dx: 0, dy: -1, wall: NORTH, door: DOOR_N },
  { dx: 1, dy: 0,  wall: EAST,  door: DOOR_E },
  { dx: 0, dy: 1,  wall: SOUTH, door: DOOR_S },
  { dx: -1, dy: 0, wall: WEST,  door: DOOR_W },
]

/**
 * Extract wall edge bitfield from walls layer.
 * Also backfills floor under wall cells that have empty floor.
 *
 * @param {Uint16Array} walls — palette-indexed wall layer
 * @param {Uint16Array} floor — palette-indexed floor layer (mutated: backfilled)
 * @param {string[]} palette — index → tile ID
 * @param {Set<string>} doorSet — tile IDs that are doors
 * @param {number} width
 * @param {number} height
 * @returns {{ wallEdges: Uint8Array, floor: Uint16Array }}
 */
export function extractWallEdges(walls, floor, palette, doorSet, width, height) {
  const size = width * height
  const wallEdges = new Uint8Array(size)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const tileIdx = walls[idx]
      if (tileIdx === 0) continue

      const tileId = palette[tileIdx] || ''
      const isDoor = doorSet.has(tileId)

      for (const { dx, dy, wall, door } of DIR_BITS) {
        const nx = x + dx
        const ny = y + dy
        // Out of bounds or neighbor has no wall → this edge is a boundary
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          wallEdges[idx] |= isDoor ? door : wall
        } else {
          const neighborIdx = ny * width + nx
          if (walls[neighborIdx] === 0) {
            wallEdges[idx] |= isDoor ? door : wall
          }
        }
      }
    }
  }

  // Backfill floor under wall cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (walls[idx] === 0) continue
      if (floor[idx] !== 0) continue // already has floor

      // Find nearest neighbor with a floor tile
      for (const { dx, dy } of DIR_BITS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const nFloor = floor[ny * width + nx]
        if (nFloor !== 0) {
          floor[idx] = nFloor
          break
        }
      }
    }
  }

  return { wallEdges, floor }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/wallEdgeExtractor.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/wallEdgeExtractor.js src/lib/wallEdgeExtractor.test.js
git commit -m "feat: add wall edge extractor with floor backfill"
```

---

### Task 2: Wall Autotile Resolver

**Files:**
- Create: `src/lib/wallAutotile.js`
- Create: `src/lib/wallAutotile.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/lib/wallAutotile.test.js
import { describe, it, expect } from 'vitest'
import { resolveWallTile, resolveCornerTiles, WALL_STYLES } from './wallAutotile.js'

describe('resolveWallTile', () => {
  it('resolves village horizontal segment tile ID', () => {
    const tileId = resolveWallTile('village', 'horizontal', 5, 3)
    expect(tileId).toMatch(/^atlas-structures:wall_stone_earthy_\w+_connector_a_1x1$/)
  })

  it('resolves village vertical — same tile ID with rotation flag', () => {
    const result = resolveWallTile('village', 'vertical', 5, 3)
    // Village has rotateForVertical — returns { tileId, rotate: true }
    expect(result).toHaveProperty('tileId')
    expect(result).toHaveProperty('rotate', true)
    expect(result.tileId).toMatch(/^atlas-structures:wall_stone_earthy_\w+_connector_a_1x1$/)
  })

  it('resolves cave horizontal with flesh tiles', () => {
    const tileId = resolveWallTile('cave', 'horizontal', 2, 7)
    expect(tileId).toMatch(/^atlas-walls:flesh_black_wall_connector_\w+1_1x1$/)
  })

  it('resolves cave vertical with native _X2 suffix', () => {
    const result = resolveWallTile('cave', 'vertical', 2, 7)
    // Cave has native vertical tiles — no rotation needed
    expect(typeof result === 'string' || (result.rotate === false)).toBeTruthy()
  })

  it('resolves town with native a/b connectors', () => {
    const h = resolveWallTile('town', 'horizontal', 0, 0)
    expect(h).toMatch(/_connector_a_1x1$/)
    const v = resolveWallTile('town', 'vertical', 0, 0)
    expect(typeof v === 'string').toBe(true) // no rotation needed
    expect(v).toMatch(/_connector_b_1x1$/)
  })

  it('deterministic — same inputs produce same output', () => {
    const a = resolveWallTile('village', 'horizontal', 10, 20)
    const b = resolveWallTile('village', 'horizontal', 10, 20)
    expect(a).toEqual(b)
  })

  it('different positions produce different variants', () => {
    // With 11 village variants, nearby positions should sometimes differ
    const results = new Set()
    for (let x = 0; x < 20; x++) {
      const r = resolveWallTile('village', 'horizontal', x, 5)
      const id = typeof r === 'string' ? r : r.tileId
      results.add(id)
    }
    expect(results.size).toBeGreaterThan(1) // at least 2 different variants
  })
})

describe('resolveCornerTiles', () => {
  it('resolves village NE corner', () => {
    const tileId = resolveCornerTiles('village', 'NE')
    expect(tileId).toBe('atlas-structures:wall_corner_stone_earthy_l1_1x1')
  })

  it('resolves cave corners', () => {
    const tileId = resolveCornerTiles('cave', 'SW')
    expect(tileId).toBe('atlas-walls:flesh_black_wall_corner_d1_1x1')
  })

  it('returns null for forest (no dedicated corners)', () => {
    const tileId = resolveCornerTiles('forest', 'NE')
    expect(tileId).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/wallAutotile.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement wallAutotile.js**

```javascript
// src/lib/wallAutotile.js

/**
 * Wall style configurations per theme.
 * segmentPrefix + variant + suffix = full tile ID.
 */
export const WALL_STYLES = {
  village: {
    segmentPrefix: 'atlas-structures:wall_stone_earthy_',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'b1', 'c', 'd', 'e', 'f', 'g', 'h', 'i1', 'j1', 'k1'],
    rotateForVertical: true,
    cornerTiles: {
      NE: 'atlas-structures:wall_corner_stone_earthy_l1_1x1',
      NW: 'atlas-structures:wall_corner_stone_earthy_m1_1x1',
      SE: 'atlas-structures:wall_corner_stone_earthy_metal_gray_n1_1x1',
      SW: 'atlas-structures:wall_corner_stone_earthy_o1_1x1',
    },
  },
  forest: {
    segmentPrefix: 'atlas-structures:wall_wood_ashen_',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    rotateForVertical: true,
    cornerTiles: null,
  },
  dungeon: {
    segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
    segmentSuffix: '_1x1',
    variants: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1'],
    rotateForVertical: true,
    cornerTiles: {
      NE: 'atlas-structures:dwarven_wall_stone_earthy_corner_a1_1x1',
      NW: 'atlas-structures:dwarven_wall_stone_earthy_corner_c1_1x1',
      SE: 'atlas-structures:dwarven_wall_stone_earthy_corner_d2_1x1',
      SW: 'atlas-structures:dwarven_wall_stone_earthy_corner_e1_1x1',
    },
  },
  cave: {
    segmentPrefix: 'atlas-walls:flesh_black_wall_connector_',
    horizontalSuffix: '1_1x1',
    verticalSuffix: '2_1x1',
    variants: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
    missingVertical: new Set(['f', 'k']),
    rotateForVertical: false,
    cornerTiles: {
      NE: 'atlas-walls:flesh_black_wall_corner_a1_1x1',
      NW: 'atlas-walls:flesh_black_wall_corner_b1_1x1',
      SE: 'atlas-walls:flesh_black_wall_corner_c1_1x1',
      SW: 'atlas-walls:flesh_black_wall_corner_d1_1x1',
    },
  },
  town: {
    segmentPrefix: 'atlas-structures:wall_brick_earthy_',
    horizontalSuffix: '_connector_a_1x1',
    verticalSuffix: '_connector_b_1x1',
    variants: ['a', 'b', 'c'],
    rotateForVertical: false,
    cornerTiles: null,
  },
}

/** Deterministic hash for variant selection */
function tileHash(x, y, dirIndex) {
  return ((x * 73856093) ^ (y * 19349663) ^ (dirIndex * 83492791)) >>> 0
}

/**
 * Resolve the FA tile ID for a wall edge segment.
 * @param {string} theme — 'village' | 'forest' | 'dungeon' | 'cave' | 'town'
 * @param {'horizontal'|'vertical'} direction
 * @param {number} x — tile x
 * @param {number} y — tile y
 * @returns {string | { tileId: string, rotate: boolean }}
 */
export function resolveWallTile(theme, direction, x, y) {
  const style = WALL_STYLES[theme] || WALL_STYLES.village
  const isVertical = direction === 'vertical'
  const dirIdx = isVertical ? 1 : 0

  let variants = style.variants
  // Filter out missing vertical variants for cave-style themes
  if (isVertical && style.missingVertical) {
    variants = variants.filter(v => !style.missingVertical.has(v))
  }

  const hash = tileHash(x, y, dirIdx)
  const variant = variants[hash % variants.length]

  if (style.rotateForVertical) {
    // Only has horizontal tiles — rotate for vertical
    const tileId = style.segmentPrefix + variant + style.segmentSuffix
    if (isVertical) {
      return { tileId, rotate: true }
    }
    return tileId
  }

  // Has native horizontal and vertical suffixes
  const suffix = isVertical ? style.verticalSuffix : (style.horizontalSuffix || style.segmentSuffix)
  return style.segmentPrefix + variant + suffix
}

/**
 * Resolve corner tile ID for a given theme and corner direction.
 * @returns {string|null} tile ID or null if theme composes corners from segments
 */
export function resolveCornerTiles(theme, corner) {
  const style = WALL_STYLES[theme] || WALL_STYLES.village
  if (!style.cornerTiles) return null
  return style.cornerTiles[corner] || null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/wallAutotile.test.js`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/wallAutotile.js src/lib/wallAutotile.test.js
git commit -m "feat: add wall autotile resolver with theme-based FA tile mapping"
```

---

### Task 3: Edge-Based Pathfinding

**Files:**
- Modify: `src/lib/pathfinding.js:51-113`
- Modify: `src/lib/pathfinding.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/lib/pathfinding.test.js`:

```javascript
import { findPathEdge } from './pathfinding.js'
// Import edge constants
const NORTH = 0x1, EAST = 0x2, SOUTH = 0x4, WEST = 0x8

describe('findPathEdge (edge-based collision)', () => {
  it('finds path when no wall edges', () => {
    const wallEdges = new Uint8Array(5 * 5) // no edges
    const cellBlocked = new Uint8Array(5 * 5) // nothing blocked
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).not.toBeNull()
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 })
    expect(path.length).toBe(9)
  })

  it('blocks movement across a wall edge', () => {
    // 3x1 grid: cell 1 has east wall edge — can't move from cell 1 to cell 2
    const wallEdges = new Uint8Array(3)
    wallEdges[1] = EAST  // cell (1,0) has east wall
    const cellBlocked = new Uint8Array(3)
    const path = findPathEdge({ wallEdges, cellBlocked }, 3, 1, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toBeNull() // can't cross the east edge of cell 1
  })

  it('wall edge blocks in both directions', () => {
    // Cell (1,0) has east wall = cell (2,0) has west wall (derived symmetry)
    // So from cell 2 going west is also blocked
    const wallEdges = new Uint8Array(3)
    wallEdges[1] = EAST
    wallEdges[2] = WEST // symmetric — must be set by extractWallEdges
    const cellBlocked = new Uint8Array(3)
    const path = findPathEdge({ wallEdges, cellBlocked }, 3, 1, { x: 2, y: 0 }, { x: 0, y: 0 })
    expect(path).toBeNull()
  })

  it('respects cellBlocked for props', () => {
    const wallEdges = new Uint8Array(5 * 5)
    const cellBlocked = new Uint8Array(5 * 5)
    cellBlocked[2 * 5 + 2] = 1 // block center cell
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).not.toBeNull()
    // Path should avoid (2,2)
    expect(path.some(p => p.x === 2 && p.y === 2)).toBe(false)
  })

  it('finds path around wall edges', () => {
    // 5x5 grid, vertical wall on east edge of column 2 (rows 0-3)
    const wallEdges = new Uint8Array(5 * 5)
    const cellBlocked = new Uint8Array(5 * 5)
    for (let y = 0; y < 4; y++) {
      wallEdges[y * 5 + 2] |= EAST
      wallEdges[y * 5 + 3] |= WEST
    }
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(path).not.toBeNull()
    // Must go around — through row 4 where there's no wall
    expect(path.some(p => p.y === 4)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/pathfinding.test.js`
Expected: FAIL on new tests (findPathEdge not found)

- [ ] **Step 3: Implement findPathEdge**

Add to `src/lib/pathfinding.js` after the existing `findPath` function (around line 113):

```javascript
// Edge bit constants (must match wallEdgeExtractor.js)
const EDGE_N = 0x1, EDGE_E = 0x2, EDGE_S = 0x4, EDGE_W = 0x8

/**
 * Check if movement from (fromX,fromY) to (toX,toY) is blocked by a wall edge.
 */
function isEdgeBlocked(wallEdges, width, fromX, fromY, toX, toY) {
  const fromIdx = fromY * width + fromX
  const dx = toX - fromX
  const dy = toY - fromY
  if (dy === -1) return !!(wallEdges[fromIdx] & EDGE_N)
  if (dx === 1)  return !!(wallEdges[fromIdx] & EDGE_E)
  if (dy === 1)  return !!(wallEdges[fromIdx] & EDGE_S)
  if (dx === -1) return !!(wallEdges[fromIdx] & EDGE_W)
  return false
}

/**
 * A* pathfinding with edge-based wall collision + cell-based prop collision.
 * @param {{ wallEdges: Uint8Array, cellBlocked: Uint8Array }} collisionData
 * @param {number} width
 * @param {number} height
 * @param {{x,y}} start
 * @param {{x,y}} end
 * @returns {Array<{x,y}>|null}
 */
export function findPathEdge(collisionData, width, height, start, end) {
  const { wallEdges, cellBlocked } = collisionData
  if (cellBlocked[end.y * width + end.x] === 1) return null
  if (start.x === end.x && start.y === end.y) return [start]

  const size = width * height
  const gScore = new Float32Array(size).fill(Infinity)
  const cameFrom = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)

  const idx = (x, y) => y * width + x
  const heuristic = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y)

  const startIdx = idx(start.x, start.y)
  gScore[startIdx] = 0

  const open = new MinHeap()
  open.push({ x: start.x, y: start.y, f: heuristic(start.x, start.y), idx: startIdx })

  while (open.size > 0) {
    const curr = open.pop()
    if (curr.x === end.x && curr.y === end.y) {
      const path = []
      let ci = curr.idx
      while (ci !== -1) {
        path.push({ x: ci % width, y: (ci / width) | 0 })
        ci = cameFrom[ci]
      }
      return path.reverse()
    }

    if (closed[curr.idx]) continue
    closed[curr.idx] = 1

    for (const { dx, dy } of DIRS) {
      const nx = curr.x + dx
      const ny = curr.y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

      const ni = idx(nx, ny)
      if (closed[ni]) continue
      if (cellBlocked[ni] === 1) continue
      if (isEdgeBlocked(wallEdges, width, curr.x, curr.y, nx, ny)) continue

      const tentG = gScore[curr.idx] + 1
      if (tentG < gScore[ni]) {
        gScore[ni] = tentG
        cameFrom[ni] = curr.idx
        open.push({ x: nx, y: ny, f: tentG + heuristic(nx, ny), idx: ni })
      }
    }
  }

  return null
}
```

Also add `findPathEdge` to the exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/pathfinding.test.js`
Expected: All tests PASS (existing + 5 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pathfinding.js src/lib/pathfinding.test.js
git commit -m "feat: add edge-based A* pathfinding for wall edge collision"
```

---

### Task 4: WallRenderer

**Files:**
- Create: `src/engine/WallRenderer.js`

No tests for this task — it's a PixiJS rendering component that requires a running app context. Verified visually in Task 7.

- [ ] **Step 1: Implement WallRenderer**

```javascript
// src/engine/WallRenderer.js
import * as PIXI from 'pixi.js'
import { resolveWallTile, resolveCornerTiles } from '../lib/wallAutotile.js'
import { NORTH, EAST, SOUTH, WEST } from '../lib/wallEdgeExtractor.js'

/**
 * Renders wall edge sprites at sub-grid positions using FA connector tiles.
 * Replaces the solid-fill wall layer from TilemapRendererV2.
 */
export class WallRenderer {
  constructor(tileAtlas, tileSize) {
    this.tileAtlas = tileAtlas
    this.tileSize = tileSize
    this.container = new PIXI.Container()
    this.spriteMap = new Map() // "edge-x-y-dir" → sprite
    this.wallEdges = null
    this.width = 0
    this.height = 0
    this.theme = 'village'
  }

  setWallData(wallEdges, width, height, theme) {
    this.wallEdges = wallEdges
    this.width = width
    this.height = height
    this.theme = theme || 'village'
    // Clear existing sprites on area change
    this.clear()
  }

  render(bounds) {
    if (!this.wallEdges || !this.tileAtlas) return

    const ts = this.tileSize
    const tileStartX = Math.max(0, Math.floor(bounds.startX / ts))
    const tileStartY = Math.max(0, Math.floor(bounds.startY / ts))
    const tileEndX = Math.min(this.width - 1, Math.ceil(bounds.endX / ts))
    const tileEndY = Math.min(this.height - 1, Math.ceil(bounds.endY / ts))

    const needed = new Set()

    // Render edge segments
    for (let y = tileStartY; y <= tileEndY; y++) {
      for (let x = tileStartX; x <= tileEndX; x++) {
        const bits = this.wallEdges[y * this.width + x]
        if (bits === 0) continue

        // Only render wall bits (low 4), not door bits (high 4) — doors handled separately
        if (bits & NORTH) this._renderEdge(x, y, 'north', needed)
        if (bits & EAST)  this._renderEdge(x, y, 'east', needed)
        if (bits & SOUTH) this._renderEdge(x, y, 'south', needed)
        if (bits & WEST)  this._renderEdge(x, y, 'west', needed)
      }
    }

    // Render corners at grid vertices
    for (let y = tileStartY; y <= tileEndY + 1; y++) {
      for (let x = tileStartX; x <= tileEndX + 1; x++) {
        this._renderCorner(x, y, needed)
      }
    }

    // Remove sprites no longer needed
    for (const [key, sprite] of this.spriteMap) {
      if (!needed.has(key)) {
        this.container.removeChild(sprite)
        sprite.destroy()
        this.spriteMap.delete(key)
      }
    }
  }

  _renderEdge(x, y, dir, needed) {
    const key = `edge-${x}-${y}-${dir}`
    needed.add(key)
    if (this.spriteMap.has(key)) return // already rendered

    const isVertical = dir === 'east' || dir === 'west'
    const result = resolveWallTile(this.theme, isVertical ? 'vertical' : 'horizontal', x, y)
    const tileId = typeof result === 'string' ? result : result.tileId
    const rotate = typeof result === 'object' && result.rotate

    const info = this.tileAtlas.resolve(tileId)
    const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
    if (!tex) return

    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5, 0.5)
    sprite.width = this.tileSize
    sprite.height = this.tileSize

    const ts = this.tileSize
    const half = ts / 2
    switch (dir) {
      case 'north': sprite.x = x * ts + half; sprite.y = y * ts; break
      case 'south': sprite.x = x * ts + half; sprite.y = (y + 1) * ts; break
      case 'east':  sprite.x = (x + 1) * ts;  sprite.y = y * ts + half; break
      case 'west':  sprite.x = x * ts;         sprite.y = y * ts + half; break
    }

    if (rotate) sprite.rotation = Math.PI / 2

    this.container.addChild(sprite)
    this.spriteMap.set(key, sprite)
  }

  _renderCorner(vx, vy, needed) {
    // Check which edges meet at vertex (vx, vy)
    // Vertex is top-left corner of cell (vx, vy)
    const hasS = this._hasEdge(vx, vy - 1, SOUTH) || this._hasEdge(vx - 1, vy - 1, SOUTH)
    const hasE = this._hasEdge(vx - 1, vy, EAST) || this._hasEdge(vx - 1, vy - 1, EAST)
    const hasN = this._hasEdge(vx, vy, NORTH) || this._hasEdge(vx - 1, vy, NORTH)
    const hasW = this._hasEdge(vx, vy, WEST) || this._hasEdge(vx, vy - 1, WEST)

    // Determine corner type from perpendicular edges meeting
    // Check all 4 possible L-corners at this vertex
    const corners = []
    if (this._hasEdge(vx - 1, vy - 1, SOUTH) && this._hasEdge(vx - 1, vy - 1, EAST)) corners.push('SW')
    if (this._hasEdge(vx, vy - 1, SOUTH) && this._hasEdge(vx, vy - 1, WEST)) corners.push('SE')
    if (this._hasEdge(vx - 1, vy, NORTH) && this._hasEdge(vx - 1, vy, EAST)) corners.push('NW')
    if (this._hasEdge(vx, vy, NORTH) && this._hasEdge(vx, vy, WEST)) corners.push('NE')

    for (const corner of corners) {
      const key = `corner-${vx}-${vy}-${corner}`
      needed.add(key)
      if (this.spriteMap.has(key)) continue

      const tileId = resolveCornerTiles(this.theme, corner)
      if (!tileId) continue // theme composes corners from segments

      const info = this.tileAtlas.resolve(tileId)
      const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
      if (!tex) continue

      const sprite = new PIXI.Sprite(tex)
      sprite.anchor.set(0.5, 0.5)
      sprite.width = this.tileSize
      sprite.height = this.tileSize
      sprite.x = vx * this.tileSize
      sprite.y = vy * this.tileSize
      this.container.addChild(sprite)
      this.spriteMap.set(key, sprite)
    }
  }

  _hasEdge(x, y, bit) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false
    return !!(this.wallEdges[y * this.width + x] & bit)
  }

  clear() {
    for (const [, sprite] of this.spriteMap) {
      sprite.destroy()
    }
    this.spriteMap.clear()
    this.container.removeChildren()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/WallRenderer.js
git commit -m "feat: add WallRenderer for edge-based FA connector sprites"
```

---

### Task 5: Wire areaBuilder to extract wall edges

**Files:**
- Modify: `src/lib/areaBuilder.js:123-131` (current collision step)

- [ ] **Step 1: Update areaBuilder.js**

Replace the current step 8 (collision build at lines 123-131) and add wall edge extraction:

Import at top of file:
```javascript
import { extractWallEdges } from './wallEdgeExtractor.js'
import { getBlockingSet } from '../engine/tileAtlas'
```

Replace step 8 block:
```javascript
  // 8. Extract wall edges (also backfills floor under wall cells)
  const doorSet = new Set()
  for (let i = 0; i < palette.length; i++) {
    if (palette[i] && palette[i].includes('door')) doorSet.add(palette[i])
  }
  const { wallEdges } = extractWallEdges(layers.walls, layers.floor, palette, doorSet, width, height)

  // 9. Build collision: cell-blocked from blocking props, edge-blocked from wallEdges
  const blockingSet = getBlockingSet()  // from tileAtlas — furniture, barrels, etc.
  const cellBlocked = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const propIdx = layers.props[i]
    if (propIdx === 0) continue
    const tileId = palette[propIdx] || ''
    if (blockingSet.has(tileId)) cellBlocked[i] = 1
  }
```

Update the return object — replace `collision` with `wallEdges` and `cellBlocked`:
```javascript
  return {
    id, name, width, height, tileSize: 200, palette, layers,
    wallEdges,        // Uint8Array — edge-based wall collision
    cellBlocked,      // Uint8Array — cell-based prop collision
    playerStart,
    npcs: placedNpcs, buildings, exits: placedExits,
    theme, generated: true,
  }
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/lib/areaBuilder.js
git commit -m "feat: wire wall edge extraction into area build pipeline"
```

---

### Task 6: Wire WallRenderer into PixiApp

**Files:**
- Modify: `src/engine/PixiApp.jsx:4,69-77,187-215`

- [ ] **Step 1: Update PixiApp.jsx**

Add import at top:
```javascript
import { WallRenderer } from './WallRenderer'
```

Add a ref for the wall renderer:
```javascript
const wallRendererRef = useRef(null)
```

In the layer setup (around line 69-78), the `walls` container stays but will be managed by WallRenderer instead of renderV2Layer. No change to layer creation.

In the V2 ticker effect (around line 193-215), replace the walls `renderV2Layer` call:

Change line 214 from:
```javascript
      renderV2Layer(walls, zone.layers.walls, zone.width, zone.height, tileSize, tileAtlas, bounds)
```
To:
```javascript
      // Wall edges rendered by WallRenderer (if available), otherwise skip
      if (wallRendererRef.current) {
        wallRendererRef.current.render(bounds)
      }
```

Add a new effect to initialize WallRenderer when zone has wallEdges:
```javascript
  // Initialize WallRenderer when wall edge data is available
  useEffect(() => {
    if (!ready || !tileAtlasV2Ref.current || !stageLayersRef.current.walls) return
    if (!zone?.wallEdges) return

    const wr = new WallRenderer(tileAtlasV2Ref.current, zone.tileSize || 200)
    wr.setWallData(zone.wallEdges, zone.width, zone.height, zone.theme)
    stageLayersRef.current.walls.addChild(wr.container)
    wallRendererRef.current = wr

    return () => {
      wr.clear()
      stageLayersRef.current.walls?.removeChild(wr.container)
      wallRendererRef.current = null
    }
  }, [ready, tileAtlasV2Ref.current, zone?.wallEdges])
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/engine/PixiApp.jsx
git commit -m "feat: wire WallRenderer into PixiApp replacing solid-fill walls"
```

---

### Task 7: Wire GameV2 to edge-based collision

**Files:**
- Modify: `src/GameV2.jsx:297-319,367-391,428-436`

- [ ] **Step 1: Update walkData to use edge-based collision**

Replace the `walkData` useMemo (lines 297-319):

```javascript
  const walkData = useMemo(() => {
    if (!zone?.layers) return null
    if (isV2Zone) {
      const w = zone.width, h = zone.height
      if (zone.wallEdges) {
        // Edge-based collision (sub-grid walls)
        return {
          type: 'v2-edge',
          wallEdges: zone.wallEdges,
          cellBlocked: zone.cellBlocked || new Uint8Array(w * h),
          width: w,
          height: h,
        }
      }
      // Fallback: cell-based collision (legacy V2 areas without wallEdges)
      const palette = zone.palette || []
      const collision = new Uint8Array(w * h)
      const wallLayer = zone.layers.walls
      if (wallLayer) {
        for (let i = 0; i < wallLayer.length; i++) {
          const idx = wallLayer[i]
          if (idx === 0) continue
          const tileId = palette[idx] || ''
          if (tileId.includes('door')) continue
          collision[i] = 1
        }
      }
      return { type: 'v2', collision, width: w, height: h }
    }
    return { type: 'v1', grid: buildWalkabilityGrid(zone.layers.walls, zone.layers.props, getBlockingSet(), zone.width, zone.height) }
  }, [zone, isV2Zone])
```

Update handleTileClick (around line 374):

```javascript
    if (wd.type === 'v2-edge') {
      // Edge-based: check cellBlocked for destination, then pathfind
      if (wd.cellBlocked[y * wd.width + x] === 1) return
      path = findPathEdge(
        { wallEdges: wd.wallEdges, cellBlocked: wd.cellBlocked },
        wd.width, wd.height, pos, { x, y }
      )
    } else if (wd.type === 'v2') {
      if (wd.collision[y * wd.width + x] === 1) return
      path = findPath(wd.collision, wd.width, wd.height, pos, { x, y })
    } else {
```

Update WASD handler (around line 428):

```javascript
      if (wd?.type === 'v2-edge') {
        if (nx < 0 || nx >= wd.width || ny < 0 || ny >= wd.height) return
        if (wd.cellBlocked[ny * wd.width + nx] === 1) return
        // Check wall edge between current and target cell
        const fromIdx = pos.y * wd.width + pos.x
        const dx = dir.x, dy = dir.y
        const edgeBit = dy === -1 ? 0x1 : dx === 1 ? 0x2 : dy === 1 ? 0x4 : 0x8
        if (wd.wallEdges[fromIdx] & edgeBit) return
      } else if (wd?.type === 'v2') {
```

Add import for `findPathEdge`:
```javascript
import { findPath, findPathLegacy, buildWalkabilityGrid, findPathEdge } from './lib/pathfinding'
```

- [ ] **Step 2: Add wallEdges re-derivation to areaStorage.loadArea**

`GameV2.jsx` reads `zone = areas[currentAreaId]` — the full area object from `state.areas`, NOT from `activateArea`'s extracted fields. So no store changes needed for `wallEdges` to flow through — `buildAndLoadArea` stores the full area.

However, areas loaded from Supabase via `areaStorage.loadArea()` won't have `wallEdges` (it's not persisted). Add re-derivation in `src/lib/areaStorage.js`:

```javascript
import { extractWallEdges } from './wallEdgeExtractor.js'
import { getBlockingSet } from '../engine/tileAtlas'
```

In the `loadArea` function, after decoding layers (line 108-111), re-derive wall edges:

```javascript
export async function loadArea(campaignId, areaId) {
  // ... existing fetch code ...
  const expectedLength = area.width * area.height
  const layers = decodeLayers(area.layers, expectedLength)

  // Re-derive wall edges from walls layer (not persisted to save storage)
  const palette = area.palette || []
  const doorSet = new Set()
  for (let i = 0; i < palette.length; i++) {
    if (palette[i] && palette[i].includes('door')) doorSet.add(palette[i])
  }
  const { wallEdges, floor: backfilledFloor } = extractWallEdges(
    layers.walls, layers.floor, palette, doorSet, area.width, area.height
  )
  layers.floor = backfilledFloor

  // Build cellBlocked from blocking props
  const blockingSet = getBlockingSet()
  const cellBlocked = new Uint8Array(expectedLength)
  for (let i = 0; i < expectedLength; i++) {
    const propIdx = layers.props?.[i]
    if (propIdx === 0 || !propIdx) continue
    const tileId = palette[propIdx] || ''
    if (blockingSet.has(tileId)) cellBlocked[i] = 1
  }

  return { ...area, layers, wallEdges, cellBlocked }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/GameV2.jsx src/lib/areaStorage.js
git commit -m "feat: wire edge-based collision into GameV2 movement and pathfinding"
```

---

### Task 8: Visual Verification & Iteration

**Files:** None created — this is a manual verification step.

- [ ] **Step 1: Start dev server and test**

Run: `npx vite dev`

Open `http://localhost:5175/?v2&testarea` in browser.

Expected visual:
- Floor tiles render as before
- Walls render as thin FA connector sprites on building edges instead of solid fill
- Corners show corner tiles where perpendicular walls meet
- Player can walk inside building boundaries (floor is visible where walls were)
- Player cannot cross wall edges (movement blocked)
- Camera zoom/pan works normally with wall sprites

- [ ] **Step 2: Check for visual alignment issues**

If FA connector sprites are misaligned (not centered on cell edges):
- Adjust `sprite.anchor` in WallRenderer `_renderEdge` method
- FA tiles may have their art offset within the 200x200 frame — adjust position compensation

- [ ] **Step 3: Check for missing corner tiles**

If corners look wrong or missing:
- Verify the corner detection logic in `_renderCorner`
- For themes without corner tiles (forest, town), overlapping segments should create visual corners
- If that doesn't work, add segment-composition logic to WallRenderer

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: adjust wall rendering alignment and corner detection"
```

---

### Task 9: Run All Tests

**Files:** None modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All existing tests pass + 21 new tests pass (6 wallEdgeExtractor + 10 wallAutotile + 5 pathfinding)

- [ ] **Step 2: Fix any regressions**

If any existing tests fail, investigate. The most likely failure is in `pathfinding.test.js` if the `buildCollisionLayer` tests reference the old function — those should still pass since we didn't remove it.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve test regressions from wall rendering integration"
```
