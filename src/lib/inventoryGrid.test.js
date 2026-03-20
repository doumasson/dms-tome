import { describe, it, expect } from 'vitest'
import { GridPacker } from './inventoryGrid.js'

describe('GridPacker', () => {
  it('places 1x1 item at 0,0', () => {
    const g = new GridPacker(10, 7)
    const pos = g.findSlot(1, 1)
    expect(pos).toEqual({ col: 0, row: 0 })
  })
  it('places items left-to-right, top-to-bottom', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 1)
    const pos = g.findSlot(1, 1)
    expect(pos).toEqual({ col: 2, row: 0 })
  })
  it('returns null when grid is full', () => {
    const g = new GridPacker(2, 2)
    g.place('a', 0, 0, 2, 2)
    expect(g.findSlot(1, 1)).toBeNull()
  })
  it('rejects overlapping placement', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 2)
    expect(g.canPlace(1, 1, 1, 1)).toBe(false)
    expect(g.canPlace(2, 0, 1, 1)).toBe(true)
  })
  it('clears item cells on remove', () => {
    const g = new GridPacker(10, 7)
    g.place('a', 0, 0, 2, 2)
    g.remove('a')
    expect(g.canPlace(0, 0, 2, 2)).toBe(true)
  })
  it('packs multiple items without overlap', () => {
    const g = new GridPacker(10, 7)
    const items = [
      { id: 'a', w: 2, h: 3 },
      { id: 'b', w: 1, h: 1 },
      { id: 'c', w: 2, h: 2 },
    ]
    for (const item of items) {
      const pos = g.findSlot(item.w, item.h)
      expect(pos).not.toBeNull()
      g.place(item.id, pos.col, pos.row, item.w, item.h)
    }
    expect(g.canPlace(0, 0, 1, 1)).toBe(false)
  })
})
