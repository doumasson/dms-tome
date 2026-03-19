import { describe, it, expect } from 'vitest'
import { computeVision, getCharacterVisionRange, encodeExploredBitfield, decodeExploredBitfield } from './visionCalculator.js'

describe('getCharacterVisionRange', () => {
  it('returns 0 for human in darkness without light', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'darkness',
      []
    )
    expect(range.bright).toBe(0)
    expect(range.dim).toBe(0)
  })

  it('returns 15 tiles for any character in bright light', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'bright',
      []
    )
    expect(range.bright).toBe(15)
  })

  it('returns darkvision range for elf in darkness', () => {
    const range = getCharacterVisionRange(
      { race: 'Elf', darkvision: 60 },
      'darkness',
      []
    )
    expect(range.darkvision).toBe(12) // 60ft / 5ft per tile
  })

  it('adds torch light radius', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'darkness',
      [{ type: 'torch' }]
    )
    expect(range.bright).toBe(4)  // 20ft torch
    expect(range.dim).toBe(8)     // +20ft dim
  })

  it('handles drow superior darkvision', () => {
    const range = getCharacterVisionRange(
      { race: 'Drow', darkvision: 120 },
      'darkness',
      []
    )
    expect(range.darkvision).toBe(24) // 120ft
  })
})

describe('computeVision', () => {
  it('computes union of party vision as a Set of tile keys', () => {
    const partyVisions = [
      { position: { x: 5, y: 5 }, brightRadius: 4, dimRadius: 8 },
      { position: { x: 20, y: 20 }, brightRadius: 4, dimRadius: 8 },
    ]
    const vision = computeVision(partyVisions, 30, 30)
    expect(vision.active.size).toBeGreaterThan(0)
    expect(vision.active.has('5,5')).toBe(true)
    expect(vision.active.has('20,20')).toBe(true)
    expect(vision.active.has('12,12')).toBe(false) // midpoint, out of both radii
  })
})

describe('explored bitfield roundtrip', () => {
  it('encodes and decodes a set of explored tiles', () => {
    const explored = new Set(['0,0', '5,3', '19,14', '79,59'])
    const encoded = encodeExploredBitfield(explored, 80, 60)
    expect(typeof encoded).toBe('string')
    const decoded = decodeExploredBitfield(encoded, 80, 60)
    expect(decoded.has('0,0')).toBe(true)
    expect(decoded.has('5,3')).toBe(true)
    expect(decoded.has('19,14')).toBe(true)
    expect(decoded.has('79,59')).toBe(true)
    expect(decoded.has('10,10')).toBe(false)
    expect(decoded.size).toBe(4)
  })
})
