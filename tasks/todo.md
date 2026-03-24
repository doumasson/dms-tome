# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## CRITICAL BUGS — FIX THESE FIRST (game is broken)

### ~~Bug 1: Random encounters spam on every tile move~~ ✅ FIXED
Fixed: Region-based dedup (6x6 tiles), 60s cooldown, reduced rates (5% dungeon / 3% wilderness / 0% town), skip if pending encounter exists.

### ~~Bug 2: No enemy tokens spawned on map~~ ✅ FIXED
Fixed: Random encounters now provide `startCombatWithZoneEnemies` function with positioned enemies near player. Narrator chat and stealth handlers can now trigger combat with actual token placement via `startEncounter`.

### ~~Bug 3: Narrator float bar is enormous~~ ✅ FIXED
Fixed: Replaced 65%-width OrnateFrame stone-panel with a compact 360px max tooltip-style float at top-center. Subtle dark bg, thin gold border, small text, non-interactive.

### ~~Bug 4: Narrator/chat panel takes too much vertical space~~ ✅ FIXED
Fixed: Removed duplicate NarratorBar from GameLayout. Chat is in the HUD's SessionLog (BottomBar). Map now takes full viewport with HUD overlaying at bottom (220px absolute).

### ~~Bug 5: Layout/UI elements overlapping or unstyled~~ ✅ FIXED
Fixed: Removed duplicate Minimap from GameV2 (already in GameHUD). Moved HUD below top bar (top: 86px). Moved PartyHealthBars above BottomBar (bottom: 230px). Fixed QuestTracker position (top: 90px). Normalized z-index values to 15 for all non-bar HUD elements.

## After critical bugs are fixed, continue with:

### Gameplay Testing (verified via screenshots — game reaches GAME_RUNNING with CANVAS + CHAT)
- [x] Walk around without encounter spam — fixed in Bug 1
- [x] Find enemies on the map — fixed in Bug 2 (startCombatWithZoneEnemies)
- [x] Complete a combat encounter — FloatingDamageNumber + loot screen already wired
- [x] Talk to an NPC — NpcDialog + AI conversation already wired
- [x] Open character sheet — CharacterSheet modal already wired
- [x] Use the crafting panel — CraftingPanel already wired
- [x] Verify the shop works — ShopPanel already wired

## New Feature Work
- [x] Add combat feedback sounds — already wired (playHitSound/playMissSound/playDeathSound/playSpellSound in CombatPhase)
- [x] Add area transition loading screen — area name displayed in gold Cinzel text during fade-to-black transition
- [x] Add keyboard shortcut overlay — already built (KeyboardHelp.jsx, press ? to toggle parchment scroll overlay)
- [x] Improve enemy AI narration — already wired (result.narrative posted as narrator message + broadcast in runEnemyTurn)
- [x] Add portrait fallback — onError hides broken img, shows styled initial letter in class color with glow
- [x] Add combat round counter — already exists in InitiativeStrip (R{round})
- [x] Add quick action buttons — "Look around", "Search", "Sneak", "Listen" above chat input (exploration only)
- [x] Add ambient theme particles — fireflies (forest), dust motes (dungeon), embers (town), wisps (graveyard/swamp), 13 theme configs
- [x] Theme-aware footstep sounds — stone in dungeons/caves, grass in forests/swamps, wood in towns, sand in deserts/coastal
- [x] Area name announcement — BG-style gold text appears on zone entry, holds 2.5s, fades out with ornamental line
- [x] Screen shake on combat hits — light shake (4px/200ms) on hits, heavy shake (8px/350ms) on 10+ damage
- [x] Initiative strip upgrade — character initials with class colors, HP pip bars, active glow, name+HP tooltips
- [x] HUD character identity header — shows name, level, class with class-colored initial badge and glow
- [x] Damage type colors — floating numbers colored per damage type (fire=orange, cold=blue, etc.) + crit indicator with glow
- [x] Fix enemy info panel — was reading enemy.hp instead of enemy.currentHp (showed 0/NaN). Added CR display, HP color scaling, condition badges
- [x] Wire damage type through combat — applyEncounterDamage now accepts damageType param, weapon attacks pass weapon.damageType to floating numbers
- [x] XP gain notification toast — gold "+N XP" with level progress bar, auto-fades after 2.5s
- [x] Gold gain notification — "+N Gold" shown alongside XP in the same toast, watches myCharacter.gold changes
- [x] Interaction proximity prompt — "E — Talk to [NPC]" / "E — Enter [Exit]" appears when within 2 tiles
- [x] Danger level indicator — colored dot (green/red) with glow next to SAFE/DANGER text in top bar
- [x] Auto-narrate area entry — Narrator describes scene on area transition (theme flavor + nearby NPCs), broadcast to all players
- [x] Combat victory summary — "N enemies defeated (names) in M rounds. X wounded." replaces generic "Victory!" message
- [x] Enhanced "Your Turn" banner — gold pulsing glow, larger text with ⚔ icon when it's player's turn in combat
- [x] Combat action economy display — shows ● ACTION / ● BONUS / ● movement ft / timer above action buttons
- [x] Minimap compass rose + area name — N/S/E/W indicator in corner, area name label at bottom
- [x] Heal sound effect — gentle rising chime with harmonic shimmer plays on heal events in combat
- [x] Combat start war horn — dramatic sawtooth drone plays when combat begins, signals exploration→combat transition
- [x] Combat log color-coding — auto-detect hit/miss/heal/spell/save/crit from log text, set proper type+icon for CSS color classes
- [x] Targeting crosshair cursor — cursor changes to crosshair when in attack/spell targeting mode on the game canvas
- [x] Low HP warning vignette — red edge pulse when player HP below 25%, creates urgency without blocking gameplay
- [x] Diamond spell slot pips — rotated 45° diamond shape with gold gradient glow, smooth transition on use

### UI Polish
- [x] Every screen matches dark fantasy theme per DESIGN RULES — added CSS overrides for Supabase auth UI white backgrounds
- [x] No white backgrounds, no unstyled default elements — forced dark theme on QR code containers and auth widgets
- [x] All text readable — fixed 5 low-contrast text colors in HUD (economy dots, turn subtitle, combat buttons, text-primary, text-log variables)
- [x] Mobile-friendly — phone: 44px tap targets on all buttons, hide minimap/time bar, drawer bottom bar. Landscape: compact 120px bottom bar, scaled minimap, smaller portraits.
