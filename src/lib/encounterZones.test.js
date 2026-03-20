import { describe, it, expect } from 'vitest'
import { checkEncounterProximity } from './encounterZones.js'

describe('checkEncounterProximity', () => {
  const zones = [
    { id: 'goblin_camp', center: { x: 20, y: 15 }, triggerRadius: 5, triggered: false },
    { id: 'bandit_lair', center: { x: 40, y: 30 }, triggerRadius: 3, triggered: false },
  ]

  it('returns zone when player within radius', () => {
    const result = checkEncounterProximity({ x: 22, y: 15 }, zones)
    expect(result).toBeTruthy()
    expect(result.id).toBe('goblin_camp')
  })

  it('returns null when player outside all radii', () => {
    const result = checkEncounterProximity({ x: 0, y: 0 }, zones)
    expect(result).toBeNull()
  })

  it('returns null for already-triggered zones', () => {
    const triggered = [{ ...zones[0], triggered: true }, zones[1]]
    const result = checkEncounterProximity({ x: 22, y: 15 }, triggered)
    expect(result).toBeNull()
  })

  it('uses Euclidean distance', () => {
    const result = checkEncounterProximity({ x: 25, y: 15 }, zones)
    expect(result).toBeTruthy()
    const outside = checkEncounterProximity({ x: 26, y: 15 }, zones)
    expect(outside).toBeNull()
  })
})
