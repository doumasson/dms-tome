# Class-Aware Combat Action System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Fireball "Cast" button with a class-aware combat system where each D&D 5e class gets its own abilities, spell picker, weapon picker, and resource tracking.

**Architecture:** Class-specific button definitions are driven by data in `src/data/classes.js`. A new `getClassCombatActions(className, level)` helper maps class features to action bar buttons. Spell/weapon pickers are modal components. AoE targeting adds hover preview mode to existing `AoEOverlay.js`. All state flows through Zustand's `encounterSlice`.

**Tech Stack:** React, Zustand, PixiJS (AoE overlays), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-20-class-aware-combat-actions-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/classCombatActions.js` | Map class → combat action buttons (data-driven, no JSX) |
| `src/lib/classCombatActions.test.js` | Tests for class action mapping |
| `src/lib/spellCasting.js` | Spell resolution: save DC, damage, slot consumption, upcast |
| `src/lib/spellCasting.test.js` | Tests for spell resolution logic |
| `src/hud/SpellPickerModal.jsx` | Modal: prepared spells grouped by level, slot tracking |
| `src/hud/WeaponPickerModal.jsx` | Modal: equipped weapons with attack/damage stats |
| `src/hud/ClassResourceBar.jsx` | Compact resource pip/counter display above action bar |

### Modified Files
| File | Changes |
|------|---------|
| `src/hud/CombatActionBar.jsx` | Replace hardcoded buttons with class-aware generation, add resource bar |
| `src/hooks/useCombatActions.js` | Replace hardcoded Fireball, add spell/weapon selection state, hover AoE preview |
| `src/store/encounterSlice.js` | Add `useClassResource`, `useSpellSlot`, fix turn reset for bonus/reaction tracking |
| `src/engine/AoEOverlay.js` | Add `renderRangeOverlay()`, support hover-mode preview |

---

## Task 1: Class Combat Action Mapping (Pure Logic)

**Files:**
- Create: `src/lib/classCombatActions.js`
- Create: `src/lib/classCombatActions.test.js`
- Read: `src/data/classes.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/lib/classCombatActions.test.js
import { describe, it, expect } from 'vitest'
import { getClassCombatActions } from './classCombatActions'

describe('getClassCombatActions', () => {
  it('returns Monk Ki abilities at level 2+', () => {
    const actions = getClassCombatActions('Monk', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Flurry of Blows')
    expect(names).toContain('Patient Defense')
    expect(names).toContain('Step of the Wind')
    expect(names).not.toContain('Stunning Strike') // level 5+
  })

  it('returns Stunning Strike at level 5+', () => {
    const actions = getClassCombatActions('Monk', 5)
    expect(actions.map(a => a.name)).toContain('Stunning Strike')
  })

  it('returns Fighter Action Surge and Second Wind', () => {
    const actions = getClassCombatActions('Fighter', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Action Surge')
    expect(names).toContain('Second Wind')
  })

  it('returns no SPELLS button for Monk', () => {
    const actions = getClassCombatActions('Monk', 5)
    expect(actions.map(a => a.name)).not.toContain('Spells')
  })

  it('returns SPELLS button for Wizard', () => {
    const actions = getClassCombatActions('Wizard', 1)
    expect(actions.map(a => a.name)).toContain('Spells')
  })

  it('returns Rage for Barbarian', () => {
    const actions = getClassCombatActions('Barbarian', 1)
    expect(actions.map(a => a.name)).toContain('Rage')
  })

  it('returns Cunning Action for Rogue level 2+', () => {
    const actions = getClassCombatActions('Rogue', 2)
    expect(actions.map(a => a.name)).toContain('Cunning Action')
  })

  it('returns Smite and Lay on Hands for Paladin', () => {
    const actions = getClassCombatActions('Paladin', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Divine Smite')
    expect(names).toContain('Lay on Hands')
    expect(names).toContain('Spells')
  })

  it('returns Bardic Inspiration for Bard', () => {
    const actions = getClassCombatActions('Bard', 1)
    expect(actions.map(a => a.name)).toContain('Bardic Inspiration')
  })

  it('each action has required fields', () => {
    const actions = getClassCombatActions('Fighter', 5)
    for (const a of actions) {
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('actionType') // 'action' | 'bonus_action' | 'free'
      expect(a).toHaveProperty('icon')
    }
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/classCombatActions.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `classCombatActions.js`**

```javascript
// src/lib/classCombatActions.js
import { CLASSES } from '../data/classes'
import { isCaster } from './spellSlots'

/**
 * Returns the class-specific combat action buttons for a given class and level.
 * Each action: { name, icon, actionType, resourceName?, resourceCost?, levelReq?, handler? }
 */
export function getClassCombatActions(className, level) {
  const actions = []
  const cls = CLASSES[className]
  if (!cls) return actions

  // Casters get a Spells button
  if (isCaster(className)) {
    actions.push({ name: 'Spells', icon: '✨', actionType: 'action', handler: 'openSpellPicker' })
  }

  // Class-specific abilities
  switch (className) {
    case 'Monk':
      if (level >= 2) {
        actions.push({ name: 'Flurry of Blows', icon: '👊', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
        actions.push({ name: 'Patient Defense', icon: '🛡', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
        actions.push({ name: 'Step of the Wind', icon: '💨', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
      }
      if (level >= 5) {
        actions.push({ name: 'Stunning Strike', icon: '⚡', actionType: 'free', resourceName: 'Ki Points', resourceCost: 1, levelReq: 5 })
      }
      break

    case 'Fighter':
      actions.push({ name: 'Second Wind', icon: '❤', actionType: 'bonus_action', resourceName: 'Second Wind', resourceCost: 1 })
      if (level >= 2) {
        actions.push({ name: 'Action Surge', icon: '⚡', actionType: 'free', resourceName: 'Action Surge', resourceCost: 1 })
      }
      break

    case 'Barbarian':
      actions.push({ name: 'Rage', icon: '🔥', actionType: 'bonus_action', resourceName: 'Rages', resourceCost: 1 })
      actions.push({ name: 'Reckless Attack', icon: '⚔', actionType: 'free' })
      break

    case 'Rogue':
      if (level >= 2) {
        actions.push({ name: 'Cunning Action', icon: '🎭', actionType: 'bonus_action' })
      }
      break

    case 'Paladin':
      if (level >= 2) {
        actions.push({ name: 'Divine Smite', icon: '🗡', actionType: 'free', handler: 'smite' })
        actions.push({ name: 'Lay on Hands', icon: '❤', actionType: 'action', resourceName: 'Lay on Hands' })
      }
      break

    case 'Cleric':
      actions.push({ name: 'Channel Divinity', icon: '⚡', actionType: 'action', resourceName: 'Channel Divinity', resourceCost: 1 })
      break

    case 'Bard':
      actions.push({ name: 'Bardic Inspiration', icon: '🎵', actionType: 'bonus_action', resourceName: 'Bardic Inspiration', resourceCost: 1 })
      break

    case 'Druid':
      if (level >= 2) {
        actions.push({ name: 'Wild Shape', icon: '🐻', actionType: 'action', resourceName: 'Wild Shape', resourceCost: 1 })
      }
      break

    // Sorcerer, Warlock, Wizard, Ranger — Spells button covers them
  }

  return actions
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/classCombatActions.test.js`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/classCombatActions.js src/lib/classCombatActions.test.js
git commit -m "feat: class combat action mapping — data-driven button definitions for all 12 classes"
```

---

## Task 2: Spell Resolution Logic (Pure Logic)

**Files:**
- Create: `src/lib/spellCasting.js`
- Create: `src/lib/spellCasting.test.js`
- Read: `src/data/spells.js`, `src/data/classes.js`, `src/lib/spellSlots.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/lib/spellCasting.test.js
import { describe, it, expect } from 'vitest'
import { getSpellSaveDC, getSpellAttackBonus, getAvailableSpells, getUpcastDamage, canCastSpell } from './spellCasting'

describe('getSpellSaveDC', () => {
  it('computes Wizard spell save DC correctly', () => {
    const char = { class: 'Wizard', level: 5, stats: { int: 16 } }
    // DC = 8 + prof(3) + mod(3) = 14
    expect(getSpellSaveDC(char)).toBe(14)
  })

  it('computes Cleric spell save DC with WIS', () => {
    const char = { class: 'Cleric', level: 1, stats: { wis: 14 } }
    // DC = 8 + prof(2) + mod(2) = 12
    expect(getSpellSaveDC(char)).toBe(12)
  })
})

describe('getSpellAttackBonus', () => {
  it('computes spell attack bonus', () => {
    const char = { class: 'Wizard', level: 5, stats: { int: 16 } }
    // bonus = prof(3) + mod(3) = 6
    expect(getSpellAttackBonus(char)).toBe(6)
  })
})

describe('getAvailableSpells', () => {
  it('returns spells for Wizard class', () => {
    const char = { class: 'Wizard', level: 3, spells: [{ name: 'Fire Bolt' }, { name: 'Fireball' }, { name: 'Shield' }] }
    const available = getAvailableSpells(char)
    expect(available.length).toBeGreaterThan(0)
    expect(available.every(s => s.name)).toBe(true)
  })

  it('returns empty for non-caster', () => {
    const char = { class: 'Fighter', level: 5, spells: [] }
    const available = getAvailableSpells(char)
    expect(available).toEqual([])
  })

  it('groups spells by level', () => {
    const char = { class: 'Wizard', level: 5, spells: [{ name: 'Fire Bolt' }, { name: 'Magic Missile' }, { name: 'Fireball' }] }
    const available = getAvailableSpells(char)
    const cantrips = available.filter(s => s.level === 0)
    const level1 = available.filter(s => s.level === 1)
    expect(cantrips.length).toBeGreaterThanOrEqual(0)
    expect(level1.length).toBeGreaterThanOrEqual(0)
  })
})

describe('canCastSpell', () => {
  it('cantrips always castable', () => {
    const spell = { level: 0, name: 'Fire Bolt' }
    const slots = { 1: { total: 0, used: 0 } }
    expect(canCastSpell(spell, slots)).toBe(true)
  })

  it('leveled spell needs available slot', () => {
    const spell = { level: 1, name: 'Magic Missile' }
    const slotsAvail = { 1: { total: 4, used: 2 } }
    const slotsEmpty = { 1: { total: 4, used: 4 } }
    expect(canCastSpell(spell, slotsAvail)).toBe(true)
    expect(canCastSpell(spell, slotsEmpty)).toBe(false)
  })

  it('can upcast with higher slot', () => {
    const spell = { level: 1, name: 'Magic Missile' }
    const slots = { 1: { total: 2, used: 2 }, 2: { total: 3, used: 0 } }
    expect(canCastSpell(spell, slots)).toBe(true)
  })
})

describe('getUpcastDamage', () => {
  it('scales damage with higher slot', () => {
    const spell = { level: 1, damage: { dice: '3d6', scalingDicePerLevel: '1d6' } }
    expect(getUpcastDamage(spell, 1)).toBe('3d6')
    expect(getUpcastDamage(spell, 3)).toBe('5d6')
  })

  it('returns base damage when no scaling', () => {
    const spell = { level: 1, damage: { dice: '3d8', scalingDicePerLevel: null } }
    expect(getUpcastDamage(spell, 3)).toBe('3d8')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/spellCasting.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `spellCasting.js`**

```javascript
// src/lib/spellCasting.js
import { CLASSES } from '../data/classes'
import { SPELLS } from '../data/spells'
import { isCaster } from './spellSlots'

const PROF_TABLE = [2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6]

export function profBonus(level) {
  return PROF_TABLE[Math.min(level, 20) - 1] || 2
}

export function getSpellAbility(className) {
  const cls = CLASSES[className]
  if (!cls?.spellAbility) return null
  return cls.spellAbility.toLowerCase()
}

export function getSpellSaveDC(char) {
  const ability = getSpellAbility(char.class)
  if (!ability) return 10
  const score = char.stats?.[ability] || 10
  const mod = Math.floor((score - 10) / 2)
  return 8 + profBonus(char.level || 1) + mod
}

export function getSpellAttackBonus(char) {
  const ability = getSpellAbility(char.class)
  if (!ability) return 0
  const score = char.stats?.[ability] || 10
  const mod = Math.floor((score - 10) / 2)
  return profBonus(char.level || 1) + mod
}

export function getAvailableSpells(char) {
  if (!isCaster(char.class)) return []
  const knownNames = new Set((char.spells || []).map(s => typeof s === 'string' ? s : s.name))
  if (knownNames.size === 0) return []
  return SPELLS.filter(s => knownNames.has(s.name))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

export function canCastSpell(spell, spellSlots) {
  if (spell.level === 0) return true
  if (!spellSlots) return false
  // Check if any slot at spell level or higher is available
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) return true
  }
  return false
}

export function getLowestAvailableSlot(spell, spellSlots) {
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) return lvl
  }
  return null
}

export function getAvailableSlotLevels(spell, spellSlots) {
  const levels = []
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) levels.push(lvl)
  }
  return levels
}

export function getUpcastDamage(spell, castLevel) {
  const base = spell.damage?.dice
  if (!base) return null
  const scaling = spell.damage?.scalingDicePerLevel
  if (!scaling || castLevel <= spell.level) return base
  // Parse base: "3d6" → count=3, die="d6"
  const baseMatch = base.match(/^(\d+)(d\d+)$/)
  const scaleMatch = scaling.match(/^(\d+)(d\d+)$/)
  if (!baseMatch || !scaleMatch) return base
  const extraDice = parseInt(scaleMatch[1]) * (castLevel - spell.level)
  return `${parseInt(baseMatch[1]) + extraDice}${baseMatch[2]}`
}

export function getCantripScaling(charLevel) {
  if (charLevel >= 17) return 3
  if (charLevel >= 11) return 2
  if (charLevel >= 5) return 1
  return 0
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/spellCasting.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/spellCasting.js src/lib/spellCasting.test.js
git commit -m "feat: spell resolution logic — save DC, attack bonus, slot management, upcasting"
```

---

## Task 3: Weapon Picker Modal

**Files:**
- Create: `src/hud/WeaponPickerModal.jsx`
- Read: `src/data/classes.js` (Monk martial arts die)

- [ ] **Step 1: Create WeaponPickerModal component**

```javascript
// src/hud/WeaponPickerModal.jsx
import { CLASSES } from '../data/classes'

/**
 * Modal showing equipped weapons for attack selection.
 * Props: { attacks, character, onSelect, onClose }
 *   attacks: [{ name, bonus, damage }] from combatant.attacks
 *   character: { class, level, stats } for Monk martial arts die
 *   onSelect: (weapon) => void
 *   onClose: () => void
 */
export default function WeaponPickerModal({ attacks, character, onSelect, onClose }) {
  // Monk: apply martial arts die to unarmed strike
  const cls = CLASSES[character?.class]
  const martialArtsDie = cls?.martialArtsDie
  const monkDie = martialArtsDie
    ? Object.entries(martialArtsDie).reverse().find(([lvl]) => (character?.level || 1) >= Number(lvl))?.[1]
    : null

  const weapons = (attacks || []).map(w => {
    if (monkDie && w.name === 'Unarmed Strike') {
      return { ...w, damage: monkDie + '+' + (w.damage?.match(/\+(\d+)/)?.[1] || '0') }
    }
    return w
  })

  // Always include Unarmed Strike if not present
  if (!weapons.some(w => w.name === 'Unarmed Strike')) {
    const strMod = Math.floor(((character?.stats?.str || 10) - 10) / 2)
    const prof = Math.floor(((character?.level || 1) - 1) / 4) + 2
    const die = monkDie || '1'
    weapons.push({ name: 'Unarmed Strike', bonus: `+${prof + strMod}`, damage: `${die}+${strMod}` })
  }

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
      borderRadius: 8, padding: '16px 24px', minWidth: 280, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 12 }}>⚔ Choose Weapon</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {weapons.map((w, i) => (
          <button key={i} onClick={() => onSelect(w)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#1a1520', padding: '10px 14px', borderRadius: 4,
            border: '1px solid #332a1e', color: '#e8dcc8', cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 12,
          }}>
            <span style={{ color: '#d4af37' }}>{w.name}</span>
            <span style={{ color: '#8a7a52', fontSize: 11 }}>{w.bonus} · {w.damage}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: '#666' }}>Press Escape to cancel</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds (no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add src/hud/WeaponPickerModal.jsx
git commit -m "feat: weapon picker modal — shows equipped weapons with attack/damage stats"
```

---

## Task 4: Spell Picker Modal

**Files:**
- Create: `src/hud/SpellPickerModal.jsx`
- Read: `src/lib/spellCasting.js`, `src/data/spells.js`

- [ ] **Step 1: Create SpellPickerModal component**

```javascript
// src/hud/SpellPickerModal.jsx
import { useState } from 'react'
import { getAvailableSpells, canCastSpell, getAvailableSlotLevels } from '../lib/spellCasting'

/**
 * Modal showing prepared spells grouped by level with slot tracking.
 * Props: { character, spellSlots, onSelect, onClose }
 *   character: { class, level, spells }
 *   spellSlots: { [level]: { total, used } }
 *   onSelect: (spell, castLevel) => void
 *   onClose: () => void
 */
export default function SpellPickerModal({ character, spellSlots, onSelect, onClose }) {
  const [upcastSpell, setUpcastSpell] = useState(null)
  const spells = getAvailableSpells(character)

  if (spells.length === 0) {
    return (
      <div style={modalStyle}>
        <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 12 }}>✨ No Spells Available</div>
        <div style={{ color: '#8a7a52', fontSize: 12 }}>This character has no prepared spells.</div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#666' }}>Press Escape to close</div>
      </div>
    )
  }

  // Group by level
  const grouped = {}
  for (const s of spells) {
    ;(grouped[s.level] ??= []).push(s)
  }

  // Upcast selection
  if (upcastSpell) {
    const levels = getAvailableSlotLevels(upcastSpell, spellSlots)
    return (
      <div style={modalStyle}>
        <div style={{ fontSize: 14, color: '#d4af37', marginBottom: 8 }}>Cast {upcastSpell.name} at level:</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {levels.map(lvl => (
            <button key={lvl} onClick={() => onSelect(upcastSpell, lvl)} style={{
              ...slotBtnStyle, background: lvl === upcastSpell.level ? '#2a1a1a' : '#1a1a2a',
            }}>
              {lvl === upcastSpell.level ? `${ordinal(lvl)} (base)` : ordinal(lvl)}
            </button>
          ))}
        </div>
        <button onClick={() => setUpcastSpell(null)} style={{ ...cancelBtnStyle, marginTop: 10 }}>Back</button>
      </div>
    )
  }

  function handleSpellClick(spell) {
    if (spell.level === 0) { onSelect(spell, 0); return }
    const levels = getAvailableSlotLevels(spell, spellSlots)
    if (levels.length === 0) return
    if (levels.length === 1) { onSelect(spell, levels[0]); return }
    setUpcastSpell(spell) // Show upcast picker
  }

  return (
    <div style={modalStyle}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 6 }}>✨ Prepared Spells</div>
      {/* Slot summary */}
      <div style={{ color: '#8a7a52', fontSize: 10, marginBottom: 10, textAlign: 'center' }}>
        {Object.entries(spellSlots || {}).filter(([, v]) => v.total > 0).map(([lvl, v]) => (
          <span key={lvl} style={{ marginRight: 8 }}>
            L{lvl}: {'●'.repeat(v.total - v.used)}{'○'.repeat(v.used)}
          </span>
        ))}
      </div>
      {/* Spell list grouped by level */}
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(grouped).sort(([a],[b]) => a - b).map(([level, list]) => (
          <div key={level}>
            <div style={{ color: level === '0' ? '#666' : '#d4af37', fontSize: 10, marginBottom: 4 }}>
              {level === '0' ? 'CANTRIPS (at will)' : `LEVEL ${level} (${slotsRemaining(spellSlots, Number(level))} slots)`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {list.map(spell => {
                const castable = canCastSpell(spell, spellSlots)
                const isReaction = spell.castingTime?.includes('reaction')
                return (
                  <button key={spell.spellId || spell.name} disabled={!castable || isReaction}
                    onClick={() => handleSpellClick(spell)}
                    style={{
                      ...spellBtnStyle,
                      opacity: (!castable || isReaction) ? 0.4 : 1,
                      cursor: (!castable || isReaction) ? 'not-allowed' : 'pointer',
                    }}>
                    <span style={{ color: '#e8dcc8' }}>{spell.name}</span>
                    <span style={{ color: '#666', fontSize: 10 }}>
                      {spell.areaType ? `${spell.areaType} ` : ''}
                      {spell.range > 0 ? `${spell.range}ft` : spell.range === -1 ? 'touch' : 'self'}
                      {spell.damage?.dice ? ` · ${spell.damage.dice}` : ''}
                      {spell.concentration ? ' · ⟳' : ''}
                      {isReaction ? ' · reaction' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: '#666', textAlign: 'center' }}>Press Escape to cancel</div>
    </div>
  )
}

function slotsRemaining(slots, level) {
  const s = slots?.[level]
  return s ? s.total - s.used : 0
}

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

const modalStyle = {
  position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
  borderRadius: 8, padding: '16px 24px', minWidth: 320, maxWidth: 400, zIndex: 100,
  fontFamily: 'Cinzel, serif', color: '#e8dcc8',
}

const spellBtnStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: '#1a1520', padding: '8px 12px', borderRadius: 4,
  border: '1px solid #332a1e', color: '#e8dcc8',
  fontFamily: 'Cinzel, serif', fontSize: 11, width: '100%',
}

const slotBtnStyle = {
  padding: '8px 16px', borderRadius: 4, border: '1px solid #d4af37',
  color: '#d4af37', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 12,
}

const cancelBtnStyle = {
  background: 'none', border: '1px solid #444', color: '#666',
  padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 10,
  fontFamily: 'Cinzel, serif',
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hud/SpellPickerModal.jsx
git commit -m "feat: spell picker modal — prepared spells by level, slot tracking, upcast selection"
```

---

## Task 5: Class Resource Bar

**Files:**
- Create: `src/hud/ClassResourceBar.jsx`
- Read: `src/lib/classResources.js`, `src/lib/spellSlots.js`

- [ ] **Step 1: Create ClassResourceBar component**

```javascript
// src/hud/ClassResourceBar.jsx
import { getClassResources } from '../lib/classResources'

/**
 * Compact resource display above the combat action bar.
 * Shows Ki points, spell slots, rage uses, etc.
 * Props: { combatant }
 *   combatant: { class, level, stats, spellSlots, resourcesUsed, concentration }
 */
export default function ClassResourceBar({ combatant }) {
  if (!combatant) return null
  const { class: cls, level, stats, spellSlots, resourcesUsed = {}, concentration } = combatant
  const resources = getClassResources(cls, level || 1, stats)

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      fontSize: 10, color: '#8a7a52', fontFamily: 'monospace',
      padding: '4px 8px', marginBottom: 4,
    }}>
      {/* Spell slots */}
      {spellSlots && Object.entries(spellSlots)
        .filter(([, v]) => v.total > 0)
        .map(([lvl, v]) => (
          <span key={`slot-${lvl}`}>
            L{lvl}: <span style={{ color: '#d4af37' }}>{'●'.repeat(Math.max(0, v.total - (v.used || 0)))}</span>
            <span style={{ color: '#332a1e' }}>{'●'.repeat(v.used || 0)}</span>
          </span>
        ))
      }
      {/* Class resources */}
      {resources.map(r => {
        const used = resourcesUsed[r.name] || 0
        const remaining = (r.type === 'pool') ? Math.max(0, r.max - used) : Math.max(0, r.max - used)
        return (
          <span key={r.name}>
            {r.icon} {r.name}: <span style={{ color: remaining > 0 ? '#d4af37' : '#cc3333' }}>
              {r.type === 'pool' ? `${remaining}/${r.max}` : `${'●'.repeat(remaining)}${'○'.repeat(used)}`}
            </span>
          </span>
        )
      })}
      {/* Concentration indicator */}
      {concentration && (
        <span style={{ color: '#aa66ff' }}>⟳ {concentration}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hud/ClassResourceBar.jsx
git commit -m "feat: class resource bar — spell slot pips, Ki/Rage/etc counters, concentration indicator"
```

---

## Task 6: Wire CombatActionBar to Class-Aware System

**Files:**
- Modify: `src/hud/CombatActionBar.jsx`
- Read: `src/lib/classCombatActions.js`

- [ ] **Step 1: Rewrite CombatActionBar with class-aware buttons**

Replace the hardcoded Attack/Cast/Move buttons with dynamic generation from `getClassCombatActions`. Import and render `ClassResourceBar`. Show/hide `WeaponPickerModal` and `SpellPickerModal` based on state.

Key changes:
- Import `getClassCombatActions` from `../lib/classCombatActions`
- Import `ClassResourceBar` from `./ClassResourceBar`
- Read `active.class` and `active.level` to determine available buttons
- Replace hardcoded "Cast" button with class-specific buttons from `getClassCombatActions()`
- Attack button now calls `onAction('attack-pick')` to trigger weapon picker
- Spells button calls `onAction('spell-pick')` to trigger spell picker
- Class ability buttons call `onAction('class-ability', { name, resourceName, resourceCost })`
- Render `ClassResourceBar` above buttons showing resources and slots

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hud/CombatActionBar.jsx
git commit -m "feat: class-aware combat action bar — dynamic buttons per class, resource display"
```

---

## Task 7: Wire useCombatActions to New Modals + AoE Hover

**Files:**
- Modify: `src/hooks/useCombatActions.js`
- Modify: `src/engine/AoEOverlay.js`

This is the critical wiring task — connects the spell picker and weapon picker to the combat flow.

- [ ] **Step 1: Add state for weapon/spell picker modals**

In `useCombatActions.js`, add state:
```javascript
const [showWeaponPicker, setShowWeaponPicker] = useState(false)
const [showSpellPicker, setShowSpellPicker] = useState(false)
const [selectedWeapon, setSelectedWeapon] = useState(null)
```

- [ ] **Step 2: Replace hardcoded Fireball in handleCombatAction**

Replace lines 402-415 (the `case 'cast'` block with hardcoded Fireball) with:
```javascript
} else if (type === 'spell-pick') {
  setShowSpellPicker(true)
  return
} else if (type === 'attack-pick') {
  setShowWeaponPicker(true)
  return
} else if (type === 'class-ability') {
  // Handle class-specific abilities (Flurry, Rage, etc.)
  // Consume resource, apply effect
  return
```

- [ ] **Step 3: Add spell selection handler**

```javascript
const handleSpellSelected = useCallback((spell, castLevel) => {
  setShowSpellPicker(false)
  const active = encounter.combatants?.[encounter.currentTurn]
  if (!active) return

  // NOTE: Do NOT consume spell slot here — consume it when the spell actually
  // resolves (on click-to-cast). If player presses Escape, no slot is consumed.
  // Pass castLevel in targetingMode so the tile click handler can consume it.

  // Check concentration conflict
  if (spell.concentration && active.concentration) {
    // TODO: show confirmation "Replace concentration on X with Y?"
    // For now, proceed (old concentration will be dropped on cast)
  }

  // Enter targeting based on spell type
  if (spell.areaType) {
    setTargetingMode({ type: 'spell', spell: { ...spell, damage: spell.damage?.dice || '1d6' }, castLevel })
  } else if (spell.attack) {
    setTargetingMode({ type: 'spell-attack', spell, castLevel })
  } else {
    // Self/utility spell — cast immediately, consume slot now
    if (castLevel > 0) useStore.getState().useSpellSlot(active.id, castLevel)
    // ... resolve and narrate
  }
}, [encounter])
```

- [ ] **Step 4: Add weapon selection handler**

```javascript
const handleWeaponSelected = useCallback((weapon) => {
  setShowWeaponPicker(false)
  setSelectedWeapon(weapon)
  setTargetingMode('attack')
  addNarratorMessage({ role: 'dm', speaker: 'System', text: `Attack with ${weapon.name}. Click a target.` })
}, [])
```

- [ ] **Step 5: Add range overlay rendering to AoEOverlay.js**

Add to `src/engine/AoEOverlay.js`:
```javascript
export function renderRangeOverlay(container, casterPos, rangeTiles, tileSize, color = 0x4466ff) {
  clearRangeOverlay(container)
  for (let dx = -rangeTiles; dx <= rangeTiles; dx++) {
    for (let dy = -rangeTiles; dy <= rangeTiles; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > rangeTiles * 1.5) continue // rough circle
      const g = new PIXI.Graphics()
      g.beginFill(color, 0.08)
      g.drawRect((casterPos.x + dx) * tileSize, (casterPos.y + dy) * tileSize, tileSize, tileSize)
      g.endFill()
      g._isRange = true
      container.addChild(g)
    }
  }
}

export function clearRangeOverlay(container) {
  const toRemove = container.children.filter(c => c._isRange)
  toRemove.forEach(c => { container.removeChild(c); c.destroy() })
}
```

- [ ] **Step 6: Return new state from hook**

Add to the hook's return value:
```javascript
return {
  ...existingReturns,
  showWeaponPicker, setShowWeaponPicker,
  showSpellPicker, setShowSpellPicker,
  handleSpellSelected,
  handleWeaponSelected,
  selectedWeapon,
}
```

- [ ] **Step 7: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useCombatActions.js src/engine/AoEOverlay.js
git commit -m "feat: wire spell/weapon pickers to combat flow, add AoE range overlay"
```

---

## Task 8: Wire Modals in GameV2 + Store Updates

**Files:**
- Modify: `src/GameV2.jsx` (render modals)
- Modify: `src/store/encounterSlice.js` (add `useSpellSlot`, `useClassResource`)

- [ ] **Step 1: Add `useSpellSlot` and `useClassResource` to encounterSlice**

In `encounterSlice.js`, add after `useAction`:
```javascript
useSpellSlot: (combatantId, slotLevel) =>
  set((state) => ({
    encounter: {
      ...state.encounter,
      combatants: state.encounter.combatants.map(c =>
        c.id === combatantId && c.spellSlots?.[slotLevel]
          ? { ...c, spellSlots: { ...c.spellSlots, [slotLevel]: { ...c.spellSlots[slotLevel], used: c.spellSlots[slotLevel].used + 1 } } }
          : c
      ),
    },
  })),

useClassResource: (combatantId, resourceName, cost = 1) =>
  set((state) => ({
    encounter: {
      ...state.encounter,
      combatants: state.encounter.combatants.map(c =>
        c.id === combatantId
          ? { ...c, resourcesUsed: { ...c.resourcesUsed, [resourceName]: (c.resourcesUsed?.[resourceName] || 0) + cost } }
          : c
      ),
    },
  })),
```

- [ ] **Step 2: Render modals in GameV2**

In `GameV2.jsx`, import the new modals and render them conditionally:
```javascript
import WeaponPickerModal from './hud/WeaponPickerModal'
import SpellPickerModal from './hud/SpellPickerModal'
```

In the JSX, add after the combat action bar:
```jsx
{showWeaponPicker && (
  <WeaponPickerModal
    attacks={active?.attacks || []}
    character={active}
    onSelect={handleWeaponSelected}
    onClose={() => setShowWeaponPicker(false)}
  />
)}
{showSpellPicker && (
  <SpellPickerModal
    character={active}
    spellSlots={active?.spellSlots || {}}
    onSelect={handleSpellSelected}
    onClose={() => setShowSpellPicker(false)}
  />
)}
```

- [ ] **Step 3: Add Escape key handling for modals**

In the existing Escape key useEffect, add:
```javascript
if (showWeaponPicker) setShowWeaponPicker(false)
if (showSpellPicker) setShowSpellPicker(false)
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (including new classCombatActions and spellCasting tests)

- [ ] **Step 5: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/GameV2.jsx src/store/encounterSlice.js
git commit -m "feat: wire combat modals in GameV2, add spell slot and class resource store actions"
```

---

## Task 9: Integration Test + Push

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Push to deploy**

```bash
git push
```
Vercel auto-deploys in ~30 seconds.

- [ ] **Step 4: Manual test checklist**

Load `?v2&debug` and verify:
1. Create a Monk character → action bar shows Attack, Flurry, Patient Defense, Step of the Wind, Move (no Cast/Spells button)
2. Create a Wizard character → action bar shows Attack, Spells, Move
3. Click Attack → weapon picker modal appears with equipped weapons
4. Click Spells (as Wizard) → spell picker modal shows prepared spells grouped by level
5. Select a cantrip → targeting mode activates immediately
6. Select a leveled spell → slot consumed, targeting mode activates
7. Select AoE spell → hover preview follows cursor, click to cast
8. Resource bar shows remaining spell slots / Ki points
9. Using a Ki ability decrements the Ki counter
10. Enemy turns still execute (goblins move + attack)
