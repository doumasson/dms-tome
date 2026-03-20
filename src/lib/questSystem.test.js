import { describe, it, expect } from 'vitest'
import { createQuest, completeObjective, isQuestComplete } from './questSystem.js'

describe('createQuest', () => {
  it('creates quest with active status', () => {
    const q = createQuest('Find the sword', [{ text: 'Go to cave' }])
    expect(q.status).toBe('active')
    expect(q.objectives).toHaveLength(1)
    expect(q.objectives[0].completed).toBe(false)
  })
})

describe('completeObjective', () => {
  it('marks objective as completed', () => {
    const q = createQuest('Test', [{ text: 'Step 1' }, { text: 'Step 2' }])
    const updated = completeObjective(q, q.objectives[0].id)
    expect(updated.objectives[0].completed).toBe(true)
    expect(updated.objectives[1].completed).toBe(false)
  })
})

describe('isQuestComplete', () => {
  it('returns true when all objectives done', () => {
    expect(isQuestComplete({ objectives: [{ completed: true }, { completed: true }] })).toBe(true)
  })
  it('returns false when some incomplete', () => {
    expect(isQuestComplete({ objectives: [{ completed: true }, { completed: false }] })).toBe(false)
  })
})
