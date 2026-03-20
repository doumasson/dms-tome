import { describe, it, expect } from 'vitest'
import { RoofManager } from './RoofLayer.js'

describe('RoofManager', () => {
  it('tracks roof reveal state per building', () => {
    const mgr = new RoofManager()
    expect(mgr.isRevealed('inn')).toBe(false)
    mgr.setRevealed('inn', true)
    expect(mgr.isRevealed('inn')).toBe(true)
  })

  it('detects when a position is inside a building', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [{ x: 15, y: 19, facing: 'south' }],
    })

    expect(mgr.getBuildingAt(12, 15)).toBe('inn')
    expect(mgr.getBuildingAt(5, 5)).toBeNull()
  })

  it('detects door tiles', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [{ x: 15, y: 19, facing: 'south' }],
    })

    expect(mgr.isDoor(15, 19)).toBe(true)
    expect(mgr.isDoor(12, 12)).toBe(false)
  })

  it('determines if all party members are outside a building', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [],
    })

    const partyPositions = [
      { x: 12, y: 15 },
      { x: 5, y: 5 },
    ]
    expect(mgr.allOutside('inn', partyPositions)).toBe(false)

    const allOut = [
      { x: 5, y: 5 },
      { x: 3, y: 3 },
    ]
    expect(mgr.allOutside('inn', allOut)).toBe(true)
  })

  it('updates reveal states based on party positions', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [],
    })

    // Party member inside
    let changes = mgr.updateRevealStates([{ x: 12, y: 15 }])
    expect(changes).toEqual([{ buildingId: 'inn', revealed: true }])
    expect(mgr.isRevealed('inn')).toBe(true)

    // Party leaves
    changes = mgr.updateRevealStates([{ x: 5, y: 5 }])
    expect(changes).toEqual([{ buildingId: 'inn', revealed: false }])
    expect(mgr.isRevealed('inn')).toBe(false)
  })

  it('accepts flat x/y format from areaBuilder', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({ id: 'shop', x: 5, y: 10, width: 8, height: 6, doors: [] })
    expect(mgr.getBuildingAt(8, 13)).toBe('shop')
    expect(mgr.getBuildingAt(0, 0)).toBeNull()
  })

  it('returns correct roof alpha', () => {
    const mgr = new RoofManager()
    mgr.registerBuilding({ id: 'inn', position: { x: 0, y: 0 }, width: 10, height: 10, doors: [] })
    expect(mgr.getRoofAlpha('inn')).toBe(1)
    mgr.setRevealed('inn', true)
    expect(mgr.getRoofAlpha('inn')).toBe(0)
  })
})
