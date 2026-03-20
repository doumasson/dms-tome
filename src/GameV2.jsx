import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import { buildTestArea } from './data/testArea.js'
import { buildDemoArea } from './data/demoArea.js'
import { buildAreaFromBrief } from './lib/areaBuilder.js'
import { saveArea } from './lib/areaStorage.js'
import { broadcastAreaTransition, broadcastNarratorMessage, broadcastApiKeySync, broadcastRequestApiKey } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { buildSystemPrompt, callNarrator } from './lib/narratorApi'
import { handleInteract } from './lib/interactionController'
import { findPath, findPathLegacy, buildWalkabilityGrid, findPathEdge } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import { animateTokenAlongPath, isAnimating } from './engine/TokenLayer'
import Camera from './engine/Camera'
import { buildFogTileStates, renderFog, updateExplored } from './engine/FogOfWar'
import { computeVision, getCharacterVisionRange } from './lib/visionCalculator'
import { RoofManager } from './engine/RoofLayer'
import { getReachableTiles, renderMovementRange, clearMovementRange } from './engine/MovementRange'
import { playZoneTransition } from './engine/ZoneTransition'
import ChatBubble from './components/ChatBubble'
import DiceTray from './components/DiceTray'
import CharacterSheetModal from './components/characterSheet/CharacterSheetModal'
import RestModal from './components/RestModal'
import ApiKeySettings from './components/ApiKeySettings'
import NpcDialog from './components/NpcDialog'
import StoryCutscene from './components/StoryCutscene'
import JournalModal from './components/JournalModal'
import './hud/hud.css'

const CLASS_COLORS = {
  Fighter: 0x4499dd, Barbarian: 0xcc5544, Paladin: 0xeedd44,
  Ranger: 0x44aa66, Rogue: 0xcc7722, Monk: 0x88bbcc,
  Wizard: 0x6644cc, Sorcerer: 0xaa55bb, Warlock: 0x885599,
  Cleric: 0x44aa66, Druid: 0x558833, Bard: 0xcc7799,
}

export default function GameV2({ onLeave }) {
  const currentAreaId = useStore(s => s.currentAreaId)
  const areas = useStore(s => s.areas)
  const areaBriefs = useStore(s => s.areaBriefs)
  const areaLayers = useStore(s => s.areaLayers)
  const loadArea = useStore(s => s.loadArea)
  const loadAreaWorld = useStore(s => s.loadAreaWorld)
  const buildAndLoadArea = useStore(s => s.buildAndLoadArea)
  const activateArea = useStore(s => s.activateArea)
  const myCharacter = useStore(s => s.myCharacter)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const user = useStore(s => s.user)
  const encounter = useStore(s => s.encounter)
  const nextEncounterTurn = useStore(s => s.nextEncounterTurn)
  const inCombat = encounter.phase === 'combat'
  const sessionApiKey = useStore(s => s.sessionApiKey)
  const isDM = useStore(s => s.isDM)
  const runEnemyTurn = useStore(s => s.runEnemyTurn)
  const applyEncounterDamage = useStore(s => s.applyEncounterDamage)
  const useAction = useStore(s => s.useAction)
  const narrateCombatAction = useStore(s => s.narrateCombatAction)
  const campaign = useStore(s => s.campaign)
  const partyMembers = useStore(s => s.partyMembers)
  const narrator = useStore(s => s.narrator)
  const activeCutscene = useStore(s => s.activeCutscene)

  const pixiRef = useRef(null)
  const cameraRef = useRef(null)
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [transitioning, setTransitioning] = useState(false)
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [restProposal, setRestProposal] = useState(null)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [activeNpc, setActiveNpc] = useState(null)
  const [worldTransform, setWorldTransform] = useState(null)
  const dialogOpenRef = useRef(false)
  const handleInteractRef = useRef(null)
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos
  const lastNpcTriggerRef = useRef(null)

  const area = areas[currentAreaId] || null
  // Alias for backward compat — existing code reads `zone`
  const zone = area

  // Area camera — instantiate when zone signals camera mode (e.g. large procedural maps)
  const useAreaCamera = Boolean(zone?.palette) || zone?.useCamera || false
  useEffect(() => {
    if (!useAreaCamera) {
      cameraRef.current = null
      return
    }
    const w = window.innerWidth
    const h = window.innerHeight
    const cam = new Camera(w, h)
    const tileSize = zone?.tileSize || 200
    cam.setAreaBounds((zone?.width || 40) * tileSize, (zone?.height || 30) * tileSize)
    // Center on player start
    cam.centerOnImmediate(playerPosRef.current.x, playerPosRef.current.y, tileSize)
    cameraRef.current = cam
  }, [useAreaCamera, zone?.width, zone?.height])

  // Camera keyboard controls — arrow keys pan camera, spacebar recenters on player
  // (WASD reserved for token movement in V2 mode)
  useEffect(() => {
    if (!useAreaCamera) return

    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    }

    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const cam = cameraRef.current
      if (!cam) return
      if (keyMap[e.key]) { cam.startPan(keyMap[e.key]); e.preventDefault() }
      if (e.key === ' ') {
        const myPos = playerPosRef.current
        if (myPos) cam.centerOn(myPos.x, myPos.y, zone?.tileSize || 200)
        e.preventDefault()
      }
    }
    const onKeyUp = (e) => {
      const cam = cameraRef.current
      if (!cam) return
      if (keyMap[e.key]) cam.stopPan(keyMap[e.key])
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [useAreaCamera])

  // --- Fog of War refs (area camera mode only) ---
  const exploredRef = useRef(new Set())
  const fogDirtyRef = useRef(true)

  // Mark fog dirty when tokens move in area mode
  useEffect(() => {
    if (!cameraRef.current || !pixiRef.current) return
    fogDirtyRef.current = true
  }, [playerPos, currentAreaId])

  // --- Roof-lift manager (area camera mode only) ---
  const roofManagerRef = useRef(new RoofManager())

  // Register buildings into RoofManager when zone loads
  useEffect(() => {
    if (!zone?.useCamera || !zone?.buildings) return
    const rm = roofManagerRef.current
    rm.buildings.clear()
    rm.revealed.clear()
    rm._doorSet.clear()

    // Detect door cells from walls layer
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
  }, [zone?.buildings, currentAreaId])

  // Update roof reveal states when tokens move
  useEffect(() => {
    if (!zone?.useCamera) return
    const rm = roofManagerRef.current
    const pos = playerPosRef.current
    if (!pos) return
    const positions = [pos] // party positions — expand when multiplayer token sync exists
    const changes = rm.updateRevealStates(positions)
    // Changes are tracked internally by RoofManager; rendering will read state when area mode renders
  }, [playerPos, currentAreaId, zone])

  // --- Combat camera lock (area camera mode only) ---
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return
    if (inCombat && encounter.combatants?.length) {
      // Compute tile-space bounds from combatant positions
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const c of encounter.combatants) {
        if (c.position) {
          minX = Math.min(minX, c.position.x)
          minY = Math.min(minY, c.position.y)
          maxX = Math.max(maxX, c.position.x)
          maxY = Math.max(maxY, c.position.y)
        }
      }
      if (minX !== Infinity) {
        cam.setCombatBounds({ x: minX - 2, y: minY - 2, width: maxX - minX + 4, height: maxY - minY + 4 })
      }
    } else {
      cam.setCombatBounds(null)
    }
  }, [inCombat, encounter.combatants])

  // Load area world on mount — test area or normal campaign/demo
  const worldLoadedRef = useRef(false)
  useEffect(() => {
    if (worldLoadedRef.current) return
    worldLoadedRef.current = true

    const params = new URLSearchParams(window.location.search)

    if (params.has('testarea')) {
      try {
        const testArea = buildTestArea()
        console.log('[GameV2] Test area loaded:', testArea.name, `${testArea.width}x${testArea.height}`, testArea.palette?.length, 'palette entries')
        loadArea(testArea.id || 'test-area', testArea)
        activateArea(testArea.id || 'test-area')
        if (testArea.playerStart) setPlayerPos(testArea.playerStart)
      } catch (e) {
        console.error('[GameV2] Failed to build test area:', e)
      }
      return
    }

    // Check for campaign areas
    const campaignData = campaign?.campaign_data || campaign
    if (campaignData?.areas || campaignData?.areaBriefs) {
      const areas = campaignData.areas || {}
      const briefs = { ...(campaignData.areaBriefs || {}) }
      const startId = campaignData.startArea

      // Build starting area from brief if not already built
      if (startId && !areas[startId] && briefs[startId]) {
        try {
          areas[startId] = buildAreaFromBrief(briefs[startId], 42)
          delete briefs[startId]
          console.log('[GameV2] Built starting area from brief:', startId)
        } catch (e) {
          console.error('[GameV2] Failed to build starting area:', e)
        }
      }

      loadAreaWorld({
        title: campaignData.title,
        startArea: startId,
        areas,
        areaBriefs: briefs,
        questObjectives: campaignData.questObjectives || [],
      })
      return
    }

    // Fallback — build demo area
    try {
      const demoArea = buildDemoArea()
      console.log('[GameV2] Demo area built:', demoArea.name || demoArea.id, `${demoArea.width}x${demoArea.height}`)
      loadArea(demoArea.id, demoArea)
      activateArea(demoArea.id)
      if (demoArea.playerStart) setPlayerPos(demoArea.playerStart)
    } catch (e) {
      console.error('[GameV2] Failed to build demo area:', e)
    }
  }, [])

  // Activate current area whenever currentAreaId changes (e.g. from multiplayer broadcast)
  useEffect(() => {
    if (currentAreaId && areas[currentAreaId] && !areaLayers) {
      activateArea(currentAreaId)
    }
  }, [currentAreaId, areas, areaLayers])

  useEffect(() => {
    dialogOpenRef.current = !!activeNpc
  }, [activeNpc])

  // Sync world transform from PixiApp to position chat bubbles (every frame for smooth tracking)
  useEffect(() => {
    let rafId
    function updateTransform() {
      const t = pixiRef.current?.getWorldTransform?.()
      if (t) setWorldTransform(prev =>
        prev && prev.x === t.x && prev.y === t.y && prev.scale === t.scale ? prev : t
      )
      rafId = requestAnimationFrame(updateTransform)
    }
    rafId = requestAnimationFrame(updateTransform)
    return () => cancelAnimationFrame(rafId)
  }, [zone])

  // Load API key from Supabase on mount
  useEffect(() => {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    if (!campaignId || !user?.id) {
      // No campaign context (e.g. ?v2 testing) — check sessionApiKey
      if (sessionApiKey) setApiKeyLoaded(true)
      return
    }
    if (isDM) {
      loadApiKeyFromSupabase(campaignId, user.id).then(key => {
        if (key) {
          useStore.getState().setSessionApiKey(key)
          broadcastApiKeySync(key)
        }
        setApiKeyLoaded(true)
      }).catch(() => setApiKeyLoaded(true))
    } else {
      // Non-DM: request key from DM
      broadcastRequestApiKey()
      // Give DM 2s to respond, then show gate
      const timer = setTimeout(() => setApiKeyLoaded(true), 2000)
      // If key arrives via broadcast before timeout, mark loaded
      const unsub = useStore.subscribe((state) => {
        if (state.sessionApiKey) { clearTimeout(timer); setApiKeyLoaded(true) }
      })
      return () => { clearTimeout(timer); unsub() }
    }
  }, [campaign?.id, user?.id, isDM])

  // Build walkability data from zone — V2 uses flat collision array, V1 uses boolean[][] grid
  const isV2Zone = Boolean(zone?.palette)
  const walkData = useMemo(() => {
    if (!zone?.layers) return null
    if (isV2Zone) {
      const w = zone.width, h = zone.height
      if (zone.wallEdges) {
        // Edge-based collision (sub-grid walls)
        return {
          type: 'v2-edge',
          wallEdges: zone.wallEdges,
          cellBlocked: zone.cellBlocked || new Uint8Array(w * h),
          width: w,
          height: h,
        }
      }
      // Fallback: cell-based collision (legacy V2 areas without wallEdges)
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
  const walkDataRef = useRef(walkData)
  walkDataRef.current = walkData

  // Build token list — uses playerPos so tokens update as player walks
  const tokens = useMemo(() => {
    if (!zone) return []
    const t = []
    t.push({
      id: 'player',
      name: myCharacter?.name || 'Hero',
      x: playerPos.x,
      y: playerPos.y,
      color: 0x0c1828,
      borderColor: CLASS_COLORS[myCharacter?.class] || 0x4499dd,
      isNpc: false,
    })
    if (zone.npcs) {
      zone.npcs.forEach(npc => {
        if (!npc.position) return
        t.push({
          id: npc.name,
          name: npc.name,
          x: npc.position.x,
          y: npc.position.y,
          color: 0x1a1208,
          borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
          isNpc: true,
          questRelevant: npc.questRelevant,
        })
      })
    }
    return t
  }, [playerPos, zone, myCharacter])

  // Nearby NPCs for chat bubbles — within 3 tiles, outside combat and dialog
  const nearbyNpcs = useMemo(() => {
    if (!zone?.npcs || inCombat || activeNpc) return []
    return zone.npcs.filter(npc => {
      if (!npc.position) return false
      const dx = Math.abs(playerPos.x - npc.position.x)
      const dy = Math.abs(playerPos.y - npc.position.y)
      return dx <= 3 && dy <= 3
    })
  }, [playerPos, zone, inCombat, activeNpc])

  // Click-to-move: pathfind and animate walk
  // Only update React state at the END — PixiJS handles the visual walk directly
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    const wd = walkDataRef.current
    const pos = playerPosRef.current
    if (!wd) return

    let path
    if (wd.type === 'v2-edge') {
      if (wd.cellBlocked[y * wd.width + x] === 1) return
      path = findPathEdge(
        { wallEdges: wd.wallEdges, cellBlocked: wd.cellBlocked },
        wd.width, wd.height, pos, { x, y }
      )
    } else if (wd.type === 'v2') {
      if (wd.collision[y * wd.width + x] === 1) return
      path = findPath(wd.collision, wd.width, wd.height, pos, { x, y })
    } else {
      if (!wd.grid[y]?.[x]) return
      path = findPathLegacy(wd.grid, pos, { x, y })
    }

    if (path && path.length > 1) {
      playerPosRef.current = { x, y }
      const tileSize = zone?.tileSize || 32
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x, y })
        // Auto-follow camera
        if (cameraRef.current) cameraRef.current.centerOn(x, y, tileSize)
      }, isV2Zone ? tileSize : undefined)
    }
  }, [zone, isV2Zone])

  // WASD keyboard movement — one tile at a time
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

      // Arrow keys: move token only when no camera (V1 zones); camera handler handles panning
      let dir = wasdDirs[e.key]
      if (!dir && !cameraRef.current) dir = arrowDirs[e.key]
      if (!dir) return
      e.preventDefault()

      if (isAnimating()) return
      const wd = walkDataRef.current
      const pos = playerPosRef.current
      const nx = pos.x + dir.x
      const ny = pos.y + dir.y

      if (wd?.type === 'v2-edge') {
        if (nx < 0 || nx >= wd.width || ny < 0 || ny >= wd.height) return
        if (wd.cellBlocked[ny * wd.width + nx] === 1) return
        // Check wall edge on BOTH sides — source exit edge and target entry edge
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

      const tileSize = zone?.tileSize || 32
      playerPosRef.current = { x: nx, y: ny }
      const path = [pos, { x: nx, y: ny }]
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x: nx, y: ny })
        // Auto-follow camera
        if (cameraRef.current) cameraRef.current.centerOn(nx, ny, tileSize)
      }, isV2Zone ? tileSize : undefined)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zone, isV2Zone])

  // Exit-proximity pre-generation — build upcoming areas before the player arrives
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
      // Persist to Supabase in background
      if (campaign?.id) {
        saveArea(campaign.id, builtArea).catch(err =>
          console.warn('[pre-gen] Failed to save:', err))
      }
    }
  }, [playerPos, area?.exits, areas, areaBriefs])

  // Area transition via exit click — fade-to-black visual
  const handleAreaTransition = useCallback((exit) => {
    if (transitioning || inCombat) return

    const targetId = exit.targetArea || exit.targetZone
    if (!targetId) return

    // Build area on-demand if not yet generated
    if (!areas[targetId]) {
      const brief = areaBriefs[targetId]
      if (!brief) {
        console.error(`[transition] No area or brief for "${targetId}"`)
        return
      }
      const builtArea = buildAreaFromBrief(brief)
      buildAndLoadArea(targetId, builtArea)
    }

    setTransitioning(true)
    const entry = exit.entryPoint || { x: 0, y: 0 }
    broadcastAreaTransition(targetId, entry)
    lastNpcTriggerRef.current = null

    const app = pixiRef.current?.getApp()
    if (app) {
      playZoneTransition(app, () => {
        // Midpoint (screen is black) — swap area
        activateArea(targetId)
        setPlayerPos(entry)
        playerPosRef.current = entry
      }, () => {
        // Complete — fade back in done
        setTransitioning(false)
      })
    } else {
      // Fallback if no PixiJS app
      activateArea(targetId)
      setPlayerPos(entry)
      playerPosRef.current = entry
      setTimeout(() => setTransitioning(false), 100)
    }
  }, [transitioning, inCombat, areas, areaBriefs, buildAndLoadArea, activateArea])

  const handleInteractFn = useCallback(() => {
    if (isAnimating()) return
    if (inCombat) return
    const pos = playerPosRef.current
    const result = handleInteract(pos, zone)
    if (!result) return

    if (result.type === 'npc') {
      const npc = result.target
      const busy = useStore.getState().npcBusy
      if (busy && busy.npcName === npc.name) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: `${npc.name} is speaking with ${busy.playerName}.` })
        return
      }
      if (npc.critical && !useStore.getState().hasStoryFlag(npc.criticalFlag)) {
        setActiveNpc({ ...npc, isCutscene: true })
      } else {
        setActiveNpc({ ...npc, isCutscene: false })
      }
    } else if (result.type === 'exit') {
      handleAreaTransition(result.target)
    }
  }, [zone, inCombat, addNarratorMessage, handleAreaTransition])

  handleInteractRef.current = handleInteractFn

  const handleNpcClick = useCallback((clickedToken) => {
    if (inCombat || isAnimating()) return
    const npc = zone?.npcs?.find(n => n.name === clickedToken.name || n.name === clickedToken.id)
    if (!npc) return
    const pos = playerPosRef.current
    const dx = Math.abs(pos.x - npc.position.x)
    const dy = Math.abs(pos.y - npc.position.y)
    if (dx > 1 || dy > 1) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `You need to move closer to ${npc.name}.` })
      return
    }
    handleInteractRef.current?.()
  }, [zone, inCombat, addNarratorMessage])

  const handleTool = useCallback((tool) => {
    if (tool === 'dice') setToolPanel('dice')
    else if (tool === 'character' || tool === 'inventory') setSheetChar(myCharacter)
    else if (tool === 'journal') setShowJournal(true)
    else if (tool === 'rest') setRestProposal({ type: 'short', proposedBy: myCharacter?.name || 'Someone' })
  }, [myCharacter])

  const handleEndTurn = useCallback(() => {
    nextEncounterTurn()
  }, [nextEncounterTurn])

  const handleCombatAction = useCallback((type) => {
    if (type === 'attack') {
      // Auto-attack the first living enemy (simplified — full target selection comes later)
      const enemies = encounter.combatants?.filter(c => c.isEnemy && c.hp > 0)
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!enemies?.length || !active) return

      const target = enemies[0]
      const bonus = active.attackBonus || 0
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + bonus
      const hit = d20 === 20 || total >= (target.ac || 10)
      const damage = hit ? Math.floor(Math.random() * 8) + 1 + (active.damageMod || 0) : 0

      if (hit && damage > 0) {
        applyEncounterDamage(target.id || target.name, damage)
      }
      useAction()

      const resultDesc = hit ? `Hit! ${damage} damage` : 'Miss!'
      const logEntry = `${active.name} attacks ${target.name}: d20=${d20}+${bonus}=${total} vs AC ${target.ac} — ${resultDesc}`
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: logEntry })

      // Fire-and-forget narration
      const apiKey = sessionApiKey
      if (apiKey) {
        narrateCombatAction(active.name, 'Attack', target.name, resultDesc, apiKey)
      }
    } else if (type === 'cast') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Spell casting UI coming soon — use the dice roller for manual rolls.' })
    } else if (type === 'move') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Click a tile to move during combat.' })
    } else if (type === 'say') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Type your message in the chat and press enter.' })
    }
  }, [encounter, applyEncounterDamage, useAction, addNarratorMessage, sessionApiKey, narrateCombatAction])

  // Auto-run enemy turns (host only)
  useEffect(() => {
    if (!inCombat) return
    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active || !active.isEnemy) return

    const apiKey = sessionApiKey
    const timer = setTimeout(() => {
      if (apiKey) {
        runEnemyTurn(apiKey)
      } else {
        // No API key — just skip enemy turn
        nextEncounterTurn()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [encounter.currentTurn, encounter.phase, inCombat, runEnemyTurn, sessionApiKey, nextEncounterTurn])

  const chatInFlightRef = useRef(false)

  const handleChat = useCallback(async (text) => {
    if (!text.trim()) return
    if (chatInFlightRef.current) return // prevent re-entrant calls (NPC proximity loop)
    const apiKey = sessionApiKey
    if (!apiKey) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'No API key set. Go to Settings to add your Claude API key.' })
      return
    }

    chatInFlightRef.current = true

    // Add player message
    const playerMsg = { role: 'player', speaker: myCharacter?.name || user?.email || 'Player', text: text.trim() }
    addNarratorMessage(playerMsg)
    broadcastNarratorMessage(playerMsg)

    try {
      // Build conversation for AI — read narrator from store directly to avoid stale closure
      const history = useStore.getState().narrator?.history || []
      const recentMessages = history.slice(-14).map(m => ({
        role: m.role === 'dm' ? 'assistant' : 'user',
        content: m.text,
      }))

      const systemPrompt = buildSystemPrompt(campaign, partyMembers, zone, recentMessages.length)

      const result = await callNarrator({
        messages: recentMessages,
        systemPrompt,
        apiKey,
      })

      if (result?.narrative) {
        const dmMsg = { role: 'dm', speaker: 'DM', text: result.narrative }
        addNarratorMessage(dmMsg)
        broadcastNarratorMessage(dmMsg)
      }

      // Handle combat trigger from AI
      if (result?.startCombat && result?.enemies?.length) {
        const { startEncounter } = useStore.getState()
        const enemies = result.enemies.map(e => ({
          ...e, isEnemy: true, type: 'enemy',
          position: e.position || { x: Math.floor(Math.random() * (zone?.width || 10)), y: Math.floor(Math.random() * (zone?.height || 8)) },
        }))
        startEncounter(enemies)
      }
    } catch (err) {
      console.error('[GameV2] Narrator error:', err)
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'The DM is momentarily distracted... (API error)' })
    } finally {
      chatInFlightRef.current = false
    }
  }, [sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage])

  // Gate: no API key = no game
  if (apiKeyLoaded && !sessionApiKey) {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    return (
      <ApiKeyGate
        campaignId={campaignId}
        userId={user?.id}
        onKeyReady={() => setApiKeyLoaded(true)}
      />
    )
  }

  if (!zone) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#08060c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: 18 }}>
        Loading world...
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp ref={pixiRef} zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleAreaTransition} onNpcClick={handleNpcClick} inCombat={inCombat} camera={cameraRef.current} roofManager={roofManagerRef.current} />
      {/* NPC Chat Bubbles */}
      {nearbyNpcs.map(npc => (
        <ChatBubble
          key={npc.name}
          npc={npc}
          tileSize={zone?.tileSize || 32}
          worldTransform={worldTransform}
        />
      ))}
      <GameHUD
        zone={zone}
        onTool={handleTool}
        onChat={handleChat}
        onEndTurn={handleEndTurn}
        onAction={handleCombatAction}
        onSettings={() => setShowApiSettings(true)}
        onLeave={onLeave}
      />
      {/* Debug: start test combat */}
      {!inCombat && (
        <button
          onClick={() => {
            try {
              const { startEncounter } = useStore.getState()
              const char = myCharacter || {
                id: 'test-hero', name: 'Test Hero', hp: 20, maxHp: 20, ac: 15,
                class: 'Fighter', level: 3, speed: 30, type: 'player',
                attackBonus: 5, damageMod: 3,
                stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
                attacks: [{ name: 'Longsword', bonus: '+5', damage: '1d8+3' }],
              }
              startEncounter([
                { name: 'Goblin', hp: 15, maxHp: 15, ac: 15, isEnemy: true, type: 'enemy',
                  attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
                  position: { x: 6, y: 4 }, speed: 30,
                  stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
                { name: 'Goblin Archer', hp: 12, maxHp: 12, ac: 13, isEnemy: true, type: 'enemy',
                  attacks: [{ name: 'Shortbow', bonus: '+4', damage: '1d6+2' }],
                  position: { x: 8, y: 3 }, speed: 30,
                  stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
              ], [char], true) // autoRollInitiative = true
            } catch (err) {
              console.error('[GameV2] Test combat failed:', err)
              addNarratorMessage({ role: 'dm', speaker: 'System', text: `Combat test failed: ${err.message}` })
            }
          }}
          className="hud-campaign-btn"
          style={{
            position: 'fixed', top: 50, right: 10, zIndex: 100,
            flexDirection: 'row', gap: 6, padding: '6px 14px',
            borderColor: 'rgba(204,51,51,0.4)',
          }}
        >
          <span>⚔</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#cc3333', fontWeight: 900, letterSpacing: 2 }}>
            TEST COMBAT
          </span>
        </button>
      )}
      <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      {sheetChar && (
        <CharacterSheetModal character={sheetChar} onClose={() => setSheetChar(null)} />
      )}
      {showApiSettings && (
        <ApiKeySettings userId={user?.id} onClose={() => setShowApiSettings(false)} />
      )}
      {showJournal && <JournalModal onClose={() => setShowJournal(false)} />}
      {restProposal && (
        <RestModal
          type={restProposal.type}
          proposedBy={restProposal.proposedBy}
          partyMembers={[{ id: user?.id, name: myCharacter?.name || 'You' }]}
          isHost={false}
          onResolve={() => setRestProposal(null)}
          onCancel={() => setRestProposal(null)}
        />
      )}
      {activeNpc && !activeNpc.isCutscene && (
        <NpcDialog npc={activeNpc} onClose={() => setActiveNpc(null)} />
      )}
      {/* Story Cutscene — initiator */}
      {activeNpc && activeNpc.isCutscene && (
        <StoryCutscene npc={activeNpc} pixiRef={pixiRef} onClose={() => setActiveNpc(null)} isWatching={false} />
      )}
      {/* Story Cutscene — watching via broadcast */}
      {!activeNpc && activeCutscene && activeCutscene.initiatorId !== user?.id && (
        <StoryCutscene
          npc={{ name: activeCutscene.npcName, criticalInfo: activeCutscene.criticalInfo, role: '' }}
          pixiRef={pixiRef}
          onClose={() => {}}
          isWatching={true}
        />
      )}
    </div>
  )
}
