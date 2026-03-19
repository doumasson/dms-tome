import { describe, it, expect } from 'vitest'
import { extractWallEdges, NORTH, EAST, SOUTH, WEST, DOOR_N, DOOR_E, DOOR_S, DOOR_W } from './wallEdgeExtractor.js'

describe('extractWallEdges', () => {
  // Helper: create a grid from a visual map
  // W = wall, D = door, F = floor, . = empty
  function makeGrid(rows, palette, doorSet) {
    const height = rows.length
    const width = rows[0].length
    const walls = new Uint16Array(width * height)
    const floor = new Uint16Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = rows[y][x]
        if (ch === 'W') walls[y * width + x] = 1       // wall tile
        else if (ch === 'D') walls[y * width + x] = 2   // door tile
        else if (ch === 'F') floor[y * width + x] = 3   // floor tile
      }
    }
    return extractWallEdges(walls, floor, palette, doorSet, width, height)
  }

  const palette = ['', 'stone_wall', 'door_metal', 'brick_floor']
  const doorSet = new Set(['door_metal'])

  it('single wall cell surrounded by empty — edges on all 4 sides', () => {
    const { wallEdges } = makeGrid([
      '...',
      '.W.',
      '...',
    ], palette, doorSet)
    const center = 1 * 3 + 1
    expect(wallEdges[center] & NORTH).toBeTruthy()
    expect(wallEdges[center] & EAST).toBeTruthy()
    expect(wallEdges[center] & SOUTH).toBeTruthy()
    expect(wallEdges[center] & WEST).toBeTruthy()
  })

  it('wall cell adjacent to wall cell — no edge between them', () => {
    const { wallEdges } = makeGrid([
      '...',
      'WW.',
      '...',
    ], palette, doorSet)
    const left = 1 * 3 + 0
    const right = 1 * 3 + 1
    // Left cell has no east edge, right cell has no west edge
    expect(wallEdges[left] & EAST).toBeFalsy()
    expect(wallEdges[right] & WEST).toBeFalsy()
  })

  it('door cell gets door bits not wall bits', () => {
    const { wallEdges } = makeGrid([
      '.D.',
      '...',
    ], palette, doorSet)
    const door = 0 * 3 + 1
    expect(wallEdges[door] & DOOR_S).toBeTruthy()
    expect(wallEdges[door] & SOUTH).toBeFalsy() // wall bit NOT set
  })

  it('map boundary creates edges', () => {
    const { wallEdges } = makeGrid([
      'W',
    ], palette, doorSet)
    expect(wallEdges[0] & NORTH).toBeTruthy()
    expect(wallEdges[0] & EAST).toBeTruthy()
    expect(wallEdges[0] & SOUTH).toBeTruthy()
    expect(wallEdges[0] & WEST).toBeTruthy()
  })

  it('backfills floor under wall cells from neighbors', () => {
    // Wall row with floor below — floor should be backfilled under walls
    const { floor } = makeGrid([
      'WWW',
      'FFF',
    ], palette, doorSet)
    // Top row wall cells should now have floor backfilled
    expect(floor[0]).toBe(3)
    expect(floor[1]).toBe(3)
    expect(floor[2]).toBe(3)
  })

  it('no backfill when wall cell already has floor', () => {
    const width = 3, height = 1
    const walls = new Uint16Array([1, 0, 0])
    const floor = new Uint16Array([3, 3, 0])  // wall cell at 0 already has floor
    const { floor: outFloor } = extractWallEdges(walls, floor, palette, doorSet, width, height)
    expect(outFloor[0]).toBe(3) // unchanged
  })
})
