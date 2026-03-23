import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkReadiedTrigger, resolveReadiedAttack, READY_TRIGGERS, READY_RESPONSES } from './readiedAction.js'

describe('Readied Action System', () => {
  describe('READY_TRIGGERS', () => {
    it('should have 4 trigger types', () => {
      expect(READY_TRIGGERS).toHaveLength(4)
      expect(READY_TRIGGERS.map(t => t.id)).toEqual([
        'enemy-enters-reach', 'enemy-enters-range', 'enemy-casts-spell', 'ally-takes-damage'
      ])
    })
  })

  describe('READY_RESPONSES', () => {
    it('should have 4 response types', () => {
      expect(READY_RESPONSES).toHaveLength(4)
      expect(READY_RESPONSES.map(r => r.id)).toEqual([
        'melee-attack', 'ranged-attack', 'move', 'dash'
      ])
    })
  })

  describe('checkReadiedTrigger', () => {
    const holder = {
      id: 'player1',
      position: { x: 5, y: 5 },
      reactionUsed: false,
      currentHp: 20,
    }

    it('should trigger enemy-enters-reach when enemy moves adjacent', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 4 }, // adjacent
      }, holder)
      expect(result).toBe(true)
    })

    it('should NOT trigger enemy-enters-reach when enemy is far', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 2 }, // 3 tiles away
      }, holder)
      expect(result).toBe(false)
    })

    it('should NOT trigger enemy-enters-reach for ally movement', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'ally1',
        moverIsEnemy: false,
        toPos: { x: 5, y: 4 },
      }, holder)
      expect(result).toBe(false)
    })

    it('should trigger enemy-enters-range within 6 tiles', () => {
      const readied = { trigger: 'enemy-enters-range', response: 'ranged-attack' }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 0 }, // 5 tiles away
      }, holder)
      expect(result).toBe(true)
    })

    it('should NOT trigger enemy-enters-range beyond 6 tiles', () => {
      const readied = { trigger: 'enemy-enters-range', response: 'ranged-attack' }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 12, y: 5 }, // 7 tiles away
      }, holder)
      expect(result).toBe(false)
    })

    it('should trigger enemy-casts-spell on cast event', () => {
      const readied = { trigger: 'enemy-casts-spell', response: 'melee-attack' }
      const result = checkReadiedTrigger(readied, 'cast-spell', {
        moverId: 'lich1',
        moverIsEnemy: true,
      }, holder)
      expect(result).toBe(true)
    })

    it('should NOT trigger enemy-casts-spell for ally casting', () => {
      const readied = { trigger: 'enemy-casts-spell', response: 'melee-attack' }
      const result = checkReadiedTrigger(readied, 'cast-spell', {
        moverId: 'cleric1',
        moverIsEnemy: false,
      }, holder)
      expect(result).toBe(false)
    })

    it('should trigger ally-takes-damage when ally is hit', () => {
      const readied = { trigger: 'ally-takes-damage', response: 'move' }
      const result = checkReadiedTrigger(readied, 'take-damage', {
        targetId: 'player2',
        targetIsEnemy: false,
      }, holder)
      expect(result).toBe(true)
    })

    it('should NOT trigger ally-takes-damage for self', () => {
      const readied = { trigger: 'ally-takes-damage', response: 'move' }
      const result = checkReadiedTrigger(readied, 'take-damage', {
        targetId: 'player1', // same as holder
        targetIsEnemy: false,
      }, holder)
      expect(result).toBe(false)
    })

    it('should NOT trigger ally-takes-damage for enemy damage', () => {
      const readied = { trigger: 'ally-takes-damage', response: 'move' }
      const result = checkReadiedTrigger(readied, 'take-damage', {
        targetId: 'goblin1',
        targetIsEnemy: true,
      }, holder)
      expect(result).toBe(false)
    })

    it('should NOT trigger if reaction already used', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const usedHolder = { ...holder, reactionUsed: true }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 4 },
      }, usedHolder)
      expect(result).toBe(false)
    })

    it('should NOT trigger if holder is dead', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const deadHolder = { ...holder, currentHp: 0 }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 4 },
      }, deadHolder)
      expect(result).toBe(false)
    })

    it('should NOT trigger if no readied action', () => {
      const result = checkReadiedTrigger(null, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 4 },
      }, holder)
      expect(result).toBe(false)
    })

    it('should NOT trigger if holder has no position', () => {
      const readied = { trigger: 'enemy-enters-reach', response: 'melee-attack' }
      const noPos = { ...holder, position: null }
      const result = checkReadiedTrigger(readied, 'move', {
        moverId: 'goblin1',
        moverIsEnemy: true,
        toPos: { x: 5, y: 4 },
      }, noPos)
      expect(result).toBe(false)
    })
  })

  describe('resolveReadiedAttack', () => {
    let mathRandom
    beforeEach(() => { mathRandom = Math.random })
    afterEach(() => { Math.random = mathRandom })

    const attacker = { id: 'player1', name: 'Fighter' }
    const target = { id: 'goblin1', name: 'Goblin', ac: 15 }
    const weapon = { name: 'Longsword', bonus: '+5', damage: '1d8+3' }

    it('should resolve a hit when roll beats AC', () => {
      Math.random = () => 14 / 20 // d20 = 15
      const result = resolveReadiedAttack(attacker, target, weapon)
      expect(result.d20).toBe(15)
      expect(result.total).toBe(20) // 15 + 5
      expect(result.hit).toBe(true)
      expect(result.damage).toBeGreaterThan(0)
    })

    it('should resolve a miss when roll is below AC', () => {
      Math.random = () => 3 / 20 // d20 = 4
      const result = resolveReadiedAttack(attacker, target, weapon)
      expect(result.d20).toBe(4)
      expect(result.total).toBe(9) // 4 + 5
      expect(result.hit).toBe(false)
      expect(result.damage).toBe(0)
    })

    it('should always hit on natural 20 (crit)', () => {
      Math.random = () => 19 / 20 // d20 = 20
      const result = resolveReadiedAttack(attacker, target, weapon)
      expect(result.d20).toBe(20)
      expect(result.hit).toBe(true)
      expect(result.crit).toBe(true)
      expect(result.damage).toBeGreaterThan(0)
    })

    it('should always miss on natural 1', () => {
      Math.random = () => 0 / 20 // d20 = 1
      const result = resolveReadiedAttack(attacker, { ...target, ac: 2 }, weapon) // very low AC
      expect(result.d20).toBe(1)
      expect(result.hit).toBe(false)
    })

    it('should handle weapon with no bonus', () => {
      Math.random = () => 14 / 20 // d20 = 15
      const result = resolveReadiedAttack(attacker, target, { name: 'Rock', bonus: '0', damage: '1d4' })
      expect(result.total).toBe(15)
      expect(result.hit).toBe(true)
    })
  })
})
