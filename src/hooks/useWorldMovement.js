import { useMemo, useEffect, useRef, useCallback } from 'react'
import { checkTrapTrigger, canDetectTrap, getPassivePerception, resolveTrapEffect } from '../lib/trapSystem.js'
import useStore from '../store/useStore'
import { findPath, findPathLegacy, buildWalkabilityGrid, findPathEdge } from '../lib/pathfinding'
import { getBlockingSet } from '../engine/tileAtlas'
import { animateTokenAlongPath, isAnimating } from '../engine/TokenLayer'
import { broadcastTokenMove } from '../lib/liveChannel'
import { playFootstep } from '../lib/ambientSounds'

// Map area themes to footstep surface types
function getSurface(theme) {
  const map = {
    dungeon: 'stone', cave: 'stone', crypt: 'stone', sewer: 'stone',
    forest: 'grass', clearing: 'grass', swamp: 'grass', coastal: 'sand',
    desert: 'sand', mountain: 'stone', graveyard: 'grass',
    town: 'wood', village: 'wood', tavern: 'wood', marketplace: 'wood',
  }
  return map[theme] || 'stone'
}

/**
 * Handles non-combat world movement: click-to-move pathfinding, WASD/arrow
 * keyboard movement, and walkability data computation.
 */
export function useWorldMovement({ zone, isV2Zone, playerPos, setPlayerPos, playerPosRef, cameraRef, dialogOpenRef, handleInteractRef, user }) {
  // Build walkability data from zone
  const walkData = useMemo(() => {
    if (!zone?.layers) return null
    if (isV2Zone) {
      const w = zone.width, h = zone.height
      if (zone.wallEdges) {
        return {
          type: 'v2-edge',
          wallEdges: zone.wallEdges,
          cellBlocked: zone.cellBlocked || new Uint8Array(w * h),
          width: w,
          height: h,
        }
      }
      const palette = zone.palette || []
      const collision = new Uint8Array(w * h)
      const wallLayer = zone.layers.walls
      if (wallLayer) {
        for (let i = 0; i < wallLayer.length; i++) {
          const idx = wallLayer[i]
          if (idx === 0) continue
          const tileId = palette[idx] || ''
          if (tileId.includes('door')) continue
          collision[i] = 1
        }
      }
      return { type: 'v2', collision, width: w, height: h }
    }
    return { type: 'v1', grid: buildWalkabilityGrid(zone.layers.walls, zone.layers.props, getBlockingSet(), zone.width, zone.height) }
  }, [zone, isV2Zone])

  const zoneRef = useRef(zone)
  zoneRef.current = zone
  const walkDataRef = useRef(walkData)
  walkDataRef.current = walkData
  // Step counter — advance ~1 minute of game time per 10 tiles walked
  const stepCountRef = useRef(0)
  // Trap check helper — called after each movement completes
  // Uses party formation: back-line members get advantage on trap saves
  const checkTrapsAtPosition = useCallback((newPos) => {
    const state = useStore.getState()
    const _z = zoneRef.current
    const _c = state.myCharacter
    const _a = state.addNarratorMessage
    const _u = state.updateMyCharacter
    const formation = state.formation
    const traps = _z?.traps || []
    for (const trap of traps) {
      if (!trap.position || trap.triggered || trap.revealed) continue
      const dist = Math.max(Math.abs(newPos.x - trap.position.x), Math.abs(newPos.y - trap.position.y))
      const pp = getPassivePerception(_c)
      if (dist <= 2 && canDetectTrap(pp, trap.dc)) {
        trap.revealed = true
        _a({ role: 'dm', speaker: 'DM', text: `You notice a ${trap.type.replace(/_/g, ' ')} ahead!` })
        continue
      }
      const result = checkTrapTrigger(trap, newPos)
      if (result.triggered) {
        trap.triggered = true
        const effect = resolveTrapEffect(trap, _c, formation)
        const isBackLine = formation?.back?.includes(_c?.id) || formation?.back?.includes(_c?.name)
        const advNote = isBackLine ? ' (back line — advantage on save!)' : ''
        const saveInfo = effect.saved
          ? ` Save: ${effect.saveRoll} — saved!`
          : ` Save: ${effect.saveRoll} — failed!${effect.damage > 0 ? ` ${effect.damage} damage!` : ''}${effect.condition ? ` (${effect.condition})` : ''}`
        _a({ role: 'dm', speaker: 'DM', text: (effect.description || 'A trap triggers!') + advNote + saveInfo })
        if (effect.damage > 0 && _c) {
          const currentHp = _c.currentHp ?? _c.hp ?? 0
          _u({ currentHp: Math.max(0, currentHp - effect.damage) })
        }
        // Apply trap conditions (Poisoned, Restrained, etc.) to the character
        if (effect.condition && _c) {
          const conditions = _c.conditions || []
          if (!conditions.includes(effect.condition)) {
            _u({ conditions: [...conditions, effect.condition] })
          }
        }
      }
    }
  }, [])

  // Click-to-move: pathfind and animate walk (non-combat only)
  const handleWorldTileClick = useCallback(({ x, y }) => {
    // Block world movement during combat or encounter negotiation
    const { encounter, encounterLock } = useStore.getState()
    if (encounter?.phase === 'combat') return false
    if (encounterLock) return false
    if (isAnimating()) return false

    const wd = walkDataRef.current
    const pos = playerPosRef.current
    if (!wd) return false

    let path
    if (wd.type === 'v2-edge') {
      if (wd.cellBlocked[y * wd.width + x] === 1) return false
      path = findPathEdge(
        { wallEdges: wd.wallEdges, cellBlocked: wd.cellBlocked },
        wd.width, wd.height, pos, { x, y }
      )
    } else if (wd.type === 'v2') {
      if (wd.collision[y * wd.width + x] === 1) return false
      path = findPath(wd.collision, wd.width, wd.height, pos, { x, y })
    } else {
      if (!wd.grid[y]?.[x]) return false
      path = findPathLegacy(wd.grid, pos, { x, y })
    }

    if (path && path.length > 1) {
      playerPosRef.current = { x, y }
      // Track steps for time advancement (~1 minute per 10 tiles)
      stepCountRef.current += path.length - 1
      if (stepCountRef.current >= 10) {
        stepCountRef.current = 0
        useStore.getState().advanceGameTime(1 / 60) // 1 minute
      }
      const tileSize = zone?.tileSize || 32
      animateTokenAlongPath('player', path, (stepPos) => {
        // Camera follows player during click-to-move walk
        if (cameraRef.current) cameraRef.current.centerOn(stepPos.x, stepPos.y, tileSize)
        playerPosRef.current = stepPos
        playFootstep(getSurface(zone?.theme))
        setPlayerPos(stepPos) // Update fog/encounters each step
      }, () => {
        setPlayerPos({ x, y })
        checkTrapsAtPosition({ x, y })
      }, isV2Zone ? tileSize : undefined)
      broadcastTokenMove(user?.id, { x, y }, path)
    }
    return true // handled
  }, [zone, isV2Zone])

  // WASD keyboard movement
  useEffect(() => {
    const wasdDirs = {
      w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
      s: { x: 0, y: 1 },  S: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
      d: { x: 1, y: 0 },  D: { x: 1, y: 0 },
    }
    const arrowDirs = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    }

    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (dialogOpenRef.current) return

      // E key — interact with adjacent NPC or exit
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleInteractRef.current?.()
        return
      }

      // Arrow keys: move token only when no camera (V1 zones)
      let dir = wasdDirs[e.key]
      if (!dir && !cameraRef.current) dir = arrowDirs[e.key]
      if (!dir) return
      e.preventDefault()

      // Block world movement during combat or encounter negotiation
      const { encounter: enc, encounterLock: encLock } = useStore.getState()
      if (enc?.phase === 'combat') return
      if (encLock) return

      if (isAnimating()) return
      const wd = walkDataRef.current
      const pos = playerPosRef.current
      const nx = pos.x + dir.x
      const ny = pos.y + dir.y

      if (wd?.type === 'v2-edge') {
        if (nx < 0 || nx >= wd.width || ny < 0 || ny >= wd.height) return
        if (wd.cellBlocked[ny * wd.width + nx] === 1) return
        const fromIdx = pos.y * wd.width + pos.x
        const toIdx = ny * wd.width + nx
        const exitBit = dir.y === -1 ? 0x1 : dir.x === 1 ? 0x2 : dir.y === 1 ? 0x4 : 0x8
        const entryBit = dir.y === -1 ? 0x4 : dir.x === 1 ? 0x8 : dir.y === 1 ? 0x1 : 0x2
        if ((wd.wallEdges[fromIdx] & exitBit) || (wd.wallEdges[toIdx] & entryBit)) return
      } else if (wd?.type === 'v2') {
        if (nx < 0 || nx >= wd.width || ny < 0 || ny >= wd.height) return
        if (wd.collision[ny * wd.width + nx] === 1) return
      } else if (wd?.type === 'v1') {
        if (!wd.grid || ny < 0 || nx < 0 || ny >= wd.grid.length || nx >= wd.grid[0]?.length) return
        if (!wd.grid[ny][nx]) return
      } else {
        return
      }

      // Track steps for time advancement (~1 minute per 10 tiles)
      stepCountRef.current += 1
      if (stepCountRef.current >= 10) {
        stepCountRef.current = 0
        useStore.getState().advanceGameTime(1 / 60) // 1 minute
      }
      const tileSize = zone?.tileSize || 32
      playerPosRef.current = { x: nx, y: ny }
      playFootstep(getSurface(zone?.theme))
      setPlayerPos({ x: nx, y: ny }) // Update state immediately for fog/encounter/NPC proximity
      const path = [pos, { x: nx, y: ny }]
      animateTokenAlongPath('player', path, null, () => {
        if (cameraRef.current) cameraRef.current.centerOn(nx, ny, tileSize)
        checkTrapsAtPosition({ x: nx, y: ny })
      }, isV2Zone ? tileSize : undefined)
      broadcastTokenMove(useStore.getState().user?.id, { x: nx, y: ny }, path)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zone, isV2Zone])

  return { walkData, walkDataRef, handleWorldTileClick }
}
