# Active Work — Agent Priority Queue

> Pick the top unchecked item. Build it. Check it off. Move to the next one.
> **DO NOT WRITE TESTS.** Every iteration = game code, assets, or bug fixes.

## DESIGN RULES — EVERY UI COMPONENT MUST FOLLOW THESE
- Dark fantasy theme: Baldur's Gate 2 / Icewind Dale inspired
- Gold accents (#c9a84c / #d4af37), deep brown/black backgrounds (#1a1006, #0d0a04)
- Ornate borders, stone/metal textures via CSS (gradients, box-shadows)
- SVG filigree and decorative elements where appropriate
- All text uses fantasy fonts (Cinzel for headers, serif for body)
- Mobile-first: all touch targets minimum 44x44px, works in landscape
- No white backgrounds, no flat/modern UI, no default browser styles
- Every new component needs BOTH functionality AND styled UI
- These are PLACEHOLDER styles — mark every component with a comment:
  `/* PLACEHOLDER ART: needs real dark fantasy assets for production */`
- Big click targets for tablet/TV play at a table

## Priority 1: UI/UX Polish on Existing Features (CRITICAL — DO THIS FIRST)
> You built 20+ new components. They work but need proper dark fantasy styling.
> Go through EACH ONE and make the UI match the DESIGN RULES above.
> One component per iteration. Style it properly, then move on.

- [x] CombatRecap / VictoryScreen — ornate dark fantasy styling: gold gradient borders, Cinzel Decorative headers, textured backgrounds, inset shadows, stat badges with dark panels, 44px+ touch targets
- [x] Tooltip system — ornate dark fantasy panel: double gold borders, corner filigree accents, SVG arrow, Cinzel headers, Crimson Text body, gold dividers, inset glow, rarity-colored item names, spell stat icons
- [x] PartyHealthBars — BG2/Icewind Dale portrait bar style: ornate gold-framed portraits with corner accents, chiseled HP bars with notch marks, Cinzel names, gradient fills, condition badges with icons
- [x] EmoteSystem — magical feel (particle trails, fade glow), dark themed picker
- [x] PingSystem — magical beacon marker: SVG rune circle, vertical energy beam, spark particles, gem center
- [x] CraftingPanel — RPG workbench: ornate ingredient slots with corner notches, spellbook recipes, filigree corners, gold dividers
- [x] KeyboardHelp overlay — parchment scroll with curled edges, filigree corners, organized columns, ornate kbd keys
- [x] LoadingTips — dark vignette backdrop, ornate SVG bars, Cinzel Decorative label, Crimson Text tip
- [ ] AutoSaveIndicator — subtle, non-intrusive, matches HUD style
- [ ] XP bar — ornate progress bar with level badge, not a plain rectangle
- [ ] Encounter difficulty badge — styled like a seal/sigil
- [ ] Minimap — ornate border frame, parchment background, compass rose
- [ ] Bestiary — style as a leather-bound monster manual
- [ ] Area map overview — parchment map style with wax seal markers

## Priority 2: Campaign & Character Creation (full new-user flow)
> Delete the test campaign/character, then go through creation from scratch.
> Every screen must be styled per DESIGN RULES. Fix any bugs found.
> Read CLAUDE.md "Business Model" section — NO API key gate for normal users.

- [ ] Campaign creation flow — Create New Campaign, every step styled and working. AI generation uses platform default API key from app_config table.
- [ ] Character creation flow — full builder: race, class, abilities, spells, identity. Style every step.
- [ ] Verify: new player sees NO ApiKeyGate (platform provides default key)
- [ ] Combat initiation — exploration to combat works end to end
- [ ] Rest system — short/long rest UI styled and functional
- [ ] Death saves — dying/dead flow with proper visual feedback

## Priority 3: Mobile & Responsive
- [ ] All new components work at 375px landscape
- [ ] All buttons/panels have 44px+ tap targets
- [ ] Drawer/sheet pattern on small screens instead of overlapping modals
- [ ] HUD collapses properly on narrow screens

## Priority 4: Integration & Wiring
- [ ] Verify ALL new components are reachable in normal gameplay
- [ ] CraftingPanel uses real inventory items
- [ ] EmoteSystem broadcasts via Supabase Realtime
- [ ] PingSystem broadcasts via Supabase Realtime
- [ ] AutoSave actually persists to Supabase

## Priority 5: Asset Report
- [ ] Generate `tasks/asset-report.md` listing ALL assets needed for production:
  tiles, tokens, UI art, effects, portraits, audio — the full art checklist
