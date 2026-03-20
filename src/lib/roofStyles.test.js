import { describe, it, expect } from 'vitest'
import { resolveRoofTile } from './roofStyles.js'

describe('resolveRoofTile', () => {
  it('returns a hay roof tile for tavern tags', () => {
    const tile = resolveRoofTile(['tavern', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_hay_/)
  })

  it('returns a slate roof tile for temple tags', () => {
    const tile = resolveRoofTile(['temple', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_slate_/)
  })

  it('returns a tile roof for shop tags', () => {
    const tile = resolveRoofTile(['shop', 'settlement'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_tile_/)
  })

  it('returns null for dungeon/underground tags', () => {
    const tile = resolveRoofTile(['dungeon', 'underground'], 0)
    expect(tile).toBeNull()
  })

  it('different buildingIndex gives different variants', () => {
    const results = new Set()
    for (let i = 0; i < 20; i++) {
      results.add(resolveRoofTile(['tavern', 'settlement'], i))
    }
    expect(results.size).toBeGreaterThan(1)
  })

  it('defaults to hay for unrecognized tags', () => {
    const tile = resolveRoofTile(['unknown'], 0)
    expect(tile).toMatch(/^atlas-floors:roof_texture_hay_/)
  })
})
