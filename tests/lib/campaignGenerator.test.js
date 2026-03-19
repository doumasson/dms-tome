import { describe, it, expect } from 'vitest'
import { mergeZoneWithTemplate, buildWorldFromAiOutput } from '../../src/lib/campaignGenerator.js'

describe('mergeZoneWithTemplate', () => {
  it('adds template layers to zone', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [{ name: 'Bob', role: 'bartender', position: { x: 6, y: 2 } }],
      exits: [{ position: { x: 5, y: 9 }, width: 2, direction: 'south', targetZone: 'outside', label: 'Outside' }],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[18]], props: [[-1]] },
      spawnPoints: { bartender: { x: 6, y: 2 } },
      exitSlots: { south: { x: 5, y: 9, width: 2 } },
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.width).toBe(12)
    expect(merged.height).toBe(10)
    expect(merged.layers).toEqual(template.layers)
    expect(merged.npcs).toEqual(zone.npcs)
    expect(merged.exits[0].position).toEqual({ x: 5, y: 9 })
  })

  it('uses spawnPoints for NPC positions when not specified', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [{ name: 'Bob', role: 'bartender' }],
      exits: [],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[-1]], props: [[-1]] },
      spawnPoints: { bartender: { x: 6, y: 2 } },
      exitSlots: {},
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.npcs[0].position).toEqual({ x: 6, y: 2 })
  })

  it('uses exitSlots for exit positions when not specified', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [],
      exits: [{ direction: 'south', targetZone: 'outside', label: 'Outside' }],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[-1]], props: [[-1]] },
      spawnPoints: {},
      exitSlots: { south: { x: 5, y: 9, width: 2 } },
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.exits[0].position).toEqual({ x: 5, y: 9 })
    expect(merged.exits[0].width).toBe(2)
  })
})

describe('buildWorldFromAiOutput', () => {
  it('converts zone array to map and merges templates', () => {
    const aiWorld = {
      title: 'Test World',
      startZone: 'test-zone',
      zones: [
        { id: 'test-zone', name: 'Test', type: 'tavern_bar', npcs: [], exits: [] }
      ],
    }
    const result = buildWorldFromAiOutput(aiWorld)
    expect(result.title).toBe('Test World')
    expect(result.startZone).toBe('test-zone')
    expect(result.zones['test-zone']).toBeDefined()
    expect(result.zones['test-zone'].width).toBe(12) // from tavern_bar template
  })
})
