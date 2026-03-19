# Phase 5b: Procedural Area System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the zone graph system with a unified procedural area system where every map is an area — a large tilemap with camera pan/zoom, palette-indexed layers, and AI-driven layout generation.

**Architecture:** Areas replace zones entirely. AI outputs creative briefs (POI types, positions, NPCs, theme). `buildAreaFromBrief()` handles all tile-level work using the existing chunk library + map generator. Starting area built at campaign creation; subsequent areas generated on-demand with exit-proximity pre-generation.

**Tech Stack:** React + Vite, Zustand, Supabase (campaign_data JSON), PixiJS (V2 renderer), existing chunk/tilemap pipeline.

**Spec:** `docs/superpowers/specs/2026-03-19-phase5b-procedural-areas-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/areaBuilder.js` | `buildAreaFromBrief()` pipeline, theme mappings, NPC/exit placement |
| `src/lib/areaStorage.js` | Layer encode/decode (base64), Supabase save/load areas |
| `src/data/demoArea.js` | Demo area brief + build (replaces `demoWorld.json`) |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/mapGenerator.js` | Add `buildUnifiedPalette()`, `remapChunk()` exports; change `resolvePositions` to key by `label` |
| `src/lib/campaignGenerator.js` | Replace `buildWorldFromAiOutput`/`mergeZoneWithTemplate` with `buildAreaWorld()` outputting area briefs |
| `src/lib/liveChannel.js` | Add `broadcastAreaTransition`, `broadcastTokenMove`, `broadcastFogUpdate`, `broadcastRoofState` |
| `src/store/useStore.js` | Remove zone state, add `areaBriefs`, wire area loading/transition actions |
| `src/GameV2.jsx` | Area loading, transitions, exit-proximity pre-generation; remove zone loading |
| `src/engine/PixiApp.jsx` | Remove V1 rendering path |
| `src/data/testArea.js` | Refactor to use shared `buildUnifiedPalette`/`remapChunk` from mapGenerator |

### Deleted Files
| File | Reason |
|------|--------|
| `src/data/demoWorld.json` | Replaced by `demoArea.js` |
| `src/data/roomTemplates/*.json` + `index.js` | Replaced by chunk system |

---

## Task 1: Extract Palette Utilities to mapGenerator.js

**Context:** `testArea.js` already has working `buildUnifiedPalette()` and `remapChunk()` functions. Extract them to `mapGenerator.js` so `areaBuilder.js` can reuse them. Also fix `resolvePositions()` to key results by `poi.label` instead of `poi.id` (per spec).

**Files:**
- Modify: `src/lib/mapGenerator.js`
- Modify: `src/data/testArea.js`

- [ ] **Step 1: Add `buildUnifiedPalette` and `remapChunk` to mapGenerator.js**

Add these two functions after the existing `fillTerrain` export at the bottom of `src/lib/mapGenerator.js`:

```javascript
/**
 * Build a unified palette from multiple chunks, deduplicating tile IDs.
 * Index 0 is always '' (empty).
 * @param {Array} chunks — array of chunk objects with .palette arrays
 * @param {string[]} extraTileIds — additional tile IDs to include (e.g., road, terrain)
 * @returns {{ palette: string[], tileToIndex: Map<string, number> }}
 */
export function buildUnifiedPalette(chunks, extraTileIds = []) {
  const palette = ['']
  const tileToIndex = new Map([['', 0]])

  for (const chunk of chunks) {
    for (const tileId of chunk.palette) {
      if (tileId && !tileToIndex.has(tileId)) {
        tileToIndex.set(tileId, palette.length)
        palette.push(tileId)
      }
    }
  }

  for (const tileId of extraTileIds) {
    if (tileId && !tileToIndex.has(tileId)) {
      tileToIndex.set(tileId, palette.length)
      palette.push(tileId)
    }
  }

  return { palette, tileToIndex }
}

/**
 * Remap a chunk's layer indices from its local palette to a unified palette.
 * @param {object} chunk — chunk with .palette and .layers
 * @param {Map<string, number>} tileToIndex — unified palette lookup
 * @returns {object} new chunk object with remapped layer data
 */
export function remapChunk(chunk, tileToIndex) {
  const remapped = { ...chunk, layers: {} }
  for (const [layerName, data] of Object.entries(chunk.layers)) {
    remapped.layers[layerName] = data.map(localIdx => {
      if (localIdx === 0) return 0
      const tileId = chunk.palette[localIdx]
      return tileToIndex.get(tileId) || 0
    })
  }
  return remapped
}
```

- [ ] **Step 2: Fix `resolvePositions` to key by `label` instead of `id`**

In `src/lib/mapGenerator.js`, change line 46 inside `resolvePositions()`:

```javascript
// BEFORE:
result[poi.id] = { x, y }

// AFTER:
result[poi.label || poi.id] = { x, y }
```

This is backward-compatible — falls back to `poi.id` if no label (for testArea usage).

- [ ] **Step 3: Update testArea.js to import shared utilities**

Replace the local `buildUnifiedPalette` and `remapChunk` functions in `src/data/testArea.js` with imports from mapGenerator:

```javascript
// BEFORE (lines 1-3):
import allChunks from './chunks/index.js'
import { ChunkLibrary } from '../lib/chunkLibrary.js'
import { stampChunk, connectWithRoad, fillTerrain } from '../lib/mapGenerator.js'

// AFTER:
import allChunks from './chunks/index.js'
import { ChunkLibrary } from '../lib/chunkLibrary.js'
import { stampChunk, connectWithRoad, fillTerrain, buildUnifiedPalette, remapChunk } from '../lib/mapGenerator.js'
```

Delete the local `buildUnifiedPalette` function (lines 12-25) and `remapChunk` function (lines 30-40) from testArea.js.

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: Build completes with no errors. testArea.js still works identically.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapGenerator.js src/data/testArea.js
git commit -m "refactor: extract buildUnifiedPalette and remapChunk to mapGenerator, key resolvePositions by label"
```

---

## Task 2: Create areaBuilder.js

**Context:** This is the core build pipeline. Takes a creative brief (from AI) and produces a complete area object with encoded layers. Uses existing `mapGenerator.js` functions, `chunkLibrary.js`, and `pathfinding.js`.

**Files:**
- Create: `src/lib/areaBuilder.js`

- [ ] **Step 1: Create the file with theme constants and buildAreaFromBrief**

Create `src/lib/areaBuilder.js`:

```javascript
import { ChunkLibrary } from './chunkLibrary.js'
import allChunks from '../data/chunks/index.js'
import {
  resolvePositions, stampChunk, connectWithRoad,
  fillTerrain, buildUnifiedPalette, remapChunk,
} from './mapGenerator.js'
import { buildCollisionLayer } from './pathfinding.js'

/* ── Theme constants ──────────────────────────────────────────── */

export const THEME_TERRAIN = {
  village: ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01', 'atlas-floors:grass_overlay_medium_c_01'],
  forest:  ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01'],
  dungeon: ['atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2', 'atlas-floors:brick_floor_04_d1'],
  cave:    ['atlas-floors:brick_floor_03_d3', 'atlas-floors:brick_floor_03_d4'],
  town:    ['atlas-floors:brick_floor_01_d1', 'atlas-floors:brick_floor_01_d2'],
}

export const THEME_ROAD = {
  village: 'atlas-floors:brick_floor_01_d1',
  forest:  'atlas-floors:brick_floor_02_d1',
  dungeon: 'atlas-floors:brick_floor_03_d1',
  cave:    'atlas-floors:brick_floor_04_d1',
  town:    'atlas-floors:brick_floor_01_d3',
}

/* ── Shared chunk library singleton ──────────────────────────── */

let _lib = null
function getChunkLibrary() {
  if (!_lib) {
    _lib = new ChunkLibrary()
    _lib.loadAll(allChunks)
  }
  return _lib
}

/* ── Build pipeline ──────────────────────────────────────────── */

/**
 * Build a complete area object from an AI creative brief.
 * @param {object} brief — { id, name, width, height, theme, pois, connections, npcs, exits }
 * @param {number} [seed] — optional seed for deterministic layout
 * @returns {object} complete area object ready for rendering/storage
 */
export function buildAreaFromBrief(brief, seed = Date.now()) {
  const { id, name, width, height, theme = 'village', pois = [], connections = [], npcs = [], exits = [] } = brief
  const lib = getChunkLibrary()

  // 1. Match chunks for each POI
  const matchedPois = []
  for (const poi of pois) {
    const chunk = lib.get(poi.type) || lib.findBest(poi.type, poi.tags || [])
    if (!chunk) {
      console.warn(`[areaBuilder] No chunk found for POI type "${poi.type}" (label: "${poi.label}"), skipping`)
      continue
    }
    matchedPois.push({ ...poi, chunk, width: chunk.width, height: chunk.height })
  }

  // 2. Resolve positions (keyed by label)
  const positions = resolvePositions(matchedPois, width, height, seed)

  // 3. Build unified palette from all matched chunks + theme tiles
  const terrainTiles = THEME_TERRAIN[theme] || THEME_TERRAIN.village
  const roadTile = THEME_ROAD[theme] || THEME_ROAD.village
  const extraTiles = [...terrainTiles, roadTile]
  const matchedChunks = matchedPois.map(p => p.chunk)
  const { palette, tileToIndex } = buildUnifiedPalette(matchedChunks, extraTiles)

  // 4. Create empty layers
  const size = width * height
  const layers = {
    floor: new Uint16Array(size),
    walls: new Uint16Array(size),
    props: new Uint16Array(size),
    roof:  new Uint16Array(size),
  }

  // 5. Remap & stamp chunks, collect buildings
  const buildings = []
  for (const poi of matchedPois) {
    const pos = positions[poi.label || poi.id]
    if (!pos) continue
    const remapped = remapChunk(poi.chunk, tileToIndex)
    stampChunk(layers, remapped, pos.x, pos.y, width)

    if (poi.chunk.type === 'building') {
      buildings.push({
        id: poi.label || poi.id,
        x: pos.x,
        y: pos.y,
        width: poi.chunk.width,
        height: poi.chunk.height,
        roofTile: 'atlas-floors:roof_texture_hay_01_a1',
      })
    }
  }

  // 6. Connect POIs with roads
  const roadIdx = tileToIndex.get(roadTile)
  for (const conn of connections) {
    const fromPos = positions[conn.from]
    const toPos = positions[conn.to]
    if (!fromPos || !toPos) continue
    const fromChunk = matchedPois.find(p => (p.label || p.id) === conn.from)
    const toChunk = matchedPois.find(p => (p.label || p.id) === conn.to)
    // Connect from bottom-center of source to bottom-center of target
    const fromPt = {
      x: fromPos.x + Math.floor((fromChunk?.chunk.width || 6) / 2),
      y: fromPos.y + (fromChunk?.chunk.height || 6) - 1,
    }
    const toPt = {
      x: toPos.x + Math.floor((toChunk?.chunk.width || 6) / 2),
      y: toPos.y + (toChunk?.chunk.height || 6) - 1,
    }
    connectWithRoad(layers.floor, roadIdx, fromPt, toPt, 2, width)
  }

  // 7. Fill terrain
  const terrainIndices = terrainTiles.map(id => tileToIndex.get(id))
  fillTerrain(layers.floor, terrainIndices, width, height, seed)

  // 8. Build collision layer (doors walkable, walls/props block)
  const DOOR_TILES = new Set(
    palette.filter(id => id.includes('door')).map((_, i) => i).filter(i => i > 0)
  )
  const blockingSet = new Set()
  // Mark all non-zero wall palette indices as blocking, except doors
  for (let i = 1; i < palette.length; i++) {
    if (palette[i].includes('door')) continue
    // We'll check at runtime which indices appear in walls layer
  }
  // Build collision directly: wall tiles block, door tiles don't
  const collision = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const wallIdx = layers.walls[i]
    if (wallIdx === 0) continue
    const tileId = palette[wallIdx] || ''
    if (tileId.includes('door')) continue
    collision[i] = 1
  }

  // 9. Place NPCs
  const placedNpcs = []
  for (const npc of npcs) {
    const poiLabel = npc.position // POI label where NPC should be placed
    const pos = positions[poiLabel]
    if (!pos) {
      console.warn(`[areaBuilder] NPC "${npc.name}" references unknown POI "${poiLabel}", placing at center`)
      placedNpcs.push({
        id: npc.name.toLowerCase().replace(/\s+/g, '_'),
        name: npc.name,
        personality: npc.personality || '',
        position: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
        questRelevant: npc.questRelevant || false,
      })
      continue
    }
    const matchedPoi = matchedPois.find(p => (p.label || p.id) === poiLabel)
    const chunkW = matchedPoi?.chunk.width || 6
    const chunkH = matchedPoi?.chunk.height || 6
    // Place at center of chunk interior (offset 2 from walls)
    const npcX = pos.x + Math.floor(chunkW / 2)
    const npcY = pos.y + Math.floor(chunkH / 2)
    placedNpcs.push({
      id: npc.name.toLowerCase().replace(/\s+/g, '_'),
      name: npc.name,
      personality: npc.personality || '',
      position: { x: npcX, y: npcY },
      questRelevant: npc.questRelevant || false,
    })
  }

  // 9. Place exits
  const placedExits = []
  for (const exit of exits) {
    const exitW = exit.width || 3
    const exitH = exit.height || 3
    let x, y, ew, eh, entryPoint
    switch (exit.edge) {
      case 'north':
        x = Math.floor((width - exitW) / 2); y = 0; ew = exitW; eh = 1
        entryPoint = { x, y: (exit.targetHeight || height) - 2 }
        break
      case 'south':
        x = Math.floor((width - exitW) / 2); y = height - 1; ew = exitW; eh = 1
        entryPoint = { x, y: 1 }
        break
      case 'east':
        x = width - 1; y = Math.floor((height - exitH) / 2); ew = 1; eh = exitH
        entryPoint = { x: 1, y }
        break
      case 'west':
        x = 0; y = Math.floor((height - exitH) / 2); ew = 1; eh = exitH
        entryPoint = { x: (exit.targetWidth || width) - 2, y }
        break
      default:
        console.warn(`[areaBuilder] Unknown exit edge "${exit.edge}", skipping`)
        continue
    }
    placedExits.push({
      x, y, width: ew, height: eh,
      targetArea: exit.targetArea,
      entryPoint,
      label: exit.label || '',
    })
  }

  // 10. Determine player start — first exit entry point or center
  const playerStart = brief.playerStart || (placedExits.length > 0
    ? { x: placedExits[0].x, y: placedExits[0].y === 0 ? 1 : placedExits[0].y }
    : { x: Math.floor(width / 2), y: Math.floor(height / 2) })

  // Note: layers are returned as raw Uint16Arrays for immediate rendering.
  // Encoding to base64 happens at storage time via areaStorage.encodeLayers().
  return {
    id,
    name,
    width,
    height,
    tileSize: 200,
    palette,
    layers,       // raw Uint16Arrays — encoded to base64 only when saving to Supabase
    collision,    // Uint8Array — regenerated on load, not stored
    playerStart,
    npcs: placedNpcs,
    buildings,
    exits: placedExits,
    theme,
    generated: true,
  }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes. `areaBuilder.js` is importable but not yet used by any component.

- [ ] **Step 3: Commit**

```bash
git add src/lib/areaBuilder.js
git commit -m "feat: add areaBuilder.js with buildAreaFromBrief pipeline"
```

---

## Task 3: Create areaStorage.js

**Context:** Handles encoding area layers to base64 strings for Supabase JSON storage, and decoding them back for rendering. Also provides save/load/remove helpers for Supabase.

**Files:**
- Create: `src/lib/areaStorage.js`

**Reference:** `src/lib/rleCodec.js` has `rleEncode`, `rleDecode`, `rleToBlob`, `blobToRle`.

- [ ] **Step 1: Create areaStorage.js**

```javascript
import { rleEncode, rleDecode, rleToBlob, blobToRle } from './rleCodec.js'
import { supabase } from './supabase'

/* ── Layer Encoding ───────────────────────────────────────────── */

/**
 * Encode a flat Uint16Array layer to a base64 string for JSON storage.
 * Pipeline: Uint16Array → rleEncode → rleToBlob → base64
 */
export function encodeLayer(layer) {
  const encoded = rleEncode(layer)
  const blob = rleToBlob(encoded)
  const bytes = new Uint8Array(blob)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decode a base64 string back to a flat Uint16Array.
 * Pipeline: base64 → ArrayBuffer → blobToRle → rleDecode
 */
export function decodeLayer(base64Str, expectedLength) {
  const binary = atob(base64Str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const encoded = blobToRle(bytes.buffer)
  return rleDecode(encoded, expectedLength)
}

/**
 * Encode all layers of an area for storage.
 * @param {object} layers — { floor, walls, props, roof } as Uint16Arrays
 * @returns {object} — { floor, walls, props, roof } as base64 strings
 */
export function encodeLayers(layers) {
  const result = {}
  for (const [name, data] of Object.entries(layers)) {
    result[name] = encodeLayer(data)
  }
  return result
}

/**
 * Decode all layers from storage.
 * @param {object} encodedLayers — { floor, walls, props, roof } as base64 strings
 * @param {number} expectedLength — width * height
 * @returns {object} — { floor, walls, props, roof } as Uint16Arrays
 */
export function decodeLayers(encodedLayers, expectedLength) {
  const result = {}
  for (const [name, data] of Object.entries(encodedLayers)) {
    result[name] = typeof data === 'string'
      ? decodeLayer(data, expectedLength)
      : data // already decoded (Uint16Array)
  }
  return result
}

/* ── Supabase Persistence ─────────────────────────────────────── */

/**
 * Save a built area to Supabase campaign_data.areas[areaId].
 * Encodes layers to base64 before saving.
 */
export async function saveArea(campaignId, area) {
  // Encode layers for storage
  const storageArea = {
    ...area,
    layers: encodeLayers(area.layers),
  }

  // Read current campaign_data, merge area, write back
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const campaignData = campaign?.campaign_data || {}
  const areas = campaignData.areas || {}
  areas[area.id] = storageArea

  await supabase
    .from('campaigns')
    .update({ campaign_data: { ...campaignData, areas } })
    .eq('id', campaignId)
}

/**
 * Load an area from Supabase, decode layers.
 */
export async function loadArea(campaignId, areaId) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const area = campaign?.campaign_data?.areas?.[areaId]
  if (!area) return null

  const expectedLength = area.width * area.height
  return {
    ...area,
    layers: decodeLayers(area.layers, expectedLength),
  }
}

/**
 * Remove a brief from areaBriefs after building.
 */
export async function removeBrief(campaignId, briefId) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const campaignData = campaign?.campaign_data || {}
  const briefs = { ...campaignData.areaBriefs }
  delete briefs[briefId]

  await supabase
    .from('campaigns')
    .update({ campaign_data: { ...campaignData, areaBriefs: briefs } })
    .eq('id', campaignId)
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes. Ensure `src/lib/supabase.js` exists and exports `supabase`. If not, check the actual import path used in other files (may be `supabaseClient.js` or similar) and adjust the import.

- [ ] **Step 3: Commit**

```bash
git add src/lib/areaStorage.js
git commit -m "feat: add areaStorage.js with layer encoding and Supabase persistence"
```

---

## Task 4: Create demoArea.js and Update testArea.js

**Context:** Replace `demoWorld.json` (zone-based demo) with `demoArea.js` that builds a demo area from a brief using `buildAreaFromBrief`. Also simplify `testArea.js` to use the shared utilities.

**Files:**
- Create: `src/data/demoArea.js`
- Modify: `src/data/testArea.js`

- [ ] **Step 1: Create demoArea.js**

```javascript
import { buildAreaFromBrief } from '../lib/areaBuilder.js'

/**
 * Demo area brief — a small village with tavern, house, and clearing.
 * This replaces demoWorld.json for the default game experience.
 */
const DEMO_BRIEF = {
  id: 'area-village',
  name: 'Millhaven Village',
  width: 40,
  height: 30,
  theme: 'village',
  pois: [
    { type: 'tavern_main', position: 'center-west', label: 'The Weary Traveler' },
    { type: 'house_small', position: 'center-east', label: 'Elder\'s House' },
    { type: 'clearing_grass', position: 'south-center', label: 'Town Square' },
  ],
  connections: [
    { from: 'The Weary Traveler', to: 'Town Square' },
    { from: 'Elder\'s House', to: 'Town Square' },
  ],
  npcs: [
    { name: 'Barkeep Hilda', position: 'The Weary Traveler', personality: 'Gruff but kind tavern owner who hears all the gossip', questRelevant: true },
    { name: 'Elder Maren', position: 'Elder\'s House', personality: 'Wise village elder who knows the old stories', questRelevant: true },
  ],
  exits: [
    { edge: 'north', targetArea: 'area-forest', label: 'Forest Path' },
  ],
  playerStart: { x: 20, y: 20 },
}

/**
 * Build the demo area. Call once at startup if no campaign is loaded.
 */
export function buildDemoArea() {
  return buildAreaFromBrief(DEMO_BRIEF, 42)
}

export { DEMO_BRIEF }
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/demoArea.js
git commit -m "feat: add demoArea.js with village brief replacing demoWorld.json"
```

---

## Task 5: Rewrite campaignGenerator.js

**Context:** Currently outputs zone graphs via `buildWorldFromAiOutput()` and `mergeZoneWithTemplate()`. Replace with `buildAreaWorld()` that takes AI-generated area briefs and builds only the starting area, keeping the rest as briefs for on-demand generation.

**Files:**
- Modify: `src/lib/campaignGenerator.js`

**Reference:** Current file is 71 lines. Full rewrite — this removes the `roomTemplates` import that the old code had.

- [ ] **Step 1: Rewrite campaignGenerator.js**

Replace entire contents of `src/lib/campaignGenerator.js`:

```javascript
import { buildAreaFromBrief } from './areaBuilder.js'

/**
 * Convert AI-generated campaign output into the final campaign data structure.
 * Builds only the starting area; remaining areas stay as briefs for on-demand generation.
 *
 * @param {object} aiOutput — AI-generated campaign:
 *   { title, startArea, areaBriefs: { [areaId]: brief }, questObjectives, storyMilestones }
 * @returns {object} campaign data with built starting area + remaining briefs
 */
export function buildAreaWorld(aiOutput) {
  const {
    title = 'Untitled Campaign',
    startArea,
    areaBriefs = {},
    questObjectives = [],
    storyMilestones = [],
  } = aiOutput

  // Validate we have a starting area
  const startBrief = areaBriefs[startArea]
  if (!startBrief) {
    console.error(`[campaignGenerator] No brief found for startArea "${startArea}"`)
    return { title, startArea: null, areas: {}, areaBriefs, questObjectives, storyMilestones }
  }

  // Build the starting area from its brief
  const builtStartArea = buildAreaFromBrief(startBrief, 42)

  // Keep remaining briefs for on-demand generation
  const remainingBriefs = { ...areaBriefs }
  delete remainingBriefs[startArea]

  return {
    title,
    startArea,
    areas: { [startArea]: builtStartArea },
    areaBriefs: remainingBriefs,
    questObjectives,
    storyMilestones,
  }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes. There will be import errors in files that still reference `buildWorldFromAiOutput` or `mergeZoneWithTemplate` — these are resolved in Task 8 (GameV2 update).

- [ ] **Step 3: Commit**

```bash
git add src/lib/campaignGenerator.js
git commit -m "feat: rewrite campaignGenerator to output area briefs instead of zone graphs"
```

---

## Task 6: Add Area Broadcasts to liveChannel.js

**Context:** `liveChannel.js` has 20 broadcast functions using the pattern `_channel?.send({ type: 'broadcast', event: '...', payload: {...} })`. Add 4 new area-specific broadcasts per spec. Keep existing `broadcastZoneTransition` for now (removed in Task 8 cleanup).

**Files:**
- Modify: `src/lib/liveChannel.js`

- [ ] **Step 1: Add area broadcast functions**

Add these 4 functions at the end of `src/lib/liveChannel.js`, before the closing of the file:

```javascript
/* ── Area broadcasts ──────────────────────────────────────────── */

export function broadcastAreaTransition(areaId, entryPoint) {
  _channel?.send({
    type: 'broadcast',
    event: 'area-transition',
    payload: { areaId, entryPoint },
  })
}

export function broadcastTokenMove(playerId, position) {
  _channel?.send({
    type: 'broadcast',
    event: 'token-move',
    payload: { playerId, position },
  })
}

export function broadcastFogUpdate(areaId, base64Bitfield) {
  _channel?.send({
    type: 'broadcast',
    event: 'fog-update',
    payload: { areaId, base64Bitfield },
  })
}

export function broadcastRoofState(buildingId, revealed) {
  _channel?.send({
    type: 'broadcast',
    event: 'roof-state',
    payload: { buildingId, revealed },
  })
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/liveChannel.js
git commit -m "feat: add area broadcast events (transition, token move, fog, roof)"
```

---

## Task 7: Update useStore.js — Remove Zone State, Wire Area State

**Context:** `useStore.js` (1676 lines) already has area state (`currentAreaId`, `areas`, `areaLayers`, etc. at lines ~1622-1671). It also has zone state (`currentZoneId`, `zones`, `visitedZones`, `zoneTokenPositions` at lines ~1588-1620) and `campaign.zones`. Remove zone state, add `areaBriefs` storage, and add area loading/transition actions.

**Files:**
- Modify: `src/store/useStore.js`

- [ ] **Step 1: Remove zone state and actions**

Delete these state properties and their setter functions from `useStore.js`:

```javascript
// DELETE all of these:
currentZoneId: null,
visitedZones: new Set(),
zoneTokenPositions: {},
pendingEntryPoint: null,

setCurrentZone: (zoneId, entryPoint) => set(state => ({...})),
clearPendingEntryPoint: () => set({ pendingEntryPoint: null }),
setZoneTokenPosition: (zoneId, memberId, pos) => set(state => ({...})),
loadZoneWorld: (world) => set(state => ({...})),
```

Also remove `zones: null` from the `campaign` object.

Before removing `campaign.zones`, search for all references:

```bash
grep -r "campaign\.zones\|campaign\?.zones" src/ --include="*.js" --include="*.jsx"
```

Update or remove any references found. Components that read `campaign.zones` for zone data should be updated to read from `areas` instead, or have the reference removed if they were zone-specific.

- [ ] **Step 2: Add areaBriefs state and actions**

Add these to the store alongside the existing area state:

```javascript
// Add to state (near existing area state):
areaBriefs: {},  // { areaId: brief } — unbuilt area briefs

// Add actions:
setAreaBriefs: (briefs) => set({ areaBriefs: briefs }),

loadAreaWorld: (world) => set(state => ({
  currentAreaId: world.startArea,
  areas: world.areas || {},
  areaBriefs: world.areaBriefs || {},
  campaign: {
    ...state.campaign,
    title: world.title || state.campaign.title,
    questObjectives: world.questObjectives || [],
  },
})),

buildAndLoadArea: (areaId, builtArea) => set(state => {
  const newAreas = { ...state.areas, [areaId]: builtArea }
  const newBriefs = { ...state.areaBriefs }
  delete newBriefs[areaId]
  return { areas: newAreas, areaBriefs: newBriefs }
}),

// Activate an area: decompress layers and set as current rendering target
activateArea: (areaId) => set(state => {
  const area = state.areas[areaId]
  if (!area) return {}
  return {
    currentAreaId: areaId,
    areaLayers: area.layers,       // already Uint16Arrays if just built, or decoded if loaded
    areaCollision: area.collision || null,
    areaTilePalette: area.palette || [],
  }
}),
```

**Important:** After `loadAreaWorld` or `setCurrentArea`, always call `activateArea(areaId)` to decompress/wire layers into the rendering state. This bridges the gap between area storage (in `areas{}`) and rendering state (`areaLayers`, `areaCollision`, `areaTilePalette`).

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build may show warnings about removed references (files still using `loadZoneWorld`, `currentZoneId`, etc.). These are resolved in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.js
git commit -m "refactor: remove zone state from store, add areaBriefs and area loading actions"
```

---

## Task 8: Update GameV2.jsx — Area Loading, Transitions, Pre-generation

**Context:** `GameV2.jsx` (758 lines) currently loads zones from `demoWorld.json` or campaign data, builds walkability grids, and handles zone transitions. Replace all zone logic with area loading from `demoArea.js` or campaign data, area-based collision, exit-proximity pre-generation, and area transitions.

**Files:**
- Modify: `src/GameV2.jsx`

**Important:** This is the largest single task. The changes are surgical — replace zone-specific code blocks with area equivalents.

- [ ] **Step 1: Update imports**

Replace zone-related imports:

```javascript
// REMOVE these imports:
import { buildWorldFromAiOutput } from './lib/campaignGenerator.js'
import demoWorld from './data/demoWorld.json'

// ADD these imports:
import { buildAreaWorld } from './lib/campaignGenerator.js'
import { buildDemoArea } from './data/demoArea.js'
import { buildAreaFromBrief } from './lib/areaBuilder.js'
import { decodeLayers, saveArea } from './lib/areaStorage.js'
import { broadcastAreaTransition } from './lib/liveChannel.js'
```

Keep the `buildTestArea` import for `?testarea` URL param support.

- [ ] **Step 2: Replace zone loading with area loading**

Find the zone loading block (approximately lines 178-236) that calls `loadZoneWorld()`. Replace with area loading:

```javascript
// Replace zone loading logic with:
useEffect(() => {
  const params = new URLSearchParams(window.location.search)

  if (params.has('testarea')) {
    // Test area mode — build from chunks directly
    const area = buildTestArea()
    loadArea(area.id, area)
    activateArea(area.id)
    return
  }

  // Check for campaign areas
  const campaignData = campaign?.campaign_data || campaign
  if (campaignData?.areas || campaignData?.areaBriefs) {
    loadAreaWorld({
      title: campaignData.title,
      startArea: campaignData.startArea,
      areas: campaignData.areas || {},
      areaBriefs: campaignData.areaBriefs || {},
      questObjectives: campaignData.questObjectives || [],
    })
    // activateArea is called after loadAreaWorld sets currentAreaId
    // Use setTimeout to let state settle, or chain in a useEffect that watches currentAreaId
    return
  }

  // Fallback — build demo area
  const demoArea = buildDemoArea()
  loadArea(demoArea.id, demoArea)
  activateArea(demoArea.id)
}, [])
```

Update store destructuring to use area actions:

```javascript
const {
  currentAreaId, areas, areaBriefs,
  areaLayers, areaCollision, areaTilePalette,
  setCurrentArea, setAreaLayers, loadArea, loadAreaWorld, buildAndLoadArea, activateArea,
  // ... keep other non-zone state
} = useStore()
```

- [ ] **Step 3: Update zone reference to area**

Replace the `zone` variable derivation. Find where `zone = zones[currentZoneId]` or similar:

```javascript
// BEFORE:
const zone = campaign?.zones?.[currentZoneId]

// AFTER:
const area = areas[currentAreaId]
```

Then rename `zone` → `area` throughout the component, and `isV2Zone` → always true (all areas are V2).

- [ ] **Step 3b: Add auto-activation effect**

Add a useEffect that activates the current area whenever `currentAreaId` changes (handles the loadAreaWorld path where activateArea isn't called directly):

```javascript
useEffect(() => {
  if (currentAreaId && areas[currentAreaId] && !areaLayers) {
    activateArea(currentAreaId)
  }
}, [currentAreaId, areas, areaLayers])
```

- [ ] **Step 4: Update collision/walkData for areas only**

Replace the dual V1/V2 walkData useMemo with area-only collision:

```javascript
const collision = useMemo(() => {
  if (!area?.layers) return null
  const w = area.width, h = area.height
  const palette = area.palette || []
  const col = new Uint8Array(w * h)
  const wallLayer = area.layers.walls
  if (wallLayer) {
    for (let i = 0; i < wallLayer.length; i++) {
      const idx = wallLayer[i]
      if (idx === 0) continue
      const tileId = palette[idx] || ''
      if (tileId.includes('door')) continue
      col[i] = 1
    }
  }
  return col
}, [area])
```

Update pathfinding calls to always use `findPath(collision, area.width, area.height, start, end)` — remove `findPathLegacy` usage.

- [ ] **Step 5: Add exit-proximity pre-generation**

Add a useEffect that monitors player position relative to area exits:

```javascript
// Pre-generate areas when player approaches an exit
useEffect(() => {
  if (!area?.exits || !playerPos) return
  const PRE_GEN_DISTANCE = 5

  for (const exit of area.exits) {
    const dist = Math.abs(playerPos.x - exit.x) + Math.abs(playerPos.y - exit.y)
    if (dist > PRE_GEN_DISTANCE) continue
    if (!exit.targetArea) continue

    // Check if target area needs building
    if (areas[exit.targetArea]) continue // already built
    const brief = areaBriefs[exit.targetArea]
    if (!brief) continue // no brief available

    // Build the area and save to Supabase
    console.log(`[pre-gen] Building area "${exit.targetArea}" (player ${dist} tiles from exit)`)
    const builtArea = buildAreaFromBrief(brief)
    buildAndLoadArea(exit.targetArea, builtArea)
    // Persist to Supabase in background (non-blocking)
    if (campaignId) {
      saveArea(campaignId, builtArea).catch(err =>
        console.warn('[pre-gen] Failed to save area to Supabase:', err))
    }
  }
}, [playerPos, area?.exits, areas, areaBriefs])
```

- [ ] **Step 6: Replace zone transition with area transition**

Find `handleExitClick` or the zone transition handler. Replace with:

```javascript
function handleAreaTransition(exit) {
  const targetArea = areas[exit.targetArea]
  if (!targetArea) {
    // On-demand fallback — build from brief
    const brief = areaBriefs[exit.targetArea]
    if (!brief) {
      console.error(`[transition] No area or brief for "${exit.targetArea}"`)
      return
    }
    const builtArea = buildAreaFromBrief(brief)
    buildAndLoadArea(exit.targetArea, builtArea)
  }
  activateArea(exit.targetArea)
  const entry = exit.entryPoint || { x: 0, y: 0 }
  setPlayerPos(entry)
  broadcastAreaTransition(exit.targetArea, entry)
}
```

Wire this to exit tile clicks — when player clicks/walks onto an exit tile, call `handleAreaTransition(exit)`.

- [ ] **Step 7: Clean up V1 zone references**

Remove or guard any remaining references to:
- `currentZoneId`, `loadZoneWorld`, `setCurrentZone`
- `broadcastZoneTransition`
- `findPathLegacy`, `buildWalkabilityGrid`
- `demoWorld`
- `isV2Zone` checks (everything is V2 now)

Pass `tileSize={area?.tileSize || 200}` to chat bubbles and other components.

- [ ] **Step 8: Verify build succeeds**

Run: `npm run build`
Expected: Build completes with no errors. App loads with demo area.

- [ ] **Step 9: Verify in browser**

Run: `npm run dev`
- Default URL: Demo village area loads (tavern, house, clearing with roads and grass)
- `?testarea` URL: Test area loads as before
- WASD moves player token
- Arrow keys pan camera
- Scroll wheel zooms
- Spacebar recenters camera
- NPC chat bubbles display correctly

- [ ] **Step 10: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: replace zone loading with area system, add exit-proximity pre-generation"
```

---

## Task 9: Clean Up PixiApp.jsx — Remove V1 Rendering

**Context:** `PixiApp.jsx` (346 lines) has both V1 (`renderTilemap`, `clearTilemap`, `scaleWorldToFit`) and V2 rendering paths, gated by `isV2` check. Since all areas are V2, remove the V1 path entirely.

**Files:**
- Modify: `src/engine/PixiApp.jsx`

- [ ] **Step 1: Remove V1 rendering code**

Find and remove:
1. The `isV2` variable declaration (line ~37): `const isV2 = Boolean(zone?.palette)` — remove it
2. The V1 rendering block (lines ~182-206): the block that checks `!isV2 && !cameraRef.current` and calls `renderTilemap(floor/walls/props)`, `scaleWorldToFit(zone)`, `renderGrid()` — remove the entire block
3. Any `renderTilemap`, `clearTilemap`, `scaleWorldToFit` function definitions or imports — remove them
4. Update the V2 rendering block to not check `isV2` — it's now the only path

- [ ] **Step 2: Rename `zone` prop to `area` in PixiApp**

If PixiApp receives its data as a `zone` prop, rename it to `area` for clarity. Update all internal references.

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build completes.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: Area renders correctly. All tiles visible, camera works, tokens display.

- [ ] **Step 5: Commit**

```bash
git add src/engine/PixiApp.jsx
git commit -m "refactor: remove V1 rendering path from PixiApp, V2 only"
```

---

## Task 10: Delete Dead Files

**Context:** Remove files that are fully replaced by the new area system.

**Files:**
- Delete: `src/data/demoWorld.json`
- Delete: `src/data/roomTemplates/tavern_bar.json`
- Delete: `src/data/roomTemplates/tavern_kitchen.json`
- Delete: `src/data/roomTemplates/town_square.json`
- Delete: `src/data/roomTemplates/dungeon_room.json`
- Delete: `src/data/roomTemplates/forest_clearing.json`
- Delete: `src/data/roomTemplates/cave.json`
- Delete: `src/data/roomTemplates/dungeon_corridor.json`
- Delete: `src/data/roomTemplates/throne_room.json`
- Delete: `src/data/roomTemplates/index.js`

- [ ] **Step 1: Check for remaining imports of deleted files**

Search the codebase for any imports of:
- `demoWorld.json`
- `roomTemplates`

If any remain (other than what was already updated in Tasks 5/8), update or remove them.

- [ ] **Step 2: Delete the files**

```bash
rm src/data/demoWorld.json
rm -rf src/data/roomTemplates/
```

- [ ] **Step 3: Remove broadcastZoneTransition from liveChannel.js**

Now that GameV2 no longer calls it, remove the old `broadcastZoneTransition` function from `src/lib/liveChannel.js`. Search for any remaining callers first.

- [ ] **Step 4: Remove legacy pathfinding exports**

In `src/lib/pathfinding.js`, remove `buildWalkabilityGrid` and `findPathLegacy` if no remaining callers exist. Search first:

```bash
grep -r "findPathLegacy\|buildWalkabilityGrid" src/ --include="*.js" --include="*.jsx"
```

If no callers remain, delete those functions.

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build`
Expected: Clean build with no missing import errors.

- [ ] **Step 6: Verify in browser**

Run: `npm run dev`
Expected: Everything works as before. Demo area loads, test area loads with `?testarea`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete demoWorld.json, roomTemplates, and legacy zone code"
```

---

## Task 11: Wire Multiplayer Area Listeners

**Context:** The new area broadcasts (Task 6) need listeners on the receiving end. When a client receives `area-transition`, `token-move`, `fog-update`, or `roof-state` events, update the local store accordingly.

**Files:**
- Modify: `src/GameV2.jsx` (or wherever broadcast listeners are registered)

- [ ] **Step 1: Find existing broadcast listener setup**

Search for where `zone-transition` or other broadcast events are listened to. This is typically in a `useEffect` that subscribes to the Supabase Realtime channel.

- [ ] **Step 2: Add area event listeners**

In the broadcast listener setup, add handlers for the new events:

```javascript
// Inside the channel.on('broadcast', ...) handler:

if (event === 'area-transition') {
  const { areaId, entryPoint } = payload
  // Load area if not cached
  if (!areas[areaId]) {
    const brief = areaBriefs[areaId]
    if (brief) {
      const builtArea = buildAreaFromBrief(brief)
      buildAndLoadArea(areaId, builtArea)
    }
  }
  setCurrentArea(areaId)
  setPlayerPos(entryPoint)
}

if (event === 'token-move') {
  const { playerId, position } = payload
  setAreaTokenPosition(currentAreaId, playerId, position)
}

if (event === 'fog-update') {
  const { areaId, base64Bitfield } = payload
  updateFogBitfield(areaId, base64Bitfield)
}

if (event === 'roof-state') {
  const { buildingId, revealed } = payload
  setRoofState(buildingId, revealed)
}
```

Also remove the old `zone-transition` listener.

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build completes.

- [ ] **Step 4: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: wire multiplayer listeners for area transitions, token moves, fog, and roof state"
```

---

## Task 12: Update tasks/status.md

**Context:** Per CLAUDE.md, `tasks/status.md` tracks feature status. Update it to reflect the completed Phase 5b work.

**Files:**
- Modify: `tasks/status.md`

- [ ] **Step 1: Update status.md**

Add/update the Phase 5b section:
- Mark procedural area system as **complete**
- Mark zone graph system as **removed**
- Note: area pre-generation, AI briefs pipeline, multiplayer area sync all implemented

- [ ] **Step 2: Commit**

```bash
git add tasks/status.md
git commit -m "docs: update status.md with Phase 5b completion"
```
