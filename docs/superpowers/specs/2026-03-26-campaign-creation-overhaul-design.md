# Campaign Creation Overhaul — Design Spec

**Date:** 2026-03-26
**Branch:** agent-dev
**Approach:** Big Bang Rewrite — all changes ship together

---

## Overview

Complete overhaul of campaign creation: simplified 2-step wizard, chapter-based generation, dynamic encounter scaling, per-campaign character level scaling with snapshots, and chapter continuation. All user-facing "DM" references become "Host."

---

## 1. Campaign Creation UI

### New Flow: 2 Steps (was 4)

**Step 1: Concept + Forge**
- Campaign name text input (required)
- 8 Tones (button grid):
  - Heroic Fantasy, Grimdark, Horror, Mystery, Whimsical, Sword & Sorcery, War, Heist
- 8 Settings (button grid):
  - Medieval Kingdom, Frozen North, Desert Empire, Jungle Wilds, The Deep Below, Coastal Isles, Haunted Realm, Planar Crossroads
- Custom notes/premise textarea (optional, at bottom)
- Demo button: "Whispers in Millhaven" quick-start (updated to chapter format)
- **"Forge" button** — creates DB record + triggers AI generation
- Progress: single step indicator, no multi-dot progress bar needed

**Step 2: Forging → Success**
- Spinner: "Forging your world..." (same as current step 3)
- BYOK fallback if no platform key
- Error/retry
- On success: invite link + code + "Enter Campaign" button

### Removed from UI
- Campaign length dropdown (always generates 1 chapter ≈ 4 hours)
- Number of players dropdown (encounters scale dynamically)
- Starting level dropdown (always level 1)
- Main villain dropdown (AI decides based on tone/setting)

### Host Rename
All user-facing strings in campaign creation that say "DM" or "Dungeon Master" become "Host." Technical variable names (dmMode, dm_user_id, etc.) stay unchanged.

---

## 2. Chapter-Based Generation

### What is a Chapter?
A chapter is one play session's worth of content (~4 hours). Each campaign starts with Chapter 1. At the chapter milestone, players can generate Chapter 2, and so on.

### Chapter Structure
```json
{
  "title": "Campaign Title",
  "chapter": 1,
  "startArea": "area-id",
  "factions": [
    { "id": "faction-id", "name": "string", "description": "string", "alignment": "string" }
  ],
  "questObjectives": [
    { "id": "q1", "name": "string", "status": "active" }
  ],
  "storyMilestones": ["string"],
  "chapterMilestone": {
    "trigger": "defeat_boss | reach_area | complete_quest | story_flag",
    "targetId": "area-id | quest-id | flag-name",
    "description": "What marks the end of this chapter"
  },
  "areaBriefs": {
    "area-id": { /* area brief — see existing format */ }
  }
}
```

### Generator Prompt Changes
- Remove: player count, starting level, villain from prompt inputs
- Add: chapter number, "story so far" summary (for chapter 2+)
- Always level 1 for chapter 1
- Chapter milestone: AI must define a clear endpoint event
- Target content density: 5-6 areas, encounter templates (not fixed enemy counts), NPCs, side quests, one milestone boss/event
- Encounter briefs use **templates** instead of fixed enemies:

```json
"encounterZones": [
  {
    "id": "goblin_camp",
    "triggerRadius": 5,
    "difficulty": "medium",
    "enemyTemplates": [
      { "name": "Goblin", "role": "grunt", "countPerPlayer": 0.75 },
      { "name": "Goblin Boss", "role": "leader", "countPerPlayer": 0 , "fixedCount": 1 }
    ],
    "narratorPrompt": "Goblins ambush from behind the rocks"
  }
]
```

- `countPerPlayer: 0.75` means 3 goblins for 4 players, 5 for 6 players (rounded up)
- `fixedCount: 1` means always exactly 1 regardless of party size
- `role` is used by enemy AI for behavior (grunt = pathfind+attack, leader = tactical)

### Area Brief Changes
- Enemy arrays replaced by `encounterZones` with templates
- Direct `enemies: [...]` arrays removed from area briefs
- Encounter zones remain the only way enemies appear

### Backward Compatibility
- Existing campaigns with old-format `enemies: [...]` arrays continue to work
- `startCombatWithZoneEnemies()` checks for legacy format and passes through as-is
- Only newly generated campaigns use the template format
- No migration needed for existing campaign data

---

## 3. Dynamic Encounter Scaling

### At Combat Trigger Time
When a player enters an encounter zone's trigger radius:

1. Count current players in session (from partyMembers + self)
2. Resolve enemy templates:
   - `countPerPlayer * playerCount` (rounded up, minimum 1)
   - `fixedCount` added as-is
3. Scale enemy CR to party average level:
   - Grunt: CR = floor(avgLevel * 0.5), minimum CR 0.25
   - Leader: CR = avgLevel
   - Boss: CR = avgLevel + 2
   - Minion: CR = floor(avgLevel * 0.25), minimum CR 0.125
4. Look up enemy stats from monster library by name + CR
   - If exact CR not available, pick nearest and adjust HP/AC proportionally
5. Apply difficulty modifier from encounter zone brief (easy/medium/hard/deadly)
   - Easy: 0.75x total CR budget
   - Medium: 1.0x
   - Hard: 1.25x
   - Deadly: 1.5x

### Mid-Combat Scaling (Future Enhancement)
The existing `encounterScaling.js` infrastructure (checkEncounterDifficulty, suggestEncounterScaling) will be wired into the combat turn loop to add reinforcements or trigger retreats if the fight is too easy/hard. This is additive — the core trigger-time scaling is the MVP.

### What Changes in Code
- `encounterSlice.js`: `startCombatWithZoneEnemies()` resolves templates → concrete enemies at trigger time
- `randomEncounters.js`: Random encounter generation uses templates instead of fixed counts
- `bossEncounters.js`: Boss CR derived from party average level, not a fixed number
- `encounterDifficulty.js`: Party size modifier stays, but inputs are now dynamic

---

## 4. Character Level Scaling

### Per-Campaign Effective Level
- Characters have a **base level** (stored in `characters` table, their highest achieved)
- Each campaign has an **effective level** for each character (stored in `campaign_members.character_data`)
- When joining a campaign, effective level = party average level (rounded down, minimum 1)
- If party average is 0 (new campaign), effective level = 1

### Level Snapshots
On every level-up, save a snapshot of the character at that level:

```javascript
// In character_data (campaign_members JSONB)
{
  "name": "Thora",
  "level": 5,
  "levelSnapshots": {
    "1": { /* full character state at level 1 (excluding levelSnapshots key) */ },
    "2": { /* full character state at level 2 (excluding levelSnapshots key) */ },
    "3": { /* ... */ },
    "4": { /* ... */ },
    "5": { /* current state (excluding levelSnapshots key) */ }
  }
}
```

Snapshots store the full character object **minus the `levelSnapshots` key itself** to avoid recursive nesting.

### Scaling Down
When a level 7 character joins a level 3 campaign:
1. Look up `levelSnapshots["3"]`
2. If snapshot exists: restore that snapshot as the active character state
3. If snapshot doesn't exist (legacy character): auto-strip features/spells above level 3, recalculate HP/slots/features using `charBuilder.js` formulas

### Scaling Up
When a level 3 character joins a level 5 campaign:
1. No snapshots exist for levels 4-5 (never reached them)
2. Auto-level: run the level-up formula for each missing level
   - HP: average hit die + CON mod per level (no manual roll — that's for real level-ups)
   - Spell slots: computed from class table
   - Features: auto-granted per class level table
   - Spells known: auto-select from class list (prioritize what they already know)
   - ASIs at 4: apply to highest ability score
3. Save snapshots for each auto-leveled level

### When Snapshots Start
- All new characters created after this change get snapshots from level 1
- Existing characters that level up get snapshots from their current level onward
- Existing characters that scale down without snapshots use the auto-strip fallback

### What Changes in Code
- `characterSlice.js`: `applyLevelUp()` saves snapshot before applying
- `characterSlice.js`: New `scaleCharacterToLevel(targetLevel)` action
- `CharacterSelect.jsx`: On "Bring Character," compute target level and scale
- `App.jsx`: On campaign join, check party average and scale if needed
- `charBuilder.js`: New `autoLevelCharacter(char, fromLevel, toLevel)` helper
- `charBuilder.js`: New `stripToLevel(char, targetLevel)` helper

---

## 5. Chapter Continuation

### Milestone Detection
- Each chapter has a `chapterMilestone` with a trigger type and target
- The game checks milestone conditions after relevant events:
  - `defeat_boss`: after combat victory, check if boss matches targetId
  - `reach_area`: after area transition, check if area matches targetId
  - `complete_quest`: after quest objective completion, check if quest matches targetId
  - `story_flag`: after flag set, check if flag matches targetId

### When Milestone is Reached
1. Show `ChapterCompleteModal` (replaces/augments CampaignEndModal)
   - "Chapter 1 Complete!"
   - Summary of key events
   - XP/gold earned this chapter
   - Two buttons: "Continue the Story" / "End Session"

### "Continue the Story" Flow
1. Generate a "Story So Far" summary:
   - Mechanical state: party levels, HP, inventory, faction rep, quest flags
   - Narrative summary (~200 words): AI-generated from session log (major combat outcomes, NPC interactions, choices made, areas visited)
2. Call the chapter generator with:
   - Original tone + setting
   - Chapter number (incremented)
   - Story so far summary
   - Current quest state
   - Current faction state
3. AI generates Chapter 2 area briefs
4. Append new areaBriefs to campaign data
5. Transition to the new chapter's start area
6. Broadcast to all players

### "End Session" Flow
- Save all state to Supabase
- Return to campaign select
- Campaign persists — players can "Continue the Story" next time they play

### What Changes in Code
- `campaignSlice.js`: `chapterMilestone` tracked in campaign state
- New `ChapterCompleteModal.jsx` component
- New `generateStorySoFar(sessionLog, campaignState)` function in `campaignGenerator.js`
- `campaignGenerator.js`: `generateNextChapter(tone, setting, chapter, storySoFar, questState, factionState)` function
- Milestone check hooks in: encounter victory handler, area transition handler, quest completion handler, story flag handler

---

## 6. Demo Campaign Update

"Whispers in Millhaven" updated to match new chapter format:
- Uses encounter templates instead of fixed enemy arrays
- Includes a `chapterMilestone` (defeat Goblin Boss in Sunken Ruins)
- Level snapshots saved for demo character
- No player count baked in — demo enemies scale dynamically
- Factions and quest objectives remain (Millhaven Guard, Goblin Tribe)

---

## 7. Host Rename (Campaign Creation Scope)

User-facing strings only within campaign creation flow:
- "DM" → "Host" in UI labels, tooltips, button text
- `role: 'dm'` stays in database/code (technical, not user-facing)
- `dmMode` variable stays (technical)
- `dm_user_id` column stays (technical)
- This rename is scoped to CreateCampaign.jsx and related UI. A broader rename across the whole game is out of scope for this change.

---

## 8. Files Modified

| File | Changes |
|------|---------|
| `src/components/CreateCampaign.jsx` | Full rewrite: 2-step wizard, new tones/settings, Host rename |
| `src/lib/campaignGenerator.js` | New chapter-format prompt, encounter templates, continuation generation |
| `src/data/demoArea.js` | Update to chapter format with encounter templates + milestone |
| `src/store/encounterSlice.js` | Resolve encounter templates → concrete enemies at trigger time |
| `src/lib/randomEncounters.js` | Template-based random encounter generation |
| `src/lib/bossEncounters.js` | CR from party average level |
| `src/lib/encounterDifficulty.js` | Accept dynamic party size at trigger time |
| `src/store/characterSlice.js` | Level snapshots, scaleCharacterToLevel action |
| `src/lib/charBuilder.js` | autoLevelCharacter, stripToLevel helpers |
| `src/components/CharacterSelect.jsx` | Scale character on campaign join |
| `src/App.jsx` | Party average level calculation, scale on join |
| `src/store/campaignSlice.js` | Chapter milestone tracking, chapter state |
| `src/components/ChapterCompleteModal.jsx` | **New file** — chapter completion UI |
| `src/components/game/GameModalsRenderer.jsx` | Wire ChapterCompleteModal |

---

## 9. What Is NOT Changing

- Combat system internals (action economy, spell targeting, etc.)
- PixiJS renderer / area builder / chunk library
- Multiplayer broadcast system (new events added, existing ones untouched)
- NPC interaction system
- Inventory / equipment / magic items
- Weather / day-night / ambient systems
- Auth / Supabase schema (no migrations needed — all changes fit in existing JSONB columns)

---

## 10. Risk Mitigation

- **Generator prompt quality**: The AI might produce bad JSON with the new template format. Validation in `validateCampaignJson` must check for `encounterZones` with `enemyTemplates` arrays.
- **Snapshot storage size**: Level snapshots add ~2-5KB per level to character_data JSONB. At level 20 that's 40-100KB — well within Supabase JSONB limits.
- **Auto-level quality**: Auto-leveled characters won't have human-picked spells/ASIs. The fallback (auto-select) should be reasonable but not optimal. Players can reconfigure after joining.
- **Chapter size tuning**: Starting with 5-6 areas per chapter. This is a guess. Will need playtesting to dial in. The generator prompt parameter is easy to change.
