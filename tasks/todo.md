# Active Work — Agent Priority Queue

> Pick the top unchecked item. Build it. Check it off. Move to the next one.
> **DO NOT WRITE TESTS.** Every iteration = game code, assets, or bug fixes.

## Priority 1: Polish & Fix What's Built
- [x] Run `npm run build` — fix any build errors or warnings (passing at 962ms)
- [x] Audit all components over 400 lines — split oversized files (7 major refactors: useCombatActions 1600→1204, CharacterSheet 1168→1011, CreateCampaign 1019→832, CampaignImporter 890→725, LevelUpModal 588→542, DiceTray 401→385, InventoryGrid 408→344)
- [ ] Fix any console errors visible during normal gameplay flow (create campaign → create character → enter game → explore → combat)
- [ ] Verify multiplayer sync works end-to-end — host and player see the same state

## Priority 2: Gameplay Feel
- [x] Smooth token movement animations (not snapping tile to tile) — implemented TweenEngine with easing, hooked to combat token movement
- [ ] Scene image loading — show loading state while Pollinations generates, don't flash blank
- [ ] Combat feedback — visual hit/miss/damage numbers floating above tokens
- [ ] Sound effects for combat actions (hit, miss, spell cast, death)
- [ ] Narrator text should stream in (typewriter effect), not appear all at once

## Priority 3: Missing Game Features
- [ ] Merchant/shop UI improvements — make it feel like a real RPG shop, not a list
- [ ] Character portrait in-game — show the actual portrait, not just colored circles
- [ ] Map variety — more curated chunks for different biomes/themes
- [ ] Spell effects — visual particles/animations for common spells (Fireball, Healing Word, etc.)
- [ ] Better NPC conversation — longer, more personality-driven dialogue

## Priority 4: Asset Generation
- [ ] Generate original tile assets to replace Forgotten Adventures placeholders (see `tasks/codex-asset-generation.md`)
- [ ] Token/character sprites — generate unique sprites for player classes and common monsters
- [ ] UI element art — replace CSS-only UI with actual dark fantasy art assets

## Blocked
- [ ] Pitched roof visuals — waiting on slope/edge FA assets
- [ ] Nano Banana / Deevid integration — waiting on API details
