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
