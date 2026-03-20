import { describe, it, expect } from 'vitest'
import { buildDungeonArea } from './dungeonBuilder.js'

describe('buildDungeonArea', () => {
  const minBrief = {
    id: 'test-dungeon', name: 'Test Dungeon',
    width: 40, height: 30, theme: 'dungeon',
    dungeonConfig: { minRooms: 3, maxRooms: 5, corridorWidth: 2 },
    enemies: [], exits: [], npcs: [],
  }

  it('returns an area with correct dimensions', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.width).toBe(40)
    expect(area.height).toBe(30)
  })

  it('generates rooms', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.rooms.length).toBeGreaterThanOrEqual(3)
    expect(area.rooms.length).toBeLessThanOrEqual(5)
  })

  it('has floor tiles in rooms', () => {
    const area = buildDungeonArea(minBrief, 42)
    const floorCount = area.layers.floor.filter(v => v > 0).length
    expect(floorCount).toBeGreaterThan(0)
  })

  it('has wall edges on room boundaries', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.wallEdges).toBeInstanceOf(Uint8Array)
    const wallCount = area.wallEdges.filter(v => v > 0).length
    expect(wallCount).toBeGreaterThan(0)
  })

  it('places enemies with position keywords', () => {
    const brief = {
      ...minBrief,
      enemies: [
        { name: 'Goblin', position: 'random_room', count: 3, stats: { hp: 7, ac: 15, speed: 30 }, attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }] },
        { name: 'Bugbear', position: 'boss_room', count: 1, stats: { hp: 27, ac: 16, speed: 30 }, attacks: [{ name: 'Morningstar', bonus: '+4', damage: '2d8+2' }] },
      ],
    }
    const area = buildDungeonArea(brief, 42)
    expect(area.enemies.length).toBe(4)
    area.enemies.forEach(e => {
      expect(e.position).toBeDefined()
      expect(e.position.x).toBeGreaterThanOrEqual(0)
      expect(e.position.y).toBeGreaterThanOrEqual(0)
    })
  })
})
