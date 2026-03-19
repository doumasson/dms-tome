# Phase 1: Tilemap Renderer + Ornate HUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current ScenePanel/GameLayout with a PixiJS tilemap renderer (fullscreen WebGL canvas) and an ornate dark fantasy HUD overlay (React), rendering a single demo zone from a tileset.

**Architecture:** PixiJS v8 renders tilemaps on a WebGL canvas filling the viewport. React renders the ornate HUD (bottom bar with portraits, session log, action buttons) as an HTML overlay on top. Zustand drives both layers. This task does NOT implement zone transitions, combat mode, or campaign generation — just the renderer + HUD + one hardcoded demo zone.

**Tech Stack:** PixiJS v8, React 19, Zustand 5, Vitest (new), Vite (no @pixi/react — manual wrapper is simpler and more reliable)

**Spec:** `docs/superpowers/specs/2026-03-18-dms-tome-v2-design.md`

**Visual reference:** `.superpowers/brainstorm/1850-1773877367/hud-ornate-v3.html` — the approved HUD mockup

---

## File Structure

### New files to create

```
src/
├── engine/                          # PixiJS game engine layer
│   ├── PixiApp.jsx                  # React component wrapping PixiJS Application (~80 lines)
│   ├── TilemapRenderer.js           # Renders tile layers from zone data onto Pixi stage (~120 lines)
│   ├── TokenLayer.js                # Renders player/NPC tokens as Pixi sprites (~100 lines)
│   ├── GridOverlay.js               # Renders grid lines on the tilemap (~50 lines)
│   ├── ExitZone.js                  # Renders exit/door highlights (~60 lines)
│   └── tileAtlas.js                 # Loads spritesheet + atlas JSON, provides tile lookup (~40 lines)
│
├── hud/                             # React HUD overlay components
│   ├── GameHUD.jsx                  # Top-level HUD container (positions all HUD elements) (~60 lines)
│   ├── BottomBar.jsx                # Ornate bottom bar frame + layout (~80 lines)
│   ├── PartyPortraits.jsx           # Portrait cards with ornate SVG frames (~120 lines)
│   ├── SessionLog.jsx               # LOG/CHAT tabbed panel with monospace entries (~100 lines)
│   ├── ActionArea.jsx               # Tool buttons + chat input (exploration mode) (~80 lines)
│   ├── ZoneLabel.jsx                # Top-left zone name with ornate frame (~50 lines)
│   ├── NarratorFloat.jsx            # Floating DM speech above bottom bar (~50 lines)
│   ├── OrnateFrame.jsx              # Reusable SVG ornate corner/border component (~60 lines)
│   ├── OrnateDivider.jsx            # Reusable SVG vertical divider component (~40 lines)
│   └── FiligreeBar.jsx              # Top border SVG filigree for bottom bar (~50 lines)
│
├── hud/hud.css                      # HUD-specific styles (V2 palette, Cinzel fonts) (~150 lines)
│
├── data/
│   ├── tileAtlas.json               # Tile atlas manifest (categories, indices, blocking) (~80 lines)
│   └── demoZone.json                # Hardcoded demo zone (inn bar room) for testing (~60 lines)
│
├── lib/
│   └── pathfinding.js               # A* pathfinding on walkability grid (~80 lines)
│
└── GameV2.jsx                       # New top-level game component (PixiApp + GameHUD) (~40 lines)

public/
└── tilesets/
    └── tiles.png                    # Primary tileset spritesheet (downloaded free asset)

tests/                               # New test directory
├── engine/
│   └── TilemapRenderer.test.js      # Tilemap rendering logic tests
├── lib/
│   └── pathfinding.test.js          # A* pathfinding tests
└── setup.js                         # Vitest setup file
```

### Existing files to modify

```
package.json                         # Add pixi.js, @pixi/react, vitest deps
vite.config.js                       # Add vitest config
src/index.css                        # Add V2 CSS variables alongside V1 (non-breaking)
src/App.jsx                          # Add route/toggle for GameV2 (V1 preserved, V2 opt-in)
```

---

## Task 1: Add PixiJS + Vitest dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `tests/setup.js`

- [ ] **Step 1: Install dependencies**

```bash
npm install pixi.js
npm install -D vitest @vitest/ui jsdom
```

> **Note:** We use a manual PixiJS wrapper (useRef + useEffect) instead of `@pixi/react`. This is simpler, avoids version compatibility issues, and the spec identifies it as the preferred approach.

- [ ] **Step 2: Configure Vitest in vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})
```

- [ ] **Step 3: Create test setup file**

Create `tests/setup.js`:

```js
// Vitest setup — mock WebGL context for PixiJS tests
import { vi } from 'vitest'

// PixiJS requires a canvas context — stub it for unit tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  canvas: { width: 800, height: 600 },
}))
```

- [ ] **Step 4: Add test script to package.json**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify test runner works**

Run: `npm test`
Expected: No tests found (0 pass, 0 fail). Vitest runs and exits cleanly.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js tests/setup.js
git commit -m "feat: add PixiJS v8, @pixi/react, and Vitest test framework"
```

---

## Task 2: Tile Atlas + Demo Zone Data

**Files:**
- Create: `src/data/tileAtlas.json`
- Create: `src/data/demoZone.json`
- Create: `src/engine/tileAtlas.js`

- [ ] **Step 1: Create tile atlas manifest**

Create `src/data/tileAtlas.json`:

```json
{
  "tileSize": 32,
  "sheetCols": 16,
  "sheetPath": "/tilesets/tiles.png",
  "emptyTile": -1,
  "categories": {
    "floors": {
      "wood_planks": [1, 2, 3, 4],
      "stone": [5, 6, 7, 8],
      "dirt": [9, 10],
      "grass": [11, 12, 13, 14]
    },
    "walls": {
      "stone": {
        "isolated": 17, "vertical": 18, "horizontal": 19, "cross": 20,
        "corner_tl": 21, "corner_tr": 22, "corner_bl": 23, "corner_br": 24,
        "t_up": 25, "t_down": 26, "t_left": 27, "t_right": 28,
        "end_up": 29, "end_down": 30, "end_left": 31, "end_right": 32
      }
    },
    "props": {
      "table_round": 33, "table_rect": 34, "chair_l": 35, "chair_r": 36,
      "barrel": 37, "crate": 38, "bookshelf": 39, "fireplace": 40,
      "door_closed": 41, "door_open": 42, "stairs_up": 43, "stairs_down": 44,
      "bar_counter": 45, "bottles": 46, "candle": 47, "rug": 48
    }
  },
  "blocking": [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,37,38,39,41,45]
}
```

- [ ] **Step 2: Create demo zone data (inn bar room)**

Create `src/data/demoZone.json`:

```json
{
  "id": "inn-bar",
  "name": "The Weary Traveler Inn",
  "type": "tavern",
  "tags": ["safe", "indoor"],
  "width": 12,
  "height": 10,
  "layers": {
    "floor": [
      [5,5,5,5,5,5,5,5,5,5,5,5],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,48,48,1,1,1,1,1],
      [1,1,1,1,1,48,48,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [5,5,5,5,5,1,1,5,5,5,5,5]
    ],
    "walls": [
      [21,19,19,19,19,19,19,19,19,19,19,22],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [23,19,19,19,19,-1,-1,19,19,19,19,24]
    ],
    "props": [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,46,-1,-1,46,-1,-1,-1,-1],
      [-1,40,-1,-1,45,45,45,45,-1,-1,37,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,37,-1],
      [-1,-1,33,-1,-1,-1,-1,-1,-1,34,-1,-1],
      [-1,-1,-1,-1,-1,47,-1,-1,-1,-1,-1,-1],
      [-1,-1,35,-1,-1,-1,-1,-1,-1,36,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,38,38,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
    ]
  },
  "npcs": [
    {
      "name": "Greta",
      "role": "bartender",
      "personality": "gruff but kind, knows about forest disappearances",
      "position": { "x": 6, "y": 2 },
      "questRelevant": true
    },
    {
      "name": "Old Durnan",
      "role": "patron",
      "personality": "drunk old soldier, mumbles about the old war",
      "position": { "x": 9, "y": 5 },
      "questRelevant": false
    }
  ],
  "exits": [
    {
      "position": { "x": 5, "y": 9 },
      "width": 2,
      "direction": "south",
      "targetZone": "town-square",
      "entryPoint": { "x": 5, "y": 0 },
      "label": "Town Square"
    }
  ],
  "lighting": "warm",
  "ambience": "tavern"
}
```

- [ ] **Step 3: Create tile atlas loader**

Create `src/engine/tileAtlas.js`:

```js
import * as PIXI from 'pixi.js'
import atlasData from '../data/tileAtlas.json'

let sheetTexture = null
const tileTextures = new Map()
const EMPTY = atlasData.emptyTile ?? -1

export async function loadTileAtlas() {
  if (sheetTexture) return
  try {
    sheetTexture = await PIXI.Assets.load(atlasData.sheetPath)
  } catch (e) {
    console.warn('Tileset not found, using fallback colors:', e)
    sheetTexture = null // fallback handled in getTileTexture
  }
}

export function getTileTexture(tileIndex) {
  if (tileIndex === EMPTY || tileIndex < 0) return null
  if (tileTextures.has(tileIndex)) return tileTextures.get(tileIndex)

  const cols = atlasData.sheetCols
  const size = atlasData.tileSize
  const sx = (tileIndex % cols) * size
  const sy = Math.floor(tileIndex / cols) * size

  if (!sheetTexture) {
    // Fallback: generate a colored rectangle texture
    const g = new PIXI.Graphics()
    g.rect(0, 0, size, size).fill(getFallbackColor(tileIndex))
    const texture = PIXI.RenderTexture.create({ width: size, height: size })
    // Note: rendering to texture requires app.renderer — for now return null
    // Real fallback: use placeholderTileset.js at load time
    return null
  }

  const texture = new PIXI.Texture({
    source: sheetTexture.source,
    frame: new PIXI.Rectangle(sx, sy, size, size),
  })
  tileTextures.set(tileIndex, texture)
  return texture
}

export function isTileBlocking(tileIndex) {
  return atlasData.blocking.includes(tileIndex)
}

export function getTileSize() {
  return atlasData.tileSize
}

export function getBlockingSet() {
  return new Set(atlasData.blocking)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/tileAtlas.json src/data/demoZone.json src/engine/tileAtlas.js
git commit -m "feat: add tile atlas manifest, demo zone data, and atlas loader"
```

---

## Task 3: A* Pathfinding

**Files:**
- Create: `src/lib/pathfinding.js`
- Create: `tests/lib/pathfinding.test.js`

- [ ] **Step 1: Write pathfinding tests**

Create `tests/lib/pathfinding.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { findPath, buildWalkabilityGrid } from '../../src/lib/pathfinding.js'

describe('buildWalkabilityGrid', () => {
  it('marks blocking tiles as false', () => {
    const walls = [[-1, 18, -1], [-1, -1, -1]]
    const props = [[-1, -1, -1], [-1, 37, -1]]
    const blocking = new Set([18, 37])
    const grid = buildWalkabilityGrid(walls, props, blocking, 3, 2)
    expect(grid[0][0]).toBe(true)
    expect(grid[0][1]).toBe(false) // wall
    expect(grid[1][1]).toBe(false) // barrel
    expect(grid[1][0]).toBe(true)
  })
})

describe('findPath', () => {
  it('finds straight path in open grid', () => {
    const grid = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toHaveLength(3)
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[2]).toEqual({ x: 2, y: 0 })
  })

  it('paths around obstacles', () => {
    const grid = [
      [true, false, true],
      [true, true, true],
      [true, false, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).not.toBeNull()
    expect(path.length).toBeGreaterThan(3)
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 })
  })

  it('returns null when no path exists', () => {
    const grid = [
      [true, false, true],
      [false, false, true],
      [true, true, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toBeNull()
  })

  it('returns single-cell path for same start and end', () => {
    const grid = [[true, true], [true, true]]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(path).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/pathfinding.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pathfinding**

Create `src/lib/pathfinding.js`:

```js
/**
 * Build a walkability grid from zone tile layers.
 * @param {number[][]} walls - Wall layer tile indices
 * @param {number[][]} props - Props layer tile indices
 * @param {Set<number>} blocking - Set of blocking tile indices
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {boolean[][]} true = walkable
 */
export function buildWalkabilityGrid(walls, props, blocking, width, height) {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const wallTile = walls[y]?.[x] ?? 0
      const propTile = props[y]?.[x] ?? 0
      const walkable = !blocking.has(wallTile) && !blocking.has(propTile)
      row.push(walkable)
    }
    grid.push(row)
  }
  return grid
}

/**
 * A* pathfinding on a 2D grid. 4-directional movement.
 * @param {boolean[][]} grid - Walkability grid
 * @param {{x:number, y:number}} start
 * @param {{x:number, y:number}} end
 * @returns {{x:number, y:number}[]|null} Path from start to end, or null
 */
export function findPath(grid, start, end) {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  if (!width || !height) return null

  const key = (x, y) => `${x},${y}`
  const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

  const open = [{ ...start, g: 0, f: heuristic(start, end) }]
  const cameFrom = new Map()
  const gScore = new Map()
  gScore.set(key(start.x, start.y), 0)

  const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]

  while (open.length > 0) {
    // Find lowest f-score
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open.splice(bestIdx, 1)[0]

    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path = [{ x: end.x, y: end.y }]
      let k = key(end.x, end.y)
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k)
        path.unshift(prev)
        k = key(prev.x, prev.y)
      }
      return path
    }

    for (const dir of dirs) {
      const nx = current.x + dir.x
      const ny = current.y + dir.y
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (!grid[ny][nx]) continue

      const tentativeG = current.g + 1
      const nk = key(nx, ny)
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG)
        cameFrom.set(nk, { x: current.x, y: current.y })
        const f = tentativeG + heuristic({ x: nx, y: ny }, end)
        open.push({ x: nx, y: ny, g: tentativeG, f })
      }
    }
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/pathfinding.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pathfinding.js tests/lib/pathfinding.test.js
git commit -m "feat: add A* pathfinding with 4-directional grid movement"
```

---

## Task 4: PixiJS Application Wrapper

**Files:**
- Create: `src/engine/PixiApp.jsx`
- Create: `src/engine/TilemapRenderer.js`
- Create: `src/engine/GridOverlay.js`

- [ ] **Step 1: Create PixiJS React wrapper**

Create `src/engine/PixiApp.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas } from './tileAtlas'
import { renderTilemap, clearTilemap } from './TilemapRenderer'
import { renderGrid, clearGrid } from './GridOverlay'

export default function PixiApp({ zone, tokens, onTileClick }) {
  const containerRef = useRef(null)
  const appRef = useRef(null)
  const stageLayersRef = useRef({})
  const onTileClickRef = useRef(onTileClick)
  onTileClickRef.current = onTileClick

  // Initialize PixiJS application
  useEffect(() => {
    const app = new PIXI.Application()
    appRef.current = app

    const init = async () => {
      await app.init({
        resizeTo: containerRef.current,
        background: 0x08060c,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      containerRef.current.appendChild(app.canvas)

      // Create layer containers (render order)
      const layers = {
        floor: new PIXI.Container(),
        walls: new PIXI.Container(),
        props: new PIXI.Container(),
        grid: new PIXI.Container(),
        tokens: new PIXI.Container(),
        exits: new PIXI.Container(),
      }
      Object.values(layers).forEach(l => app.stage.addChild(l))
      stageLayersRef.current = layers

      await loadTileAtlas()

      // Click handler
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      app.stage.on('pointerdown', (e) => {
        if (!onTileClickRef.current) return
        const pos = e.global
        const tileSize = 32
        const tx = Math.floor(pos.x / tileSize)
        const ty = Math.floor(pos.y / tileSize)
        onTileClickRef.current({ x: tx, y: ty })
      })
    }

    init()

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [])

  // Render zone tilemap when zone data changes
  useEffect(() => {
    if (!zone || !stageLayersRef.current.floor) return
    const { floor, walls, props, grid } = stageLayersRef.current
    clearTilemap(floor)
    clearTilemap(walls)
    clearTilemap(props)
    renderTilemap(floor, zone.layers.floor)
    renderTilemap(walls, zone.layers.walls)
    renderTilemap(props, zone.layers.props)
    clearGrid(grid)
    renderGrid(grid, zone.width, zone.height)
  }, [zone])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, bottom: 134 }}
    />
  )
}
```

- [ ] **Step 2: Create tilemap renderer**

Create `src/engine/TilemapRenderer.js`:

```js
import * as PIXI from 'pixi.js'
import { getTileTexture, getTileSize } from './tileAtlas'

/**
 * Render a 2D tile layer into a PIXI.Container.
 * @param {PIXI.Container} container
 * @param {number[][]} layer - 2D array of tile indices
 */
export function renderTilemap(container, layer) {
  const tileSize = getTileSize()
  for (let y = 0; y < layer.length; y++) {
    for (let x = 0; x < layer[y].length; x++) {
      const tileIndex = layer[y][x]
      if (tileIndex < 0) continue // -1 = empty tile
      const texture = getTileTexture(tileIndex)
      if (!texture) continue
      const sprite = new PIXI.Sprite(texture)
      sprite.x = x * tileSize
      sprite.y = y * tileSize
      sprite.width = tileSize
      sprite.height = tileSize
      container.addChild(sprite)
    }
  }
}

/**
 * Remove all children from a container.
 */
export function clearTilemap(container) {
  container.removeChildren()
}
```

- [ ] **Step 3: Create grid overlay**

Create `src/engine/GridOverlay.js`:

```js
import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

/**
 * Render a grid overlay onto a PIXI.Container.
 */
export function renderGrid(container, width, height, color = 0xc9a84c, alpha = 0.04) {
  const tileSize = getTileSize()
  const g = new PIXI.Graphics()

  // PixiJS v8 Graphics API: chain moveTo/lineTo then call stroke() with style
  // Vertical lines
  for (let x = 0; x <= width; x++) {
    g.moveTo(x * tileSize, 0).lineTo(x * tileSize, height * tileSize)
  }
  // Horizontal lines
  for (let y = 0; y <= height; y++) {
    g.moveTo(0, y * tileSize).lineTo(width * tileSize, y * tileSize)
  }

  g.stroke({ width: 0.5, color, alpha })
  container.addChild(g)
}

export function clearGrid(container) {
  container.removeChildren()
}
```

- [ ] **Step 4: Commit**

```bash
git add src/engine/PixiApp.jsx src/engine/TilemapRenderer.js src/engine/GridOverlay.js
git commit -m "feat: add PixiJS app wrapper, tilemap renderer, and grid overlay"
```

---

## Task 5: Placeholder Tileset

**Files:**
- Create: `public/tilesets/tiles.png`
- Create: `src/engine/placeholderTileset.js`

Since we need a tileset image to render anything, we'll generate a placeholder programmatically. This gets replaced with real Forgotten Adventures assets later.

- [ ] **Step 1: Create placeholder tileset generator**

Create `src/engine/placeholderTileset.js`:

```js
/**
 * Generate a placeholder 512x512 tileset PNG (16x16 tiles at 32px each).
 * Each tile is a colored rectangle with an index number.
 * Run this in browser console or a script to produce tiles.png.
 */
export function generatePlaceholderTileset() {
  const canvas = document.createElement('canvas')
  const size = 32
  const cols = 16
  const rows = 16
  canvas.width = cols * size
  canvas.height = rows * size
  const ctx = canvas.getContext('2d')

  const colors = {
    // Floors (0-15)
    0: '#2a1a0c', 1: '#2e1e10', 2: '#261608', 3: '#321e0e',  // wood
    4: '#333338', 5: '#2e2e34', 6: '#38383e', 7: '#2a2a30',  // stone
    8: '#3a2a1a', 9: '#342414',                                // dirt
    10: '#1a3a1a', 11: '#1e3e1e', 12: '#163616', 13: '#224222', // grass

    // Walls (16-31)
    16: '#4a4a54', 17: '#4a4a54', 18: '#4a4a54', 19: '#4a4a54',
    20: '#555560', 21: '#555560', 22: '#555560', 23: '#555560',
    24: '#4a4a54', 25: '#4a4a54', 26: '#4a4a54', 27: '#4a4a54',
    28: '#3e3e48', 29: '#3e3e48', 30: '#3e3e48', 31: '#3e3e48',

    // Props (32-47)
    32: '#5a3a1a', 33: '#5a3a1a', 34: '#3a2010', 35: '#3a2010', // tables/chairs
    36: '#4a3018', 37: '#4a2a14', 38: '#3a2a1a', 39: '#ff6600', // barrel/crate/shelf/fire
    40: '#6b4226', 41: '#3a2a14', 42: '#2a1a0a', 43: '#2a1a0a', // doors/stairs
    44: '#4a3018', 45: '#2a5a3a', 46: '#ffcc00', 47: '#5a2020', // bar/bottles/candle/rug
  }

  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) * size
    const y = Math.floor(i / cols) * size
    const color = colors[i] || '#1a1a1a'
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
    // Index label
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '8px monospace'
    ctx.fillText(String(i), x + 2, y + 10)
  }

  return canvas.toDataURL('image/png')
}
```

- [ ] **Step 2: Generate and save the placeholder tileset**

Run in browser dev console (after dev server is running) or create a one-shot node script. Alternatively, create a simple 512x512 PNG manually with colored squares. The key requirement is that `public/tilesets/tiles.png` exists as a 16x16 grid of 32px tiles.

For now, create a minimal approach — a solid-color tile placeholder:

```bash
# Create directory
mkdir -p public/tilesets
```

Then use the placeholder generator at dev time — on first load, the app can call `generatePlaceholderTileset()` and the engine falls back gracefully if tiles.png is missing.

- [ ] **Step 3: Add fallback to tileAtlas.js for missing tileset**

Update `src/engine/tileAtlas.js` — add a try/catch around `PIXI.Assets.load` that falls back to a colored-rectangle approach if the PNG is missing. (Implementation detail: if load fails, generate textures programmatically from the color map.)

- [ ] **Step 4: Commit**

```bash
git add src/engine/placeholderTileset.js public/tilesets/
git commit -m "feat: add placeholder tileset generator for development"
```

---

## Task 6: Ornate HUD — CSS + Reusable SVG Components

**Files:**
- Create: `src/hud/hud.css`
- Create: `src/hud/OrnateFrame.jsx`
- Create: `src/hud/OrnateDivider.jsx`
- Create: `src/hud/FiligreeBar.jsx`

- [ ] **Step 1: Create V2 HUD CSS**

Create `src/hud/hud.css`:

```css
/* @import MUST be first in the file */
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;700;900&display=swap');

/* === V2 HUD Palette === */
.hud-v2 {
  --gold: #c9a84c;
  --gold-bright: #eedd88;
  --gold-muted: #8a7a52;
  --bg-dark: #08060c;
  --bg-bar: #14101c;
  --bg-panel: rgba(10, 8, 14, 0.95);
  --border-gold: rgba(201, 168, 76, 0.18);
  --text-primary: #bba878;
  --text-muted: #5a4a30;
  --text-log: #8a7a60;
  --danger: #cc3333;
  --font-display: 'Cinzel Decorative', 'Cinzel', serif;
  --font-heading: 'Cinzel', serif;
  --font-log: 'Consolas', 'Monaco', monospace;
}

/* Bottom bar base */
.hud-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 134px;
  z-index: 20;
  background: linear-gradient(180deg, #14101c 0%, #0a0810 100%);
  display: flex;
  padding: 14px 14px 10px;
  gap: 8px;
}

/* Session log panel */
.hud-log-panel {
  flex: 1;
  position: relative;
  background: var(--bg-panel);
  border: 1px solid var(--border-gold);
  box-shadow: inset 0 1px 8px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.hud-log-tabs {
  display: flex;
  border-bottom: 1px solid rgba(201, 168, 76, 0.1);
  padding: 0 10px;
}

.hud-log-tab {
  padding: 5px 18px;
  font-size: 8px;
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  color: #4a3a28;
  border-bottom: 2px solid transparent;
}

.hud-log-tab.active {
  color: var(--gold-bright);
  border-bottom-color: var(--gold);
}

.hud-log-entries {
  padding: 5px 12px;
  font-size: 11px;
  line-height: 1.65;
  overflow-y: auto;
  max-height: 82px;
  font-family: var(--font-log);
}

.hud-log-entry {
  padding: 2px 0;
  border-bottom: 1px solid rgba(201, 168, 76, 0.04);
}

.hud-log-time { color: var(--text-muted); font-size: 9px; }
.hud-log-action { color: var(--text-log); }
.hud-log-location { color: #bba060; }
.hud-log-damage { color: var(--danger); }
.hud-log-hit { color: #228844; font-weight: 700; }

/* Tool buttons */
.hud-tool-btn {
  width: 40px;
  height: 38px;
  background: linear-gradient(180deg, #18141e, #0e0c14);
  border: 1px solid rgba(201, 168, 76, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  position: relative;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}

/* Chat input */
.hud-chat-input {
  flex: 1;
  background: var(--bg-panel);
  border: 1px solid rgba(201, 168, 76, 0.15);
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-primary);
  font-family: var(--font-heading);
  border-radius: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5);
}

.hud-chat-input::placeholder { color: #6a5a40; }

.hud-send-btn {
  width: 36px;
  background: linear-gradient(135deg, #d4b85c, #9a7a30);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  color: #08060c;
  font-weight: 900;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}

/* Zone label */
.hud-zone-label {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(8, 6, 12, 0.92);
  padding: 10px 28px;
}

.hud-zone-name {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--gold-bright);
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-shadow: 0 0 12px rgba(201, 168, 76, 0.3);
}

.hud-zone-sub {
  font-size: 9px;
  color: #8a7a50;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-align: center;
  margin-top: 2px;
}

/* Narrator float */
.hud-narrator {
  position: absolute;
  z-index: 10;
  background: rgba(8, 6, 12, 0.92);
  border: 1px solid rgba(201, 168, 76, 0.2);
  padding: 10px 28px;
}

.hud-narrator-text {
  font-size: 12px;
  color: #bba878;
  font-style: italic;
  text-align: center;
  line-height: 1.6;
}

.hud-narrator-name {
  color: var(--gold-bright);
  font-weight: 700;
  font-style: normal;
  letter-spacing: 1px;
  font-family: var(--font-heading);
}
```

- [ ] **Step 2: Create OrnateFrame component**

Create `src/hud/OrnateFrame.jsx`:

```jsx
/**
 * Reusable SVG ornate corner brackets for any panel.
 * Renders as an absolutely-positioned SVG overlay.
 * Props: size (corner length), stroke (color), weight (stroke width)
 */
export default function OrnateFrame({ size = 16, stroke = '#c9a84c', weight = 2, jeweled = true }) {
  const r = jeweled ? weight + 1 : 0
  const ir = jeweled ? r * 0.4 : 0
  const s = size
  const offset = -(weight + 1)

  const corner = (transform) => (
    <svg
      style={{ position: 'absolute', ...transform, pointerEvents: 'none', zIndex: 2 }}
      width={s} height={s} viewBox={`0 0 ${s} ${s}`}
    >
      <path
        d={`M0,${s} L0,${weight + 1} Q0,0 ${weight + 1},0 L${s},0`}
        fill="none" stroke={stroke} strokeWidth={weight}
      />
      {jeweled && <>
        <circle cx={weight} cy={weight} r={r} fill={stroke} />
        <circle cx={weight} cy={weight} r={ir} fill="#08060c" />
      </>}
    </svg>
  )

  return <>
    {corner({ top: `${offset}px`, left: `${offset}px` })}
    {corner({ top: `${offset}px`, right: `${offset}px`, transform: 'scaleX(-1)' })}
    {corner({ bottom: `${offset}px`, left: `${offset}px`, transform: 'scaleY(-1)' })}
    {corner({ bottom: `${offset}px`, right: `${offset}px`, transform: 'scale(-1)' })}
  </>
}
```

- [ ] **Step 3: Create OrnateDivider component**

Create `src/hud/OrnateDivider.jsx`:

```jsx
/**
 * Ornate vertical divider with jeweled terminals and diamond accents.
 */
export default function OrnateDivider({ height = 106, color = '#c9a84c' }) {
  return (
    <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height={height} viewBox={`0 0 16 ${height}`}>
        <line x1="8" y1="0" x2="8" y2={height} stroke={color} strokeWidth="1" opacity="0.25" />
        <line x1="5" y1="4" x2="5" y2={height - 4} stroke={color} strokeWidth="0.3" opacity="0.1" />
        <line x1="11" y1="4" x2="11" y2={height - 4} stroke={color} strokeWidth="0.3" opacity="0.1" />
        {/* Top jewel */}
        <circle cx="8" cy="6" r="3.5" fill={color} opacity="0.4" />
        <circle cx="8" cy="6" r="1.5" fill="#08060c" />
        {/* Upper diamond */}
        <polygon points="5,22 8,15 11,22 8,29" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
        <circle cx="8" cy="22" r="1.5" fill={color} opacity="0.3" />
        {/* Upper leaf */}
        <path d={`M4,38 Q8,34 12,38 Q8,42 4,38`} fill={color} opacity="0.2" stroke={color} strokeWidth="0.8" />
        {/* Center ring */}
        <circle cx="8" cy={height / 2} r="4.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <circle cx="8" cy={height / 2} r="2" fill={color} opacity="0.4" />
        <circle cx="8" cy={height / 2} r="0.8" fill="#08060c" />
        {/* Lower leaf */}
        <path d={`M4,68 Q8,64 12,68 Q8,72 4,68`} fill={color} opacity="0.2" stroke={color} strokeWidth="0.8" />
        {/* Lower diamond */}
        <polygon points="5,84 8,77 11,84 8,91" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
        <circle cx="8" cy="84" r="1.5" fill={color} opacity="0.3" />
        {/* Bottom jewel */}
        <circle cx="8" cy={height - 6} r="3.5" fill={color} opacity="0.4" />
        <circle cx="8" cy={height - 6} r="1.5" fill="#08060c" />
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Create FiligreeBar component**

Create `src/hud/FiligreeBar.jsx`:

```jsx
/**
 * Ornate SVG filigree bar — the decorative top border of the bottom bar.
 * Scrollwork, diamonds, jeweled center ornament, heavy corners.
 */
export default function FiligreeBar({ color = '#c9a84c' }) {
  return (
    <svg
      style={{ position: 'absolute', top: -12, left: 0, right: 0, width: '100%', height: 24, pointerEvents: 'none' }}
      viewBox="0 0 1000 24" preserveAspectRatio="none"
    >
      {/* Double line */}
      <line x1="0" y1="10" x2="1000" y2="10" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="30" y1="14" x2="970" y2="14" stroke={color} strokeWidth="0.6" opacity="0.15" />

      {/* Center ornament */}
      <path d="M440,12 Q455,3 470,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M470,12 Q485,3 500,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M500,12 Q515,21 530,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M530,12 Q545,21 560,12" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="500" cy="12" r="5.5" fill={color} />
      <circle cx="500" cy="12" r="3" fill="#08060c" />
      <circle cx="500" cy="12" r="1.5" fill={color} opacity="0.6" />
      <polygon points="470,12 474,8 478,12 474,16" fill={color} opacity="0.5" />
      <polygon points="522,12 526,8 530,12 526,16" fill={color} opacity="0.5" />

      {/* Left filigree cluster */}
      <path d="M160,12 Q175,4 190,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <path d="M190,12 Q205,20 220,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <circle cx="190" cy="12" r="3" fill={color} opacity="0.35" />
      <circle cx="190" cy="12" r="1.2" fill="#08060c" />
      <polygon points="130,12 135,7 140,12 135,17" fill="none" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <path d="M70,12 Q82,6 94,12 Q82,18 70,12" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />

      {/* Right filigree cluster */}
      <path d="M780,12 Q795,4 810,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <path d="M810,12 Q825,20 840,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <circle cx="810" cy="12" r="3" fill={color} opacity="0.35" />
      <circle cx="810" cy="12" r="1.2" fill="#08060c" />
      <polygon points="860,12 865,7 870,12 865,17" fill="none" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <path d="M906,12 Q918,6 930,12 Q918,18 906,12" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />

      {/* Mid accents */}
      <polygon points="320,12 324,8 328,12 324,16" fill={color} opacity="0.3" />
      <circle cx="370" cy="12" r="2" fill={color} opacity="0.25" />
      <polygon points="672,12 676,8 680,12 676,16" fill={color} opacity="0.3" />
      <circle cx="630" cy="12" r="2" fill={color} opacity="0.25" />

      {/* Heavy corners */}
      <path d="M0,23 L0,5 Q0,0 5,0 L40,0" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="5" cy="5" r="3.5" fill={color} /><circle cx="5" cy="5" r="1.5" fill="#08060c" />
      <path d="M1000,23 L1000,5 Q1000,0 995,0 L960,0" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="995" cy="5" r="3.5" fill={color} /><circle cx="995" cy="5" r="1.5" fill="#08060c" />
    </svg>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hud/
git commit -m "feat: add V2 HUD CSS and reusable ornate SVG components"
```

---

## Task 7: HUD Components — Portraits, Session Log, Action Area

**Files:**
- Create: `src/hud/PartyPortraits.jsx`
- Create: `src/hud/SessionLog.jsx`
- Create: `src/hud/ActionArea.jsx`
- Create: `src/hud/ZoneLabel.jsx`
- Create: `src/hud/NarratorFloat.jsx`

- [ ] **Step 1: Create PartyPortraits**

Create `src/hud/PartyPortraits.jsx` — renders up to 6 ornate portrait frames from `myCharacter` + `partyMembers` in the Zustand store. Each portrait: 58x72px, SVG frame overlay (OrnateFrame), HP bar, level badge, class-colored active indicator, name in Cinzel Decorative. Active player gets crown flourish + blue top line.

Key details:
- Read `myCharacter` and `partyMembers` from `useStore`
- Class color map: `{ Fighter: '#4499dd', Sorcerer: '#aa55bb', Cleric: '#44aa66', Rogue: '#cc7722', ... }`
- HP bar width = `(currentHp / maxHp) * 100%`, color shifts from green → orange → red
- Portrait center is a colored div with class emoji (placeholder until AI portraits)

- [ ] **Step 2: Create SessionLog**

Create `src/hud/SessionLog.jsx` — reads `sessionLog[]` from the Zustand store. Two tabs: LOG and CHAT. Log entries rendered as monospace colored spans matching the approved format: `[time] [Player] [action] [target]`. Auto-scrolls to bottom on new entry.

Key details:
- Read `sessionLog` and `narrator.history` from `useStore`
- LOG tab = sessionLog entries
- CHAT tab = narrator.history entries
- Use `useRef` for scroll container, `useEffect` to scroll on length change

- [ ] **Step 3: Create ActionArea**

Create `src/hud/ActionArea.jsx` — tool buttons (Dice, Character Sheet, Inventory, Rest, Settings) with ornate SVG corner brackets + chat input with mic and send buttons. Passes callbacks up for tool panel opening and narrator input.

- [ ] **Step 4: Create ZoneLabel**

Create `src/hud/ZoneLabel.jsx` — reads zone name from props/store. Ornate double-framed box with OrnateFrame corners + scrollwork SVG on top/bottom edges.

- [ ] **Step 5: Create NarratorFloat**

Create `src/hud/NarratorFloat.jsx` — floating DM speech positioned above the bottom bar. Reads last DM message from `narrator.history`. Ornate side flourishes (vine SVGs) + corner brackets.

- [ ] **Step 6: Commit**

```bash
git add src/hud/PartyPortraits.jsx src/hud/SessionLog.jsx src/hud/ActionArea.jsx src/hud/ZoneLabel.jsx src/hud/NarratorFloat.jsx
git commit -m "feat: add HUD components — portraits, session log, actions, zone label, narrator"
```

---

## Task 8: Bottom Bar + GameHUD Assembly

**Files:**
- Create: `src/hud/BottomBar.jsx`
- Create: `src/hud/GameHUD.jsx`

- [ ] **Step 1: Create BottomBar**

Create `src/hud/BottomBar.jsx` — assembles the ornate bottom bar: FiligreeBar on top, then horizontal layout of PartyPortraits | OrnateDivider | SessionLog | OrnateDivider | ActionArea. Bottom edge ornament SVG.

- [ ] **Step 2: Create GameHUD**

Create `src/hud/GameHUD.jsx` — top-level HUD overlay. Positions: ZoneLabel (top-left), NarratorFloat (bottom of map area), BottomBar (bottom). Wraps everything in `className="hud-v2"`.

- [ ] **Step 3: Commit**

```bash
git add src/hud/BottomBar.jsx src/hud/GameHUD.jsx
git commit -m "feat: assemble bottom bar and top-level GameHUD"
```

---

## Task 9: GameV2 — Integrate PixiJS + HUD

**Files:**
- Create: `src/GameV2.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create GameV2 component**

Create `src/GameV2.jsx` — the new game screen. Renders PixiApp (fullscreen canvas) + GameHUD (React overlay) side by side. Loads demoZone.json as the zone data. Handles tile clicks (pathfinding + token movement).

```jsx
import { useState, useCallback } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoZone from './data/demoZone.json'
import './hud/hud.css'

export default function GameV2() {
  const [zone] = useState(demoZone)

  const handleTileClick = useCallback(({ x, y }) => {
    // TODO: pathfind and move player token
    console.log('Tile clicked:', x, y)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp zone={zone} onTileClick={handleTileClick} />
      <GameHUD zone={zone} />
    </div>
  )
}
```

- [ ] **Step 2: Add V2 route/toggle in App.jsx**

Add a way to access GameV2 without breaking V1. Simplest approach: URL parameter `?v2=1` or a toggle button on the campaign screen.

In App.jsx, add:
```jsx
import GameV2 from './GameV2'

// In the render logic, check for v2 mode:
// Check for v2 flag — persist to localStorage since App.jsx strips query params on auth redirect
if (new URLSearchParams(window.location.search).has('v2')) {
  localStorage.setItem('useV2', '1')
}
const useV2 = localStorage.getItem('useV2') === '1'

// Where GameLayout is rendered, add:
// {useV2 ? <GameV2 /> : <GameLayout ... />}
// To exit V2 mode: localStorage.removeItem('useV2')
```

This keeps V1 as default, V2 accessible via `?v2` for testing.

- [ ] **Step 3: Test in browser**

Run: `npm run dev`
Navigate to: `http://localhost:5173/?v2`
Expected: Colored rectangle tiles rendering the demo inn zone, gold grid overlay, ornate bottom bar with portrait frames, session log, tool buttons. Zone label says "THE WEARY TRAVELER INN".

- [ ] **Step 4: Commit**

```bash
git add src/GameV2.jsx src/App.jsx
git commit -m "feat: integrate PixiJS canvas + ornate HUD into GameV2 (opt-in via ?v2)"
```

---

## Task 10: Token Rendering + Click-to-Move

**Files:**
- Create: `src/engine/TokenLayer.js`
- Modify: `src/engine/PixiApp.jsx`
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Create token renderer**

Create `src/engine/TokenLayer.js` — renders player and NPC tokens as colored circles with borders and name labels on the PixiJS stage. Takes an array of token objects `{ id, name, x, y, color, borderColor, isNpc, questRelevant }`.

Key details:
- Each token is a PIXI.Container with: circle background, colored border (Graphics), name text (BitmapText or Text)
- NPC tokens get gold border if questRelevant, grey otherwise
- Player tokens get class-colored border
- Quest NPCs get a `!` indicator circle

- [ ] **Step 2: Wire tokens into PixiApp**

Update `src/engine/PixiApp.jsx` to accept a `tokens` prop and render them into the tokens layer. Re-render when tokens change.

- [ ] **Step 3: Wire click-to-move in GameV2**

Update `src/GameV2.jsx`:
- Build walkability grid from zone data on mount
- On tile click: run `findPath` from player position to clicked tile
- If path found: animate token along path (update position each frame)
- Update player position in state

- [ ] **Step 4: Test in browser**

Navigate to: `http://localhost:5173/?v2`
Expected: Player token visible on map. Click a floor tile → token moves to it. NPC tokens visible (Greta with gold border + `!`, Old Durnan with grey border).

- [ ] **Step 5: Commit**

```bash
git add src/engine/TokenLayer.js src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: add token rendering and click-to-move pathfinding"
```

---

## Task 11: Exit Zone Rendering

**Files:**
- Create: `src/engine/ExitZone.js`
- Modify: `src/engine/PixiApp.jsx`

- [ ] **Step 1: Create exit zone renderer**

Create `src/engine/ExitZone.js` — renders exit/door highlights on the tilemap. Each exit gets a golden-bordered rectangle spanning its tiles, with a destination label. On hover (pointerover), glows brighter.

- [ ] **Step 2: Wire exits into PixiApp**

Read zone.exits, render exit zones in the exits layer.

- [ ] **Step 3: Test in browser**

Expected: Golden "→ Town Square" label visible at the bottom door of the inn. Hovering brightens the glow.

- [ ] **Step 4: Commit**

```bash
git add src/engine/ExitZone.js src/engine/PixiApp.jsx
git commit -m "feat: add exit zone rendering with hover highlights"
```

---

## Task 12: Wire HUD to Zustand Store

**Files:**
- Modify: `src/hud/PartyPortraits.jsx`
- Modify: `src/hud/SessionLog.jsx`
- Modify: `src/hud/NarratorFloat.jsx`
- Modify: `src/hud/ActionArea.jsx`

- [ ] **Step 1: Connect portraits to real character data**

Wire PartyPortraits to read `myCharacter` and `partyMembers` from the Zustand store. Display real HP, level, class info.

- [ ] **Step 2: Connect session log to real log data**

Wire SessionLog to read `sessionLog` for LOG tab and `narrator.history` for CHAT tab.

- [ ] **Step 3: Connect narrator float**

Wire NarratorFloat to read the last DM message from `narrator.history`.

- [ ] **Step 4: Connect action area callbacks**

Wire ActionArea tool buttons to open existing modals (DiceTray, CharacterSheetModal, etc.) and chat input to call the existing narrator API.

- [ ] **Step 5: Test with real game data**

Load a campaign normally, then switch to `?v2`. Verify portraits show real characters, log shows real events, narrator shows real DM messages.

- [ ] **Step 6: Commit**

```bash
git add src/hud/
git commit -m "feat: wire HUD components to Zustand store for live data"
```

---

## Phase 1 Complete Checkpoint

At this point you should have:
- PixiJS canvas rendering a demo zone tilemap with colored tiles
- Grid overlay (gold lines)
- Player + NPC tokens (colored circles, click-to-move with A* pathfinding)
- Exit zones with hover highlights
- Ornate bottom bar (portraits, session log, tool buttons, chat input)
- Zone label + narrator float
- All ornate SVG filigree (corners, dividers, top border, scrollwork)
- V1 game fully preserved, V2 opt-in via `?v2`
- Vitest setup with pathfinding tests

**Next:** Phase 2 plan (zone graph, transitions, campaign generation) builds on this foundation.
