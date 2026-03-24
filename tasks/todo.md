# Active Work — Agent Priority Queue

> Pick the top unchecked item. Build it. Check it off. Move to the next one.
> **DO NOT WRITE TESTS.** Every iteration = game code, assets, or bug fixes.

## Priority 1: Polish & Fix What's Built
- [x] Run `npm run build` — fix any build errors or warnings (passing at 962ms)
- [x] Audit all components over 400 lines — split oversized files (7 major refactors: useCombatActions 1600→1204, CharacterSheet 1168→1011, CreateCampaign 1019→832, CampaignImporter 890→725, LevelUpModal 588→542, DiceTray 401→385, InventoryGrid 408→344)
- [x] Fix any console errors visible during normal gameplay flow (setApiKeyLoaded export, trap position null checks)
- [x] Verify multiplayer sync works end-to-end — host and player see the same state (verified 159+ broadcast calls, isDM gating for AI, state syncing comprehensive)

## Priority 2: Gameplay Feel
- [x] Smooth token movement animations (not snapping tile to tile) — implemented TweenEngine with easing, hooked to combat token movement
- [x] Scene image loading — show loading state while Pollinations generates, don't flash blank (already implemented: skeleton shimmer + spinner)
- [x] Combat feedback — visual hit/miss/damage numbers floating above tokens (already implemented: FloatingDamageNumber component)
- [x] Sound effects for combat actions (hit, miss, spell cast, death) — implemented procedural Web Audio API sounds (hit, miss, death on damage events)
- [x] Narrator text should stream in (typewriter effect), not appear all at once — implemented TypewriterText component, applies to last DM message only

## Priority 3: Missing Game Features
- [x] Merchant/shop UI improvements — make it feel like a real RPG shop, not a list (featured items section, rarity glow effects, item counts, hover animations)
- [x] Character portrait in-game — show the actual portrait, not just colored circles (added portrait generation for enemies)
- [ ] Map variety — more curated chunks for different biomes/themes
- [x] Spell effects — visual particles/animations for common spells (Fireball, Healing Word, etc.) (created SpellAnimation component with 6 spell types)
- [ ] Better NPC conversation — longer, more personality-driven dialogue

## Priority 4: Asset Generation
- [ ] Generate original tile assets to replace Forgotten Adventures placeholders (see `tasks/codex-asset-generation.md`)
- [ ] Token/character sprites — generate unique sprites for player classes and common monsters
- [ ] UI element art — replace CSS-only UI with actual dark fantasy art assets

## Blocked
- [ ] Pitched roof visuals — waiting on slope/edge FA assets
- [ ] Nano Banana / Deevid integration — waiting on API details
