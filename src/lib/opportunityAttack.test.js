// src/lib/opportunityAttack.test.js
import { describe, it, expect } from 'vitest'
import { chebyshev } from './gridUtils.js'
import { findOATriggers } from './opportunityAttack.js'

describe('chebyshev', () => {
  it('returns 0 for same position', () => {
    expect(chebyshev({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0)
  })
  it('returns 1 for adjacent', () => {
    expect(chebyshev({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(1)
  })
  it('returns max of dx,dy', () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 5 })).toBe(5)
  })
})

describe('findOATriggers', () => {
  const enemy = (x, y, opts = {}) => ({
    id: `e-${x}-${y}`, name: 'Goblin', position: { x, y },
    hp: 10, currentHp: 10, reactionUsed: false, ...opts,
  })

  it('returns empty when no enemies adjacent', () => {
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
    const enemies = [enemy(5, 5)]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('triggers when leaving enemy reach', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1)]
    const triggers = findOATriggers(path, enemies, false)
    expect(triggers).toHaveLength(1)
    expect(triggers[0].enemy.id).toBe('e-1-1')
    expect(triggers[0].step).toBe(1)
  })

  it('no trigger when staying adjacent', () => {
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    const enemies = [enemy(1, 1)]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('no trigger when disengaged', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1)]
    expect(findOATriggers(path, enemies, true)).toEqual([])
  })

  it('no trigger when enemy reaction already used', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1, { reactionUsed: true })]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('no trigger from dead enemies', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1, { currentHp: 0 })]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('triggers from multiple enemies on same path', () => {
    // mover walks from x=0 to x=6; passes by e1 at (1,1) then e2 at (4,1)
    const path = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
    ]
    const enemies = [enemy(1, 1), enemy(4, 1)]
    const triggers = findOATriggers(path, enemies, false)
    expect(triggers).toHaveLength(2)
  })
})
