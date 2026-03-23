import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setLiveChannel,
  broadcastDiceRoll,
  broadcastSceneChange,
  broadcastStartCombat,
  broadcastPlayerMove,
  broadcastEncounterAction,
  broadcastApiKeySync,
  broadcastRequestApiKey,
  broadcastSceneTokenMove,
  broadcastFogReveal,
  broadcastFogToggle,
  broadcastNarratorMessage,
  broadcastAppendScenes,
  broadcastNpcDialogStart,
  broadcastNpcDialogEnd,
  broadcastStoryCutsceneStart,
  broadcastStoryCutsceneEnd,
  broadcastCutsceneMessage,
  broadcastStoryFlag,
  broadcastJournalEntry,
  broadcastAreaTransition,
  broadcastTokenMove,
  broadcastFogUpdate,
  broadcastRoofState,
  broadcastRoofReveal,
} from './liveChannel'

describe('Live Channel Broadcast System', () => {
  let mockChannel

  beforeEach(() => {
    // Create a mock channel with send method
    mockChannel = {
      send: vi.fn(),
    }
    // Set up the live channel
    setLiveChannel(mockChannel)
  })

  describe('channel management', () => {
    it('setLiveChannel sets the channel', () => {
      const newChannel = { send: vi.fn() }
      setLiveChannel(newChannel)

      // Verify by broadcasting and checking if the new channel was called
      broadcastDiceRoll({ roll: 20 })
      expect(newChannel.send).toHaveBeenCalled()
    })

    it('handles null channel gracefully', () => {
      setLiveChannel(null)
      // Should not throw
      expect(() => {
        broadcastDiceRoll({ roll: 20 })
      }).not.toThrow()
    })

    it('undefined channel is treated as no-op', () => {
      setLiveChannel(undefined)
      // Should not throw
      expect(() => {
        broadcastDiceRoll({ roll: 20 })
      }).not.toThrow()
    })
  })

  describe('dice broadcasts', () => {
    it('broadcastDiceRoll sends dice roll event', () => {
      const entry = { roll: 15, type: 'd20', modifier: '+2' }
      broadcastDiceRoll(entry)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'dice-roll',
        payload: entry,
      })
    })

    it('dice roll includes complete roll data', () => {
      const entry = {
        roll: 18,
        type: 'd20',
        modifier: '+3',
        total: 21,
        playerId: 'player-1',
      }
      broadcastDiceRoll(entry)

      const call = mockChannel.send.mock.calls[0][0]
      expect(call.payload).toEqual(entry)
    })
  })

  describe('scene broadcasts', () => {
    it('broadcastSceneChange sends scene sync event', () => {
      const sceneIndex = 3
      broadcastSceneChange(sceneIndex)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'scene-sync',
        payload: { sceneIndex },
      })
    })

    it('handles scene index 0', () => {
      broadcastSceneChange(0)

      const call = mockChannel.send.mock.calls[0][0]
      expect(call.payload.sceneIndex).toBe(0)
    })

    it('handles large scene indices', () => {
      broadcastSceneChange(999)

      const call = mockChannel.send.mock.calls[0][0]
      expect(call.payload.sceneIndex).toBe(999)
    })
  })

  describe('combat broadcasts', () => {
    it('broadcastStartCombat sends combat start event', () => {
      const payload = {
        enemies: [{ name: 'Goblin', hp: 7 }],
        initiativeOrder: ['player-1', 'goblin-1'],
      }
      broadcastStartCombat(payload)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'combat-start',
        payload,
      })
    })

    it('broadcastEncounterAction sends encounter action event', () => {
      const action = {
        type: 'attack',
        attacker: 'player-1',
        target: 'enemy-1',
        result: 'hit',
        damage: 8,
      }
      broadcastEncounterAction(action)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'encounter-action',
        payload: action,
      })
    })
  })

  describe('player movement broadcasts', () => {
    it('broadcastPlayerMove sends player move event', () => {
      broadcastPlayerMove('player-1', 5, 10, 30, 'user-123')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'player-move',
        payload: {
          tokenId: 'player-1',
          x: 5,
          y: 10,
          cost: 30,
          userId: 'user-123',
        },
      })
    })

    it('broadcastSceneTokenMove sends scene token move event', () => {
      broadcastSceneTokenMove('member-1', 15, 20, 'scene-key')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'scene-token-move',
        payload: {
          memberId: 'member-1',
          x: 15,
          y: 20,
          sceneKey: 'scene-key',
        },
      })
    })

    it('broadcastTokenMove sends token move event', () => {
      const position = { x: 5, y: 10 }
      const path = [{ x: 4, y: 9 }, { x: 5, y: 10 }]
      broadcastTokenMove('player-1', position, path)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'token-move',
        payload: {
          playerId: 'player-1',
          position,
          path,
        },
      })
    })

    it('broadcastTokenMove works with null path', () => {
      const position = { x: 5, y: 10 }
      broadcastTokenMove('player-1', position, null)

      const call = mockChannel.send.mock.calls[0][0]
      expect(call.payload.path).toBeNull()
    })
  })

  describe('API key broadcasts', () => {
    it('broadcastApiKeySync sends API key sync event', () => {
      const apiKey = 'sk-test-key-12345'
      broadcastApiKeySync(apiKey)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'api-key-sync',
        payload: { apiKey },
      })
    })

    it('broadcastRequestApiKey sends API key request event', () => {
      broadcastRequestApiKey()

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'request-api-key',
        payload: {},
      })
    })
  })

  describe('fog of war broadcasts', () => {
    it('broadcastFogReveal sends fog reveal event', () => {
      const cells = ['0,0', '1,0', '0,1']
      broadcastFogReveal('scene-1', cells)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'fog-reveal',
        payload: {
          sceneKey: 'scene-1',
          cells,
        },
      })
    })

    it('broadcastFogToggle sends fog toggle event', () => {
      broadcastFogToggle('scene-1', true)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'fog-toggle',
        payload: {
          sceneKey: 'scene-1',
          enabled: true,
        },
      })
    })

    it('broadcastFogUpdate sends fog update event', () => {
      const base64Bitfield = 'AQIDBAUG'
      broadcastFogUpdate('area-1', base64Bitfield)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'fog-update',
        payload: {
          areaId: 'area-1',
          base64Bitfield,
        },
      })
    })
  })

  describe('narrator broadcasts', () => {
    it('broadcastNarratorMessage sends narrator message event', () => {
      const msg = {
        text: 'The dragon emerges from the cave!',
        type: 'combat-narration',
        playSound: true,
      }
      broadcastNarratorMessage(msg)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'narrator-message',
        payload: msg,
      })
    })

    it('broadcastAppendScenes sends append scenes event', () => {
      const scenes = [
        { title: 'Scene 2', text: 'You rest at the inn.' },
        { title: 'Scene 3', text: 'Morning arrives...' },
      ]
      broadcastAppendScenes(scenes, 2)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'append-scenes',
        payload: {
          scenes,
          nextSceneIndex: 2,
        },
      })
    })
  })

  describe('NPC dialog broadcasts', () => {
    it('broadcastNpcDialogStart sends NPC dialog start event', () => {
      broadcastNpcDialogStart('Tavern Keeper', 'player-1', 'Alice')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'npc-dialog-start',
        payload: {
          npcName: 'Tavern Keeper',
          playerId: 'player-1',
          playerName: 'Alice',
        },
      })
    })

    it('broadcastNpcDialogEnd sends NPC dialog end event', () => {
      broadcastNpcDialogEnd('Tavern Keeper')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'npc-dialog-end',
        payload: {
          npcName: 'Tavern Keeper',
        },
      })
    })
  })

  describe('story and cutscene broadcasts', () => {
    it('broadcastStoryCutsceneStart sends story cutscene start event', () => {
      const criticalInfo = { type: 'reveal', npcAlignment: 'evil' }
      broadcastStoryCutsceneStart('Mysterious Stranger', 'player-1', criticalInfo)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'story-cutscene-start',
        payload: {
          npcName: 'Mysterious Stranger',
          initiatorId: 'player-1',
          criticalInfo,
        },
      })
    })

    it('broadcastStoryCutsceneEnd sends story cutscene end event', () => {
      broadcastStoryCutsceneEnd('Mysterious Stranger', 'dark-truth-revealed')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'story-cutscene-end',
        payload: {
          npcName: 'Mysterious Stranger',
          storyFlag: 'dark-truth-revealed',
        },
      })
    })

    it('broadcastCutsceneMessage sends cutscene message event', () => {
      const msg = {
        speaker: 'Mysterious Stranger',
        text: 'You are the chosen one.',
        emotion: 'intense',
      }
      broadcastCutsceneMessage(msg)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'cutscene-message',
        payload: msg,
      })
    })

    it('broadcastStoryFlag sends story flag event', () => {
      broadcastStoryFlag('dark-truth-revealed')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'story-flag',
        payload: {
          flag: 'dark-truth-revealed',
        },
      })
    })
  })

  describe('journal broadcasts', () => {
    it('broadcastJournalEntry sends journal entry event', () => {
      const entry = {
        title: 'The Mysterious Tower',
        text: 'We discovered an ancient tower in the ruins.',
        timestamp: Date.now(),
      }
      broadcastJournalEntry(entry)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'journal-entry',
        payload: entry,
      })
    })
  })

  describe('area broadcasts', () => {
    it('broadcastAreaTransition sends area transition event', () => {
      broadcastAreaTransition('area-forest-1', 'south-gate')

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'area-transition',
        payload: {
          areaId: 'area-forest-1',
          entryPoint: 'south-gate',
        },
      })
    })

    it('broadcastRoofState sends roof state event', () => {
      broadcastRoofState('building-1', true)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'roof-state',
        payload: {
          buildingId: 'building-1',
          revealed: true,
        },
      })
    })

    it('broadcastRoofReveal sends roof state event with area', () => {
      broadcastRoofReveal('area-1', 'building-1', false)

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'roof-state',
        payload: {
          areaId: 'area-1',
          buildingId: 'building-1',
          revealed: false,
        },
      })
    })
  })

  describe('broadcast structure validation', () => {
    it('all broadcasts have type "broadcast"', () => {
      const broadcasts = [
        () => broadcastDiceRoll({ roll: 20 }),
        () => broadcastSceneChange(1),
        () => broadcastStartCombat({}),
        () => broadcastPlayerMove('id', 0, 0, 0, 'user'),
        () => broadcastEncounterAction({}),
        () => broadcastNarratorMessage({}),
        () => broadcastTokenMove('id', {}),
      ]

      broadcasts.forEach(bc => {
        mockChannel.send.mockClear()
        bc()
        const call = mockChannel.send.mock.calls[0][0]
        expect(call.type).toBe('broadcast')
      })
    })

    it('all broadcasts have event property', () => {
      const broadcasts = [
        () => broadcastDiceRoll({ roll: 20 }),
        () => broadcastSceneChange(1),
        () => broadcastStartCombat({}),
        () => broadcastPlayerMove('id', 0, 0, 0, 'user'),
        () => broadcastEncounterAction({}),
        () => broadcastNarratorMessage({}),
        () => broadcastTokenMove('id', {}),
      ]

      broadcasts.forEach(bc => {
        mockChannel.send.mockClear()
        bc()
        const call = mockChannel.send.mock.calls[0][0]
        expect(call).toHaveProperty('event')
        expect(typeof call.event).toBe('string')
      })
    })

    it('all broadcasts have payload property', () => {
      const broadcasts = [
        () => broadcastDiceRoll({ roll: 20 }),
        () => broadcastSceneChange(1),
        () => broadcastStartCombat({}),
        () => broadcastPlayerMove('id', 0, 0, 0, 'user'),
        () => broadcastEncounterAction({}),
        () => broadcastNarratorMessage({}),
        () => broadcastTokenMove('id', {}),
      ]

      broadcasts.forEach(bc => {
        mockChannel.send.mockClear()
        bc()
        const call = mockChannel.send.mock.calls[0][0]
        expect(call).toHaveProperty('payload')
      })
    })
  })

  describe('event naming convention', () => {
    it('event names use kebab-case', () => {
      const broadcasts = [
        () => broadcastDiceRoll({ roll: 20 }),
        () => broadcastSceneChange(1),
        () => broadcastStartCombat({}),
        () => broadcastPlayerMove('id', 0, 0, 0, 'user'),
        () => broadcastNarratorMessage({}),
        () => broadcastTokenMove('id', {}),
      ]

      broadcasts.forEach(bc => {
        mockChannel.send.mockClear()
        bc()
        const call = mockChannel.send.mock.calls[0][0]
        expect(call.event).toMatch(/^[a-z-]+$/)
      })
    })
  })

  describe('integration scenarios', () => {
    it('multiple broadcasts are queued correctly', () => {
      broadcastDiceRoll({ roll: 15 })
      broadcastPlayerMove('player-1', 5, 10, 30, 'user-1')
      broadcastNarratorMessage({ text: 'You hit!' })

      expect(mockChannel.send).toHaveBeenCalledTimes(3)
    })

    it('broadcast order is preserved', () => {
      broadcastDiceRoll({ roll: 20 })
      broadcastEncounterAction({ type: 'attack', damage: 10 })

      const calls = mockChannel.send.mock.calls
      expect(calls[0][0].event).toBe('dice-roll')
      expect(calls[1][0].event).toBe('encounter-action')
    })

    it('changing channel between broadcasts works', () => {
      const newChannel = { send: vi.fn() }

      broadcastDiceRoll({ roll: 15 })
      expect(mockChannel.send).toHaveBeenCalledTimes(1)

      setLiveChannel(newChannel)
      broadcastDiceRoll({ roll: 20 })

      expect(mockChannel.send).toHaveBeenCalledTimes(1)
      expect(newChannel.send).toHaveBeenCalledTimes(1)
    })

    it('combat flow broadcasts', () => {
      broadcastStartCombat({ enemies: [{ name: 'Goblin', hp: 7 }] })
      broadcastEncounterAction({ type: 'attack', damage: 5 })
      broadcastEncounterAction({ type: 'heal', amount: 3 })
      broadcastNarratorMessage({ text: 'Combat ends!' })

      expect(mockChannel.send).toHaveBeenCalledTimes(4)
      const events = mockChannel.send.mock.calls.map(c => c[0].event)
      expect(events).toEqual([
        'combat-start',
        'encounter-action',
        'encounter-action',
        'narrator-message',
      ])
    })

    it('scene transition flow broadcasts', () => {
      broadcastNarratorMessage({ text: 'You enter the forest...' })
      broadcastSceneChange(2)
      broadcastSceneTokenMove('player-1', 5, 5, 'forest-1')

      expect(mockChannel.send).toHaveBeenCalledTimes(3)
      const events = mockChannel.send.mock.calls.map(c => c[0].event)
      expect(events).toEqual([
        'narrator-message',
        'scene-sync',
        'scene-token-move',
      ])
    })

    it('multiplayer interaction broadcasts', () => {
      broadcastPlayerMove('player-1', 5, 10, 30, 'user-1')
      broadcastPlayerMove('player-2', 8, 12, 25, 'user-2')
      broadcastNarratorMessage({ text: 'The party assembles.' })

      expect(mockChannel.send).toHaveBeenCalledTimes(3)
    })
  })

  describe('edge cases', () => {
    it('handles empty payloads', () => {
      broadcastStartCombat({})
      expect(mockChannel.send).toHaveBeenCalled()
    })

    it('handles large payloads', () => {
      const largePayload = {
        scenes: Array(100).fill({ title: 'Scene', text: 'Text' }),
      }
      broadcastAppendScenes(largePayload.scenes, 100)
      expect(mockChannel.send).toHaveBeenCalled()
    })

    it('handles complex nested objects', () => {
      const complexPayload = {
        enemies: [
          {
            name: 'Dragon',
            stats: { hp: 100, ac: 18 },
            abilities: [
              { name: 'Breath', damage: '10d6' },
            ],
          },
        ],
      }
      broadcastStartCombat(complexPayload)
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: complexPayload,
        })
      )
    })

    it('handles special characters in strings', () => {
      const msg = {
        text: 'Special characters: !@#$%^&*()',
        type: 'test',
      }
      broadcastNarratorMessage(msg)
      expect(mockChannel.send).toHaveBeenCalled()
    })
  })
})
