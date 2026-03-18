# DM's Tome — Inventory, Loot, Rules Assistant, Spell Selection, Character Sheet

## Already confirmed working (no changes needed)
- ✅ Initiative = 1d20 + DEX modifier (dice.js `rollInitiative` does this correctly)
- ✅ SRD data already bundled: spells.js, monsters.js, equipment.js (weapons/armor), classes.js, races.js
- ✅ LevelUpModal.jsx exists (475 lines) — HP gain, features, spell slot upgrade
- ✅ CharacterSheet.jsx exists — needs to be wired to portrait clicks

---

## Implementation Plan

### 1. SRD Consumables & Item Database (FOUNDATION — other features depend on it)
- [ ] Add `CONSUMABLES` array to `equipment.js`: Healing Potion (2d4+2 HP, action), Greater Healing Potion (4d4+4), Antitoxin, Torch, Tinderbox, Rations, Rope, Thieves' Tools, etc.
- [ ] Each consumable: `{ name, type:'consumable', effect:{type:'heal'|'condition-remove'|..., value}, actionType:'action'|'bonus', description, cost, weight }`
- [ ] Export unified `ITEMS` map (id → item) for quick lookups throughout system

### 2. Inventory System
- [ ] Add `inventory` array to character schema in CharacterCreate.jsx (default starting consumables: 1 healing potion)
- [ ] `useStore` actions: `addItemToInventory(characterId, item)`, `removeItemFromInventory(characterId, itemId)`, `useItem(characterId, itemId)` — applies effect (heal, etc.), removes if consumed
- [ ] `InventoryModal.jsx` — drawer/modal triggered by backpack button
  - List items with name, quantity, description
  - "Use" button for consumables (disabled if not your turn in combat)
  - "Drop" button to remove
  - Show carried gold total
- [ ] Backpack button (🎒) in ScenePanel overlay controls area or game header
- [ ] In combat `ActionPanel.jsx`: show consumable items as "Use Item" action options, clicking uses the item + spends action

### 3. Post-Combat Loot & XP Screen
- [ ] `LootScreen.jsx` — shown when `encounter.phase === 'victory'`
  - XP earned: sum `crToXp(enemy.cr)` for all slain enemies, displayed per-player (split by party count)
  - Gold drops: generate from CR-based treasure table (simple lookup: CR 0-1→2d6gp, CR 2-4→2d6×10gp, etc.)
  - Item drops: 1–2 random consumables from loot table; each shown as an unclaimed card
  - "Claim Item" button: first player to click claims it → item added to their inventory
  - "Split Gold" button: divides gold equally among all party members, adds to their `gold` stat
  - "Continue" button → triggers level-up check (if XP crossed threshold, open LevelUpModal)
- [ ] Wire into CombatPhase: when all enemies dead, after victory narration delay, show LootScreen overlay
- [ ] `store.addXp(characterId, amount)` action — adds XP, checks level threshold, fires `setPendingLevelUp`
- [ ] `store.addGold(characterId, amount)` action — adds to character.gold

### 4. Guided Level-Up Wizard (extend LevelUpModal.jsx)
- [ ] Already has HP gain choice — verify it shows all features unlocked at new level (from classes.js)
- [ ] Add spell selection step for casters leveling up (pick new known spells / expand prepared list)
- [ ] Show subclass selection at level 3 (Sorcerous Origin, Martial Archetype, etc.) — inform player it's flavor for now
- [ ] Properly update proficiency bonus, attack bonus, save DCs on level-up
- [ ] Save updated character to Supabase via `campaign_members` update

### 5. Character Portrait → Character Sheet Popup
- [ ] Find where party portraits render in `PartyHUD.jsx` or similar
- [ ] Add `onClick` → `setViewingCharacter(member.character_data)` state in parent
- [ ] Wrap `CharacterSheet` in a full-screen modal overlay with close button
- [ ] Other players can view but not edit (pass `readOnly={member.userId !== user.id}`)

### 6. AI Rules Assistant
- [ ] Floating "?" or "Rules" button in game header (top right, near ⚙ settings)
- [ ] `RulesAssistant.jsx` — modal with a chat-like interface
  - User types a rules question
  - System prompt: "You are a D&D 5e rules expert. Answer concisely. Use SRD rules only. If referencing a spell, check the spell data: [inject relevant spell/item/class data based on keywords]"
  - Keyword injection: detect spell names → inject from spells.js, item names → equipment.js, class names → classes.js
  - Use same Claude Haiku call pattern as narratorApi.js
  - Store recent questions so modal can be reopened with history visible
- [ ] Add `askRulesQuestion(question, apiKey)` helper in `narratorApi.js`

### 7. Spell Selection at Character Creation
- [ ] New `StepSpells.jsx` in `src/components/characterCreate/`
- [ ] Insert as a step after Class (step 2) only for spellcasting classes
- [ ] Cantrips section: show all class cantrips, allow choosing up to class max (Wizard 3, Sorcerer 4, Cleric 3, etc.)
- [ ] Leveled spells section: show all level 1 spells for the class, allow choosing per rules:
  - Wizard: 6 spells for spellbook (prepared = INT mod + level)
  - Sorcerer: 2 known spells
  - Warlock: 2 known spells
  - Bard: 4 known spells
  - Cleric/Druid/Paladin: all domain/class spells available (prepare each day — show as "available")
  - Ranger: no spells at level 1
- [ ] Selected spells stored in character.spells (replaces hardcoded STARTER_SPELLS)
- [ ] STEPS array in charBuilder.js updated to include "Spells" between Class and Background (only for casters)

---

## File touch list
- `src/data/equipment.js` — add CONSUMABLES, export ITEMS map
- `src/store/useStore.js` — addItemToInventory, removeItemFromInventory, useItem, addXp, addGold
- `src/components/InventoryModal.jsx` — new
- `src/components/LootScreen.jsx` — new
- `src/components/RulesAssistant.jsx` — new
- `src/components/characterCreate/StepSpells.jsx` — new
- `src/components/CharacterCreate.jsx` — add Spells step, wire spell selections
- `src/components/CharacterSheet.jsx` — read-only mode support, export for modal use
- `src/components/combat/ActionPanel.jsx` — add Use Item action
- `src/components/combat/CombatPhase.jsx` — show LootScreen on victory
- `src/lib/charBuilder.js` — update STEPS to include Spells step for casters
- `src/lib/narratorApi.js` — add askRulesQuestion
- Game UI (ScenePanel or App) — backpack button, rules button, portrait click handler

---

## Review Notes
- Keep all files under 400 lines (extract sub-components as needed)
- Initiative DEX question: already correct — no change needed
- STARTER_SPELLS in charBuilder.js will become the fallback if a player skips spell selection
