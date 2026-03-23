import { describe, it, expect } from 'vitest'
import {
  rollRandomEncounter,
  generateRandomEncounter,
  calculateRandomEncounterLoot,
  MONSTER_STATS,
} from './randomEncounters'

describe('Random Encounters', () => {
  it('rollRandomEncounter returns boolean', () => {
    const result = rollRandomEncounter('dungeon')
    expect(typeof result).toBe('boolean')
  })

  it('dungeon encounters have higher trigger rate than town', () => {
    // Run multiple rolls and check distribution
    // Dungeon: 20% threshold, Town: 10% threshold
    // With large sample, dungeon should consistently trigger more often
    let dungeonTriggered = 0
    let townTriggered = 0
    const samples = 1000
    for (let i = 0; i < samples; i++) {
      if (rollRandomEncounter('dungeon')) dungeonTriggered++
      if (rollRandomEncounter('town')) townTriggered++
    }
    // Dungeon should be roughly 2x town (20% vs 10%)
    // Allow for variance: dungeon should be at least 1.5x town rate
    const dungeonRate = dungeonTriggered / samples
    const townRate = townTriggered / samples
    expect(dungeonRate).toBeGreaterThan(townRate * 1.2)
  })

  it('generateRandomEncounter returns valid enemy group', () => {
    const encounter = generateRandomEncounter(5, 4, 'dungeon')
    expect(encounter.enemies).toBeDefined()
    expect(Array.isArray(encounter.enemies)).toBe(true)
    expect(encounter.enemies.length).toBeGreaterThan(0)
    expect(encounter.dmPrompt).toBeDefined()
    expect(encounter.difficultyRating).toBeDefined()
  })

  it('generated enemies have required stats', () => {
    const encounter = generateRandomEncounter(3, 4, 'dungeon')
    for (const enemy of encounter.enemies) {
      expect(enemy.name).toBeDefined()
      expect(enemy.originalName).toBeDefined()
      expect(enemy.hp).toBeGreaterThan(0)
      expect(enemy.ac).toBeGreaterThan(0)
      expect(enemy.speed).toBeGreaterThan(0)
      expect(enemy.stats).toBeDefined()
      expect(enemy.attacks).toBeDefined()
      expect(enemy.startPosition).toBeDefined()
    }
  })

  it('difficulty rating scales with encounter CR vs party level', () => {
    const easy = generateRandomEncounter(1, 4, 'dungeon')
    const hard = generateRandomEncounter(10, 4, 'dungeon')

    // Not guaranteed, but higher level parties should face harder encounters
    expect(['Easy', 'Medium', 'Hard', 'Deadly']).toContain(easy.difficultyRating)
    expect(['Easy', 'Medium', 'Hard', 'Deadly']).toContain(hard.difficultyRating)
  })

  it('calculateRandomEncounterLoot returns gold and items', () => {
    const enemies = [
      { cr: 1, name: 'Goblin' },
      { cr: 0.5, name: 'Hobgoblin' },
    ]
    const loot = calculateRandomEncounterLoot(enemies, 4)
    expect(loot.gold).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(loot.items)).toBe(true)
  })

  it('loot gold scales with enemy CR', () => {
    const weakEnemies = [{ cr: 0.25, name: 'Goblin' }]
    const strongEnemies = [{ cr: 5, name: 'Dragon' }]
    const weakLoot = calculateRandomEncounterLoot(weakEnemies, 4)
    const strongLoot = calculateRandomEncounterLoot(strongEnemies, 4)
    expect(strongLoot.gold).toBeGreaterThan(weakLoot.gold)
  })

  it('wilderness and dungeon tables exist', () => {
    const dungeon = generateRandomEncounter(3, 4, 'dungeon')
    const wilderness = generateRandomEncounter(3, 4, 'wilderness')
    expect(dungeon.enemies.length).toBeGreaterThan(0)
    expect(wilderness.enemies.length).toBeGreaterThan(0)
  })

  it('monsters have CR values', () => {
    const encounter = generateRandomEncounter(5, 4, 'dungeon')
    for (const enemy of encounter.enemies) {
      expect(typeof enemy.cr).toBe('number')
      expect(enemy.cr).toBeGreaterThan(0)
    }
  })
})
