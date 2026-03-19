import { describe, it, expect, beforeEach } from 'vitest'
import { ChunkLibrary } from './chunkLibrary.js'

describe('ChunkLibrary', () => {
  let library

  beforeEach(() => {
    library = new ChunkLibrary()
    library.register({
      id: 'inn-common-01',
      type: 'building',
      tags: ['tavern', 'indoor', 'settlement'],
      width: 12,
      height: 10,
      layers: {},
    })
    library.register({
      id: 'blacksmith-01',
      type: 'building',
      tags: ['blacksmith', 'indoor', 'settlement'],
      width: 8,
      height: 6,
      layers: {},
    })
    library.register({
      id: 'goblin-camp-01',
      type: 'encounter',
      tags: ['goblin', 'camp', 'outdoor'],
      width: 10,
      height: 8,
      layers: {},
    })
  })

  it('finds best match by type and tags', () => {
    const match = library.findBest('building', ['tavern'])
    expect(match.id).toBe('inn-common-01')
  })

  it('returns null when no type matches', () => {
    expect(library.findBest('landmark', ['fountain'])).toBeNull()
  })

  it('scores by tag overlap', () => {
    const match = library.findBest('building', ['blacksmith', 'indoor'])
    expect(match.id).toBe('blacksmith-01')
  })

  it('lists all chunks of a type', () => {
    const buildings = library.listByType('building')
    expect(buildings).toHaveLength(2)
  })

  it('gets chunk by id', () => {
    const chunk = library.get('goblin-camp-01')
    expect(chunk).not.toBeNull()
    expect(chunk.type).toBe('encounter')
  })

  it('returns null for unknown id', () => {
    expect(library.get('nonexistent')).toBeNull()
  })

  it('clears all chunks', () => {
    library.clear()
    expect(library.listByType('building')).toHaveLength(0)
    expect(library.get('inn-common-01')).toBeNull()
  })

  it('loads chunks from array', () => {
    library.clear()
    library.loadAll([
      { id: 'test-1', type: 'terrain', tags: ['grass'], width: 5, height: 5, layers: {} },
      { id: 'test-2', type: 'terrain', tags: ['rock'], width: 3, height: 3, layers: {} },
    ])
    expect(library.listByType('terrain')).toHaveLength(2)
  })

  it('prefers curated over generated chunks', () => {
    library.register({
      id: 'tavern-generated',
      type: 'building',
      tags: ['tavern', 'indoor', 'settlement'],
      width: 12,
      height: 10,
      layers: {},
      source: 'generated',
    })
    const match = library.findBest('building', ['tavern'])
    // inn-common-01 (curated) should beat tavern-generated despite same tags
    expect(match.id).toBe('inn-common-01')
  })
})
