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
import OAConfirmModal from './components/v2/OAConfirmModal'
import TestCombatButton from './components/v2/TestCombatButton'
import WeaponPickerModal from './hud/WeaponPickerModal'
import SpellPickerModal from './hud/SpellPickerModal'
import ConsumablePickerModal from './hud/ConsumablePickerModal'
import ReadyActionModal from './hud/ReadyActionModal'
import ReadyActionPrompt from './hud/ReadyActionPrompt'
import HUD from './components/game/HUD'

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
import { useRandomEncounters } from './hooks/useRandomEncounters'
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
const VictoryScreen       = lazy(() => import('./components/game/VictoryScreen'))
const DefeatScreen        = lazy(() => import('./components/game/DefeatScreen'))
const PreCombatMenu       = lazy(() => import('./components/game/PreCombatMenu'))
const SessionResume       = lazy(() => import('./components/game/SessionResume'))
const SpellTargeting      = lazy(() => import('./components/game/SpellTargeting'))
const NarratorBar         = lazy(() => import('./components/game/NarratorBar'))
const CombatUI            = lazy(() => import('./components/game/CombatUI'))
const GameLayout          = lazy(() => import('./components/game/GameLayout'))
const NPCDialogue         = lazy(() => import('./components/game/NPCDialogue'))
const CharacterInventory_ = lazy(() => import('./components/game/CharacterInventory'))
const CombatLog_          = lazy(() => import('./components/game/CombatLog'))
const ConditionsPanel_    = lazy(() => import('./components/game/ConditionsPanel'))
const EquipmentPanel_     = lazy(() => import('./components/game/EquipmentPanel'))
const ExplorationActions_ = lazy(() => import('./components/game/ExplorationActions'))
const EnemyInfo_          = lazy(() => import('./components/game/EnemyInfo'))
const InitiativeTracker_  = lazy(() => import('./components/game/InitiativeTracker'))
const LevelUpPanel_       = lazy(() => import('./components/game/LevelUpPanel'))
const PauseMenu_          = lazy(() => import('./components/game/PauseMenu'))
const PartyStatus_        = lazy(() => import('./components/game/PartyStatus'))
const RulesReference_     = lazy(() => import('./components/game/RulesReference'))
const SkillsPanel_        = lazy(() => import('./components/game/SkillsPanel'))
const SpellsPanel_        = lazy(() => import('./components/game/SpellsPanel'))
const TurnManager_        = lazy(() => import('./components/game/TurnManager'))
const Inventory_          = lazy(() => import('./components/game/Inventory'))
const ShopPanel           = lazy(() => import('./components/ShopPanel'))
const FormationPanel      = lazy(() => import('./components/FormationPanel'))
const InteractionMenu     = lazy(() => import('./components/InteractionMenu'))
const FactionReputation   = lazy(() => import('./components/FactionReputation'))
const GameOverModal       = lazy(() => import('./components/GameOverModal'))
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
  const setEncounterLock = useStore(s => s.setEncounterLock)
  const defeatedEnemies = useStore(s => s.defeatedEnemies)
  const showDeathOptions = useStore(s => s.showDeathOptions)
  const mercyRevive = useStore(s => s.mercyRevive)

  const pixiRef = useRef(null)
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [worldLoadError, setWorldLoadError] = useState(null)
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
  const [showGameOver, setShowGameOver] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [showDefeat, setShowDefeat] = useState(false)
  const [encounterRewards, setEncounterRewards] = useState(null)
  const [showPreCombat, setShowPreCombat] = useState(false)
  const [pendingCombatEnemies, setPendingCombatEnemies] = useState(null)
  const [showSessionResume, setShowSessionResume] = useState(false)
  const [showSpellTargeting, setShowSpellTargeting] = useState(false)
  const [pendingSpell, setPendingSpell] = useState(null)
  const [showNarratorBar, setShowNarratorBar] = useState(true)
  const [showCombatUI, setShowCombatUI] = useState(false)
  const [showGameLayout, setShowGameLayout] = useState(false)
  const [showNPCDialogue, setShowNPCDialogue] = useState(false)
  const [showCharacterInventory, setShowCharacterInventory] = useState(false)
  const [showCombatLog, setShowCombatLog] = useState(false)
  const [showConditions, setShowConditions] = useState(false)
  const [showEquipment, setShowEquipment] = useState(false)
  const [showExplorationActions, setShowExplorationActions] = useState(false)
  const [showEnemyInfo, setShowEnemyInfo] = useState(false)
  const [selectedEnemy, setSelectedEnemy] = useState(null)
  const [showInitiativeTracker, setShowInitiativeTracker] = useState(false)
  const [showLevelUpPanel, setShowLevelUpPanel] = useState(false)
  const [showPauseMenu, setShowPauseMenu] = useState(false)
  const [showPartyStatus, setShowPartyStatus] = useState(false)
  const [showRulesReference, setShowRulesReference] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const [showTurnManager, setShowTurnManager] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
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

  // --- Restore player position after combat ends ---
  // useLayoutEffect ensures position updates before paint, preventing flicker to pre-combat position
  useLayoutEffect(() => {
    if (!inCombat) {
      const lastPos = useStore.getState().lastCombatPosition
      if (lastPos) {
        setPlayerPos(lastPos)
        playerPosRef.current = lastPos
        if (cameraRef.current) cameraRef.current.centerOn(lastPos.x, lastPos.y, zone?.tileSize || 200)
        useStore.setState({ lastCombatPosition: null })
      }
    }
  }, [inCombat])

  // --- Respawn position after TPK defeat ---
  const respawnPosition = useStore(s => s.respawnPosition)
  const defeatReset = useStore(s => s.defeatReset)
  useEffect(() => {
    if (respawnPosition && !inCombat) {
      setPlayerPos(respawnPosition)
      playerPosRef.current = respawnPosition
      if (cameraRef.current) cameraRef.current.centerOn(respawnPosition.x, respawnPosition.y, zone?.tileSize || 200)
      useStore.setState({ respawnPosition: null })
    }
  }, [respawnPosition, inCombat])

  // --- After TPK defeat, clear triggered zones so encounters can re-trigger ---
  useEffect(() => {
    if (defeatReset) {
      triggeredZonesRef.current = new Set()
      hasMovedRef.current = false // Prevent immediate re-trigger on spawn
      useStore.setState({ defeatReset: false })
    }
  }, [defeatReset])

  // --- Detect combat end and show victory/defeat screens ---
  const prevInCombatForEndRef = useRef(false)
  useEffect(() => {
    if (prevInCombatForEndRef.current && !inCombat) {
      // Combat just ended
      const { encounter: lastEncounter } = useStore.getState()
      const combatants = lastEncounter?.combatants || []

      // Check if it's a victory (all enemies dead) or defeat (all players dead)
      const enemies = combatants.filter(c => c.type === 'enemy')
      const players = combatants.filter(c => c.type === 'player')
      const allEnemiesDead = enemies.length > 0 && enemies.every(e => (e.currentHp ?? 0) <= 0)
      const allPlayersDead = players.length > 0 && players.every(p => (p.currentHp ?? 0) <= 0)

      if (allEnemiesDead) {
        // Victory: set up rewards data
        const rewards = lastEncounter?.rewards || { xp: 0, gold: 0 }
        setEncounterRewards(rewards)
        setShowVictory(true)
      } else if (allPlayersDead) {
        // Defeat: show defeated party members
        setShowDefeat(true)
      }
    }
    prevInCombatForEndRef.current = inCombat
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

  // --- Show session resume on first load if resuming campaign ---
  const sessionResumeShownRef = useRef(false)
  useEffect(() => {
    if (myCharacter && zone && campaign && !sessionResumeShownRef.current && !inCombat) {
      // Check if this is a resumed session (character has previous game time or experience)
      if (myCharacter.xp > 0 || (myCharacter.spellSlots && Object.keys(myCharacter.spellSlots).length > 0)) {
        setShowSessionResume(true)
        sessionResumeShownRef.current = true
      }
    }
  }, [myCharacter?.id, zone?.id, campaign?.id])

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
    if (!myCharacter) return // No character — can't enter combat
    if (!hasMovedRef.current) return // Don't trigger on spawn
    if (stealthMode?.active) return // Already sneaking — don't trigger new encounters
    const pos = playerPosRef.current
    if (!pos) return

    const areaDefeated = defeatedEnemies?.[currentAreaId] || []
    const zones = zone.encounterZones.map(ez => {
      const center = ez.center || ez.position || { x: Math.floor((zone.width || 40) / 2), y: Math.floor((zone.height || 30) / 2) }
      // Check if ALL enemies for this encounter zone are already defeated
      const ezEnemyNames = ez.enemies || []
      const allDefeated = ezEnemyNames.length > 0 && ezEnemyNames.every(name => areaDefeated.includes(name))
      // Also check zone-level enemies if this zone references them
      const zoneEnemiesDefeated = !ezEnemyNames.length && (zone.enemies || []).length > 0 &&
        (zone.enemies || []).every(e => areaDefeated.includes(e.name))
      const alreadyCleared = allDefeated || zoneEnemiesDefeated
      return { ...ez, center, triggered: triggeredZonesRef.current.has(ez.id) || alreadyCleared }
    })

    const triggered = checkEncounterProximity(pos, zones, useStore.getState().storyFlags)
    if (!triggered) return

    // Double-check: don't start combat if all relevant enemies are defeated
    const relevantEnemies = triggered.enemies?.length
      ? (zone.enemies || []).filter(e => triggered.enemies.some(name => e.name === name || e.name?.startsWith(name + ' ')))
      : (zone.enemies || [])
    const allRelevantDefeated = relevantEnemies.length > 0 && relevantEnemies.every(e => areaDefeated.includes(e.name))
    if (allRelevantDefeated) {
      triggeredZonesRef.current.add(triggered.id)
      return
    }

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
        return enemyNames.some(name => e.name === name || e.name?.startsWith(name + ' '))
      })
      // Fall back to all zone enemies if no match
      const enemies = zoneEnemies.length > 0 ? zoneEnemies : (zone.enemies || [])
      if (enemies.length > 0) {
        const combatEnemies = enemies.map(e => ({
          ...e, isEnemy: true, type: 'enemy',
          position: e.position || { x: pos.x + 2, y: pos.y },
        }))
        // Read fresh state so post-rest HP is picked up (closure partyMembers may be stale)
        const myChar = useStore.getState().myCharacter
        const freshParty = useStore.getState().partyMembers || []
        const combatParty = freshParty.map(p => {
          // For the local player, overlay ALL fresh myCharacter data (class, equippedItems, HP, etc.)
          const isLocal = myChar && (p.id === myChar.id || p.name === myChar.name)
          return {
            ...p,
            ...(isLocal ? myChar : {}),
            position: isLocal ? { ...playerPosRef.current } : null,
          }
        })
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
      setEncounterLock(true)
      setTimeout(async () => {
        const chat = handleChatRef.current
        if (chat) await chat(prompt)
        // After AI responds, check if a skill check was requested (stealth).
        // setPendingSkillCheck is called synchronously in useNarratorChat after
        // chat() resolves, so we can check immediately with a microtask delay.
        await new Promise(r => setTimeout(r, 50))
        const { pendingSkillCheck, pendingEncounterData: ped } = useStore.getState()
        if (pendingSkillCheck) return // Stealth check flow handles combat start

        // Check if AI explicitly requested combat via startCombat flag
        const lastMsg = useStore.getState().narrator?.history?.slice(-1)?.[0]
        const aiWantsCombat = lastMsg?.startCombat === true

        if (ped && aiWantsCombat) {
          // AI explicitly decided combat starts now
          clearPendingEncounterData()
          setEncounterLock(false)
          startCombatWithZoneEnemies()
        }
        // Otherwise AI offered options (stealth, roleplay, etc.) — keep
        // pendingEncounterData so combat can start later when the DM decides
        // based on the player's response via the narrator chat flow
      }, 100)
    } else {
      // No API key — just start combat directly
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: triggered.dmPrompt || 'Combat begins!' })
      startCombatWithZoneEnemies()
    }
  }, [playerPos, zone, inCombat, isDM, addNarratorMessage, sessionApiKey, partyMembers, defeatedEnemies, currentAreaId])

  // --- Chat handler (must be declared before skill check effect that uses triggerDmFollowUp) ---
  const { handleChat, triggerDmFollowUp } = useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef })
  handleChatRef.current = handleChat

  // --- Skill check follow-up: feed result back to AI DM ---
  // When a player completes a skill check (Persuasion, Intimidation, etc.),
  // automatically trigger the AI DM to narrate the outcome. The roll result
  // is already in the narrator history from SkillCheckPanel's addNarratorMessage.
  const lastSkillCheckResult = useStore(s => s.lastSkillCheckResult)
  useEffect(() => {
    if (!lastSkillCheckResult || !sessionApiKey || !isDM) return
    const { skill, pass } = lastSkillCheckResult
    // Stealth checks are handled by useStealthMode — skip them here
    if (skill === 'Stealth') return

    // Clear the result so it's not processed again
    const { clearLastSkillCheckResult } = useStore.getState()
    clearLastSkillCheckResult()

    // Small delay to ensure the skill check result message is in narrator history
    const timer = setTimeout(async () => {
      if (!triggerDmFollowUp) return
      const result = await triggerDmFollowUp()

      // If the AI responded with startCombat, the triggerDmFollowUp handler
      // already processed it. If not, and we still have pendingEncounterData
      // from an encounter zone, the AI chose to avoid combat (diplomacy worked).
      const { pendingEncounterData: ped } = useStore.getState()
      if (ped && pass) {
        // Successful non-stealth check in an encounter zone — AI let it resolve
        // peacefully. Check if the AI's latest response has startCombat.
        if (!result?.startCombat) {
          // AI didn't request combat — diplomacy/skill succeeded, clear encounter
          useStore.getState().clearPendingEncounterData()
          useStore.getState().setEncounterLock(false)
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [lastSkillCheckResult, sessionApiKey, isDM, triggerDmFollowUp])

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

  // --- Real-time game clock ticker (exploration only) ---
  // Every 30 real seconds = 5 game minutes (1 real hour ≈ 10 game hours)
  useEffect(() => {
    if (inCombat) return
    const REAL_SECONDS = 30
    const GAME_HOURS = 5 / 60 // 5 minutes in hours
    const id = setInterval(() => {
      advanceGameTime(GAME_HOURS)
    }, REAL_SECONDS * 1000)
    return () => clearInterval(id)
  }, [inCombat, advanceGameTime])

  // --- Load area world on mount ---
  useWorldLoader({ campaign, setPlayerPos })

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
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
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
      {showFactions && (
        <Suspense fallback={null}>
          <FactionReputation onClose={() => setShowFactions(false)} />
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
      {showInteractionMenu && !inCombat && (
        <Suspense fallback={null}>
          <InteractionMenu
            playerPos={playerPos}
            zone={zone}
            onTalk={openNpcInteraction}
            onExit={handleAreaTransition}
            onClose={() => setShowInteractionMenu(false)}
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
      {showConsumablePicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <ConsumablePickerModal
          character={encounter.combatants[encounter.currentTurn]}
          onSelect={handleConsumableUsed}
          onClose={() => setShowConsumablePicker(false)}
        />
      )}
      {showReadyModal && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <ReadyActionModal
          combatant={encounter.combatants[encounter.currentTurn]}
          onConfirm={(readyData) => handleCombatAction('ready-confirm', readyData)}
          onCancel={() => setShowReadyModal(false)}
        />
      )}
      {readyTriggerPrompt && (
        <ReadyActionPrompt
          readiedAction={readyTriggerPrompt.readiedAction}
          triggerDescription={readyTriggerPrompt.triggerDescription}
          onExecute={executeReadiedAction}
          onPass={passReadiedAction}
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
      {showDeathOptions && (
        <Suspense fallback={null}>
          <GameOverModal
            onRevive={mercyRevive}
            onLeave={() => { useStore.setState({ showDeathOptions: false }); onLeave() }}
          />
        </Suspense>
      )}
      {showVictory && (
        <Suspense fallback={null}>
          <VictoryScreen
            encounter={encounter}
            loot={{ items: [] }}
            rewards={encounterRewards || { xp: 0, gold: 0 }}
            onContinue={() => setShowVictory(false)}
          />
        </Suspense>
      )}
      {showDefeat && (
        <Suspense fallback={null}>
          <DefeatScreen
            encounter={encounter}
            defeats={encounter.combatants?.filter(c => c.type === 'player' && (c.currentHp ?? 0) <= 0) || []}
            onRetry={() => { setShowDefeat(false); useStore.setState({ defeatReset: true }) }}
            onContinue={() => { setShowDefeat(false); onLeave() }}
          />
        </Suspense>
      )}
      {showPreCombat && pendingCombatEnemies && (
        <Suspense fallback={null}>
          <PreCombatMenu
            enemies={pendingCombatEnemies}
            onSneak={() => { setShowPreCombat(false); setPendingCombatEnemies(null) }}
            onTalk={() => { setShowPreCombat(false); setPendingCombatEnemies(null) }}
            onPickpocket={() => { setShowPreCombat(false); setPendingCombatEnemies(null) }}
            onAmbush={() => startCombatFromMenu(pendingCombatEnemies)}
            onCharge={() => startCombatFromMenu(pendingCombatEnemies)}
            onCancel={() => { setShowPreCombat(false); setPendingCombatEnemies(null) }}
          />
        </Suspense>
      )}
      {showSessionResume && myCharacter && (
        <Suspense fallback={null}>
          <SessionResume
            sessionData={{
              campaignName: campaign?.title || 'Your Campaign',
              lastSessionDate: myCharacter.lastPlayedAt || new Date().toISOString(),
              currentLocation: zone?.title || 'Exploration'
            }}
            characters={[myCharacter]}
            recap={`Your adventure continues... Character Level: ${myCharacter.level}, HP: ${myCharacter.currentHp || myCharacter.hp}/${myCharacter.hp}`}
            onResume={() => setShowSessionResume(false)}
          />
        </Suspense>
      )}
      {showSpellTargeting && pendingSpell && inCombat && (
        <Suspense fallback={null}>
          <SpellTargeting
            spell={pendingSpell}
            onConfirm={() => { setShowSpellTargeting(false); setPendingSpell(null) }}
            onCancel={() => { setShowSpellTargeting(false); setPendingSpell(null) }}
          />
        </Suspense>
      )}
      {showNarratorBar && (
        <Suspense fallback={null}>
          <NarratorBar
            messages={useStore.getState().narrator?.history || []}
            onSendMessage={(msg) => {
              if (handleChatRef.current) {
                handleChatRef.current(msg)
              }
            }}
            isListening={false}
          />
        </Suspense>
      )}
      {showCombatUI && inCombat && (
        <Suspense fallback={null}>
          <CombatUI
            encounter={encounter}
            onClose={() => setShowCombatUI(false)}
            onAction={handleCombatAction}
          />
        </Suspense>
      )}
      {showGameLayout && (
        <Suspense fallback={null}>
          <GameLayout
            onClose={() => setShowGameLayout(false)}
          />
        </Suspense>
      )}
      {showNPCDialogue && (
        <Suspense fallback={null}>
          <NPCDialogue
            npc={{}}
            dialogue=""
            skillChecks={[]}
            choices={[]}
            onChoice={() => {}}
            onSkillCheck={() => {}}
            onClose={() => setShowNPCDialogue(false)}
          />
        </Suspense>
      )}
      {showCharacterInventory && myCharacter && (
        <Suspense fallback={null}>
          <CharacterInventory_
            character={myCharacter}
            onClose={() => setShowCharacterInventory(false)}
          />
        </Suspense>
      )}
      {showCombatLog && inCombat && (
        <Suspense fallback={null}>
          <CombatLog_
            encounter={encounter}
            onClose={() => setShowCombatLog(false)}
          />
        </Suspense>
      )}
      {showConditions && myCharacter && (
        <Suspense fallback={null}>
          <ConditionsPanel_
            activeConditions={myCharacter.conditions || []}
            onClose={() => setShowConditions(false)}
          />
        </Suspense>
      )}
      {showEquipment && myCharacter && (
        <Suspense fallback={null}>
          <EquipmentPanel_
            character={myCharacter}
            onClose={() => setShowEquipment(false)}
          />
        </Suspense>
      )}
      {showExplorationActions && !inCombat && (
        <Suspense fallback={null}>
          <ExplorationActions_
            character={myCharacter}
            roomData={{}}
            onSearch={() => ({ success: true, message: 'Search complete.' })}
            onLockpick={() => ({ success: true, message: 'Door unlocked.' })}
            onDetectTrap={() => ({ success: true, message: 'No traps detected.' })}
            onDisarmTrap={() => ({ success: true, message: 'Trap disarmed.' })}
            onClose={() => setShowExplorationActions(false)}
          />
        </Suspense>
      )}
      {showEnemyInfo && selectedEnemy && (
        <Suspense fallback={null}>
          <EnemyInfo_
            enemy={selectedEnemy}
            onClose={() => setShowEnemyInfo(false)}
          />
        </Suspense>
      )}
      {showInitiativeTracker && inCombat && (
        <Suspense fallback={null}>
          <InitiativeTracker_
            encounter={encounter}
            onClose={() => setShowInitiativeTracker(false)}
          />
        </Suspense>
      )}
      {showLevelUpPanel && myCharacter && (
        <Suspense fallback={null}>
          <LevelUpPanel_
            character={myCharacter}
            onConfirm={() => setShowLevelUpPanel(false)}
            onCancel={() => setShowLevelUpPanel(false)}
          />
        </Suspense>
      )}
      {showPauseMenu && (
        <Suspense fallback={null}>
          <PauseMenu_
            onResume={() => setShowPauseMenu(false)}
            onSettings={() => {}}
            onHelp={() => {}}
            onLeave={onLeave}
            playerCount={partyMembers?.length || 1}
          />
        </Suspense>
      )}
      {showPartyStatus && (
        <Suspense fallback={null}>
          <PartyStatus_
            partyMembers={partyMembers || []}
            myCharacter={myCharacter}
            onClose={() => setShowPartyStatus(false)}
          />
        </Suspense>
      )}
      {showRulesReference && (
        <Suspense fallback={null}>
          <RulesReference_
            onClose={() => setShowRulesReference(false)}
          />
        </Suspense>
      )}
      {showSkills && myCharacter && (
        <Suspense fallback={null}>
          <SkillsPanel_
            character={myCharacter}
            onClose={() => setShowSkills(false)}
          />
        </Suspense>
      )}
      {showSpells && myCharacter && (
        <Suspense fallback={null}>
          <SpellsPanel_
            character={myCharacter}
            onClose={() => setShowSpells(false)}
          />
        </Suspense>
      )}
      {showTurnManager && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <Suspense fallback={null}>
          <TurnManager_
            combatant={encounter.combatants[encounter.currentTurn]}
            onClose={() => setShowTurnManager(false)}
          />
        </Suspense>
      )}
      {showInventory && myCharacter && (
        <Suspense fallback={null}>
          <Inventory_
            items={myCharacter.inventory || []}
            equipment={myCharacter.equipment || {}}
            gold={myCharacter.gold || 0}
            onEquip={() => {}}
            onUse={() => {}}
            onDrop={() => {}}
            onClose={() => setShowInventory(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
