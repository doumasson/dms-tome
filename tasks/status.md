# DM's Tome — Project Status

> **Read this file before planning new work or assessing what exists.**
> Update this file when features are completed, changed, or added to backlog.

---

## Completed Features

### Auth & Campaign Management
- [x] Discord sign-in via Supabase Auth
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
- [x] Saving throw proficiency — class-based save proficiencies applied to concentration checks, AoE spell saves, and trap saves (per 5e SRD: +2 at L1, +3 at L5, etc.)
- [x] Skill check proficiency — proficiency bonus applied to skill checks based on character's skill list; expertise support (double proficiency); proficiency/expertise displayed in SkillCheckPanel UI
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

### Phase 5c: Wall Rendering + Roof-Lift ✅ COMPLETE
- [x] Inner-edge-only FA connector walls (3 sprites per edge, no gaps)
- [x] Edge-based collision (walk up to wall line, not blocked by full cell)
- [x] Door positioning on inner wall boundary
- [x] Per-building consistent texture variants via regionMap
- [x] Roof-lift buildings with tag-based tiles (hay/slate/tile)
- [x] 400ms roof fade animation, door-triggered reveal
- [x] Multiplayer roof broadcast + session persistence

### Phase 6: Combat System V2 ✅ COMPLETE
- [x] Enemy placement in areaBuilder pipeline
- [x] Enemy tokens on tilemap (red tint, HP bars in combat)
- [x] Encounter zone proximity detection + AI DM prompt
- [x] `getReachableTilesEdge` with terrain cost + enemy blocking
- [x] Combat movement on tilemap with speed limits
- [x] Click-to-target attack resolution (melee + ranged, Chebyshev distance)
- [x] AoE spell targeting (sphere/cone/line/cube) with save resolution
- [x] Skill check panel with modifier toggles (Guidance, Bardic Inspiration)
- [x] Condition enforcement gating action bar (Stunned, Paralyzed, etc.)
- [x] Grunt enemy AI (pathfinding) + boss Claude API tactical decisions
- Spec: `docs/superpowers/specs/2026-03-19-combat-system-v2-design.md`

### Phase 7: Polish + Infrastructure ✅ COMPLETE
- [x] Fog of war wired with vision calculation + broadcast
- [x] Session persistence — fog explored + roof reveal state survive page refresh
- [x] AI DM map awareness — player position + buildings in system prompt
- [x] Multiplayer token animation (path broadcast, smooth movement)
- [x] 6 new curated chunks (blacksmith, temple, shop, market stall, guard tower, well — 11 total)
- [x] Ambient lighting with warm glow around fire sources

### Phase 8: Polish ✅ MOSTLY COMPLETE
- [x] Character portrait selection UI — manifest-based picker modal, race+archetype filtering, DiceBear fallback
- [x] Mobile/tablet responsive breakpoints — drawer pattern on phone, shrink on tablet
- [x] Opportunity attacks — path pre-scan, styled confirm popup, disengage action, reaction tracking
- [x] Cover mechanics — Bresenham ray-cast, wall edge + prop cover, furniture = difficult terrain in combat
- [x] Brief-driven area sizing — POI count determines area dimensions (40x30 to 120x90)
- [x] Multi-floor buildings — stair exits linking area briefs, campaign generator updated
- [x] Larger area generation — 11 new curated chunks (22 total), scatter fill, edge padding, overlap detection
- [x] Dungeon area generation — BSP + chunk matching + procedural fill hybrid, 4 theme variants
- [ ] Pitched roof visuals (BLOCKED: pending slope/edge FA assets)
- Spec: `docs/superpowers/specs/2026-03-19-phase8-polish-design.md`

### Phase 9: Gameplay Systems ✅ COMPLETE
- [x] Inventory grid rewrite — spatial bitmap packing, clean drag-drop (no swap), weight/encumbrance enforcement
- [x] Magic item system — 38 items, modifiers, attunement (3 slots max), cursed items, charges with dawn recharge
- [x] Derived stats — AC/attack/damage/saves computed from base + equipment + attunement (never stored flat)
- [x] Loot tables — CR-based gold/magic item tables, data-driven JSON (swappable for custom universes)
- [x] Post-combat loot overhaul — gold auto-split, magic item roll-off with proficiency eligibility filter
- [x] Attunement UI — diamond slots, attune/un-attune buttons, cursed lock, charge counters
- [x] Death save UI in V2 — dying portrait pulse, death save panel, stabilize, heal revival (full HP)
- [x] Rest system — short/long popover, mandatory hit dice spending, long rest blocked in dungeons/caves
- [x] Gold persistence fix — atomic claimCombatRewards action eliminates race condition
- [x] Day/night cycle — game clock, PixiJS tint filter (dawn/day/dusk/night), HUD clock, AI DM time awareness
- [x] 14 new curated chunks — cave rooms, sewers, crypts, wilderness, town buildings, multi-room inns (36 total)
- [ ] Pitched roof visuals (BLOCKED: pending slope/edge FA assets)
- 196 tests passing (0 failures), 13 commits.
- Spec: `docs/superpowers/specs/2026-03-19-phase9-gameplay-systems-design.md`

### Bug Fixes & Technical Debt ✅ COMPLETE
- [x] LootScreen wired into V2 — combat rewards now display
- [x] 6 missing broadcast handlers added — multiplayer combat fully synced
- [x] LevelUpModal wired into V2 — level progression works
- [x] 7 stale test failures removed (old zone/campaign tests deleted)
- [x] useStore.js split into 6 domain slices (1,784→20 lines orchestrator)
- [x] GameV2.jsx split into 8 hooks + 2 components (1,430→372 lines)
- [x] Bundle size reduced 41% via lazy loading (1,671→980 kB)
- 196 tests, 0 failures. Build 458ms.

### Phase 10: Living World ✅ COMPLETE
- [x] Shop/merchant system — template stock + AI specials, buy/sell at 50%, gold-based economy
- [x] Minimap — HTML5 Canvas overlay, fog-aware, token dots, click-to-pan
- [x] Status effect visuals — condition tint dots + concentration rings on combat tokens
- [x] Ambient sound — theme-based audio, combat crossfade, mute toggle
- [x] NPC schedules — time-of-day animated pathfinding movement between POIs
- [x] Trap system — 5 trap types, passive detection, auto-placed in dungeons, revealed trap rendering
- [x] Weather system — rain/snow/fog/storm particles, vision range reduction, Markov transitions
- [x] Party formation — front/back marching order, drag-to-configure panel
- [x] Quest tracker — journal integration, objective checklists, AI DM quest awareness, HUD indicator
- [ ] Pitched roof visuals (BLOCKED: pending slope/edge FA assets)
- 252 tests, 0 failures, 15 commits.
- Spec: `docs/superpowers/specs/2026-03-20-phase10-living-world-design.md`

### Combat & Interaction Fixes
- [x] Grapple action — contested Athletics check, applies Grappled condition (speed 0), tracks grappler
- [x] Shove action — contested Athletics check, pushes target 5ft or knocks Prone
- [x] Contested check module (`src/lib/contestedCheck.js`) — attacker Athletics vs defender Athletics/Acrobatics
- [x] GRPL/SHOV buttons in CombatActionBar, adjacent-only targeting, multiplayer broadcast
- [x] Chest/search/pickpocket loot items now added to player inventory (was narrated but not stored)
- [x] Hide action — Stealth check, success grants Hidden condition (attacks have disadvantage); attacking breaks Hidden
- [x] Help action — select adjacent enemy, grants advantage on next ally attack (consumed on use)
- [x] Use Item action — ConsumablePickerModal shows inventory consumables, costs action, heals/applies effect, broadcast
- [x] HDE/HELP/USE buttons in CombatActionBar with action economy enforcement

### Class Ability Implementation
- [x] **Extra Attack** — wired for Fighter (×2/×3/×4), Barbarian (×2), Monk (×2), Paladin (×2), Ranger (×2) using `getExtraAttacks()` + existing multi-hit loop
- [x] **Fighter: Second Wind** — heal 1d10+level as bonus action, resource tracked
- [x] **Fighter: Action Surge** — restores action use mid-turn, free action, resource tracked
- [x] **Barbarian: Rage** — +2/+3/+4 melee damage bonus, Raging condition, bonus action, resource tracked
- [x] **Barbarian: Reckless Attack** — advantage on STR attacks this turn (enemies get advantage too)
- [x] **Rogue: Sneak Attack** — auto-applies 1d6–10d6 extra damage on first hit per turn (scales by level)
- [x] **Rogue: Cunning Action** — Dash + Disengage as bonus action
- [x] **Paladin: Divine Smite** — toggle on, adds 2d8 radiant on next melee hit, consumes spell slot
- [x] **Paladin: Lay on Hands** — heal from pool (level×5 HP), costs action
- [x] **Monk: Patient Defense** — Dodge as bonus action, applies Dodging condition
- [x] **Monk: Stunning Strike** — on hit, target CON save or Stunned (Ki cost), free action toggle
- [x] **Bard: Bardic Inspiration** — give ally an inspiration die (d6/d8/d10/d12 by level), bonus action, resource tracked
- [x] **Cleric: Channel Divinity: Turn Undead** — 30ft AoE, undead WIS save vs spell DC or Turned condition
- [x] **Druid: Wild Shape** — transform into beast form (Wolf/Bear/Spider/etc by CR), temp HP, natural weapon, revert on 0 HP with overflow damage
- [x] **Ranger: Hunter's Mark** — mark target for +1d6 damage per hit, bonus action, concentration tracked
- [x] **Sorcerer: Quickened Spell** — Metamagic, next spell cast as bonus action instead of action, costs 2 Sorcery Points
- All 12 classes now have functional combat abilities with multiplayer broadcast handlers
- Wild Shape revert on 0 HP with overflow damage wired into `applyEncounterDamage`
- Bardic Inspiration die consumed on near-miss attack rolls (turns miss→hit)
- 294 tests, 0 failures.

### Social Skill Checks in NPC Dialog
- [x] NPC system prompt updated — AI NPC requests Persuasion/Intimidation/Deception/Insight checks with DC based on difficulty
- [x] Inline skill check UI in NPC dialog — shows skill, DC, modifier (with proficiency/expertise indicators), Roll d20 button
- [x] Roll result fed back into NPC conversation — AI must honor SUCCESS/FAILURE outcomes in subsequent response
- [x] Multiplayer broadcast — social check results broadcast via `skill-check-result` with `npc-dialog` context
- [x] Narrator log integration — roll results posted to session log so all players see them
- 306 tests, 0 failures.

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
- **2026-03-19:** Phase 8 Polish — portrait picker, mobile responsive, opportunity attacks, cover mechanics, multi-floor buildings, larger areas (22 chunks), dungeon generation. 175 tests, 16 commits.
- **2026-03-20:** Phase 9 Gameplay Systems — inventory rewrite (Dark & Darker style grid), 38 magic items with attunement/charges/curses, derived stats, loot roll-off, death saves V2, rest system overhaul, gold persistence fix, day/night cycle, 14 new chunks (36 total). 197 tests, 13 commits.
- **2026-03-20:** Bug fixes + tech debt — LootScreen/LevelUpModal wired in V2, 6 broadcast handlers, useStore split (1784→20 lines), GameV2 split (1430→372 lines), bundle -41%.
- **2026-03-20:** Phase 10 Living World — shop/merchant, minimap, status effects, ambient sound, NPC schedules, traps, weather, party formation, quest tracker. 252 tests, 15 commits.
- **2026-03-22:** Grapple & Shove combat actions, loot→inventory bug fix. 288 tests.
- **2026-03-22:** Hide, Help, Use Item combat actions. All standard 5e actions now functional in combat bar.
- **2026-03-22:** Extra Attack + 10 class abilities implemented: Fighter (Second Wind, Action Surge), Barbarian (Rage, Reckless Attack), Rogue (Sneak Attack, Cunning Action), Paladin (Divine Smite, Lay on Hands), Monk (Patient Defense). 288 tests.
- **2026-03-22:** 6 more class abilities: Stunning Strike (Monk), Bardic Inspiration (Bard), Channel Divinity: Turn Undead (Cleric), Wild Shape (Druid), Hunter's Mark (Ranger), Quickened Spell (Sorcerer). All 12 classes now combat-functional. Wild Shape revert on 0 HP. 294 tests.
- **2026-03-22:** Social skill checks in NPC dialog — Persuasion/Intimidation/Deception/Insight checks triggered by AI NPC, inline roll UI, results feed back to shape NPC response, multiplayer broadcast. 306 tests.
