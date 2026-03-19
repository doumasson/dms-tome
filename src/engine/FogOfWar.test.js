import { describe, it, expect } from 'vitest'
import { buildFogTileStates, updateExplored } from './FogOfWar.js'

describe('buildFogTileStates', () => {
  it('marks active, explored, and unexplored tiles correctly', () => {
    const active = new Set(['2,2', '3,3'])
    const explored = new Set(['2,2', '5,5'])
    const states = buildFogTileStates(active, explored, 10, 10)

    expect(states.get('2,2')).toBe('active')
    expect(states.get('5,5')).toBe('explored')
    expect(states.get('0,0')).toBe('unexplored')
    expect(states.get('3,3')).toBe('active')
  })

  it('handles empty sets', () => {
    const states = buildFogTileStates(new Set(), new Set(), 5, 5)
    expect(states.size).toBe(25)
    for (const [, state] of states) {
      expect(state).toBe('unexplored')
    }
  })

  it('active overrides explored for same tile', () => {
    const active = new Set(['1,1'])
    const explored = new Set(['1,1'])
    const states = buildFogTileStates(active, explored, 3, 3)
    expect(states.get('1,1')).toBe('active')
  })
})

describe('updateExplored', () => {
  it('adds newly active tiles to explored set', () => {
    const explored = new Set(['0,0', '1,1'])
    const active = new Set(['1,1', '2,2', '3,3'])
    const newly = updateExplored(explored, active)

    expect(newly).toEqual(['2,2', '3,3'])
    expect(explored.has('2,2')).toBe(true)
    expect(explored.has('3,3')).toBe(true)
    expect(explored.size).toBe(4)
  })

  it('returns empty array when nothing is new', () => {
    const explored = new Set(['1,1', '2,2'])
    const active = new Set(['1,1', '2,2'])
    const newly = updateExplored(explored, active)
    expect(newly).toEqual([])
  })
})
