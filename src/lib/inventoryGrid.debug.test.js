/**
 * Debug test: reproduce the EXACT inventory bugs from screenshots.
 *
 * User's 3 items:
 *   - Shortsword (properties: ['finesse', 'light']) → weapon_light → [1, 2]
 *   - Healing Potion (type: 'consumable') → [1, 1]
 *   - Some gear item (type: 'gear') → [1, 1]
 *
 * Bug 1: "stair stepping" after reset — items placed diagonally
 * Bug 2: ghost appears "2+ spaces below" cursor
 * Bug 3: drop lands in wrong cell
 * Bug 4: moving one item causes others to move
 */

import { describe, it, expect } from 'vitest'
import { GridPacker, getItemSize } from './inventoryGrid'

const GRID_COLS = 10
const GRID_ROWS = 7
const CELL_PX = 36

function itemKey(i) { return i.instanceId || i.name }

function packItems(items) {
  const packer = new GridPacker(GRID_COLS, GRID_ROWS)
  const placed = []
  const overflow = []

  const hasGridPos = i => i._gridCol != null && i._gridRow != null
    && Number.isFinite(i._gridCol) && Number.isFinite(i._gridRow)
  const preferred = items
    .filter(hasGridPos)
    .sort((a, b) => a._gridRow !== b._gridRow ? a._gridRow - b._gridRow : a._gridCol - b._gridCol)

  for (const item of preferred) {
    const [w, h] = getItemSize(item)
    const col = Math.min(item._gridCol, GRID_COLS - w)
    const row = Math.min(item._gridRow, GRID_ROWS - h)
    if (packer.canPlace(col, row, w, h)) {
      packer.place(itemKey(item), col, row, w, h)
      placed.push({ item, col, row, w, h })
    } else {
      const slot = packer.findSlot(w, h)
      if (slot) {
        packer.place(itemKey(item), slot.col, slot.row, w, h)
        placed.push({ item, col: slot.col, row: slot.row, w, h })
      } else overflow.push(item)
    }
  }

  for (const item of items.filter(i => !hasGridPos(i))) {
    const [w, h] = getItemSize(item)
    const slot = packer.findSlot(w, h)
    if (slot) {
      packer.place(itemKey(item), slot.col, slot.row, w, h)
      placed.push({ item, col: slot.col, row: slot.row, w, h })
    } else overflow.push(item)
  }

  return { placed, overflow }
}

function cursorToCell(px, py, w, h) {
  return {
    col: Math.max(0, Math.min(Math.floor(px / CELL_PX), GRID_COLS - w)),
    row: Math.max(0, Math.min(Math.floor(py / CELL_PX), GRID_ROWS - h)),
  }
}

// Simulate commitDrop
function simulateDrop(inventory, dragKey, ghostCol, ghostRow) {
  const { placed: fresh } = packItems(inventory)
  const dragPlaced = fresh.find(p => itemKey(p.item) === dragKey)
  if (!dragPlaced) return { success: false, reason: 'item not found in placed' }

  const packer = new GridPacker(GRID_COLS, GRID_ROWS)
  for (const p of fresh) {
    if (itemKey(p.item) === dragKey) continue
    packer.place(itemKey(p.item), p.col, p.row, p.w, p.h)
  }

  if (!packer.canPlace(ghostCol, ghostRow, dragPlaced.w, dragPlaced.h)) {
    return { success: false, reason: 'cannot place at target' }
  }

  const posMap = new Map()
  for (const p of fresh) {
    if (itemKey(p.item) === dragKey) continue
    posMap.set(itemKey(p.item), { col: p.col, row: p.row })
  }
  posMap.set(dragKey, { col: ghostCol, row: ghostRow })

  const newInventory = inventory.map(i => {
    const pos = posMap.get(itemKey(i))
    return pos ? { ...i, _gridCol: pos.col, _gridRow: pos.row } : i
  })

  return { success: true, newInventory }
}


describe('Inventory Debug — Reproduce User Bugs', () => {
  const sword = {
    instanceId: 'sword-1',
    name: 'Shortsword',
    damage: '1d6',
    damageType: 'piercing',
    properties: ['finesse', 'light'],
    weight: 2,
  }
  const potion = {
    instanceId: 'potion-1',
    name: 'Healing Potion',
    type: 'consumable',
    effect: 'heal',
    weight: 0.5,
  }
  const gear = {
    instanceId: 'gear-1',
    name: 'Thieves Tools',
    type: 'gear',
    weight: 0.5,
  }

  it('getItemSize returns correct sizes', () => {
    expect(getItemSize(sword)).toEqual([1, 2])
    expect(getItemSize(potion)).toEqual([1, 1])
    expect(getItemSize(gear)).toEqual([1, 1])
  })

  it('BUG 1: fresh pack should NOT stair-step', () => {
    // Items with NO saved positions — should auto-pack left-to-right, top-to-bottom
    const items = [sword, potion, gear]
    const { placed } = packItems(items)

    console.log('=== FRESH PACK (no saved positions) ===')
    for (const p of placed) {
      console.log(`  ${p.item.name}: col=${p.col}, row=${p.row}, size=${p.w}x${p.h}`)
    }

    // Sword is 1x2, should go at (0,0). Potion 1x1 at (1,0). Gear 1x1 at (2,0).
    const swordP = placed.find(p => p.item.name === 'Shortsword')
    const potionP = placed.find(p => p.item.name === 'Healing Potion')
    const gearP = placed.find(p => p.item.name === 'Thieves Tools')

    // They should all be in the top row, NOT stair-stepping
    expect(swordP.col).toBe(0)
    expect(swordP.row).toBe(0)
    expect(potionP.col).toBe(1)
    expect(potionP.row).toBe(0)
    expect(gearP.col).toBe(2)
    expect(gearP.row).toBe(0)
  })

  it('BUG 1b: pack with saved positions reproduces stair-step', () => {
    // What if items have stale _gridCol/_gridRow from previous bugs?
    const items = [
      { ...sword, _gridCol: 0, _gridRow: 0 },
      { ...potion, _gridCol: 1, _gridRow: 1 },
      { ...gear, _gridCol: 0, _gridRow: 2 },
    ]
    const { placed } = packItems(items)

    console.log('=== PACK WITH STALE POSITIONS ===')
    for (const p of placed) {
      console.log(`  ${p.item.name}: col=${p.col}, row=${p.row}`)
    }

    // They'd be placed at their saved positions — this IS the stair-step
    expect(placed.find(p => p.item.name === 'Shortsword').col).toBe(0)
    expect(placed.find(p => p.item.name === 'Shortsword').row).toBe(0)
    expect(placed.find(p => p.item.name === 'Healing Potion').col).toBe(1)
    expect(placed.find(p => p.item.name === 'Healing Potion').row).toBe(1)
    expect(placed.find(p => p.item.name === 'Thieves Tools').col).toBe(0)
    expect(placed.find(p => p.item.name === 'Thieves Tools').row).toBe(2)
  })

  it('cursorToCell: cursor at pixel (50, 10) for 1x2 item → cell (1, 0)', () => {
    const cell = cursorToCell(50, 10, 1, 2)
    expect(cell).toEqual({ col: 1, row: 0 })
  })

  it('cursorToCell: cursor at pixel (50, 80) for 1x2 item → cell (1, 2)', () => {
    const cell = cursorToCell(50, 80, 1, 2)
    expect(cell).toEqual({ col: 1, row: 2 })
  })

  it('BUG 4: moving sword should NOT move potion or gear', () => {
    // Start: all items have saved positions
    const items = [
      { ...sword, _gridCol: 0, _gridRow: 0 },
      { ...potion, _gridCol: 1, _gridRow: 0 },
      { ...gear, _gridCol: 2, _gridRow: 0 },
    ]

    // Drag sword to (4, 0)
    const result = simulateDrop(items, 'sword-1', 4, 0)
    expect(result.success).toBe(true)

    console.log('=== AFTER MOVING SWORD TO (4,0) ===')
    for (const i of result.newInventory) {
      console.log(`  ${i.name}: _gridCol=${i._gridCol}, _gridRow=${i._gridRow}`)
    }

    // Potion and gear should NOT have moved
    const newPotion = result.newInventory.find(i => i.name === 'Healing Potion')
    const newGear = result.newInventory.find(i => i.name === 'Thieves Tools')
    const newSword = result.newInventory.find(i => i.name === 'Shortsword')

    expect(newSword._gridCol).toBe(4)
    expect(newSword._gridRow).toBe(0)
    expect(newPotion._gridCol).toBe(1)
    expect(newPotion._gridRow).toBe(0)
    expect(newGear._gridCol).toBe(2)
    expect(newGear._gridRow).toBe(0)
  })

  it('BUG 4b: moving sword when other items lack positions', () => {
    // Items WITHOUT saved positions — auto-pack, then drag
    const items = [sword, potion, gear] // no _gridCol/_gridRow

    // First pack to get positions
    const { placed: initial } = packItems(items)
    console.log('=== INITIAL AUTO-PACK ===')
    for (const p of initial) {
      console.log(`  ${p.item.name}: col=${p.col}, row=${p.row}`)
    }

    // NOW simulate drop — commitDrop calls packItems internally on items WITHOUT positions
    const result = simulateDrop(items, 'sword-1', 4, 0)
    expect(result.success).toBe(true)

    console.log('=== AFTER DROP (items had no saved positions) ===')
    for (const i of result.newInventory) {
      console.log(`  ${i.name}: _gridCol=${i._gridCol}, _gridRow=${i._gridRow}`)
    }

    // After drop, ALL items should have positions saved
    // Potion and gear should be at their auto-packed positions (1,0) and (2,0)
    // Sword should be at the drop target (4,0)
    const newSword = result.newInventory.find(i => i.name === 'Shortsword')
    const newPotion = result.newInventory.find(i => i.name === 'Healing Potion')
    const newGear = result.newInventory.find(i => i.name === 'Thieves Tools')

    expect(newSword._gridCol).toBe(4)
    expect(newSword._gridRow).toBe(0)
    expect(newPotion._gridCol).toBe(1)
    expect(newPotion._gridRow).toBe(0)
    expect(newGear._gridCol).toBe(2)
    expect(newGear._gridRow).toBe(0)
  })

  it('Equip then unequip: item should auto-pack to first open slot', () => {
    // Start with all 3 items positioned
    const items = [
      { ...sword, _gridCol: 0, _gridRow: 0 },
      { ...potion, _gridCol: 1, _gridRow: 0 },
      { ...gear, _gridCol: 2, _gridRow: 0 },
    ]

    // Equip sword = remove from inventory
    const afterEquip = items.filter(i => i.instanceId !== 'sword-1')
    const { placed: equipPlaced } = packItems(afterEquip)

    console.log('=== AFTER EQUIPPING SWORD ===')
    for (const p of equipPlaced) {
      console.log(`  ${p.item.name}: col=${p.col}, row=${p.row}`)
    }

    // Potion and gear should NOT move
    expect(equipPlaced.find(p => p.item.name === 'Healing Potion').col).toBe(1)
    expect(equipPlaced.find(p => p.item.name === 'Healing Potion').row).toBe(0)
    expect(equipPlaced.find(p => p.item.name === 'Thieves Tools').col).toBe(2)
    expect(equipPlaced.find(p => p.item.name === 'Thieves Tools').row).toBe(0)

    // Unequip sword = add back WITHOUT _gridCol/_gridRow
    const unequippedSword = { ...sword } // no _gridCol/_gridRow
    const afterUnequip = [...afterEquip, unequippedSword]
    const { placed: unequipPlaced } = packItems(afterUnequip)

    console.log('=== AFTER UNEQUIPPING SWORD ===')
    for (const p of unequipPlaced) {
      console.log(`  ${p.item.name}: col=${p.col}, row=${p.row}`)
    }

    // Sword should auto-pack to first available slot: (0,0) is free
    const swordP = unequipPlaced.find(p => p.item.name === 'Shortsword')
    expect(swordP.col).toBe(0)
    expect(swordP.row).toBe(0)

    // Others should NOT have moved
    expect(unequipPlaced.find(p => p.item.name === 'Healing Potion').col).toBe(1)
    expect(unequipPlaced.find(p => p.item.name === 'Healing Potion').row).toBe(0)
    expect(unequipPlaced.find(p => p.item.name === 'Thieves Tools').col).toBe(2)
    expect(unequipPlaced.find(p => p.item.name === 'Thieves Tools').row).toBe(0)
  })
})
