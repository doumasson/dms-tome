import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildNpcSystemPrompt } from './narratorApi.js'
import { rollSkillCheck } from './worldInteractions.js'

describe('Social Skill Checks', () => {
  describe('buildNpcSystemPrompt includes rollRequest schema', () => {
    const npc = { name: 'Barkeep', role: 'tavern owner', personality: 'gruff but fair' }
    const campaign = { title: 'Test Campaign' }
    const storyFlags = new Set()

    it('should include rollRequest in JSON output format', () => {
      const prompt = buildNpcSystemPrompt(npc, campaign, storyFlags, 1, false)
      expect(prompt).toContain('"rollRequest"')
      expect(prompt).toContain('Persuasion')
      expect(prompt).toContain('Intimidation')
      expect(prompt).toContain('Deception')
      expect(prompt).toContain('Insight')
    })

    it('should instruct NPC to honor skill check results', () => {
      const prompt = buildNpcSystemPrompt(npc, campaign, storyFlags, 1, false)
      expect(prompt).toContain('SKILL CHECK RESULT')
      expect(prompt).toContain('MUST honor the result')
      expect(prompt).toContain('SUCCESS')
      expect(prompt).toContain('FAILURE')
    })

    it('should include DC guidance', () => {
      const prompt = buildNpcSystemPrompt(npc, campaign, storyFlags, 1, false)
      expect(prompt).toContain('DC 10')
      expect(prompt).toContain('DC 13')
      expect(prompt).toContain('DC 15')
      expect(prompt).toContain('DC 18')
    })

    it('should still include NPC personality and role', () => {
      const prompt = buildNpcSystemPrompt(npc, campaign, storyFlags, 1, false)
      expect(prompt).toContain('Barkeep')
      expect(prompt).toContain('tavern owner')
      expect(prompt).toContain('gruff but fair')
    })

    it('should include side quest when present', () => {
      const questNpc = { ...npc, sideQuest: 'Find the missing wine shipment' }
      const prompt = buildNpcSystemPrompt(questNpc, campaign, storyFlags, 1, false)
      expect(prompt).toContain('Find the missing wine shipment')
    })
  })

  describe('rollSkillCheck for social skills', () => {
    let mathRandom

    beforeEach(() => {
      mathRandom = Math.random
    })
    afterEach(() => {
      Math.random = mathRandom
    })

    const charismaCharacter = {
      stats: { str: 10, dex: 12, con: 14, int: 10, wis: 12, cha: 18 },
      level: 5,
      skills: ['Persuasion', 'Deception'],
      expertiseSkills: [],
    }

    const lowCharismaCharacter = {
      stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 8 },
      level: 3,
      skills: ['Athletics'],
      expertiseSkills: [],
    }

    it('should apply Persuasion proficiency for proficient character', () => {
      Math.random = () => 14 / 20 // d20 = 15
      const result = rollSkillCheck(charismaCharacter, 'Persuasion', 13)
      // CHA 18 = +4, proficient at level 5 = +3, d20=15, total=22
      expect(result.total).toBe(22)
      expect(result.pass).toBe(true)
      expect(result.bonus).toBe(7) // +4 CHA + 3 prof
    })

    it('should not apply proficiency for non-proficient character', () => {
      Math.random = () => 9 / 20 // d20 = 10
      const result = rollSkillCheck(lowCharismaCharacter, 'Persuasion', 13)
      // CHA 8 = -1, no prof, d20=10, total=9
      expect(result.total).toBe(9)
      expect(result.pass).toBe(false)
      expect(result.bonus).toBe(-1)
    })

    it('should handle Deception with proficiency', () => {
      Math.random = () => 11 / 20 // d20 = 12
      const result = rollSkillCheck(charismaCharacter, 'Deception', 15)
      // CHA 18 = +4, proficient at level 5 = +3, d20=12, total=19
      expect(result.total).toBe(19)
      expect(result.pass).toBe(true)
    })

    it('should handle Intimidation without proficiency', () => {
      Math.random = () => 7 / 20 // d20 = 8
      const result = rollSkillCheck(charismaCharacter, 'Intimidation', 15)
      // CHA 18 = +4, no prof for Intimidation, d20=8, total=12
      expect(result.total).toBe(12)
      expect(result.pass).toBe(false)
    })

    it('should handle Insight (WIS-based)', () => {
      Math.random = () => 14 / 20 // d20 = 15
      const result = rollSkillCheck(charismaCharacter, 'Insight', 12)
      // WIS 12 = +1, no prof, d20=15, total=16
      expect(result.total).toBe(16)
      expect(result.pass).toBe(true)
    })

    it('should handle expertise in Deception', () => {
      const expertChar = { ...charismaCharacter, expertiseSkills: ['Deception'] }
      Math.random = () => 4 / 20 // d20 = 5
      const result = rollSkillCheck(expertChar, 'Deception', 15)
      // CHA 18 = +4, expertise at level 5 = +6, d20=5, total=15
      expect(result.total).toBe(15)
      expect(result.pass).toBe(true) // exactly DC
    })

    it('should return margin for close calls', () => {
      Math.random = () => 9 / 20 // d20 = 10
      const result = rollSkillCheck(charismaCharacter, 'Persuasion', 18)
      // total = 10 + 7 = 17, DC 18, margin = -1
      expect(result.margin).toBe(-1)
      expect(result.pass).toBe(false)
    })
  })
})
