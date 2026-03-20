import { describe, it, expect } from 'vitest'
import { getTilesInSphere, getTilesInCone, getTilesInLine, getTilesInCube } from './AoEOverlay.js'

describe('AoE geometry', () => {
  it('sphere returns tiles within radius', () => {
    const tiles = getTilesInSphere({ x: 5, y: 5 }, 2)
    expect(tiles).toContainEqual({ x: 5, y: 5 })
    expect(tiles).toContainEqual({ x: 5, y: 3 })
    expect(tiles).not.toContainEqual({ x: 5, y: 2 }) // 3 tiles away, radius is 2
  })

  it('cone returns tiles in direction', () => {
    const tiles = getTilesInCone({ x: 5, y: 5 }, 'N', 3)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.some(t => t.y < 5)).toBe(true)
    expect(tiles.every(t => t.y <= 5)).toBe(true)
  })

  it('line returns tiles along direction', () => {
    const tiles = getTilesInLine({ x: 5, y: 5 }, 'E', 4)
    expect(tiles).toContainEqual({ x: 6, y: 5 })
    expect(tiles).toContainEqual({ x: 9, y: 5 })
    expect(tiles.length).toBe(4)
  })

  it('cube returns square area', () => {
    const tiles = getTilesInCube({ x: 5, y: 5 }, 3)
    expect(tiles.length).toBe(9)
  })
})
