import { useState, useCallback, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { buildAreaFromBrief } from '../lib/areaBuilder.js'
import { saveArea } from '../lib/areaStorage.js'
import { broadcastAreaTransition } from '../lib/liveChannel'
import { playZoneTransition } from '../engine/ZoneTransition'
import { playDoorCreak } from '../lib/ambientSounds'
import { safeguardSpawn } from '../lib/gridUtils.js'
import { v4 as uuidv4 } from 'uuid'
import { broadcastNarratorMessage } from '../lib/liveChannel'

/**
 * Handles area transitions (exit clicks) and exit-proximity pre-generation.
 */
export function useAreaTransition({ area, areas, areaBriefs, inCombat, campaign, pixiRef, setPlayerPos, playerPosRef, advanceGameTime, playerPos }) {
  const buildAndLoadArea = useStore(s => s.buildAndLoadArea)
  const activateArea = useStore(s => s.activateArea)
  const clearPendingEncounterData = useStore(s => s.clearPendingEncounterData)
  const setEncounterLock = useStore(s => s.setEncounterLock)
  const isDM = useStore(s => s.isDM)

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
      const preSeed = exit.targetArea.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      const builtArea = buildAreaFromBrief(brief, Math.abs(preSeed) || 42)
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

    // Proximity gate: player must be within 1 tile of the exit zone
    const pp = playerPosRef?.current || playerPos
    if (pp && exit.x != null && exit.y != null) {
      const exitW = exit.width || 3
      // Distance from player to closest point on the exit rectangle
      const clampedX = Math.max(exit.x, Math.min(exit.x + exitW - 1, pp.x))
      const clampedY = Math.max(exit.y, Math.min(exit.y + 1, pp.y)) // exit is 2 tiles tall
      const dx = Math.abs(pp.x - clampedX)
      const dy = Math.abs(pp.y - clampedY)
      if (Math.max(dx, dy) > 1) {
        console.log('[transition] Player too far from exit', { dx, dy, pp, exit })
        return
      }
    }

    const targetId = exit.targetArea || exit.targetZone
    if (!targetId) return

    if (!areas[targetId]) {
      const brief = areaBriefs[targetId]
      if (!brief) {
        console.error(`[transition] No area or brief for "${targetId}"`)
        return
      }
      // Use deterministic seed from area ID so all players get identical layout
      const seed = targetId.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      const builtArea = buildAreaFromBrief(brief, Math.abs(seed) || 42)
      buildAndLoadArea(targetId, builtArea)
      if (campaign?.id) {
        saveArea(campaign.id, builtArea).catch(err =>
          console.warn('[transition] Failed to save area:', err))
      }
    }

    setTransitioning(true)
    // Use exit's entryPoint (placed at correct direction) if available,
    // fall back to target area's playerStart
    const targetArea = areas[targetId]
    const rawEntry = exit.entryPoint || targetArea?.playerStart || { x: 0, y: 0 }
    // Ensure player doesn't spawn on top of enemies in the target area
    const entry = targetArea
      ? safeguardSpawn(rawEntry, targetArea.enemies, targetArea)
      : rawEntry
    broadcastAreaTransition(targetId, entry, isDM)
    lastNpcTriggerRef.current = null
    // Clear encounter lock when leaving the area
    clearPendingEncounterData()
    setEncounterLock(false)
    advanceGameTime(10 / 60) // 10 minutes per area transition

    const app = pixiRef.current?.getApp()
    const areaName = targetArea?.name || areaBriefs?.[targetId]?.name || targetId
    if (app) {
      playDoorCreak()
      playZoneTransition(app, () => {
        activateArea(targetId)
        setPlayerPos(entry)
        playerPosRef.current = entry
      }, () => {
        setTransitioning(false)
        narrateAreaRef.current?.(targetId)
      }, 800, areaName)
    } else {
      activateArea(targetId)
      setPlayerPos(entry)
      playerPosRef.current = entry
      setTimeout(() => {
        setTransitioning(false)
        narrateAreaRef.current?.(targetId)
      }, 100)
    }
  }, [transitioning, inCombat, areas, areaBriefs, buildAndLoadArea, activateArea, advanceGameTime])

  // Auto-narrate area description when transition completes
  const narrateAreaRef = useRef(null)
  narrateAreaRef.current = (areaId) => {
    const area = useStore.getState().areas[areaId]
    if (!area?.name) return
    const npcNames = (area.npcs || []).map(n => n.name).filter(Boolean)
    const theme = area.theme || 'unknown'
    const THEME_FLAVOR = {
      village: 'The sounds of village life surround you.',
      town: 'Townsfolk go about their daily business.',
      forest: 'The canopy filters dappled light onto the forest floor.',
      clearing: 'Sunlight breaks through the trees into an open glade.',
      dungeon: 'Shadows cling to the cold stone walls.',
      cave: 'Water drips in the darkness, echoing off stone.',
      crypt: 'A chill silence hangs over the burial chambers.',
      sewer: 'The air is thick with dampness and decay.',
      desert: 'Heat shimmers rise from the endless sands.',
      mountain: 'The wind howls between jagged peaks.',
      swamp: 'Mist curls above the murky waters.',
      graveyard: 'Weathered headstones lean at odd angles in the fog.',
      coastal: 'Salt spray carries on the ocean breeze.',
      marketplace: 'Merchants call out their wares from colorful stalls.',
    }
    const flavor = THEME_FLAVOR[theme] || 'You survey your surroundings.'
    const npcNote = npcNames.length > 0
      ? ` You notice ${npcNames.slice(0, 3).join(', ')}${npcNames.length > 3 ? ` and ${npcNames.length - 3} others` : ''} nearby.`
      : ''
    const text = `You arrive at ${area.name}. ${flavor}${npcNote}`
    const msg = { role: 'dm', speaker: 'The Narrator', text, id: uuidv4(), timestamp: Date.now() }
    useStore.getState().addNarratorMessage(msg)
    broadcastNarratorMessage(msg)
  }

  return { transitioning, handleAreaTransition, lastNpcTriggerRef, narrateAreaRef }
}
