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

import { useAreaCamera } from './hooks/useAreaCamera'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useFogOfWar } from './hooks/useFogOfWar'
import { useRoofManager } from './hooks/useRoofManager'
import { useCombatActions } from './hooks/useCombatActions'
import { useAreaTransition } from './hooks/useAreaTransition'
import { useWorldMovement } from './hooks/useWorldMovement'
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
  const narrateCombatAction = useStore(s => s.narrateCombatAction)
  const campaign = useStore(s => s.campaign)
  const partyMembers = useStore(s => s.partyMembers)
  const activeCutscene = useStore(s => s.activeCutscene)
  const advanceGameTime = useStore(s => s.advanceGameTime)
  const gameTime = useStore(s => s.gameTime)
  const pendingLoot = useStore(s => s.pendingLoot)
  const setPendingLoot = useStore(s => s.setPendingLoot)
  const applyLevelUp = useStore(s => s.applyLevelUp)

  const pixiRef = useRef(null)
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
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
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos

  const area = areas[currentAreaId] || null
  const zone = area
  const isV2Zone = Boolean(zone?.palette)

  // --- Extracted hooks ---
  const { cameraRef } = useAreaCamera({ zone, playerPosRef })
  useAmbientAudio({ theme: zone?.theme, inCombat })

  useFogOfWar({ zone, playerPos, playerPosRef, currentAreaId, myCharacter, isDM, pixiRef, cameraRef })

  const { roofManagerRef, triggeredZonesRef } = useRoofManager({ zone, playerPos, playerPosRef, currentAreaId, isDM })

  const {
    targetingMode, pendingOA, setPendingOA,
    handleCombatTileClick, handleCombatAction, executeMoveWithOA,
  } = useCombatActions({ zone, encounter, pixiRef, cameraRef, sessionApiKey, addNarratorMessage, narrateCombatAction, inCombat })

  const { handleAreaTransition } = useAreaTransition({
    area, areas, areaBriefs, inCombat, campaign, pixiRef,
    setPlayerPos, playerPosRef, advanceGameTime, playerPos,
  })

  const { handleWorldTileClick } = useWorldMovement({
    zone, isV2Zone, playerPos, setPlayerPos, playerPosRef,
    cameraRef, dialogOpenRef, handleInteractRef, user,
  })

  // --- Combined tile click handler ---
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    // Combat logic gets first pass
    if (handleCombatTileClick({ x, y })) return
    // Non-combat world movement
    handleWorldTileClick({ x, y })
  }, [handleCombatTileClick, handleWorldTileClick])

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
  useEffect(() => {
    if (!zone?.encounterZones?.length || !playerPos || inCombat) return
    const pos = playerPosRef.current
    if (!pos) return

    const zones = zone.encounterZones.map(ez => {
      const center = ez.center || ez.position || { x: Math.floor((zone.width || 40) / 2), y: Math.floor((zone.height || 30) / 2) }
      return { ...ez, center, triggered: triggeredZonesRef.current.has(ez.id) }
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
      const timer = setTimeout(() => setApiKeyLoaded(true), 2000)
      const unsub = useStore.subscribe((state) => {
        if (state.sessionApiKey) { clearTimeout(timer); setApiKeyLoaded(true) }
      })
      return () => { clearTimeout(timer); unsub() }
    }
  }, [campaign?.id, user?.id, isDM])

  // --- Token list ---
  const tokens = useMemo(() => {
    if (!zone) return []
    const t = []
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
          showHpBar: inCombat, currentHp: e.currentHp, maxHp: e.maxHp,
        })
      })
    }
    return t
  }, [playerPos, zone, myCharacter, inCombat])

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

  const handleEndTurn = useCallback(() => {
    nextEncounterTurn()
  }, [nextEncounterTurn])

  // --- Chat handler ---
  const { handleChat } = useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef })

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
      />
      {!inCombat && <TestCombatButton myCharacter={myCharacter} addNarratorMessage={addNarratorMessage} />}
      <Suspense fallback={null}>
        <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      </Suspense>
      <SkillCheckPanel />
      {sheetChar && (
        <Suspense fallback={null}>
          <CharacterSheetModal character={sheetChar} onClose={() => setSheetChar(null)} />
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
      {activeShop && (
        <Suspense fallback={null}>
          <ShopPanel
            npc={activeShop.npc}
            shopType={activeShop.shopType}
            onClose={() => setActiveShop(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
