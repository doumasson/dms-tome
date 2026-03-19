# Phase 5b: Procedural Area System — Design Spec

## Goal

Replace the zone graph system with a unified procedural area system. Every map is an area — a large tilemap with camera pan/zoom, palette-indexed layers, and AI-driven layout generation. Zones are removed entirely.

## Decisions

- **Areas replace zones** — one rendering path, one data model. Existing zone code deleted.
- **AI is architect, not bricklayer** — AI outputs creative briefs (POI types, positions, NPCs, theme). Map generator handles all tile-level work.
- **Hybrid generation** — Starting area pre-built at campaign creation. Subsequent areas generated on-demand as the story approaches transitions, pre-generated in the background when possible.
- **Shared area, independent cameras** — All players see the same map. Token positions sync via broadcast. Each player's camera (pan/zoom) is local-only, never broadcast.

---

## Data Model

### Area Object (stored in `campaign_data.areas`)

```json
{
  "id": "area-village",
  "name": "Thornwood Village",
  "width": 40,
  "height": 30,
  "tileSize": 200,
  "palette": ["", "atlas-floors:grass_overlay_medium_a_01", "..."],
  "layers": {
    "floor": "<base64 RLE-encoded Uint16Array>",
    "walls": "<base64 RLE-encoded Uint16Array>",
    "props": "<base64 RLE-encoded Uint16Array>",
    "roof": "<base64 RLE-encoded Uint16Array>"
  },
  "playerStart": { "x": 10, "y": 14 },
  "npcs": [
    {
      "id": "barkeep",
      "name": "Barkeep",
      "personality": "Gruff but kind tavern owner",
      "position": { "x": 7, "y": 8 },
      "questRelevant": true
    }
  ],
  "buildings": [
    { "id": "tavern", "x": 5, "y": 5, "width": 10, "height": 8, "roofTile": "atlas-floors:roof_texture_hay_01_a1" }
  ],
  "exits": [
    { "x": 20, "y": 0, "width": 3, "height": 1, "targetArea": "area-forest", "entryPoint": { "x": 20, "y": 28 }, "label": "Forest Path" }
  ],
  "theme": "village",
  "generated": true
}
```

### Campaign Data Structure

```json
{
  "title": "The Cursed Hollow",
  "startArea": "area-village",
  "areas": {
    "area-village": { "...built area object..." },
    "area-forest": { "...brief only, built on demand..." }
  },
  "questObjectives": ["..."],
  "storyMilestones": ["..."],
  "areaBriefs": {
    "area-forest": {
      "id": "area-forest",
      "name": "Thornwood Pass",
      "width": 40,
      "height": 30,
      "theme": "forest",
      "pois": [
        { "type": "clearing_grass", "position": "center", "label": "Clearing" },
        { "type": "house_small", "position": "north-west", "label": "Hermit's Hut" }
      ],
      "connections": [
        { "from": "Clearing", "to": "Hermit's Hut" }
      ],
      "npcs": [
        { "name": "Old Marren", "position": "Hermit's Hut", "personality": "Paranoid hermit" }
      ],
      "exits": [
        { "edge": "south", "targetArea": "area-village", "label": "Back to Village" }
      ]
    }
  }
}
```

The `areaBriefs` dictionary holds AI-generated creative briefs that haven't been built yet. When a brief is built into a full area, it moves from `areaBriefs` to `areas`.

### Layer Encoding

Layers are flat `Uint16Array` (length = width × height, row-major). For Supabase storage:
1. `rleEncode(layer)` → compressed Uint16Array
2. `rleToBlob(encoded)` → ArrayBuffer
3. Base64-encode the ArrayBuffer for JSON storage in `campaign_data`

On load: reverse the process → `rleDecode()` → flat Uint16Array → renderer.

### `areaStorage.js` Interface

```javascript
// Encode a flat Uint16Array layer for JSON storage
encodeLayer(layer: Uint16Array): string
// → rleEncode → rleToBlob → base64Encode → string

// Decode a stored string back to flat Uint16Array
decodeLayer(encoded: string, expectedLength: number): Uint16Array
// → base64Decode → blobToRle → rleDecode → Uint16Array

// Save a built area to Supabase campaign_data.areas[areaId]
saveArea(campaignId: string, area: AreaObject): Promise<void>

// Load an area from Supabase, decode layers
loadArea(campaignId: string, areaId: string): Promise<AreaObject>

// Remove a brief from areaBriefs after building
removeBrief(campaignId: string, briefId: string): Promise<void>
```

---

## AI Area Generation

### Creative Brief Format

The AI DM outputs this JSON when generating an area:

```json
{
  "id": "area-forest",
  "name": "Thornwood Pass",
  "width": 40,
  "height": 30,
  "theme": "forest",
  "pois": [
    { "type": "clearing_grass", "position": "center", "label": "Clearing" },
    { "type": "house_small", "position": "north-west", "label": "Hermit's Hut" },
    { "type": "tavern_main", "position": "south-east", "label": "Wayside Inn" }
  ],
  "connections": [
    { "from": "Clearing", "to": "Hermit's Hut" },
    { "from": "Clearing", "to": "Wayside Inn" }
  ],
  "npcs": [
    { "name": "Old Marren", "position": "Hermit's Hut", "personality": "Paranoid hermit who knows about the curse" }
  ],
  "exits": [
    { "edge": "south", "targetArea": "area-village", "label": "Back to Village" }
  ]
}
```

**Field definitions:**
- `type` — matches a chunk `id` from the chunk library via `chunkLibrary.get(poi.type)` (e.g., `tavern_main`, `house_small`, `clearing_grass`). If no exact match, fall back to `chunkLibrary.findBest()` by tags. If still no match, skip the POI and log a warning.
- `label` — unique human-readable name for this POI within the brief. Used as the key for `resolvePositions()` (which will be modified to key by `label` instead of `id`), for NPC placement references, and for connection endpoints.
- `position` — relative position string for `resolvePositions()` (e.g., `center`, `north-west`, `south-east`)
- `connections` — pairs of POI `label` strings to connect with roads/paths
- `npcs[].position` — POI `label` where the NPC should be placed. After stamping, resolved to a walkable tile inside the chunk (center of chunk interior, offset from walls).
- `exits[].edge` — which map edge the exit is on (`north`, `south`, `east`, `west`). Resolved to concrete coords: centered along the edge, default width 3 tiles, 1 tile deep. `entryPoint` in the target area is the mirror position on the opposite edge.

### `buildAreaFromBrief(brief)` Pipeline

1. **Resolve positions** — `resolvePositions(pois, width, height, seed)` → grid coords per POI (keyed by `label`)
2. **Match chunks** — for each POI, `chunkLibrary.get(poi.type)` → chunk. Fallback: `chunkLibrary.findBest(poi.tags)`. Skip + warn if no match.
3. **Build unified palette** — collect all tile IDs from matched chunks (via `remapChunk()`) + theme terrain tiles + theme road tile. Palette index 0 is always empty string.
4. **Remap & stamp chunks** — for each POI, `remapChunk(chunk, unifiedPalette)` to get remapped layer indices, then `stampChunk(layers, remappedChunk, posX, posY, width)`. Collect stamped building bounds into `buildings[]` array (for chunks with `type === 'building'`).
5. **Connect POIs** — `connectWithRoad(layers.floor, roadIdx, from, to, roadWidth, width)` for each connection
6. **Fill terrain** — `fillTerrain(layers.floor, themeVariants, width, height, seed)` with theme-appropriate grass/stone/dirt
7. **Build collision layer** — `buildCollisionLayer(layers, palette, BLOCKING_SET, width, height)` → flat `Uint8Array`. Doors are walkable (excluded from blocking). This collision layer is stored on the area object for runtime pathfinding (not RLE-encoded, regenerated on load from wall/prop layers).
8. **Place NPCs** — resolve NPC positions from their POI labels to tile coords. For each NPC, find the stamped chunk matching `npc.position` (POI label), then pick the center of the chunk interior (offset 2 tiles from walls). Store as `{ id, name, personality, position: { x, y }, questRelevant }`.
9. **Place exits** — create exit zones at specified edges. For `north`/`south` exits: centered along the edge, `width` tiles wide (default 3), 1 tile deep. For `east`/`west` exits: centered along the edge, `height` tiles tall (default 3), 1 tile wide. Set `entryPoint` as mirror position on opposite edge of target area.
10. **Encode layers** — for each layer (`floor`, `walls`, `props`, `roof`): `rleEncode(layer)` → `rleToBlob(encoded)` → `base64Encode(blob)` → string
11. **Return complete area object** — includes `id`, `name`, `width`, `height`, `tileSize: 200`, `palette`, encoded `layers`, `playerStart`, `npcs`, `buildings`, `exits`, `theme`, `generated: true`

### Theme → Terrain Mapping

```javascript
const THEME_TERRAIN = {
  village: ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01', 'atlas-floors:grass_overlay_medium_c_01'],
  forest: ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01'],
  dungeon: ['atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2', 'atlas-floors:brick_floor_04_d1'],
  cave: ['atlas-floors:brick_floor_03_d3', 'atlas-floors:brick_floor_03_d4'],
  town: ['atlas-floors:brick_floor_01_d1', 'atlas-floors:brick_floor_01_d2'],
}

const THEME_ROAD = {
  village: 'atlas-floors:brick_floor_01_d1',
  forest: 'atlas-floors:brick_floor_02_d1',
  dungeon: 'atlas-floors:brick_floor_03_d1',
  cave: 'atlas-floors:brick_floor_04_d1',
  town: 'atlas-floors:brick_floor_01_d3',
}
```

---

## Pre-generation Flow

### When to Pre-generate

The host client (DM mode) monitors narrative context for upcoming transitions:

1. **Exit proximity** — When a player is within 5 tiles of an exit whose `targetArea` has only a brief (not yet built), trigger pre-generation.
2. **AI narrative hint** — When the DM AI's response mentions a location that maps to an unbuilt area brief, trigger pre-generation.
3. **Explicit DM trigger** — A future DM panel could allow manually triggering area generation.

For now, implement #1 (exit proximity) as the primary trigger. #2 is a stretch goal.

### Pre-generation Sequence

1. Host client detects upcoming transition (exit proximity)
2. Look up `areaBriefs[targetAreaId]` — if exists and `areas[targetAreaId]` doesn't exist:
   a. Call `buildAreaFromBrief(brief)` (runs synchronously, <100ms for 40×30)
   b. Save built area to Zustand store
   c. Save to Supabase `campaign_data.areas[areaId]`
   d. Remove from `areaBriefs`
3. When player actually clicks the exit, the area is already built — instant transition

### On-demand Fallback

If the player reaches an exit before pre-generation completes (or if pre-generation wasn't triggered):
1. Show brief loading indicator ("Generating area...")
2. Build area from brief
3. Save + transition
4. Loading indicator dismisses

---

## Campaign Creation

### AI Campaign Generator

When creating a new campaign, Claude generates:

```json
{
  "title": "The Cursed Hollow",
  "startArea": "area-village",
  "areaBriefs": {
    "area-village": { "...brief..." },
    "area-forest": { "...brief..." },
    "area-dungeon": { "...brief..." }
  },
  "questObjectives": ["Find the source of the curse", "..."],
  "storyMilestones": ["Meet the hermit", "Enter the dungeon", "..."]
}
```

The campaign generator then:
1. Builds only the starting area: `buildAreaFromBrief(areaBriefs['area-village'])`
2. Stores the built area in `campaign_data.areas`
3. Keeps remaining briefs in `campaign_data.areaBriefs` for later generation

### System Prompt for Area Generation

The AI prompt includes:
- Available chunk types (from chunk library registry)
- Available themes
- Constraint: width 30-60, height 20-40
- Constraint: 2-6 POIs per area
- Constraint: exits must reference other area IDs in the campaign

---

## Multiplayer Sync

### Broadcast Events

```javascript
// Area transition — all clients load the target area
broadcastAreaTransition(areaId, entryPoint)
// → listeners: setCurrentArea(areaId), load layers from store/Supabase, setPlayerPos(entryPoint)

// Token position — player moved on the area map
broadcastTokenMove(playerId, { x, y })
// → listeners: update token position in store, re-render tokens

// Fog update — shared party vision
broadcastFogUpdate(areaId, base64Bitfield)
// → listeners: updateFogBitfield(areaId, bitfield)

// Roof state — building entered/exited
broadcastRoofState(buildingId, revealed)
// → listeners: setRoofState(buildingId, revealed)
```

### Sync Flow

**Area transition:**
1. Host clicks exit (or DM triggers transition)
2. Host broadcasts `area-transition` with `{ areaId, entryPoint }`
3. All clients receive → load area from Supabase (or from local store if already cached) → decompress layers → render

**Token movement:**
1. Any player moves their token (WASD or click-to-move)
2. After movement completes, broadcast `{ playerId, position: { x, y } }`
3. All other clients update that player's token position

**Camera:** Not broadcast. Each client manages their own camera independently. Arrow keys, scroll zoom, spacebar recenter — all local.

---

## What Gets Deleted

| File/Code | Reason |
|-----------|--------|
| `src/data/demoWorld.json` | Replaced by demo area built from chunks |
| `src/data/roomTemplates/*.js` | Replaced by chunk system |
| Zustand zone state: `currentZoneId`, `zones`, `visitedZones`, `zoneTokenPositions` | Replaced by area state (already exists) |
| `buildWorldFromAiOutput()` in `campaignGenerator.js` | Replaced by `buildAreaWorld()` |
| `mergeZoneWithTemplate()` in `campaignGenerator.js` | Replaced by `buildAreaFromBrief()` |
| V1 rendering path in `PixiApp.jsx` (`renderTilemap`, `clearTilemap`, `scaleWorldToFit`) | V2 renderer only |
| Zone transition code in `GameV2.jsx` (zone-specific effects) | Replaced by area transitions |

## What Stays

| Component | Why |
|-----------|-----|
| `PixiApp.jsx` V2 rendering path | Already works for areas |
| `Camera.js` | Pan/zoom/inertia — all local per client |
| `TokenLayer.js` | Token rendering + animation |
| `TilemapRendererV2.js` | Sprite pool viewport-culled renderer |
| `TileAtlasV2.js` | Multi-atlas tile resolver |
| `FogOfWar.js`, `RoofLayer.js` | Fog + roof systems |
| `pathfinding.js` | A* on flat collision grid |
| `rleCodec.js` | Layer compression |
| `mapGenerator.js` | Stamp, connect, fill |
| `chunkLibrary.js` + all chunks | Reusable map pieces |
| All HUD, NPC, combat, narrator components | Unchanged |

---

## File Structure (new/modified)

```
src/lib/areaBuilder.js           — buildAreaFromBrief(), theme mappings, NPC/exit placement
src/lib/campaignGenerator.js     — MODIFIED: outputs area briefs instead of zone graph
src/lib/liveChannel.js           — MODIFIED: add area broadcast events
src/lib/areaStorage.js           — save/load areas to Supabase, RLE encode/decode + base64
src/store/useStore.js            — MODIFIED: remove zone state, wire area state to new flow
src/GameV2.jsx                   — MODIFIED: area loading, transitions, pre-generation trigger
src/engine/PixiApp.jsx           — MODIFIED: remove V1 rendering path
src/data/demoArea.js             — demo area (replaces demoWorld.json)
```
