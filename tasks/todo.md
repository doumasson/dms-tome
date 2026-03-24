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

### Bug 5: Layout/UI elements overlapping or unstyled
Multiple HUD elements are overlapping. The game should have:
- Top-left: compact HP/AC/Level HUD
- Top-center: area name + time
- Top-right: minimap (collapsible)
- Bottom: narrator bar (collapsed 20%, expandable)
- No elements should overlap the game map unnecessarily
- Review GameV2.jsx render tree and fix z-index/positioning conflicts

## After critical bugs are fixed, continue with:

### Gameplay Testing
- [ ] Walk around without encounter spam — movement should feel smooth and safe in non-hostile areas
- [ ] Find enemies on the map (placed by area builder, not random encounters) and engage in combat
- [ ] Complete a combat encounter — attack, take damage, kill enemy, get loot
- [ ] Talk to an NPC — dialog should open, AI responds in character
- [ ] Open character sheet — verify stats, inventory, equipment display correctly
- [ ] Use the crafting panel — verify it reads real inventory
- [ ] Verify the shop works — buy/sell items

### UI Polish
- [ ] Every screen matches dark fantasy theme per DESIGN RULES
- [ ] No white backgrounds, no unstyled default elements
- [ ] All text readable — proper contrast, proper sizing
- [ ] Mobile-friendly — 44px tap targets, works at 375px landscape
