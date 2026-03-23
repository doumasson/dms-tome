import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAdjacentNpc,
  getAdjacentExit,
  resolveHint,
  getAdjacentInteractable,
  getAvailableInteractions,
  handleInteract,
} from './interactionController'

describe('Interaction Controller', () => {
  let playerPos
  let zone

  beforeEach(() => {
    playerPos = { x: 5, y: 5 }
    zone = {
      npcs: [],
      exits: [],
      interactables: [],
    }
  })

  describe('getAdjacentNpc()', () => {
    it('returns adjacent NPC', () => {
      zone.npcs = [{ name: 'Guard', position: { x: 6, y: 5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBe(zone.npcs[0])
    })

    it('detects NPC in all 8 adjacent tiles', () => {
      const adjacentPositions = [
        { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 },
        { x: 4, y: 5 },               { x: 6, y: 5 },
        { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      ]

      adjacentPositions.forEach(pos => {
        zone.npcs = [{ name: 'NPC', position: pos }]
        const npc = getAdjacentNpc(playerPos, zone)
        expect(npc).toBeDefined()
      })
    })

    it('does not detect NPC at player position', () => {
      zone.npcs = [{ name: 'Self', position: { x: 5, y: 5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeNull()
    })

    it('does not detect NPC beyond 1 tile distance', () => {
      zone.npcs = [{ name: 'Far', position: { x: 7, y: 5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeNull()
    })

    it('returns first adjacent NPC when multiple exist', () => {
      zone.npcs = [
        { name: 'NPC1', position: { x: 6, y: 5 } },
        { name: 'NPC2', position: { x: 5, y: 6 } },
      ]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc.name).toBe('NPC1')
    })

    it('handles NPCs without position', () => {
      zone.npcs = [{ name: 'NoPos' }, { name: 'HasPos', position: { x: 6, y: 5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc.name).toBe('HasPos')
    })

    it('returns null when no NPCs', () => {
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeNull()
    })

    it('returns null for null zone', () => {
      const npc = getAdjacentNpc(playerPos, null)
      expect(npc).toBeNull()
    })

    it('returns null for zone without npcs', () => {
      const npc = getAdjacentNpc(playerPos, {})
      expect(npc).toBeNull()
    })
  })

  describe('getAdjacentExit()', () => {
    it('returns adjacent exit', () => {
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBe(zone.exits[0])
    })

    it('handles exit width property', () => {
      zone.exits = [{ id: 'exit1', position: { x: 5, y: 6 }, width: 3 }]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBeDefined()
    })

    it('detects exit within 1 tile of any width part', () => {
      zone.exits = [
        {
          id: 'wide-exit',
          position: { x: 7, y: 5 },
          width: 4, // covers x: 7, 8, 9, 10
        },
      ]
      playerPos = { x: 8, y: 4 } // 1 tile away from x:8
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBeDefined()
    })

    it('handles exits without width (defaults to 1)', () => {
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 } }]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBeDefined()
    })

    it('returns null for far exits', () => {
      zone.exits = [{ id: 'exit1', position: { x: 10, y: 5 }, width: 1 }]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBeNull()
    })

    it('returns first adjacent exit when multiple exist', () => {
      zone.exits = [
        { id: 'exit1', position: { x: 6, y: 5 }, width: 1 },
        { id: 'exit2', position: { x: 5, y: 6 }, width: 1 },
      ]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit.id).toBe('exit1')
    })

    it('handles exits without position', () => {
      zone.exits = [
        { id: 'nopos' },
        { id: 'exit1', position: { x: 6, y: 5 }, width: 1 },
      ]
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit.id).toBe('exit1')
    })

    it('returns null when no exits', () => {
      const exit = getAdjacentExit(playerPos, zone)
      expect(exit).toBeNull()
    })

    it('returns null for null zone', () => {
      const exit = getAdjacentExit(playerPos, null)
      expect(exit).toBeNull()
    })
  })

  describe('resolveHint()', () => {
    it('returns personality when no hints', () => {
      const npc = { personality: 'Friendly wizard' }
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('Friendly wizard')
    })

    it('returns empty string when no personality and no hints', () => {
      const npc = {}
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('')
    })

    it('returns first hint when no after condition', () => {
      const npc = {
        hints: [
          { text: 'Welcome!', after: null },
          { text: 'Later message', after: 'some-flag' },
        ],
      }
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('Welcome!')
    })

    it('returns hint when story flag is set', () => {
      const npc = {
        hints: [
          { text: 'Initial', after: null },
          { text: 'After betrayal', after: 'betrayed' },
        ],
      }
      const hint = resolveHint(npc, new Set(['betrayed']))
      expect(hint).toBe('After betrayal')
    })

    it('returns latest matching hint by flag progression', () => {
      const npc = {
        hints: [
          { text: 'Start', after: null },
          { text: 'Act 2', after: 'act2-start' },
          { text: 'Act 3', after: 'act3-start' },
        ],
      }
      const flags = new Set(['act2-start', 'act3-start'])
      const hint = resolveHint(npc, flags)
      expect(hint).toBe('Act 3')
    })

    it('skips hints when flag not set', () => {
      const npc = {
        hints: [
          { text: 'Initial', after: null },
          { text: 'Secret', after: 'has-secret' },
        ],
      }
      const hint = resolveHint(npc, new Set(['other-flag']))
      expect(hint).toBe('Initial')
    })

    it('handles undefined after property', () => {
      const npc = {
        hints: [
          { text: 'Universal', after: undefined },
          { text: 'Conditional', after: 'flag' },
        ],
      }
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('Universal')
    })

    it('returns empty string from empty hints array', () => {
      const npc = { hints: [] }
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('')
    })
  })

  describe('getAdjacentInteractable()', () => {
    it('returns adjacent unopened interactable', () => {
      zone.interactables = [{ id: 'chest1', type: 'chest', position: { x: 6, y: 5 }, opened: false }]
      const obj = getAdjacentInteractable(playerPos, zone)
      expect(obj).toBe(zone.interactables[0])
    })

    it('ignores opened interactables', () => {
      zone.interactables = [
        { id: 'chest1', type: 'chest', position: { x: 6, y: 5 }, opened: true },
        { id: 'chest2', type: 'chest', position: { x: 5, y: 6 }, opened: false },
      ]
      const obj = getAdjacentInteractable(playerPos, zone)
      expect(obj.id).toBe('chest2')
    })

    it('detects interactable in all adjacent tiles', () => {
      const adjacentPositions = [
        { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 },
        { x: 4, y: 5 },               { x: 6, y: 5 },
        { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      ]

      adjacentPositions.forEach(pos => {
        zone.interactables = [{ type: 'chest', position: pos, opened: false }]
        const obj = getAdjacentInteractable(playerPos, zone)
        expect(obj).toBeDefined()
      })
    })

    it('does not detect interactable at player position', () => {
      zone.interactables = [{ type: 'chest', position: { x: 5, y: 5 }, opened: false }]
      const obj = getAdjacentInteractable(playerPos, zone)
      expect(obj).toBeNull()
    })

    it('does not detect far interactables', () => {
      zone.interactables = [{ type: 'chest', position: { x: 10, y: 5 }, opened: false }]
      const obj = getAdjacentInteractable(playerPos, zone)
      expect(obj).toBeNull()
    })

    it('returns null when no interactables', () => {
      const obj = getAdjacentInteractable(playerPos, zone)
      expect(obj).toBeNull()
    })

    it('returns null for null zone', () => {
      const obj = getAdjacentInteractable(playerPos, null)
      expect(obj).toBeNull()
    })
  })

  describe('getAvailableInteractions()', () => {
    it('returns talk option for NPC', () => {
      zone.npcs = [{ name: 'Merchant', position: { x: 6, y: 5 } }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'talk')).toBe(true)
    })

    it('returns pickpocket option for non-shop NPC', () => {
      zone.npcs = [{ name: 'Thief', position: { x: 6, y: 5 } }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'pickpocket')).toBe(true)
    })

    it('does not return pickpocket for shop NPC', () => {
      zone.npcs = [{ name: 'Merchant', position: { x: 6, y: 5 }, shopType: 'weapon' }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'pickpocket')).toBe(false)
      expect(interactions.some(i => i.type === 'talk')).toBe(true)
    })

    it('returns lockpick and force_open for locked chest', () => {
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, locked: true, opened: false }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'lockpick')).toBe(true)
      expect(interactions.some(i => i.type === 'force_open')).toBe(true)
    })

    it('returns open_chest for unlocked chest', () => {
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, locked: false, opened: false }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'open_chest')).toBe(true)
    })

    it('returns search for searchable interactable', () => {
      zone.interactables = [{ type: 'searchable', position: { x: 6, y: 5 }, opened: false }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'search')).toBe(true)
    })

    it('returns exit option for adjacent exit', () => {
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'exit')).toBe(true)
    })

    it('returns search_area when nothing nearby', () => {
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'search_area')).toBe(true)
    })

    it('does not return search_area when other interactions available', () => {
      zone.npcs = [{ name: 'NPC', position: { x: 6, y: 5 } }]
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'search_area')).toBe(false)
    })

    it('prioritizes interactions in order: NPC, interactable, exit', () => {
      zone.npcs = [{ name: 'NPC', position: { x: 6, y: 5 } }]
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, locked: false, opened: false }]
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]

      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions[0].type).toBe('talk') // NPC talk first
    })

    it('returns empty results for isolated player', () => {
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.length).toBe(1) // Only search_area
    })
  })

  describe('handleInteract()', () => {
    it('returns NPC type and target', () => {
      zone.npcs = [{ name: 'Guard', position: { x: 6, y: 5 } }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('npc')
      expect(result.target.name).toBe('Guard')
    })

    it('returns interactable type and target', () => {
      zone.interactables = [{ id: 'chest1', type: 'chest', position: { x: 6, y: 5 }, opened: false }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('interactable')
      expect(result.target.id).toBe('chest1')
    })

    it('returns exit type and target', () => {
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('exit')
      expect(result.target.id).toBe('exit1')
    })

    it('prioritizes NPC over interactable', () => {
      zone.npcs = [{ name: 'Guard', position: { x: 6, y: 5 } }]
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, opened: false }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('npc')
    })

    it('prioritizes interactable over exit', () => {
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, opened: false }]
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('interactable')
    })

    it('returns null when no interactions available', () => {
      const result = handleInteract(playerPos, zone)
      expect(result).toBeNull()
    })

    it('ignores opened interactables', () => {
      zone.interactables = [{ type: 'chest', position: { x: 6, y: 5 }, opened: true }]
      zone.exits = [{ id: 'exit1', position: { x: 6, y: 5 }, width: 1 }]
      const result = handleInteract(playerPos, zone)
      expect(result.type).toBe('exit')
    })
  })

  describe('integration scenarios', () => {
    it('crowded tavern interaction flow', () => {
      zone.npcs = [
        { name: 'Bartender', position: { x: 6, y: 5 }, shopType: 'food' },
        { name: 'Drunk', position: { x: 5, y: 6 } },
      ]
      zone.interactables = [
        { id: 'table1', type: 'searchable', position: { x: 4, y: 5 }, opened: false },
      ]
      zone.exits = [{ id: 'door', position: { x: 4, y: 6 }, width: 1 }]

      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.length).toBeGreaterThan(2)

      const primaryInteraction = handleInteract(playerPos, zone)
      expect(primaryInteraction).toBeDefined()
      expect(primaryInteraction.target.name).toBe('Bartender')
    })

    it('dungeon chest scenario', () => {
      zone.interactables = [
        { id: 'trap-chest', type: 'chest', position: { x: 6, y: 5 }, locked: true, opened: false, trapped: true },
      ]
      zone.exits = [{ id: 'stairs-down', position: { x: 5, y: 6 }, width: 1 }]

      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.some(i => i.type === 'lockpick')).toBe(true)
      expect(interactions.some(i => i.type === 'exit')).toBe(true)
    })

    it('empty corridor search', () => {
      const interactions = getAvailableInteractions(playerPos, zone)
      expect(interactions.length).toBe(1)
      expect(interactions[0].type).toBe('search_area')
    })
  })

  describe('edge cases', () => {
    it('handles multiple NPCs at same distance', () => {
      zone.npcs = [
        { name: 'NPC1', position: { x: 6, y: 5 } },
        { name: 'NPC2', position: { x: 4, y: 5 } },
      ]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeDefined()
    })

    it('handles very large zone with many NPCs', () => {
      zone.npcs = Array(100).fill(null).map((_, i) => ({
        name: `NPC${i}`,
        position: { x: 100 + i, y: 100 + i },
      }))
      zone.npcs.push({ name: 'Adjacent', position: { x: 6, y: 5 } })

      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc.name).toBe('Adjacent')
    })

    it('handles negative coordinates', () => {
      playerPos = { x: -5, y: -5 }
      zone.npcs = [{ name: 'NPC', position: { x: -4, y: -5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeDefined()
    })

    it('handles floating point coordinates', () => {
      playerPos = { x: 5.5, y: 5.5 }
      zone.npcs = [{ name: 'NPC', position: { x: 6.5, y: 5.5 } }]
      const npc = getAdjacentNpc(playerPos, zone)
      expect(npc).toBeDefined()
    })

    it('handles empty hint text', () => {
      const npc = { hints: [{ text: '', after: null }] }
      const hint = resolveHint(npc, new Set())
      expect(hint).toBe('')
    })

    it('prioritizes lowest hint after null in resolution', () => {
      const npc = {
        hints: [
          { text: 'Fallback', after: null },
          { text: 'Should not see this', after: 'specific-flag' },
          { text: 'Latest before check', after: null },
        ],
      }
      const hint = resolveHint(npc, new Set())
      // resolveHint searches from the end, so last with null wins
      expect(hint).toBe('Latest before check')
    })
  })
})
