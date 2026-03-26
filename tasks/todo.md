# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## Multiplayer Playtest Fixes (2026-03-25)

### Fixed
- [x] Can't see other player token on spawn — broadcast initial position on game load
- [x] Combat teleports players — save pre-combat position, restore after combat ends
- [x] TTS narrates every combat action — filter out combat play-by-play, only speak NPC/story/scene
- [x] TTS voices broken (Stephen Hawking) — NPC voice registry was already wired, TTS filter was blocking it
- [x] Can't move simultaneously — per-token animation tracking instead of global lock
- [x] NPC conversations not visible to all players — broadcast NPC dialog messages to narrator chat
- [x] Remove suggested response choices in NPC dialog — removed, living game requires user input
- [x] Click-to-move broken — cancel stale spell targeting when leaving combat
- [x] Weather not synced across players — handle weather-change broadcast in encounter-action receiver
- [x] Clicking other player shows inventory — hide InventoryPane for non-self character sheets
- [x] Space recenter camera broken when zoomed in — clamp centerOn target within area bounds
- [x] Indoor lighting at night — auto-place building interior lights, boost intensity 2.5x at night
- [x] Long rest voting not reaching other player — broadcast rest proposals via encounter-action
- [x] E to search spammable everywhere — require searchable zone tag + 60s per-tile cooldown

### Still Needs Attention (campaign-specific)
- [ ] Zone transitions missing for "command hub corridor" — campaign data needs proper exit definitions
- [ ] Missing zone transitions to "lower docks" — campaign generator needs to create bidirectional exits
- [ ] Portrait layout — currently correct (player big, party small above), may need further tuning

## Previous Fixes (all checked off)

### Critical Bugs ✅
- [x] Random encounters spam ✅
- [x] No enemy tokens ✅
- [x] Narrator float bar enormous ✅
- [x] Chat panel too big ✅
- [x] Layout overlapping ✅

### All Feature Work ✅ (see status.md for full list)
