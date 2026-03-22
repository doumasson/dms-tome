import { useState, useCallback, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { buildAreaFromBrief } from '../lib/areaBuilder.js'
import { saveArea } from '../lib/areaStorage.js'
import { broadcastAreaTransition } from '../lib/liveChannel'
import { playZoneTransition } from '../engine/ZoneTransition'

/**
 * Handles area transitions (exit clicks) and exit-proximity pre-generation.
 */
export function useAreaTransition({ area, areas, areaBriefs, inCombat, campaign, pixiRef, setPlayerPos, playerPosRef, advanceGameTime, playerPos }) {
  const buildAndLoadArea = useStore(s => s.buildAndLoadArea)
  const activateArea = useStore(s => s.activateArea)

  const [transitioning, setTransitioning] = useState(false)
  const lastNpcTriggerRef = useRef(null)

  // Exit-proximity pre-generation
  useEffect(() => {
    if (!area?.exits || !playerPos) return
    const PRE_GEN_DISTANCE = 5

    for (const exit of area.exits) {
      const dist = Math.abs(playerPos.x - exit.x) + Math.abs(playerPos.y - exit.y)
      if (dist > PRE_GEN_DISTANCE) continue
      if (!exit.targetArea) continue
      if (areas[exit.targetArea]) continue
      const brief = areaBriefs[exit.targetArea]
      if (!brief) continue

      console.log(`[pre-gen] Building area "${exit.targetArea}" (player ${dist} tiles from exit)`)
      const builtArea = buildAreaFromBrief(brief)
      buildAndLoadArea(exit.targetArea, builtArea)
      if (campaign?.id) {
        saveArea(campaign.id, builtArea).catch(err =>
          console.warn('[pre-gen] Failed to save:', err))
      }
    }
  }, [playerPos, area?.exits, areas, areaBriefs])

  // Area transition via exit click
  const handleAreaTransition = useCallback((exit) => {
    if (transitioning || inCombat) return

    const targetId = exit.targetArea || exit.targetZone
    if (!targetId) return

    if (!areas[targetId]) {
      const brief = areaBriefs[targetId]
      if (!brief) {
        console.error(`[transition] No area or brief for "${targetId}"`)
        return
      }
      const builtArea = buildAreaFromBrief(brief)
      buildAndLoadArea(targetId, builtArea)
      if (campaign?.id) {
        saveArea(campaign.id, builtArea).catch(err =>
          console.warn('[transition] Failed to save area:', err))
      }
    }

    setTransitioning(true)
    // Prefer the target area's playerStart (guaranteed inside walkable area)
    // over the source exit's entryPoint (which may be at a map edge with no floor)
    const targetArea = areas[targetId]
    const entry = targetArea?.playerStart || exit.entryPoint || { x: 0, y: 0 }
    broadcastAreaTransition(targetId, entry)
    lastNpcTriggerRef.current = null
    advanceGameTime(10 / 60) // 10 minutes per area transition

    const app = pixiRef.current?.getApp()
    if (app) {
      playZoneTransition(app, () => {
        activateArea(targetId)
        setPlayerPos(entry)
        playerPosRef.current = entry
      }, () => {
        setTransitioning(false)
      })
    } else {
      activateArea(targetId)
      setPlayerPos(entry)
      playerPosRef.current = entry
      setTimeout(() => setTransitioning(false), 100)
    }
  }, [transitioning, inCombat, areas, areaBriefs, buildAndLoadArea, activateArea, advanceGameTime])

  return { transitioning, handleAreaTransition, lastNpcTriggerRef }
}
