import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import { broadcastEncounterAction, broadcastTokenMove } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { getAvailableInteractions } from './lib/interactionController'
import { getDisposition } from './lib/factionSystem'
import { isAnimating } from './engine/TokenLayer'
import { cancelTargeting, isTargeting } from './engine/SpellTargetingOverlay'
import ChatBubble from './components/ChatBubble'
import SkillCheckPanel from './components/SkillCheckPanel'
import HUD from './components/game/HUD'
import DayNightOverlay from './components/game/DayNightOverlay'
import WeatherOverlay from './components/game/WeatherOverlay'
// QuestTracker is now rendered inside HUD component
import LootAnimation from './components/game/LootAnimation'
import KeyboardHelp from './components/game/KeyboardHelp'
import PartyHealthBars from './components/game/PartyHealthBars'
import EmoteSystem from './components/game/EmoteSystem'
import AutoSaveIndicator from './components/game/AutoSaveIndicator'
import PingSystem from './components/game/PingSystem'
import LoadingTips from './components/game/LoadingTips'
import CraftingPanel from './components/game/CraftingPanel'
import AreaMapOverview from './components/game/AreaMapOverview'
import Bestiary from './components/game/Bestiary'
import AreaNameAnnounce from './components/game/AreaNameAnnounce'
import XpNotification from './components/game/XpNotification'
import InteractionPrompt from './components/game/InteractionPrompt'
import LowHpOverlay from './components/game/LowHpOverlay'
import NpcDialogViewer from './components/NpcDialogViewer'

import { useAreaCamera } from './hooks/useAreaCamera'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useFogOfWar } from './hooks/useFogOfWar'
import { useRoofManager } from './hooks/useRoofManager'
import { useCombatActions } from './hooks/useCombatActions'
import { useCombatTokenAnimation } from './hooks/useCombatTokenAnimation'
import { useAreaTransition } from './hooks/useAreaTransition'
import { useWorldMovement } from './hooks/useWorldMovement'
import { useStealthMode } from './hooks/useStealthMode'
import { useRandomEncounters } from './hooks/useRandomEncounters'
import { useGameEffects } from './hooks/useGameEffects'
import { useGameTokens } from './hooks/useGameTokens'
import './hud/hud.css'

const GameLayout          = lazy(() => import('./components/game/GameLayout'))
const GameModalsRenderer  = lazy(() => import('./components/game/GameModalsRenderer'))

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
  const setEncounterLock = useStore(s => s.setEncounterLock)
  const defeatedEnemies = useStore(s => s.defeatedEnemies)
  const showDeathOptions = useStore(s => s.showDeathOptions)
  const mercyRevive = useStore(s => s.mercyRevive)
  const pendingRestProposal = useStore(s => s.pendingRestProposal)

  const pixiRef = useRef(null)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [activeMode, setActiveMode] = useState(null) // BG2-style mode screen: 'character' | 'inventory' | 'journal' | 'map' | 'settings' | null
  const [restProposal, setRestProposal] = useState(null)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [showFactions, setShowFactions] = useState(false)
  const [activeNpc, setActiveNpc] = useState(null)
  const [activeShop, setActiveShop] = useState(null)
  const [worldTransform, setWorldTransform] = useState(null)
  const [showFormation, setShowFormation] = useState(false)
  const [showCrafting, setShowCrafting] = useState(false)
  const [showAreaMap, setShowAreaMap] = useState(false)
  const [showBestiary, setShowBestiary] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showInteractionMenu, setShowInteractionMenu] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [showDefeat, setShowDefeat] = useState(false)
  const [encounterRewards, setEncounterRewards] = useState(null)
  const [showPreCombat, setShowPreCombat] = useState(false)
  const [pendingCombatEnemies, setPendingCombatEnemies] = useState(null)
  const [showSessionResume, setShowSessionResume] = useState(false)
  const [showSpellTargeting, setShowSpellTargeting] = useState(false)
  const [pendingSpell, setPendingSpell] = useState(null)
  const [selectedEnemy, setSelectedEnemy] = useState(null)
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

  // Early return if not ready (must be before any hooks that depend on zone/character)
  if (!zone || !myCharacter) {
    const msg = !zone ? (!currentAreaId ? 'Building area...' : 'Activating area...')
      : 'No character loaded'
    const worldLoadError = ''
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#08060c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: 18, gap: 16 }}>
        {worldLoadError ? 'World Load Failed' : 'Loading...'}
        <div style={{ fontSize: 11, color: '#665a3a', maxWidth: 400, textAlign: 'center' }}>{msg}</div>
        <button onClick={onLeave} style={{
          marginTop: 20, padding: '8px 24px', background: 'rgba(20,15,10,0.8)',
          border: '1px solid rgba(200,170,80,0.3)', color: '#c9a84c',
          fontFamily: "'Cinzel', serif", fontSize: 12, cursor: 'pointer',
        }}>
          ← Back to Campaigns
        </button>
      </div>
    )
  }

  // --- Pick up broadcast rest proposals from other players ---
  useEffect(() => {
    if (pendingRestProposal && !restProposal) {
      setRestProposal(pendingRestProposal)
      useStore.setState({ pendingRestProposal: null })
    }
  }, [pendingRestProposal, restProposal])

  // --- BG2-style keyboard shortcuts for mode screens ---
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger if typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch(e.key.toLowerCase()) {
        case 'c': // Character sheet
          setActiveMode(prev => prev === 'character' ? null : 'character')
          if (activeMode !== 'character') setSheetChar(myCharacter)
          else setSheetChar(null)
          break
        case 'i': // Inventory
          setActiveMode(prev => prev === 'inventory' ? null : 'inventory')
          if (activeMode !== 'inventory') setSheetChar(myCharacter)
          else setSheetChar(null)
          break
        case 'j': // Journal
          setShowJournal(prev => !prev)
          break
        case 'm': // Map
          setActiveMode(prev => prev === 'map' ? null : 'map')
          break
        case 'escape':
          setActiveMode(null)
          setSheetChar(null)
          setShowJournal(false)
          setShowApiSettings(false)
          setShowFormation(false)
          setToolPanel(null)
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeMode, myCharacter])

  // --- Extracted hooks ---
  const { cameraRef } = useAreaCamera({ zone, playerPosRef })
  useAmbientAudio({ theme: zone?.theme, inCombat })

  useFogOfWar({ zone, playerPos, playerPosRef, currentAreaId, myCharacter, isDM, pixiRef, cameraRef })

  const { roofManagerRef, triggeredZonesRef } = useRoofManager({ zone, playerPos, playerPosRef, currentAreaId, isDM })

  useRandomEncounters({ playerPos, inCombat, isDM, zone })

  // Broadcast initial position so other players can see our token on spawn
  const initialPosBroadcastRef = useRef(false)
  useEffect(() => {
    if (!initialPosBroadcastRef.current && user?.id && playerPos && zone) {
      initialPosBroadcastRef.current = true
      broadcastTokenMove(user.id, playerPos)
      // Also store locally so our token shows for self-lookups
      useStore.getState().setAreaTokenPosition(currentAreaId, user.id, playerPos)
    }
  }, [user?.id, playerPos, zone, currentAreaId])

  // Broadcast position whenever it changes (for other players to see our token move)
  useEffect(() => {
    if (user?.id && playerPos && currentAreaId) {
      useStore.getState().setAreaTokenPosition(currentAreaId, user.id, playerPos)
    }
  }, [playerPos, user?.id, currentAreaId])

  // Screen shake on combat damage — watch damage events, trigger camera shake
  const damageEventsLen = useStore(s => s.damageEvents?.length || 0)
  const shakeCountRef = useRef(0)
  useEffect(() => {
    if (damageEventsLen <= shakeCountRef.current) return
    const events = useStore.getState().damageEvents || []
    const newEvents = events.slice(shakeCountRef.current)
    shakeCountRef.current = damageEventsLen
    const cam = pixiRef.current?.getCamera?.()
    if (!cam?.shake) return
    for (const evt of newEvents) {
      if (evt.type === 'damage' && evt.amount >= 10) cam.shake(8, 350) // heavy hit
      else if (evt.type === 'damage' && evt.amount > 0) cam.shake(4, 200) // light hit
    }
  }, [damageEventsLen])

  const {
    targetingMode, pendingOA, setPendingOA,
    handleCombatTileClick, handleCombatAction, executeMoveWithOA,
    showWeaponPicker, setShowWeaponPicker,
    showSpellPicker, setShowSpellPicker,
    showConsumablePicker, setShowConsumablePicker,
    showReadyModal, setShowReadyModal,
    readyTriggerPrompt, checkReadiedTriggers,
    executeReadiedAction, passReadiedAction,
    handleSpellSelected, handleWeaponSelected, handleConsumableUsed, selectedWeapon,
  } = useCombatActions({ zone, encounter, pixiRef, cameraRef, sessionApiKey, addNarratorMessage, narrateCombatAction, inCombat, isDM, setShowSpellTargeting, setPendingSpell })

  // Animate combat token movements
  useCombatTokenAnimation(pixiRef)

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

  // --- Major game effects (combat, level-up, session resume, encounters, API key loading, etc.) ---
  const {
    apiKeyLoaded: effectsApiKeyLoaded,
    setApiKeyLoaded,
    worldLoadError: effectsWorldLoadError,
    handleChatRef: effectsHandleChatRef,
    handleInteractRef: effectsHandleInteractRef,
  } = useGameEffects({
    inCombat, encounter, playerPos, playerPosRef, cameraRef, setPlayerPos, zone, myCharacter, isDM, activeCampaign,
    addNarratorMessage, sessionApiKey, partyMembers, currentAreaId, stealthMode, campaign, user, gameTime, advanceGameTime,
    setShowVictory, setShowDefeat, setEncounterRewards, setShowLevelUp, setShowSessionResume, dismissedLevelRef,
    clearPendingEncounterData, setPendingEncounterData, setEncounterLock, areas, areaBriefs, activateArea: activateArea, areaLayers,
  })

  // Use the values from useGameEffects
  const apiKeyLoaded = effectsApiKeyLoaded
  const worldLoadError = effectsWorldLoadError
  if (effectsHandleChatRef) handleChatRef.current = effectsHandleChatRef.current
  if (effectsHandleInteractRef) handleInteractRef.current = effectsHandleInteractRef.current

  // Create stable handler from useGameEffects chat ref
  const handleChat = useCallback((text) => {
    if (handleChatRef.current) return handleChatRef.current(text)
  }, [])

  // --- Game tokens and nearby NPCs ---
  const { tokens, nearbyNpcs } = useGameTokens({
    zone, playerPos, myCharacter, inCombat, encounter, activeNpc,
    partyMembers, defeatedEnemies, currentAreaId,
  })

  // Cancel lingering spell targeting when combat ends
  useEffect(() => {
    if (!inCombat && isTargeting()) {
      cancelTargeting()
    }
  }, [inCombat])

  // --- Combined tile click handler ---
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    // Cancel stale targeting if we're not in combat
    if (!inCombat && isTargeting()) { cancelTargeting(); return }
    // Combat logic gets first pass
    if (handleCombatTileClick({ x, y })) return
    // Non-combat world movement
    handleWorldTileClick({ x, y })
  }, [handleCombatTileClick, handleWorldTileClick, inCombat])

  useEffect(() => {
    dialogOpenRef.current = !!activeNpc || showInteractionMenu
  }, [activeNpc, showInteractionMenu])

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


  // --- Interaction handlers ---
  const openNpcInteraction = useCallback((npc) => {
    const state = useStore.getState()
    const busy = state.npcBusy
    if (busy && busy.npcName === npc.name) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `${npc.name} is speaking with ${busy.playerName}.` })
      return
    }

    // Check if NPC is from a faction the player is hostile with
    if (npc.faction) {
      const rep = state.factionReputation?.[npc.faction] ?? 0
      const disposition = getDisposition(rep)
      if (disposition === 'Hostile') {
        // Trigger combat with this NPC as an enemy
        const enemyDef = {
          name: npc.name,
          hp: 15 + Math.floor(Math.random() * 10), // Basic enemy stats
          ac: 12,
          speed: 30,
          stats: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
          attacks: [{ name: 'Sword', bonus: '+3', damage: '1d8+1' }],
          startPosition: npc.position,
        }
        state.startEncounter([enemyDef], `${npc.name} recognizes you as an enemy of the ${npc.faction}! Combat initiated!`)
        state.setEncounterActive(true)
        broadcastEncounterAction({ type: 'start-encounter', enemies: [enemyDef] })
        addNarratorMessage({ role: 'dm', speaker: 'System', text: `${npc.name} recognizes your hostility toward the ${npc.faction} and attacks!` })
        return
      }
    }

    if (npc.shopType) {
      setActiveShop({ npc, shopType: npc.shopType })
    } else if (npc.critical && !state.hasStoryFlag(npc.criticalFlag)) {
      setActiveNpc({ ...npc, isCutscene: true })
    } else {
      setActiveNpc({ ...npc, isCutscene: false })
    }
  }, [addNarratorMessage])

  const handleInteractFn = useCallback(() => {
    if (isAnimating()) return
    if (inCombat) return
    const pos = playerPosRef.current
    const interactions = getAvailableInteractions(pos, zone)

    // If the only interaction is exit or single talk, execute immediately
    if (interactions.length === 0) return
    if (interactions.length === 1) {
      const { type, target } = interactions[0]
      if (type === 'exit') { handleAreaTransition(target); return }
      if (type === 'talk') { openNpcInteraction(target); return }
      if (type === 'search_area') { setShowInteractionMenu(true); return }
    }

    // Multiple options — show context menu
    setShowInteractionMenu(true)
  }, [zone, inCombat, handleAreaTransition, openNpcInteraction])

  handleInteractRef.current = handleInteractFn

  const handleNpcClick = useCallback((clickedToken) => {
    if (inCombat || isAnimating()) return
    const pos = playerPosRef.current
    const dx = Math.abs(pos.x - (clickedToken.position?.x ?? clickedToken.x ?? 0))
    const dy = Math.abs(pos.y - (clickedToken.position?.y ?? clickedToken.y ?? 0))
    if (dx > 1 || dy > 1) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `You need to move closer to ${clickedToken.name}.` })
      return
    }
    // Check if this is an enemy token
    if (clickedToken.isEnemy || clickedToken.type === 'enemy') {
      setPendingCombatEnemies([clickedToken])
      setShowPreCombat(true)
      return
    }
    // Otherwise treat as NPC
    const npc = zone?.npcs?.find(n => n.name === clickedToken.name || n.name === clickedToken.id)
    if (!npc) return
    handleInteractRef.current?.()
  }, [zone, inCombat, addNarratorMessage])

  const handleTool = useCallback((tool) => {
    if (tool === 'dice') setToolPanel('dice')
    else if (tool === 'character') setSheetChar(myCharacter)
    else if (tool === 'inventory') setActiveMode(prev => prev === 'inventory' ? null : 'inventory')
    else if (tool === 'journal') setShowJournal(true)
    else if (tool === 'faction') setShowFactions(true)
    else if (tool === 'short-rest') {
      const proposal = { type: 'short', proposedBy: myCharacter?.name || 'Someone' }
      setRestProposal(proposal)
      broadcastEncounterAction({ type: 'rest-proposal', ...proposal })
    }
    else if (tool === 'long-rest') {
      const proposal = { type: 'long', proposedBy: myCharacter?.name || 'Someone' }
      setRestProposal(proposal)
      broadcastEncounterAction({ type: 'rest-proposal', ...proposal })
    }
    else if (tool === 'formation') setShowFormation(true)
    else if (tool === 'craft') setShowCrafting(true)
    else if (tool === 'worldmap') setShowAreaMap(true)
    else if (tool === 'bestiary') setShowBestiary(true)
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

  // --- Helper to start combat from PreCombatMenu ---
  const startCombatFromMenu = useCallback((enemies) => {
    setShowPreCombat(false)
    setPendingCombatEnemies(null)
    const { startEncounter } = useStore.getState()
    const myChar = useStore.getState().myCharacter
    const freshParty = useStore.getState().partyMembers || []
    const combatEnemies = enemies.map(e => ({
      ...e, isEnemy: true, type: 'enemy',
      position: e.position || { x: playerPosRef.current.x + 2, y: playerPosRef.current.y },
    }))
    // Use live positions from areaTokenPositions so all players have correct combat positions
    const areaPositions = useStore.getState().areaTokenPositions?.[currentAreaId] || {}
    const combatParty = freshParty.map(p => {
      const isLocal = myChar && (p.id === myChar.id || p.name === myChar.name)
      const livePos = isLocal
        ? { ...playerPosRef.current }
        : (areaPositions[p.userId] || areaPositions[p.id] || null)
      return {
        ...p,
        ...(isLocal ? myChar : {}),
        position: livePos,
      }
    })
    if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
      combatParty.push({ ...myChar, position: { ...playerPosRef.current } })
    }
    startEncounter(combatEnemies, combatParty, true)
  }, [currentAreaId])

  // --- Early returns ---
  if (apiKeyLoaded && !sessionApiKey) {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    return <ApiKeyGate campaignId={campaignId} userId={user?.id} onKeyReady={() => setApiKeyLoaded(true)} />
  }

  // Early return for zone/character already handled above — proceed with game render
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#08060c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>Loading...</div>}>
      <GameLayout targeting={!!targetingMode}>
        <PixiApp ref={pixiRef} zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleAreaTransition} onNpcClick={handleNpcClick} inCombat={inCombat} camera={cameraRef.current} roofManager={roofManagerRef.current} />
        <WeatherOverlay />
        <DayNightOverlay />
        <HUD />
        {/* QuestTracker is inside HUD component now */}
        <LootAnimation />
        <KeyboardHelp />
        <PartyHealthBars />
        <EmoteSystem />
        <AutoSaveIndicator />
        <PingSystem worldTransform={worldTransform} />
        <LoadingTips />
        <AreaNameAnnounce />
        <XpNotification />
        <InteractionPrompt playerPos={playerPos} zone={zone} />
        <LowHpOverlay />
        {!activeNpc && <NpcDialogViewer />}
        {showCrafting && <CraftingPanel onClose={() => setShowCrafting(false)} />}
        {showAreaMap && <AreaMapOverview onClose={() => setShowAreaMap(false)} />}
        {showBestiary && <Bestiary onClose={() => setShowBestiary(false)} />}
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
        <SkillCheckPanel />
        <Suspense fallback={null}>
        <GameModalsRenderer
          toolPanel={toolPanel} setToolPanel={setToolPanel}
          sheetChar={sheetChar} setSheetChar={setSheetChar}
          activeMode={activeMode} setActiveMode={setActiveMode}
          showApiSettings={showApiSettings} setShowApiSettings={setShowApiSettings}
          showJournal={showJournal} setShowJournal={setShowJournal}
          showFactions={showFactions} setShowFactions={setShowFactions}
          activeNpc={activeNpc} setActiveNpc={setActiveNpc}
          activeShop={activeShop} setActiveShop={setActiveShop}
          showFormation={showFormation} setShowFormation={setShowFormation}
          showLevelUp={showLevelUp} setShowLevelUp={setShowLevelUp}
          showInteractionMenu={showInteractionMenu} setShowInteractionMenu={setShowInteractionMenu}
          showVictory={showVictory} setShowVictory={setShowVictory}
          showDefeat={showDefeat} setShowDefeat={setShowDefeat}
          showDeathOptions={showDeathOptions}
          showPreCombat={showPreCombat} setShowPreCombat={setShowPreCombat}
          pendingCombatEnemies={pendingCombatEnemies}
          showSessionResume={showSessionResume} setShowSessionResume={setShowSessionResume}
          showSpellTargeting={showSpellTargeting} setShowSpellTargeting={setShowSpellTargeting}
          pendingSpell={pendingSpell}
          dismissedLevelRef={dismissedLevelRef}
          stealthMode={stealthMode}
          myCharacter={myCharacter}
          activeMode_={activeMode}
          restProposal={restProposal} setRestProposal={setRestProposal}
          user={user}
          activeCutscene={activeCutscene}
          showWeaponPicker={showWeaponPicker} setShowWeaponPicker={setShowWeaponPicker}
          showSpellPicker={showSpellPicker} setShowSpellPicker={setShowSpellPicker}
          showConsumablePicker={showConsumablePicker} setShowConsumablePicker={setShowConsumablePicker}
          showReadyModal={showReadyModal} setShowReadyModal={setShowReadyModal}
          readyTriggerPrompt={readyTriggerPrompt}
          encounter={encounter}
          inCombat={inCombat}
          campaign={campaign}
          pendingLoot={pendingLoot} setPendingLoot={setPendingLoot}
          applyLevelUp={applyLevelUp}
          advanceGameTime={advanceGameTime}
          openNpcInteraction={openNpcInteraction}
          handleAreaTransition={handleAreaTransition}
          handleCombatAction={handleCombatAction}
          handleWeaponSelected={handleWeaponSelected}
          handleSpellSelected={handleSpellSelected}
          handleConsumableUsed={handleConsumableUsed}
          executeReadiedAction={executeReadiedAction}
          passReadiedAction={passReadiedAction}
          executeMoveWithOA={executeMoveWithOA}
          pendingOA={pendingOA} setPendingOA={setPendingOA}
          startCombatFromMenu={startCombatFromMenu}
          handleEndTurn={handleEndTurn}
          playerPos={playerPos}
          zone={zone}
          pixiRef={pixiRef}
          encounterRewards={encounterRewards}
          showDebug={showDebug}
          playerPosRef={playerPosRef}
          onLeave={onLeave}
        />
      </Suspense>
      </GameLayout>
    </Suspense>
  )
}
