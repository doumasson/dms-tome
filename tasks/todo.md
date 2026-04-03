# Active Work — Agent Priority Queue

> **RULES:**
> - You can ONLY check off an item if you WROTE CODE to fix it
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.
> - If Playwright shows the game is broken, fix THAT before anything else.

## Next Playtest Priority Queue

- [x] Playtest 4 fixes (20 bugs) — spells, HP sync, combat, quests, encounters, voices, UI
- [x] Playtest 5 fixes — combat desync, HP persistence, rest sync, token visibility, crash recovery
- [x] North Star audit — 8 missing broadcasts, healing propagation, persistence gaps
- [x] Playtest 6 fixes — cleric spells, combat lockup, action economy, rest guards
- [x] NPC memory + quest turn-in awareness
- [x] Equipment AC broadcast
- [x] Position/fog persistence across refresh
- [x] Map size hard cap (55x42)
- [ ] Map generation quality — user wants to rebuild separately, do NOT touch without asking
- [x] P2 token visibility — areaTokenPositions missing from useMemo deps in useGameTokens
- [x] Dual enemy AI trigger race condition — removed duplicate trigger from CombatPhase.jsx
- [x] Inventory/shop broadcast — AC equip/unequip always, consumable HP, shop gold-update
- [x] Exploration spell casting — target picker, healing applies, slot only on confirm, broadcast
- [x] demoCampaign Pollinations crash — removed buildPollinationsUrl import
- [x] isDM gates → isAIRunner (random encounters, fog, roofs)
- [ ] Journal/bestiary/weather persistence (lower priority)

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
