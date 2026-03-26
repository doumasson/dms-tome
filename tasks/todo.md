# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

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
