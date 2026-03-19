import { describe, it, expect } from 'vitest'
import { parseFAFilename, scanZipManifest } from './scan.js'

describe('parseFAFilename', () => {
  it('parses a standard filename with grid size', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Settlements/Furniture/Tables/Table_Round_Wood_Dark_A1_2x2.png'
    )
    expect(result).not.toBeNull()
    expect(result.category).toBe('Core_Settlements')
    expect(result.subcategory).toBe('Furniture')
    expect(result.material).toBe('Wood')
    expect(result.variant).toBe('A1')
    expect(result.gridWidth).toBe(2)
    expect(result.gridHeight).toBe(2)
    expect(result.filename).toBe('Table_Round_Wood_Dark_A1_2x2.png')
    expect(result.tags).toContain('table')
    expect(result.tags).toContain('furniture')
  })

  it('parses a texture filename without grid size', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Settlements/Floors/Stone/Floor_Stone_Dark_Tile_A.png'
    )
    expect(result).not.toBeNull()
    expect(result.category).toBe('Core_Settlements')
    expect(result.subcategory).toBe('Floors')
    expect(result.gridWidth).toBe(1)
    expect(result.gridHeight).toBe(1)
    expect(result.filename).toBe('Floor_Stone_Dark_Tile_A.png')
    expect(result.tags).toContain('stone')
    expect(result.tags).toContain('floors')
  })

  it('parses a wilderness biome path', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Wilderness/Trees/Oak/Tree_Oak_Large_A1_2x3.png'
    )
    expect(result).not.toBeNull()
    expect(result.category).toBe('Core_Wilderness')
    expect(result.subcategory).toBe('Trees')
    expect(result.gridWidth).toBe(2)
    expect(result.gridHeight).toBe(3)
    expect(result.tags).toContain('wilderness')
    expect(result.tags).toContain('trees')
  })

  it('returns null for non-PNG files', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Settlements/Furniture/Tables/Table_Round_Wood_Dark_A1_2x2.jpg'
    )
    expect(result).toBeNull()
  })

  it('returns null for a non-PNG zip entry like a folder path', () => {
    const result = parseFAFilename('FA_Assets/!Core_Settlements/Furniture/Tables/')
    expect(result).toBeNull()
  })
})

describe.skip('scanZipManifest (real zip — skip in CI)', () => {
  const ZIP_PATH =
    'C:/Users/sheme/Downloads/mapmaking_temp/Core_Mapmaking_Pack_Part1_v1.08.zip'

  it('produces entries from a real zip', async () => {
    const entries = await scanZipManifest(ZIP_PATH, { limit: 10 })
    expect(entries.length).toBeGreaterThan(0)
    // Every entry must have required fields
    for (const entry of entries) {
      expect(entry).toHaveProperty('path')
      expect(entry).toHaveProperty('category')
      expect(entry).toHaveProperty('subcategory')
      expect(entry).toHaveProperty('gridWidth')
      expect(entry).toHaveProperty('gridHeight')
      expect(entry).toHaveProperty('tags')
      expect(Array.isArray(entry.tags)).toBe(true)
      expect(entry).toHaveProperty('compressedSize')
      expect(entry).toHaveProperty('uncompressedSize')
    }
  }, 30000)
})
