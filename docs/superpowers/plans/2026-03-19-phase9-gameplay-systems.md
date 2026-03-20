# Phase 9: Gameplay Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement inventory overhaul (Dark & Darker style grid), magic items with attunement, death saves in V2, rest system, day/night cycle, loot roll-off, gold persistence fix, and 14 new curated chunks.

**Architecture:** Data-driven item/loot system with JSON configs (swappable for future universe). Spatial bitmap grid for inventory. Derived stats computed from base + equipment. PixiJS color filter for day/night. All features multiplayer-synced via existing broadcast system.

**Tech Stack:** React, PixiJS v8, Zustand, Vitest, Supabase.

**Spec:** `docs/superpowers/specs/2026-03-19-phase9-gameplay-systems-design.md`

---

## Feature 1: Inventory Grid Rewrite

### Task 1: Inventory Grid Logic (TDD)

**Files:**
- Create: `src/lib/inventoryGrid.js`
- Create: `src/lib/inventoryGrid.test.js`
- Create: `src/data/itemSizes.json`

- [ ] **Step 1: Create itemSizes.json**

```json
{
  "weapon_light": [1, 2],
  "weapon_one_handed": [1, 3],
  "weapon_two_handed": [2, 3],
  "weapon_ranged": [1, 3],
  "armor_light": [2, 2],
  "armor_medium": [2, 3],
  "armor_heavy": [2, 3],
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

- [ ] **Step 2: Write failing tests**

```js
// src/lib/inventoryGrid.test.js
import { describe, it, expect } from 'vitest'
import { GridPacker } from './inventoryGrid.js'

describe('GridPacker', () => {
  it('places 1x1 item at 0,0', () => {
    const g = new GridPacker(10, 7)
    const pos = g.findSlot(1, 1)
    expect(pos).toEqual({ col: 0, row: 0 })
  })

  it('places items left-to-right, top-to-bottom', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 1)
    const pos = g.findSlot(1, 1)
    expect(pos).toEqual({ col: 2, row: 0 })
  })

  it('returns null when grid is full', () => {
    const g = new GridPacker(2, 2)
    g.place('a', 0, 0, 2, 2)
    expect(g.findSlot(1, 1)).toBeNull()
  })

  it('rejects overlapping placement', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 2)
    expect(g.canPlace(1, 1, 1, 1)).toBe(false)
    expect(g.canPlace(2, 0, 1, 1)).toBe(true)
  })

  it('clears item cells on remove', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 2)
    g.remove('a')
    expect(g.canPlace(0, 0, 2, 2)).toBe(true)
  })

  it('packs multiple items without overlap', () => {
    const g = new GridPacker(10, 7)
    const items = [
      { id: 'a', w: 2, h: 3 },
      { id: 'b', w: 1, h: 1 },
      { id: 'c', w: 2, h: 2 },
    ]
    for (const item of items) {
      const pos = g.findSlot(item.w, item.h)
      expect(pos).not.toBeNull()
      g.place(item.id, pos.col, pos.row, item.w, item.h)
    }
    // Verify no overlap via occupancy check
    expect(g.canPlace(0, 0, 1, 1)).toBe(false) // occupied by 'a'
  })
})
```

- [ ] **Step 3: Implement inventoryGrid.js**

```js
// src/lib/inventoryGrid.js
import itemSizes from '../data/itemSizes.json'

export function getItemSize(item) {
  if (item._sizeOverride) return item._sizeOverride
  const key = item.sizeCategory || item.armorType || item.category || 'default'
  // Try exact match, then prefix matches
  if (itemSizes[key]) return itemSizes[key]
  for (const [k, v] of Object.entries(itemSizes)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  if (item.baseAC !== undefined) return itemSizes.armor_medium || [2, 3]
  if (item.damage) return itemSizes.weapon_one_handed || [1, 3]
  return itemSizes.default
}

export class GridPacker {
  constructor(cols = 10, rows = 7) {
    this.cols = cols
    this.rows = rows
    this.grid = new Uint8Array(cols * rows) // 0 = empty, index+1 = item
    this.items = new Map() // id → { col, row, w, h }
    this._nextIdx = 1
  }

  canPlace(col, row, w, h) {
    if (col < 0 || row < 0 || col + w > this.cols || row + h > this.rows) return false
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (this.grid[r * this.cols + c] !== 0) return false
      }
    }
    return true
  }

  place(id, col, row, w, h) {
    const idx = this._nextIdx++
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this.grid[r * this.cols + c] = idx
      }
    }
    this.items.set(id, { col, row, w, h, idx })
    return true
  }

  remove(id) {
    const info = this.items.get(id)
    if (!info) return
    for (let r = info.row; r < info.row + info.h; r++) {
      for (let c = info.col; c < info.col + info.w; c++) {
        if (this.grid[r * this.cols + c] === info.idx) {
          this.grid[r * this.cols + c] = 0
        }
      }
    }
    this.items.delete(id)
  }

  findSlot(w, h) {
    for (let row = 0; row <= this.rows - h; row++) {
      for (let col = 0; col <= this.cols - w; col++) {
        if (this.canPlace(col, row, w, h)) return { col, row }
      }
    }
    return null
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/inventoryGrid.test.js`
Expected: All 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventoryGrid.js src/lib/inventoryGrid.test.js src/data/itemSizes.json
git commit -m "feat: spatial grid packer for inventory with TDD"
```

### Task 2: Rewrite InventoryGrid Component

**Files:**
- Rewrite: `src/components/characterSheet/InventoryGrid.jsx`

- [ ] **Step 1: Rewrite InventoryGrid using GridPacker**

Full rewrite of `src/components/characterSheet/InventoryGrid.jsx`. Key changes:
- Import `GridPacker` and `getItemSize` from `src/lib/inventoryGrid.js`
- On render: create GridPacker, place items with saved positions first (`_gridCol`/`_gridRow`), then auto-pack remaining via `findSlot()`
- Drag-and-drop: on pickup, call `packer.remove(item.instanceId)`. On drop at grid cell, check `packer.canPlace()`. If valid, place and save new `_gridCol`/`_gridRow`. If invalid, return item to original position.
- Never swap items. Invalid drops = reject.
- Weight bar: compute total weight, show carry capacity (`STR * 15`), color code green/yellow/red
- Overflow: items that don't fit packed grid shown in list below with "Inventory Full" warning

- [ ] **Step 2: Test in browser**

Open character sheet, verify items pack left-to-right/top-to-bottom. Drag item — verify smooth ghost, snap to grid, no other items move. Fill grid — verify overflow list appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/characterSheet/InventoryGrid.jsx
git commit -m "feat: rewrite inventory grid with spatial bitmap packing + clean drag-drop"
```

---

## Feature 2: Equipment Stat Modifiers & Magic Items

### Task 3: Derived Stats Module (TDD)

**Files:**
- Create: `src/lib/derivedStats.js`
- Create: `src/lib/derivedStats.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/derivedStats.test.js
import { describe, it, expect } from 'vitest'
import { computeDerivedStats, sumModifiers } from './derivedStats.js'

describe('sumModifiers', () => {
  it('sums flat ac modifiers', () => {
    const items = [
      { modifiers: [{ stat: 'ac', value: 1 }] },
      { modifiers: [{ stat: 'ac', value: 2 }] },
    ]
    expect(sumModifiers(items, 'ac')).toBe(3)
  })

  it('returns 0 for no matching modifiers', () => {
    expect(sumModifiers([{ modifiers: [{ stat: 'speed', value: 10 }] }], 'ac')).toBe(0)
  })
})

describe('computeDerivedStats', () => {
  const baseChar = {
    stats: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    equippedItems: {},
    attunedItems: [],
    level: 1,
    class: 'Fighter',
    speed: 30,
  }

  it('computes unarmored AC = 10 + dexMod', () => {
    const result = computeDerivedStats(baseChar)
    expect(result.ac).toBe(12) // 10 + 2 (DEX 14)
  })

  it('applies armor AC', () => {
    const char = {
      ...baseChar,
      equippedItems: { chest: { baseAC: 14, addDex: true, maxDex: 2 } },
    }
    const result = computeDerivedStats(char)
    expect(result.ac).toBe(16) // 14 + 2 (DEX capped at maxDex 2)
  })

  it('applies +1 shield', () => {
    const char = {
      ...baseChar,
      equippedItems: {
        offHand: { armorType: 'shield', baseAC: 2, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 's1' },
      },
      attunedItems: [],
    }
    const result = computeDerivedStats(char)
    // 10 + 2 (dex) + 2 (shield base) + 1 (modifier, no attunement required since shield doesn't requiresAttunement)
    expect(result.ac).toBe(15)
  })

  it('only applies modifiers from attuned items when requiresAttunement', () => {
    const char = {
      ...baseChar,
      equippedItems: {
        ring1: { requiresAttunement: true, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 'r1' },
      },
      attunedItems: [], // NOT attuned
    }
    const result = computeDerivedStats(char)
    expect(result.ac).toBe(12) // modifier NOT applied
  })

  it('applies modifiers from attuned items', () => {
    const char = {
      ...baseChar,
      equippedItems: {
        ring1: { requiresAttunement: true, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 'r1' },
      },
      attunedItems: ['r1'], // attuned
    }
    const result = computeDerivedStats(char)
    expect(result.ac).toBe(13) // 12 + 1
  })
})
```

- [ ] **Step 2: Implement derivedStats.js**

```js
// src/lib/derivedStats.js
import { computeAcFromEquipped } from '../data/equipment.js'

export function sumModifiers(items, stat) {
  let total = 0
  for (const item of items) {
    for (const mod of item.modifiers || []) {
      if (mod.stat === stat) total += mod.value
    }
  }
  return total
}

function getActiveModifierItems(character) {
  const equipped = Object.values(character.equippedItems || {}).filter(Boolean)
  return equipped.filter(item =>
    !item.requiresAttunement || (character.attunedItems || []).includes(item.instanceId)
  )
}

export function computeDerivedStats(character) {
  const activeItems = getActiveModifierItems(character)
  const stats = { ...(character.stats || {}) }

  // Apply stat bonuses from equipment
  for (const item of activeItems) {
    for (const mod of item.modifiers || []) {
      if (stats[mod.stat] !== undefined && typeof mod.value === 'number') {
        stats[mod.stat] += mod.value
      }
    }
  }

  // AC
  const baseAC = computeAcFromEquipped(character.equippedItems, stats)
  const acBonus = sumModifiers(activeItems, 'ac')
  const ac = baseAC + acBonus

  // Attack & damage bonuses
  const attackBonus = sumModifiers(activeItems, 'attackBonus')
  const damageBonus = sumModifiers(activeItems, 'damageBonus')

  // Save bonuses
  const saveBonus = sumModifiers(activeItems, 'saveBonus')

  // Speed
  const speedBonus = sumModifiers(activeItems, 'speed')
  const speed = (character.speed || 30) + speedBonus

  // HP bonus
  const hpBonus = sumModifiers(activeItems, 'hp')

  return { ac, attackBonus, damageBonus, saveBonus, speed, hpBonus, effectiveStats: stats }
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/derivedStats.test.js`
Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/derivedStats.js src/lib/derivedStats.test.js
git commit -m "feat: derived stats computation from equipment + modifiers (TDD)"
```

### Task 4: Magic Item Data + Loot Tables

**Files:**
- Create: `src/data/magicItems.json`
- Create: `src/data/lootTables.json`
- Modify: `src/data/equipment.js` (add modifiers to existing items)

- [ ] **Step 1: Create magicItems.json**

A starter set of ~30 magic items across rarities. Each item has `modifiers`, `requiresAttunement`, `rarity`, optional `charges`, optional `cursed`. Data-driven — this file is swappable for custom universes.

Structure per item:
```json
{
  "id": "longsword-plus-1",
  "name": "+1 Longsword",
  "baseName": "Longsword",
  "rarity": "uncommon",
  "type": "weapon",
  "sizeCategory": "weapon_one_handed",
  "damage": "1d8",
  "damageType": "slashing",
  "properties": ["versatile"],
  "weight": 3,
  "requiresAttunement": false,
  "modifiers": [
    { "stat": "attackBonus", "value": 1 },
    { "stat": "damageBonus", "value": 1 }
  ]
}
```

Include items like: +1/+2/+3 weapons, +1/+2 armor, +1/+2 shield, Cloak of Protection, Ring of Protection, Boots of Speed, Gauntlets of Ogre Power, Flame Tongue, Frost Brand, Staff of the Magi (with charges), Bag of Holding, Amulet of Health, Belt of Giant Strength variants, Bracers of Defense, a few cursed items.

- [ ] **Step 2: Create lootTables.json**

```json
{
  "individual": {
    "cr0-4": { "gold": "2d6*5", "magicChance": 0.05, "maxRarity": "common" },
    "cr5-10": { "gold": "4d6*10", "magicChance": 0.2, "maxRarity": "uncommon" },
    "cr11-16": { "gold": "6d6*50", "magicChance": 0.4, "maxRarity": "rare" },
    "cr17+": { "gold": "10d6*100", "magicChance": 0.6, "maxRarity": "very_rare" }
  },
  "hoard": {
    "cr0-4": { "gold": "6d6*100", "magicCount": "1d4", "maxRarity": "uncommon" },
    "cr5-10": { "gold": "10d6*100", "magicCount": "1d6", "maxRarity": "rare" },
    "cr11-16": { "gold": "20d6*100", "magicCount": "1d4", "maxRarity": "very_rare" },
    "cr17+": { "gold": "50d6*100", "magicCount": "1d6", "maxRarity": "legendary" }
  },
  "rarityWeights": {
    "common": { "common": 1.0 },
    "uncommon": { "common": 0.6, "uncommon": 0.4 },
    "rare": { "common": 0.3, "uncommon": 0.4, "rare": 0.3 },
    "very_rare": { "uncommon": 0.3, "rare": 0.4, "very_rare": 0.3 },
    "legendary": { "rare": 0.3, "very_rare": 0.4, "legendary": 0.3 }
  }
}
```

- [ ] **Step 3: Add modifiers array to existing equipment.js items**

In `src/data/equipment.js`, add empty `modifiers: []` to base weapon and armor objects so the field exists. This makes magic item variants easy to create by spreading the base item and adding modifiers.

- [ ] **Step 4: Commit**

```bash
git add src/data/magicItems.json src/data/lootTables.json src/data/equipment.js
git commit -m "feat: magic item definitions + loot tables (data-driven, swappable)"
```

### Task 5: Wire Derived Stats + Attunement into Store

**Files:**
- Modify: `src/store/useStore.js` (equip/unequip triggers recompute, attunement actions, charge tracking)

- [ ] **Step 1: Add attunement state and actions**

Add to character state: `attunedItems: []` (array of instanceIds, max 3).

Add store actions:
- `attuneItem(instanceId)` — add to attunedItems if < 3 and item.requiresAttunement. Trigger `computeDerivedStats()` and `updateMyCharacter()`.
- `unattuneItem(instanceId)` — remove from attunedItems unless item is cursed. Trigger recompute.

- [ ] **Step 2: Wire equip/unequip to recompute derived stats**

In `equipItem` and `unequipItem`, after updating equippedItems, call `computeDerivedStats(character)` and merge the result (ac, attackBonus, etc.) into the character object before calling `updateMyCharacter()`.

- [ ] **Step 3: Add charge tracking**

In `useItem` (for charged items), decrement `item.charges.current`. On long rest, recharge items with `charges.recharge === 'dawn'`: roll `1d6+1`, add to current, cap at max.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.js
git commit -m "feat: attunement, derived stats recompute on equip, charge tracking"
```

### Task 6: Attunement UI in Equipment Pane

**Files:**
- Modify: `src/components/characterSheet/EquipmentPane.jsx`

- [ ] **Step 1: Add attunement slot display**

Show 3 diamond icons at top of equipment pane. Filled diamonds = attuned slots used. Empty = available.

For each equipped item with `requiresAttunement`:
- If attuned: show "Attuned" badge + "Un-attune" button (disabled if cursed)
- If not attuned: show "Requires Attunement" + "Attune" button (disabled if 3 slots full)

Show charge counter on items with `charges`: "⚡ 5/7"

- [ ] **Step 2: Commit**

```bash
git add src/components/characterSheet/EquipmentPane.jsx
git commit -m "feat: attunement slots UI + charge display in equipment pane"
```

---

## Feature 3: Loot System Overhaul

### Task 7: Loot Generation + Roll-Off UI

**Files:**
- Rewrite: `src/components/LootScreen.jsx`
- Create: `src/lib/lootGenerator.js` (new, table-based)

- [ ] **Step 1: Create table-based loot generator**

```js
// src/lib/lootGenerator.js
import lootTables from '../data/lootTables.json'
import magicItems from '../data/magicItems.json'
import { rollDamage } from './dice.js'

export function generateLoot(enemies, partySize) {
  const highestCr = Math.max(...enemies.map(e => parseFloat(e.cr || e.stats?.cr || 0)))
  const tier = highestCr >= 17 ? 'cr17+' : highestCr >= 11 ? 'cr11-16' : highestCr >= 5 ? 'cr5-10' : 'cr0-4'
  const table = lootTables.individual[tier]

  // Gold
  const goldResult = rollDamage(table.gold)
  const totalGold = goldResult.total
  const goldPerPlayer = Math.floor(totalGold / partySize)

  // Magic items
  const items = []
  if (Math.random() < table.magicChance) {
    const rarity = weightedRarityPick(table.maxRarity)
    const candidates = magicItems.filter(i => i.rarity === rarity)
    if (candidates.length > 0) {
      items.push(candidates[Math.floor(Math.random() * candidates.length)])
    }
  }

  return { totalGold, goldPerPlayer, items }
}

function weightedRarityPick(maxRarity) {
  const weights = lootTables.rarityWeights[maxRarity] || { common: 1 }
  const entries = Object.entries(weights)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [rarity, weight] of entries) {
    roll -= weight
    if (roll <= 0) return rarity
  }
  return entries[0][0]
}

export function isEligibleForItem(character, item) {
  if (item.type === 'consumable' || !item.type) return true
  if (item.type === 'armor') {
    const proficiencies = (character.armorProficiencies || []).map(p => p.toLowerCase())
    const armorType = (item.armorType || '').toLowerCase()
    return proficiencies.some(p => armorType.includes(p)) || proficiencies.includes('all')
  }
  if (item.type === 'weapon') {
    const proficiencies = (character.weaponProficiencies || []).map(p => p.toLowerCase())
    const category = (item.category || '').toLowerCase()
    return proficiencies.some(p => category.includes(p)) || proficiencies.includes('all')
  }
  return true // rings, amulets, cloaks = universal
}
```

- [ ] **Step 2: Rewrite LootScreen with gold auto-split + roll-off**

Rewrite `src/components/LootScreen.jsx`:
- Gold auto-splits evenly among living party members on render. Each player's share shown.
- "Claim Gold" button calls `addGold(goldPerPlayer)` for each player.
- Magic items shown with roll-off panel:
  - Each eligible character has a d20 roll button.
  - Ineligible characters see disabled button + "Not proficient" tooltip.
  - After all eligible players roll, highest roll wins.
  - Winner's item added to their inventory via `addItemToInventory()`.
  - Ties trigger re-roll (only tied players).

- [ ] **Step 3: Commit**

```bash
git add src/lib/lootGenerator.js src/components/LootScreen.jsx
git commit -m "feat: table-based loot generation + magic item roll-off"
```

---

## Feature 4: Death Saves in V2

### Task 8: Death Save UI in V2 HUD

**Files:**
- Modify: `src/hud/CombatActionBar.jsx`
- Modify: `src/hud/InitiativeStrip.jsx`
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Death save panel in CombatActionBar**

When the active combatant has `currentHp <= 0` and `deathSaves.failures < 3`, replace the primary+secondary action buttons with a Death Save panel:

```jsx
// Inside CombatActionBar, check active combatant HP:
const isDying = active && (active.currentHp ?? 0) <= 0 && (active.deathSaves?.failures ?? 0) < 3

// If isDying, render death save panel instead of attack/cast/move buttons:
// - Large "🎲 Roll Death Save" button
// - 3 green pips (successes) — filled count = deathSaves.successes
// - 3 red pips (failures) — filled count = deathSaves.failures
// - "✚ Stabilize" button (for DM/adjacent allies)
```

- [ ] **Step 2: Dying/dead portrait overlays in InitiativeStrip**

In `src/hud/InitiativeStrip.jsx`, check each combatant:
- `currentHp <= 0 && deathSaves.failures < 3` → red pulse CSS animation + skull overlay
- `deathSaves.failures >= 3` → grey desaturated + "DEAD" text
- Add CSS for `.hud-init-token.dying { animation: pulse-red 1s infinite; }` in hud.css

- [ ] **Step 3: Wire death save roll + heal-while-dying in GameV2**

In `src/GameV2.jsx`, add death save handling:
- When active combatant is dying and player clicks roll: call `rollDeathSave(activeId)` from store.
- Nat 20: flash green overlay, character revives at 1 HP, broadcast.
- 3 failures: flash red, log death, broadcast.
- When healing applied to dying character: full heal amount (not just 1 HP). Death saves reset. Character stands up and can act next turn. Log "X is healed for Y HP and rejoins the fight!"

- [ ] **Step 4: Commit**

```bash
git add src/hud/CombatActionBar.jsx src/hud/InitiativeStrip.jsx src/GameV2.jsx src/hud/hud.css
git commit -m "feat: death save UI in V2 — dying portraits, save panel, heal revival"
```

---

## Feature 5: Rest System

### Task 9: Rest Type Popover + Mandatory Hit Dice

**Files:**
- Modify: `src/hud/ActionArea.jsx` (rest popover)
- Modify: `src/components/RestModal.jsx` (mandatory hit dice, theme gate)
- Modify: `src/GameV2.jsx` (pass area theme to rest modal)

- [ ] **Step 1: Rest type popover in ActionArea**

Replace the REST button's direct `onTool('rest')` call with a popover toggle. When REST is clicked, show a small popover above the button with "Short Rest (1hr)" and "Long Rest (8hr)" buttons. Long rest disabled when area theme is dungeon/cave/crypt/sewer — show tooltip "Cannot long rest here."

```jsx
const [showRestPicker, setShowRestPicker] = useState(false)
// ...
{showRestPicker && (
  <div style={{ position: 'absolute', bottom: '100%', right: 0, ... }}>
    <button onClick={() => { onTool('short-rest'); setShowRestPicker(false) }}>
      Short Rest (1hr)
    </button>
    <button disabled={isDungeonTheme} onClick={() => { onTool('long-rest'); setShowRestPicker(false) }}
      title={isDungeonTheme ? 'Cannot long rest here — find a safe location' : ''}>
      Long Rest (8hr)
    </button>
  </div>
)}
```

- [ ] **Step 2: Mandatory hit dice in RestModal**

In `src/components/RestModal.jsx`, modify the hit dice phase:
- Remove any "Skip" or "Done" option until at least 1 die is rolled.
- "Done Resting" button disabled until `hitDiceLog.length > 0`.
- Exception: if `hitDiceRemaining === 0`, show message "No hit dice remaining" and allow close.

- [ ] **Step 3: Wire rest type selection in GameV2**

In `src/GameV2.jsx` handleTool, change:
```js
else if (tool === 'short-rest') setRestProposal({ type: 'short', proposedBy: ... })
else if (tool === 'long-rest') setRestProposal({ type: 'long', proposedBy: ... })
```

Pass current area theme to ActionArea so it can determine if long rest is available.

- [ ] **Step 4: Commit**

```bash
git add src/hud/ActionArea.jsx src/components/RestModal.jsx src/GameV2.jsx
git commit -m "feat: rest type popover + mandatory hit dice + dungeon long rest block"
```

---

## Feature 6: Gold Persistence Fix

### Task 10: Audit and Fix Gold Save/Load Path

**Files:**
- Modify: `src/store/useStore.js` (if needed)
- Manual test

- [ ] **Step 1: Audit the gold persistence path**

Read through `addGold()` → `updateMyCharacter()` → Supabase write. Verify that `gold` is included in the character_data JSON that gets written. Check `App.jsx` loading path to verify gold is read from `character_data`.

The current code looks correct: `addGold` calls `updateMyCharacter({ gold: newGold })` which merges into `myCharacter` and writes full object to `campaign_members.character_data`. The likely bug is either:
- Gold being overwritten by stale campaign_data on reload
- Race condition between campaign_data and campaign_members writes
- LootScreen calling `addGold` but not awaiting the save

Fix any issues found. If gold path is correct, verify by testing manually.

- [ ] **Step 2: Ensure LootScreen awaits gold save**

In `LootScreen.handleTakeRewards()`, ensure `addGold()` is called and the resulting `updateMyCharacter()` completes before closing the loot screen.

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add src/store/useStore.js src/components/LootScreen.jsx
git commit -m "fix: gold persistence through session reload"
```

---

## Feature 7: Day/Night Cycle

### Task 11: Game Time Module (TDD)

**Files:**
- Create: `src/lib/gameTime.js`
- Create: `src/lib/gameTime.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/gameTime.test.js
import { describe, it, expect } from 'vitest'
import { advanceTime, getTimeOfDay, formatTime } from './gameTime.js'

describe('advanceTime', () => {
  it('advances hours within same day', () => {
    const t = advanceTime({ hour: 10, day: 1 }, 3)
    expect(t).toEqual({ hour: 13, day: 1 })
  })
  it('wraps to next day', () => {
    const t = advanceTime({ hour: 22, day: 1 }, 5)
    expect(t).toEqual({ hour: 3, day: 2 })
  })
  it('handles multi-day advance', () => {
    const t = advanceTime({ hour: 10, day: 1 }, 50)
    expect(t).toEqual({ hour: 12, day: 3 })
  })
})

describe('getTimeOfDay', () => {
  it('returns dawn for 5-7', () => {
    expect(getTimeOfDay(6)).toBe('dawn')
  })
  it('returns day for 8-17', () => {
    expect(getTimeOfDay(12)).toBe('day')
  })
  it('returns dusk for 18-19', () => {
    expect(getTimeOfDay(18)).toBe('dusk')
  })
  it('returns night for 20-4', () => {
    expect(getTimeOfDay(22)).toBe('night')
    expect(getTimeOfDay(2)).toBe('night')
  })
})

describe('formatTime', () => {
  it('formats morning time', () => {
    expect(formatTime({ hour: 9, day: 1 })).toBe('9:00 AM, Day 1')
  })
  it('formats afternoon time', () => {
    expect(formatTime({ hour: 14, day: 3 })).toBe('2:00 PM, Day 3')
  })
})
```

- [ ] **Step 2: Implement gameTime.js**

```js
// src/lib/gameTime.js
export function advanceTime(current, hours) {
  const totalHours = current.hour + hours
  const day = current.day + Math.floor(totalHours / 24)
  const hour = ((totalHours % 24) + 24) % 24
  return { hour, day }
}

export function getTimeOfDay(hour) {
  if (hour >= 5 && hour <= 7) return 'dawn'
  if (hour >= 8 && hour <= 17) return 'day'
  if (hour >= 18 && hour <= 19) return 'dusk'
  return 'night'
}

export function formatTime({ hour, day }) {
  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:00 ${ampm}, Day ${day}`
}

export const TIME_COSTS = {
  shortRest: 1,
  longRest: 8,
  areaTransition: 1,
  combat: 0, // ~10 minutes, round down
}
```

- [ ] **Step 3: Run tests, commit**

```bash
git add src/lib/gameTime.js src/lib/gameTime.test.js
git commit -m "feat: game time module with TDD"
```

### Task 12: Day/Night PixiJS Filter + HUD Clock

**Files:**
- Create: `src/engine/DayNightFilter.js`
- Modify: `src/engine/PixiApp.jsx` (apply filter to world container)
- Modify: `src/store/useStore.js` (gameTime state)
- Modify: `src/hud/GameHUD.jsx` (clock display)

- [ ] **Step 1: Create DayNightFilter**

```js
// src/engine/DayNightFilter.js
import * as PIXI from 'pixi.js'

const TINTS = {
  dawn:  { r: 1.0, g: 0.85, b: 0.7, brightness: 0.85 },
  day:   { r: 1.0, g: 1.0,  b: 1.0, brightness: 1.0 },
  dusk:  { r: 1.0, g: 0.75, b: 0.55, brightness: 0.75 },
  night: { r: 0.35, g: 0.45, b: 0.7, brightness: 0.4 },
}

export function applyDayNightTint(worldContainer, timeOfDay) {
  const t = TINTS[timeOfDay] || TINTS.day
  worldContainer.tint = (
    (Math.round(t.r * t.brightness * 255) << 16) |
    (Math.round(t.g * t.brightness * 255) << 8) |
    Math.round(t.b * t.brightness * 255)
  )
}
```

- [ ] **Step 2: Add gameTime to Zustand store**

In `src/store/useStore.js`, add `gameTime: { hour: 8, day: 1 }` to initial state. Add `advanceGameTime(hours)` action that updates gameTime and broadcasts.

- [ ] **Step 3: Apply tint in PixiApp**

In `src/engine/PixiApp.jsx`, in the render loop or via a useEffect watching `gameTime`, call `applyDayNightTint(worldRef.current, timeOfDay)`. Skip tint for indoor areas (dungeons, buildings).

- [ ] **Step 4: Add clock to GameHUD**

In `src/hud/GameHUD.jsx`, add a small clock display near the zone label:
```jsx
<div style={{ color: '#c9a84c', fontSize: 10, opacity: 0.7 }}>
  {timeIcon} {formatTime(gameTime)}
</div>
```
Where `timeIcon` is ☀️ for day, 🌅 for dawn/dusk, 🌙 for night.

- [ ] **Step 5: Wire time advancement to rest/travel**

In GameV2.jsx:
- Short rest: advance 1 hour
- Long rest: advance 8 hours
- Area transition: advance 1 hour
- Broadcast time changes to all clients

- [ ] **Step 6: Add time to DM system prompt**

In `src/lib/narratorApi.js`, include current time in the system prompt so AI DM has time awareness.

- [ ] **Step 7: Commit**

```bash
git add src/engine/DayNightFilter.js src/engine/PixiApp.jsx src/store/useStore.js src/hud/GameHUD.jsx src/GameV2.jsx src/lib/narratorApi.js
git commit -m "feat: day/night cycle with game clock, PixiJS tinting, HUD display"
```

---

## Feature 8: More Curated Chunks

### Task 13: 14 New Curated Chunks

**Files:**
- Create: 14 chunk files in `src/data/chunks/`
- Modify: `src/data/chunks/index.js`

- [ ] **Step 1: Create dungeon variety chunks**

1. `src/data/chunks/rooms/cave_chamber.js` (12x10) — stalactites, pools, natural rock, rubble
2. `src/data/chunks/rooms/cave_tunnel.js` (16x4) — narrow passage, rubble, torch sconces
3. `src/data/chunks/rooms/sewer_junction.js` (10x10) — water channels, grates, walkways, pipes
4. `src/data/chunks/rooms/crypt_hall.js` (14x8) — sarcophagi rows, candle alcoves, marble floor

- [ ] **Step 2: Create wilderness chunks**

5. `src/data/chunks/terrain/forest_large.js` (12x12) — varied trees, underbrush, fallen logs, mushrooms
6. `src/data/chunks/terrain/river_crossing.js` (14x6) — bridge or ford, rocks, reeds
7. `src/data/chunks/terrain/cliff_ledge.js` (10x6) — narrow path, boulders, drop-off
8. `src/data/chunks/terrain/swamp.js` (10x10) — murky water, dead trees, lily pads

- [ ] **Step 3: Create town building chunks**

9. `src/data/chunks/buildings/stable.js` (12x6) — stalls, hay, tack room, trough
10. `src/data/chunks/buildings/library.js` (10x10) — bookshelves, tables, candelabras, ladder
11. `src/data/chunks/buildings/warehouse.js` (14x8) — crate stacks, barrels, loading dock, office
12. `src/data/chunks/buildings/chapel.js` (8x10) — pews, altar, vestry

- [ ] **Step 4: Create multi-room variants**

13. `src/data/chunks/buildings/inn_ground.js` (14x10) — lobby, dining room, fireplace, stairs
14. `src/data/chunks/buildings/inn_upper.js` (14x10) — hallway, 3 guest rooms, stairs

- [ ] **Step 5: Register all in index.js**

Update `src/data/chunks/index.js` to import and export all 14 new chunks.

- [ ] **Step 6: Commit**

```bash
git add src/data/chunks/
git commit -m "feat: 14 new curated chunks — dungeons, wilderness, town, inns"
```

---

## Final

### Task 14: Update Status + Run All Tests

**Files:**
- Modify: `tasks/status.md`

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All new tests pass, pre-existing failures unchanged.

- [ ] **Step 2: Update status.md**

Add Phase 9 section with all completed features.

- [ ] **Step 3: Commit**

```bash
git add tasks/status.md
git commit -m "docs: update status — Phase 9 gameplay systems complete"
```
