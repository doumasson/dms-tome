import { describe, it, expect, beforeEach } from 'vitest'
import {
  createFaction,
  initializeFactionReputation,
  getDisposition,
  adjustReputation,
  getDialogueContext,
  willNpcInteract,
  buildFactionContext,
  getQuestRewardModifier,
} from './factionSystem'

describe('Faction System', () => {
  describe('createFaction()', () => {
    it('creates faction with all properties', () => {
      const faction = createFaction('Shadow Guild', 'Thieves organization', 'Chaotic Neutral')

      expect(faction.name).toBe('Shadow Guild')
      expect(faction.description).toBe('Thieves organization')
      expect(faction.alignment).toBe('Chaotic Neutral')
      expect(faction.id).toBe('shadow-guild')
      expect(faction.createdAt).toBeDefined()
      expect(typeof faction.createdAt).toBe('number')
    })

    it('generates ID from name with lowercase and dash separation', () => {
      const faction = createFaction('The Shadow Guild')
      expect(faction.id).toBe('the-shadow-guild')

      const faction2 = createFaction('Order OF the Silver Dragon')
      expect(faction2.id).toBe('order-of-the-silver-dragon')
    })

    it('handles multiple spaces in name', () => {
      const faction = createFaction('The  Silver   Knights')
      expect(faction.id).toBe('the-silver-knights')
    })

    it('allows empty description and alignment defaults', () => {
      const faction = createFaction('Guards')

      expect(faction.name).toBe('Guards')
      expect(faction.description).toBe('')
      expect(faction.alignment).toBe('Neutral')
    })

    it('creates different instances with different IDs', () => {
      const f1 = createFaction('Faction 1')
      const f2 = createFaction('Faction 2')

      expect(f1.id).not.toBe(f2.id)
      expect(f1.createdAt).toBeLessThanOrEqual(f2.createdAt)
    })
  })

  describe('initializeFactionReputation()', () => {
    it('creates reputation map with all factions at 0', () => {
      const factions = [
        createFaction('Guards'),
        createFaction('Thieves'),
        createFaction('Mages'),
      ]

      const reputation = initializeFactionReputation(factions)

      expect(reputation['guards']).toBe(0)
      expect(reputation['thieves']).toBe(0)
      expect(reputation['mages']).toBe(0)
    })

    it('handles empty faction array', () => {
      const reputation = initializeFactionReputation([])

      expect(Object.keys(reputation).length).toBe(0)
    })

    it('handles undefined faction array', () => {
      const reputation = initializeFactionReputation()

      expect(Object.keys(reputation).length).toBe(0)
    })

    it('initializes only provided factions', () => {
      const factions = [createFaction('A'), createFaction('B')]
      const reputation = initializeFactionReputation(factions)

      expect(Object.keys(reputation).length).toBe(2)
      expect(reputation['a']).toBe(0)
      expect(reputation['b']).toBe(0)
    })
  })

  describe('getDisposition()', () => {
    it('returns Hostile at -75 or lower', () => {
      expect(getDisposition(-100)).toBe('Hostile')
      expect(getDisposition(-75)).toBe('Hostile')
      expect(getDisposition(-80)).toBe('Hostile')
    })

    it('returns Unfriendly between -75 and -25', () => {
      expect(getDisposition(-74)).toBe('Unfriendly')
      expect(getDisposition(-50)).toBe('Unfriendly')
      expect(getDisposition(-26)).toBe('Unfriendly')
    })

    it('returns Neutral between -24 and 25', () => {
      expect(getDisposition(-24)).toBe('Neutral')
      expect(getDisposition(0)).toBe('Neutral')
      expect(getDisposition(25)).toBe('Neutral')
    })

    it('returns Friendly between 25 and 75', () => {
      expect(getDisposition(26)).toBe('Friendly')
      expect(getDisposition(50)).toBe('Friendly')
      expect(getDisposition(75)).toBe('Friendly')
    })

    it('returns Revered at 76 or higher', () => {
      expect(getDisposition(76)).toBe('Revered')
      expect(getDisposition(100)).toBe('Revered')
      expect(getDisposition(99)).toBe('Revered')
    })

    it('handles boundary values correctly', () => {
      expect(getDisposition(-26)).toBe('Unfriendly')
      expect(getDisposition(-25)).toBe('Unfriendly')
      expect(getDisposition(-24)).toBe('Neutral')
      expect(getDisposition(25)).toBe('Neutral')
      expect(getDisposition(26)).toBe('Friendly')
      expect(getDisposition(75)).toBe('Friendly')
      expect(getDisposition(76)).toBe('Revered')
    })
  })

  describe('adjustReputation()', () => {
    it('increases reputation', () => {
      const reputation = { 'faction-id': 0 }
      const updated = adjustReputation(reputation, 'faction-id', 10)

      expect(updated['faction-id']).toBe(10)
    })

    it('decreases reputation', () => {
      const reputation = { 'faction-id': 50 }
      const updated = adjustReputation(reputation, 'faction-id', -30)

      expect(updated['faction-id']).toBe(20)
    })

    it('clamps at +100', () => {
      const reputation = { 'faction-id': 90 }
      const updated = adjustReputation(reputation, 'faction-id', 20)

      expect(updated['faction-id']).toBe(100)
    })

    it('clamps at -100', () => {
      const reputation = { 'faction-id': -90 }
      const updated = adjustReputation(reputation, 'faction-id', -20)

      expect(updated['faction-id']).toBe(-100)
    })

    it('handles zero delta', () => {
      const reputation = { 'faction-id': 50 }
      const updated = adjustReputation(reputation, 'faction-id', 0)

      expect(updated['faction-id']).toBe(50)
    })

    it('adds new faction to reputation map', () => {
      const reputation = { 'faction-1': 0 }
      const updated = adjustReputation(reputation, 'faction-2', 10)

      expect(updated['faction-1']).toBe(0)
      expect(updated['faction-2']).toBe(10)
    })

    it('does not mutate original reputation object', () => {
      const reputation = { 'faction-id': 0 }
      const updated = adjustReputation(reputation, 'faction-id', 10)

      expect(reputation['faction-id']).toBe(0)
      expect(updated['faction-id']).toBe(10)
    })

    it('handles missing faction (defaults to 0)', () => {
      const reputation = {}
      const updated = adjustReputation(reputation, 'new-faction', 25)

      expect(updated['new-faction']).toBe(25)
    })

    it('handles large positive delta', () => {
      const reputation = { 'faction-id': 80 }
      const updated = adjustReputation(reputation, 'faction-id', 50)

      expect(updated['faction-id']).toBe(100)
    })

    it('handles large negative delta', () => {
      const reputation = { 'faction-id': -80 }
      const updated = adjustReputation(reputation, 'faction-id', -50)

      expect(updated['faction-id']).toBe(-100)
    })
  })

  describe('getDialogueContext()', () => {
    it('returns context for Hostile disposition', () => {
      const context = getDialogueContext(-100)

      expect(context.disposition).toBe('Hostile')
      expect(context.greeting).toBe('Get out of here!')
      expect(context.modifier).toContain('Refuses service')
      expect(context.modifier).toContain('May attack')
    })

    it('returns context for Unfriendly disposition', () => {
      const context = getDialogueContext(-50)

      expect(context.disposition).toBe('Unfriendly')
      expect(context.greeting).toBe('What do you want?')
      expect(context.modifier).toContain('Reluctant')
      expect(context.modifier).toContain('Higher prices')
    })

    it('returns context for Neutral disposition', () => {
      const context = getDialogueContext(0)

      expect(context.disposition).toBe('Neutral')
      expect(context.greeting).toBe('How can I help you?')
      expect(context.modifier).toContain('Standard service')
      expect(context.modifier).toContain('Normal prices')
    })

    it('returns context for Friendly disposition', () => {
      const context = getDialogueContext(50)

      expect(context.disposition).toBe('Friendly')
      expect(context.greeting).toBe('Welcome, friend!')
      expect(context.modifier).toContain('Eager to help')
      expect(context.modifier).toContain('10% off')
    })

    it('returns context for Revered disposition', () => {
      const context = getDialogueContext(100)

      expect(context.disposition).toBe('Revered')
      expect(context.greeting).toMatch(/honor|meet you/)
      expect(context.modifier).toContain('out of their way')
      expect(context.modifier).toContain('25% off')
      expect(context.modifier).toContain('favors')
    })

    it('all contexts have required properties', () => {
      const reputations = [-100, -50, 0, 50, 100]

      reputations.forEach(rep => {
        const context = getDialogueContext(rep)
        expect(context).toHaveProperty('disposition')
        expect(context).toHaveProperty('greeting')
        expect(context).toHaveProperty('modifier')
        expect(typeof context.disposition).toBe('string')
        expect(typeof context.greeting).toBe('string')
        expect(typeof context.modifier).toBe('string')
      })
    })
  })

  describe('willNpcInteract()', () => {
    it('always returns true', () => {
      expect(willNpcInteract(-100)).toBe(true)
      expect(willNpcInteract(-50)).toBe(true)
      expect(willNpcInteract(0)).toBe(true)
      expect(willNpcInteract(50)).toBe(true)
      expect(willNpcInteract(100)).toBe(true)
    })

    it('returns true even at extreme reputation', () => {
      expect(willNpcInteract(-999)).toBe(true)
      expect(willNpcInteract(999)).toBe(true)
    })
  })

  describe('buildFactionContext()', () => {
    it('includes NPC name', () => {
      const context = buildFactionContext('Aldric', 'Guards', 50)

      expect(context).toContain('Aldric')
    })

    it('includes faction name', () => {
      const context = buildFactionContext('Aldric', 'Shadow Guild', 0)

      expect(context).toContain('Shadow Guild')
    })

    it('includes disposition', () => {
      const context = buildFactionContext('NPC', 'Faction', 100)

      expect(context).toContain('Revered')
    })

    it('includes reputation value', () => {
      const context = buildFactionContext('NPC', 'Faction', 75)

      expect(context).toContain('75')
    })

    it('includes greeting suggestion', () => {
      const context = buildFactionContext('NPC', 'Faction', 100)

      expect(context).toContain('honor')
    })

    it('includes modifier text', () => {
      const context = buildFactionContext('NPC', 'Faction', -100)

      expect(context).toContain('Refuses service')
    })

    it('generates prompt for all reputation levels', () => {
      const reputations = [-100, -50, 0, 50, 100]

      reputations.forEach(rep => {
        const context = buildFactionContext('Nyx', 'Thieves', rep)
        expect(typeof context).toBe('string')
        expect(context.length).toBeGreaterThan(50)
        expect(context).toContain('Nyx')
        expect(context).toContain('Thieves')
      })
    })

    it('returns multiline string with formatting', () => {
      const context = buildFactionContext('Test', 'Faction', 0)

      expect(context).toMatch(/\n/)
      expect(context).toMatch(/\-\s/)
    })
  })

  describe('getQuestRewardModifier()', () => {
    it('returns zero multipliers for Hostile reputation', () => {
      const modifier = getQuestRewardModifier(-100)

      expect(modifier.goldMultiplier).toBe(0)
      expect(modifier.xpMultiplier).toBe(0.5)
      expect(modifier.additionalText).toContain('refuses full payment')
    })

    it('returns reduced multipliers for Unfriendly reputation', () => {
      const modifier = getQuestRewardModifier(-50)

      expect(modifier.goldMultiplier).toBe(0.75)
      expect(modifier.xpMultiplier).toBe(0.75)
      expect(modifier.additionalText).toContain('reluctantly')
    })

    it('returns standard multipliers for Neutral reputation', () => {
      const modifier = getQuestRewardModifier(0)

      expect(modifier.goldMultiplier).toBe(1)
      expect(modifier.xpMultiplier).toBe(1)
      expect(modifier.additionalText).toBe('')
    })

    it('returns boosted multipliers for Friendly reputation', () => {
      const modifier = getQuestRewardModifier(50)

      expect(modifier.goldMultiplier).toBe(1.25)
      expect(modifier.xpMultiplier).toBe(1.1)
      expect(modifier.additionalText).toContain('bonus')
    })

    it('returns highest multipliers for Revered reputation', () => {
      const modifier = getQuestRewardModifier(100)

      expect(modifier.goldMultiplier).toBe(1.5)
      expect(modifier.xpMultiplier).toBe(1.25)
      expect(modifier.additionalText).toContain('Revered')
    })

    it('all modifiers have required properties', () => {
      const reputations = [-100, -50, 0, 50, 100]

      reputations.forEach(rep => {
        const modifier = getQuestRewardModifier(rep)
        expect(modifier).toHaveProperty('goldMultiplier')
        expect(modifier).toHaveProperty('xpMultiplier')
        expect(modifier).toHaveProperty('additionalText')
        expect(typeof modifier.goldMultiplier).toBe('number')
        expect(typeof modifier.xpMultiplier).toBe('number')
        expect(typeof modifier.additionalText).toBe('string')
      })
    })

    it('handles boundary values correctly', () => {
      expect(getQuestRewardModifier(-75).goldMultiplier).toBe(0)
      expect(getQuestRewardModifier(-74).goldMultiplier).toBe(0.75)
      expect(getQuestRewardModifier(-25).goldMultiplier).toBe(0.75)
      expect(getQuestRewardModifier(-24).goldMultiplier).toBe(1)
      expect(getQuestRewardModifier(25).goldMultiplier).toBe(1)
      expect(getQuestRewardModifier(26).goldMultiplier).toBe(1.25)
      expect(getQuestRewardModifier(75).goldMultiplier).toBe(1.25)
      expect(getQuestRewardModifier(76).goldMultiplier).toBe(1.5)
    })

    it('multipliers are sensible for gameplay', () => {
      // Hostile should penalize
      expect(getQuestRewardModifier(-100).goldMultiplier).toBeLessThan(1)
      // Neutral should not multiply
      expect(getQuestRewardModifier(0).goldMultiplier).toBe(1)
      // Friendly should reward
      expect(getQuestRewardModifier(50).goldMultiplier).toBeGreaterThan(1)
      // Revered should reward most
      expect(getQuestRewardModifier(100).goldMultiplier).toBeGreaterThan(
        getQuestRewardModifier(50).goldMultiplier
      )
    })
  })

  describe('integration scenarios', () => {
    it('complete faction lifecycle', () => {
      // Create faction
      const faction = createFaction('Dwarven Miners', 'Mining cooperative', 'Lawful Good')
      expect(faction.id).toBe('dwarven-miners')

      // Initialize reputation
      const reputation = initializeFactionReputation([faction])
      expect(reputation['dwarven-miners']).toBe(0)
      expect(getDisposition(reputation['dwarven-miners'])).toBe('Neutral')

      // Improve reputation
      let updated = adjustReputation(reputation, 'dwarven-miners', 30)
      expect(getDisposition(updated['dwarven-miners'])).toBe('Friendly')

      // Get context for dialogue
      const context = getDialogueContext(updated['dwarven-miners'])
      expect(context.greeting).toContain('Welcome')

      // Get quest reward
      const reward = getQuestRewardModifier(updated['dwarven-miners'])
      expect(reward.goldMultiplier).toBeGreaterThan(1)
    })

    it('multiple factions with different reputations', () => {
      const factions = [
        createFaction('Guards'),
        createFaction('Thieves'),
        createFaction('Mages'),
      ]

      let reputation = initializeFactionReputation(factions)

      // Increase Guards reputation
      reputation = adjustReputation(reputation, 'guards', 50)
      expect(getDisposition(reputation['guards'])).toBe('Friendly')

      // Decrease Thieves reputation
      reputation = adjustReputation(reputation, 'thieves', -50)
      expect(getDisposition(reputation['thieves'])).toBe('Unfriendly')

      // Mages stay neutral
      expect(getDisposition(reputation['mages'])).toBe('Neutral')

      // Build context for each
      const guardContext = buildFactionContext('Guard Captain', 'Guards', reputation['guards'])
      const thiefContext = buildFactionContext('Rogue Leader', 'Thieves', reputation['thieves'])

      expect(guardContext).toContain('Friendly')
      expect(thiefContext).toContain('Unfriendly')
    })

    it('reputation scaling affects gameplay rewards', () => {
      const hostile = getQuestRewardModifier(-100)
      const neutral = getQuestRewardModifier(0)
      const revered = getQuestRewardModifier(100)

      // Hostile gets less
      expect(hostile.goldMultiplier).toBeLessThan(neutral.goldMultiplier)

      // Neutral is baseline
      expect(neutral.goldMultiplier).toBe(1)

      // Revered gets most
      expect(revered.goldMultiplier).toBeGreaterThan(neutral.goldMultiplier)
      expect(revered.goldMultiplier).toBeGreaterThan(hostile.goldMultiplier)
    })

    it('disposition affects NPC behavior', () => {
      const hostile = getDialogueContext(-100)
      const friendly = getDialogueContext(50)
      const revered = getDialogueContext(100)

      // Hostile NPCs reject
      expect(hostile.modifier).toContain('Refuses')

      // Friendly NPCs help
      expect(friendly.modifier).toContain('Eager')

      // Revered NPCs go extra
      expect(revered.modifier).toContain('out of their way')
      expect(revered.modifier).toContain('favors')
    })
  })

  describe('edge cases', () => {
    it('handles reputation exactly at boundaries', () => {
      expect(getDisposition(-75)).toBe('Hostile')
      expect(getDisposition(-26)).toBe('Unfriendly')
      expect(getDisposition(25)).toBe('Neutral')
      expect(getDisposition(75)).toBe('Friendly')
    })

    it('handles extreme reputation values', () => {
      const extreme = adjustReputation({ f: 50 }, 'f', -999)
      expect(extreme.f).toBe(-100)

      const extreme2 = adjustReputation({ f: 50 }, 'f', 999)
      expect(extreme2.f).toBe(100)
    })

    it('faction names with special formatting', () => {
      const faction = createFaction("The \"Silver\" Dragon's Guild")
      // ID should normalize special characters
      expect(faction.id).toBeDefined()
      expect(typeof faction.id).toBe('string')
    })

    it('empty faction name', () => {
      const faction = createFaction('')
      expect(faction.id).toBe('')
      expect(faction.name).toBe('')
    })

    it('disposition consistency across reputation scale', () => {
      // Check that disposition never changes within a tier
      // Hostile: <= -75
      expect(getDisposition(-100)).toBe('Hostile')
      expect(getDisposition(-75)).toBe('Hostile')

      // Unfriendly: -74 to -25
      for (let i = -74; i <= -25; i++) {
        expect(getDisposition(i)).toBe('Unfriendly')
      }

      // Neutral: -24 to 25
      for (let i = -24; i <= 25; i++) {
        expect(getDisposition(i)).toBe('Neutral')
      }

      // Friendly: 26 to 75
      for (let i = 26; i <= 75; i++) {
        expect(getDisposition(i)).toBe('Friendly')
      }

      // Revered: >= 76
      expect(getDisposition(76)).toBe('Revered')
      expect(getDisposition(100)).toBe('Revered')
    })
  })
})
