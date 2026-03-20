import { describe, it, expect } from 'vitest'
import { resolveSchedulePosition, getNpcMovements } from './npcScheduler.js'

describe('resolveSchedulePosition', () => {
  const schedule = [
    { time: 'dawn', position: 'kitchen' },
    { time: 'day', position: 'bar_counter' },
    { time: 'night', position: 'bedroom' },
  ]
  it('returns day position for day time', () => {
    expect(resolveSchedulePosition(schedule, 'day').position).toBe('bar_counter')
  })
  it('returns night position for night', () => {
    expect(resolveSchedulePosition(schedule, 'night').position).toBe('bedroom')
  })
  it('falls back to nearest earlier time for unmatched', () => {
    expect(resolveSchedulePosition(schedule, 'dusk').position).toBe('bar_counter')
  })
})

describe('getNpcMovements', () => {
  it('returns movements for NPCs that need to move', () => {
    const npcs = [{ name: 'Hilda', schedule: [{ time: 'day', position: 'bar' }], position: { x: 0, y: 0 } }]
    const pois = { bar: { x: 5, y: 5 } }
    const moves = getNpcMovements(npcs, 'day', pois)
    expect(moves).toHaveLength(1)
    expect(moves[0].targetPosition).toEqual({ x: 5, y: 5 })
  })
  it('skips NPCs already at target', () => {
    const npcs = [{ name: 'Hilda', schedule: [{ time: 'day', position: 'bar' }], position: { x: 5, y: 5 } }]
    const pois = { bar: { x: 5, y: 5 } }
    expect(getNpcMovements(npcs, 'day', pois)).toHaveLength(0)
  })
})
