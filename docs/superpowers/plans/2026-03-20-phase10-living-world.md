# Phase 10: Living World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shop/merchant system, minimap, status effect visuals, ambient sound, NPC schedules, traps, weather, party formation, and quest tracker to create a living world feel.

**Architecture:** Each feature is independent. Data-driven configs for shops/traps/quests. PixiJS layers for visual effects. Existing hook architecture in GameV2 for new game logic. Journal integration for quests.

**Tech Stack:** React, PixiJS v8, Zustand slices, Web Audio API, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-20-phase10-living-world-design.md`

---

## Feature 1: Shop/Merchant System

### Task 1: Shop Data + Buy/Sell Logic (TDD)

**Files:**
- Create: `src/data/shopInventories.json`
- Create: `src/lib/shopSystem.js`
- Create: `src/lib/shopSystem.test.js`

- [ ] **Step 1: Create shopInventories.json**

Template stock for 5 shop types. Each item references IDs from equipment.js or magicItems.json. Include 8-15 items per shop with gold prices.

```json
{
  "weapon_shop": {
    "name": "Weapons & Arms",
    "stock": [
      { "name": "Dagger", "price": 2, "type": "weapon", "damage": "1d4", "damageType": "piercing", "properties": ["finesse","light","thrown"], "weight": 1, "sizeCategory": "weapon_light" },
      { "name": "Shortsword", "price": 10, "type": "weapon", "damage": "1d6", "damageType": "piercing", "properties": ["finesse","light"], "weight": 2, "sizeCategory": "weapon_one_handed" },
      { "name": "Longsword", "price": 15, "type": "weapon", "damage": "1d8", "damageType": "slashing", "properties": ["versatile"], "weight": 3, "sizeCategory": "weapon_one_handed" },
      { "name": "Greatsword", "price": 50, "type": "weapon", "damage": "2d6", "damageType": "slashing", "properties": ["heavy","two-handed"], "weight": 6, "sizeCategory": "weapon_two_handed" },
      { "name": "Shortbow", "price": 25, "type": "weapon", "damage": "1d6", "damageType": "piercing", "range": {"normal":80,"long":320}, "weight": 2, "sizeCategory": "weapon_ranged" },
      { "name": "Longbow", "price": 50, "type": "weapon", "damage": "1d8", "damageType": "piercing", "range": {"normal":150,"long":600}, "weight": 2, "sizeCategory": "weapon_ranged" }
    ]
  },
  "armor_shop": {
    "name": "Armor & Shields",
    "stock": [
      { "name": "Leather Armor", "price": 10, "type": "armor", "armorType": "light", "baseAC": 11, "addDex": true, "weight": 10, "sizeCategory": "armor_light" },
      { "name": "Chain Shirt", "price": 50, "type": "armor", "armorType": "medium", "baseAC": 13, "addDex": true, "maxDex": 2, "weight": 20, "sizeCategory": "armor_medium" },
      { "name": "Chain Mail", "price": 75, "type": "armor", "armorType": "heavy", "baseAC": 16, "addDex": false, "weight": 55, "sizeCategory": "armor_heavy" },
      { "name": "Plate Armor", "price": 1500, "type": "armor", "armorType": "heavy", "baseAC": 18, "addDex": false, "weight": 65, "sizeCategory": "armor_heavy" },
      { "name": "Shield", "price": 10, "type": "armor", "armorType": "shield", "baseAC": 2, "weight": 6, "sizeCategory": "shield" }
    ]
  },
  "potion_shop": {
    "name": "Potions & Remedies",
    "stock": [
      { "name": "Healing Potion", "price": 50, "type": "consumable", "id": "healing-potion", "effect": {"type":"heal","dice":"2d4","bonus":2}, "weight": 0.5, "sizeCategory": "potion" },
      { "name": "Greater Healing Potion", "price": 150, "type": "consumable", "id": "greater-healing-potion", "effect": {"type":"heal","dice":"4d4","bonus":4}, "weight": 0.5, "sizeCategory": "potion" },
      { "name": "Antitoxin", "price": 50, "type": "consumable", "id": "antitoxin", "effect": {"type":"resistance","condition":"Poisoned"}, "weight": 0.5, "sizeCategory": "potion" }
    ]
  },
  "general_store": {
    "name": "General Goods",
    "stock": [
      { "name": "Rope (50ft)", "price": 1, "type": "gear", "weight": 10, "sizeCategory": "default" },
      { "name": "Torch", "price": 0.01, "type": "gear", "weight": 1, "sizeCategory": "default" },
      { "name": "Rations (1 day)", "price": 0.5, "type": "consumable", "weight": 2, "sizeCategory": "default" },
      { "name": "Backpack", "price": 2, "type": "gear", "weight": 5, "sizeCategory": "default" }
    ]
  },
  "magic_shop": {
    "name": "Arcane Curiosities",
    "stock": [
      { "name": "Scroll of Identify", "price": 100, "type": "consumable", "sizeCategory": "scroll", "weight": 0 },
      { "name": "Potion of Resistance", "price": 300, "type": "consumable", "id": "potion-resistance", "effect": {"type":"resistance"}, "weight": 0.5, "sizeCategory": "potion" }
    ]
  }
}
```

- [ ] **Step 2: Write failing tests**

```js
// src/lib/shopSystem.test.js
import { describe, it, expect } from 'vitest'
import { canBuy, calculateSellPrice, buyItem, sellItem } from './shopSystem.js'

describe('canBuy', () => {
  it('returns true when player has enough gold', () => {
    expect(canBuy(100, 50)).toBe(true)
  })
  it('returns false when insufficient gold', () => {
    expect(canBuy(10, 50)).toBe(false)
  })
})

describe('calculateSellPrice', () => {
  it('returns 50% of base price', () => {
    expect(calculateSellPrice(100)).toBe(50)
  })
  it('returns minimum 1 gold', () => {
    expect(calculateSellPrice(1)).toBe(1)
  })
})
```

- [ ] **Step 3: Implement shopSystem.js**

```js
// src/lib/shopSystem.js
export function canBuy(playerGold, itemPrice) {
  return playerGold >= itemPrice
}

export function calculateSellPrice(basePrice) {
  return Math.max(1, Math.floor(basePrice / 2))
}

export function buyItem(item, playerGold) {
  if (!canBuy(playerGold, item.price)) return { success: false, reason: 'Insufficient gold' }
  return {
    success: true,
    newGold: playerGold - item.price,
    item: { ...item, instanceId: crypto.randomUUID(), quantity: 1 },
  }
}

export function sellItem(item) {
  const sellPrice = calculateSellPrice(item.price || item.cost || 0)
  return { success: true, goldGained: sellPrice }
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/data/shopInventories.json src/lib/shopSystem.js src/lib/shopSystem.test.js
git commit -m "feat: shop data + buy/sell logic with TDD"
```

### Task 2: Shop Panel UI

**Files:**
- Create: `src/components/ShopPanel.jsx`
- Modify: `src/GameV2.jsx` (detect shop NPC, open ShopPanel)

- [ ] **Step 1: Create ShopPanel component**

Split panel: left = shop inventory with prices, right = player inventory. Gold display at top. Buy button per shop item, sell button per inventory item. Dark fantasy styling.

Props: `{ npc, shopType, onClose }`. Reads `myCharacter` from store for gold/inventory.

~200 lines. Use existing inventory grid styling patterns.

- [ ] **Step 2: Wire shop detection in GameV2**

In GameV2.jsx, in the NPC interaction handler (around line 282), check `npc.shopType`. If present, open ShopPanel instead of NpcDialog:

```js
if (npc.shopType) {
  setActiveShop({ npc, shopType: npc.shopType })
} else {
  setActiveNpc({ ...npc, isCutscene: npc.critical })
}
```

Add state: `const [activeShop, setActiveShop] = useState(null)`
Render: `{activeShop && <ShopPanel npc={activeShop.npc} shopType={activeShop.shopType} onClose={() => setActiveShop(null)} />}`

- [ ] **Step 3: Commit**

```bash
git add src/components/ShopPanel.jsx src/GameV2.jsx
git commit -m "feat: shop panel UI with buy/sell + NPC shop detection"
```

---

## Feature 2: Minimap

### Task 3: Minimap Component

**Files:**
- Create: `src/hud/Minimap.jsx`
- Modify: `src/hud/GameHUD.jsx`

- [ ] **Step 1: Create Minimap component**

HTML5 Canvas element (not PixiJS). Renders simplified floor layer — each tile as 2px. Player = gold dot, NPCs = blue dots, enemies = red dots (combat only). Fog respected — unexplored = black. Click to pan camera.

~120 lines. Reads zone data and playerPos from store. Uses `useRef` for canvas element, `useEffect` to redraw when playerPos or fog changes.

Size: 160x120px desktop, hidden on phone. Border: 1px solid #d4af37, background rgba(0,0,0,0.7).

- [ ] **Step 2: Add to GameHUD**

In `src/hud/GameHUD.jsx`, import and render Minimap in the top-right area (after CampaignBar). Pass camera ref for click-to-pan.

- [ ] **Step 3: Commit**

```bash
git add src/hud/Minimap.jsx src/hud/GameHUD.jsx
git commit -m "feat: minimap with fog, token dots, click-to-pan"
```

---

## Feature 3: Status Effect Visuals

### Task 4: Status Effect Renderer

**Files:**
- Create: `src/engine/StatusEffectRenderer.js`
- Modify: `src/engine/PixiApp.jsx`

- [ ] **Step 1: Create StatusEffectRenderer**

Maps conditions to visual effects. For each combatant with conditions, apply tint to their token sprite and/or add particle sprites to a container above the token.

```js
// src/engine/StatusEffectRenderer.js
import * as PIXI from 'pixi.js'

const CONDITION_VISUALS = {
  Poisoned:    { tint: 0x44cc44, particles: 'rise', color: 0x22aa22 },
  Burning:     { tint: 0xff6633, particles: 'rise', color: 0xff4400 },
  Frozen:      { tint: 0x6688ff, particles: null },
  Stunned:     { tint: 0xffff44, particles: 'orbit', color: 0xffff00 },
  Paralyzed:   { tint: 0x888888, particles: null },
  Blessed:     { tint: 0xffd700, particles: 'shimmer', color: 0xffd700 },
  Invisible:   { alpha: 0.3 },
  Prone:       { scale: 0.7 },
  Concentration: { ring: 0x4488ff },
}

export function updateStatusEffects(container, combatants, tokenPositions, tileSize) {
  container.removeChildren()
  for (const c of combatants) {
    if (!c.position || !c.conditions?.length) continue
    for (const cond of c.conditions) {
      const visual = CONDITION_VISUALS[cond]
      if (!visual) continue
      // Apply tint/alpha/scale to token sprite (via tokenPositions lookup)
      // Add particle graphics to container at token position
    }
  }
}
```

- [ ] **Step 2: Add statusEffects layer to PixiApp**

In `src/engine/PixiApp.jsx`, add `statusEffects: new PIXI.Container()` to layers (after tokens, before roof). In the ticker function, call `updateStatusEffects()` each frame.

- [ ] **Step 3: Commit**

```bash
git add src/engine/StatusEffectRenderer.js src/engine/PixiApp.jsx
git commit -m "feat: status effect visuals — condition tints and particles on tokens"
```

---

## Feature 4: Ambient Sound

### Task 5: Wire Ambient Audio into V2

**Files:**
- Create: `src/hud/SoundControl.jsx`
- Modify: `src/hud/GameHUD.jsx`
- Modify: `src/GameV2.jsx` or create `src/hooks/useAmbientAudio.js`

- [ ] **Step 1: Create useAmbientAudio hook**

```js
// src/hooks/useAmbientAudio.js
import { useEffect } from 'react'
import { ambientSystem } from '../lib/ambientAudio'

const THEME_TO_AUDIO = {
  village: 'outdoor', town: 'town', forest: 'outdoor',
  dungeon: 'dungeon', cave: 'dungeon', crypt: 'dungeon', sewer: 'dungeon',
}

export function useAmbientAudio({ theme, inCombat, timeOfDay }) {
  useEffect(() => {
    const audioType = THEME_TO_AUDIO[theme] || 'outdoor'
    ambientSystem.play(audioType)
    return () => ambientSystem.play('silence')
  }, [theme])

  useEffect(() => {
    ambientSystem.combatMode(inCombat, THEME_TO_AUDIO[theme] || 'outdoor')
  }, [inCombat, theme])
}
```

- [ ] **Step 2: Create SoundControl component**

Small mute/unmute toggle button. Speaker icon (🔊/🔇). Reads muted state from ambient system.

~40 lines.

- [ ] **Step 3: Wire into GameV2 and HUD**

Add `useAmbientAudio({ theme: zone?.theme, inCombat, timeOfDay })` call in GameV2.
Add SoundControl to GameHUD near CampaignBar.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAmbientAudio.js src/hud/SoundControl.jsx src/hud/GameHUD.jsx src/GameV2.jsx
git commit -m "feat: ambient sound wired to V2 — theme-based audio, combat crossfade, mute toggle"
```

---

## Feature 5: NPC Schedules

### Task 6: NPC Scheduler (TDD)

**Files:**
- Create: `src/lib/npcScheduler.js`
- Create: `src/lib/npcScheduler.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/npcScheduler.test.js
import { describe, it, expect } from 'vitest'
import { resolveSchedulePosition, getNpcTargetPosition } from './npcScheduler.js'

describe('resolveSchedulePosition', () => {
  const schedule = [
    { time: 'dawn', position: 'kitchen' },
    { time: 'day', position: 'bar_counter' },
    { time: 'night', position: 'bedroom' },
  ]

  it('returns day position for day time', () => {
    expect(resolveSchedulePosition(schedule, 'day').position).toBe('bar_counter')
  })
  it('returns night position for night time', () => {
    expect(resolveSchedulePosition(schedule, 'night').position).toBe('bedroom')
  })
  it('falls back to first entry for unmatched time', () => {
    expect(resolveSchedulePosition(schedule, 'dusk').position).toBe('bar_counter')
  })
})
```

- [ ] **Step 2: Implement npcScheduler.js**

```js
// src/lib/npcScheduler.js
export function resolveSchedulePosition(schedule, timeOfDay) {
  if (!schedule?.length) return null
  const match = schedule.find(s => s.time === timeOfDay)
  if (match) return match
  // Fallback: find nearest earlier time
  const order = ['dawn', 'day', 'dusk', 'night']
  const idx = order.indexOf(timeOfDay)
  for (let i = idx - 1; i >= 0; i--) {
    const fallback = schedule.find(s => s.time === order[i])
    if (fallback) return fallback
  }
  return schedule[0]
}

export function getNpcMovements(npcs, timeOfDay, poiPositions) {
  const movements = []
  for (const npc of npcs) {
    if (!npc.schedule?.length) continue
    const entry = resolveSchedulePosition(npc.schedule, timeOfDay)
    if (!entry) continue
    const targetPos = poiPositions[entry.position]
    if (!targetPos || (npc.position?.x === targetPos.x && npc.position?.y === targetPos.y)) continue
    movements.push({ npc, targetPosition: targetPos, activity: entry.activity })
  }
  return movements
}
```

- [ ] **Step 3: Run tests, commit**

```bash
git add src/lib/npcScheduler.js src/lib/npcScheduler.test.js
git commit -m "feat: NPC scheduler — time-based position resolution (TDD)"
```

### Task 7: Wire NPC Movement into GameV2

**Files:**
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Add useEffect watching timeOfDay**

When timeOfDay changes, compute NPC movements via `getNpcMovements()`, then animate each NPC to their target position using `animateTokenAlongPath()` and pathfinding.

```js
useEffect(() => {
  if (!zone?.npcs?.length) return
  const timeOfDay = getTimeOfDay(gameTime.hour)
  const movements = getNpcMovements(zone.npcs, timeOfDay, zone.poiPositions || {})
  for (const { npc, targetPosition } of movements) {
    // Pathfind from npc.position to targetPosition
    // Animate NPC token along path
    // Update NPC position in zone data
  }
}, [gameTime, zone])
```

- [ ] **Step 2: Update campaign generator prompt for NPC schedules**

- [ ] **Step 3: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: NPC animated movement on time-of-day changes"
```

---

## Feature 6: Trap System

### Task 8: Trap Detection + Resolution (TDD)

**Files:**
- Create: `src/lib/trapSystem.js`
- Create: `src/lib/trapSystem.test.js`
- Create: `src/data/trapTemplates.json`

- [ ] **Step 1: Create trapTemplates.json**

```json
[
  { "type": "pressure_plate", "dc": 12, "effect": { "damage": "1d6", "damageType": "piercing", "save": "DEX", "saveDC": 13 }, "description": "A hidden pressure plate triggers a volley of darts!" },
  { "type": "tripwire", "dc": 14, "effect": { "condition": "Restrained", "duration": "1 minute", "save": "DEX", "saveDC": 12 }, "description": "A thin wire snaps, releasing a weighted net!" },
  { "type": "poison_needle", "dc": 16, "effect": { "damage": "1d4", "damageType": "poison", "condition": "Poisoned", "save": "CON", "saveDC": 14 }, "description": "A needle springs from the mechanism, glistening with poison!" },
  { "type": "magic_glyph", "dc": 18, "effect": { "damage": "5d8", "damageType": "fire", "save": "DEX", "saveDC": 15 }, "description": "A glowing rune erupts in a burst of flame!" },
  { "type": "collapsing_floor", "dc": 15, "effect": { "damage": "2d6", "damageType": "bludgeoning", "save": "DEX", "saveDC": 13, "fallToArea": true }, "description": "The floor gives way beneath your feet!" }
]
```

- [ ] **Step 2: Write failing tests**

```js
// src/lib/trapSystem.test.js
import { describe, it, expect } from 'vitest'
import { canDetectTrap, checkTrapTrigger } from './trapSystem.js'

describe('canDetectTrap', () => {
  it('detects trap when passive perception >= DC', () => {
    expect(canDetectTrap(14, 12)).toBe(true)
  })
  it('misses trap when passive perception < DC', () => {
    expect(canDetectTrap(10, 14)).toBe(false)
  })
})

describe('checkTrapTrigger', () => {
  const trap = { type: 'pressure_plate', dc: 12, position: { x: 5, y: 5 }, revealed: false, triggered: false,
    effect: { damage: '1d6', damageType: 'piercing', save: 'DEX', saveDC: 13 } }

  it('triggers trap when stepping on tile', () => {
    const result = checkTrapTrigger(trap, { x: 5, y: 5 })
    expect(result.triggered).toBe(true)
  })
  it('does not trigger on different tile', () => {
    const result = checkTrapTrigger(trap, { x: 3, y: 3 })
    expect(result.triggered).toBe(false)
  })
  it('does not trigger already triggered trap', () => {
    const result = checkTrapTrigger({ ...trap, triggered: true }, { x: 5, y: 5 })
    expect(result.triggered).toBe(false)
  })
})
```

- [ ] **Step 3: Implement trapSystem.js**

```js
// src/lib/trapSystem.js
export function canDetectTrap(passivePerception, trapDC) {
  return passivePerception >= trapDC
}

export function checkTrapTrigger(trap, playerPos) {
  if (trap.triggered || trap.revealed) return { triggered: false }
  if (trap.position.x !== playerPos.x || trap.position.y !== playerPos.y) return { triggered: false }
  return { triggered: true, trap }
}

export function resolveTrapEffect(trap, target) {
  const { rollDamage } = require('./dice.js')
  const saveMod = Math.floor(((target.stats?.dex || 10) - 10) / 2)
  const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod
  const saved = saveRoll >= (trap.effect.saveDC || 13)
  const dmg = trap.effect.damage ? rollDamage(trap.effect.damage).total : 0
  const finalDmg = saved ? Math.floor(dmg / 2) : dmg
  return { saved, saveRoll, damage: finalDmg, condition: saved ? null : trap.effect.condition, description: trap.description }
}

export function getPassivePerception(character) {
  return 10 + Math.floor(((character.stats?.wis || 10) - 10) / 2)
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/lib/trapSystem.js src/lib/trapSystem.test.js src/data/trapTemplates.json
git commit -m "feat: trap detection and resolution system (TDD)"
```

### Task 9: Wire Traps into Movement + Rendering

**Files:**
- Modify: `src/hooks/useWorldMovement.js` (check traps on each step)
- Modify: `src/lib/dungeonBuilder.js` (auto-place traps)
- Modify: `src/engine/PixiApp.jsx` (render revealed trap tiles)

- [ ] **Step 1: Check traps on movement**

In useWorldMovement, after player moves to new tile, check zone.traps for a trap at that position. If trap exists and not revealed, check passive perception for detection. If not detected, trigger and resolve.

- [ ] **Step 2: Auto-place traps in dungeons**

In dungeonBuilder.js, after placing enemies, add 1-3 traps in corridors (random positions, types from trapTemplates.json).

- [ ] **Step 3: Render revealed traps**

In PixiApp, on the grid layer, draw orange-outlined tiles for revealed traps.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWorldMovement.js src/lib/dungeonBuilder.js src/engine/PixiApp.jsx
git commit -m "feat: wire traps into movement, auto-place in dungeons, render revealed traps"
```

---

## Feature 7: Weather System

### Task 10: Weather Logic (TDD)

**Files:**
- Create: `src/lib/weather.js`
- Create: `src/lib/weather.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/weather.test.js
import { describe, it, expect } from 'vitest'
import { getVisionPenalty, rollWeatherChange } from './weather.js'

describe('getVisionPenalty', () => {
  it('returns 0 for clear', () => { expect(getVisionPenalty('clear')).toBe(0) })
  it('returns 2 for rain', () => { expect(getVisionPenalty('rain')).toBe(2) })
  it('returns 4 for heavy_rain', () => { expect(getVisionPenalty('heavy_rain')).toBe(4) })
  it('returns 6 for fog', () => { expect(getVisionPenalty('fog')).toBe(6) })
})

describe('rollWeatherChange', () => {
  it('returns a valid weather type', () => {
    const result = rollWeatherChange('clear')
    expect(['clear','rain','heavy_rain','snow','fog','storm']).toContain(result)
  })
})
```

- [ ] **Step 2: Implement weather.js**

```js
// src/lib/weather.js
const VISION_PENALTIES = { clear: 0, rain: 2, heavy_rain: 4, snow: 2, fog: 6, storm: 4 }
const TRANSITIONS = {
  clear: ['clear','clear','clear','rain','fog'],
  rain: ['rain','rain','clear','heavy_rain','storm'],
  heavy_rain: ['heavy_rain','rain','storm'],
  snow: ['snow','snow','clear'],
  fog: ['fog','clear','rain'],
  storm: ['storm','heavy_rain','rain','clear'],
}

export function getVisionPenalty(weather) { return VISION_PENALTIES[weather] || 0 }

export function rollWeatherChange(current) {
  const options = TRANSITIONS[current] || TRANSITIONS.clear
  return options[Math.floor(Math.random() * options.length)]
}
```

- [ ] **Step 3: Run tests, commit**

```bash
git add src/lib/weather.js src/lib/weather.test.js
git commit -m "feat: weather logic with vision penalties (TDD)"
```

### Task 11: Weather Renderer + Store + Vision

**Files:**
- Create: `src/engine/WeatherRenderer.js`
- Modify: `src/store/gameTimeSlice.js` (add weather state)
- Modify: `src/lib/visionCalculator.js` (apply weather penalty)
- Modify: `src/engine/PixiApp.jsx` (add weather layer)

- [ ] **Step 1: Create WeatherRenderer**

PixiJS particle overlay. Rain = blue particles falling. Snow = white drifting. Fog = semi-transparent white overlay. Storm = dark tint + rain + occasional white flash.

~100 lines. Takes weather container + weather type, spawns/removes particles.

- [ ] **Step 2: Add weather to gameTimeSlice**

Add `weather: { current: 'clear', duration: 3 }` to initial state. On `advanceGameTime`, decrement duration. When 0, roll new weather via `rollWeatherChange()`. Broadcast weather changes.

- [ ] **Step 3: Apply weather vision penalty**

In `src/lib/visionCalculator.js`, modify `getCharacterVisionRange` to accept weather penalty parameter and subtract from final vision range.

- [ ] **Step 4: Wire weather layer in PixiApp**

Add `weather: new PIXI.Container()` layer after fog. In ticker, call weather renderer. Skip weather for indoor themes.

- [ ] **Step 5: Commit**

```bash
git add src/engine/WeatherRenderer.js src/store/gameTimeSlice.js src/lib/visionCalculator.js src/engine/PixiApp.jsx
git commit -m "feat: weather particles, vision reduction, store state, PixiJS rendering"
```

---

## Feature 8: Party Formation

### Task 12: Formation Panel + State

**Files:**
- Create: `src/components/FormationPanel.jsx`
- Modify: `src/store/campaignSlice.js` (formation state)
- Modify: `src/GameV2.jsx` (tool handler)

- [ ] **Step 1: Add formation state to campaignSlice**

```js
formation: { front: [], back: [] },  // arrays of character IDs
setFormation: (formation) => set({ formation }),
```

- [ ] **Step 2: Create FormationPanel component**

Modal/panel with 2 columns (Front/Back). Drag party member portraits between columns. Save on close.

~100 lines. Reads partyMembers from store, dispatches setFormation.

- [ ] **Step 3: Wire into GameV2**

Add 'formation' tool handler. Open FormationPanel from a new HUD button or from Journal tabs.

- [ ] **Step 4: Wire formation into combat start**

In encounter start logic, use formation to determine initial token placement (front row closer to enemies).

- [ ] **Step 5: Commit**

```bash
git add src/components/FormationPanel.jsx src/store/campaignSlice.js src/GameV2.jsx
git commit -m "feat: party formation panel with front/back marching order"
```

---

## Feature 9: Quest Tracker

### Task 13: Quest System + Store (TDD)

**Files:**
- Create: `src/lib/questSystem.js`
- Create: `src/lib/questSystem.test.js`
- Modify: `src/store/storySlice.js` (quest state + actions)

- [ ] **Step 1: Write failing tests**

```js
// src/lib/questSystem.test.js
import { describe, it, expect } from 'vitest'
import { createQuest, completeObjective, isQuestComplete } from './questSystem.js'

describe('createQuest', () => {
  it('creates quest with active status', () => {
    const q = createQuest('Find the sword', [{ text: 'Go to cave' }])
    expect(q.status).toBe('active')
    expect(q.objectives).toHaveLength(1)
    expect(q.objectives[0].completed).toBe(false)
  })
})

describe('completeObjective', () => {
  it('marks objective as completed', () => {
    const q = createQuest('Test', [{ text: 'Step 1' }, { text: 'Step 2' }])
    const updated = completeObjective(q, q.objectives[0].id)
    expect(updated.objectives[0].completed).toBe(true)
    expect(updated.objectives[1].completed).toBe(false)
  })
})

describe('isQuestComplete', () => {
  it('returns true when all objectives done', () => {
    const q = { objectives: [{ completed: true }, { completed: true }] }
    expect(isQuestComplete(q)).toBe(true)
  })
  it('returns false when some incomplete', () => {
    const q = { objectives: [{ completed: true }, { completed: false }] }
    expect(isQuestComplete(q)).toBe(false)
  })
})
```

- [ ] **Step 2: Implement questSystem.js**

```js
// src/lib/questSystem.js
export function createQuest(title, objectives, opts = {}) {
  return {
    id: `quest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    description: opts.description || '',
    objectives: objectives.map((o, i) => ({
      id: `obj-${i}`, text: o.text || o, completed: false,
    })),
    status: 'active',
    reward: opts.reward || null,
    source: opts.source || 'Unknown',
  }
}

export function completeObjective(quest, objectiveId) {
  return {
    ...quest,
    objectives: quest.objectives.map(o =>
      o.id === objectiveId ? { ...o, completed: true } : o
    ),
  }
}

export function isQuestComplete(quest) {
  return quest.objectives.every(o => o.completed)
}
```

- [ ] **Step 3: Add quest state to storySlice**

In `src/store/storySlice.js`, add:
```js
quests: [],
addQuest: (quest) => set(s => ({ quests: [...s.quests, quest] })),
updateQuest: (questId, updates) => set(s => ({
  quests: s.quests.map(q => q.id === questId ? { ...q, ...updates } : q),
})),
completeQuestObjective: (questId, objId) => set(s => ({
  quests: s.quests.map(q => q.id === questId ? completeObjective(q, objId) : q),
})),
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/lib/questSystem.js src/lib/questSystem.test.js src/store/storySlice.js
git commit -m "feat: quest system with objective tracking (TDD)"
```

### Task 14: Quest Tab in Journal + HUD Indicator

**Files:**
- Modify: `src/components/JournalModal.jsx` (add Quests tab)
- Modify: `src/hud/GameHUD.jsx` (quest count indicator)
- Modify: `src/lib/narratorApi.js` (include quests in DM prompt)
- Modify: campaign generator prompt (seed starting quests)

- [ ] **Step 1: Add Quests tab to JournalModal**

Add tabbed interface to JournalModal. Tabs: "Story" (existing entries) | "Quests" (active + completed quests with checkable objectives).

Quest tab shows each active quest as a card with title, description, source NPC, and checklist of objectives.

- [ ] **Step 2: Quest count in HUD**

In GameHUD, near the zone label, show active quest count: `📜 2 Active Quests` (small, gold text).

- [ ] **Step 3: Include quests in DM prompt**

In narratorApi.js buildSystemPrompt, add active quest titles and incomplete objectives so AI DM can reference and progress quests.

- [ ] **Step 4: Update campaign generator to seed quests**

Add instructions to generate 2-3 starting quests in the campaign data.

- [ ] **Step 5: Commit**

```bash
git add src/components/JournalModal.jsx src/hud/GameHUD.jsx src/lib/narratorApi.js
git commit -m "feat: quest tracker in journal + HUD indicator + AI DM quest awareness"
```

---

## Final

### Task 15: Update Status + Final Test Run

**Files:**
- Modify: `tasks/status.md`

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Run: `npm run build`

- [ ] **Step 2: Update status.md with Phase 10**

- [ ] **Step 3: Commit**

```bash
git add tasks/status.md
git commit -m "docs: update status — Phase 10 living world features complete"
```
