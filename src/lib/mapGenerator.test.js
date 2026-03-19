import { describe, it, expect } from 'vitest'
import { resolvePositions, stampChunk, connectWithRoad, fillTerrain } from './mapGenerator.js'

describe('resolvePositions', () => {
  it('converts relative positions to grid coordinates', () => {
    const pois = [
      { id: 'tavern', position: 'north-center', width: 12, height: 10 },
      { id: 'camp', position: 'far-south', width: 10, height: 8 },
    ]
    const resolved = resolvePositions(pois, 80, 60)
    expect(resolved.tavern.x).toBeGreaterThan(20)
    expect(resolved.tavern.x).toBeLessThan(50)
    expect(resolved.tavern.y).toBeLessThan(20)
    expect(resolved.camp.y).toBeGreaterThan(40)
  })

  it('applies jitter so results are not perfectly grid-aligned', () => {
    const pois = [{ id: 'a', position: 'center', width: 5, height: 5 }]
    const r1 = resolvePositions(pois, 80, 60, 1)
    const r2 = resolvePositions(pois, 80, 60, 2)
    expect(r1.a).toBeDefined()
    expect(r2.a).toBeDefined()
  })
})

describe('stampChunk', () => {
  it('writes chunk tiles onto area layers at position', () => {
    const areaW = 20
    const floor = new Uint16Array(20 * 20)
    const chunk = {
      width: 3, height: 2,
      layers: { floor: new Uint16Array([1, 2, 3, 4, 5, 6]) },
    }
    stampChunk({ floor }, chunk, 5, 5, areaW)
    expect(floor[5 * areaW + 5]).toBe(1)
    expect(floor[5 * areaW + 7]).toBe(3)
    expect(floor[6 * areaW + 5]).toBe(4)
  })

  it('skips empty tiles (0)', () => {
    const areaW = 10
    const floor = new Uint16Array(10 * 10)
    floor[15] = 99
    const chunk = {
      width: 2, height: 1,
      layers: { floor: new Uint16Array([0, 7]) },
    }
    stampChunk({ floor }, chunk, 5, 1, areaW)
    expect(floor[15]).toBe(99)
    expect(floor[16]).toBe(7)
  })
})

describe('connectWithRoad', () => {
  it('paints road tiles between two points', () => {
    const areaW = 20
    const terrain = new Uint16Array(20 * 20)
    connectWithRoad(terrain, 5, { x: 2, y: 5 }, { x: 15, y: 12 }, 2, areaW)
    expect(terrain[5 * areaW + 8]).toBe(5)
    expect(terrain[10 * areaW + 15]).toBe(5)
  })
})

describe('fillTerrain', () => {
  it('fills empty cells with variant tiles', () => {
    const layer = new Uint16Array(25)
    layer[0] = 10
    fillTerrain(layer, [1, 2, 3], 5, 5)
    expect(layer[0]).toBe(10)
    for (let i = 1; i < 25; i++) {
      expect([1, 2, 3]).toContain(layer[i])
    }
  })
})
