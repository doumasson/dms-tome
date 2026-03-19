# DM's Tome V2 — Complete Frontend Rebuild Design Spec

## Overview

DM's Tome V2 is a complete frontend rebuild transforming the current web-app-style D&D game into an immersive top-down RPG with a proper game engine, tilemap rendering, interconnected zone-based world exploration, and an ornate dark fantasy UI inspired by Icewind Dale / Infinity Engine aesthetics.

The backend (Supabase auth, Realtime sync, campaign storage) and game logic (Zustand store, combat system, AI DM integration) are preserved. The rendering layer and UI are rebuilt from scratch.

---

## Architecture

### Three-Layer Stack

```
┌──────────────────────────────────┐
│        Browser Viewport          │
│                                  │
│  ┌────────────────────────────┐  │
│  │   PixiJS Canvas (WebGL)    │  │
│  │  - Tilemap rendering       │  │
│  │  - Character sprite tokens │  │
│  │  - Lighting/fog effects    │  │
│  │  - Grid overlay            │  │
│  │  - Exit zone highlights    │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  React Overlay (HTML/CSS)  │  │
│  │  - Ornate HUD (bottom bar) │  │
│  │  - Zone label              │  │
│  │  - Narrator float          │  │
│  │  - Combat action palette   │  │
│  │  - Modals (inventory, etc) │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Zustand Store (preserved) │  │
│  │  - Combat, characters, sync│  │
│  │  - Drives BOTH layers      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

- **PixiJS** renders the game world (tilemaps, tokens, effects, grid) on a WebGL canvas
- **React** renders the HUD overlay on top as HTML/CSS (ornate bottom bar, floating elements, modals)
- **Zustand** is the bridge — both layers read/write the same store
- **Supabase Realtime** sync is unchanged — broadcasts combat, tokens, narrator, scene changes

### Why PixiJS (not Phaser)

- Game logic already lives in Zustand — Phaser would duplicate it
- React needed for HUD/chat/modals — PixiJS integrates cleanly with React (`@pixi/react`), Phaser fights for control
- Tilemap rendering + sprite compositing are native PixiJS capabilities
- Smaller bundle (~200KB vs ~1MB), more control, less framework wrestling

### New Dependencies

- `pixi.js` v8 — WebGL 2D renderer (latest stable)
- `@pixi/react` v8 — React integration for PixiJS v8 (confirmed compatible)
- `@pixi/tilemap` — Tilemap rendering extension (or custom CompositeTilemap)

> **Note:** If `@pixi/react` v8 proves unstable, fall back to a thin custom wrapper: a React ref holding a PixiJS `Application` instance, with `useEffect` syncing Zustand state → Pixi stage. This is ~50 lines of glue code.

---

## Zustand Store V2 Schema

The V1 store is scene-list-based (`campaign.scenes[]`, `currentSceneIndex`). V2 replaces this with a zone graph model. The store is **evolved, not rewritten** — combat, character, inventory, and multiplayer logic are preserved. Only the world-navigation slice changes.

### Removed State (V1 → V2)

- `campaign.scenes[]` → replaced by `campaign.zones{}`
- `campaign.currentSceneIndex` → replaced by `currentZoneId`
- `sceneImages{}` → removed (tilemap rendering replaces AI images)
- `sceneTokenPositions{}` → rekeyed to `zoneTokenPositions{}` (by zone ID)

### New State

```js
// World navigation
currentZoneId: 'inn-bar',           // Active zone ID
visitedZones: new Set(['town-square', 'inn-bar']),  // Fog of exploration
zoneTokenPositions: {               // Rekeyed from sceneTokenPositions
  'inn-bar': { 'player-1': { x: 5, y: 7 }, ... },
},

// Campaign structure (replaces scenes[])
campaign: {
  ...existingFields,
  zones: {                          // Map<zoneId, ZoneData>
    'inn-bar': { id, name, type, tags, width, height, layers, npcs, exits, lighting, ambience },
    'town-square': { ... },
  },
  startZone: 'town-square',        // Entry point for new campaigns
  questObjectives: [...],           // Campaign-level quest tracking
}
```

### Migration Path

- Existing V1 campaigns with `scenes[]` are playable but won't use the zone system — they fall back to the legacy linear flow until re-generated
- New campaigns use the zone graph format exclusively
- `fogEnabled` / `fogRevealed` rekey from scene index to zone ID (same data structure, different keys)

### Multiplayer: Zone Transitions

**All players move together as a party.** When any player clicks an exit door:

1. A `zone-transition` broadcast is sent: `{ type: 'zone-transition', targetZone: 'town-square', entryPoint: { x: 5, y: 0 } }`
2. All clients receive it, transition to the new zone, place all tokens at the entry point
3. `currentZoneId` updates in all clients
4. During combat, exits are disabled (cannot leave zone mid-fight)

This is a new Realtime message type added to the existing `encounter:${campaignId}` channel.

---

## World Structure: Zone Graph

### Concept

A campaign is not a linear list of scenes — it's a **connected graph of zones**. Each zone is a self-contained room/area with its own tilemap, NPCs, props, and exits to other zones.

```
Campaign World
├── Town Square (outdoor)
│   ├── → The Weary Traveler Inn
│   │     ├── → Bar Room
│   │     ├── → Kitchen
│   │     └── → Upstairs Rooms
│   ├── → Blacksmith
│   ├── → Market Stalls
│   └── → Forest Path
│         ├── → River Crossing
│         └── → Goblin Cave
│               ├── → Entrance
│               ├── → Guard Room
│               └── → Boss Chamber
```

### Navigation

- **Exits are doors/arrows on the room edges** — walk near a door, it glows with the destination name, click to transition
- **No world map, no breadcrumb** — doors are the only navigation. Zone name displayed in the top-left HUD label
- **Zone transitions** fade the map (crossfade or brief black), load the next zone's tilemap, place tokens at entry point

### Zone Data Format

```json
{
  "id": "inn-bar",
  "name": "The Weary Traveler Inn",
  "type": "tavern",
  "tags": ["safe", "indoor"],
  "width": 12,
  "height": 10,
  "layers": {
    "floor": [[1,1,1,...], ...],
    "walls": [[5,5,0,...], ...],
    "props": [[0,0,42,...], ...]
  },
  "npcs": [
    {
      "name": "Greta",
      "role": "bartender",
      "personality": "gruff but kind, knows local rumors",
      "position": { "x": 6, "y": 2 },
      "questRelevant": true
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

### Three Tile Layers

1. **Floor** — wood planks, stone, dirt, grass (walkable)
2. **Walls** — structural walls with auto-tiling (corners, T-junctions computed from neighbors)
3. **Props** — furniture, barrels, decorations (some walkable, some blocking)

---

## Tilemap System

### Tileset Pipeline

- **One primary free tileset** (Forgotten Adventures recommended) for visual consistency
- PNG spritesheets — floors, walls, furniture, doors, props
- **Tile size: 32x32 pixels** (decided — standard VTT size, good balance of detail and performance)
- PixiJS loads spritesheet once, renders tiles by index

**Tile Atlas Format:**

Each tileset ships as a PNG spritesheet + JSON atlas manifest:

```json
{
  "tileSize": 32,
  "categories": {
    "floors": {
      "wood_planks": [0, 1, 2, 3],
      "stone": [4, 5, 6, 7],
      "dirt": [8, 9],
      "grass": [10, 11, 12, 13]
    },
    "walls": {
      "stone": {
        "top": 20, "bottom": 21, "left": 22, "right": 23,
        "corner_tl": 24, "corner_tr": 25, "corner_bl": 26, "corner_br": 27,
        "t_top": 28, "t_bottom": 29, "t_left": 30, "t_right": 31,
        "cross": 32, "end_top": 33, "end_bottom": 34, "end_left": 35, "end_right": 36
      }
    },
    "props": {
      "table_round": 40, "table_rect": 41, "chair": 42,
      "barrel": 43, "crate": 44, "bookshelf": 45,
      "bed": [46, 47], "fireplace": [48, 49],
      "door_closed": 50, "door_open": 51, "stairs_up": 52, "stairs_down": 53
    }
  },
  "blocking": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 43, 44, 45, 50]
}
```

The `blocking` array defines which tile indices are impassable — used to build the walkability grid for pathfinding.

**Auto-tiling for walls — 4-bit bitmask:**

Each wall tile checks its 4 cardinal neighbors (N/S/E/W). The 4-bit mask (0-15) maps to the correct tile variant:
- Bit 0 = north neighbor is wall, Bit 1 = east, Bit 2 = south, Bit 3 = west
- `0b0000` (isolated) = pillar, `0b1111` (all) = cross, `0b1010` (N+S) = vertical, etc.
- 16 variants per wall type, standard in tilemap engines

### Map Generation: Hybrid Phased Approach

**Phase 1 — Room Templates (ship first)**
- Hand-design 20-30 room templates covering common zone types:
  - Tavern: bar room, kitchen, sleeping quarters
  - Shops: blacksmith, general store, magic shop
  - Residential: peasant home, noble manor
  - Outdoor: town square, forest clearing, road, bridge
  - Dungeon: entrance, corridor, guard room, boss chamber, treasure room
  - Cave: natural cavern, underground river, mine shaft
  - Temple: main hall, crypt, altar room
- Each template is a pre-designed tilemap (layers + prop positions)
- AI picks which template fits the zone type, then populates NPCs/items/quest hooks

**Phase 2 — Procedural Generation (add variety)**
- BSP (Binary Space Partitioning) algorithm for dungeon layouts
- Generates room shapes, corridors, door placements algorithmically
- Uses the same tileset sprites, just arranged procedurally
- Best for: dungeons, caves, mines — anywhere repetition is thematic

**Phase 3 — AI Enhancement**
- AI-generated character portraits for PCs and named NPCs
- Ambient lighting effects on tilemap (torch glow, shadows via PixiJS filters)
- Existing ambient audio system wired to zone type tags

### Campaign Generation Flow

1. Player clicks "Generate Campaign" (provides title, tone, complexity)
2. Claude outputs a **world graph JSON** matching this format:

```json
{
  "title": "The Crimson Hollow",
  "startZone": "village-square",
  "questObjectives": [
    { "id": "q1", "name": "Investigate the disappearances", "status": "active" }
  ],
  "zones": [
    {
      "id": "village-square",
      "name": "Millhaven Village Square",
      "type": "town_square",
      "tags": ["safe", "outdoor"],
      "npcs": [
        { "name": "Elder Maren", "role": "quest_giver", "personality": "worried elder, desperate for help", "questRelevant": true }
      ],
      "exits": [
        { "targetZone": "tavern-main", "label": "The Rusty Flagon", "direction": "east" },
        { "targetZone": "forest-edge", "label": "Forest Path", "direction": "north" }
      ],
      "ambience": "town"
    }
  ]
}
```

3. **Template matching** (deterministic, client-side): each zone's `type` field maps to a room template via a lookup table (`town_square` → `templates/town_square_01.json`). If multiple templates exist for a type, one is chosen randomly (seeded by zone ID for determinism).
4. The template provides `layers` (floor/walls/props tilemap data) and `width`/`height`. NPC and exit `position` fields are filled from template-defined spawn points (e.g., "bartender_position", "exit_south").
5. The merged zone data (template tiles + AI narrative) is stored in `campaign.zones{}` in Zustand and persisted to Supabase.
6. Party spawns in `startZone`.

---

## UI/UX Design: Ornate Dark Fantasy HUD

### Design Philosophy

- **Game-first**: Map fills the entire viewport. All UI is overlay/HUD.
- **Icewind Dale / Infinity Engine aesthetic**: Ornate SVG filigree, jeweled corners, scrollwork borders, dark backgrounds
- **No sidebars, no admin panels**: Everything is a minimal overlay or slides out on demand
- **Two modes**: Exploration and Combat — same map, HUD transforms

### Visual Identity (replaces V1 palette from CLAUDE.md)

V1 used `#d4af37` as primary gold. V2 shifts the entire palette darker and cooler:

- **Primary gold**: `#c9a84c` — ornament color, borders, decorative elements
- **Bright gold**: `#eedd88` — active/important text with subtle text-shadow glow
- **Muted gold**: `#8a7a52` — inactive portrait frames, secondary ornaments
- **Background**: `#08060c` to `#14101c` — near-black with cool purple undertone (V1 was warm brown)
- **Panel background**: `rgba(10,8,14,0.95)` — session log, modals
- **Text primary**: `#bba878` — body text (brighter than V1)
- **Text muted**: `#5a4a30` — timestamps, secondary info
- **Player colors**: class-specific — `#4499dd` (fighter), `#aa55bb` (sorcerer), `#44aa66` (cleric/paladin), `#cc7722` (rogue), etc.
- **Danger/combat red**: `#cc3333`
- **Fonts**: `Cinzel Decorative` for headers/labels, `Cinzel` for body, `Consolas/Monaco` for session log
- **All corners sharp** — no border-radius anywhere
- **Ornaments**: SVG filigree with jeweled terminals (gold circles with dark center cutouts), scrollwork curves, diamond accents, leaf shapes on dividers

### Layout: Bottom Bar (Always Present)

The bottom bar (~130px height) is the primary UI surface. Three sections:

**Left — Party Portraits**
- Ornate double-framed portrait cards (58x72px) with:
  - SVG overlay frame: heavy corner brackets (2.5-3px), jeweled corners, crown flourish on active player
  - HP bar at bottom of portrait
  - Level badge top-right
  - Class-color active indicator (blue top line for active player)
  - Name below in Cinzel Decorative

**Center — Session Log**
- Dark panel with jeweled corner ornaments
- LOG / CHAT tabs (gold underline on active)
- Monospace font (Consolas/Monaco), 11px
- Records all game events: zone entries, NPC conversations, spell casts, dice rolls, combat actions
- Color-coded: player names in class colors, locations in gold, actions in muted tones, damage in red, hits in green
- Format: `[time] [Player] [action] [target] — [roll] [result] [damage]`

**Right — Action Area**
- Exploration: 5 tool buttons (Dice, Character Sheet, Inventory, Rest, Settings) with ornate SVG corner brackets + chat input with mic and send buttons
- Combat: transforms to action palette (see Combat Mode below)

**Dividers**: Ornate SVG vertical dividers between sections — triple parallel lines, jeweled terminals, diamonds, leaf shapes, center ring ornament

**Top Border**: Full-width SVG filigree — flowing scrollwork with center jewel ornament (nested circles), flanking diamonds, wave curves, heavy corner pieces with jeweled terminals

### Exploration Mode Overlays (on map)

- **Zone label** (top-left): Ornate double-framed box with scrollwork on top/bottom edges, side curve accents, jeweled corners. Zone name in bright `#eedd88` Cinzel Decorative. Zone type + NPC count subtitle.
- **Narrator float** (bottom of map, above bar): DM speech in ornate frame with flowing vine/scroll SVG side flourishes, corner ornaments. NPC name in bright gold, speech in warm italic.

### Combat Mode

When combat triggers, the HUD transforms:

**Map changes:**
- Grid tint shifts to red (`rgba(200,50,50,0.06)`)
- Movement range highlights in blue for active player
- Enemy tokens highlighted in red

**Top of map overlays:**
- **Initiative strip** (top-center): Compact portrait row in dark container, round counter, active player highlighted
- **"YOUR TURN" banner** (top-left): Class-colored left-border accent, Cinzel serif text
- **Turn timer** (top-right): Large countdown in dark container
- **Enemy info** (right, on hover/target): Name, HP bar, AC, conditions. Red left-border accent.
- **Narrator** shrinks to small floating text above the bottom bar

**Bottom bar transforms:**
- Top filigree accent line shifts from gold to red
- Corner accents shift to red
- **Right section becomes Action Palette:**
  - Primary row: ATTACK (gold border), CAST (purple border), MOVE (green border) — large buttons
  - Secondary row: DODGE, DASH, HIDE, SAY — smaller buttons
  - Action economy indicators: colored squares (blue=action, orange=bonus, green=movement remaining)
  - END TURN button: red-bordered, full width

### Tokens (on PixiJS canvas)

**Player tokens:**
- Circular with class-colored border (3px)
- Portrait image center (AI-generated or placeholder)
- Name plate below
- Active player gets animated pulsing border
- Draggable: free movement in exploration, speed-limited in combat

**NPC tokens:**
- Gold border = quest-relevant, muted border = ambient
- `!` quest indicator badge on quest-relevant NPCs
- Dashed interaction radius — walk within to trigger dialogue
- Red glow for suspicious/hostile NPCs
- Speech bubbles for ambient flavor text

**Enemy tokens (combat only):**
- Red border
- HP bar visible to DM (and players after first hit, per 5e convention)

### Grid

- Always visible as subtle gold lines (exploration) or red lines (combat)
- All movement is grid-based
- Exploration: click any walkable tile to move freely
- Combat: movement range highlighted based on character speed, click within range to move

---

## Movement & Interaction

### Walkability & Pathfinding

**Walkability grid**: Derived from tile layers at zone load time. A 2D boolean array (`walkable[y][x]`) where `false` = blocked. A tile is blocked if its index appears in the tile atlas `blocking` array (walls, heavy furniture, closed doors). Props layer can also define semi-blocking tiles (tables = blocking, rugs = walkable).

**Pathfinding algorithm: A\*** with Manhattan distance heuristic.
- Grid-based, 4-directional movement (no diagonals — matches 5e standard movement)
- Exploration: no cost weighting, just walkable/blocked
- Combat: cost map supports difficult terrain (cost 2 per tile instead of 1)
- Implementation: `src/lib/pathfinding.js`, ~80 lines. Runs client-side, fast for grids up to 30x30.

### Exploration Movement
- Click any walkable tile — A* pathfinds, token animates along the path
- Walk near an NPC (within 2 tiles) — interaction radius highlights, click NPC to trigger DM prompt with NPC personality context
- Walk near an exit — door/exit glows with destination label, click to transition zones

### Combat Movement
- On turn start, flood-fill from token position to compute reachable tiles (speed / 5 = max tiles)
- Reachable tiles highlighted in blue overlay
- Click within range to move — A* path shown as preview, confirm click to execute
- Dash doubles the flood-fill range
- Difficult terrain tiles cost 2 in the flood-fill
- Opportunity attacks: tracked by checking if movement path leaves any tile adjacent to an enemy

### Exit/Door Interaction
- Exits defined as 1-3 tile ranges: `position` is the primary tile, `width` (default 1) extends horizontally or vertically based on `direction`
- Hover: glow + destination label appears on all exit tiles
- Click: `zone-transition` broadcast sent, all clients transition (see Multiplayer section)
- During combat, exit tiles are visually dimmed and non-interactive

### Zone Loading Strategy
- **Lazy-load on transition**: Only the active zone's tilemap is in memory. Adjacent zones are not preloaded.
- **Loading state**: Brief fade-to-black (300ms) during tile data assembly. The tileset spritesheet is loaded once at game start and cached — only the tile arrangement changes per zone.
- **NPC/prop state on revisit**: NPC positions and props persist in `campaign.zones[id]` for the session. If a door was opened, it stays open. If an NPC was moved, they stay moved. Resets only on campaign reload.

---

## What's Preserved from V1

- **Zustand store** — evolved, not rewritten. Combat, character, inventory, and multiplayer logic preserved. World-navigation slice replaced (see Store V2 Schema). Combat grid math (positions, movement range, spell targeting) must be updated from fixed 10x10 to variable zone dimensions.
- **Supabase integration** — auth, campaign storage, Realtime broadcast. One new message type: `zone-transition`.
- **AI DM** — Claude Haiku narration, NPC voicing, enemy AI turns, combat narration
- **TTS pipeline** — OpenAI TTS (if key) → Pollinations TTS (free, no key) → Web Speech API fallback, NPC voice hashing
- **Ambient audio** — procedural Web Audio API soundscapes, wired to zone `ambience` tag
- **D&D 5e rules** — action economy, death saves, conditions, level-up, rest system. Spell targeting geometry updated for variable grid sizes.
- **SRD data** — classes, races, spells, monsters, equipment JSON bundles
- **Campaign generation** — Claude generates campaign JSON (updated to output zone graph format — see Campaign Generation Flow)
- **Character creation** — full builder with ability scores, spells, equipment
- **Multiplayer sync** — existing broadcast patterns preserved, plus new `zone-transition` type

### Mobile Support

Mobile/tablet is **deferred to Phase 4**. The ornate bottom bar (130px, 58x72 portraits, 11px log text) is designed for desktop/laptop screens. Phase 4 will add responsive breakpoints: collapsed portrait strip, swipeable log/actions panels, larger touch targets. The game is playable on tablets in landscape but not optimized until Phase 4.

## What's Replaced

- **ScenePanel.jsx** → PixiJS tilemap renderer
- **BattleMap.jsx** → PixiJS combat map (same canvas, different mode)
- **GameLayout.jsx** → New game-first layout (fullscreen canvas + React HUD overlay)
- **All sidebar/panel layout** → Ornate bottom bar HUD
- **NarratorPanel.jsx** → Floating narrator overlay + session log in bottom bar
- **PartySidebar.jsx** → Portrait strip in bottom bar
- **ActivityLog.jsx** → Session log panel in bottom bar
- **Pollinations scene images** → Tilemap rendering (no AI image gen needed for maps)
- **Linear scene list** → Zone graph with exits

---

## Phase Plan Summary

| Phase | Deliverable | Key Work |
|-------|------------|----------|
| **1** | Tilemap renderer + HUD | PixiJS setup, tileset integration, ornate bottom bar, zone label, narrator float |
| **2** | Zone world system | Zone graph data model, exit/door interaction, zone transitions, campaign gen outputs zones |
| **3** | Combat UX overhaul | Action palette, initiative strip, movement range, turn timer, combat log integration |
| **4** | Polish | AI portraits, ambient lighting on tilemap, procedural dungeon gen, mobile responsiveness |
