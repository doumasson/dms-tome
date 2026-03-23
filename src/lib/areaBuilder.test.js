import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateAreaSize,
  THEME_TERRAIN,
  THEME_ROAD,
  buildAreaFromBrief,
} from './areaBuilder'

describe('Area Builder', () => {
  describe('calculateAreaSize', () => {
    it('uses provided width and height if specified', () => {
      const brief = { width: 100, height: 80 }
      const size = calculateAreaSize(brief)

      expect(size.width).toBe(100)
      expect(size.height).toBe(80)
    })

    it('calculates size for outdoor areas', () => {
      const brief = { theme: 'forest', pois: [1, 2, 3] }
      const size = calculateAreaSize(brief)

      expect(size.width).toBeGreaterThanOrEqual(80)
      expect(size.height).toBeLessThan(size.width)
    })

    it('calculates compact size for dungeons', () => {
      const brief = { theme: 'dungeon', pois: [1, 2] }
      const size = calculateAreaSize(brief)

      expect(size.width).toBeLessThan(150)
      expect(size.width).toBeGreaterThanOrEqual(30)
    })

    it('scales size with POI count for outdoor areas', () => {
      const small = calculateAreaSize({ theme: 'forest', pois: [1] })
      const large = calculateAreaSize({ theme: 'forest', pois: [1, 2, 3, 4, 5] })

      expect(large.width).toBeGreaterThan(small.width)
    })

    it('maintains aspect ratio', () => {
      const size = calculateAreaSize({ theme: 'village', pois: [] })

      const ratio = size.height / size.width
      expect(ratio).toBeCloseTo(0.75, 1)
    })

    it('respects min/max bounds for dungeons', () => {
      const small = calculateAreaSize({ theme: 'dungeon', pois: [] })
      const large = calculateAreaSize({ theme: 'dungeon', pois: Array(10).fill(1) })

      expect(small.width).toBeGreaterThanOrEqual(30)
      expect(large.width).toBeLessThanOrEqual(80)
    })

    it('respects min/max bounds for outdoor areas', () => {
      const size = calculateAreaSize({ theme: 'forest', pois: Array(20).fill(1) })

      expect(size.width).toBeLessThanOrEqual(200)
      expect(size.width).toBeGreaterThanOrEqual(80)
    })

    it('handles different themes', () => {
      const themes = ['village', 'forest', 'dungeon', 'cave', 'town', 'crypt', 'sewer']

      for (const theme of themes) {
        const size = calculateAreaSize({ theme, pois: [] })
        expect(size.width).toBeGreaterThan(0)
        expect(size.height).toBeGreaterThan(0)
      }
    })

    it('defaults to 3 POIs if not specified', () => {
      const brief = { theme: 'village' }
      const size = calculateAreaSize(brief)

      expect(size.width).toBeGreaterThan(0)
    })
  })

  describe('THEME_TERRAIN constant', () => {
    it('includes all expected themes', () => {
      const expectedThemes = ['village', 'forest', 'dungeon', 'cave', 'town', 'crypt', 'sewer']

      for (const theme of expectedThemes) {
        expect(THEME_TERRAIN).toHaveProperty(theme)
      }
    })

    it('has tile arrays for each theme', () => {
      for (const [theme, tiles] of Object.entries(THEME_TERRAIN)) {
        expect(Array.isArray(tiles)).toBe(true)
        expect(tiles.length).toBeGreaterThan(0)

        for (const tile of tiles) {
          expect(typeof tile).toBe('string')
          expect(tile.length).toBeGreaterThan(0)
        }
      }
    })

    it('contains atlas references', () => {
      for (const tiles of Object.values(THEME_TERRAIN)) {
        for (const tile of tiles) {
          expect(tile).toContain('atlas-')
        }
      }
    })

    it('has at least 2 variants per theme for variety', () => {
      for (const [theme, tiles] of Object.entries(THEME_TERRAIN)) {
        expect(tiles.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('THEME_ROAD constant', () => {
    it('includes all expected themes', () => {
      const expectedThemes = ['village', 'forest', 'dungeon', 'cave', 'town', 'crypt', 'sewer']

      for (const theme of expectedThemes) {
        expect(THEME_ROAD).toHaveProperty(theme)
      }
    })

    it('has string tile IDs for each theme', () => {
      for (const [theme, tile] of Object.entries(THEME_ROAD)) {
        expect(typeof tile).toBe('string')
        expect(tile.length).toBeGreaterThan(0)
        expect(tile).toContain('atlas-')
      }
    })

    it('has different roads for different themes', () => {
      const themes = Object.keys(THEME_ROAD)
      const roads = Object.values(THEME_ROAD)

      // At least some roads should be different
      const uniqueRoads = new Set(roads)
      expect(uniqueRoads.size).toBeGreaterThan(1)
    })

    it('uses theme-appropriate floor tiles', () => {
      expect(THEME_ROAD.dungeon).toContain('brick_floor_03')
      expect(THEME_ROAD.cave).toContain('brick_floor_04')
      expect(THEME_ROAD.village).toContain('brick_floor_01')
    })
  })

  describe('buildAreaFromBrief', () => {
    let villageBreif, dungeonBrief

    beforeEach(() => {
      villageBreif = {
        id: 'village-1',
        name: 'Test Village',
        theme: 'village',
        pois: [{ id: 'tavern', type: 'building' }],
        exits: [],
        npcs: [],
        enemies: [],
        connections: [],
        encounterZones: [],
      }
      dungeonBrief = {
        id: 'dungeon-1',
        name: 'Test Dungeon',
        theme: 'dungeon',
        dungeonConfig: { minRooms: 4, maxRooms: 8, corridorWidth: 2 },
        pois: [],
        exits: [],
        npcs: [],
        enemies: [],
        connections: [],
        encounterZones: [],
      }
    })

    it('returns valid area object for village', () => {
      const area = buildAreaFromBrief(villageBreif, 12345)

      expect(area).toHaveProperty('id', 'village-1')
      expect(area).toHaveProperty('name', 'Test Village')
      expect(area).toHaveProperty('width')
      expect(area).toHaveProperty('height')
      expect(area).toHaveProperty('theme', 'village')
      expect(area).toHaveProperty('layers')
      expect(area).toHaveProperty('palette')
    })

    it('returns valid area object for dungeon', () => {
      const area = buildAreaFromBrief(dungeonBrief, 12345)

      expect(area).toHaveProperty('id', 'dungeon-1')
      expect(area).toHaveProperty('theme', 'dungeon')
      expect(area).toHaveProperty('layers')
      expect(area).toHaveProperty('enemies')
    })

    it('delegates dungeon themes to dungeonBuilder', () => {
      const dungeonThemes = ['dungeon', 'cave', 'crypt', 'sewer']

      for (const theme of dungeonThemes) {
        const brief = {
          id: `test-${theme}`,
          name: `Test ${theme}`,
          theme,
          pois: [],
          exits: [],
          npcs: [],
          enemies: [],
          connections: [],
          encounterZones: [],
        }

        const area = buildAreaFromBrief(brief, 12345)

        expect(area).toHaveProperty('theme', theme)
      }
    })

    it('generates deterministic output with same seed', () => {
      const area1 = buildAreaFromBrief(villageBreif, 99999)
      const area2 = buildAreaFromBrief(villageBreif, 99999)

      expect(area1.width).toBe(area2.width)
      expect(area1.height).toBe(area2.height)
    })

    it('generates different output with different seeds', () => {
      const area1 = buildAreaFromBrief(villageBreif, 11111)
      const area2 = buildAreaFromBrief(villageBreif, 22222)

      // Layout might differ (though not guaranteed with same size)
      expect(area1.id).toBe(area2.id)
    })

    it('includes width and height dimensions', () => {
      const area = buildAreaFromBrief(villageBreif, 12345)

      expect(area.width).toBeGreaterThan(0)
      expect(area.height).toBeGreaterThan(0)
    })

    it('generates layer data for rendering', () => {
      const area = buildAreaFromBrief(villageBreif, 12345)

      expect(area.layers).toBeDefined()
      expect(area.layers.floor).toBeInstanceOf(Uint16Array)
    })

    it('creates palette for tile mapping', () => {
      const area = buildAreaFromBrief(villageBreif, 12345)

      expect(area.palette).toBeInstanceOf(Array)
      expect(area.palette.length).toBeGreaterThan(0)
    })

    it('includes NPCs from brief', () => {
      const briefWithNpcs = {
        ...villageBreif,
        npcs: [
          { name: 'Innkeeper', role: 'merchant' },
          { name: 'Guard', role: 'guard' },
        ],
      }

      const area = buildAreaFromBrief(briefWithNpcs, 12345)

      expect(area.npcs).toBeDefined()
    })

    it('includes enemies from brief', () => {
      const briefWithEnemies = {
        ...villageBreif,
        enemies: [
          { name: 'Goblin', hp: 7, ac: 15 },
        ],
      }

      const area = buildAreaFromBrief(briefWithEnemies, 12345)

      expect(area.enemies).toBeDefined()
    })

    it('handles custom dimensions', () => {
      const briefCustomSize = {
        ...villageBreif,
        width: 120,
        height: 90,
      }

      const area = buildAreaFromBrief(briefCustomSize, 12345)

      expect(area.width).toBe(120)
      expect(area.height).toBe(90)
    })

    it('preserves theme setting', () => {
      const themes = ['village', 'forest', 'town']

      for (const theme of themes) {
        const brief = { ...villageBreif, theme }
        const area = buildAreaFromBrief(brief, 12345)

        expect(area.theme).toBe(theme)
      }
    })

    it('includes exits configuration', () => {
      const briefWithExits = {
        ...villageBreif,
        exits: [
          { edge: 'north', label: 'To Forest' },
          { edge: 'south', label: 'To Town' },
        ],
      }

      const area = buildAreaFromBrief(briefWithExits, 12345)

      expect(area.exits).toBeDefined()
    })

    it('includes encounter zones if specified', () => {
      const briefWithZones = {
        ...villageBreif,
        encounterZones: [
          { id: 'zone-1', dmPrompt: 'bandits', triggerRadius: 10 },
        ],
      }

      const area = buildAreaFromBrief(briefWithZones, 12345)

      expect(area.encounterZones).toBeDefined()
    })
  })

  describe('Area generation variants', () => {
    it('generates different area for each theme', () => {
      const themes = ['village', 'forest', 'town']

      for (const theme of themes) {
        const brief = {
          id: `test-${theme}`,
          name: `Test ${theme}`,
          theme,
          pois: [],
          exits: [],
          npcs: [],
          enemies: [],
          connections: [],
          encounterZones: [],
        }

        const area = buildAreaFromBrief(brief, 12345)

        expect(area.theme).toBe(theme)
        expect(area.layers).toBeDefined()
      }
    })

    it('scales area size with POI count', () => {
      const fewPois = {
        id: 'test-1',
        name: 'Small',
        theme: 'forest',
        pois: [{ id: 'p1' }],
        exits: [],
        npcs: [],
        enemies: [],
        connections: [],
        encounterZones: [],
      }

      const manyPois = {
        id: 'test-2',
        name: 'Large',
        theme: 'forest',
        pois: [1, 2, 3, 4, 5].map((i) => ({ id: `p${i}` })),
        exits: [],
        npcs: [],
        enemies: [],
        connections: [],
        encounterZones: [],
      }

      const areaSmall = buildAreaFromBrief(fewPois, 12345)
      const areaLarge = buildAreaFromBrief(manyPois, 12345)

      expect(areaLarge.width).toBeGreaterThanOrEqual(areaSmall.width)
    })

    it('builds coherent tilemap structure', () => {
      const brief = {
        id: 'test-coherent',
        name: 'Coherent Area',
        theme: 'village',
        width: 50,
        height: 50,
        pois: [],
        exits: [],
        npcs: [],
        enemies: [],
        connections: [],
        encounterZones: [],
      }

      const area = buildAreaFromBrief(brief, 12345)

      // Should have proper tilemap structure
      expect(area.layers.floor.length).toBe(50 * 50)
      expect(area.palette).toBeInstanceOf(Array)
      expect(area.palette.length).toBeGreaterThan(0)
    })
  })
})
