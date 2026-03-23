import { describe, it, expect } from 'vitest'
import {
  generateRandomHazard,
  determineEncounterHazards,
  applyHazardEffect,
  getHazardTiles,
  describeHazard,
  HAZARD_TYPES,
} from './environmentalHazards'

describe('Environmental Hazards', () => {
  it('generateRandomHazard returns valid hazard', () => {
    const hazard = generateRandomHazard(3)
    expect(hazard).toBeDefined()
    expect(hazard.type).toBeDefined()
    expect(hazard.center).toBeDefined()
    expect(hazard.radius).toBeGreaterThan(0)
    expect(hazard.active).toBe(true)
  })

  it('determineEncounterHazards may return empty or populated array', () => {
    const hazards = determineEncounterHazards(0.5)
    expect(Array.isArray(hazards)).toBe(true)
    expect(hazards.length).toBeLessThanOrEqual(2)
  })

  it('hazards with 0% probability return empty', () => {
    const hazards = determineEncounterHazards(0)
    expect(hazards.length).toBe(0)
  })

  it('applyHazardEffect returns damage when in range', () => {
    const hazard = {
      type: HAZARD_TYPES.LAVA,
      center: { x: 5, y: 5 },
      radius: 2,
      damage: '1d6',
      damageType: 'fire',
    }
    const combatant = {
      position: { x: 5, y: 5 },
      saves: { str_save: 0, con_save: 0 },
    }
    const effect = applyHazardEffect(combatant, hazard)
    expect(effect.damage).toBeGreaterThanOrEqual(0)
    expect(effect.damage).toBeLessThanOrEqual(6)
  })

  it('applyHazardEffect returns 0 damage when out of range', () => {
    const hazard = {
      center: { x: 5, y: 5 },
      radius: 1,
      damage: '1d6',
    }
    const combatant = {
      position: { x: 10, y: 10 },
      saves: {},
    }
    const effect = applyHazardEffect(combatant, hazard)
    expect(effect.damage).toBe(0)
  })

  it('getHazardTiles returns affected coordinates', () => {
    const hazard = {
      center: { x: 7, y: 7 },
      radius: 1,
    }
    const tiles = getHazardTiles(hazard, 14, 14)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every(t => t.x !== undefined && t.y !== undefined)).toBe(true)
  })

  it('describeHazard returns narrative text', () => {
    const hazard = {
      type: HAZARD_TYPES.LAVA,
      damage: '2d6',
    }
    const desc = describeHazard(hazard)
    expect(typeof desc).toBe('string')
    expect(desc.length).toBeGreaterThan(0)
  })

  it('save effects work with hazards', () => {
    const hazard = {
      center: { x: 5, y: 5 },
      radius: 2,
      saveType: 'str',
      saveDC: 10,
    }
    const combatant = {
      position: { x: 5, y: 5 },
      saves: { str_save: 2 },
    }
    const effect = applyHazardEffect(combatant, hazard)
    expect(effect).toBeDefined()
    expect(typeof effect.saveFailed).toBe('boolean')
  })

  it('hazard types are all defined', () => {
    const types = Object.values(HAZARD_TYPES)
    expect(types.length).toBeGreaterThan(0)
    types.forEach(type => {
      expect(typeof type).toBe('string')
    })
  })

  it('multiple hazards can coexist', () => {
    const hazards = []
    for (let i = 0; i < 3; i++) {
      hazards.push(generateRandomHazard(5))
    }
    expect(hazards.length).toBe(3)
    hazards.forEach(h => {
      expect(h.type).toBeDefined()
      expect(h.center).toBeDefined()
    })
  })
})
