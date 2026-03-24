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
- [x] Map variety — more curated chunks for different biomes/themes (6 biome templates: mountain, desert, coastal, swamp, graveyard, marketplace)
- [x] Spell effects — visual particles/animations for common spells (Fireball, Healing Word, etc.) (7 effect types, integrated into CombatPhase with floating damage numbers on spell casts)
- [x] Better NPC conversation — longer, more personality-driven dialogue (rich personality descriptions, enhanced system prompt encouraging depth)

## Priority 4: Gameplay Polish
- [x] Combat keyboard shortcuts — A=Attack, S=Spell, E=End Turn, Esc=Cancel, 1-9=Select combatant
- [x] Conditions/status effect icons on tokens (poisoned, blessed, etc.) — badge icons with colored borders for all 14 SRD conditions + 5 extra (Burning, Frozen, Blessed, Hasted, Hexed), concentration ring, prone/invisible special effects
- [x] Rest mechanics UI (short rest / long rest buttons with proper 5e recovery) — already implemented: RestModal with party voting, hit dice spending, short/long rest recovery, PartySidebar buttons
- [x] Initiative tracker visual improvements — TurnOrderBar component with portrait circles, HP ring arcs, initiative badges, condition icons, active turn arrow animation, auto-scroll to active combatant

## Priority 5: Atmosphere & Immersion
- [x] Ambient background music — procedural Web Audio API drone/pad moods (exploration, combat, mystery, tavern, danger), auto-switches on combat state, HUD toggle + volume control, localStorage persistence
- [x] Day/night visual cycle — DayNightOverlay component with smooth hour-based tint interpolation (dawn golden, dusk orange, night deep blue), TimeDisplay clock in HUD showing time-of-day icon + formatted time
- [x] Weather effects — Canvas2D particle overlay for rain, heavy_rain, storm, snow, fog, ash; reads from store weather system with automatic transitions; integrated into GameV2
- [x] Ambient sound effects — procedural footsteps (4 surface types) on movement, door creak on area transitions, coin jingle on purchases, chest open sound, torch crackle + wind ambient loops

## Priority 6: World & Navigation
- [x] Minimap — Canvas2D corner minimap showing terrain/walls, player dot with white outline, NPC markers, exit markers, enemy markers in combat, area name header, collapsible with click toggle, legend
- [x] Quest tracker — collapsible left-side panel showing active quests with checkable objectives, quest giver info, completion progress, active/all filter, supports both store quests and legacy campaign questObjectives
- [x] Party formation — FormationPanel already existed with front/back line UI; wired formation into trap system so back-line members get advantage (roll twice, take higher) on trap saves, with narrator message noting formation benefit
- [x] Loot pickup animation — LootAnimation component with flying item icon, sparkle trail particles, item name toast; auto-triggers from addItemToInventory store action; CSS keyframe arc animation from screen center to inventory position

## Priority 7: UI & Information
- [x] Tooltip system — reusable Tooltip component with positioned popups, ItemTooltip/SpellTooltip/ConditionTooltip formatters; integrated into CombatantRow condition badges; dark fantasy styled with fade-in animation
- [x] Faction reputation display — already implemented: FactionReputation.jsx with reputation bars, disposition labels, color-coded standings, wired into GameModalsRenderer via 'faction' tool button
- [x] Combat recap — CombatRecap component parses combat log for per-character stats (damage, healing, kills, hits, misses, spells, crits, damage taken), MVP highlight, integrated into VictoryScreen
- [x] Keyboard shortcut help — KeyboardHelp overlay triggered by ? key, shows Movement/Combat/Interaction/UI categories with styled kbd elements, Esc to close, skip when typing in inputs

## Priority 8: Multiplayer & Social
- [x] Party health bars — PartyHealthBars component showing compact HP bars for all party members, portrait circles, name labels, condition dots, dead overlay, live HP from combat combatants, positioned bottom-left
- [x] Emote/reaction system — EmoteSystem component with 10 emotes (attack, defend, haha, nice, scared, roll, rip, fire, love, gg), floating emoji animations, broadcast to all players via encounter-action channel, picker grid, player name labels
- [x] Auto-save indicator — AutoSaveIndicator component with spinning/checkmark/error states, hooked into saveCampaignToSupabase and saveSettingsToSupabase, auto-fades after 2s, positioned top-right
- [ ] Ping system — click map to place a waypoint marker visible to all players

## Priority 9: Asset Generation (blocked — needs external image API)
- [ ] Generate original tile assets to replace Forgotten Adventures placeholders (see `tasks/codex-asset-generation.md`)
- [ ] Token/character sprites — already using Pollinations for portraits
- [ ] UI element art — replace CSS-only UI with actual dark fantasy art assets

## Blocked
- [ ] Pitched roof visuals — waiting on slope/edge FA assets
- [ ] Nano Banana / Deevid integration — waiting on API details
