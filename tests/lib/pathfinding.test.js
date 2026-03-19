import { describe, it, expect } from 'vitest'
import { findPathLegacy as findPath, buildWalkabilityGrid } from '../../src/lib/pathfinding.js'

describe('buildWalkabilityGrid', () => {
  it('marks blocking tiles as false', () => {
    const walls = [[-1, 18, -1], [-1, -1, -1]]
    const props = [[-1, -1, -1], [-1, 37, -1]]
    const blocking = new Set([18, 37])
    const grid = buildWalkabilityGrid(walls, props, blocking, 3, 2)
    expect(grid[0][0]).toBe(true)
    expect(grid[0][1]).toBe(false) // wall
    expect(grid[1][1]).toBe(false) // barrel
    expect(grid[1][0]).toBe(true)
  })
})

describe('findPath', () => {
  it('finds straight path in open grid', () => {
    const grid = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toHaveLength(3)
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path[2]).toEqual({ x: 2, y: 0 })
  })

  it('paths around obstacles', () => {
    const grid = [
      [true, false, true],
      [true, true, true],
      [true, false, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).not.toBeNull()
    expect(path.length).toBeGreaterThan(3)
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 })
  })

  it('returns null when no path exists', () => {
    const grid = [
      [true, false, true],
      [false, false, true],
      [true, true, true],
    ]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(path).toBeNull()
  })

  it('returns single-cell path for same start and end', () => {
    const grid = [[true, true], [true, true]]
    const path = findPath(grid, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(path).toHaveLength(1)
  })
})
