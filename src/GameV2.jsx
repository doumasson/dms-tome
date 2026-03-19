import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoWorld from './data/demoWorld.json'
import { buildWorldFromAiOutput } from './lib/campaignGenerator'
import { broadcastZoneTransition, broadcastNarratorMessage, broadcastApiKeySync, broadcastRequestApiKey } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { buildSystemPrompt, callNarrator } from './lib/narratorApi'
import { handleInteract } from './lib/interactionController'
import { findPathLegacy as findPath, buildWalkabilityGrid } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import { animateTokenAlongPath, isAnimating } from './engine/TokenLayer'
import Camera from './engine/Camera'
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
  const currentZoneId = useStore(s => s.currentZoneId)
  const zones = useStore(s => s.campaign.zones)
  const loadZoneWorld = useStore(s => s.loadZoneWorld)
  const setCurrentZone = useStore(s => s.setCurrentZone)
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
  const pendingEntryPoint = useStore(s => s.pendingEntryPoint)
  const clearPendingEntryPoint = useStore(s => s.clearPendingEntryPoint)
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

  // Area camera — instantiate when zone signals camera mode (e.g. large procedural maps)
  const useAreaCamera = zone?.useCamera || false
  useEffect(() => {
    if (!useAreaCamera) {
      cameraRef.current = null
      return
    }
    const container = pixiRef.current?.getApp()?.canvas?.parentElement
    const w = container?.clientWidth || window.innerWidth
    const h = container?.clientHeight || window.innerHeight
    const cam = new Camera(w, h)
    const tileSize = 200 // procedural area tile size
    cam.setAreaBounds(zone.width * tileSize, zone.height * tileSize)
    // Center on player start
    cam.centerOnImmediate(playerPosRef.current.x, playerPosRef.current.y, tileSize)
    cameraRef.current = cam
  }, [useAreaCamera, zone?.width, zone?.height])

  // Camera keyboard controls — pan with WASD/arrows, spacebar to recenter
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return

    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
    }

    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (keyMap[e.key]) { cam.startPan(keyMap[e.key]); e.preventDefault() }
      if (e.key === ' ') {
        const myPos = playerPosRef.current
        if (myPos) cam.centerOn(myPos.x, myPos.y, 200)
        e.preventDefault()
      }
    }
    const onKeyUp = (e) => {
      if (keyMap[e.key]) cam.stopPan(keyMap[e.key])
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [useAreaCamera])

  // Camera scroll-wheel zoom
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      cam.zoomAt(delta, e.clientX, e.clientY)
    }
    const canvas = pixiRef.current?.getApp()?.canvas
    if (!canvas) return
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [useAreaCamera])

  // Load zone world on mount — use campaign zones if available, else demo world
  useEffect(() => {
    if (!zones) {
      try {
        // Check if campaign has zone data from AI generation
        const campaignData = campaign
        const hasZoneData = campaignData?.zones && (Array.isArray(campaignData.zones) ? campaignData.zones.length > 0 : Object.keys(campaignData.zones).length > 0)
        const source = hasZoneData ? campaignData : demoWorld
        const world = buildWorldFromAiOutput(source)
        console.log('[GameV2] Built world:', world.title, Object.keys(world.zones).length, 'zones', hasZoneData ? '(from campaign)' : '(demo)')
        loadZoneWorld(world)
        const startZone = world.zones[world.startZone]
        if (startZone) {
          const entrance = startZone.exits?.[0]?.entryPoint || { x: Math.floor(startZone.width / 2), y: Math.floor(startZone.height / 2) }
          setPlayerPos(entrance)
        }
      } catch (e) {
        console.error('[GameV2] Failed to build world:', e)
      }
    }
  }, [zones, loadZoneWorld, campaign])

  // Handle zone transitions received from multiplayer broadcast (non-DM clients)
  useEffect(() => {
    if (pendingEntryPoint) {
      setPlayerPos(pendingEntryPoint)
      playerPosRef.current = pendingEntryPoint
      lastNpcTriggerRef.current = null
      clearPendingEntryPoint()
    }
  }, [pendingEntryPoint, clearPendingEntryPoint])

  useEffect(() => {
    dialogOpenRef.current = !!activeNpc
  }, [activeNpc])

  // Poll world transform from PixiApp to position chat bubbles
  useEffect(() => {
    function updateTransform() {
      const t = pixiRef.current?.getWorldTransform?.()
      if (t) setWorldTransform(t)
    }
    updateTransform()
    const interval = setInterval(updateTransform, 200)
    return () => clearInterval(interval)
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

  const zone = zones?.[currentZoneId] || null

  // Build walkability grid from zone data
  const walkGrid = useMemo(() => {
    if (!zone?.layers) return null
    return buildWalkabilityGrid(zone.layers.walls, zone.layers.props, getBlockingSet(), zone.width, zone.height)
  }, [zone])
  const walkGridRef = useRef(walkGrid)
  walkGridRef.current = walkGrid

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
    const grid = walkGridRef.current
    const pos = playerPosRef.current
    if (!grid || !grid[y]?.[x]) return
    const path = findPath(grid, pos, { x, y })
    if (path && path.length > 1) {
      // Update ref immediately so WASD knows the target position
      playerPosRef.current = { x, y }
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x, y })
      })
    }
  }, [])

  // WASD keyboard movement — one tile at a time
  useEffect(() => {
    const dirs = {
      w: { x: 0, y: -1 }, W: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 },
      s: { x: 0, y: 1 },  S: { x: 0, y: 1 },  ArrowDown: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, A: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 },
      d: { x: 1, y: 0 },  D: { x: 1, y: 0 },  ArrowRight: { x: 1, y: 0 },
    }

    function handleKeyDown(e) {
      // Don't move if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Block movement during NPC dialog
      if (dialogOpenRef.current) return

      // E key — interact with adjacent NPC or exit
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleInteractRef.current?.()
        return
      }

      const dir = dirs[e.key]
      if (!dir) return
      e.preventDefault()

      if (isAnimating()) return
      const grid = walkGridRef.current
      const pos = playerPosRef.current
      const nx = pos.x + dir.x
      const ny = pos.y + dir.y
      if (!grid || ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0]?.length) return
      if (!grid[ny][nx]) return

      // Animate one tile step
      playerPosRef.current = { x: nx, y: ny }
      const path = [pos, { x: nx, y: ny }]
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x: nx, y: ny })
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Zone transition via exit click — fade-to-black visual
  const handleExitClick = useCallback(({ targetZone, entryPoint }) => {
    if (transitioning || inCombat || !zones?.[targetZone]) return
    setTransitioning(true)
    broadcastZoneTransition(targetZone, entryPoint)
    lastNpcTriggerRef.current = null

    const app = pixiRef.current?.getApp()
    if (app) {
      playZoneTransition(app, () => {
        // Midpoint (screen is black) — swap zone
        setCurrentZone(targetZone)
        setPlayerPos(entryPoint || { x: 5, y: 5 })
        playerPosRef.current = entryPoint || { x: 5, y: 5 }
      }, () => {
        // Complete — fade back in done
        setTransitioning(false)
      })
    } else {
      // Fallback if no PixiJS app
      setCurrentZone(targetZone)
      setPlayerPos(entryPoint || { x: 5, y: 5 })
      playerPosRef.current = entryPoint || { x: 5, y: 5 }
      setTimeout(() => setTransitioning(false), 100)
    }
  }, [transitioning, inCombat, zones, setCurrentZone])

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
      handleExitClick({ targetZone: result.target.targetZone, entryPoint: result.target.entryPoint })
    }
  }, [zone, inCombat, addNarratorMessage, handleExitClick])

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
      <PixiApp ref={pixiRef} zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleExitClick} onNpcClick={handleNpcClick} inCombat={inCombat} camera={cameraRef.current} />
      {/* NPC Chat Bubbles */}
      {nearbyNpcs.map(npc => (
        <ChatBubble
          key={npc.name}
          npc={npc}
          tileSize={32}
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
