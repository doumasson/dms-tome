# DungeonMind — Production Asset Report

## Summary
26 real files on disk (1.4 MB), 5 procedural audio systems, 9 tile atlases, 24 emoji placeholders, 16 files marked PLACEHOLDER ART.

---

## 1. Real Image Files (26 files)

### UI Assets (`/public/ui/`)
| File | Size | Purpose |
|------|------|---------|
| bar-top.png | 232 KB | Header bar stone texture |
| bar-bottom.png | 424 KB | Bottom narrator panel stone texture |
| btn-char.png | 34 KB | Character sheet button |
| btn-dice.png | 35 KB | Dice roll button |
| btn-journal.png | 35 KB | Journal/notes button |
| btn-pack.png | 35 KB | Inventory button |
| btn-rest.png | 37 KB | Rest button |
| btn-group.png | 6.6 KB | Party button |
| btn-map.png | 6.6 KB | Map button |
| btn-settings.png | 7.3 KB | Settings button |
| icon-char.png | 14 KB | Small character icon |
| icon-dice.png | 13 KB | Small dice icon |
| icon-journal.png | 6.8 KB | Small journal icon |
| icon-pack.png | 6.4 KB | Small pack icon |
| icon-rest.png | 6.4 KB | Small rest icon |
| log-bg.png | 162 KB | Session log background |
| log-tab1.png | 23 KB | Log tab 1 trim |
| log-tab2.png | 23 KB | Log tab 2 trim |
| log-expand.png | 3.5 KB | Expand arrow |
| log-retract.png | 3.4 KB | Collapse arrow |
| portrait-frame.png | 125 KB | Standard portrait frame |
| portrait-frame-ornate.png | 24 KB | Ornate portrait frame |
| weather-bar.png | 57 KB | Weather/time bar |

### Tileset (`/public/tilesets/`)
- tiles.png (54 KB) — 32x32 tile atlas: floors, walls, furniture, props, doors, stairs

### Vector (`/public/`)
- favicon.svg — DungeonMind logo
- icons.svg — Social media icons

---

## 2. Tile Atlases (9 JSON + sprite sheets)
- atlas-effects.json — visual effects
- atlas-floors.json — floor variations
- atlas-props-craft.json — crafting props
- atlas-props-decor.json — decorative props
- atlas-props-furniture.json — furniture
- atlas-structures.json — buildings, roofs
- atlas-terrain.json — terrain variants
- atlas-walls.json — wall variants
- tileAtlas.json — main V1 atlas metadata

---

## 3. Procedural Audio (Web Audio API — no external files)

### Ambient Music (`ambientMusic.js`)
5 moods: exploration, combat, mystery, tavern, danger

### Ambient Soundscapes (`ambientAudio.js`)
5 scenes: dungeon, tavern, outdoor, town, combat

### Sound Effects (`soundEffects.js`)
Hit, miss, spell, death sounds

### UI Sounds (`uiSounds.js`)
Stone click, parchment rustle, metal clink, scroll unfurl, turn chime

### Footsteps (`ambientSounds.js`)
Surface-dependent: stone, wood, grass, sand

---

## 4. Procedural Image Generation (Pollinations.ai)
- Scene images: 1024x576, deterministic seed, no API key
- NPC portraits: 256x256, on-demand
- Character avatars: DiceBear SVG API

---

## 5. Fonts (Google Fonts)
- Cinzel Decorative 700 — titles
- Cinzel 400/600/700 — headers, buttons
- System serif — body fallback
- Consolas/Monaco — combat log

---

## 6. CSS Texture Simulations (need real assets)
- `.stone-panel` — stone masonry gradient
- `.metal-frame` — hammered metal gradient
- `.parchment-scroll` — aged paper gradient
- `.medallion-btn` — coin/metal radial gradient

---

## 7. Emoji Placeholders (24 unique, ~80 usages)

### Classes
Barbarian 🪓 · Bard 🎵 · Cleric ✙ · Druid 🌿 · Fighter ⚔ · Monk 👊 · Paladin 🛡 · Ranger 🏹 · Rogue 🗝 · Sorcerer ✨ · Warlock 🌑 · Wizard 📖

### Races
Dwarf ⛏ · Elf 🌙 · Halfling 🍀 · Human ⚜ · Dragonborn 🐉 · Gnome ⚙ · Half-Elf ✦ · Half-Orc 🗡 · Tiefling 🔥

### Game UI
Gold 🪙 · Shield 🛡 · Potion 🧪 · Spell ✨ · Attack ⚔

---

## 8. PLACEHOLDER ART Files (16 marked)
1. HUD.jsx — XP bar
2. Tooltip.jsx — tooltip backgrounds
3. PartyHealthBars.jsx — health bars
4. Bestiary.jsx — enemy panels
5. BottomSheet.jsx — modal backgrounds
6. Minimap.jsx — minimap frame
7. DifficultyBadge.jsx — encounter difficulty
8. LoadingTips.jsx — loading screen
9. CraftingPanel.jsx — crafting UI
10. CombatRecap.jsx — combat summary
11. KeyboardHelp.jsx — controls overlay
12. PingSystem.jsx — ping markers
13. AreaMapOverview.jsx — area map
14. AutoSaveIndicator.jsx — save icon
15. CombatantRow.jsx — death save circles
16. uiSounds.js — all UI sounds

---

## 9. Production Readiness

| Category | Status | Action |
|----------|--------|--------|
| UI PNG art (24 files) | Ready | None |
| Tile atlases (9 sets) | Ready | None |
| Fonts (Cinzel) | Ready | None |
| Scene gen (Pollinations) | Ready | Free, no key |
| Procedural audio | Functional | Optional: real audio files |
| CSS textures | Functional | Optional: real PNG textures |
| Emoji icons | Functional | Optional: custom 16x16 icons |
| 16 PLACEHOLDER files | Marked | Replace with real art |
