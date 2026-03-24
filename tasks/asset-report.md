# DungeonMind — Production Asset Report

> Complete checklist of all assets needed for production release.
> Current state: placeholder CSS gradients/procedural SVGs. Needs real hand-drawn dark fantasy art.

## Tile/Sprite Atlases (8 WebP sheets on Supabase CDN)

| Atlas | Categories | Status |
|---|---|---|
| atlas-floors.webp | Stone, wood, grass, dirt, cobblestone tiles | ✅ Placeholder procedural |
| atlas-walls.webp | Brick, stone, dungeon walls, fence | ✅ Placeholder procedural |
| atlas-structures.webp | Buildings, doors, stairs, bridges | ✅ Placeholder procedural |
| atlas-terrain.webp | Water, lava, cliff, sand, snow | ✅ Placeholder procedural |
| atlas-props-furniture.webp | Tables, chairs, beds, chests, shelves | ✅ Placeholder procedural |
| atlas-props-decor.webp | Banners, rugs, candles, statues, signs | ✅ Placeholder procedural |
| atlas-props-craft.webp | Anvils, forges, cauldrons, workbenches | ✅ Placeholder procedural |
| atlas-effects.webp | Fire, ice, lightning, magic circles, fog | ✅ Placeholder procedural |

**Spec:** 200×200px per tile, packed into sprite sheets. JSON atlas manifests define frame positions.

## UI Art (public/ui/ — 23 images)

### Needs Production Art:
- `bar-top.png` / `bar-bottom.png` — HUD bar backgrounds (ornate metal/stone frame)
- `weather-bar.png` — Zone label bar (parchment banner)
- `portrait-frame.png` / `portrait-frame-ornate.png` — Character portrait frames (gold filigree)
- `log-bg.png` — Chat panel background (aged parchment/leather)
- `log-tab1.png` / `log-tab2.png` — Tab indicators (leather bookmark)
- `log-expand.png` / `log-retract.png` — Expand/collapse icons (scroll arrows)
- `btn-char.png` / `btn-pack.png` / `btn-journal.png` / `btn-map.png` / `btn-settings.png` / `btn-group.png` / `btn-dice.png` / `btn-rest.png` — Action buttons (embossed metal icons)
- `icon-dice.png` / `icon-char.png` / `icon-pack.png` / `icon-journal.png` / `icon-rest.png` — Smaller icon variants

## CSS Texture Placeholders (need real texture images)

| CSS Class | Current | Needs |
|---|---|---|
| `.stone-panel` | CSS gradient | Seamless stone/masonry texture |
| `.metal-frame` | CSS gradient + border | Hammered dark metal texture |
| `.parchment-scroll` | CSS gradient | Aged dark parchment texture |
| HUD background | rgba + backdrop-blur | Dark stone/metal panel texture |
| Minimap frame | CSS gradients | Ornate gold metal map frame |
| Narrator panel | CSS gradients | Leather-bound journal texture |

## Dynamic Image Generation (Pollinations.ai — free)

| Asset | Size | Generator | Notes |
|---|---|---|---|
| Scene images | 1024×576 | Pollinations | Dark fantasy prompt, seeded per scene |
| NPC portraits | 256×256 | Pollinations | Per-NPC name seed, face closeup |
| Character avatars | varies | OAuth provider | Discord/GitHub profile pics |

**Production upgrade:** Replace Pollinations with pre-rendered hand-drawn scene art and character portraits.

## Audio Assets

| Asset | Current Source | Production Need |
|---|---|---|
| Narrator TTS | OpenAI TTS → Pollinations → Web Speech | Keep API chain, add custom voice model |
| Ambient music | Web Audio API procedural | Real ambient tracks (tavern, dungeon, forest, combat) |
| Sound effects | Web Audio API procedural | Real SFX: sword clash, spell cast, door open, footsteps |
| UI sounds | None | Button clicks, level up fanfare, death, victory |

## Fonts (Google Fonts CDN)

- **Cinzel Decorative** (400, 700, 900) — ornate display headers
- **Cinzel** (400, 700, 900) — all headings, labels, buttons
- Body text uses system serif fallback

## Components with PLACEHOLDER ART Comments (16 files)

These components use CSS-only styling that works but should be upgraded with real art assets:

1. `CombatRecap.jsx` — Victory/defeat screen backgrounds
2. `Tooltip.jsx` — Tooltip panel textures
3. `PartyHealthBars.jsx` — Portrait frames, HP bar textures
4. `EmoteSystem.jsx` — Emote picker panel
5. `PingSystem.jsx` — Beacon marker effects
6. `CraftingPanel.jsx` — Workbench panel texture
7. `KeyboardHelp.jsx` — Parchment scroll background
8. `LoadingTips.jsx` — Tip card texture
9. `AutoSaveIndicator.jsx` — Save indicator styling
10. `Minimap.jsx` — Map frame, compass rose
11. `Bestiary.jsx` — Leather book texture
12. `AreaMapOverview.jsx` — Parchment map background
13. `DifficultyBadge.jsx` — Wax seal texture
14. `BottomSheet.jsx` — Drawer panel texture
15. `HUD.jsx` — XP bar, shield badge
16. `CombatantRow.jsx` — Death save tracker panel

## Token/Character Art

| Asset | Current | Production Need |
|---|---|---|
| Player tokens | Colored circles with initials | Character class sprites (warrior, mage, rogue, etc.) |
| Enemy tokens | Red circles with initials | Monster sprites per SRD type |
| NPC tokens | Gold circles | NPC character sprites |
| Dead tokens | Faded circle | Skull/grave markers |
| Selected highlight | Animated ring | Ornate selection aura |

## Summary — Total Production Art Needed

| Category | Count | Priority |
|---|---|---|
| Tile atlas sprites | ~200 tiles across 8 sheets | HIGH |
| UI panel/frame art | ~23 images | HIGH |
| CSS texture replacements | 6 texture images | MEDIUM |
| Token/character sprites | ~30+ (player classes, monsters, NPCs) | HIGH |
| Sound effects | ~20 SFX | MEDIUM |
| Ambient music tracks | 5-8 tracks | MEDIUM |
| Victory/defeat/UI fanfares | 3-5 jingles | LOW |
