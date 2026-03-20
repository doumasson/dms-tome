// src/lib/cover.test.js
import { describe, it, expect } from 'vitest'
import { bresenhamLine, calculateCover } from './cover.js'

describe('bresenhamLine', () => {
  it('returns straight horizontal line', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 0 })
    expect(line).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }])
  })
  it('returns diagonal line', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 2, y: 2 })
    expect(line).toHaveLength(3)
    expect(line[0]).toEqual({ x: 0, y: 0 })
    expect(line[2]).toEqual({ x: 2, y: 2 })
  })
})

describe('calculateCover', () => {
  const width = 5
  const wallEdges = new Uint8Array(25)

  it('returns none when no obstacles', () => {
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, wallEdges, new Set(), width)).toBe('none')
  })

  it('returns half when one wall edge crossed', () => {
    const edges = new Uint8Array(25)
    edges[2] = 0x02 // Cell (2,0) has east wall edge (EDGE_E = 0x02)
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, edges, new Set(), width)).toBe('half')
  })

  it('returns half when prop cover in path', () => {
    const propCover = new Set(['2,0'])
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, wallEdges, propCover, width)).toBe('half')
  })

  it('returns three-quarters when 2+ obstructions', () => {
    const edges = new Uint8Array(25)
    edges[2] = 0x02
    const propCover = new Set(['3,0'])
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, edges, propCover, width)).toBe('three-quarters')
  })
})
