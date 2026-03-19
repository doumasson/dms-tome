# DM's Tome — Project Status

> **Read this file before planning new work or assessing what exists.**
> Update this file when features are completed, changed, or added to backlog.

---

## Completed Features

### Auth & Campaign Management
- [x] Google sign-in via Supabase Auth
- [x] Campaign creation wizard (tone/theme/character slots → JSON prompt → Claude generates → import)
- [x] In-app campaign generator ("✨ Generate with AI" tab — title + tone + scene count → Claude Haiku auto-generates full campaign JSON)
- [x] Invite link copy button (📋 CODE on DM campaign card, copies `?invite=CODE` URL, 2s "✓ Copied!" confirmation)
- [x] API key sharing — DM's Claude key shared to all players via Supabase settings
- [x] Demo campaign ("Whispers in the Dark") moved from CampaignSelect to CreateCampaign step 1 as "Quick Start" card

### Scene & World
- [x] Scene viewer — full-height generated image, grid overlay always visible, draggable tokens
- [x] Free scene image gen via Pollinations.ai (fetch+retry, blob URL, no API key)
- [x] Scene transitions — 800ms crossfade between old/new scene images (two layered img elements), SceneTitleCard stays on top
- [x] Fog of war — per-scene toggle, shared party vision, host can toggle, broadcast synced
- [x] NPC tokens — scenes define `npcs:[{name,x,y,personality}]`, named tokens render with auto-generated Pollinations.ai portraits
- [x] NPC proximity interaction — approaching an NPC triggers contextual DM prompt with personality context
- [x] NPC voice/personality injection — NPC names + personalities injected into `buildSystemPrompt`, DM voices NPCs in first person
- [x] Campaign end + keep playing — `campaignComplete` flag triggers `CampaignEndModal`, "Keep Playing" generates 3 continuation scenes via Claude Haiku, appends + broadcasts `append-scenes`

### Combat System
- [x] Combat tracker — initiative order, HP, conditions, death saves, concentration tracking
- [x] Turn gating — only active player can take actions; DM can always override
- [x] 60-second turn timer — countdown in action panel, auto-advances turn at 0
- [x] Action economy enforcement — `actionsUsed`, `bonusActionsUsed`, `movementUsed` tracked per turn; UI disables spent actions; Dash doubles movement
- [x] Class-aware action menus — all 12 classes have per-class action/bonus action panels (ActionPanel.jsx), spell slots displayed
- [x] Interactive spell targeting — cone/line/sphere/single-target SVG overlays on battle map, player aims + confirms, affected tokens auto-highlighted
- [x] Spell effect persistence — concentration area spells leave persistent SVG overlays until concentration breaks; broadcast via `add-effect`; SpellEffectLayer.jsx renders
- [x] Enemy AI turns — AI + fallback auto-fires on enemy initiative; damage/conditions/narration broadcast to all clients
- [x] Saving throw broadcast — DM rolls saves, result narrated to all via broadcastNarratorMessage
- [x] Conditions enforcement — adv/disadv/auto-crit in AttackPanel; Paralyzed/Stunned auto-fail STR/DEX saves; concentration CON save auto-triggers on damage, breaks spell if failed (broadcast)
- [x] DM manual effect clear — ACTIVE EFFECTS panel in DM combat sidebar, ✕ dismiss per effect, `removeEncounterEffect` broadcasts `remove-effect`
- [x] Post-combat loot screen — auto-triggers when all enemies die; XP split, CR-based gold, 1–2 item drops

### Characters
- [x] Full character builder — race, class, background, abilities (standard array / point buy / 4d6-drop-lowest with interactive assignment), identity
- [x] Spell selection at creation — spellcasting classes pick cantrips + spells per SRD limits (StepSpells.jsx)
- [x] Level-up wizard — XP threshold triggers LevelUpModal; HP roll/average choice, features, spell slots; casters pick new spells (SpellPickPanel); Wizard/Sorcerer/etc gain +1 cantrip at levels 4 and 10
- [x] Inventory system — `inventory[]`, `equippedItems{}`, `gold`; new characters start with healing potion
- [x] Character sheet modal — two-pane: HP bar, combat stats, 9 equipment slots (drag-and-drop), Features/Spells/Skills tabs, full inventory; click portrait to open, own sheet via 🎒 button
- [x] Portable characters — CharacterCreate dual-saves to `characters` table; CharacterSelect lets players bring a character from a previous campaign (requires migration `001_character_portability.sql`)
- [x] Character profile page — "⚔ Characters" button in game header; card grid with class/race/level/HP/ability scores; "▶ Play in Campaign" button per card
- [x] Character creator overhaul — fixed-height 100vh layout, ✕ Cancel button, 4d6-drop-lowest shows all 4 dice per set (dropped die struck through in red), auto-marks lowest set as DROPPED, interactive stat assignment

### Narrator & Chat
- [x] DM narrator chat — always-inline, auto-narrates scenes, broadcasts to all players
- [x] Free-form DM prompting — players type any creative action during combat; DM AI processes it (floor system prevents simultaneous speech)
- [x] Rules Assistant — floating `?` button; Claude Haiku answers 5e rules questions with SRD context injected

### Multiplayer & Sync
- [x] Realtime multiplayer sync via Supabase broadcast (combat state, narrator messages, scene changes)
- [x] Token position sync — drag-end broadcasts position to all clients
- [x] All AI-originated state changes broadcast via `broadcastEncounterAction` and `broadcastNarratorMessage`

### Voice & Audio
- [x] OpenAI TTS — `tts-1` model, narrator voice `onyx`, NPCs get deterministic voices from `[echo, fable, alloy, nova, shimmer]` via `getNpcVoice(name)` hash
- [x] `npcVoice` stored on DM message for broadcast receivers
- [x] Fallback chain: OpenAI TTS (if key) → Pollinations TTS (free, no key, 15s rate limit for NPC voice quality) → Web Speech API
- [x] Push-to-talk voice input via Web Speech API

### Utilities
- [x] Dice roller
- [x] Loot generator (DM tool)
- [x] Notes tab
- [x] Rest system — short rest: majority-vote + per-player hit dice spending (d[hitDie]+CON mod). Long rest: full HP + spell slots + restores floor(level/2) hit dice. Host can force either rest.

---

## V2 Rebuild — In Progress

Full frontend rebuild: PixiJS tilemap renderer + ornate dark fantasy HUD. Spec: `docs/superpowers/specs/2026-03-18-dms-tome-v2-design.md`

### Phase 1: Tilemap Renderer + HUD ✅ COMPLETE
- [x] PixiJS v8 WebGL canvas rendering tilemap zones from tile atlas
- [x] Placeholder tileset (colored rectangles, replaced with real assets later)
- [x] A* pathfinding (4-directional, TDD with 5 tests)
- [x] Click-to-move token movement in exploration mode
- [x] Player + NPC tokens (colored circles, quest indicators, names)
- [x] Exit zone rendering with hover highlights
- [x] Ornate dark fantasy HUD (Icewind Dale-inspired SVG filigree)
- [x] Bottom bar: party portraits, session log (LOG/CHAT tabs), tool buttons, chat input
- [x] Zone label (top-left), narrator float (above bar)
- [x] Wired to Zustand store (portraits, log, narrator, dice/character/rest modals)
- [x] V1 fully preserved, V2 opt-in via `?v2` URL param
- Branch: `phase1/tilemap-renderer-hud` (17 commits)

### Phase 2: Zone World System ✅ COMPLETE
- [x] Zone graph data model (replaces linear scenes) — Zustand store with currentZoneId, visitedZones, zoneTokenPositions
- [x] Exit/door click → zone transition with fade-to-black visual (ZoneTransition.js)
- [x] Campaign generation outputs zone graph (Claude → 8 room templates)
- [x] Zustand store V2 schema (currentZoneId, visitedZones, zoneTokenPositions, pendingEntryPoint)
- [x] Multiplayer zone-transition broadcast (bidirectional with entryPoint)
- [x] Exits blocked during combat
- [x] API key settings wired in V2 (was broken, blocking AI features)
- Room templates: tavern_bar, tavern_kitchen, town_square, dungeon_room, dungeon_corridor, forest_clearing, cave, throne_room

### Phase 3: Combat UX Overhaul ✅ COMPLETE
- [x] Action palette (Attack/Cast/Move/Dodge/Dash/Hide)
- [x] Initiative strip (top-center portrait row)
- [x] Movement range highlights (flood-fill from token)
- [x] Combat action wiring (attack resolution, enemy AI turns)
- [x] Grid tint shift (gold → red in combat)

### V2 Front Door ✅ COMPLETE
- [x] API key gate (full-screen blocker, encrypted DB storage via Web Crypto, no localStorage)
- [x] Campaign bar (name, player count, invite link copy, settings, leave)
- [x] Input/output sanitization for AI narrator (prompt injection + XSS)
- [x] HUD button labels (DICE, CHAR, PACK, REST)
- [x] Session log polish (chat-first, auto-scroll, DM/player message alignment)
- [x] Test combat button fix (fallback character, error handling, ornate styling)
- [x] resetCampaign store action (full state cleanup on leave)
- [x] Non-DM refresh recovery (request-api-key broadcast)

### NPC Interaction System ✅ COMPLETE
- [x] E-key universal interaction (NPCs, exits)
- [x] NPC click detection in PixiApp
- [x] Interaction controller (adjacency, hint resolution)
- [x] NPC chat bubbles (HTML overlays, story-flag-driven hints)
- [x] NPC dialog box (ornate overlay, AI conversation)
- [x] Critical story cutscene (full-screen, freezes party, silhouettes)
- [x] Story flags system (Zustand slice, broadcast sync)
- [x] Player journal (parchment scroll modal, auto-populated)
- [x] Shared NPC conversation component (prompt counting, hard limits)
- [x] Campaign generator + demo world updated with new NPC schema
- [x] Multiplayer broadcast (dialog lock, cutscene sync, flag sync, journal sync)

### Phase 5: Procedural Map System ✅ COMPLETE (core modules)
- [x] FA Asset Scanner (`scripts/assets/scan.js`) — parses FA zip files into manifest
- [x] Sprite Atlas Builder (`scripts/assets/build.js`) — bin-packing + Sharp compositing
- [x] RLE Codec (`src/lib/rleCodec.js`) — layer compression for Supabase storage
- [x] Camera Controller (`src/engine/Camera.js`) — WASD/arrow pan, scroll zoom, inertia, spacebar recenter
- [x] Viewport Culler (`src/engine/ViewportCuller.js`) — skip off-screen tiles
- [x] TileAtlasV2 (`src/engine/tileAtlasV2.js`) — multi-atlas tile resolver with integer palette
- [x] Binary Heap A* (`src/lib/pathfinding.js`) — <1ms on 120x80 grid, Uint8Array collision
- [x] Chunk Library (`src/lib/chunkLibrary.js`) — tag-based matching for reusable map pieces
- [x] Map Generator (`src/lib/mapGenerator.js`) — position resolver, chunk stamping, terrain fill
- [x] BSP Dungeon Generator (`src/lib/dungeonGenerator.js`) — rooms, corridors, doors
- [x] 5e Vision Calculator (`src/lib/visionCalculator.js`) — darkvision, light sources, bitfield persistence
- [x] Fog of War Renderer (`src/engine/FogOfWar.js`) — three-state (unexplored/explored/active)
- [x] Roof Manager (`src/engine/RoofLayer.js`) — building reveal state, door detection
- [x] Zustand Area State — area slice in store alongside zone state
- [x] Camera + Fog + Roof + Combat Camera wired into PixiApp/GameV2
- 117 tests, all passing. 18 commits on branch.

### Phase 5b: Procedural Area System ✅ COMPLETE
- [x] Run FA asset scanner on all 3 zip packs → 146,868 assets with author/license tracking
- [x] Build sprite atlases from manifest → 8 atlases in `public/tilesets/` (3,200 starter tiles, ~22MB WebP)
- [x] Create first curated chunks — tavern, house, clearing, road, dungeon room (`src/data/chunks/`)
- [x] Build test area and load in dev mode — `?testarea` renders 40x30 village with FA tiles + camera
- [x] V2 atlas renderer wired into PixiApp (200px FA tiles, camera pan/zoom, viewport culling)
- [x] V1 rendering path removed — all areas use V2 pipeline only
- [x] `areaBuilder.js` — full `buildAreaFromBrief()` pipeline (chunk matching, palette remapping, collision, NPCs, exits)
- [x] `areaStorage.js` — RLE + base64 encode/decode, Supabase save/load/removeBrief
- [x] `campaignGenerator.js` rewritten — outputs area briefs instead of zone graph
- [x] Zone state removed from Zustand store — replaced by area state (`areas`, `areaBriefs`, `activateArea`, etc.)
- [x] `demoArea.js` replaces `demoWorld.json` — brief-based demo village
- [x] Exit-proximity pre-generation — builds upcoming areas when player within 5 tiles, saves to Supabase
- [x] Area transition handler — on-demand build from briefs, `broadcastAreaTransition`
- [x] Multiplayer area sync — broadcast listeners for area transitions, token moves, fog, roof state
- [x] Dead code cleanup — removed `demoWorld.json`, `roomTemplates/`, `broadcastZoneTransition`, V1 rendering
- Spec: `docs/superpowers/specs/2026-03-19-phase5b-procedural-areas-design.md`

### Phase 6: Polish
- [ ] AI character portraits for PCs/NPCs
- [ ] Ambient lighting on tilemap (torch glow, shadows)
- [ ] Mobile/tablet responsive breakpoints

---

## V1 — In Progress (legacy, preserved)

- [ ] Nano Banana / Deevid integration — waiting on API details from user's brother

---

## Backlog / Wanted
_(Add ideas and future features here. Prioritize by moving items up.)_

_(Empty — add items as they come up)_

---

## Recently Changed

- **2026-03-18:** Phase 1 V2 rebuild complete — PixiJS tilemap renderer + ornate HUD on branch `phase1/tilemap-renderer-hud`. V1 untouched, V2 opt-in via `?v2`.
- **2026-03-18:** Phases 2 & 3 complete — zone transitions with fade, 8 room templates, zone-based campaign gen, combat UX, API key fix. Branch has 46 commits ahead of main.
- **2026-03-18:** V2 Front Door complete — API key gate, campaign bar, sanitization, HUD labels, session log polish, combat fix. 6 new commits.
- **2026-03-18:** NPC Interaction System complete — E-key interactions, chat bubbles, NPC dialog, story cutscenes, journal, story flags. 10 commits.
- **2026-03-19:** Phase 5 Procedural Map System core modules complete — 18 tasks: asset pipeline, camera, tile atlas, pathfinding upgrade, chunks, generators, vision, fog, roofs, wiring. 117 tests, 18 commits.
- **2026-03-19:** Phase 5b integration started — FA scanner with author/license tracking, 8 sprite atlases built (146K assets → 3,200 starter tiles), 5 curated chunks, test area visible at `?v2&testarea`.
- **2026-03-19:** Phase 5b procedural area system complete — zones replaced by areas, areaBuilder pipeline, areaStorage, campaign generator rewrite, multiplayer sync, V1 removal, dead code cleanup. 12 tasks.
