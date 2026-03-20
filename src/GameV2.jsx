import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useStore from './store/useStore'
import { rollDamage } from './lib/dice'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import { buildTestArea } from './data/testArea.js'
import { buildDemoArea } from './data/demoArea.js'
import { buildAreaFromBrief } from './lib/areaBuilder.js'
import { saveArea } from './lib/areaStorage.js'
import { broadcastAreaTransition, broadcastNarratorMessage, broadcastApiKeySync, broadcastRequestApiKey, broadcastRoofReveal, broadcastEncounterAction } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { buildSystemPrompt, callNarrator } from './lib/narratorApi'
import { checkEncounterProximity, buildEncounterPrompt } from './lib/encounterZones'
import { handleInteract } from './lib/interactionController'
import { findPath, findPathLegacy, buildWalkabilityGrid, findPathEdge, getReachableTilesEdge } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import { animateTokenAlongPath, isAnimating } from './engine/TokenLayer'
import Camera from './engine/Camera'
import { buildFogTileStates, renderFog, updateExplored } from './engine/FogOfWar'
import { computeVision, getCharacterVisionRange } from './lib/visionCalculator'
import { RoofManager } from './engine/RoofLayer'
import { getReachableTiles, renderMovementRange, clearMovementRange } from './engine/MovementRange'
import { getTilesInSphere, getTilesInCone, getTilesInLine, getTilesInCube, renderAoEPreview, clearAoEPreview } from './engine/AoEOverlay'
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
  const roofStates = useStore(s => s.roofStates)

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
  const [targetingMode, setTargetingMode] = useState(null)
  const triggeredZonesRef = useRef(new Set())
  const dialogOpenRef = useRef(false)
  const handleInteractRef = useRef(null)
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos
  const lastNpcTriggerRef = useRef(null)
  const reachableTilesRef = useRef(new Set())

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
    roofManagerRef.current = new RoofManager()
    triggeredZonesRef.current = new Set()
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
    if (changes.length > 0 && isDM) {
      for (const { buildingId, revealed } of changes) {
        broadcastRoofReveal(buildingId, revealed)
      }
    }
  }, [playerPos, currentAreaId, zone])

  // Apply incoming roof reveal broadcasts (non-DM clients) to local RoofManager
  useEffect(() => {
    if (!roofStates || isDM) return
    const rm = roofManagerRef.current
    for (const [buildingId, revealed] of Object.entries(roofStates)) {
      rm.setRevealed(buildingId, revealed)
    }
  }, [roofStates])

  // --- Encounter zone proximity detection ---
  useEffect(() => {
    if (!zone?.encounterZones?.length || !playerPos || inCombat) return
    const pos = playerPosRef.current
    if (!pos) return

    const zones = zone.encounterZones.map(ez => {
      const center = ez.center || ez.position || { x: Math.floor((zone.width || 40) / 2), y: Math.floor((zone.height || 30) / 2) }
      return {
        ...ez,
        center,
        triggered: triggeredZonesRef.current.has(ez.id),
      }
    })

    const triggered = checkEncounterProximity(pos, zones)
    if (!triggered) return

    triggeredZonesRef.current.add(triggered.id)

    if (isDM) {
      broadcastEncounterAction({ type: 'encounter-zone-triggered', zoneId: triggered.id })
    }

    const prompt = buildEncounterPrompt(triggered, '')
    addNarratorMessage({ role: 'user', speaker: 'System', text: prompt })
  }, [playerPos, zone, inCombat, isDM, addNarratorMessage])

  // --- Escape to cancel targeting mode ---
  useEffect(() => {
    if (!targetingMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setTargetingMode(null)
        const layer = pixiRef.current?.getMovementRangeLayer?.()
        if (layer) clearAoEPreview(layer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [targetingMode])

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
    if (zone.enemies) {
      zone.enemies.forEach(e => {
        if (!e.position) return
        t.push({
          id: e.id,
          name: e.name,
          x: e.position.x,
          y: e.position.y,
          color: 0x8b0000,
          borderColor: 0xff3333,
          isEnemy: true,
          isNpc: false,
          showHpBar: inCombat,
          currentHp: e.currentHp,
          maxHp: e.maxHp,
        })
      })
    }
    return t
  }, [playerPos, zone, myCharacter, inCombat])

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

    // Attack targeting — resolve attack on clicked enemy
    if (targetingMode === 'attack' && inCombat) {
      const target = encounter.combatants.find(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position?.x === x && c.position?.y === y
      )
      if (!target) return // Clicked empty tile — ignore

      const active = encounter.combatants[encounter.currentTurn]
      if (!active || !active.position) return

      // Chebyshev distance for adjacency
      const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
      const weapon = active.attacks?.[0] || { name: 'Unarmed Strike', bonus: '+0', damage: '1' }
      const isRanged = weapon.range != null
      const maxRange = isRanged ? Math.floor((weapon.range || 80) / 5) : 1

      if (dist > maxRange) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target out of range.' })
        return
      }

      // Roll attack
      const bonus = parseInt(weapon.bonus) || 0
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + bonus
      const isCrit = d20 === 20
      const hit = isCrit || total >= (target.ac || 10)

      // Roll damage
      let damage = 0
      if (hit) {
        const dmgResult = rollDamage(weapon.damage || '1')
        damage = isCrit ? dmgResult.total * 2 : dmgResult.total
      }

      if (hit && damage > 0) {
        const { applyEncounterDamage: applyDmg } = useStore.getState()
        applyDmg(target.id || target.name, damage)
      }

      const { useAction: consumeAction } = useStore.getState()
      consumeAction(active.id)
      setTargetingMode(null)

      const entry = hit
        ? `${active.name} → ${target.name}: HIT! d20(${d20})+${bonus}=${total} vs AC ${target.ac}. ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}.`
        : `${active.name} → ${target.name}: MISS. d20(${d20})+${bonus}=${total} vs AC ${target.ac}.`
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
      broadcastEncounterAction({ type: 'attack-result', attackerId: active.id, targetId: target.id, hit, damage, log: entry })

      // Fire-and-forget narration
      const apiKey = sessionApiKey
      if (apiKey) {
        const resultDesc = hit ? `Hit! ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}` : 'Miss!'
        narrateCombatAction(active.name, 'Attack', target.name, resultDesc, apiKey)
      }
      return
    }

    // Spell AoE targeting — resolve area damage with saving throws
    if (targetingMode?.type === 'spell' && inCombat) {
      const spell = targetingMode.spell
      const active = encounter.combatants[encounter.currentTurn]
      if (!active?.position) return

      // Check range (Chebyshev distance in tiles)
      const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
      const maxRange = Math.floor((spell.range || 60) / 5)
      if (dist > maxRange) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Out of range.' })
        return
      }

      // Get affected tiles based on area type
      const radiusTiles = Math.floor((spell.areaSize || 10) / 5)
      let affectedTiles
      if (spell.areaType === 'sphere') {
        affectedTiles = getTilesInSphere({ x, y }, radiusTiles)
      } else if (spell.areaType === 'cube') {
        affectedTiles = getTilesInCube({ x, y }, radiusTiles * 2 + 1)
      } else if (spell.areaType === 'line') {
        // Determine direction from caster to target
        const dx2 = x - active.position.x
        const dy2 = y - active.position.y
        const dir = Math.abs(dx2) >= Math.abs(dy2) ? (dx2 > 0 ? 'E' : 'W') : (dy2 > 0 ? 'S' : 'N')
        affectedTiles = getTilesInLine(active.position, dir, radiusTiles)
      } else if (spell.areaType === 'cone') {
        const dx2 = x - active.position.x
        const dy2 = y - active.position.y
        const dir = Math.abs(dx2) >= Math.abs(dy2) ? (dx2 > 0 ? 'E' : 'W') : (dy2 > 0 ? 'S' : 'N')
        affectedTiles = getTilesInCone(active.position, dir, radiusTiles)
      } else {
        affectedTiles = getTilesInSphere({ x, y }, radiusTiles) // fallback
      }

      // Show final AoE highlight briefly
      const layer = pixiRef.current?.getMovementRangeLayer?.()
      if (layer) renderAoEPreview(layer, affectedTiles, zone?.tileSize || 200)

      // Find affected combatants
      const affected = encounter.combatants.filter(c =>
        (c.currentHp ?? c.hp) > 0 && c.position &&
        affectedTiles.some(t => t.x === c.position.x && t.y === c.position.y)
      )

      // Compute spell save DC: 8 + proficiency + casting ability modifier
      const prof = Math.floor(((active.level || 1) - 1) / 4) + 2
      const castAbility = spell.castingAbility || 'int'
      const castMod = Math.floor(((active.stats?.[castAbility] || 10) - 10) / 2)
      const saveDC = 8 + prof + castMod

      // Roll base damage once (all targets take same base)
      const baseDmg = rollDamage(spell.damage || '1d6').total

      // Resolve saves for each affected target
      const saveAbility = spell.saveAbility || 'dex'
      for (const target of affected) {
        const saveMod = Math.floor(((target.stats?.[saveAbility] || 10) - 10) / 2)
        const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod
        const saved = saveRoll >= saveDC
        const dmg = saved && spell.halfOnSave ? Math.floor(baseDmg / 2) : saved ? 0 : baseDmg

        if (dmg > 0) {
          const { applyEncounterDamage: applyDmg } = useStore.getState()
          applyDmg(target.id, dmg)
        }

        const entry = `${target.name}: ${saveAbility.toUpperCase()} save ${saveRoll} vs DC ${saveDC} — ${saved ? 'SAVE' : 'FAIL'} (${dmg} ${spell.name} damage)`
        addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
      }

      // Consume action and broadcast
      const { useAction: consumeAction } = useStore.getState()
      consumeAction(active.id)
      broadcastEncounterAction({ type: 'aoe-resolve', spellName: spell.name, casterId: active.id, affectedTiles, saveDC })

      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} casts ${spell.name}!` })

      // Clear targeting after a brief delay so players see the highlight
      setTimeout(() => {
        setTargetingMode(null)
        if (layer) clearAoEPreview(layer)
      }, 1500)
      return
    }

    // Combat movement — click within reachable range to move active combatant
    if (inCombat && zone?.wallEdges) {
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.isEnemy || !active.position) return
      if (!reachableTilesRef.current.has(`${x},${y}`)) return

      const collisionData = {
        wallEdges: zone.wallEdges,
        cellBlocked: zone.cellBlocked || new Uint8Array(zone.width * zone.height),
      }
      const path = findPathEdge(collisionData, zone.width, zone.height, active.position, { x, y })
      if (!path || path.length < 2) return

      const cost = path.length - 1
      const { moveToken } = useStore.getState()
      moveToken(active.id, x, y, cost)
      const tileSize = zone.tileSize || 200
      animateTokenAlongPath(active.id, path, null, () => {
        if (cameraRef.current) cameraRef.current.centerOn(x, y, tileSize)
      }, tileSize)
      broadcastEncounterAction({ type: 'move-token', id: active.id, position: { x, y }, cost })
      return
    }

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
  }, [zone, isV2Zone, inCombat, encounter, targetingMode, addNarratorMessage, sessionApiKey, narrateCombatAction])

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
      setTargetingMode('attack')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Select a target to attack. Press Escape to cancel.' })
      return
    } else if (type === 'cast') {
      // Hardcoded test spell — full spell selection UI comes later
      const testSpell = {
        name: 'Fireball',
        areaType: 'sphere',
        areaSize: 20, // feet
        range: 150,   // feet
        damage: '8d6',
        saveAbility: 'dex',
        halfOnSave: true,
        castingAbility: 'int',
      }
      setTargetingMode({ type: 'spell', spell: testSpell })
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Targeting ${testSpell.name}. Click to place. Press Escape to cancel.` })
      return
    } else if (type === 'move') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Click a tile to move during combat.' })
    } else if (type === 'say') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Type your message in the chat and press enter.' })
    }
  }, [addNarratorMessage])

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

  // Show movement range during the active player's combat turn
  useEffect(() => {
    const mrLayer = pixiRef.current?.getMovementRangeLayer?.()
    if (!mrLayer) return

    if (!inCombat || !zone?.wallEdges) {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
      return
    }

    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active || active.isEnemy || !active.position) {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
      return
    }

    // Build set of enemy-occupied tiles to block movement through them
    const enemyTiles = new Set(
      encounter.combatants
        .filter(c => c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position)
        .map(c => `${c.position.x},${c.position.y}`)
    )

    const maxMove = active.remainingMove ?? Math.floor((active.speed || 30) / 5)
    const reachable = getReachableTilesEdge(
      { wallEdges: zone.wallEdges, cellBlocked: zone.cellBlocked || new Uint8Array(zone.width * zone.height) },
      zone.width, zone.height,
      active.position,
      maxMove,
      null,
      enemyTiles
    )
    reachableTilesRef.current = reachable

    const tileSize = zone.tileSize || 200
    renderMovementRange(mrLayer, reachable, 0x44cc66, 0.15, tileSize)

    return () => {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
    }
  }, [encounter.currentTurn, encounter.phase, encounter.combatants, inCombat, zone])

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
