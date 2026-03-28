# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## Playtest 5 Fixes (2026-03-28)

- [x] Short rest solo vote — auto-passes when only 1 player (no force button needed)
- [x] Short rest hit dice — removed auto-spend, player now sees hit dice roller UI
- [x] HP broadcast after rest — long rest + hit dice spending now broadcast to all players
- [x] Rest vote visibility — rest-complete and rest-hp-update broadcast handlers added
- [x] Portrait HP sync — portraits now prefer currentHp, update from broadcast events
- [x] Death saves 3 successes — revives at 1 HP instead of stable at 0 HP
- [x] Combat loop fix — unconscious/0 HP combatants skipped in turn order, combat ends if all incapacitated
- [x] Sleep spell — uses HP pool mechanic (5d8), applies Unconscious condition, no damage
- [x] Control spells — Tasha's Hideous Laughter and similar now apply conditions with save
- [x] TTS skip button — NarratorFloat stays visible while TTS speaks, SKIP button pulses, larger click target
- [x] Magic Missiles fix — SpellTargetingOverlay now handles 'single' areaType (was returning empty tiles), red crosshair targeting preview added
- [x] Spell panel — only shows spells character knows + cantrips (removed catalog fallback showing all spells)
- [x] Sorcerer starter spells — Magic Missile added to default Sorcerer spell list
- [x] Auto-walk to combat after respawn — 3-second cooldown prevents encounter zones triggering after respawn
- [x] Second player null position in combat — falls back to playerStart instead of null
- [x] Combat encounter radius (NEW) — only players within 10 tiles join combat, far players stay in exploration
- [x] Mid-combat join (NEW) — players entering combat radius roll initiative and get inserted into turn order
- [x] Stealth through combat radius (NEW) — enemies roll perception vs player stealth DC, stealth holds if undetected
- [x] PixiJS spell animations (NEW) — 12 unique spell effects: Magic Missile darts, fire cone/bolt, sleep sparkles, thunderwave shockwave, healing glow, eldritch blast beam, frost particles, lightning bolt, radiant pillar, poison cloud, necrotic wisps, generic arcane burst
- [x] Spell targeting preview for single-target (NEW) — red crosshair on hovered tile for Magic Missile, etc.

## Multiplayer Playtest Fixes (2026-03-25) — ALL 17 FIXED

- [x] Can't see other player token on spawn — broadcast initial position on game load
- [x] Combat teleports players — save pre-combat position, restore after combat ends
- [x] TTS narrates every combat action — filter: only speak NPC/story/scene, skip combat play-by-play
- [x] TTS voices broken (Stephen Hawking) — fixed operator precedence bug blocking NPC voice registry
- [x] Can't move simultaneously — per-token animation map instead of single global lock
- [x] NPC conversations invisible to party — broadcast NPC dialog to all players via narrator chat
- [x] Remove suggested responses — removed, living game requires user input
- [x] Click-to-move broken — cancel stale spell targeting when leaving combat
- [x] Weather not synced — handle weather-change broadcast in encounter-action receiver
- [x] Portrait layout — party members float above bottom bar on left, only player portrait in bar
- [x] Other player shows inventory — hide InventoryPane for non-self character sheets
- [x] Space recenter broken — clamp centerOn target within area bounds
- [x] Indoor lighting at night — auto-place building lights + 2.5x brightness at night
- [x] Zone transitions missing — FIX: getAdjacentExit was checking exit.position (undefined) instead of exit.x/y
- [x] Long rest voting broken — broadcast rest proposals to all players
- [x] Search spammable — require searchable zone tag + 60s per-tile cooldown
- [x] Missing zone transitions — auto-generate reverse exits, validate exit targets, reduce area sizes

## Previous Fixes (all checked off)

### Critical Bugs ✅
- [x] Random encounters spam ✅
- [x] No enemy tokens ✅
- [x] Narrator float bar enormous ✅
- [x] Chat panel too big ✅
- [x] Layout overlapping ✅

### All Feature Work ✅ (see status.md for full list)
