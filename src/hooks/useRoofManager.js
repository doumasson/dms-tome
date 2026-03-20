import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { RoofManager } from '../engine/RoofLayer'
import { broadcastRoofReveal } from '../lib/liveChannel'

/**
 * Manages roof-lift state for buildings — registers buildings,
 * updates reveal states based on player position, and syncs via broadcast.
 */
export function useRoofManager({ zone, playerPos, playerPosRef, currentAreaId, isDM }) {
  const roofStates = useStore(s => s.roofStates)
  const roofManagerRef = useRef(new RoofManager())
  const triggeredZonesRef = useRef(new Set())

  // Register buildings into RoofManager when zone loads
  useEffect(() => {
    if (!zone?.useCamera || !zone?.buildings) return
    roofManagerRef.current = new RoofManager()
    triggeredZonesRef.current = new Set()
    const rm = roofManagerRef.current
    rm.buildings.clear()
    rm.revealed.clear()
    rm._doorSet.clear()

    const doors = []
    if (zone.layers?.walls && zone.palette) {
      const w = zone.width
      for (let i = 0; i < zone.layers.walls.length; i++) {
        const pIdx = zone.layers.walls[i]
        if (pIdx === 0) continue
        const tileId = zone.palette[pIdx] || ''
        if (tileId.includes('door')) {
          doors.push({ x: i % w, y: Math.floor(i / w) })
        }
      }
    }

    for (const b of zone.buildings) {
      const buildingDoors = doors.filter(d =>
        d.x >= b.x && d.x < b.x + b.width && d.y >= b.y && d.y < b.y + b.height
      )
      rm.registerBuilding({ ...b, doors: buildingDoors })
    }

    const storedRoofStates = useStore.getState().roofStates[currentAreaId]
    if (storedRoofStates) {
      for (const [buildingId, revealed] of Object.entries(storedRoofStates)) {
        rm.setRevealed(buildingId, revealed)
      }
    }
  }, [zone?.buildings, currentAreaId])

  // Update roof reveal states when tokens move
  useEffect(() => {
    if (!zone?.useCamera) return
    const rm = roofManagerRef.current
    const pos = playerPosRef.current
    if (!pos) return
    const positions = [pos]
    const changes = rm.updateRevealStates(positions)
    if (changes.length > 0 && isDM) {
      const { setRoofState, saveSessionStateToSupabase } = useStore.getState()
      for (const { buildingId, revealed } of changes) {
        broadcastRoofReveal(currentAreaId, buildingId, revealed)
        setRoofState(currentAreaId, buildingId, revealed)
      }
      saveSessionStateToSupabase()
    }
  }, [playerPos, currentAreaId, zone])

  // Apply incoming roof reveal broadcasts (non-DM clients)
  useEffect(() => {
    if (!roofStates || isDM) return
    const rm = roofManagerRef.current
    const areaRoofStates = roofStates[currentAreaId] || {}
    for (const [buildingId, revealed] of Object.entries(areaRoofStates)) {
      rm.setRevealed(buildingId, revealed)
    }
  }, [roofStates, currentAreaId])

  return { roofManagerRef, triggeredZonesRef }
}
