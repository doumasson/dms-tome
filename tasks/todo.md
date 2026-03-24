# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## CRITICAL BUGS — FIX THESE FIRST (game is broken)

### Bug 1: Random encounters spam on every tile move
The random encounter system fires on EVERY movement step. A player walks 5 tiles and gets 5 encounter prompts. This makes the game unplayable.
- Find `useRandomEncounters` or the movement handler that triggers encounters
- The encounter check should fire ONCE per area entry or on a low % chance per move (like 5-10%), not every tile
- Encounters that fire should ONLY happen if the AI narrator decides to start one, not automatically
- Fix the trigger rate. Verify by walking around — should be rare, not every step.

### Bug 2: No enemy tokens spawned on map
Random encounters fire messages ("You notice Goblin ahead!") but no enemy tokens actually appear on the tilemap. The encounter system creates narrator messages but doesn't place enemies on the grid.
- Trace: random encounter triggers → startEncounter → enemy combatants should appear as red tokens on the PixiJS canvas
- Find where enemy token placement fails and fix it

### Bug 3: Narrator float bar is enormous
There's a huge gold-bordered bar spanning most of the screen width in the middle of the game view. This is either the NarratorFloat, an interaction zone overlay, or the character name display. It should be small and unobtrusive — a small floating text, not a screen-blocking banner.
- Find what renders that wide gold bar
- Make it compact — small text, positioned unobtrusively, not blocking the game view

### Bug 4: Narrator/chat panel takes too much vertical space
The bottom parchment panel (narrator chat + log) takes up ~50% of the screen. Per ARCHITECTURE.md the layout should be:
- Top 80%: game map (dominant, full bleed)
- Bottom 20%: narrator bar (collapsed by default, expands to 40% max)
- Fix the layout proportions. The map should be dominant.

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
