import { describe, it, expect } from 'vitest'
import {
  generateLoot,
  generateTreasureHoard,
  getRarityColor,
  getRarityName,
  ITEM_RARITY,
  RARITY_COLORS,
} from './lootTables'

describe('Loot Tables', () => {
  it('generateLoot returns valid loot object', () => {
    const loot = generateLoot(5, 'Medium', 4)
    expect(loot).toBeDefined()
    expect(loot.gold).toBeGreaterThanOrEqual(0)
    expect(loot.platinum).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(loot.magicItems)).toBe(true)
  })

  it('generateLoot gold increases with difficulty', () => {
    const easy = generateLoot(5, 'Easy', 4)
    const hard = generateLoot(5, 'Hard', 4)
    expect(hard.gold + hard.platinum * 10).toBeGreaterThanOrEqual(easy.gold + easy.platinum * 10)
  })

  it('generateLoot gold decreases with more party members', () => {
    const small = generateLoot(5, 'Medium', 2)
    const large = generateLoot(5, 'Medium', 6)
    const smallPerPerson = (small.gold + small.platinum * 10) / 2
    const largePerPerson = (large.gold + large.platinum * 10) / 6
    expect(smallPerPerson).toBeGreaterThanOrEqual(largePerPerson)
  })

  it('generateLoot higher levels get better items', () => {
    const lowLevel = generateLoot(1, 'Hard', 4)
    const highLevel = generateLoot(20, 'Hard', 4)
    expect(highLevel.magicItems.length).toBeGreaterThanOrEqual(lowLevel.magicItems.length)
  })

  it('generateLoot deadly encounters have higher item drop rate', () => {
    let deadlyItems = 0
    for (let i = 0; i < 20; i++) {
      const loot = generateLoot(10, 'Deadly', 4)
      if (loot.magicItems.length > 0) deadlyItems++
    }
    expect(deadlyItems).toBeGreaterThan(5)
  })

  it('generateTreasureHoard returns valid hoard', () => {
    const hoard = generateTreasureHoard(5)
    expect(hoard).toBeDefined()
    expect(hoard.gold).toBeGreaterThanOrEqual(0)
    expect(hoard.platinum).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(hoard.magicItems)).toBe(true)
    expect(hoard.totalValue).toBeGreaterThan(0)
    expect(hoard.estimatedValue).toBeGreaterThan(0)
  })

  it('generateTreasureHoard scales with CR', () => {
    const lowCR = generateTreasureHoard(2)
    const highCR = generateTreasureHoard(16)
    expect(highCR.estimatedValue).toBeGreaterThan(lowCR.estimatedValue)
  })

  it('getRarityColor returns valid hex color', () => {
    expect(getRarityColor(ITEM_RARITY.COMMON)).toMatch(/^#[0-9a-f]{6}$/i)
    expect(getRarityColor(ITEM_RARITY.LEGENDARY)).toMatch(/^#[0-9a-f]{6}$/i)
    expect(getRarityColor('unknown')).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('getRarityName returns readable names', () => {
    expect(getRarityName(ITEM_RARITY.COMMON)).toBe('Common')
    expect(getRarityName(ITEM_RARITY.LEGENDARY)).toBe('Legendary')
    expect(getRarityName('unknown')).toBe('Unknown')
  })

  it('RARITY_COLORS has all rarities', () => {
    expect(RARITY_COLORS[ITEM_RARITY.COMMON]).toBeDefined()
    expect(RARITY_COLORS[ITEM_RARITY.UNCOMMON]).toBeDefined()
    expect(RARITY_COLORS[ITEM_RARITY.RARE]).toBeDefined()
    expect(RARITY_COLORS[ITEM_RARITY.VERY_RARE]).toBeDefined()
    expect(RARITY_COLORS[ITEM_RARITY.LEGENDARY]).toBeDefined()
  })

  it('magic items in loot have all required fields', () => {
    const loot = generateLoot(10, 'Hard', 4)
    for (const item of loot.magicItems) {
      expect(item.name).toBeDefined()
      expect(item.rarity).toBeDefined()
      expect(item.value).toBeGreaterThan(0)
      expect(item.id).toBeDefined()
    }
  })

  it('levels 1-20 all have valid loot', () => {
    for (let level = 1; level <= 20; level++) {
      const loot = generateLoot(level, 'Medium', 4)
      expect(loot.gold).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(loot.magicItems)).toBe(true)
    }
  })
})
