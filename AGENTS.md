# DM's Tome — AGENTS.md (Codex / Multi-Agent Context)

## What This Project Is
A browser-based D&D 5e multiplayer RPG where the AI is the Dungeon Master. Players explore a PixiJS tilemap world, fight enemies in turn-based combat, interact with AI-powered NPCs, and progress through procedurally generated campaigns.

## Tech Stack
- React + Vite, Zustand (client state)
- PixiJS v8 (WebGL tile rendering, 200px tiles)
- Supabase (auth, PostgreSQL, Realtime broadcast)
- Claude API (AI Dungeon Master)
- Web Audio API (procedural sound effects)

## Asset Pipeline
The game uses 200×200px tile sprites packed into 8 sprite atlases (WebP format). Assets are organized by category: floors, walls, structures, props-furniture, props-decor, props-craft, terrain, effects.

### Current Assets (Forgotten Adventures — licensed, not owned)
- 3,199 tiles across 8 atlases in `public/tilesets/`
- Scanned from FA ZIP packs via `scripts/assets/scan.js`
- Built into sprite sheets via `scripts/assets/build.js`
- Manifests: `public/tilesets/atlas-*.json`

### Asset Naming Convention
Tile IDs follow: `atlas-{category}:{descriptive_name}`
Example: `atlas-floors:brick_floor_01_d1`, `atlas-walls:stone_wall_connector_a1`

### Sprite Sheet Format
Each manifest entry: `{ x, y, w, h, gw, gh }` — pixel coordinates in the sprite sheet + grid dimensions. Standard tile = 200×200px (gw:1, gh:1).

## Directory Structure
```
scripts/assets/     — Asset scanner + atlas builder
public/tilesets/    — Compiled sprite atlases (WebP + JSON)
src/engine/         — PixiJS rendering (PixiApp, TokenLayer, WallRenderer, etc.)
src/data/chunks/    — 36 curated tilemap chunks (buildings, rooms, terrain)
src/lib/            — Game logic (areaBuilder, pathfinding, combat, etc.)
src/hud/            — UI components (BG2-inspired dark fantasy theme)
src/store/          — Zustand state management
```

## Visual Style
Dark fantasy, Baldur's Gate 2 / Icewind Dale inspired. Gold accents (#c9a84c), deep brown/black backgrounds, sharp angular UI, stone/metal textures, ornate SVG filigree.

## For Asset Generation Tasks
When generating new tile assets:
- Output size: 200×200px (1x1 grid) or 400×400px (2x2) etc.
- Transparent PNG format
- Top-down perspective (bird's eye view, ~45° isometric lean)
- Dark fantasy art style matching existing FA tiles
- No text, no borders, no watermarks
- Tile-friendly: edges should be seamless for repeating patterns (floors) or have clean cutoffs (props)

### Wall Tiles Need Directional Variants
For wall tiles, generate 4 oriented versions:
- `_north` — wall segment facing north (horizontal, top of cell)
- `_south` — wall segment facing south (horizontal, bottom of cell)
- `_east` — wall segment facing east (vertical, right of cell)
- `_west` — wall segment facing west (vertical, left of cell)

### Floor Tiles Should Be Seamless
Floor textures should tile seamlessly in all directions.

### Prop Tiles Need Transparency
Props (furniture, decor, etc.) should have transparent backgrounds so they overlay on floor tiles.
