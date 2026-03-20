import { describe, it, expect } from 'vitest'
import { resolveWallTile, resolveCornerTiles, WALL_STYLES } from './wallAutotile.js'

describe('resolveWallTile', () => {
  it('resolves village horizontal segment tile ID', () => {
    const tileId = resolveWallTile('village', 'horizontal', 5, 3)
    expect(tileId).toMatch(/^atlas-structures:wall_stone_earthy_\w+_connector_a_1x1$/)
  })

  it('resolves village vertical — same tile ID with rotation flag', () => {
    const result = resolveWallTile('village', 'vertical', 5, 3)
    // Village has rotateForVertical — returns { tileId, rotate: true }
    expect(result).toHaveProperty('tileId')
    expect(result).toHaveProperty('rotate', true)
    expect(result.tileId).toMatch(/^atlas-structures:wall_stone_earthy_\w+_connector_a_1x1$/)
  })

  it('resolves cave horizontal with flesh tiles', () => {
    const tileId = resolveWallTile('cave', 'horizontal', 2, 7)
    expect(tileId).toMatch(/^atlas-walls:flesh_black_wall_connector_\w+1_1x1$/)
  })

  it('resolves cave vertical with native _X2 suffix', () => {
    const result = resolveWallTile('cave', 'vertical', 2, 7)
    // Cave has native vertical tiles — no rotation needed
    expect(typeof result === 'string' || (result.rotate === false)).toBeTruthy()
  })

  it('resolves town with native a/b connectors', () => {
    const h = resolveWallTile('town', 'horizontal', 0, 0)
    expect(h).toMatch(/_connector_a_1x1$/)
    const v = resolveWallTile('town', 'vertical', 0, 0)
    expect(typeof v === 'string').toBe(true) // no rotation needed
    expect(v).toMatch(/_connector_b_1x1$/)
  })

  it('deterministic — same inputs produce same output', () => {
    const a = resolveWallTile('village', 'horizontal', 10, 20)
    const b = resolveWallTile('village', 'horizontal', 10, 20)
    expect(a).toEqual(b)
  })

  it('different regionIds produce different variants', () => {
    // Different buildings (regionIds) should use different variants
    const results = new Set()
    for (let regionId = 0; regionId < 10; regionId++) {
      const r = resolveWallTile('village', 'horizontal', 5, 5, regionId)
      const id = typeof r === 'string' ? r : r.tileId
      results.add(id)
    }
    expect(results.size).toBeGreaterThan(1) // at least 2 different variants across buildings
  })

  it('WALL_STYLES has required keys for each theme', () => {
    for (const [name, style] of Object.entries(WALL_STYLES)) {
      expect(style.segmentPrefix, `${name}.segmentPrefix`).toBeTruthy()
      expect(style.variants.length, `${name}.variants`).toBeGreaterThan(0)
      expect(typeof style.rotateForVertical, `${name}.rotateForVertical`).toBe('boolean')
    }
  })

  it('resolves dungeon horizontal with dwarven tiles', () => {
    const tileId = resolveWallTile('dungeon', 'horizontal', 3, 2)
    expect(tileId).toMatch(/^atlas-structures:dwarven_wall_stone_earthy_connector_\w+_1x1$/)
  })
})

describe('resolveCornerTiles', () => {
  it('resolves village NE corner', () => {
    const tileId = resolveCornerTiles('village', 'NE')
    expect(tileId).toBe('atlas-structures:wall_corner_stone_earthy_l1_1x1')
  })

  it('resolves cave corners', () => {
    const tileId = resolveCornerTiles('cave', 'SW')
    expect(tileId).toBe('atlas-walls:flesh_black_wall_corner_d1_1x1')
  })

  it('returns null for forest (no dedicated corners)', () => {
    const tileId = resolveCornerTiles('forest', 'NE')
    expect(tileId).toBeNull()
  })
})
