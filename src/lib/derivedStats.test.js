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
    level: 1, class: 'Fighter', speed: 30,
  }

  it('computes unarmored AC = 10 + dexMod', () => {
    const result = computeDerivedStats(baseChar)
    expect(result.ac).toBe(12)
  })
  it('applies armor AC', () => {
    const char = { ...baseChar, equippedItems: { chest: { baseAC: 14, addDex: true, maxDex: 2 } } }
    expect(computeDerivedStats(char).ac).toBe(16)
  })
  it('applies shield + modifier', () => {
    const char = { ...baseChar, equippedItems: {
      offHand: { armorType: 'shield', baseAC: 2, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 's1' }
    }, attunedItems: [] }
    expect(computeDerivedStats(char).ac).toBe(15)
  })
  it('only applies modifiers from attuned items when requiresAttunement', () => {
    const char = { ...baseChar, equippedItems: {
      ring1: { requiresAttunement: true, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 'r1' }
    }, attunedItems: [] }
    expect(computeDerivedStats(char).ac).toBe(12) // NOT applied
  })
  it('applies modifiers from attuned items', () => {
    const char = { ...baseChar, equippedItems: {
      ring1: { requiresAttunement: true, modifiers: [{ stat: 'ac', value: 1 }], instanceId: 'r1' }
    }, attunedItems: ['r1'] }
    expect(computeDerivedStats(char).ac).toBe(13)
  })
})
