# Plan: Scene Transitions + NPC JSON + Saving Throw Broadcast + Procedural Map

## Features

### 1. Scene Transitions
Crossfade between old/new scene images instead of instant swap.
- Keep prevImageUrl ref; when new image loads → fade old out, new in (~800ms)
- Two absolutely-positioned img layers (old z:0, new z:1), SceneTitleCard stays z:2
- Files: ScenePanel.jsx only

### 2. NPC Defined in Campaign JSON
Named NPCs as stationary tokens on scene map with individual personalities.
- Campaign JSON: scene.npcs[{ name, x, y, personality, portrait }] (x/y as 0-1 fractions)
- Render NPC tokens (colored circle + name initial) on scene
- Interaction zones at each NPC position; zone prompt includes NPC name + personality for DM context
- Falls back to existing generic Explore zone if no scene.npcs
- Files: ScenePanel.jsx + new NpcToken.jsx (~60 lines)

### 3. Saving Throw Broadcast
When DM rolls saves, all players see results as a narrator message.
- After rolling in SavingThrowPanel, call broadcastNarratorMessage with formatted results
- Format: "DEX Save (DC 14) — Goblin: FAIL (8), Orc: PASS (16)"
- Add onNarrate prop to SavingThrowPanel; CombatPhase passes broadcast + chat add
- Files: SpellPanels.jsx, CombatPhase.jsx

### 4. Procedural Map Generator (JavaScript)
Generate dungeon/town layouts that AI DM knows about spatially.
- BSP algorithm in src/lib/mapGenerator.js → rooms + corridors grid data
- Text description of map fed into DM system prompt context
- SVG room outline overlay on scene (DM toggle)
- NPCs/enemies default to room centers if x/y not specified
- Files: src/lib/mapGenerator.js (new), src/components/MapOverlay.jsx (new)

### 5. Nano Banana Integration
PENDING — need service URL/API docs from user's brother's account.

## Order
- [ ] Feature 1: Scene Transitions
- [ ] Feature 2: NPC tokens
- [ ] Feature 3: Saving throw broadcast
- [ ] Feature 4: Procedural map
- [ ] Commit + push + update CLAUDE.md
