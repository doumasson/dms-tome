# Procedural Map System — Design Specification

> **Date:** 2026-03-19
> **Status:** Draft
> **Branch:** `phase1/tilemap-renderer-hud`

---

## 1. Overview

Replace the current small fixed-view zone system (10–16 tile rooms with exit arrows) with large, scrollable, procedurally generated world maps built from Forgotten Adventures tile assets. Maps are assembled from a growing chunk library using AI-directed procedural generation. Buildings use roof-lift reveal for seamless interior exploration on the same map. Fog of war uses 5e vision rules per character.

### Goals
- Large explorable areas (50x40 to 120x80+ tiles) replacing tiny discrete rooms
- Native FA tile fidelity (200px/tile) with sprite atlas performance
- Free camera: arrow/WASD pan with inertia, scroll-wheel zoom, spacebar recenter
- Roof-lift building interiors on the same map
- Three-state fog of war with per-character darkvision from 5e SRD
- Chunk library that grows over time (curated + AI-generated)
- Repeatable asset pipeline for importing new FA packs
- Theme-agnostic tagging for future universe support (steampunk, gothic, etc.)

### Non-Goals
- Real-time lighting/shadows (Phase 4 ambient lighting is separate)
- Mobile/tablet support (separate Phase 4 item)
- 3D or isometric rendering
- Line-of-sight raycasting through walls (future enhancement)

---

## 2. Area Model

### 2.1 What Is an Area

An **Area** is a single large scrollable map. A campaign has 2–5 areas. Zone transitions between areas are rare, reserved for major story moments (entering a castle, descending underground, traveling to a new region).

Examples of areas:
- "Millhaven Village" — town + surrounding countryside, road to goblin camp, forest, cave entrance (80x60)
- "The Undercrypt" — multi-room dungeon floor with corridors, traps, boss chamber (50x40)
- "Castle Dreadmoor" — castle interior: great hall, barracks, towers, throne room (60x50)

### 2.2 Area Data Schema

```json
{
  "id": "millhaven-village",
  "name": "Millhaven Village",
  "width": 80,
  "height": 60,
  "tileSize": 200,
  "biome": "grassland",
  "tags": ["settlement", "outdoor", "temperate"],
  "lighting": "bright",
  "layers": {
    "terrain": [[ ... ]],
    "floor": [[ ... ]],
    "walls": [[ ... ]],
    "props": [[ ... ]],
    "roof": [[ ... ]]
  },
  "buildings": [
    {
      "id": "rusty-flagon",
      "name": "The Rusty Flagon",
      "chunkId": "inn-common-01",
      "position": { "x": 20, "y": 10 },
      "doors": [{ "x": 25, "y": 19, "facing": "south" }],
      "roofRevealed": false
    }
  ],
  "npcs": [
    {
      "name": "Greta",
      "position": { "x": 26, "y": 13 },
      "buildingId": "rusty-flagon",
      "personality": "gruff but kind bartender",
      "hints": ["..."],
      "critical": false
    }
  ],
  "exits": [
    {
      "position": { "x": 79, "y": 30 },
      "width": 2,
      "targetArea": "castle-dreadmoor",
      "entryPoint": { "x": 2, "y": 25 },
      "label": "Castle Dreadmoor"
    }
  ],
  "encounterZones": [
    {
      "id": "goblin-camp",
      "bounds": { "x": 50, "y": 45, "w": 12, "h": 10 },
      "enemies": [{ "name": "Goblin", "count": 4 }],
      "trigger": "proximity"
    }
  ],
  "lightSources": [
    { "position": { "x": 26, "y": 14 }, "type": "fireplace", "bright": 4, "dim": 4 }
  ]
}
```

### 2.3 Layer Rendering Order

```
1. terrain   — base ground (grass, dirt, water, stone)
2. floor     — placed floors (wood planks inside buildings, cobblestone roads)
3. walls     — wall segments, cliff faces, fences
4. props     — furniture, barrels, trees, rocks, decorations
5. roof      — building rooftops (fade out on enter)
6. grid      — optional grid overlay (combat mode)
7. tokens    — player + NPC sprites
8. fog       — fog of war overlay (topmost)
```

---

## 3. Camera System

### 3.1 Controls

| Input | Action |
|-------|--------|
| Arrow keys | Pan camera smoothly |
| WASD | Pan camera smoothly (same as arrows) |
| Scroll wheel | Zoom in/out |
| Spacebar | Smooth ease to center on player token |
| Click tile | Pathfind + walk player token |
| Click NPC | Interact (existing system) |
| E key | Context interaction (existing system) |

### 3.2 Pan Behavior

- Pan speed: ~600px/sec at 1x zoom (adjusts with zoom level so it feels consistent)
- **Inertia:** releasing the key doesn't stop instantly. Camera decelerates over ~200ms (ease-out)
- Camera is clamped to area bounds (can't scroll past the map edge)
- Multiple direction keys held = diagonal pan

### 3.3 Zoom Behavior

- Range: **0.3x** (zoomed out, overview) to **1.5x** (zoomed in, detail)
- Default zoom: **0.5x** (good overview of surroundings)
- Zoom targets mouse cursor position (zoom toward where you're pointing)
- Smooth interpolation between zoom levels (~150ms ease)
- Zoom level persists across camera pans, resets on area transition

### 3.4 Viewport Culling

Only tiles within the visible viewport (plus a 2-tile buffer for smooth panning) are rendered. At 0.5x zoom on a 1920x1080 screen, the viewport shows roughly 19x10 tiles — about 190 sprites per layer, ~950 total. Well within PixiJS performance budget.

Sprites are pooled and recycled as the camera moves. No creation/destruction during panning.

---

## 4. Roof-Lift Buildings

### 4.1 Behavior

- Buildings on the map have exterior walls visible at ground level and a **roof layer** rendered on top that hides the interior
- Interior tiles (floor, furniture, NPCs) exist at the same map coordinates under the roof
- When **any party member** steps through a door tile, the roof for that building fades to transparent (~400ms ease)
- Interior NPCs and props become visible and interactive
- When **all party members** are outside the building, roof fades back in (~400ms)
- Building interiors inside buildings with darkvision/lighting rules still apply

### 4.2 Multiplayer

- Roof reveal state broadcasts to all clients: `{ type: "roof-reveal", buildingId, revealed: true/false }`
- All clients render the same roof state regardless of which player entered
- Roof state stored in area data, persists across sessions

### 4.3 Door Tiles

Doors are special prop tiles that:
- Are walkable (not blocking)
- Have a `buildingId` reference
- Trigger roof reveal when a token moves onto them
- Render with open/closed sprite variants

---

## 5. Fog of War

### 5.1 Three States

| State | Visual Treatment | Entity Visibility |
|-------|-----------------|-------------------|
| **Unexplored** | Fully black/opaque | Nothing visible |
| **Explored (inactive)** | 40% opacity dark overlay + desaturation (grayscale) | Terrain, buildings, props visible. No NPCs, no enemies, no movement. A memory. |
| **Active vision** | Full color, no overlay | Everything visible and interactive |

### 5.2 Per-Character Vision (5e SRD Rules)

Each character has a vision profile derived from their race and class features:

**Darkvision by Race:**

| Race | Darkvision | Range |
|------|-----------|-------|
| Human | No | — |
| Halfling | No | — |
| Dragonborn | No | — |
| Elf (all) | Yes | 60 ft (12 tiles) |
| Dwarf (all) | Yes | 60 ft (12 tiles) |
| Half-Elf | Yes | 60 ft (12 tiles) |
| Half-Orc | Yes | 60 ft (12 tiles) |
| Gnome | Yes | 60 ft (12 tiles) |
| Tiefling | Yes | 60 ft (12 tiles) |
| Drow | Yes | 120 ft (24 tiles) — Superior Darkvision |

**Class Feature Modifiers:**
- Gloom Stalker Ranger (3rd level): +60 ft darkvision (grants 60 ft if none, extends to 90 ft if has it)
- Shadow Sorcerer (1st level): 120 ft darkvision
- Twilight Cleric (1st level): 300 ft darkvision
- *Devil's Sight* (Warlock invocation): See normally in magical and nonmagical darkness, 120 ft

**Feat Modifiers:**
- Characters may gain darkvision from racial feats or magic items (read from character data)

### 5.3 Lighting Conditions

Each area has a base lighting level. Individual zones within the area can override:

| Condition | Effect on Vision |
|-----------|-----------------|
| **Bright light** | All characters see at full vision radius (8 tiles base) |
| **Dim light** | Characters without darkvision: half vision radius. With darkvision: treat as bright light |
| **Darkness** | No darkvision: blind (0 tiles) unless carrying light source. With darkvision: see at darkvision range but in grayscale/dim rendering |
| **Magical darkness** | Only *Devil's Sight* or specific spells penetrate. Darkvision does NOT work. |

### 5.4 Light Sources

Carried or placed light sources create vision bubbles:

| Source | Bright Radius | Dim Radius | Notes |
|--------|--------------|------------|-------|
| Torch | 20 ft (4 tiles) | +20 ft (4 tiles) | Carried, lasts 1 hour |
| Candle | 5 ft (1 tile) | +5 ft (1 tile) | Placed |
| Lantern, hooded | 30 ft (6 tiles) | +30 ft (6 tiles) | Carried |
| Lantern, bullseye | 60 ft cone (12 tiles) | +60 ft (12 tiles) | Directional |
| *Light* cantrip | 20 ft (4 tiles) | +20 ft (4 tiles) | Attached to object |
| *Dancing Lights* | 10 ft (2 tiles) each | — | 4 orbs, movable |
| *Daylight* | 60 ft (12 tiles) | +60 ft (12 tiles) | Dispels magical darkness |
| Fireplace/sconce | 15 ft (3 tiles) | +10 ft (2 tiles) | Stationary, placed in area data |

Carried light sources move with the character token. Placed sources (fireplaces, sconces) are defined in area data.

### 5.5 Vision Calculation

Per game tick (on any party member movement):
1. For each party member, compute their vision radius based on:
   - Base vision (8 tiles in bright light)
   - Area/zone lighting condition
   - Character's darkvision (from race + class + items)
   - Carried light sources
2. Union all party members' vision circles
3. Add static light source radii (fireplaces, sconces)
4. Mark tiles as: active (in any vision circle), explored (previously active, now outside), unexplored (never seen)
5. Render fog overlay accordingly

**Shared vision:** All party members benefit from each other's vision. If the Elf can see a corridor in darkvision, all players on all screens see it (in the Elf's vision style — grayscale for darkvision-only areas).

### 5.6 Multiplayer Sync

- Fog state (explored tiles bitfield) stored per-area in campaign data
- Active vision computed client-side per frame (no broadcast needed — all clients have party positions)
- Explored tiles broadcast on change: `{ type: "fog-update", areaId, newlyExplored: [[x,y], ...] }`

---

## 6. Chunk System

### 6.1 Chunk Types

| Type | Size Range | Description | Example |
|------|-----------|-------------|---------|
| **building** | 8x6 – 15x12 | Full building: exterior walls, roof, interior rooms, furniture, doors | Inn, Blacksmith, Temple |
| **room** | 4x4 – 10x8 | Single room for dungeon assembly | Dungeon cell, Corridor, Boss chamber |
| **encounter** | 6x6 – 12x10 | Open area with thematic props, enemy spawn points | Goblin camp, Bandit hideout, Ritual circle |
| **terrain** | Variable/tileable | Repeatable fill patterns | Forest patch, Road segment, River, Cliff |
| **landmark** | 2x2 – 5x5 | Small detail pieces | Fountain, Statue, Well, Bridge |

### 6.2 Chunk Data Schema

```json
{
  "id": "inn-common-01",
  "name": "Common Inn",
  "type": "building",
  "tags": ["tavern", "indoor", "settlement", "temperate"],
  "width": 12,
  "height": 10,
  "layers": {
    "floor": [[ ... ]],
    "walls": [[ ... ]],
    "props": [[ ... ]],
    "roof": [[ ... ]]
  },
  "doors": [
    { "localX": 5, "localY": 9, "facing": "south" }
  ],
  "spawnPoints": {
    "bartender": { "x": 6, "y": 3 },
    "patron_1": { "x": 3, "y": 5 },
    "patron_2": { "x": 9, "y": 5 }
  },
  "lightSources": [
    { "x": 1, "y": 2, "type": "fireplace", "bright": 3, "dim": 2 }
  ],
  "interiorLighting": "dim",
  "source": "curated",
  "version": 1
}
```

### 6.3 Chunk Library Storage

- **Curated chunks** (initial set, shipped with app): `src/data/chunks/` as JSON files, bundled in Vercel deploy
- **Generated chunks** (created during campaign gen): stored in Supabase `chunks` table
- **Chunk index**: a manifest mapping `(type, tags[])` → chunk IDs for fast lookup during generation

### 6.4 Growing the Library

When the procedural generator needs a chunk that doesn't exist in the library:
1. AI generates a high-level description of what the chunk should contain
2. Algorithm builds the chunk tile-by-tile using available atlas tiles, matching tags to asset categories
3. New chunk is saved to Supabase with `"source": "generated"` and `"version": 1`
4. Chunk is immediately available for future campaigns

Curated chunks are always preferred over generated ones (higher quality). Generated chunks can be flagged for manual review/improvement.

---

## 7. Procedural Map Generation

### 7.1 Generation Flow

```
AI Prompt → Area Layout JSON → Chunk Resolution → Grid Assembly → Terrain Fill → Output
```

**Step 1: AI Describes the Area**

Claude receives campaign context and outputs a high-level area layout:

```json
{
  "id": "millhaven-village",
  "name": "Millhaven Village",
  "size": { "width": 80, "height": 60 },
  "biome": "grassland",
  "lighting": "bright",
  "pointsOfInterest": [
    {
      "id": "rusty-flagon",
      "type": "building",
      "tags": ["tavern"],
      "position": "north-center",
      "name": "The Rusty Flagon",
      "npcs": [{ "name": "Greta", "role": "bartender", "personality": "gruff but kind" }]
    },
    {
      "id": "forge",
      "type": "building",
      "tags": ["blacksmith"],
      "position": "east",
      "name": "Forge & Anvil"
    },
    {
      "id": "town-fountain",
      "type": "landmark",
      "tags": ["fountain"],
      "position": "center"
    },
    {
      "id": "goblin-camp",
      "type": "encounter",
      "tags": ["goblin", "camp"],
      "position": "far-south",
      "enemies": [{ "name": "Goblin", "count": 4 }]
    }
  ],
  "terrain": [
    { "tags": ["forest"], "region": "south-half" },
    { "tags": ["road"], "from": "rusty-flagon", "to": "town-fountain" },
    { "tags": ["road"], "from": "town-fountain", "to": "forge" },
    { "tags": ["dirt-trail"], "from": "town-fountain", "to": "goblin-camp" }
  ],
  "areaExits": [
    { "edge": "east", "targetArea": "castle-dreadmoor", "label": "Castle Dreadmoor" }
  ]
}
```

**Step 2: Resolve Positions**

Convert relative positions ("north-center", "far-south") to actual grid coordinates. Use a simple grid partitioning:
- Divide area into a 5x5 logical grid
- "north-center" → column 3, row 1
- "far-south" → column 3, row 5
- Add jitter so things don't feel grid-aligned

**Step 3: Match Chunks**

For each point of interest, query the chunk library:
- `type: "building", tags: ["tavern"]` → returns `inn-common-01` (best match)
- If no match found, generate a new chunk (see §6.4)

**Step 4: Place Chunks on Grid**

Stamp each chunk's tile layers onto the area grid at the resolved position. Handle collision (chunks can't overlap — nudge if needed).

**Step 5: Connect with Roads/Paths**

For each connection in `terrain`, pathfind between endpoints and paint road/trail tiles along the path. Roads are 2 tiles wide, trails 1 tile wide.

**Step 6: Terrain Fill**

Fill remaining empty space based on biome and terrain tags:
- `grassland` biome → grass base with random wildflower/rock props
- `forest` region → dense tree placement with clearings
- `river` → water tiles with bank transitions
- Cliff faces and elevation changes at area edges

**Step 7: Place Light Sources & NPCs**

- Interior light sources come from chunk data
- Exterior sources (street lamps, campfires) placed at points of interest
- NPCs positioned at their spawn points within chunks

### 7.2 Dungeon Generation

Dungeons use a different strategy — **BSP (Binary Space Partition)** for room layout:

1. Start with the area bounds (e.g., 50x40)
2. Recursively split into partitions
3. Place room chunks in each partition
4. Connect rooms with corridors (L-shaped or straight)
5. Place doors at corridor-room junctions
6. Lighting defaults to **darkness** — players need darkvision or light sources

### 7.3 Performance Budget

- AI call (Claude Haiku): ~2-3 seconds
- Position resolution: <10ms
- Chunk matching: <50ms
- Grid assembly: <100ms
- Road pathfinding: <50ms per connection
- Terrain fill: <200ms
- **Total generation: ~3 seconds** (dominated by AI call)

---

## 8. Asset Pipeline

### 8.1 Overview

A local CLI toolchain that processes Forgotten Adventures asset packs into game-ready sprite atlases and a tile catalog.

```
npm run assets:scan     Scan FA zips/folders → manifest.json
npm run assets:build    Build sprite atlases from manifest → public/tilesets/
npm run assets:chunks   Generate starter chunks from templates
```

### 8.2 Scan: FA Pack → Manifest

Reads FA directory structure and parses the naming convention:

```
FA_Assets/!Core_Settlements/Furniture/Tables/Table_Round_Wood_Dark_A1_2x2.png
```

Extracts:
- **category**: `furniture`
- **subcategory**: `tables`
- **material**: `wood_dark`
- **variant**: `A1`
- **gridSize**: `2x2` (400x400px)
- **tags**: `["furniture", "table", "wood", "dark", "settlement"]` (auto-derived)

Output: `assets/manifest.json` — catalog of every asset with path, tags, dimensions, grid size.

### 8.3 Build: Manifest → Sprite Atlases

Groups tiles by usage category and packs into optimized sprite sheets:

| Atlas | Contents | Estimated Size |
|-------|----------|----------------|
| `atlas-floors.png` | Stone, wood, brick, dirt, grass textures | ~2MB |
| `atlas-walls.png` | Wall segments by material and orientation | ~3MB |
| `atlas-props-furniture.png` | Tables, chairs, shelves, barrels, beds | ~3MB |
| `atlas-props-decor.png` | Candles, bottles, rugs, paintings, clutter | ~2MB |
| `atlas-terrain.png` | Trees, rocks, bushes, water edges, paths | ~3MB |
| `atlas-roofs.png` | Roof tiles for building covers | ~1MB |
| `atlas-doors.png` | Door variants (open, closed, materials) | ~0.5MB |
| `atlas-effects.png` | Blood, fire, magic circles | ~1MB |

Each atlas gets a companion JSON: `atlas-floors.json` mapping tile IDs to `{ x, y, width, height }` within the sheet.

**Format:** WebP for production (40-60% smaller than PNG), PNG fallback.

**Max atlas size:** 4096x4096px (WebGL texture limit on most devices). Split into multiple sheets if needed.

### 8.4 Adding New Packs

1. Place new FA zip in `assets/imports/`
2. Run `npm run assets:scan` — new assets appended to manifest
3. Run `npm run assets:build` — atlases rebuilt with new tiles
4. Commit updated atlases to repo (or upload expansion atlases to Supabase for biome packs)

### 8.5 Storage Strategy

**Vercel Static (repo — `public/tilesets/`):**
- Core atlases (floors, walls, furniture, terrain, doors, roofs) — ~15MB total
- Atlas JSON manifests
- Initial curated chunk library

**Supabase:**
- Generated chunk definitions (JSON, small)
- Built area maps per campaign (JSON)
- Optional: biome-specific expansion atlases (Underdark, Feywilds, etc.)

**Lazy Loading:**
- On area load, fetch only the atlases needed for that area's biome tags
- Core atlases loaded on game start (cached by browser)
- Expansion atlases fetched on demand

---

## 9. Tile ID System

### 9.1 Structure

Tile IDs are strings that reference a specific tile in a specific atlas:

```
"floors:stone_earthy_01"
"walls:stone_earthy_vertical_a1"
"props:table_round_wood_dark_a1"
"terrain:tree_oak_large_a1"
"roofs:thatch_brown_center"
```

Format: `{atlas}:{tile_name}`

The atlas JSON maps tile names to coordinates:
```json
{
  "stone_earthy_01": { "x": 0, "y": 0, "w": 200, "h": 200 },
  "stone_earthy_02": { "x": 200, "y": 0, "w": 200, "h": 200 },
  "wood_planks_01": { "x": 400, "y": 0, "w": 200, "h": 200 }
}
```

### 9.2 Migration from Current System

Current system uses integer tile indices (0–48) referencing a single 32px spritesheet. New system:
- Replaces integer IDs with string IDs
- Replaces single spritesheet with multiple atlases
- Replaces 32px tiles with 200px tiles
- TilemapRenderer updated to resolve `atlas:name` → texture region

Old room templates and demo world will need migration to new tile ID format.

---

## 10. Multiplayer Considerations

### 10.1 Area Transitions

Same pattern as current zone transitions but for areas:
- Host triggers area transition → fade to black → broadcast `{ type: "area-transition", areaId, entryPoint }`
- All clients load new area, position at entry point

### 10.2 Camera Independence

Each player controls their own camera independently. No camera sync. Players can look at different parts of the map. Fog of war is shared (explored tiles sync), but viewport position is local.

### 10.3 Roof Reveal

Broadcast on change: `{ type: "roof-reveal", buildingId, revealed: boolean }`
All clients render same roof state.

### 10.4 Token Positions

Existing token position sync works unchanged — positions are now in the larger area grid coordinate space.

### 10.5 Combat

Combat continues to work within the area. Initiative strip, action economy, movement range highlights all function the same but in the larger map context. Camera may auto-zoom to the combat encounter zone.

---

## 11. Theme-Agnostic Design

All chunk tags, biome identifiers, and asset categories use generic descriptors, not setting-specific names:

- Tags: `["settlement", "tavern", "temperate"]` not `["forgotten-realms", "sword-coast"]`
- Biomes: `"grassland"`, `"underdark"`, `"industrial"` not `"faerun-forest"`
- Asset categories: `"furniture"`, `"terrain"`, `"structures"` not `"medieval-furniture"`

This ensures future universe support (steampunk, gothic, 1920s) is additive — new asset packs, new chunks, new AI prompts — without engine changes.

---

## 12. What Changes from Current System

| Aspect | Current | New |
|--------|---------|-----|
| Map size | 10–16 tiles wide | 50–120 tiles wide |
| Tile resolution | 32px colored rectangles | 200px FA art |
| Camera | Fixed, whole zone visible | Free pan/zoom with inertia |
| Zones | Small rooms, exit arrows on edges | Large areas, rare story-driven transitions |
| Buildings | Each room is a separate zone | Roof-lift on same map |
| Fog of war | Binary per-scene toggle | Three-state with 5e vision/darkvision |
| Tile data | Integer indices, single spritesheet | String IDs, multiple atlases |
| Map creation | 8 hand-coded room templates | AI-directed chunk assembly from growing library |
| Assets | Placeholder colored squares | Forgotten Adventures tileset |
| Generation | Claude outputs zone graph → template merge | Claude describes layout → algorithm assembles from chunks |

### 12.1 What Stays the Same

- PixiJS WebGL rendering (upgraded, not replaced)
- Zustand state management
- Supabase multiplayer broadcast
- A* pathfinding (works on larger grids)
- NPC interaction system (E-key, dialog, cutscenes)
- Combat system (initiative, actions, spells)
- HUD (bottom bar, portraits, session log)

---

## 13. File Structure (New/Changed)

```
src/
  engine/
    PixiApp.jsx           — MODIFIED: camera system, viewport culling, zoom
    TilemapRenderer.js    — MODIFIED: multi-atlas tile resolution, layer rendering
    tileAtlas.js          — REPLACED: new atlas loader for multiple sprite sheets
    Camera.js             — NEW: pan, zoom, inertia, recenter logic
    FogOfWar.js           — NEW: three-state fog rendering + vision calculation
    RoofLayer.js          — NEW: roof sprite management + fade reveal
    ViewportCuller.js     — NEW: determines visible tiles for current camera
  data/
    tileAtlas.json        — REPLACED: new atlas manifest format
    chunks/               — NEW: curated chunk JSON library
      buildings/
        inn-common-01.json
        blacksmith-01.json
        temple-01.json
        ...
      rooms/
        dungeon-cell-01.json
        corridor-straight-01.json
        boss-chamber-01.json
        ...
      encounters/
        goblin-camp-01.json
        bandit-hideout-01.json
        ...
      terrain/
        forest-patch.json
        road-segment.json
        river-segment.json
        ...
      landmarks/
        fountain-01.json
        well-01.json
        statue-01.json
        ...
  lib/
    mapGenerator.js       — NEW: area assembly from AI layout + chunks
    chunkLibrary.js       — NEW: chunk lookup, matching, storage
    dungeonGenerator.js   — NEW: BSP dungeon generation
    visionCalculator.js   — NEW: per-character 5e vision computation
    assetPipeline/        — NEW: CLI scripts (scan, build, chunks)
      scan.js
      build.js
      generateChunks.js
  store/
    useStore.js           — MODIFIED: area state replaces zone state
public/
  tilesets/
    atlas-floors.png      — NEW: FA floor textures atlas
    atlas-floors.json
    atlas-walls.png       — NEW: FA wall atlas
    atlas-walls.json
    ... (one pair per atlas category)
assets/
  imports/                — NEW: drop FA zips here for processing
  manifest.json           — NEW: generated catalog of all FA assets
```
