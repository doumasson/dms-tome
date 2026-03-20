import { describe, it, expect } from 'vitest'
import { canBuy, calculateSellPrice, buyItem, sellItem } from './shopSystem.js'

describe('canBuy', () => {
  it('returns true when player has exactly enough gold', () => {
    expect(canBuy(50, 50)).toBe(true)
  })

  it('returns true when player has more than enough gold', () => {
    expect(canBuy(100, 50)).toBe(true)
  })

  it('returns false when player has insufficient gold', () => {
    expect(canBuy(30, 50)).toBe(false)
  })

  it('returns false when player has zero gold', () => {
    expect(canBuy(0, 10)).toBe(false)
  })

  it('returns false when price is higher than gold by 1', () => {
    expect(canBuy(49, 50)).toBe(false)
  })
})

describe('calculateSellPrice', () => {
  it('returns half the base price (floored)', () => {
    expect(calculateSellPrice(100)).toBe(50)
  })

  it('floors odd prices', () => {
    expect(calculateSellPrice(7)).toBe(3)
  })

  it('returns minimum 1 gold for very cheap items', () => {
    expect(calculateSellPrice(1)).toBe(1)
  })

  it('returns 1 for a 0-price item', () => {
    expect(calculateSellPrice(0)).toBe(1)
  })

  it('returns 1 for a fractional result below 1', () => {
    // price 1 → floor(0.5) = 0 → clamped to 1
    expect(calculateSellPrice(1)).toBe(1)
  })
})

describe('buyItem', () => {
  const sword = { name: 'Longsword', price: 15, type: 'weapon_one_handed' }

  it('returns success with updated gold when purchase is valid', () => {
    const result = buyItem(sword, 50)
    expect(result.success).toBe(true)
    expect(result.newGold).toBe(35)
    expect(result.item).toEqual(sword)
  })

  it('returns failure with reason when gold is insufficient', () => {
    const result = buyItem(sword, 10)
    expect(result.success).toBe(false)
    expect(result.reason).toBeDefined()
    expect(result.newGold).toBeUndefined()
  })

  it('deducts exact price leaving zero gold', () => {
    const result = buyItem(sword, 15)
    expect(result.success).toBe(true)
    expect(result.newGold).toBe(0)
  })
})

describe('sellItem', () => {
  const potion = { name: 'Healing Potion', price: 50, type: 'potion' }

  it('always returns success with gold gained', () => {
    const result = sellItem(potion)
    expect(result.success).toBe(true)
    expect(result.goldGained).toBe(25)
  })

  it('returns minimum 1 gold for very cheap items', () => {
    const result = sellItem({ name: 'Pebble', price: 1, type: 'default' })
    expect(result.success).toBe(true)
    expect(result.goldGained).toBe(1)
  })

  it('floors sell price correctly', () => {
    const result = sellItem({ name: 'Odd Item', price: 9, type: 'default' })
    expect(result.success).toBe(true)
    expect(result.goldGained).toBe(4)
  })
})
