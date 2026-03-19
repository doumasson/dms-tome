import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../../src/store/useStore'

describe('zone store', () => {
  beforeEach(() => {
    useStore.setState({
      currentZoneId: null,
      visitedZones: new Set(),
      zoneTokenPositions: {},
    })
  })

  it('setCurrentZone updates currentZoneId and adds to visited', () => {
    const { setCurrentZone } = useStore.getState()
    setCurrentZone('inn-bar')
    const state = useStore.getState()
    expect(state.currentZoneId).toBe('inn-bar')
    expect(state.visitedZones.has('inn-bar')).toBe(true)
  })

  it('setZoneTokenPosition stores position by zone and member', () => {
    const { setZoneTokenPosition } = useStore.getState()
    setZoneTokenPosition('inn-bar', 'player-1', { x: 5, y: 7 })
    const state = useStore.getState()
    expect(state.zoneTokenPositions['inn-bar']['player-1']).toEqual({ x: 5, y: 7 })
  })

  it('getZoneTokenPosition returns undefined for unknown zone', () => {
    const state = useStore.getState()
    expect(state.zoneTokenPositions['unknown']?.['player-1']).toBeUndefined()
  })

  it('loadZoneWorld sets zones and startZone', () => {
    const { loadZoneWorld } = useStore.getState()
    const world = {
      title: 'Test',
      startZone: 'town',
      zones: { town: { id: 'town', name: 'Town' } },
    }
    loadZoneWorld(world)
    const state = useStore.getState()
    expect(state.currentZoneId).toBe('town')
    expect(state.campaign.zones).toEqual(world.zones)
    expect(state.visitedZones.has('town')).toBe(true)
  })
})
