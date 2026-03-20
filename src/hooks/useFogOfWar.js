import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { computeVision, getCharacterVisionRange, encodeExploredBitfield, decodeExploredBitfield } from '../lib/visionCalculator'
import { buildFogTileStates, renderFog, updateExplored } from '../engine/FogOfWar'
import { broadcastFogUpdate } from '../lib/liveChannel'
import * as PIXI from 'pixi.js'

/**
 * Manages fog-of-war state: explored set, vision computation,
 * fog rendering via PixiJS ticker, and broadcast sync.
 */
export function useFogOfWar({ zone, playerPos, playerPosRef, currentAreaId, myCharacter, isDM, pixiRef, cameraRef }) {
  const exploredRef = useRef(new Set())
  const fogDirtyRef = useRef(true)
  const fogBroadcastTimer = useRef(null)
  const prevAreaIdRef = useRef(currentAreaId)

  // Mark fog dirty when tokens move in area mode
  useEffect(() => {
    if (!cameraRef.current || !pixiRef.current) return
    fogDirtyRef.current = true
  }, [playerPos, currentAreaId])

  // Reset explored set when area changes; DM restores from persisted bitfield if available
  useEffect(() => {
    if (currentAreaId !== prevAreaIdRef.current) {
      const storedFog = useStore.getState().fogBitfields[currentAreaId]
      if (storedFog && zone?.width && zone?.height) {
        const decoded = decodeExploredBitfield(storedFog, zone.width, zone.height)
        exploredRef.current = decoded || new Set()
      } else {
        exploredRef.current = new Set()
      }
      fogDirtyRef.current = true
      prevAreaIdRef.current = currentAreaId
    }
  }, [currentAreaId])

  // Update explored set + broadcast when player moves
  useEffect(() => {
    if (!zone?.useCamera) return

    const pos = playerPosRef.current
    if (!pos) return

    const areaLighting = zone.lighting || 'bright'
    const charVision = getCharacterVisionRange(myCharacter || {}, areaLighting)
    const partyVisions = [{
      position: pos,
      brightRadius: charVision.bright,
      dimRadius: charVision.dim,
      darkvisionRadius: charVision.darkvision,
    }]

    const visionResult = computeVision(partyVisions, zone.width, zone.height)
    const newlyExplored = updateExplored(exploredRef.current, visionResult.active)

    if (isDM && currentAreaId && newlyExplored.length > 0) {
      clearTimeout(fogBroadcastTimer.current)
      fogBroadcastTimer.current = setTimeout(() => {
        const bitfield = encodeExploredBitfield(exploredRef.current, zone.width, zone.height)
        broadcastFogUpdate(currentAreaId, bitfield)
        const { updateFogBitfield, saveSessionStateToSupabase } = useStore.getState()
        updateFogBitfield(currentAreaId, bitfield)
        saveSessionStateToSupabase()
      }, 500)
    }
  }, [playerPos, currentAreaId, zone, myCharacter, isDM])

  // Render fog every frame via PixiJS ticker
  useEffect(() => {
    if (!zone?.useCamera) return
    const app = pixiRef.current?.getApp?.()
    if (!app) return

    const tickerFn = () => {
      const fogContainer = pixiRef.current?.getFogLayer?.()
      if (!fogContainer) return
      const cam = cameraRef.current
      if (!cam) return
      const tileSize = zone.tileSize || 200
      const viewW = window.innerWidth
      const viewH = window.innerHeight
      const bounds = {
        startX: Math.floor(cam.x / tileSize),
        startY: Math.floor(cam.y / tileSize),
        endX: Math.ceil((cam.x + viewW / cam.zoom) / tileSize),
        endY: Math.ceil((cam.y + viewH / cam.zoom) / tileSize),
      }
      const pos = playerPosRef.current
      if (!pos) return
      const areaLighting = zone.lighting || 'bright'
      const charVision = getCharacterVisionRange(myCharacter || {}, areaLighting)
      const partyVisions = [{
        position: pos,
        brightRadius: charVision.bright,
        dimRadius: charVision.dim,
        darkvisionRadius: charVision.darkvision,
      }]
      const visionResult = computeVision(partyVisions, zone.width, zone.height)
      const states = buildFogTileStates(visionResult.active, exploredRef.current, zone.width, zone.height)
      renderFog(fogContainer, states, bounds, tileSize, PIXI)
    }

    app.ticker.add(tickerFn)
    return () => app.ticker.remove(tickerFn)
  }, [zone, myCharacter])

  // Receive fog broadcasts (non-DM clients)
  const fogBitfields = useStore(s => s.fogBitfields)
  useEffect(() => {
    if (isDM) return
    if (!currentAreaId || !fogBitfields?.[currentAreaId]) return
    if (!zone?.width || !zone?.height) return
    const decoded = decodeExploredBitfield(fogBitfields[currentAreaId], zone.width, zone.height)
    if (decoded) {
      exploredRef.current = decoded
      fogDirtyRef.current = true
    }
  }, [fogBitfields, currentAreaId, isDM, zone?.width, zone?.height])

  return { exploredRef, fogDirtyRef }
}
