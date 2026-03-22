import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import { broadcastApiKeySync, broadcastRequestApiKey, broadcastEncounterAction } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { checkEncounterProximity, buildEncounterPrompt } from './lib/encounterZones'
import { handleInteract } from './lib/interactionController'
import { isAnimating } from './engine/TokenLayer'
import ChatBubble from './components/ChatBubble'
import ApiKeySettings from './components/ApiKeySettings'
import SkillCheckPanel from './components/SkillCheckPanel'
import OAConfirmModal from './components/v2/OAConfirmModal'
import TestCombatButton from './components/v2/TestCombatButton'
import WeaponPickerModal from './hud/WeaponPickerModal'
import SpellPickerModal from './hud/SpellPickerModal'

import { useAreaCamera } from './hooks/useAreaCamera'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useFogOfWar } from './hooks/useFogOfWar'
import { useRoofManager } from './hooks/useRoofManager'
import { useCombatActions } from './hooks/useCombatActions'
import { useAreaTransition } from './hooks/useAreaTransition'
import { useWorldMovement } from './hooks/useWorldMovement'
import { useStealthMode } from './hooks/useStealthMode'
import { useNarratorChat } from './hooks/useNarratorChat'
import { useWorldLoader } from './hooks/useWorldLoader'
import { getNpcMovements } from './lib/npcScheduler.js'
import { getTimeOfDay } from './lib/gameTime.js'
import { findPathEdge } from './lib/pathfinding'
import { animateTokenAlongPath } from './engine/TokenLayer'
import './hud/hud.css'

const DiceTray            = lazy(() => import('./components/DiceTray'))
const CharacterSheetModal = lazy(() => import('./components/characterSheet/CharacterSheetModal'))
const RestModal           = lazy(() => import('./components/RestModal'))
const NpcDialog           = lazy(() => import('./components/NpcDialog'))
const StoryCutscene       = lazy(() => import('./components/StoryCutscene'))
const JournalModal        = lazy(() => import('./components/JournalModal'))
const LootScreen          = lazy(() => import('./components/LootScreen'))
const LevelUpModal        = lazy(() => import('./components/LevelUpModal'))
const ShopPanel           = lazy(() => import('./components/ShopPanel'))
const FormationPanel      = lazy(() => import('./components/FormationPanel'))
const CombatDebugOverlay  = lazy(() => import('./hud/CombatDebugOverlay'))
const WorldMap            = lazy(() => import('./hud/WorldMap'))

// ─── D&D 5e XP thresholds (inlined from LevelUpModal to avoid static import) ──
const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]
function levelFromXp(xp) {
  let level = 1
  for (let l = 1; l <= 20; l++) {
    if (xp >= XP_THRESHOLDS[l - 1]) level = l
    else break
  }
  return Math.min(level, 20)
}

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
  const activateArea = useStore(s => s.activateArea)
  const myCharacter = useStore(s => s.myCharacter)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const user = useStore(s => s.user)
  const encounter = useStore(s => s.encounter)
  const nextEncounterTurn = useStore(s => s.nextEncounterTurn)
  const inCombat = encounter.phase === 'combat'
  const sessionApiKey = useStore(s => s.sessionApiKey)
  const isDM = useStore(s => s.isDM)
  const activeCampaign = useStore(s => s.activeCampaign)
  const narrateCombatAction = useStore(s => s.narrateCombatAction)
  const campaign = useStore(s => s.campaign)
  const partyMembers = useStore(s => s.partyMembers)
  const activeCutscene = useStore(s => s.activeCutscene)
  const advanceGameTime = useStore(s => s.advanceGameTime)
  const gameTime = useStore(s => s.gameTime)
  const pendingLoot = useStore(s => s.pendingLoot)
  const setPendingLoot = useStore(s => s.setPendingLoot)
  const applyLevelUp = useStore(s => s.applyLevelUp)
  const setPendingEncounterData = useStore(s => s.setPendingEncounterData)
  const clearPendingEncounterData = useStore(s => s.clearPendingEncounterData)

  const pixiRef = useRef(null)
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [activeMode, setActiveMode] = useState(null) // BG2-style mode screen: 'character' | 'inventory' | 'journal' | 'map' | 'settings' | null
  const [restProposal, setRestProposal] = useState(null)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [activeNpc, setActiveNpc] = useState(null)
  const [activeShop, setActiveShop] = useState(null)
  const [worldTransform, setWorldTransform] = useState(null)
  const [showFormation, setShowFormation] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const dismissedLevelRef = useRef(null)
  const dialogOpenRef = useRef(false)
  const handleInteractRef = useRef(null)
  const handleChatRef = useRef(null)
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos

  const area = areas[currentAreaId] || null
  const zone = area
  const isV2Zone = Boolean(zone?.palette)
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

  // --- Extracted hooks ---
  const { cameraRef } = useAreaCamera({ zone, playerPosRef })
  useAmbientAudio({ theme: zone?.theme, inCombat })

  useFogOfWar({ zone, playerPos, playerPosRef, currentAreaId, myCharacter, isDM, pixiRef, cameraRef })

  const { roofManagerRef, triggeredZonesRef } = useRoofManager({ zone, playerPos, playerPosRef, currentAreaId, isDM })

  const {
    targetingMode, pendingOA, setPendingOA,
    handleCombatTileClick, handleCombatAction, executeMoveWithOA,
    showWeaponPicker, setShowWeaponPicker,
    showSpellPicker, setShowSpellPicker,
    handleSpellSelected, handleWeaponSelected, selectedWeapon,
  } = useCombatActions({ zone, encounter, pixiRef, cameraRef, sessionApiKey, addNarratorMessage, narrateCombatAction, inCombat, isDM })

  const { handleAreaTransition } = useAreaTransition({
    area, areas, areaBriefs, inCombat, campaign, pixiRef,
    setPlayerPos, playerPosRef, advanceGameTime, playerPos,
  })

  const { handleWorldTileClick } = useWorldMovement({
    zone, isV2Zone, playerPos, setPlayerPos, playerPosRef,
    cameraRef, dialogOpenRef, handleInteractRef, user,
  })

  // --- Stealth approach system ---
  const { stealthMode } = useStealthMode({ playerPos, playerPosRef, partyMembers, zone })

  // --- Combined tile click handler ---
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    // Combat logic gets first pass
    if (handleCombatTileClick({ x, y })) return
    // Non-combat world movement
    handleWorldTileClick({ x, y })
  }, [handleCombatTileClick, handleWorldTileClick])

  // --- Teleport player into combat zone if outside bounds ---
  const prevInCombatRef = useRef(false)
  useEffect(() => {
    if (inCombat && !prevInCombatRef.current && encounter.combatants?.length) {
      // Combat just started — compute bounds from all combatant positions
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
        const pad = 2
        const bx0 = minX - pad, by0 = minY - pad, bx1 = maxX + pad, by1 = maxY + pad
        const pos = playerPosRef.current
        if (pos.x < bx0 || pos.x > bx1 || pos.y < by0 || pos.y > by1) {
          // Clamp to nearest edge of combat zone
          const nx = Math.max(bx0, Math.min(bx1, pos.x))
          const ny = Math.max(by0, Math.min(by1, pos.y))
          setPlayerPos({ x: nx, y: ny })
          playerPosRef.current = { x: nx, y: ny }
          if (cameraRef.current) cameraRef.current.centerOn(nx, ny, zone?.tileSize || 200)
        }
      }
    }
    prevInCombatRef.current = inCombat
  }, [inCombat])

  // --- Watch for XP crossing a level threshold ---
  useEffect(() => {
    if (!myCharacter) return
    const xp = myCharacter.xp || 0
    const currentLevel = myCharacter.level || 1
    const earnedLevel = levelFromXp(xp)
    if (earnedLevel > currentLevel && currentLevel < 20 && dismissedLevelRef.current !== currentLevel) {
      setShowLevelUp(true)
    }
  }, [myCharacter?.xp])

  // --- Encounter zone proximity detection ---
  // --- Encounter zone proximity detection ---
  // Requires player to MOVE into the zone (not spawn inside it).
  // Track that player has moved at least once before allowing triggers.
  const hasMovedRef = useRef(false)
  const prevPlayerPosRef = useRef(null)
  useEffect(() => {
    if (prevPlayerPosRef.current && (prevPlayerPosRef.current.x !== playerPos.x || prevPlayerPosRef.current.y !== playerPos.y)) {
      hasMovedRef.current = true
    }
    prevPlayerPosRef.current = playerPos
  }, [playerPos])

  useEffect(() => {
    if (!zone?.encounterZones?.length || !playerPos || inCombat) return
    if (!hasMovedRef.current) return // Don't trigger on spawn
    if (stealthMode?.active) return // Already sneaking — don't trigger new encounters
    const pos = playerPosRef.current
    if (!pos) return

    const zones = zone.encounterZones.map(ez => {
      const center = ez.center || ez.position || { x: Math.floor((zone.width || 40) / 2), y: Math.floor((zone.height || 30) / 2) }
      return { ...ez, center, triggered: triggeredZonesRef.current.has(ez.id) }
    })

    const triggered = checkEncounterProximity(pos, zones)
    if (!triggered) return

    triggeredZonesRef.current.add(triggered.id)
    if (isDM || !activeCampaign) {
      broadcastEncounterAction({ type: 'encounter-zone-triggered', zoneId: triggered.id })
    }

    const prompt = buildEncounterPrompt(triggered, '')

    // Call AI DM for narrative flavor, then auto-start combat with zone enemies
    const startCombatWithZoneEnemies = () => {
      const { startEncounter } = useStore.getState()
      // Get enemies from the zone data that match this encounter
      const zoneEnemies = (zone.enemies || []).filter(e => {
        const enemyNames = triggered.enemies || []
        return enemyNames.some(name => e.name?.includes(name) || e.id?.includes(name))
      })
      // Fall back to all zone enemies if no match
      const enemies = zoneEnemies.length > 0 ? zoneEnemies : (zone.enemies || [])
      if (enemies.length > 0) {
        const combatEnemies = enemies.map(e => ({
          ...e, isEnemy: true, type: 'enemy',
          position: e.position || { x: pos.x + 2, y: pos.y },
        }))
        // Include current player with live position so combat places them correctly
        const myChar = useStore.getState().myCharacter
        const combatParty = (partyMembers || []).map(p => ({
          ...p,
          position: (myChar && (p.id === myChar.id || p.name === myChar.name))
            ? { ...playerPosRef.current }
            : null,
        }))
        // Ensure host player is included even if not in partyMembers
        if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
          combatParty.push({ ...myChar, position: { ...playerPosRef.current } })
        }
        startEncounter(combatEnemies, combatParty, true)
      }
    }

    if (sessionApiKey) {
      // AI narrates first — store encounter data so stealth check can defer combat
      const encounterPayload = { startCombatWithZoneEnemies, triggered, enemyPositions: (zone.enemies || []).filter(e => e.position).map(e => ({ ...e.position, name: e.name, wis: e.stats?.wis ?? 10 })) }
      setPendingEncounterData(encounterPayload)
      setTimeout(async () => {
        const chat = handleChatRef.current
        if (chat) await chat(prompt)
        // After AI responds, check if a skill check was requested (stealth).
        // setPendingSkillCheck is called synchronously in useNarratorChat after
        // chat() resolves, so we can check immediately with a microtask delay.
        await new Promise(r => setTimeout(r, 50))
        const { pendingSkillCheck, pendingEncounterData: ped } = useStore.getState()
        if (!pendingSkillCheck && ped) {
          // No stealth check requested — start combat immediately
          clearPendingEncounterData()
          startCombatWithZoneEnemies()
        }
        // If pendingSkillCheck exists, the stealth result watcher handles it
      }, 100)
    } else {
      // No API key — just start combat directly
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: triggered.dmPrompt || 'Combat begins!' })
      startCombatWithZoneEnemies()
    }
  }, [playerPos, zone, inCombat, isDM, addNarratorMessage, sessionApiKey, partyMembers])

  // --- NPC schedule movement on time-of-day changes ---
  useEffect(() => {
    if (!zone?.npcs?.length || !gameTime) return
    const poiPositions = zone.poiPositions
    if (!poiPositions) return
    const timeOfDay = getTimeOfDay(gameTime.hour)
    const movements = getNpcMovements(zone.npcs, timeOfDay, poiPositions)
    const wallEdges = zone.wallEdges
    const cellBlocked = zone.cellBlocked
    const w = zone.width
    const h = zone.height
    if (!wallEdges) return

    for (const { npc, targetPosition } of movements) {
      if (!npc.position) continue
      const path = findPathEdge(
        { wallEdges, cellBlocked: cellBlocked || new Uint8Array(w * h) },
        w, h, npc.position, targetPosition
      )
      if (!path || path.length < 2) continue
      const npcId = npc.name
      animateTokenAlongPath(npcId, path, null, () => {
        npc.position = { ...targetPosition }
      }, zone.tileSize || 200)
    }
  }, [gameTime?.hour, zone?.npcs])

  // --- Load area world on mount ---
  useWorldLoader({ campaign, setPlayerPos })

  // Activate current area whenever currentAreaId changes
  useEffect(() => {
    if (currentAreaId && areas[currentAreaId] && !areaLayers) {
      activateArea(currentAreaId)
    }
  }, [currentAreaId, areas, areaLayers])

  useEffect(() => {
    dialogOpenRef.current = !!activeNpc
  }, [activeNpc])

  // Sync world transform from PixiApp for chat bubble positioning
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
      broadcastRequestApiKey()
      const warningTimer = setTimeout(() => {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Waiting for DM to share API key...' })
      }, 5000)
      const timer = setTimeout(() => setApiKeyLoaded(true), 15000)
      const unsub = useStore.subscribe((state) => {
        if (state.sessionApiKey) { clearTimeout(warningTimer); clearTimeout(timer); setApiKeyLoaded(true) }
      })
      return () => { clearTimeout(warningTimer); clearTimeout(timer); unsub() }
    }
  }, [campaign?.id, user?.id, isDM])

  // --- Token list ---
  const tokens = useMemo(() => {
    if (!zone) return []
    const t = []

    // During combat, render tokens from encounter.combatants (live positions + HP)
    if (inCombat && encounter.combatants?.length) {
      const activeCombatantId = encounter.combatants[encounter.currentTurn]?.id
      encounter.combatants.forEach(c => {
        if (!c.position) return
        const isEnemy = c.type === 'enemy'
        const isDead = (c.currentHp ?? 0) <= 0
        t.push({
          id: c.id, name: c.name,
          x: c.position.x, y: c.position.y,
          color: isEnemy ? 0x8b0000 : 0x0c1828,
          borderColor: isEnemy ? 0xff3333 : (CLASS_COLORS[c.class] || 0x4499dd),
          isEnemy, isNpc: false,
          isActive: c.id === activeCombatantId,
          showHpBar: true,
          currentHp: c.currentHp ?? c.maxHp,
          maxHp: c.maxHp ?? 10,
          opacity: isDead ? 0.3 : 1,
        })
      })
    } else {
      // Exploration mode — player + NPCs + area enemies
      t.push({
        id: 'player',
        name: myCharacter?.name || 'Hero',
        x: playerPos.x, y: playerPos.y,
        color: 0x0c1828,
        borderColor: CLASS_COLORS[myCharacter?.class] || 0x4499dd,
        isNpc: false,
      })
      if (zone.npcs) {
        zone.npcs.forEach(npc => {
          if (!npc.position) return
          t.push({
            id: npc.name, name: npc.name,
            x: npc.position.x, y: npc.position.y,
            color: 0x1a1208,
            borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
            isNpc: true, questRelevant: npc.questRelevant,
          })
        })
      }
      if (zone.enemies) {
        zone.enemies.forEach(e => {
          if (!e.position) return
          t.push({
            id: e.id, name: e.name,
            x: e.position.x, y: e.position.y,
            color: 0x8b0000, borderColor: 0xff3333,
            isEnemy: true, isNpc: false,
          })
        })
      }
    }

    // Always include NPCs during combat for visual context
    if (inCombat && zone.npcs) {
      zone.npcs.forEach(npc => {
        if (!npc.position) return
        t.push({
          id: npc.name, name: npc.name,
          x: npc.position.x, y: npc.position.y,
          color: 0x1a1208,
          borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
          isNpc: true, questRelevant: npc.questRelevant,
        })
      })
    }
    return t
  }, [playerPos, zone, myCharacter, inCombat, encounter.combatants, encounter.currentTurn])

  // Nearby NPCs for chat bubbles
  const nearbyNpcs = useMemo(() => {
    if (!zone?.npcs || inCombat || activeNpc) return []
    return zone.npcs.filter(npc => {
      if (!npc.position) return false
      const dx = Math.abs(playerPos.x - npc.position.x)
      const dy = Math.abs(playerPos.y - npc.position.y)
      return dx <= 3 && dy <= 3
    })
  }, [playerPos, zone, inCombat, activeNpc])

  // --- Interaction handlers ---
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
      if (npc.shopType) {
        setActiveShop({ npc, shopType: npc.shopType })
      } else if (npc.critical && !useStore.getState().hasStoryFlag(npc.criticalFlag)) {
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
    else if (tool === 'short-rest') setRestProposal({ type: 'short', proposedBy: myCharacter?.name || 'Someone' })
    else if (tool === 'long-rest') setRestProposal({ type: 'long', proposedBy: myCharacter?.name || 'Someone' })
    else if (tool === 'formation') setShowFormation(true)
  }, [myCharacter])

  const handleModeSelect = useCallback((mode) => {
    // Toggle off if already active
    if (activeMode === mode) { setActiveMode(null); return }
    // Character mode opens the character sheet
    if (mode === 'character' || mode === 'inventory') {
      setSheetChar(myCharacter)
      setActiveMode(mode)
    } else if (mode === 'journal') {
      setShowJournal(true)
      setActiveMode(null) // journal has its own modal
    } else if (mode === 'settings') {
      setShowApiSettings(true)
      setActiveMode(null)
    } else {
      setActiveMode(mode) // map or future modes — show placeholder
    }
  }, [activeMode, myCharacter])

  const handleEndTurn = useCallback(() => {
    nextEncounterTurn()
    broadcastEncounterAction({ type: 'next-turn', userId: user?.id || 'system' })
  }, [nextEncounterTurn, user])

  // --- Chat handler ---
  const { handleChat } = useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef })
  handleChatRef.current = handleChat

  // --- Early returns ---
  if (apiKeyLoaded && !sessionApiKey) {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    return <ApiKeyGate campaignId={campaignId} userId={user?.id} onKeyReady={() => setApiKeyLoaded(true)} />
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
      {nearbyNpcs.map(npc => (
        <ChatBubble key={npc.name} npc={npc} tileSize={zone?.tileSize || 32} worldTransform={worldTransform} />
      ))}
      <GameHUD
        zone={zone} areaTheme={zone?.theme}
        onTool={handleTool} onChat={handleChat} onEndTurn={handleEndTurn}
        onAction={handleCombatAction} onSettings={() => setShowApiSettings(true)} onLeave={onLeave}
        playerPos={playerPos} tokens={tokens} cameraRef={cameraRef}
        onPortraitClick={(member) => setSheetChar(member)}
        activeMode={activeMode} onModeSelect={handleModeSelect}
      />
      {/* TestCombatButton removed — combat initiates via encounter zones */}
      <Suspense fallback={null}>
        <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      </Suspense>
      <SkillCheckPanel />
      {stealthMode?.active && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,10,0.9)', border: '1px solid #44aa66',
          borderRadius: 6, padding: '6px 18px', zIndex: 90,
          fontFamily: 'Cinzel, serif', color: '#44aa66', fontSize: 13,
          letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>👁</span>
          SNEAKING — Stealth: {stealthMode.stealthResult}
        </div>
      )}
      {sheetChar && (
        <Suspense fallback={null}>
          <CharacterSheetModal character={sheetChar} onClose={() => { setSheetChar(null); setActiveMode(null) }} />
        </Suspense>
      )}
      {activeMode === 'map' && (
        <Suspense fallback={null}>
          <WorldMap open={true} onClose={() => setActiveMode(null)} />
        </Suspense>
      )}
      {showApiSettings && <ApiKeySettings userId={user?.id} onClose={() => setShowApiSettings(false)} />}
      {showJournal && (
        <Suspense fallback={null}>
          <JournalModal onClose={() => setShowJournal(false)} />
        </Suspense>
      )}
      {restProposal && (
        <Suspense fallback={null}>
          <RestModal
            type={restProposal.type} proposedBy={restProposal.proposedBy}
            partyMembers={[{ id: user?.id, name: myCharacter?.name || 'You' }]}
            isHost={false}
            onResolve={() => { advanceGameTime(restProposal.type === 'long' ? 8 : 1); setRestProposal(null) }}
            onCancel={() => setRestProposal(null)}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        {activeNpc && !activeNpc.isCutscene && <NpcDialog npc={activeNpc} onClose={() => setActiveNpc(null)} />}
        {activeNpc && activeNpc.isCutscene && <StoryCutscene npc={activeNpc} pixiRef={pixiRef} onClose={() => setActiveNpc(null)} isWatching={false} />}
        {!activeNpc && activeCutscene && activeCutscene.initiatorId !== user?.id && (
          <StoryCutscene
            npc={{ name: activeCutscene.npcName, criticalInfo: activeCutscene.criticalInfo, role: '' }}
            pixiRef={pixiRef} onClose={() => {}} isWatching={true}
          />
        )}
      </Suspense>
      {showLevelUp && myCharacter && (
        <Suspense fallback={null}>
          <LevelUpModal
            character={myCharacter}
            onConfirm={(updates) => { applyLevelUp(updates); dismissedLevelRef.current = myCharacter.level; setShowLevelUp(false) }}
            onCancel={() => { dismissedLevelRef.current = myCharacter.level; setShowLevelUp(false) }}
          />
        </Suspense>
      )}
      {pendingLoot && (
        <Suspense fallback={null}>
          <LootScreen enemies={pendingLoot.enemies} partySize={pendingLoot.partySize} onDone={() => setPendingLoot(null)} />
        </Suspense>
      )}
      <OAConfirmModal
        pendingOA={pendingOA}
        onConfirm={() => { executeMoveWithOA(pendingOA); setPendingOA(null) }}
        onCancel={() => setPendingOA(null)}
      />
      {showWeaponPicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <WeaponPickerModal
          attacks={encounter.combatants[encounter.currentTurn].attacks || []}
          character={encounter.combatants[encounter.currentTurn]}
          onSelect={handleWeaponSelected}
          onClose={() => setShowWeaponPicker(false)}
        />
      )}
      {showSpellPicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <SpellPickerModal
          character={encounter.combatants[encounter.currentTurn]}
          spellSlots={encounter.combatants[encounter.currentTurn].spellSlots || {}}
          onSelect={handleSpellSelected}
          onClose={() => setShowSpellPicker(false)}
          cantripsOnly={!!encounter.combatants[encounter.currentTurn].leveledSpellCastThisTurn}
        />
      )}
      {activeShop && (
        <Suspense fallback={null}>
          <ShopPanel
            npc={activeShop.npc}
            shopType={activeShop.shopType}
            onClose={() => setActiveShop(null)}
          />
        </Suspense>
      )}
      {showFormation && (
        <Suspense fallback={null}>
          <FormationPanel onClose={() => setShowFormation(false)} />
        </Suspense>
      )}
      {showDebug && (
        <Suspense fallback={null}>
          <CombatDebugOverlay />
        </Suspense>
      )}
    </div>
  )
}
