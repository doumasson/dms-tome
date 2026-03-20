# Phase 9: Gameplay Systems — Design Spec

> Inventory overhaul, equipment stat modifiers, magic items, death saves UI, rest system, day/night cycle, curated chunks, gold persistence fix.
> All features in one spec. Data-driven for future universe swap away from D&D content.

---

## 1. Inventory Grid Rewrite

**Problem:** Current grid has stair-stepping placement, janky drag that moves other items, and loot doesn't find next available slot. Root cause: naive packing algorithm + array index swapping instead of spatial grid logic.

### Spatial Grid with Bitmap Collision

- Internal `occupancy` Uint8Array (10×7 = 70 cells). Each cell stores item index+1 or 0 (empty).
- **Placement algorithm:** scan left-to-right, top-to-bottom. For each cell, check if the item's full footprint (e.g., 2×3 for armor) fits without overlapping occupied cells. Place at first valid position.
- **Drag-and-drop:** pick up item → clear its cells from occupancy → show ghost at cursor snapped to grid → on drop, check if target footprint is clear → if clear, place. If occupied, **reject drop** (item returns to original position). Never swap or move other items.
- **Loot insertion:** same left-to-right, top-to-bottom scan. If grid is full, item goes to overflow list with warning.
- **Persistence:** `_gridCol` and `_gridRow` saved per item. On load, items placed at saved positions first, then remaining items packed into free space.
- **Grid size:** 10 columns × 7 rows (70 cells, unchanged).

### Item Sizes (rectangular, option C — no tetris shapes)

```js
// Data-driven — loaded from src/data/itemSizes.json
{
  "weapon_light": [1, 2],    // daggers, handaxes
  "weapon_one_handed": [1, 3], // longswords, maces
  "weapon_two_handed": [2, 3], // greatswords, greataxes
  "weapon_ranged": [1, 3],   // bows, crossbows
  "armor_light": [2, 2],     // leather, padded
  "armor_medium": [2, 3],    // chain shirt, breastplate
  "armor_heavy": [2, 3],     // plate, chain mail
  "shield": [2, 2],
  "potion": [1, 1],
  "scroll": [1, 1],
  "ring": [1, 1],
  "amulet": [1, 1],
  "wand": [1, 2],
  "staff": [1, 3],
  "cloak": [2, 2],
  "boots": [1, 1],
  "gloves": [1, 1],
  "helmet": [1, 1],
  "default": [1, 1]
}
```

### Weight & Encumbrance (enforced)

```
Carry capacity = STR × 15 lbs
Encumbered (STR × 5): speed -10ft
Heavily encumbered (STR × 10): speed -20ft, disadvantage on STR/DEX/CON checks
Over capacity: cannot pick up items
```

- Weight bar in inventory UI: green → yellow → red.
- Encumbrance penalties applied to `remainingMove` in combat and `speed` for pathfinding.
- Loot pickup blocked if over capacity (message: "Inventory too heavy").

### Files
- Rewrite: `src/components/characterSheet/InventoryGrid.jsx` (full rewrite — spatial bitmap packing)
- Create: `src/lib/inventoryGrid.js` (pure logic: pack, canPlace, findSlot, drag validation — testable)
- Create: `src/lib/inventoryGrid.test.js`
- Create: `src/data/itemSizes.json`
- Modify: `src/store/useStore.js` (encumbrance penalties on movement)

---

## 2. Equipment & Magic Item System

### Stat Modifier System

Items get a `modifiers` array:
```json
{
  "name": "+1 Longsword",
  "modifiers": [
    { "stat": "attackBonus", "value": 1 },
    { "stat": "damageBonus", "value": 1 }
  ]
}
```

Possible modifier stats:
| Stat | Effect |
|------|--------|
| `ac` | Added to AC |
| `attackBonus` | Added to attack rolls |
| `damageBonus` | Added to damage rolls (flat integer) |
| `damageDice` | Extra damage dice (e.g., `"2d6"`, with optional `type: "fire"`) |
| `saveBonus` | Added to all saving throws |
| `saveBonusSpecific` | Added to specific save (e.g., `{ stat: "saveDex", value: 2 }`) |
| `speed` | Added to movement speed |
| `spellDC` | Added to spell save DC |
| `statBonus` | Increase ability score (e.g., `{ stat: "str", value: 2 }`) |
| `hp` | Added to max HP |

### Derived Stats (computed, never stored flat)

```js
function computeDerivedStats(character) {
  const base = { ...character.stats }
  const equipped = Object.values(character.equippedItems || {}).filter(Boolean)
  const attuned = equipped.filter(i =>
    !i.requiresAttunement || character.attunedItems?.includes(i.instanceId)
  )

  // Apply stat bonuses from attuned equipment
  for (const item of attuned) {
    for (const mod of item.modifiers || []) {
      if (mod.stat === 'str' || mod.stat === 'dex' || ...) base[mod.stat] += mod.value
    }
  }

  // Compute AC from armor + DEX + modifiers
  const ac = computeAcFromEquipped(character.equippedItems, base)
    + sumModifiers(attuned, 'ac')

  // Compute attack bonus, damage bonus, save bonuses, speed, etc.
  return { ac, attackBonus, damageBonus, saveBonus, speed, ... }
}
```

- Called on equip/unequip/attune/level-up.
- Result cached on character object for combat use.
- Combat attack resolution reads derived stats, not raw equipment fields.

### Attunement (5e RAW)

- `character.attunedItems: string[]` — max 3 instanceIds.
- Items with `requiresAttunement: true` must be attuned for modifiers to apply.
- Attune action: short rest required (UI button on item in inventory when resting).
- Un-attune: free action (unless cursed).
- UI: attunement slots shown in equipment pane (3 diamond icons — filled when attuned).

### Cursed Items

- `cursed: true` flag on item.
- Once attuned, `canUnattune: false` — un-attune button disabled.
- `curseEffect: string` — description shown in item tooltip.
- Removal requires Remove Curse spell (AI DM can handle narratively).

### Charges

```json
{
  "name": "Wand of Fireballs",
  "charges": { "current": 7, "max": 7, "recharge": "dawn" },
  "requiresAttunement": true
}
```

- `recharge: "dawn"` → restore `1d6+1` charges on long rest.
- `recharge: null` → no recharge, item is depleted when empty.
- UI: charge counter shown on item in inventory grid.

### Data-Driven Architecture (future universe swap)

All item/magic definitions live in data files, NOT hardcoded in components:
- `src/data/magicItems.json` — all magic item templates
- `src/data/lootTables.json` — CR-based loot tables (rarity distribution)
- `src/data/itemSizes.json` — grid sizes per item category
- `src/data/equipment.js` — base weapons/armor/consumables (already exists, keep extending)

When cutting D&D content, swap these files. Components import from them generically.

### Campaign-Relevant Magic Items

The campaign generator prompt instructs Claude to include rare/magic items tied to the story:
- Boss enemies may carry named magic items
- Treasure rooms contain campaign-relevant artifacts
- Items reference story elements (the lich's cursed amulet, the dragon's flaming sword)
- `brief.loot` array on area briefs lists possible drops with rarity

### Files
- Create: `src/lib/derivedStats.js` (computeDerivedStats, sumModifiers)
- Create: `src/lib/derivedStats.test.js`
- Create: `src/data/magicItems.json`
- Create: `src/data/lootTables.json`
- Modify: `src/data/equipment.js` (add modifiers array to items, attunement flags)
- Modify: `src/store/useStore.js` (attunedItems, equip triggers recompute, charge tracking)
- Modify: `src/components/characterSheet/EquipmentPane.jsx` (attunement slots UI, charge display)

---

## 3. Post-Combat Loot Overhaul

### Gold Auto-Split
- Total gold from all enemies calculated via CR table.
- Split evenly among living party members. Remainder goes to party leader (host).
- Each player's gold updated immediately via `addGold()` → `updateMyCharacter()` → Supabase.

### Magic Item Roll-Off

When magic items drop:
1. **Eligibility check:** only characters proficient with the item can roll. Plate armor → only heavy armor proficient classes. Longsword → only martial weapon proficient classes. Universal items (rings, amulets, potions) → everyone eligible.
2. **Roll panel:** eligible characters see a d20 roll button. One roll each.
3. **Highest roll wins.** Ties re-roll.
4. **Winner gets item** → inserted into their inventory grid at next available slot.
5. **Non-eligible characters** see the item but their roll button is disabled with tooltip: "Not proficient."

### Loot Table System

```json
// src/data/lootTables.json
{
  "individual": {
    "cr0-4": { "gold": "2d6", "items": [] },
    "cr5-10": { "gold": "4d6*10", "items": [{ "rarity": "uncommon", "chance": 0.3 }] },
    "cr11-16": { "gold": "6d6*100", "items": [{ "rarity": "rare", "chance": 0.5 }] },
    "cr17+": { "gold": "10d6*1000", "items": [{ "rarity": "very_rare", "chance": 0.7 }] }
  },
  "hoard": {
    "cr0-4": { "gold": "6d6*100", "items": [{ "rarity": "uncommon", "count": "1d4" }] }
  }
}
```

- Table roll determines rarity/count.
- AI DM narrates the items and can swap for something thematically appropriate.
- Hybrid: table provides structure, AI provides flavor.

### Files
- Rewrite: `src/components/LootScreen.jsx` (gold split, roll-off panel, eligibility check)
- Create: `src/data/lootTables.json`
- Modify: `src/lib/lootGenerator.js` (table-based generation)

---

## 4. Death & Unconscious in V2

### V2 UI for Dying Characters

The store logic is fully implemented. The gap is V2 HUD rendering.

**Initiative strip:**
- Dying character portrait gets **red pulse CSS animation** + skull icon overlay.
- Dead character (3 failures) → portrait goes **grey desaturated** + "DEAD" text.

**CombatActionBar swap:**
- When the active combatant has `currentHp <= 0` and `deathSaves.failures < 3`:
  - Primary action buttons hidden.
  - Replaced with **Death Save panel:**
    - Large "🎲 Roll Death Save" button.
    - 3 green pips (successes) + 3 red pips (failures) — filled as they accumulate.
    - Adjacent ally/DM sees "✚ Stabilize" button (Medicine DC 10).
  - On nat 20: flash green, auto-heal to 1 HP, action bar returns to normal.
  - On 3 failures: flash red, portrait goes dead, removed from initiative next round.

**Healing while dying:**
- Full heal amount applied (not just 1 HP). Character at 0 HP healed for 8 → at 8 HP.
- Death saves reset immediately.
- Portrait returns to normal, action bar returns to normal combat actions.
- Character can act on their next turn.

**Session log:**
- All death save results logged and broadcast: "Wizard death save: 12 — success (1/3)"
- Stabilization logged: "Cleric stabilizes Wizard with Medicine check"
- Revival logged: "Wizard is healed for 8 HP and rejoins the fight!"

### Files
- Modify: `src/hud/CombatActionBar.jsx` (death save panel swap)
- Modify: `src/hud/InitiativeStrip.jsx` (dying/dead portrait overlays)
- Modify: `src/GameV2.jsx` (death save roll handler, heal-while-dying handler)

---

## 5. Rest System in V2

### One Button, Two Options

- REST button in ActionArea (already exists as 🏕).
- Click → **popover** with two buttons: "Short Rest (1hr)" and "Long Rest (8hr)".
- **Long rest disabled** when area theme is `dungeon`, `cave`, `crypt`, or `sewer`. Tooltip: "Cannot long rest here — find a safe location."
- **REST disabled** during combat (`inCombat`).

### Short Rest — Mandatory Hit Dice

After majority vote passes:
1. Hit dice spending phase opens.
2. Player **must roll at least one hit die** before they can close. No skip button.
3. If they have 0 hit dice remaining, show message: "No hit dice remaining — you gain no benefit from this rest" and allow close.
4. "Done Resting" button only enabled after at least 1 roll (or 0 dice remaining).

### Long Rest — Theme-Gated

- Only available in outdoor/settlement themes.
- Full HP restore, spell slots reset, resources reset, restore floor(level/2) hit dice.
- Recharge magic item charges (`recharge: "dawn"`).
- Advances game clock by 8 hours (see Section 7).

### Files
- Modify: `src/hud/ActionArea.jsx` (rest type popover)
- Modify: `src/components/RestModal.jsx` (mandatory hit dice, long rest theme gate)
- Modify: `src/store/useStore.js` (magic item charge recharge on long rest)

---

## 6. Gold Persistence Fix

### Bug

Gold is not surviving session reload. The `character.gold` field exists but either:
- Not included in the Supabase write path, OR
- Overwritten on load from stale campaign_data.

### Fix

- Audit `updateMyCharacter()` → verify `gold` field is included in the merge.
- Audit `loadCharacterFromSupabase()` → verify `gold` is read from `character_data.gold`.
- Audit `addGold()` → verify it calls `updateMyCharacter()` after mutation.
- Audit `LootScreen.handleTakeRewards()` → verify gold is saved, not just set locally.
- Add explicit test: set gold → save → reload → verify gold matches.

### Files
- Modify: `src/store/useStore.js` (audit save/load path for gold)
- Test manually: set gold, refresh, verify persistence.

---

## 7. Day/Night Cycle

### Game Clock (Hybrid — clock + DM override)

**Time state:**
```js
{
  gameTime: {
    hour: 14,        // 0-23
    day: 1,          // Day count since campaign start
    timeOfDay: 'day' // 'dawn' | 'day' | 'dusk' | 'night'
  }
}
```

**Time advancement:**
| Action | Time Cost |
|--------|-----------|
| Area transition (travel) | 1-2 hours (brief can specify) |
| Short rest | 1 hour |
| Long rest | 8 hours |
| Combat encounter | 10 minutes (per 5e rules) |
| Exploration (per area) | Varies, DM narrates |

**Time-of-day thresholds:**
| timeOfDay | Hours |
|-----------|-------|
| dawn | 5:00 – 7:59 |
| day | 8:00 – 17:59 |
| dusk | 18:00 – 19:59 |
| night | 20:00 – 4:59 |

**AI DM override:** Claude can set `timeOfDay` directly via narrator action for dramatic effect (e.g., "As you enter the cursed forest, the sky darkens unnaturally...").

### Visual Effect

PixiJS color matrix filter on the world container:

| timeOfDay | Tint | Brightness | Ambient |
|-----------|------|------------|---------|
| dawn | warm orange (#ffd4a0) | 0.85 | Soft glow |
| day | none (full brightness) | 1.0 | Normal |
| dusk | warm red-orange (#ffb080) | 0.75 | Long shadows |
| night | deep blue (#4060a0) | 0.4 | Torch/fire sources glow brighter |

- **Night vision:** characters with darkvision see further at night (already handled by visionCalculator.js).
- **Light sources matter more at night:** torch radius becomes critical for fog of war visibility.
- **Interior areas unaffected:** buildings and dungeons use their own lighting (already have ambient glow system).

### HUD Clock Display

Small clock in the top-left area (near zone label):
- Shows hour in fantasy format: "2nd Bell of Afternoon" or simple "2:00 PM, Day 3"
- Sun/moon icon changes with timeOfDay.
- Subtle — doesn't take much space.

### Multiplayer Sync

- `gameTime` state in Zustand store.
- Broadcast on time changes: `broadcastEncounterAction({ type: 'time-advance', gameTime })`.
- All clients sync to host's clock.

### Files
- Create: `src/lib/gameTime.js` (advanceTime, getTimeOfDay, formatTime)
- Create: `src/lib/gameTime.test.js`
- Create: `src/engine/DayNightFilter.js` (PixiJS color matrix filter)
- Modify: `src/store/useStore.js` (gameTime state, advanceTime action)
- Modify: `src/GameV2.jsx` (wire filter to canvas, advance time on rest/travel)
- Modify: `src/hud/GameHUD.jsx` (clock display)
- Modify: `src/lib/narratorApi.js` (include time in DM system prompt)

---

## 8. More Curated Chunks (~14 new → 36 total)

### New Chunks

**Dungeon variety:**
- Cave chamber (12x10) — stalactites, pools, natural rock formations
- Cave tunnel (16x4) — narrow winding passage with rubble
- Sewer junction (10x10) — grates, water channels, walkways
- Crypt hall (14x8) — sarcophagi rows, candle alcoves, marble floor

**Wilderness:**
- Forest clearing large (12x12) — varied trees, underbrush, fallen logs, mushrooms
- River crossing (14x6) — bridge or ford, rocks, reeds
- Cliff ledge (10x6) — narrow path, drop-off edge, boulders
- Swamp (10x10) — murky water, dead trees, lily pads

**Town buildings:**
- Stable (12x6) — stalls, hay bales, tack room, trough
- Library (10x10) — bookshelves, reading tables, candelabras, ladder
- Warehouse (14x8) — crate stacks, barrel rows, loading dock, office
- Chapel (8x10) — pews, altar, stained glass (prop), vestry

**Multi-room variants:**
- Inn ground (14x10) — lobby, dining room, fireplace, stairs
- Inn upper (14x10) — hallway, 3 guest rooms, stairs

Each chunk uses **diverse, relevant FA atlas tiles** — not just floors and walls. Props layer filled with thematic furniture, decor, and interactive objects. Every room should feel lived-in.

### Files
- Create: 14 chunk files in `src/data/chunks/{rooms,terrain,buildings,landmarks}/`
- Modify: `src/data/chunks/index.js` (register all)

---

## Non-Goals
- Pitched roofs (still blocked on FA slope assets)
- Coin type conversion (cp/sp/gp/pp) — gold only for now
- Two-weapon fighting rules
- Crafting system
- Shop/merchant UI (future)
