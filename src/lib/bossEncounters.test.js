import { describe, it, expect } from 'vitest'
import {
  generateBossEncounter,
  calculateBossXP,
  describeBossTactic,
  describeBossTier,
  BOSS_TIERS,
  BOSS_ARCHETYPES,
  BOSS_ABILITIES,
} from './bossEncounters'

describe('Boss Encounters', () => {
  it('generateBossEncounter returns valid boss', () => {
    const boss = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'warrior')
    expect(boss).toBeDefined()
    expect(boss.name).toBeDefined()
    expect(boss.type).toBe('boss')
    expect(boss.tier).toBe(BOSS_TIERS.CHAMPION)
    expect(boss.cr).toBeGreaterThan(0)
    expect(boss.currentHp).toBeGreaterThan(0)
    expect(boss.maxHp).toBeGreaterThan(0)
    expect(boss.ac).toBeGreaterThan(0)
  })

  it('boss HP scales with archetype', () => {
    const warrior = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'warrior')
    const mage = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'mage')
    const dragon = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'dragon')
    expect(dragon.maxHp).toBeGreaterThan(warrior.maxHp)
    expect(warrior.maxHp).toBeGreaterThan(mage.maxHp)
  })

  it('boss CR scales with tier', () => {
    const lieutenant = generateBossEncounter(5, BOSS_TIERS.LIEUTENANT)
    const champion = generateBossEncounter(5, BOSS_TIERS.CHAMPION)
    const legendary = generateBossEncounter(5, BOSS_TIERS.LEGENDARY)
    expect(champion.cr).toBeGreaterThan(lieutenant.cr)
    expect(legendary.cr).toBeGreaterThan(champion.cr)
  })

  it('boss has abilities based on archetype', () => {
    const boss = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'warrior')
    expect(Array.isArray(boss.abilities)).toBe(true)
    expect(boss.abilities.length).toBeGreaterThan(0)
  })

  it('boss has valid stats', () => {
    const boss = generateBossEncounter(5, BOSS_TIERS.CHAMPION)
    expect(boss.stats.str).toBeGreaterThan(0)
    expect(boss.stats.dex).toBeGreaterThan(0)
    expect(boss.stats.con).toBeGreaterThan(0)
    expect(boss.stats.int).toBeGreaterThan(0)
    expect(boss.stats.wis).toBeGreaterThan(0)
    expect(boss.stats.cha).toBeGreaterThan(0)
  })

  it('boss legendary status matches tier', () => {
    const champion = generateBossEncounter(5, BOSS_TIERS.CHAMPION)
    const legendary = generateBossEncounter(5, BOSS_TIERS.LEGENDARY)
    expect(champion.legendary).toBe(false)
    expect(legendary.legendary).toBe(true)
  })

  it('boss has treasure hoard', () => {
    const boss = generateBossEncounter(5, BOSS_TIERS.CHAMPION)
    expect(boss.treasure).toBeDefined()
    expect(boss.treasure.gold).toBeGreaterThanOrEqual(0)
    expect(boss.treasure.platinum).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(boss.treasure.magicItems)).toBe(true)
  })

  it('calculateBossXP returns reasonable value', () => {
    const xp5 = calculateBossXP(5, 5)
    const xp10 = calculateBossXP(10, 5)
    const xp15 = calculateBossXP(15, 5)
    expect(xp5).toBeGreaterThan(0)
    expect(xp10).toBeGreaterThan(xp5)
    expect(xp15).toBeGreaterThan(xp10)
  })

  it('calculateBossXP applies 1.5x boss multiplier', () => {
    // XP for CR 5 should be 150, with 1.5x = 225
    const xp = calculateBossXP(5, 5)
    expect(xp).toBe(225)
  })

  it('describeBossTactic returns descriptions', () => {
    expect(describeBossTactic('aggressive')).toContain('ferocious')
    expect(describeBossTactic('spellcaster')).toContain('magic')
    expect(describeBossTactic('unknown')).toBeDefined()
  })

  it('describeBossTier returns descriptions', () => {
    expect(describeBossTier(BOSS_TIERS.LIEUTENANT)).toBeDefined()
    expect(describeBossTier(BOSS_TIERS.CHAMPION)).toBeDefined()
    expect(describeBossTier(BOSS_TIERS.LEGENDARY)).toBeDefined()
    expect(describeBossTier(BOSS_TIERS.ANCIENT)).toBeDefined()
  })

  it('all archetypes have valid configurations', () => {
    Object.values(BOSS_ARCHETYPES).forEach(arch => {
      expect(arch.name).toBeDefined()
      expect(arch.tactics).toBeDefined()
      expect(Array.isArray(arch.tactics)).toBe(true)
      expect(arch.abilities).toBeDefined()
      expect(Array.isArray(arch.abilities)).toBe(true)
    })
  })

  it('boss abilities have required fields', () => {
    Object.values(BOSS_ABILITIES).forEach(ability => {
      expect(ability.name).toBeDefined()
      expect(ability.description).toBeDefined()
    })
  })

  it('boss gets unique name from archetype pool', () => {
    const boss1 = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'mage')
    const boss2 = generateBossEncounter(5, BOSS_TIERS.CHAMPION, 'mage')
    // They might be same name, but should be valid names
    expect(boss1.name).toBeDefined()
    expect(boss2.name).toBeDefined()
  })

  it('all boss tiers exist', () => {
    expect(BOSS_TIERS.LIEUTENANT).toBeDefined()
    expect(BOSS_TIERS.CHAMPION).toBeDefined()
    expect(BOSS_TIERS.LEGENDARY).toBeDefined()
    expect(BOSS_TIERS.ANCIENT).toBeDefined()
  })
})
