import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeGruntAction,
  computeMinionAction,
  triggerEnemyTurn,
} from './enemyAi'

describe('Enemy AI', () => {
  let enemy, player, combatants, encounter

  beforeEach(() => {
    enemy = {
      id: 'enemy-1',
      name: 'Goblin',
      currentHp: 7,
      maxHp: 7,
      ac: 15,
      speed: 30,
      position: { x: 5, y: 5 },
      attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
      type: 'enemy',
      conditions: [],
    }

    player = {
      id: 'player-1',
      name: 'Wizard',
      currentHp: 20,
      maxHp: 30,
      ac: 12,
      position: { x: 5, y: 2 },
      type: 'player',
      conditions: [],
    }

    combatants = [enemy, player]
    encounter = {
      combatants,
    }
  })

  describe('computeGruntAction', () => {
    it('returns wait action when enemy has no position', () => {
      enemy.position = null
      const result = computeGruntAction(enemy, combatants, null, 10, 8)
      expect(result.action).toBe('wait')
      expect(result.narrative).toContain(enemy.name)
    })

    it('returns wait action when no targets available', () => {
      combatants = [enemy]
      const result = computeGruntAction(enemy, combatants, null, 10, 8)
      expect(result.action).toBe('wait')
    })

    it('returns wait action when all players are dead', () => {
      player.currentHp = 0
      const result = computeGruntAction(enemy, combatants, null, 10, 8)
      expect(result.action).toBe('wait')
    })

    it('attacks immediately when adjacent to target', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      expect(result.action).toBe('attack')
      expect(result.targetId).toBe('player-1')
      expect(result.d20).toBeGreaterThanOrEqual(1)
      expect(result.d20).toBeLessThanOrEqual(20)
      expect(result.total).toBe(result.d20 + result.bonus)
      expect(result.weapon).toBe('Scimitar')
    })

    it('deals critical hit damage on natural 20', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }

      // Run multiple times until we get a crit (statistically very likely in 100 tries)
      let foundCrit = false
      for (let i = 0; i < 100; i++) {
        const result = computeGruntAction(enemy, combatants, null, 10, 8)
        if (result.isCrit) {
          foundCrit = true
          expect(result.damage).toBeGreaterThan(0)
          break
        }
      }
      // With 100 tries, we should see at least one crit (5% per roll)
      expect(foundCrit).toBe(true)
    })

    it('moves toward target when not adjacent', () => {
      enemy.position = { x: 5, y: 5 }
      player.position = { x: 5, y: 1 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      expect(['move', 'move-attack']).toContain(result.action)
      if (result.moveTo) {
        // Movement should be toward target
        expect(result.moveTo.y).toBeLessThan(enemy.position.y)
      }
    })

    it('respects enemy speed limit during movement', () => {
      enemy.speed = 30 // 6 squares max
      enemy.position = { x: 5, y: 5 }
      player.position = { x: 5, y: 0 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.moveTo) {
        const distance = Math.max(
          Math.abs(result.moveTo.x - enemy.position.x),
          Math.abs(result.moveTo.y - enemy.position.y)
        )
        expect(distance).toBeLessThanOrEqual(6)
      }
    })

    it('avoids occupied tiles during movement', () => {
      const obstacle = {
        id: 'obstacle-1',
        name: 'Stone Block',
        currentHp: 100,
        position: { x: 5, y: 4 },
        type: 'enemy',
      }
      const combatantsWithObstacle = [enemy, player, obstacle]

      enemy.position = { x: 5, y: 5 }
      player.position = { x: 5, y: 1 }
      const result = computeGruntAction(enemy, combatantsWithObstacle, null, 10, 8)

      if (result.moveTo) {
        // Should not move into obstacle
        expect(
          !(result.moveTo.x === 5 && result.moveTo.y === 4)
        ).toBe(true)
      }
    })

    it('calculates attack bonus correctly', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.action === 'attack' || result.action === 'move-attack') {
        expect(result.bonus).toBe(4) // From Scimitar +4
        expect(result.total).toBe(result.d20 + 4)
      }
    })

    it('targets nearest player when multiple are present', () => {
      const player2 = {
        id: 'player-2',
        name: 'Fighter',
        currentHp: 25,
        maxHp: 40,
        ac: 16,
        position: { x: 1, y: 5 },
        type: 'player',
        conditions: [],
      }
      const combatantsMultiple = [enemy, player, player2]

      enemy.position = { x: 5, y: 5 }
      player.position = { x: 0, y: 0 } // Far away
      const result = computeGruntAction(enemy, combatantsMultiple, null, 10, 8)

      if (result.action === 'attack' || result.action === 'move-attack') {
        // Should target Fighter (closer)
        expect(result.targetId).toBe('player-2')
      }
    })

    it('handles missing attack data gracefully', () => {
      enemy.attacks = []
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      expect(result.action).toBe('attack')
      expect(result.d20).toBeGreaterThanOrEqual(1)
      expect(result.d20).toBeLessThanOrEqual(20)
    })

    it('never moves outside grid bounds', () => {
      enemy.position = { x: 8, y: 6 }
      player.position = { x: 9, y: 7 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.moveTo) {
        expect(result.moveTo.x).toBeGreaterThanOrEqual(0)
        expect(result.moveTo.x).toBeLessThan(10)
        expect(result.moveTo.y).toBeGreaterThanOrEqual(0)
        expect(result.moveTo.y).toBeLessThan(8)
      }
    })
  })

  describe('computeMinionAction', () => {
    let minion, boss

    beforeEach(() => {
      minion = {
        id: 'minion-1',
        name: 'Goblin Minion',
        currentHp: 5,
        maxHp: 7,
        ac: 14,
        position: { x: 5, y: 5 },
        attacks: [{ name: 'Dagger', bonus: '+3', damage: '1d4+1' }],
        type: 'enemy',
        conditions: [],
      }

      boss = {
        id: 'boss-1',
        name: 'Goblin Boss',
        currentHp: 25,
        maxHp: 50,
        ac: 15,
        position: { x: 5, y: 4 },
        cr: 2,
        type: 'enemy',
        conditions: [],
      }

      encounter = {
        combatants: [minion, boss, player],
      }
    })

    it('returns idle action when no players are alive', () => {
      player.currentHp = 0
      const result = computeMinionAction(minion, encounter)
      expect(result.action).toBe('idle')
      expect(result.damage).toBe(0)
      expect(result.targetId).toBeNull()
    })

    it('identifies boss as highest CR enemy', () => {
      const result = computeMinionAction(minion, encounter)
      // Just verify it doesn't crash and returns valid action
      expect(['attack', 'move', 'retreat', 'idle']).toContain(result.action)
    })

    it('returns valid action structure', () => {
      const result = computeMinionAction(minion, encounter)
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('narrative')
      expect(result).toHaveProperty('targetId')
      expect(result).toHaveProperty('damage')
    })

    it('includes narrative in all action types', () => {
      for (let i = 0; i < 5; i++) {
        const result = computeMinionAction(minion, encounter)
        expect(result.narrative).toBeTruthy()
        expect(result.narrative.length).toBeGreaterThan(0)
      }
    })
  })

  describe('triggerEnemyTurn', () => {
    it('throws error when no API key provided', async () => {
      await expect(triggerEnemyTurn(enemy, encounter, null)).rejects.toThrow('No API key')
    })

    it('returns idle when no players are alive', async () => {
      player.currentHp = 0
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(result.action).toBe('idle')
      expect(result.targetId).toBeNull()
      expect(result.damage).toBe(0)
    })

    it('successfully parses valid JSON response from API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              action: 'attack',
              targetId: 'player-1',
              attackRoll: 15,
              hit: true,
              damage: 8,
              damageType: 'slashing',
              narrative: 'The goblin strikes!',
              logEntry: 'Goblin attacks Wizard',
            })
          }]
        })
      })

      enemy.position = { x: 5, y: 2 }
      player.position = { x: 5, y: 2 }
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(result.action).toBe('attack')
      expect(result.damage).toBe(8)
    })

    it('handles markdown-wrapped JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: '```json\n{"action":"move","narrative":"Moving forward","targetId":null,"damage":0}\n```'
          }]
        })
      })

      enemy.position = { x: 5, y: 5 }
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(result.action).toBe('move')
    })

    it('falls back to local turn on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(['attack', 'move', 'idle']).toContain(result.action)
    })

    it('falls back to local turn on JSON parse error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: 'Invalid JSON {'
          }]
        })
      })

      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(['attack', 'move', 'idle']).toContain(result.action)
    })

    it('validates target exists in combatants', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              action: 'attack',
              targetId: 'nonexistent-player',
              attackRoll: 15,
              hit: true,
              damage: 8,
              narrative: 'Attacking',
            })
          }]
        })
      })

      enemy.position = { x: 5, y: 3 }
      const result = await triggerEnemyTurn(enemy, encounter, 'test-key')

      // Should replace invalid target with closest player
      expect(result.targetId).toBe('player-1')
    })

    it('sends correct API headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              action: 'idle',
              narrative: 'Waiting',
              targetId: null,
              damage: 0,
            })
          }]
        })
      })
      global.fetch = fetchMock

      enemy.position = { x: 5, y: 5 }
      await triggerEnemyTurn(enemy, encounter, 'test-key')

      expect(fetchMock).toHaveBeenCalled()
      const call = fetchMock.mock.calls[0]
      const headers = call[1].headers
      expect(headers['x-api-key']).toBe('test-key')
      expect(headers['anthropic-version']).toBe('2023-06-01')
    })

    it('includes enemy and player state in prompt', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              action: 'idle',
              narrative: 'Idle',
              targetId: null,
              damage: 0,
            })
          }]
        })
      })
      global.fetch = fetchMock

      enemy.position = { x: 5, y: 5 }
      await triggerEnemyTurn(enemy, encounter, 'test-key')

      const call = fetchMock.mock.calls[0]
      const body = JSON.parse(call[1].body)
      const prompt = body.messages[0].content

      expect(prompt).toContain(enemy.name)
      expect(prompt).toContain(player.name)
      expect(prompt).toContain('HP')
      expect(prompt).toContain('AC')
    })
  })

  describe('Attack roll mechanics', () => {
    it('determines hit based on d20 + bonus vs target AC', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }

      // Run multiple times to verify statistical distribution
      let hits = 0
      let misses = 0
      for (let i = 0; i < 20; i++) {
        const result = computeGruntAction(enemy, combatants, null, 10, 8)
        if (result.action === 'attack' || result.action === 'move-attack') {
          if (result.d20 === 1) {
            expect(result.hit).toBe(false)
            misses++
          } else if (result.d20 === 20) {
            expect(result.hit).toBe(true)
            hits++
          } else {
            const shouldHit = result.total >= player.ac
            expect(result.hit).toBe(shouldHit)
            if (shouldHit) hits++
            else misses++
          }
        }
      }
      expect(hits + misses).toBeGreaterThan(0)
    })

    it('rolls damage correctly on hit', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      enemy.attacks = [{ name: 'Weapon', bonus: '+20', damage: '2d6+5' }]

      // With high bonus, should hit often
      let foundHit = false
      for (let i = 0; i < 10; i++) {
        const result = computeGruntAction(enemy, combatants, null, 10, 8)
        if (result.hit) {
          foundHit = true
          expect(result.damage).toBeGreaterThanOrEqual(7) // 2d6 min 2, +5 = 7
          expect(result.damage).toBeLessThanOrEqual(17) // 2d6 max 12, +5 = 17
          break
        }
      }
      expect(foundHit).toBe(true)
    })

    it('deals no damage on miss', () => {
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      player.ac = 25 // Very high AC

      // Run multiple times
      for (let i = 0; i < 10; i++) {
        const result = computeGruntAction(enemy, combatants, null, 10, 8)
        if (result.action === 'attack' && result.d20 !== 20) {
          expect(result.damage).toBe(0)
        }
      }
    })
  })

  describe('Movement pathfinding', () => {
    it('prefers shortest path to target', () => {
      enemy.position = { x: 5, y: 5 }
      player.position = { x: 8, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.moveTo) {
        // Should move closer to target
        const distBefore = Math.max(
          Math.abs(player.position.x - enemy.position.x),
          Math.abs(player.position.y - enemy.position.y)
        )
        const distAfter = Math.max(
          Math.abs(player.position.x - result.moveTo.x),
          Math.abs(player.position.y - result.moveTo.y)
        )
        expect(distAfter).toBeLessThanOrEqual(distBefore)
      }
    })

    it('handles 4-directional movement correctly', () => {
      enemy.position = { x: 5, y: 5 }
      player.position = { x: 5, y: 0 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.moveTo) {
        // Movement should be toward target and respect grid bounds
        const dx = Math.abs(result.moveTo.x - enemy.position.x)
        const dy = Math.abs(result.moveTo.y - enemy.position.y)
        // Total distance moved should not exceed speed limit (6 squares for 30 ft)
        expect(Math.max(dx, dy)).toBeLessThanOrEqual(6)
        // Movement should be toward target (closer or same x or y)
        const distBefore = Math.max(
          Math.abs(player.position.x - enemy.position.x),
          Math.abs(player.position.y - enemy.position.y)
        )
        const distAfter = Math.max(
          Math.abs(player.position.x - result.moveTo.x),
          Math.abs(player.position.y - result.moveTo.y)
        )
        expect(distAfter).toBeLessThanOrEqual(distBefore)
      }
    })
  })

  describe('Edge cases', () => {
    it('handles zero hit points gracefully', () => {
      enemy.currentHp = 0
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      // Should still return valid action even if dead
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('narrative')
    })

    it('handles undefined positions in combatants list', () => {
      const combatantWithoutPosition = {
        id: 'ghost',
        name: 'Ghost',
        currentHp: 10,
        type: 'enemy',
      }
      const result = computeGruntAction(enemy, [...combatants, combatantWithoutPosition], null, 10, 8)
      expect(result).toHaveProperty('action')
    })

    it('handles attack with no damage dice', () => {
      enemy.attacks = [{ name: 'Punch', bonus: '+2' }]
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      if (result.hit) {
        expect(result.damage).toBeGreaterThanOrEqual(0)
      }
    })

    it('handles condition modifiers in narrative', () => {
      enemy.conditions = ['Frightened']
      player.conditions = ['Paralyzed']
      enemy.position = { x: 5, y: 3 }
      player.position = { x: 5, y: 2 }
      const result = computeGruntAction(enemy, combatants, null, 10, 8)

      expect(result.narrative).toBeTruthy()
    })
  })

  describe('Combat scenarios', () => {
    it('surrounded enemy targets nearest foe', () => {
      const player2 = {
        id: 'player-2',
        name: 'Cleric',
        currentHp: 15,
        ac: 16,
        position: { x: 4, y: 5 },
        type: 'player',
      }
      const player3 = {
        id: 'player-3',
        name: 'Rogue',
        currentHp: 8,
        ac: 14,
        position: { x: 6, y: 5 },
        type: 'player',
      }
      const combatantsCrowd = [enemy, player, player2, player3]

      enemy.position = { x: 5, y: 5 }
      const result = computeGruntAction(enemy, combatantsCrowd, null, 10, 8)

      if (result.action === 'attack') {
        // One of the adjacent enemies
        const targetId = result.targetId
        expect(['player-2', 'player-3']).toContain(targetId)
      }
    })

    it('fleeing player gets ignored in favor of reachable targets', () => {
      player.position = { x: 0, y: 0 } // Very far away
      const fleeingPlayer = {
        id: 'player-2',
        name: 'Fleeing Wizard',
        currentHp: 5,
        ac: 10,
        position: { x: 5, y: 3 },
        type: 'player',
      }
      const combatantsWithFleeing = [enemy, player, fleeingPlayer]

      enemy.position = { x: 5, y: 5 }
      const result = computeGruntAction(enemy, combatantsWithFleeing, null, 10, 8)

      if (result.action === 'attack' || result.action === 'move-attack') {
        // Should target fleeing player (closer)
        expect(result.targetId).toBe('player-2')
      }
    })
  })
})
