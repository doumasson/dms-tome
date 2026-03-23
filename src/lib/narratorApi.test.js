import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  askRulesQuestion,
  buildSystemPrompt,
  buildNpcSystemPrompt,
} from './narratorApi'

describe('Narrator API', () => {
  describe('buildSystemPrompt', () => {
    it('returns a non-empty string', () => {
      const campaign = { title: 'Test' }
      const party = [{ name: 'Hero', level: 5, class: 'Fighter', race: 'Human', currentHp: 20, maxHp: 30, ac: 15 }]
      const scene = { name: 'Room', theme: 'dungeon' }

      const prompt = buildSystemPrompt(campaign, party, scene, 0, null, [])

      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('includes Dungeon Master instructions', () => {
      const prompt = buildSystemPrompt({ title: 'Campaign' }, [], null, 0, null, [])
      expect(prompt).toContain('Dungeon Master')
    })

    it('includes party member information', () => {
      const party = [{ name: 'Aragorn', level: 5, class: 'Ranger', race: 'Human', currentHp: 20, maxHp: 30, ac: 15 }]
      const prompt = buildSystemPrompt({ title: 'Test' }, party, null, 0, null, [])

      expect(prompt).toContain('Aragorn')
      expect(prompt).toContain('Ranger')
    })

    it('includes scene context', () => {
      const scene = { name: 'Tavern', theme: 'town' }
      const prompt = buildSystemPrompt({ title: 'Test' }, [], scene, 0, null, [])

      expect(prompt).toContain('Tavern')
    })

    it('includes JSON response format', () => {
      const prompt = buildSystemPrompt({ title: 'Test' }, [], null, 0, null, [])
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('narrative')
    })

    it('includes roll request instructions', () => {
      const prompt = buildSystemPrompt({ title: 'Test' }, [], null, 0, null, [])
      expect(prompt).toContain('SKILL CHECK')
    })

    it('handles null scene', () => {
      const prompt = buildSystemPrompt({ title: 'Test' }, [], null, 0, null, [])
      expect(typeof prompt).toBe('string')
    })

    it('handles empty party', () => {
      const prompt = buildSystemPrompt({ title: 'Test' }, [], { name: 'Room' }, 0, null, [])
      expect(typeof prompt).toBe('string')
    })

    it('includes active quests if present', () => {
      const quests = [{ title: 'Dragon', status: 'active', objectives: [] }]
      const prompt = buildSystemPrompt({ title: 'Test' }, [], null, 0, null, quests)

      expect(prompt).toContain('Dragon')
    })
  })

  describe('buildNpcSystemPrompt', () => {
    it('returns a non-empty string', () => {
      const npc = { name: 'NPC', personality: 'friendly', role: 'merchant' }
      const campaign = { title: 'Campaign' }

      const prompt = buildNpcSystemPrompt(npc, campaign, new Map(), 0, false, {})

      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(50)
    })

    it('includes NPC name', () => {
      const npc = { name: 'Theron', personality: 'wise', role: 'elder' }
      const prompt = buildNpcSystemPrompt(npc, { title: 'Test' }, new Map(), 0, false, {})

      expect(prompt).toContain('Theron')
    })

    it('includes faction reputation context', () => {
      const npc = { name: 'NPC', personality: 'friendly', role: 'merchant', faction: 'guild' }
      const reputation = { 'guild': 50 }
      const prompt = buildNpcSystemPrompt(npc, { title: 'Test' }, new Map(), 0, false, reputation)

      expect(prompt).toContain('guild')
      expect(prompt).toContain('50')
    })

    it('marks critical conversations', () => {
      const npc = { name: 'NPC', personality: 'stern', role: 'guard' }
      const prompt = buildNpcSystemPrompt(npc, { title: 'Test' }, new Map(), 0, true, {})

      expect(typeof prompt).toBe('string')
    })

    it('handles high prompt count', () => {
      const npc = { name: 'NPC', personality: 'talkative', role: 'friend' }
      const prompt = buildNpcSystemPrompt(npc, { title: 'Test' }, new Map(), 15, false, {})

      expect(typeof prompt).toBe('string')
    })
  })

  describe('askRulesQuestion', () => {
    it('sends API request to Claude', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Grappling requires an Athletics check.' }] }),
      })
      global.fetch = fetchMock

      const answer = await askRulesQuestion('What is grappling?', null, 'key123')

      expect(fetchMock).toHaveBeenCalled()
      expect(answer).toContain('Grappling')
    })

    it('includes SRD context in system prompt', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Answer' }] }),
      })
      global.fetch = fetchMock

      await askRulesQuestion('Question?', 'Fireball: 8d6 fire damage', 'key')

      const call = fetchMock.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.system).toContain('Fireball')
    })

    it('throws on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Failed' } }),
      })

      await expect(askRulesQuestion('Q?', null, 'key')).rejects.toThrow()
    })

    it('trims whitespace from answer', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: '  Answer with spaces  ' }] }),
      })

      const answer = await askRulesQuestion('Q?', null, 'key')

      expect(answer).toBe('Answer with spaces')
    })

    it('sends correct headers to API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Answer' }] }),
      })
      global.fetch = fetchMock

      await askRulesQuestion('Question?', null, 'test-api-key')

      const call = fetchMock.mock.calls[0]
      const headers = call[1].headers
      expect(headers['x-api-key']).toBe('test-api-key')
      expect(headers['anthropic-version']).toBe('2023-06-01')
    })
  })

  describe('Prompt structure validation', () => {
    it('generates syntactically valid DM prompt', () => {
      const campaign = { title: 'Test Campaign' }
      const party = [{ name: 'Hero', level: 1, class: 'Fighter', race: 'Human', currentHp: 10, maxHp: 10, ac: 10 }]
      const scene = { name: 'Room', theme: 'dungeon' }

      const prompt = buildSystemPrompt(campaign, party, scene, 0, null, [])

      expect(prompt).toBeTruthy()
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('narrative')
    })

    it('generates valid NPC prompt structure', () => {
      const npc = { name: 'Merchant', personality: 'friendly' }
      const campaign = { title: 'Campaign' }

      const prompt = buildNpcSystemPrompt(npc, campaign, new Map(), 0, false, {})

      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
    })
  })
})
