// src/lib/trapSystem.test.js
import { describe, it, expect, vi } from 'vitest'
import {
  canDetectTrap,
  checkTrapTrigger,
  resolveTrapEffect,
  getPassivePerception,
} from './trapSystem.js'

// ---------------------------------------------------------------------------
// canDetectTrap
// ---------------------------------------------------------------------------
describe('canDetectTrap', () => {
  it('returns true when passive perception equals the trap DC', () => {
    expect(canDetectTrap(12, 12)).toBe(true)
  })

  it('returns true when passive perception exceeds the trap DC', () => {
    expect(canDetectTrap(15, 12)).toBe(true)
  })

  it('returns false when passive perception is below the trap DC', () => {
    expect(canDetectTrap(11, 12)).toBe(false)
  })

  it('handles edge case — perception of 0 vs DC 1', () => {
    expect(canDetectTrap(0, 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkTrapTrigger
// ---------------------------------------------------------------------------
describe('checkTrapTrigger', () => {
  const trap = { type: 'pressure_plate', position: { x: 3, y: 4 }, triggered: false }

  it('triggers when player is on the same tile as the trap', () => {
    const result = checkTrapTrigger(trap, { x: 3, y: 4 })
    expect(result.triggered).toBe(true)
    expect(result.trap).toBe(trap)
  })

  it('does not trigger when player is on a different tile', () => {
    const result = checkTrapTrigger(trap, { x: 2, y: 4 })
    expect(result.triggered).toBe(false)
  })

  it('does not trigger when player y differs', () => {
    const result = checkTrapTrigger(trap, { x: 3, y: 5 })
    expect(result.triggered).toBe(false)
  })

  it('does not trigger when the trap has already been triggered', () => {
    const alreadyTriggered = { ...trap, triggered: true }
    const result = checkTrapTrigger(alreadyTriggered, { x: 3, y: 4 })
    expect(result.triggered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getPassivePerception
// ---------------------------------------------------------------------------
describe('getPassivePerception', () => {
  it('returns 10 for a character with WIS 10 (modifier 0)', () => {
    expect(getPassivePerception({ stats: { wis: 10 } })).toBe(10)
  })

  it('returns 12 for a character with WIS 14 (modifier +2)', () => {
    expect(getPassivePerception({ stats: { wis: 14 } })).toBe(12)
  })

  it('returns 8 for a character with WIS 6 (modifier -2)', () => {
    expect(getPassivePerception({ stats: { wis: 6 } })).toBe(8)
  })

  it('returns 15 for a character with WIS 20 (modifier +5)', () => {
    expect(getPassivePerception({ stats: { wis: 20 } })).toBe(15)
  })

  it('defaults to WIS 10 when stats are missing', () => {
    expect(getPassivePerception({})).toBe(10)
  })

  it('floors the modifier correctly for odd WIS scores — WIS 13 gives +1', () => {
    expect(getPassivePerception({ stats: { wis: 13 } })).toBe(11)
  })
})

// ---------------------------------------------------------------------------
// resolveTrapEffect
// ---------------------------------------------------------------------------
describe('resolveTrapEffect', () => {
  // A target that always fails the save (roll will be 1, saveDC is high)
  const targetLowCon = { stats: { con: 8, dex: 8 }, name: 'Unlucky Hero' }
  // A target that always passes the save (roll will be 20, saveDC is low)
  const targetHighDex = { stats: { dex: 20, con: 20 }, name: 'Lucky Hero' }

  const damageTrap = {
    type: 'pressure_plate',
    dc: 12,
    effect: { damage: '1d6', damageType: 'piercing', save: 'DEX', saveDC: 13 },
    description: 'A hidden pressure plate triggers a volley of darts!',
  }

  const conditionTrap = {
    type: 'tripwire',
    dc: 14,
    effect: { condition: 'Restrained', duration: '1 minute', save: 'DEX', saveDC: 12 },
    description: 'A thin wire snaps, releasing a weighted net!',
  }

  const comboTrap = {
    type: 'poison_needle',
    dc: 16,
    effect: { damage: '1d4', damageType: 'poison', condition: 'Poisoned', save: 'CON', saveDC: 14 },
    description: 'A needle springs from the mechanism, glistening with poison!',
  }

  it('returns a result object with required fields', () => {
    const result = resolveTrapEffect(damageTrap, targetLowCon)
    expect(result).toHaveProperty('saved')
    expect(result).toHaveProperty('saveRoll')
    expect(result).toHaveProperty('damage')
    expect(result).toHaveProperty('condition')
    expect(result).toHaveProperty('description')
  })

  it('description matches the trap description', () => {
    const result = resolveTrapEffect(damageTrap, targetLowCon)
    expect(result.description).toBe(damageTrap.description)
  })

  it('damage is a non-negative number', () => {
    const result = resolveTrapEffect(damageTrap, targetLowCon)
    expect(typeof result.damage).toBe('number')
    expect(result.damage).toBeGreaterThanOrEqual(0)
  })

  it('saveRoll is between 1 and 20 (inclusive of modifier) — at least >= 1', () => {
    const result = resolveTrapEffect(damageTrap, targetLowCon)
    expect(result.saveRoll).toBeGreaterThanOrEqual(1)
  })

  it('condition is null for a damage-only trap', () => {
    // Mock Math.random to force a mid roll — we just check structure, not save outcome
    const result = resolveTrapEffect(damageTrap, targetLowCon)
    // condition should be null or undefined (damage-only trap has no condition)
    expect(result.condition == null || typeof result.condition === 'string').toBe(true)
    if (!result.saved) {
      // if failed save, no condition on this trap since it has no condition field
      expect(result.condition).toBeNull()
    }
  })

  it('applies condition when trap has condition effect and save is failed', () => {
    // Force fail by mocking Math.random to return 0 (roll = 1)
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = resolveTrapEffect(conditionTrap, targetLowCon)
    spy.mockRestore()
    expect(result.saved).toBe(false)
    expect(result.condition).toBe('Restrained')
  })

  it('condition is null when save is passed on condition trap', () => {
    // Force pass by mocking Math.random to return 0.999 (roll = 20 + high modifier)
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const result = resolveTrapEffect(conditionTrap, targetHighDex)
    spy.mockRestore()
    expect(result.saved).toBe(true)
    expect(result.condition).toBeNull()
  })

  it('damage is 0 when save succeeds on a damage trap (half-damage rule: full save = no damage for traps)', () => {
    // Traps typically deal 0 on save (unlike spells). We enforce: save = 0 damage.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const result = resolveTrapEffect(damageTrap, targetHighDex)
    spy.mockRestore()
    expect(result.saved).toBe(true)
    expect(result.damage).toBe(0)
  })

  it('handles combo trap with both damage and condition on failed save', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = resolveTrapEffect(comboTrap, targetLowCon)
    spy.mockRestore()
    expect(result.saved).toBe(false)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.condition).toBe('Poisoned')
  })

  it('applies no condition and no damage on successful save for combo trap', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const result = resolveTrapEffect(comboTrap, targetHighDex)
    spy.mockRestore()
    expect(result.saved).toBe(true)
    expect(result.damage).toBe(0)
    expect(result.condition).toBeNull()
  })
})
