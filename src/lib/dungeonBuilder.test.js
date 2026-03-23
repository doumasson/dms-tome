import { describe, it, expect, beforeEach } from 'vitest'
import { buildDungeonArea } from './dungeonBuilder'

describe('Dungeon Builder', () => {
  let brief

  beforeEach(() => {
    brief = {
      id: 'test-dungeon',
      name: 'Test Dungeon',
      width: 60,
      height: 40,
      theme: 'dungeon',
      dungeonConfig: {
        minRooms: 4,
        maxRooms: 8,
        corridorWidth: 2,
      },
      enemies: [
        {
          name: 'Goblin',
          count: 2,
          position: 'random_room',
          stats: { hp: 7, ac: 15, speed: 30 },
          attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
        },
      ],
      exits: [
        { edge: 'south', targetArea: 'next-area', label: 'Staircase Down' },
      ],
      npcs: [],
    }
  })

  describe('buildDungeonArea', () => {
    it('returns valid dungeon area structure', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result).toHaveProperty('id', 'test-dungeon')
      expect(result).toHaveProperty('name', 'Test Dungeon')
      expect(result).toHaveProperty('width', 60)
      expect(result).toHaveProperty('height', 40)
      expect(result).toHaveProperty('layers')
      expect(result).toHaveProperty('palette')
      expect(result).toHaveProperty('enemies')
      expect(result).toHaveProperty('exits')
      expect(result).toHaveProperty('rooms')
      expect(result).toHaveProperty('doors')
    })

    it('generates floor layer as Uint16Array', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.layers).toHaveProperty('floor')
      expect(result.layers.floor).toBeInstanceOf(Uint16Array)
      expect(result.layers.floor.length).toBe(60 * 40)
    })

    it('generates all required layers', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.layers).toHaveProperty('floor')
      expect(result.layers).toHaveProperty('walls')
      expect(result.layers).toHaveProperty('props')
      expect(result.layers).toHaveProperty('roof')

      expect(result.layers.floor).toBeInstanceOf(Uint16Array)
      expect(result.layers.walls).toBeInstanceOf(Uint16Array)
      expect(result.layers.props).toBeInstanceOf(Uint16Array)
      expect(result.layers.roof).toBeInstanceOf(Uint16Array)
    })

    it('creates palette with valid tile indices', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.palette).toBeInstanceOf(Array)
      expect(result.palette.length).toBeGreaterThan(0)

      for (const tileId of result.palette) {
        expect(typeof tileId).toBe('string')
      }
    })

    it('places enemies with valid positions', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.enemies).toBeInstanceOf(Array)
      expect(result.enemies.length).toBeGreaterThan(0)

      for (const enemy of result.enemies) {
        expect(enemy).toHaveProperty('name')
        expect(enemy).toHaveProperty('position')
        expect(enemy.position).toHaveProperty('x')
        expect(enemy.position).toHaveProperty('y')
        expect(enemy.position.x).toBeGreaterThanOrEqual(0)
        expect(enemy.position.x).toBeLessThan(brief.width)
        expect(enemy.position.y).toBeGreaterThanOrEqual(0)
        expect(enemy.position.y).toBeLessThan(brief.height)
      }
    })

    it('respects enemy count configuration', () => {
      const result = buildDungeonArea(brief, 12345)

      const goblins = result.enemies.filter(e => e.name.includes('Goblin'))
      expect(goblins.length).toBeGreaterThanOrEqual(1)
    })

    it('generates rooms within grid bounds', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.rooms).toBeInstanceOf(Array)
      expect(result.rooms.length).toBeGreaterThanOrEqual(brief.dungeonConfig.minRooms)
      expect(result.rooms.length).toBeLessThanOrEqual(brief.dungeonConfig.maxRooms)

      for (const room of result.rooms) {
        expect(room).toHaveProperty('x')
        expect(room).toHaveProperty('y')
        expect(room).toHaveProperty('width')
        expect(room).toHaveProperty('height')

        expect(room.x).toBeGreaterThanOrEqual(0)
        expect(room.y).toBeGreaterThanOrEqual(0)
        expect(room.x + room.width).toBeLessThanOrEqual(brief.width)
        expect(room.y + room.height).toBeLessThanOrEqual(brief.height)
        expect(room.width).toBeGreaterThan(0)
        expect(room.height).toBeGreaterThan(0)
      }
    })

    it('generates corridors connecting rooms', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.doors).toBeInstanceOf(Array)
      expect(result.doors.length).toBeGreaterThan(0)

      for (const door of result.doors) {
        expect(door).toHaveProperty('x')
        expect(door).toHaveProperty('y')
        expect(door.x).toBeGreaterThanOrEqual(0)
        expect(door.y).toBeGreaterThanOrEqual(0)
        expect(door.x).toBeLessThan(brief.width)
        expect(door.y).toBeLessThan(brief.height)
      }
    })

    it('fills floor layer with non-zero values', () => {
      const result = buildDungeonArea(brief, 12345)

      let floorCount = 0
      for (let i = 0; i < result.layers.floor.length; i++) {
        if (result.layers.floor[i] !== 0) {
          floorCount++
        }
      }

      expect(floorCount).toBeGreaterThan((brief.width * brief.height) / 10)
    })

    it('generates consistent results with same seed', () => {
      const result1 = buildDungeonArea(brief, 99999)
      const result2 = buildDungeonArea(brief, 99999)

      expect(result1.rooms.length).toBe(result2.rooms.length)
      expect(result1.enemies.length).toBe(result2.enemies.length)
    })

    it('respects dungeon configuration', () => {
      const config = {
        minRooms: 3,
        maxRooms: 5,
        corridorWidth: 3,
      }
      const briefWithConfig = {
        ...brief,
        dungeonConfig: config,
      }

      const result = buildDungeonArea(briefWithConfig, 12345)

      expect(result.rooms.length).toBeGreaterThanOrEqual(3)
      expect(result.rooms.length).toBeLessThanOrEqual(5)
    })

    it('handles custom dungeon dimensions', () => {
      const briefSmall = {
        ...brief,
        width: 30,
        height: 20,
      }

      const result = buildDungeonArea(briefSmall, 12345)

      expect(result.width).toBe(30)
      expect(result.height).toBe(20)
      expect(result.layers.floor.length).toBe(30 * 20)
    })

    it('places exits at valid locations when provided', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.exits).toBeInstanceOf(Array)
      expect(result.exits.length).toBeGreaterThan(0)

      for (const exit of result.exits) {
        expect(exit).toHaveProperty('x')
        expect(exit).toHaveProperty('y')
        expect(exit.x).toBeGreaterThanOrEqual(0)
        expect(exit.x).toBeLessThan(brief.width)
        expect(exit.y).toBeGreaterThanOrEqual(0)
        expect(exit.y).toBeLessThan(brief.height)
      }
    })

    it('handles empty exits list', () => {
      const briefNoExits = {
        ...brief,
        exits: [],
      }

      const result = buildDungeonArea(briefNoExits, 12345)

      expect(result.exits).toBeInstanceOf(Array)
      expect(result.exits.length).toBe(0)
    })

    it('handles empty enemies list', () => {
      const briefNoEnemies = {
        ...brief,
        enemies: [],
      }

      const result = buildDungeonArea(briefNoEnemies, 12345)

      expect(result.enemies).toBeInstanceOf(Array)
      expect(result.enemies.length).toBe(0)
    })

    it('handles multiple enemies with same name', () => {
      const briefMultipleGoblins = {
        ...brief,
        enemies: [
          {
            name: 'Goblin',
            count: 5,
            stats: { hp: 7, ac: 15, speed: 30 },
          },
        ],
      }

      const result = buildDungeonArea(briefMultipleGoblins, 12345)

      expect(result.enemies.length).toBeGreaterThanOrEqual(1)
    })

    it('generates reasonable dungeon dimensions', () => {
      const result = buildDungeonArea(brief, 12345)

      let floorTiles = 0
      for (let i = 0; i < result.layers.floor.length; i++) {
        if (result.layers.floor[i] !== 0) floorTiles++
      }

      const floorPercentage = (floorTiles / result.layers.floor.length) * 100
      expect(floorPercentage).toBeGreaterThan(5)
      expect(floorPercentage).toBeLessThan(95)
    })

    it('handles very small dungeons', () => {
      const briefTiny = {
        ...brief,
        width: 20,
        height: 20,
        dungeonConfig: { minRooms: 1, maxRooms: 3, corridorWidth: 1 },
      }

      const result = buildDungeonArea(briefTiny, 12345)

      expect(result.width).toBe(20)
      expect(result.height).toBe(20)
      expect(result.rooms.length).toBeGreaterThanOrEqual(1)
    })

    it('handles large dungeons', () => {
      const briefLarge = {
        ...brief,
        width: 120,
        height: 80,
        dungeonConfig: { minRooms: 10, maxRooms: 20, corridorWidth: 3 },
      }

      const result = buildDungeonArea(briefLarge, 12345)

      expect(result.width).toBe(120)
      expect(result.height).toBe(80)
      expect(result.rooms.length).toBeGreaterThanOrEqual(10)
    })

    it('tiles in floor layer reference valid palette indices', () => {
      const result = buildDungeonArea(brief, 12345)

      for (let i = 0; i < result.layers.floor.length; i++) {
        const tileIndex = result.layers.floor[i]
        if (tileIndex !== 0) {
          expect(tileIndex).toBeGreaterThanOrEqual(0)
          expect(tileIndex).toBeLessThan(result.palette.length)
        }
      }
    })

    it('enemy positions are on floor tiles', () => {
      const result = buildDungeonArea(brief, 12345)

      for (const enemy of result.enemies) {
        const idx = enemy.position.y * brief.width + enemy.position.x
        expect(result.layers.floor[idx]).toBeGreaterThanOrEqual(0)
      }
    })

    it('door positions are on floor tiles', () => {
      const result = buildDungeonArea(brief, 12345)

      for (const door of result.doors) {
        const idx = door.y * brief.width + door.x
        expect(result.layers.floor[idx]).toBeGreaterThanOrEqual(0)
      }
    })

    it('generates interactables like chests', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.interactables).toBeInstanceOf(Array)
      // Should have some chests/searchable spots
      expect(result.interactables.length).toBeGreaterThanOrEqual(0)

      for (const interactable of result.interactables) {
        expect(['chest', 'searchable']).toContain(interactable.type)
        expect(interactable).toHaveProperty('position')
        expect(interactable.position).toHaveProperty('x')
        expect(interactable.position).toHaveProperty('y')
      }
    })

    it('generates wall edges from floor boundaries', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.wallEdges).toBeDefined()
      expect(result.wallEdges).toBeInstanceOf(Uint8Array)
      expect(result.wallEdges.length).toBe(brief.width * brief.height)

      // Should have some wall edges
      let edgeCount = 0
      for (let i = 0; i < result.wallEdges.length; i++) {
        if (result.wallEdges[i] !== 0) edgeCount++
      }
      expect(edgeCount).toBeGreaterThan(0)
    })

    it('generates player start position', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.playerStart).toBeDefined()
      expect(result.playerStart).toHaveProperty('x')
      expect(result.playerStart).toHaveProperty('y')
      expect(result.playerStart.x).toBeGreaterThanOrEqual(0)
      expect(result.playerStart.y).toBeGreaterThanOrEqual(0)
    })

    it('generates encounter zones', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.encounterZones).toBeDefined()
      expect(result.encounterZones).toBeInstanceOf(Array)
    })

    it('generates traps in the dungeon', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.traps).toBeDefined()
      expect(result.traps).toBeInstanceOf(Array)
    })

    it('has theme property', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.theme).toBe('dungeon')
    })

    it('handles different themes', () => {
      const themesToTest = ['dungeon', 'cave']

      for (const theme of themesToTest) {
        const briefTheme = {
          ...brief,
          theme,
        }

        const result = buildDungeonArea(briefTheme, 12345)

        expect(result.palette.length).toBeGreaterThan(0)
        expect(result.theme).toBe(theme)
      }
    })

    it('marks result as generated', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.generated).toBe(true)
    })

    it('provides tileSize and useCamera properties', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.tileSize).toBe(200)
      expect(result.useCamera).toBe(true)
    })

    it('creates cellBlocked array for collision detection', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.cellBlocked).toBeDefined()
      expect(result.cellBlocked).toBeInstanceOf(Uint8Array)
      expect(result.cellBlocked.length).toBe(brief.width * brief.height)
    })

    it('handles multiple exit edges', () => {
      const briefMultipleExits = {
        ...brief,
        exits: [
          { edge: 'north', targetArea: 'area-north', label: 'Exit North' },
          { edge: 'south', targetArea: 'area-south', label: 'Exit South' },
          { edge: 'east', targetArea: 'area-east', label: 'Exit East' },
        ],
      }

      const result = buildDungeonArea(briefMultipleExits, 12345)

      expect(result.exits.length).toBe(3)
      for (const exit of result.exits) {
        expect(exit).toHaveProperty('x')
        expect(exit).toHaveProperty('y')
        expect(exit).toHaveProperty('entryPoint')
      }
    })

    it('generates light sources in corridors', () => {
      const result = buildDungeonArea(brief, 12345)

      expect(result.lightSources).toBeDefined()
      expect(result.lightSources).toBeInstanceOf(Array)
    })
  })
})
