import { describe, it, expect } from 'vitest'
import { generateDungeon } from './dungeonGenerator.js'

describe('generateDungeon', () => {
  it('generates rooms and corridors for a given area size', () => {
    const result = generateDungeon(50, 40, { minRooms: 4, maxRooms: 8, seed: 42 })
    expect(result.rooms.length).toBeGreaterThanOrEqual(4)
    expect(result.rooms.length).toBeLessThanOrEqual(8)
    for (const room of result.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0)
      expect(room.y).toBeGreaterThanOrEqual(0)
      expect(room.x + room.width).toBeLessThanOrEqual(50)
      expect(room.y + room.height).toBeLessThanOrEqual(40)
    }
    expect(result.corridors.length).toBeGreaterThan(0)
  })

  it('rooms do not overlap', () => {
    const result = generateDungeon(50, 40, { seed: 123 })
    for (let i = 0; i < result.rooms.length; i++) {
      for (let j = i + 1; j < result.rooms.length; j++) {
        const a = result.rooms[i]
        const b = result.rooms[j]
        const overlap = a.x < b.x + b.width && a.x + a.width > b.x &&
                        a.y < b.y + b.height && a.y + a.height > b.y
        expect(overlap).toBe(false)
      }
    }
  })

  it('places doors at corridor-room junctions', () => {
    const result = generateDungeon(50, 40, { seed: 42 })
    expect(result.doors.length).toBeGreaterThan(0)
  })

  it('is deterministic with same seed', () => {
    const r1 = generateDungeon(50, 40, { seed: 999 })
    const r2 = generateDungeon(50, 40, { seed: 999 })
    expect(r1.rooms.length).toBe(r2.rooms.length)
    expect(r1.rooms[0].x).toBe(r2.rooms[0].x)
    expect(r1.rooms[0].y).toBe(r2.rooms[0].y)
  })
})
