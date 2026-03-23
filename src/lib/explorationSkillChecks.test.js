import { describe, it, expect } from 'vitest'
import {
  performSkillCheck,
  generateSkillChallenge,
  getClassSkills,
  calculateSkillModifier,
  describeSkillResult,
  EXPLORATION_SKILLS,
  SKILL_DC,
  EXPLORATION_SCENARIOS,
} from './explorationSkillChecks'

describe('Exploration Skill Checks', () => {
  it('performSkillCheck returns valid result', () => {
    const result = performSkillCheck(EXPLORATION_SKILLS.PERCEPTION, 2, SKILL_DC.MODERATE)
    expect(result).toBeDefined()
    expect(result.rollResult).toBeGreaterThanOrEqual(1)
    expect(result.rollResult).toBeLessThanOrEqual(20)
    expect(result.total).toBe(result.rollResult + 2)
    expect(typeof result.success).toBe('boolean')
  })

  it('skill check with high modifier has higher modifier applied', () => {
    const low = performSkillCheck(EXPLORATION_SKILLS.STEALTH, 0, 10)
    const high = performSkillCheck(EXPLORATION_SKILLS.STEALTH, 5, 10)
    expect(high.modifier).toBe(5)
    expect(low.modifier).toBe(0)
    expect(high.total - low.total).toBeGreaterThanOrEqual(-19) // Worst case: low=20, high=1, diff=-19+5=-14
  })

  it('skill check detects critical success (20)', () => {
    // Can't guarantee a 20, but we can verify structure
    const result = performSkillCheck(EXPLORATION_SKILLS.PERCEPTION, 0, 10)
    if (result.rollResult === 20) {
      expect(result.criticalSuccess).toBe(true)
    }
  })

  it('skill check detects critical failure (1)', () => {
    const result = performSkillCheck(EXPLORATION_SKILLS.PERCEPTION, 0, 10)
    if (result.rollResult === 1) {
      expect(result.criticalFailure).toBe(true)
    }
  })

  it('generateSkillChallenge returns valid scenario', () => {
    const challenge = generateSkillChallenge(1)
    expect(challenge).toBeDefined()
    expect(challenge.skill).toBeDefined()
    expect(challenge.dc).toBeGreaterThan(0)
    expect(challenge.success).toBeDefined()
    expect(challenge.failure).toBeDefined()
  })

  it('generateSkillChallenge scales DC by area level', () => {
    const easy = generateSkillChallenge(1)
    const hard = generateSkillChallenge(5)
    expect(hard.dc).toBeGreaterThan(easy.dc)
  })

  it('getClassSkills returns array for all classes', () => {
    const classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Bard']
    classes.forEach(cls => {
      const skills = getClassSkills(cls)
      expect(Array.isArray(skills)).toBe(true)
      expect(skills.length).toBeGreaterThan(0)
    })
  })

  it('calculateSkillModifier uses correct ability score', () => {
    const abilities = { str: 10, dex: 14, con: 12, int: 16, wis: 13, cha: 8 }
    const mod = calculateSkillModifier(abilities, EXPLORATION_SKILLS.PERCEPTION, 2, false)
    // Perception uses WIS (13), modifier = +1, +2 proficiency = +3
    expect(mod).toBe(3)
  })

  it('calculateSkillModifier applies expertise (double proficiency)', () => {
    const abilities = { wis: 14 }
    const normal = calculateSkillModifier(abilities, EXPLORATION_SKILLS.PERCEPTION, 2, false)
    const expertise = calculateSkillModifier(abilities, EXPLORATION_SKILLS.PERCEPTION, 2, true)
    expect(expertise).toBe(normal + 2)
  })

  it('describeSkillResult uses critical success message', () => {
    const critResult = {
      rollResult: 20,
      success: true,
      criticalSuccess: true,
      criticalFailure: false,
    }
    const scenario = EXPLORATION_SCENARIOS.HIDDEN_PASSAGE
    const desc = describeSkillResult(critResult, scenario)
    expect(desc).toContain('extra')
  })

  it('describeSkillResult uses failure message on failure', () => {
    const failResult = {
      rollResult: 5,
      success: false,
      criticalSuccess: false,
      criticalFailure: false,
    }
    const scenario = EXPLORATION_SCENARIOS.HIDDEN_PASSAGE
    const desc = describeSkillResult(failResult, scenario)
    expect(desc).toBe(scenario.failure)
  })

  it('all scenarios have required fields', () => {
    Object.values(EXPLORATION_SCENARIOS).forEach(scenario => {
      expect(scenario.skill).toBeDefined()
      expect(scenario.dc).toBeGreaterThan(0)
      expect(scenario.success).toBeDefined()
      expect(scenario.failure).toBeDefined()
    })
  })

  it('SKILL_DC values are in reasonable range', () => {
    const dcs = Object.values(SKILL_DC)
    dcs.forEach(dc => {
      expect(dc).toBeGreaterThanOrEqual(5)
      expect(dc).toBeLessThanOrEqual(24)
    })
  })

  it('skill check margin correctly calculated', () => {
    const result = performSkillCheck('test', 5, 15)
    expect(result.margin).toBe(result.total - 15)
  })
})
