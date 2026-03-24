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
- [x] AutoSaveIndicator — SVG rune spinner, checkmark/X states, subtle HUD glow, Cinzel text
- [x] XP bar — SVG shield level badge, ornate bar with notches/end caps, gold shimmer animation
- [x] Encounter difficulty badge — SVG scalloped wax seal with tick marks, color-coded per difficulty, used in Victory/Defeat screens
- [x] Minimap — ornate double gold frame, parchment gradient, SVG compass rose, corner filigree, 44px collapsed button
- [x] Bestiary — leather-bound book: spine accent, corner studs, split page layout, ornate stat boxes, Cinzel Decorative headers
- [x] Area map overview — parchment map with wax seal node markers, scalloped edges, trail lines, filigree corners

## Priority 2: Campaign & Character Creation (full new-user flow)
> Delete the test campaign/character, then go through creation from scratch.
> Every screen must be styled per DESIGN RULES. Fix any bugs found.
> Read CLAUDE.md "Business Model" section — NO API key gate for normal users.

- [x] Campaign creation flow — ornate card with filigree corners, numbered step indicators, platform default API key, all 4 steps styled
- [x] Character creation flow — ornate card frame with filigree corners, layered gradient background, full 7-step builder already styled
- [x] Verify: no ApiKeyGate — fixed race condition in key loading, platform default key loads first, non-DM players never blocked
- [x] Combat initiation — zone triggers, AI narrator startCombat, random encounters, stealth ambush all wired end-to-end
- [x] Rest system — RestModal with majority vote, hit dice spending, timer bar, short/long rest functional
- [x] Death saves — ornate SVG pip indicators with check/X marks, Cinzel labels, pulse animation, gradient panel, styled buttons

## Priority 3: Mobile & Responsive
- [ ] All new components work at 375px landscape
- [ ] All buttons/panels have 44px+ tap targets
- [ ] Drawer/sheet pattern on small screens instead of overlapping modals
- [ ] HUD collapses properly on narrow screens

## Priority 4: Review & Fix Existing Code
> Not just new stuff — review OLD components and screens for quality.
- [ ] Audit src/components/ — any file with inline styles that don't match the dark fantasy theme? Fix them.
- [ ] Audit src/hud/ — HUD elements should all be ornate, consistent, Icewind Dale style
- [ ] Check all modals/overlays (CharacterSheet, LevelUp, Rest, Loot, GameOver) — consistent styling?
- [ ] Review NarratorPanel, NpcConversation — do they feel polished? Readable text? Proper spacing?
- [ ] Check CreateCampaign and CharacterCreate flows — every step styled per design rules?
- [ ] Look for console warnings/errors in the codebase (missing keys, deprecated APIs, null refs)

## Priority 5: Integration & Wiring
- [ ] Verify ALL new components are reachable in normal gameplay
- [ ] CraftingPanel uses real inventory items
- [ ] EmoteSystem broadcasts via Supabase Realtime
- [ ] PingSystem broadcasts via Supabase Realtime
- [ ] AutoSave actually persists to Supabase

## Priority 5: Asset Report
- [ ] Generate `tasks/asset-report.md` listing ALL assets needed for production:
  tiles, tokens, UI art, effects, portraits, audio — the full art checklist
