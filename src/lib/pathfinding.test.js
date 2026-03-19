import { describe, it, expect } from 'vitest'
import { findPath, buildCollisionLayer, findPathLegacy, buildWalkabilityGrid, findPathEdge } from './pathfinding.js'

describe('findPath (binary heap A*)', () => {
  it('finds path on large grid within 16ms', () => {
    const collision = new Uint8Array(120 * 80)
    // Add a vertical wall
    for (let y = 10; y < 60; y++) {
      collision[y * 120 + 30] = 1
    }

    const start = performance.now()
    const path = findPath(collision, 120, 80, { x: 5, y: 5 }, { x: 100, y: 70 })
    const elapsed = performance.now() - start

    expect(path).not.toBeNull()
    expect(path.length).toBeGreaterThan(10)
    expect(elapsed).toBeLessThan(16)
  })

  it('finds simple path on small grid', () => {
    const collision = new Uint8Array(5 * 5) // all walkable
    const path = findPath(collision, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).not.toBeNull()
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 })
    // Manhattan distance is 8, path should be 9 nodes
    expect(path.length).toBe(9)
  })

  it('returns null when no path exists', () => {
    const collision = new Uint8Array(10 * 10)
    // Wall across entire row 5
    for (let x = 0; x < 10; x++) collision[5 * 10 + x] = 1
    const path = findPath(collision, 10, 10, { x: 0, y: 0 }, { x: 9, y: 9 })
    expect(path).toBeNull()
  })

  it('returns single-element path when start equals end', () => {
    const collision = new Uint8Array(5 * 5)
    const path = findPath(collision, 5, 5, { x: 2, y: 2 }, { x: 2, y: 2 })
    expect(path).toEqual([{ x: 2, y: 2 }])
  })

  it('returns null when end is blocked', () => {
    const collision = new Uint8Array(5 * 5)
    collision[4 * 5 + 4] = 1 // block end
    const path = findPath(collision, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).toBeNull()
  })
})

describe('buildCollisionLayer', () => {
  it('builds Uint8Array from tile palette and layers', () => {
    const collision = buildCollisionLayer(
      { walls: new Uint16Array([0, 1, 0, 0]), props: new Uint16Array([0, 0, 2, 0]) },
      ['', 'walls:stone_v', 'props:barrel'],
      { 'walls:stone_v': true, 'props:barrel': true },
      2, 2
    )
    expect(collision[0]).toBe(0) // empty
    expect(collision[1]).toBe(1) // wall
    expect(collision[2]).toBe(1) // barrel
    expect(collision[3]).toBe(0) // empty
  })
})

describe('findPathLegacy', () => {
  it('works with boolean[][] grid (backward compat)', () => {
    const grid = [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ]
    const path = findPathLegacy(grid, { x: 0, y: 0 }, { x: 2, y: 2 })
    expect(path).not.toBeNull()
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[path.length - 1]).toEqual({ x: 2, y: 2 })
  })
})

describe('findPathEdge (edge-based collision)', () => {
  const NORTH = 0x1, EAST = 0x2, SOUTH = 0x4, WEST = 0x8

  it('finds path when no wall edges', () => {
    const wallEdges = new Uint8Array(5 * 5)
    const cellBlocked = new Uint8Array(5 * 5)
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).not.toBeNull()
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 })
    expect(path.length).toBe(9)
  })

  it('blocks movement across a wall edge', () => {
    const wallEdges = new Uint8Array(3)
    wallEdges[1] = EAST
    const cellBlocked = new Uint8Array(3)
    const path = findPathEdge({ wallEdges, cellBlocked }, 3, 1, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toBeNull()
  })

  it('wall edge blocks in both directions', () => {
    const wallEdges = new Uint8Array(3)
    wallEdges[1] = EAST
    wallEdges[2] = WEST
    const cellBlocked = new Uint8Array(3)
    const path = findPathEdge({ wallEdges, cellBlocked }, 3, 1, { x: 2, y: 0 }, { x: 0, y: 0 })
    expect(path).toBeNull()
  })

  it('respects cellBlocked for props', () => {
    const wallEdges = new Uint8Array(5 * 5)
    const cellBlocked = new Uint8Array(5 * 5)
    cellBlocked[2 * 5 + 2] = 1
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(path).not.toBeNull()
    expect(path.some(p => p.x === 2 && p.y === 2)).toBe(false)
  })

  it('finds path around wall edges', () => {
    const wallEdges = new Uint8Array(5 * 5)
    const cellBlocked = new Uint8Array(5 * 5)
    for (let y = 0; y < 4; y++) {
      wallEdges[y * 5 + 2] |= EAST
      wallEdges[y * 5 + 3] |= WEST
    }
    const path = findPathEdge({ wallEdges, cellBlocked }, 5, 5, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(path).not.toBeNull()
    expect(path.some(p => p.y === 4)).toBe(true)
  })
})
