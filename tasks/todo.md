# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## Next Playtest Priority Queue

- [x] Full tree assets — imported 112 tree tiles
- [x] More POI chunk types — 24 new chunks (60 total)
- [x] Map gen overhaul — noise terrain, clustered scatter, meandering roads, 16 themes
- [x] Playtest 4 fixes (20 bugs) — spells, HP sync, combat, quests, encounters, voices, UI
- [ ] Wall visibility desync — P1 and P2 sometimes see different walls in buildings
- [ ] P2 visibility after rejoin — can't see each other until movement after crash+rejoin
- [ ] Map texture polish — tiles more diverse but can look chaotic with mixed styles
- [ ] NPC schedule movement visible — NPCs walk between POIs on time schedule
- [ ] Click-to-move pathfinding during combat — show valid path preview before confirming
- [ ] Spell upcast UI — pick spell slot level when casting higher than minimum
- [ ] Opportunity attack prompt for moving enemies — currently only for players

## Playtest 5-8 Fixes — ALL COMPLETE (44 fixes)

See `status.md` → "Playtest 5-8 Bug Fixes" section for full list.

## Multiplayer Playtest Fixes (2026-03-25) — ALL 17 FIXED

- [x] Can't see other player token on spawn
- [x] Combat teleports players
- [x] TTS narrates every combat action
- [x] TTS voices broken
- [x] Can't move simultaneously
- [x] NPC conversations invisible to party
- [x] Remove suggested responses
- [x] Click-to-move broken
- [x] Weather not synced
- [x] Portrait layout
- [x] Other player shows inventory
- [x] Space recenter broken
- [x] Indoor lighting at night
- [x] Zone transitions missing
- [x] Long rest voting broken
- [x] Search spammable
- [x] Missing zone transitions

## Previous Fixes (all checked off)

### Critical Bugs ✅
- [x] Random encounters spam ✅
- [x] No enemy tokens ✅
- [x] Narrator float bar enormous ✅
- [x] Chat panel too big ✅
- [x] Layout overlapping ✅

### All Feature Work ✅ (see status.md for full list)
