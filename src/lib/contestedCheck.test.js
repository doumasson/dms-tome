import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveContestedCheck } from './contestedCheck.js'

describe('resolveContestedCheck', () => {
  let mathRandom

  beforeEach(() => {
    mathRandom = Math.random
  })
  afterEach(() => {
    Math.random = mathRandom
  })

  function mockRolls(...rolls) {
    let i = 0
    Math.random = () => (rolls[i++] - 1) / 20 // d20: (roll-1)/20 maps to the correct range
  }

  const strongFighter = {
    stats: { str: 18, dex: 10 }, level: 5,
    skills: ['Athletics'],
  }
  const nimbleRogue = {
    stats: { str: 8, dex: 18 }, level: 5,
    skills: ['Acrobatics'],
  }
  const weakGoblin = {
    stats: { str: 8, dex: 14 }, level: 1,
    skills: [],
  }

  it('attacker uses Athletics (STR + proficiency)', () => {
    mockRolls(10, 10)
    const result = resolveContestedCheck(strongFighter, weakGoblin)
    // STR 18 → +4 mod, level 5 → +3 prof = +7
    expect(result.attackerBonus).toBe(7)
    expect(result.attackerRoll).toBe(10)
    expect(result.attackerTotal).toBe(17)
  })

  it('defender picks Acrobatics when DEX bonus is higher', () => {
    mockRolls(10, 10)
    const result = resolveContestedCheck(strongFighter, nimbleRogue)
    expect(result.defenderSkill).toBe('Acrobatics')
    // DEX 18 → +4 mod, level 5 → +3 prof = +7
    expect(result.defenderBonus).toBe(7)
  })

  it('defender picks Athletics when STR bonus is higher', () => {
    const strongDefender = { stats: { str: 16, dex: 10 }, level: 3, skills: ['Athletics'] }
    mockRolls(10, 10)
    const result = resolveContestedCheck(strongFighter, strongDefender)
    expect(result.defenderSkill).toBe('Athletics')
    // STR 16 → +3, level 3 → +2 prof = +5
    expect(result.defenderBonus).toBe(5)
  })

  it('unproficient attacker has no proficiency bonus', () => {
    const noSkills = { stats: { str: 14, dex: 10 }, level: 5, skills: [] }
    mockRolls(10, 10)
    const result = resolveContestedCheck(noSkills, weakGoblin)
    // STR 14 → +2, no prof = +2
    expect(result.attackerBonus).toBe(2)
  })

  it('returns all expected fields', () => {
    mockRolls(15, 8)
    const result = resolveContestedCheck(strongFighter, weakGoblin)
    expect(result).toHaveProperty('attackerRoll')
    expect(result).toHaveProperty('attackerBonus')
    expect(result).toHaveProperty('attackerTotal')
    expect(result).toHaveProperty('defenderRoll')
    expect(result).toHaveProperty('defenderBonus')
    expect(result).toHaveProperty('defenderTotal')
    expect(result).toHaveProperty('defenderSkill')
  })

  it('handles missing stats gracefully (defaults to 10)', () => {
    mockRolls(10, 10)
    const noStats = { level: 1, skills: [] }
    const result = resolveContestedCheck(noStats, noStats)
    // 10 → +0 mod, no prof = +0
    expect(result.attackerBonus).toBe(0)
    expect(result.defenderBonus).toBe(0)
  })
})
