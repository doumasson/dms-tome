# Sub-Grid Wall Rendering — Design Spec

## Goal

Replace solid-fill wall cells with thin, architecturally detailed walls rendered on cell edges using Fantasy Assets connector tiles. Movement grid stays 200px. Walls are visual elements on cell boundaries with edge-based collision.

## Decisions

- **Full FA connector tiles** — Use the actual FA wall sprites (connectors, corners, endings) for maximum visual quality. No programmatic rectangles.
- **Edge bitfield model** — Each cell stores a 4-bit mask (N/E/S/W) indicating which edges have walls. Autotile logic picks the right FA sprite per edge/corner.
- **Visual-only thickness** — Walls render as thin elements on cell edges. Collision checks edge bits, not cell occupancy. Movement grid unchanged at 200px.
- **Auto-derive from chunk walls layer** — Existing chunks keep defining walls as filled cells. Edge data is derived at build time by detecting boundaries between wall cells and non-wall cells.

---

## Data Model

### Wall Edges (per-area, derived at build time)

```javascript
// wallEdges: Uint8Array, length = width * height
// Low 4 bits encode which edges have walls:
//   bit 0 (0x1) = North
//   bit 1 (0x2) = East
//   bit 2 (0x4) = South
//   bit 3 (0x8) = West
// High 4 bits reserved for door flags:
//   bit 4 (0x10) = North door
//   bit 5 (0x20) = East door
//   bit 6 (0x40) = South door
//   bit 7 (0x80) = West door
```

**Stored on the area object** (not RLE-encoded — derived at load time from the walls layer, same as collision):

```javascript
area.wallEdges   // Uint8Array, length = width * height
area.wallTheme   // string: 'village' | 'forest' | 'dungeon' | 'cave' | 'town'
```

### Wall Theme → FA Tile Style Mapping

The WALL_STYLES object stores **name prefixes** (not full tile IDs). The `resolveWallTile()` function assembles the full tile ID by appending the variant letter, connector suffix, and `_1x1`.

**Directional conventions vary by atlas:**

- **atlas-structures walls** (`wall_stone_earthy`, `wall_wood_ashen`, etc.) — Many styles only have `_connector_a` (horizontal). For vertical walls, the **same tile is rendered with a 90-degree rotation** (`sprite.rotation = Math.PI / 2`). The `wall_brick_earthy` and `wall_metal_brass` families have both `_connector_a` and `_connector_b` natively.
- **atlas-structures dwarven walls** — Have 6 variants (a1-f1) per direction, with separate corner tiles (a1, c1, d2, e1).
- **atlas-walls flesh walls** — Use `_X1` for one direction and `_X2` for the other (e.g., `connector_a1` vs `connector_a2`). Note: some `_X2` variants are missing (`f2`, `k2`) — the autotile hash must skip these gaps.

```javascript
const WALL_STYLES = {
  village: {
    // 11 style variants (a-k), _connector_a only — rotate for vertical
    segmentPrefix: 'atlas-structures:wall_stone_earthy',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'b1', 'c', 'd', 'e', 'f', 'g', 'h', 'i1', 'j1', 'k1'],
    rotateForVertical: true,  // sprite.rotation = PI/2 for east/west edges
    // 4 corner variants — NOTE: n1 has irregular name with _metal_gray_ infix
    cornerTiles: {
      NE: 'atlas-structures:wall_corner_stone_earthy_l1_1x1',
      NW: 'atlas-structures:wall_corner_stone_earthy_m1_1x1',
      SE: 'atlas-structures:wall_corner_stone_earthy_metal_gray_n1_1x1',
      SW: 'atlas-structures:wall_corner_stone_earthy_o1_1x1',
    },
    doors: 'atlas-structures:door_metal_gray',
  },
  forest: {
    segmentPrefix: 'atlas-structures:wall_wood_ashen',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    rotateForVertical: true,
    cornerTiles: null,  // compose from overlapping segments
    doors: 'atlas-structures:door_metal_gray',
  },
  dungeon: {
    segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector',
    segmentSuffix: '_1x1',
    variants: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1'],
    rotateForVertical: true,  // only _connector_ variants, rotate for vertical
    cornerTiles: {
      NE: 'atlas-structures:dwarven_wall_stone_earthy_corner_a1_1x1',
      NW: 'atlas-structures:dwarven_wall_stone_earthy_corner_c1_1x1',
      SE: 'atlas-structures:dwarven_wall_stone_earthy_corner_d2_1x1',
      SW: 'atlas-structures:dwarven_wall_stone_earthy_corner_e1_1x1',
    },
    doors: 'atlas-structures:door_metal_gray',
  },
  cave: {
    // Flesh walls: _X1 = horizontal, _X2 = vertical (some _X2 missing)
    segmentPrefix: 'atlas-walls:flesh_black_wall_connector',
    horizontalSuffix: '1_1x1',  // e.g., _a1_1x1
    verticalSuffix: '2_1x1',    // e.g., _a2_1x1
    variants: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
    missingVertical: ['f', 'k'],  // f2 and k2 don't exist — skip in hash
    rotateForVertical: false,  // has native vertical tiles
    cornerTiles: {
      NE: 'atlas-walls:flesh_black_wall_corner_a1_1x1',
      NW: 'atlas-walls:flesh_black_wall_corner_b1_1x1',
      SE: 'atlas-walls:flesh_black_wall_corner_c1_1x1',
      SW: 'atlas-walls:flesh_black_wall_corner_d1_1x1',
    },
    doors: 'atlas-structures:door_metal_gray',
  },
  town: {
    // Has both _connector_a and _connector_b natively
    segmentPrefix: 'atlas-structures:wall_brick_earthy',
    horizontalSuffix: '_connector_a_1x1',
    verticalSuffix: '_connector_b_1x1',
    variants: ['a', 'b', 'c'],
    rotateForVertical: false,
    cornerTiles: null,  // compose from overlapping segments
    doors: 'atlas-structures:door_metal_gray',
  },
}
```

---

## Edge Extraction Algorithm

### `extractWallEdges(walls, floor, palette, doorSet, width, height) → Uint8Array`

**Input:**
- `walls` — Uint16Array (palette-indexed, non-zero = wall or door cell)
- `floor` — Uint16Array (palette-indexed, non-zero = floor cell)
- `palette` — string[] (index → tile ID)
- `doorSet` — Set of tile IDs that are doors (e.g., `new Set(['atlas-structures:door_metal_gray_a_1x1', ...])`)
- `width`, `height` — area dimensions

**Algorithm:**

```
for each cell (x, y):
  tileIdx = walls[y * width + x]
  if tileIdx === 0: continue (no wall here)

  tileId = palette[tileIdx]
  isDoor = doorSet.has(tileId)

  for each direction (N, E, S, W):
    neighbor = walls layer value at adjacent cell in that direction

    if neighbor === 0 OR out of bounds:
      // This edge is a boundary between wall and non-wall
      if isDoor:
        set door bit for this direction
      else:
        set wall bit for this direction
```

**Key behaviors:**
- Interior wall mass (wall cell surrounded by wall cells) produces no edges — invisible
- Perimeter wall cells get edges only on their non-wall-facing sides
- Door cells get door bits instead of wall bits — they connect to adjacent walls visually but are passable
- Out-of-bounds neighbors are treated as non-wall (exterior walls get edges on map boundaries)

**Floor backfill:** Current chunks have `floor[i] === 0` (empty) under wall cells, since solid-fill walls covered them. With thin edge walls, these cells become visible. The edge extraction step must also backfill the floor layer: for any wall cell with `floor[i] === 0`, copy the nearest non-zero floor tile from an adjacent cell. This runs as a sub-step of `extractWallEdges` and mutates the floor layer in place before the area is rendered.

---

## Autotile Pattern Matching

### `wallAutotile.js` — Maps edge context to FA tile IDs

**Edge segments:** For each cell with wall edge bits, place a connector sprite on each active edge.

```javascript
// Horizontal edge (north or south wall):
//   For styles with rotateForVertical: use segmentSuffix
//   For styles with native H/V: use horizontalSuffix
// Vertical edge (east or west wall):
//   For styles with rotateForVertical: use segmentSuffix + sprite.rotation = PI/2
//   For styles with native H/V: use verticalSuffix (skip missingVertical variants)
```

**Variant selection:** Deterministic hash using multiply-and-XOR: `((x * 73856093) ^ (y * 19349663) ^ (dirIndex * 83492791)) >>> 0`. Mod by the variant count to pick a letter. For styles with `missingVertical`, filter those variants out before modding when resolving vertical edges.

**Corner pieces:** At each grid vertex (intersection of 4 cells), check the edges meeting at that point:

```
Vertex at (x, y) is the top-left corner of cell (x, y)
Adjacent edges: south-edge of cell (x, y-1), west-edge of cell (x, y),
                north-edge of cell (x, y), east-edge of cell (x-1, y)

L-corner (2 perpendicular edges meeting):
  → Place corner tile with appropriate rotation
  → FA provides 4 corner variants (l1, m1, n1, o1) for different orientations

T-junction (3 edges meeting):
  → Place corner tile + one straight segment overlay

Cross (4 edges meeting):
  → Two overlapping straight segments (horizontal + vertical)
```

**Themes without dedicated corner tiles** (forest, town): Compose corners by overlapping two perpendicular segment sprites. The transparent regions of FA tiles make this work — a horizontal segment overlapping a vertical segment at a corner creates a visual corner.

### `resolveWallTile(style, direction, x, y) → tileId`

Returns the full tile ID string for the atlas lookup. Example:
```
resolveWallTile(WALL_STYLES.village.segments, 'horizontal', 5, 3)
→ 'atlas-structures:wall_stone_earthy_e_connector_a_1x1'
//                                    ^ hash(5,3,'h') % 11 = 4 → letter 'e'
```

---

## Wall Renderer

### `WallRenderer` class (`src/engine/WallRenderer.js`)

A PixiJS Container that renders wall sprites at sub-grid positions.

**Constructor:**
```javascript
constructor(tileAtlas, tileSize)
// tileAtlas: TileAtlasV2 instance for texture lookups
// tileSize: 200 (movement grid size)
```

**Key methods:**

```javascript
// Load wall data for the current area
setWallData(wallEdges, width, height, theme)

// Per-frame render — called from PixiApp ticker
render(cameraBounds)
// 1. Determine visible tile range from cameraBounds
// 2. For each visible cell with wall edge bits:
//    a. Resolve FA tile ID per edge via wallAutotile
//    b. Get/create sprite from pool
//    c. Position at edge midpoint:
//       North edge: (x*200 + 100, y*200)       — top center of cell
//       South edge: (x*200 + 100, (y+1)*200)   — bottom center
//       East edge:  ((x+1)*200, y*200 + 100)    — right center
//       West edge:  (x*200, y*200 + 100)        — left center
//    d. Sprite dimensions: 200x200 (FA tile natural size)
//       The FA tile's visible content is thin within the 200x200 frame,
//       so positioning at the edge center aligns the visible wall art correctly
// 3. For each grid vertex with corner edges:
//    a. Resolve corner FA tile ID
//    b. Place at vertex position: (x*200, y*200)
// 4. Remove sprites for cells no longer visible
```

**Sprite anchoring:** All wall sprites use `anchor.set(0.5, 0.5)` (centered). Positioning at edge midpoints assumes FA connector art is centered within the 200x200 frame. If visual testing reveals offset art, adjust the anchor per-direction. Rotated sprites (for `rotateForVertical` themes) rotate around the center anchor, keeping alignment correct.

**Sprite pool:** Same pattern as TilemapRendererV2 — Map-based tracking with `"edge-x-y-dir"` keys. Corner vertices may have multiple sprites (T-junction = corner + segment); use compound keys like `"corner-x-y-primary"` and `"corner-x-y-secondary"`. Off-screen sprites destroyed, new sprites created for newly visible cells.

**Performance:** A 40x30 area with typical building coverage (~20% wall perimeter) generates roughly 150-250 edge sprites + 30-50 corner sprites. This is comparable to the current tile layer sprite count and well within the sprite pool's capacity.

### Migration in PixiApp.jsx

The existing `renderV2Layer(wallsContainer, zone.layers.walls, ...)` call is **removed**. The `wallsContainer` is replaced by the `WallRenderer` instance. The WallRenderer's `render(cameraBounds)` is called in its place during the ticker loop. No solid-fill wall tiles are rendered — only edge sprites.

### Layer Order in PixiApp

```
world container
  ├── floor    (TilemapRendererV2)
  ├── walls    (WallRenderer)          ← replaces old walls TilemapRendererV2 layer
  ├── props    (TilemapRendererV2)
  ├── roof     (RoofLayer)
  ├── grid     (GridOverlay)
  ├── tokens   (TokenLayer)
  ├── fog      (FogOfWar)
  └── exits    (ExitRenderer)
```

---

## Collision Changes

### Edge-Based Pathfinding

**Current:** `collision[y * width + x] === 1` means the cell is blocked. A* rejects moves into blocked cells.

**New:** `wallEdges[(y * width + x)]` stores edge bits. A* checks the edge between current and target cell:

```javascript
function canMove(fromX, fromY, toX, toY, wallEdges, width) {
  const fromIdx = fromY * width + fromX
  const dx = toX - fromX
  const dy = toY - fromY

  if (dy === -1) return !(wallEdges[fromIdx] & 0x1)  // Moving north: check north bit
  if (dx === 1)  return !(wallEdges[fromIdx] & 0x2)  // Moving east: check east bit
  if (dy === 1)  return !(wallEdges[fromIdx] & 0x4)  // Moving south: check south bit
  if (dx === -1) return !(wallEdges[fromIdx] & 0x8)  // Moving west: check west bit
  return true
}
```

**Door edges** (bits 4-7) are treated as passable for movement — doors don't block.

**Props/furniture** still use cell-based collision from the props layer. The collision check becomes: `canMove(edge check) AND target cell not blocked by props`.

### `buildCollisionFromEdges(wallEdges, propsLayer, palette, blockingSet, width, height)`

Replaces the current `buildCollisionLayer`. Returns a structure that pathfinding can query:

```javascript
{
  wallEdges: Uint8Array,    // edge-based wall collision
  cellBlocked: Uint8Array,  // cell-based prop collision (0 = free, 1 = blocked)
}
```

A* neighbor check: `canMove(fromX, fromY, toX, toY, wallEdges, width) && !cellBlocked[toY * width + toX]`

### Pathfinding API Migration

The current `findPath(collision, width, height, start, end)` signature changes to:

```javascript
findPath(collisionData, width, height, start, end)
// where collisionData = { wallEdges: Uint8Array, cellBlocked: Uint8Array }
```

The internal neighbor check changes from `collision[ny * width + nx] === 0` to the combined edge + cell check above. The return value (path array or null) stays the same.

**Callers to update:** `GameV2.jsx` (click-to-move), combat movement, NPC pathfinding. All pass the new `collisionData` object instead of the flat `collision` Uint8Array.

### Multi-Cell Door Behavior

When adjacent door cells share an edge (e.g., a 2-wide door), the algorithm produces no edge between them (both are wall-layer cells). This is correct — the door visual renders only on edges facing non-wall cells (the passable faces). A 2-wide door at cells (4,7) and (5,7) renders door sprites on their south edges (facing the exterior), and no sprite between them. Players walk through either cell's south edge.

---

## Build-Time Integration

### In `areaBuilder.js` — `buildAreaFromBrief(brief, seed)`

After the existing pipeline (stamp chunks, connect roads, fill terrain), add:

```
Step 8 (new): Extract wall edges
  wallEdges = extractWallEdges(layers.walls, layers.floor, palette, DOOR_SET, width, height)

Step 9 (modified): Build collision
  collision = buildCollisionFromEdges(wallEdges, layers.props, palette, BLOCKING_SET, width, height)
```

The `wallEdges` Uint8Array is stored on the area object:

```javascript
return {
  ...existingAreaFields,
  wallEdges,      // Uint8Array
  wallTheme: brief.theme || 'village',
}
```

### On area load (from Supabase or store)

`wallEdges` is **not stored** in Supabase — it's re-derived from the walls layer on load. This keeps storage unchanged and ensures the edge data always matches the walls layer.

```javascript
// In activateArea or loadArea:
const wallEdges = extractWallEdges(area.layers.walls, area.layers.floor, area.palette, DOOR_SET, area.width, area.height)
area.wallEdges = wallEdges
```

---

## File Structure

```
src/lib/wallEdgeExtractor.js    — extractWallEdges() pure function
src/lib/wallAutotile.js         — WALL_STYLES, resolveWallTile(), resolveCornerTile()
src/engine/WallRenderer.js      — PixiJS wall sprite renderer
src/lib/pathfinding.js          — MODIFY: edge-based canMove, updated A*
src/lib/areaBuilder.js          — MODIFY: add wall edge extraction step
src/engine/PixiApp.jsx          — MODIFY: add WallRenderer layer
```

---

## What Stays Unchanged

- **Chunk format** — walls layer remains cell-fill Uint16Array
- **TilemapRendererV2** — still renders floor, props, roof layers
- **Camera system** — no changes needed
- **Area storage** — wallEdges derived on load, not stored
- **Multiplayer sync** — no new broadcast events
- **Combat system** — unchanged (uses same pathfinding)
- **Fog of war / roof reveal** — unchanged

## Not In Scope

- **Diagonal walls** — FA has diagonal tiles, but edge model is 4-directional only. Future enhancement.
- **Diagonal movement collision** — Current A* uses 4-directional movement only. If diagonal movement is added later (common in D&D 5e), the edge-based model needs a corner-crossing check: moving diagonally through a vertex where two walls meet should be blocked. This is a known limitation.
- Interior wall decorations (sconces, windows — props layer)
- Wall destruction/damage states
- Wall height/elevation rendering
