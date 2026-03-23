import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import { broadcastApiKeySync, broadcastRequestApiKey, broadcastEncounterAction } from './lib/liveChannel'
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { loadDefaultApiKey } from './lib/defaultApiKey'
import { getClaudeApiKey } from './lib/claudeApi'
import { checkEncounterProximity, buildEncounterPrompt } from './lib/encounterZones'
import { handleInteract, getAvailableInteractions } from './lib/interactionController'
import { getDisposition } from './lib/factionSystem'
import { isAnimating } from './engine/TokenLayer'
import ChatBubble from './components/ChatBubble'
import ApiKeySettings from './components/ApiKeySettings'
import SkillCheckPanel from './components/SkillCheckPanel'
import HUD from './components/game/HUD'

import { useAreaCamera } from './hooks/useAreaCamera'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useFogOfWar } from './hooks/useFogOfWar'
import { useRoofManager } from './hooks/useRoofManager'
import { useCombatActions } from './hooks/useCombatActions'
import { useAreaTransition } from './hooks/useAreaTransition'
import { useWorldMovement } from './hooks/useWorldMovement'
import { useStealthMode } from './hooks/useStealthMode'
import { useRandomEncounters } from './hooks/useRandomEncounters'
import { useGameEffects } from './hooks/useGameEffects'
import './hud/hud.css'

const GameLayout          = lazy(() => import('./components/game/GameLayout'))
const NarratorBar         = lazy(() => import('./components/game/NarratorBar'))
const CombatUI            = lazy(() => import('./components/game/CombatUI'))
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

  // --- Major game effects (combat, level-up, session resume, encounters, API key loading, etc.) ---
  const {
    apiKeyLoaded: effectsApiKeyLoaded,
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

  // --- Combined tile click handler ---
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    // Combat logic gets first pass
    if (handleCombatTileClick({ x, y })) return
    // Non-combat world movement
    handleWorldTileClick({ x, y })
  }, [handleCombatTileClick, handleWorldTileClick])

  // --- Chat handler (must be declared before skill check effect that uses triggerDmFollowUp) ---
  const { handleChat, triggerDmFollowUp } = useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef })
  handleChatRef.current = handleChat


  // Activate current area whenever currentAreaId changes
  useEffect(() => {
    if (currentAreaId && areas[currentAreaId] && !areaLayers) {
      activateArea(currentAreaId)
    }
  }, [currentAreaId, areas, areaLayers])

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

  // Load API key from env var / localStorage / Supabase on mount
  useEffect(() => {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id

    // Check platform default key from Supabase (auth-gated, safe)
    if (!sessionApiKey) {
      loadDefaultApiKey().then(defaultKey => {
        if (defaultKey) {
          useStore.getState().setSessionApiKey(defaultKey)
          setApiKeyLoaded(true)
          if (isDM && campaignId) broadcastApiKeySync(defaultKey)
        }
      })
    }

    // Check localStorage (set during campaign creation or prior sessions)
    if (!sessionApiKey && user?.id) {
      const localKey = getClaudeApiKey(user.id)
      if (localKey) {
        useStore.getState().setSessionApiKey(localKey)
        setApiKeyLoaded(true)
        if (isDM && campaignId) broadcastApiKeySync(localKey)
        return
      }
    }

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
        const areaDefeated = defeatedEnemies?.[currentAreaId] || []
        // Group enemies by name and only show scaled count (match what combat will spawn)
        const partySize = Math.max(1, (partyMembers?.length || 0) + (myCharacter ? 1 : 0))
        const enemyGroups = {}
        zone.enemies.forEach(e => {
          if (!e.position) return
          if (areaDefeated.includes(e.name)) return
          if (!enemyGroups[e.name]) enemyGroups[e.name] = []
          enemyGroups[e.name].push(e)
        })
        // Scale each group to party-appropriate count
        Object.values(enemyGroups).forEach(group => {
          const maxShow = partySize <= 2 ? Math.min(group.length, partySize) : Math.min(group.length, partySize + 1)
          group.slice(0, maxShow).forEach(e => {
            t.push({
              id: e.id, name: e.name,
              x: e.position.x, y: e.position.y,
              color: 0x8b0000, borderColor: 0xff3333,
              isEnemy: true, isNpc: false,
            })
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
  }, [playerPos, zone, myCharacter, inCombat, encounter.combatants, encounter.currentTurn, defeatedEnemies, currentAreaId])

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
    else if (tool === 'faction') setShowFactions(true)
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

  // World load timeout — if zone never loads after 5s, show diagnostic error
  useEffect(() => {
    if (zone) return
    const timer = setTimeout(() => {
      if (!useStore.getState().currentAreaId) {
        const state = useStore.getState()
        const areaKeys = Object.keys(state.areas || {})
        const briefKeys = Object.keys(state.areaBriefs || {})
        const campTitle = state.campaign?.title || 'none'
        const campBriefs = Object.keys(state.campaign?.areaBriefs || {})
        setWorldLoadError(`No area loaded. Campaign: "${campTitle}". Areas in store: [${areaKeys}]. Briefs in store: [${briefKeys}]. Campaign briefs: [${campBriefs}].`)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [zone])

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
    const combatParty = freshParty.map(p => ({
      ...p,
      ...(myChar && (p.id === myChar.id || p.name === myChar.name) ? myChar : {}),
      position: myChar && (p.id === myChar.id || p.name === myChar.name) ? { ...playerPosRef.current } : null,
    }))
    if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
      combatParty.push({ ...myChar, position: { ...playerPosRef.current } })
    }
    startEncounter(combatEnemies, combatParty, true)
  }, [])

  // --- Early returns ---
  if (apiKeyLoaded && !sessionApiKey) {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    return <ApiKeyGate campaignId={campaignId} userId={user?.id} onKeyReady={() => setApiKeyLoaded(true)} />
  }

  if (!zone || !myCharacter) {
    const msg = worldLoadError ? worldLoadError
      : !zone ? (!currentAreaId ? 'Building area...' : 'Activating area...')
      : 'No character loaded'
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#08060c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: 18, gap: 16 }}>
        {worldLoadError ? 'World Load Failed' : !zone ? 'Loading world...' : 'Character Required'}
        <div style={{ fontSize: 11, color: worldLoadError ? '#cc5533' : '#665a3a', maxWidth: 400, textAlign: 'center' }}>{msg}</div>
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

  return (
    <GameLayout>
      <PixiApp ref={pixiRef} zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleAreaTransition} onNpcClick={handleNpcClick} inCombat={inCombat} camera={cameraRef.current} roofManager={roofManagerRef.current} />
      <HUD />
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
  )
}
