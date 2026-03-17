# Party Panel + Resource Tracking

## Goal
- Left panel in EncounterView: compact party health/condition/resource view
- Bottom-left sub-panel: active combatant details (DM) / own character details (player)
- Auto-defined class resource pools (Ki, Rages, Action Surge, etc.)
- Short/Long rest buttons (DM-only) that restore appropriate resources
- Resources persist via campaigns.campaign_data in Supabase

---

## Architecture

### Layout change (EncounterView)
```
[ PartyPanel 200px ] [ Map + Log + Sidebar (existing) ]
[ CharDetailPanel  ] [                                 ]
```
Left column:
- Top: scrollable party list (HP bar, conditions, resource pips)
- Bottom: collapsible character detail (stats, resources, abilities)

### New file: src/lib/classResources.js
Per-class resource definitions: name, icon, max(level, stats), resetOn: 'short'|'long'
Classes covered: Barbarian, Monk, Fighter, Paladin, Cleric, Druid, Sorcerer, Warlock, Bard
(Ranger/Rogue/Wizard have no simple pool resources)

### Store changes (useStore.js)
- `addCharacter` and `startEncounter` → init `resourcesUsed: {}` on characters
- New action: `spendResource(charId, resourceName)` → increment used count
- New action: `gainResource(charId, resourceName, amount)` → decrement used count (min 0)
- New action: `shortRest()` → restore all 'short' resources for all characters + log
- New action: `longRest()` → restore ALL resources + set currentHp = maxHp for all + log
- New action: `saveCampaignToSupabase()` → writes campaign.characters to campaigns.campaign_data (called after rest)

### New component: PartyPanel
Props: { combatants, characters, dmMode, onSelectCombatant }
- Compact row per player combatant: portrait circle, name, HP bar, conditions, resource pips
- Enemies shown as a collapsed count "X enemies" with aggregate dead/alive
- Click row → selects token on map

### New component: CharDetailPanel
Props: { combatant, character, isDM }
- Header: portrait, name, race/class, HP, AC, speed
- Stats row: STR/DEX/CON/INT/WIS/CHA with modifiers
- Resources section: ResourceTracker per resource pool
- Actions/attacks list (collapsible)
- Shown below PartyPanel in left column

### ResourceTracker (inline sub-component within CharDetailPanel)
Per resource: name, icon, pip row (filled/empty circles × max), spend/recover buttons
Special case for Lay on Hands: numeric pool (not pips), ± buttons

---

## Tasks

- [ ] 1. Create src/lib/classResources.js with getClassResources(cls, level, stats)
- [ ] 2. Update useStore.js: resourcesUsed on characters, spendResource, gainResource, shortRest, longRest, saveCampaignToSupabase
- [ ] 3. Create PartyPanel component
- [ ] 4. Create CharDetailPanel + ResourceTracker component
- [ ] 5. Update EncounterView: add left column with PartyPanel + CharDetailPanel, short/long rest buttons
- [ ] 6. Test build, commit, push

---

## Resource Definitions Reference

| Class      | Resource           | Max                        | Resets  |
|------------|--------------------|----------------------------|---------|
| Barbarian  | Rages              | 2→3→4→5→6/∞ by level     | Long    |
| Monk       | Ki Points          | = level                    | Short   |
| Fighter    | Action Surge       | 1 (2 at L17)               | Short   |
| Fighter    | Second Wind        | 1                          | Short   |
| Fighter    | Indomitable (L9+)  | 1→2→3 by level            | Long    |
| Paladin    | Channel Divinity   | 1→2→3 by level            | Short   |
| Paladin    | Lay on Hands       | level × 5 (HP pool)        | Long    |
| Cleric     | Channel Divinity   | 1→2→3 by level            | Short   |
| Druid      | Wild Shape         | 2                          | Short   |
| Warlock    | Pact Magic Slots   | 1→2→3→4 by level          | Short   |
| Sorcerer   | Sorcery Points     | = level                    | Long    |
| Bard       | Bardic Inspiration | = CHA mod (min 1)          | Long (Short at L5+) |

---

## Review
(fill in after implementation)
