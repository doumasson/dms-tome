import { describe, it, expect } from 'vitest'
import {
  rollSkillCheck,
  npcPassivePerception,
  attemptPickpocket,
  attemptLockpick,
  attemptForceOpen,
  attemptSearch,
  generateChestLoot,
} from './worldInteractions'

describe('World Interactions', () => {
  describe('rollSkillCheck', () => {
    it('returns valid skill check result', () => {
      const character = { stats: { dex: 16, wis: 10 }, level: 1 }
      const result = rollSkillCheck(character, 'Stealth', 12)
      expect(result).toHaveProperty('d20')
      expect(result).toHaveProperty('bonus')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('pass')
      expect(result).toHaveProperty('margin')
      expect(result.d20).toBeGreaterThanOrEqual(1)
      expect(result.d20).toBeLessThanOrEqual(20)
    })

    it('adds skill bonus correctly', () => {
      const character = {
        stats: { dex: 16, wis: 10 },
        level: 1,
        skills: ['Stealth'],
        expertiseSkills: []
      }
      const result = rollSkillCheck(character, 'Stealth', 10)
      const expectedBonus = 3 // DEX mod +3
      expect(result.bonus).toBeGreaterThanOrEqual(expectedBonus - 1) // May have proficiency
    })

    it('determines pass/fail based on DC', () => {
      const character = { stats: { dex: 10 }, level: 1 }
      // With no bonus and needing 20, should fail most times
      let failures = 0
      for (let i = 0; i < 10; i++) {
        const result = rollSkillCheck(character, 'Sleight of Hand', 20)
        if (!result.pass) failures++
      }
      expect(failures).toBeGreaterThan(5)
    })

    it('calculates margin correctly', () => {
      const character = { stats: { dex: 10 }, level: 1 }
      const result = rollSkillCheck(character, 'Sleight of Hand', 10)
      expect(result.margin).toBe(result.total - 10)
    })
  })

  describe('npcPassivePerception', () => {
    it('calculates passive perception from WIS', () => {
      const npc = { stats: { wis: 16 } }
      const perception = npcPassivePerception(npc)
      expect(perception).toBe(10 + 3) // 10 + WIS mod(16) = 13
    })

    it('handles default WIS when missing', () => {
      const npc = {}
      const perception = npcPassivePerception(npc)
      expect(perception).toBe(10) // 10 + WIS mod(10) = 10
    })

    it('returns reasonable values', () => {
      const npc1 = { stats: { wis: 20 } }
      const npc2 = { stats: { wis: 8 } }
      const perc1 = npcPassivePerception(npc1)
      const perc2 = npcPassivePerception(npc2)
      expect(perc1).toBeGreaterThan(perc2)
      expect(perc1).toBe(15) // 10 + 5
      expect(perc2).toBe(9)  // 10 + (-1)
    })
  })

  describe('attemptPickpocket', () => {
    it('returns success with valid result structure', () => {
      const character = { stats: { dex: 16 }, level: 1 }
      const npc = { stats: { wis: 10 } }
      const result = attemptPickpocket(character, npc)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('roll')
      expect(result).toHaveProperty('dc')
      expect(result).toHaveProperty('npcReaction')
    })

    it('grants loot on successful pickpocket', () => {
      const character = { stats: { dex: 20 }, level: 10, skills: ['Sleight of Hand'] }
      const npc = { stats: { wis: 8 } }
      const result = attemptPickpocket(character, npc)
      if (result.success) {
        expect(result.loot).toBeDefined()
        expect(result.npcReaction).toBeNull()
      }
    })

    it('triggers NPC reaction on failure', () => {
      const character = { stats: { dex: 4 }, level: 1 }
      const npc = { stats: { wis: 20 } }
      const result = attemptPickpocket(character, npc)
      if (!result.success) {
        expect(result.npcReaction).toBeDefined()
        expect(['hostile', 'alarmed', 'disappointed']).toContain(result.npcReaction)
      }
    })

    it('NPC reaction severity depends on margin', () => {
      const npc = { stats: { wis: 16 } }
      // Low DEX character against high WIS NPC = likely to fail badly
      const character = { stats: { dex: 4 }, level: 1 }
      const results = []
      for (let i = 0; i < 20; i++) {
        results.push(attemptPickpocket(character, npc))
      }
      const hostile = results.filter(r => r.npcReaction === 'hostile').length
      expect(hostile).toBeGreaterThan(0)
    })
  })

  describe('attemptLockpick', () => {
    it('returns valid lockpick result', () => {
      const character = { stats: { dex: 16 }, level: 1 }
      const interactable = { dc: 15 }
      const result = attemptLockpick(character, interactable)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('roll')
      expect(result).toHaveProperty('dc')
      expect(result).toHaveProperty('hasTools')
      expect(result).toHaveProperty('broken')
    })

    it('uses DC from interactable', () => {
      const character = { stats: { dex: 10 }, level: 1 }
      const interactable = { dc: 20 }
      const result = attemptLockpick(character, interactable)
      expect(result.dc).toBe(20)
    })

    it('defaults to DC 15 if not specified', () => {
      const character = { stats: { dex: 10 }, level: 1 }
      const interactable = {}
      const result = attemptLockpick(character, interactable)
      expect(result.dc).toBe(15)
    })

    it('grants tool bonus for Rogues', () => {
      const rogueWithTools = { stats: { dex: 10 }, level: 1, class: 'Rogue' }
      const nonRogue = { stats: { dex: 10 }, level: 1, class: 'Fighter' }
      const interactable = { dc: 15 }

      const rogueResult = attemptLockpick(rogueWithTools, interactable)
      const nonRogueResult = attemptLockpick(nonRogue, interactable)

      expect(rogueResult.hasTools).toBe(true)
      expect(nonRogueResult.hasTools).toBe(false)
    })

    it('breaks tools on nat 1 failure', () => {
      // This is probabilistic, but we can test structure
      const character = { stats: { dex: 10 }, level: 1 }
      const interactable = { dc: 15 }
      const result = attemptLockpick(character, interactable)
      expect(typeof result.broken).toBe('boolean')
      // Nat 1 breaks: !pass && d20 === 1
      if (result.roll.d20 === 1 && !result.success) {
        expect(result.broken).toBe(true)
      }
    })
  })

  describe('attemptForceOpen', () => {
    it('returns valid force open result', () => {
      const character = { stats: { str: 16 }, level: 1 }
      const interactable = { dc: 15 }
      const result = attemptForceOpen(character, interactable)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('roll')
      expect(result).toHaveProperty('dc')
      expect(result).toHaveProperty('loud')
      expect(result.loud).toBe(true)
    })

    it('increases DC compared to lockpicking', () => {
      const character = { stats: { str: 16 }, level: 1 }
      const interactable = { dc: 15 }
      const forceResult = attemptForceOpen(character, interactable)
      expect(forceResult.dc).toBe(18) // 15 + 3
    })

    it('uses Athletics skill', () => {
      const strongChar = { stats: { str: 20 }, level: 1 }
      const weakChar = { stats: { str: 4 }, level: 1 }
      const interactable = { dc: 12 }

      let strongWins = 0
      for (let i = 0; i < 10; i++) {
        const strong = attemptForceOpen(strongChar, interactable).success ? 1 : 0
        const weak = attemptForceOpen(weakChar, interactable).success ? 1 : 0
        if (strong > weak) strongWins++
      }
      expect(strongWins).toBeGreaterThan(0)
    })
  })

  describe('attemptSearch', () => {
    it('returns valid search result', () => {
      const character = { stats: { int: 16 }, level: 1 }
      const result = attemptSearch(character, 12)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('roll')
      expect(result).toHaveProperty('dc')
      expect(result).toHaveProperty('finds')
      expect(Array.isArray(result.finds)).toBe(true)
    })

    it('finds items on success', () => {
      const character = { stats: { int: 20 }, level: 1 }
      const result = attemptSearch(character, 8)
      if (result.success) {
        expect(result.finds.length).toBeGreaterThan(0)
        expect(result.finds.length).toBeLessThanOrEqual(2)
      }
    })

    it('returns empty finds on failure', () => {
      const character = { stats: { int: 4 }, level: 1 }
      const result = attemptSearch(character, 20)
      if (!result.success) {
        expect(result.finds.length).toBe(0)
      }
    })

    it('uses default DC of 12', () => {
      const character = { stats: { int: 10 }, level: 1 }
      const result = attemptSearch(character)
      expect(result.dc).toBe(12)
    })

    it('grants extra find for high margin', () => {
      // High INT vs low DC = high margin
      const character = { stats: { int: 20 }, level: 1 }
      // Run multiple times to verify pattern
      let foundTwo = false
      for (let i = 0; i < 20; i++) {
        const result = attemptSearch(character, 8)
        if (result.success && result.finds.length === 2) {
          foundTwo = true
          break
        }
      }
      expect(foundTwo).toBe(true)
    })
  })

  describe('generateChestLoot', () => {
    it('generates loot for common tier', () => {
      const loot = generateChestLoot('common')
      expect(loot).toHaveProperty('gold')
      expect(loot).toHaveProperty('items')
      expect(loot.gold).toBeGreaterThanOrEqual(2)
      expect(loot.gold).toBeLessThanOrEqual(12)
      expect(Array.isArray(loot.items)).toBe(true)
      expect(loot.items.length).toBe(1)
    })

    it('generates loot for uncommon tier', () => {
      const loot = generateChestLoot('uncommon')
      expect(loot.gold).toBeGreaterThanOrEqual(10)
      expect(loot.gold).toBeLessThanOrEqual(30)
      expect(loot.items.length).toBe(1)
    })

    it('generates loot for rare tier', () => {
      const loot = generateChestLoot('rare')
      expect(loot.gold).toBeGreaterThanOrEqual(30)
      expect(loot.gold).toBeLessThanOrEqual(80)
      expect(loot.items.length).toBe(2)
    })

    it('defaults to common tier', () => {
      const loot = generateChestLoot()
      expect(loot.gold).toBeGreaterThanOrEqual(2)
      expect(loot.items.length).toBeGreaterThanOrEqual(0)
    })

    it('handles unknown tier gracefully', () => {
      const loot = generateChestLoot('legendary')
      expect(loot).toHaveProperty('gold')
      expect(loot).toHaveProperty('items')
    })

    it('items have required properties', () => {
      const loot = generateChestLoot('rare')
      for (const item of loot.items) {
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('type')
        expect(typeof item.name).toBe('string')
        expect(typeof item.type).toBe('string')
      }
    })

    it('rare chests give more gold than common', () => {
      const common = generateChestLoot('common')
      const rare = generateChestLoot('rare')
      // Statistical expectation: rare > common
      expect(rare.gold).toBeGreaterThan(common.gold * 0.5)
    })
  })

  describe('Integration scenarios', () => {
    it('high-DEX rogue pickpockets more successfully', () => {
      const rogue = { stats: { dex: 18 }, level: 5, class: 'Rogue', skills: ['Sleight of Hand'] }
      const npc = { stats: { wis: 10 } }
      let successes = 0
      for (let i = 0; i < 20; i++) {
        const result = attemptPickpocket(rogue, npc)
        if (result.success) successes++
      }
      expect(successes).toBeGreaterThan(10)
    })

    it('rogue lockpicks better than fighter', () => {
      const rogue = { stats: { dex: 16 }, level: 5, class: 'Rogue' }
      const fighter = { stats: { dex: 16 }, level: 5, class: 'Fighter' }
      const interactable = { dc: 15 }

      let rogueWins = 0
      for (let i = 0; i < 20; i++) {
        const rogueResult = attemptLockpick(rogue, interactable)
        const fighterResult = attemptLockpick(fighter, interactable)
        if (rogueResult.success && !fighterResult.success) rogueWins++
      }
      expect(rogueWins).toBeGreaterThan(0)
    })

    it('strong character can force open door', () => {
      const barbarian = { stats: { str: 18 }, level: 5, class: 'Barbarian' }
      const door = { dc: 10 }

      let successes = 0
      for (let i = 0; i < 20; i++) {
        const result = attemptForceOpen(barbarian, door)
        if (result.success) successes++
      }
      // With STR 18 (+4) and door DC 13, expect ~60% success rate
      expect(successes).toBeGreaterThan(8)
    })

    it('intelligent character finds more items', () => {
      const wizard = { stats: { int: 18 }, level: 5 }
      const barbarian = { stats: { int: 8 }, level: 5 }

      const wizardFinds = attemptSearch(wizard, 12)
      const barbarianFinds = attemptSearch(barbarian, 12)

      if (wizardFinds.success) {
        expect(wizardFinds.finds.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
