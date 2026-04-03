import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'
import { getTimeOfDay } from '../lib/gameTime'
import { getNpcMovements } from '../lib/npcScheduler'
import { findPathEdge } from '../lib/pathfinding'
import { animateTokenAlongPath } from '../engine/TokenLayer'
import { checkEncounterProximity, buildEncounterPrompt } from '../lib/encounterZones'
import { resolveEncounterTemplates, isTemplateFormat } from '../lib/encounterTemplateResolver'
import { broadcastEncounterAction, broadcastStartCombat } from '../lib/liveChannel'
import { loadApiKeyFromSupabase } from '../lib/apiKeyVault'
import { loadDefaultApiKey } from '../lib/defaultApiKey'
import { getClaudeApiKey } from '../lib/claudeApi'
import { useWorldLoader } from './useWorldLoader'
import { useNarratorChat } from './useNarratorChat'
import { setMood, stopMusic, setMusicVolume } from '../lib/ambientMusic'

export function useGameEffects({
  inCombat, encounter, playerPos, playerPosRef, cameraRef, setPlayerPos, zone, myCharacter, isDM, activeCampaign,
  addNarratorMessage, sessionApiKey, partyMembers, currentAreaId, stealthMode, campaign, user, gameTime, advanceGameTime,
  setShowVictory, setShowDefeat, setEncounterRewards, setShowLevelUp, setShowSessionResume, dismissedLevelRef,
  clearPendingEncounterData, setPendingEncounterData, setEncounterLock, areas, areaBriefs, activateArea, areaLayers,
}) {
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [worldLoadError, setWorldLoadError] = useState(null)
  const [encounterRewards, setEncounterRewards_] = useState(null)

  const handleChatRef = useRef(null)
  const handleInteractRef = useRef(null)
  const triggeredZonesRef = useRef(new Set())
  const sessionResumeShownRef = useRef(false)
  const prevInCombatRef = useRef(false)
  const prevInCombatForEndRef = useRef(false)
  const prevPlayerPosRef = useRef(null)
  const hasMovedRef = useRef(false)
  const roofManagerRef = useRef(null)

  const defeatedEnemies = useStore(s => s.defeatedEnemies)
  const respawnPosition = useStore(s => s.respawnPosition)
  const defeatReset = useStore(s => s.defeatReset)
  const lastSkillCheckResult = useStore(s => s.lastSkillCheckResult)

  // On combat start: just center camera on the action, never move the player
  useEffect(() => {
    if (inCombat && !prevInCombatRef.current && encounter.combatants?.length) {
      // Center camera on combat center so the player can see the fight
      let cx = 0, cy = 0, count = 0
      for (const c of encounter.combatants) {
        if (c.position) { cx += c.position.x; cy += c.position.y; count++ }
      }
      if (count > 0 && cameraRef.current) {
        cx = Math.round(cx / count); cy = Math.round(cy / count)
        cameraRef.current.centerOn(cx, cy, zone?.tileSize || 200)
      }
    }
    prevInCombatRef.current = inCombat
  }, [inCombat, encounter.combatants, zone?.tileSize])

  // Respawn position after TPK defeat — add cooldown to prevent immediate encounter zone re-trigger
  const respawnCooldownRef = useRef(false)
  useEffect(() => {
    if (respawnPosition && !inCombat) {
      setPlayerPos(respawnPosition)
      playerPosRef.current = respawnPosition
      if (cameraRef.current) cameraRef.current.centerOn(respawnPosition.x, respawnPosition.y, zone?.tileSize || 200)
      useStore.setState({ respawnPosition: null })
      // Prevent encounter zones from triggering for 3 seconds after respawn
      respawnCooldownRef.current = true
      setTimeout(() => { respawnCooldownRef.current = false }, 3000)
    }
  }, [respawnPosition, inCombat, zone?.tileSize])

  // Real-time game clock — advances ~1 game-minute per 5 real seconds
  // Full day cycle = ~2 hours of real play time. Only host ticks to avoid duplicate broadcasts.
  useEffect(() => {
    const isHost = useStore.getState().isDM || !useStore.getState().activeCampaign
    if (!isHost) return
    const interval = setInterval(() => {
      useStore.getState().advanceGameTime(1 / 60) // 1 minute in game-hours
    }, 5000) // every 5 real seconds
    return () => clearInterval(interval)
  }, [])

  // Ambient music — switch mood on combat state changes
  useEffect(() => {
    const musicOff = typeof localStorage !== 'undefined' && localStorage.getItem('dm-music') === 'off'
    if (musicOff) return
    // Restore saved volume
    const savedVol = typeof localStorage !== 'undefined' && localStorage.getItem('dm-music-vol')
    if (savedVol) setMusicVolume(parseFloat(savedVol))
    if (inCombat) {
      setMood('combat')
    } else if (zone) {
      setMood('exploration')
    }
  }, [inCombat, zone?.id])

  // Stop music on unmount
  useEffect(() => {
    return () => stopMusic(1)
  }, [])

  // After TPK defeat, clear triggered zones
  useEffect(() => {
    if (defeatReset) {
      triggeredZonesRef.current = new Set()
      hasMovedRef.current = false
      useStore.setState({ defeatReset: false })
    }
  }, [defeatReset])

  // Detect combat end and show victory/defeat screens
  useEffect(() => {
    if (prevInCombatForEndRef.current && !inCombat) {
      const { encounter: lastEncounter } = useStore.getState()
      const combatants = lastEncounter?.combatants || []
      const enemies = combatants.filter(c => c.type === 'enemy')
      const players = combatants.filter(c => c.type === 'player')
      const allEnemiesDead = enemies.length > 0 && enemies.every(e => (e.currentHp ?? 0) <= 0)
      const allPlayersDead = players.length > 0 && players.every(p => (p.currentHp ?? 0) <= 0)

      if (allEnemiesDead) {
        const rewards = lastEncounter?.rewards || { xp: 0, gold: 0 }
        setEncounterRewards(rewards)
        setShowVictory(true)
      } else if (allPlayersDead) {
        setShowDefeat(true)
      }
    }
    prevInCombatForEndRef.current = inCombat
  }, [inCombat, setShowVictory, setShowDefeat, setEncounterRewards])

  // Watch for XP crossing a level threshold
  useEffect(() => {
    if (!myCharacter) return
    const xp = myCharacter.xp || 0
    const currentLevel = myCharacter.level || 1
    const earnedLevel = Math.min(20, Object.values([0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]).findIndex(t => xp < t)) || 1
    if (earnedLevel > currentLevel && currentLevel < 20 && dismissedLevelRef.current !== currentLevel) {
      setShowLevelUp(true)
    }
  }, [myCharacter?.xp, myCharacter?.level, setShowLevelUp])

  // Watch for story milestones being achieved — trigger cinematic when a storyFlag matches a milestone
  const storyFlags = useStore(s => s.storyFlags)
  const setActiveCutscene = useStore(s => s.setActiveCutscene)
  const triggeredMilestonesRef = useRef(new Set())
  useEffect(() => {
    if (!campaign?.storyMilestones?.length || !storyFlags?.size) return
    for (const milestone of campaign.storyMilestones) {
      const flagName = typeof milestone === 'string' ? milestone : milestone?.name
      if (!flagName || triggeredMilestonesRef.current.has(flagName)) continue
      if (storyFlags.has(flagName)) {
        triggeredMilestonesRef.current.add(flagName)
        // Trigger cinematic for this milestone
        setActiveCutscene({
          title: flagName,
          text: typeof milestone === 'object' ? milestone.description : `The party has reached a milestone: ${flagName}`,
          type: 'milestone',
        })
        addNarratorMessage({ role: 'dm', speaker: 'The Narrator', text: `Story milestone achieved: ${flagName}` })
        break // one milestone per render cycle
      }
    }
  }, [storyFlags, campaign?.storyMilestones])

  // Session resume disabled — was blocking game rendering with fullscreen overlay
  // TODO: Re-enable once the overlay properly auto-dismisses
  useEffect(() => {
    sessionResumeShownRef.current = true // prevent it from ever showing
  }, [])

  // Welcome message for new players on first load
  const welcomeShownRef = useRef(false)
  useEffect(() => {
    if (welcomeShownRef.current || !myCharacter?.name || !zone?.name || inCombat) return
    if (myCharacter.xp > 0) return // returning player, skip welcome
    welcomeShownRef.current = true
    const charClass = myCharacter.class || 'adventurer'
    const msg = {
      role: 'dm', speaker: 'The Narrator',
      text: `Welcome, ${myCharacter.name} the ${charClass}. You find yourself in ${zone.name}. Use WASD or click to move, E to interact with NPCs, and press ? for all keyboard shortcuts. Your adventure begins now.`,
      id: crypto.randomUUID?.() || Date.now().toString(),
      timestamp: Date.now(),
    }
    addNarratorMessage(msg)
  }, [myCharacter?.name, zone?.name, inCombat])

  // Track player movement
  useEffect(() => {
    if (prevPlayerPosRef.current && (prevPlayerPosRef.current.x !== playerPos.x || prevPlayerPosRef.current.y !== playerPos.y)) {
      hasMovedRef.current = true
    }
    prevPlayerPosRef.current = playerPos
  }, [playerPos])

  // Encounter zone proximity detection
  useEffect(() => {
    if (!zone?.encounterZones?.length || !playerPos || inCombat || !myCharacter || !hasMovedRef.current || stealthMode?.active || respawnCooldownRef.current) return
    const pos = playerPosRef.current
    if (!pos) return

    const areaDefeated = defeatedEnemies?.[currentAreaId] || []
    const zones = zone.encounterZones.map(ez => {
      const center = ez.center || ez.position || { x: Math.floor((zone.width || 40) / 2), y: Math.floor((zone.height || 30) / 2) }
      const ezEnemyNames = ez.enemies || []
      const allDefeated = ezEnemyNames.length > 0 && ezEnemyNames.every(name => areaDefeated.includes(name))
      const zoneEnemiesDefeated = !ezEnemyNames.length && (zone.enemies || []).length > 0 && (zone.enemies || []).every(e => areaDefeated.includes(e.name))
      const alreadyCleared = allDefeated || zoneEnemiesDefeated
      return { ...ez, center, triggered: triggeredZonesRef.current.has(ez.id) || alreadyCleared }
    })

    const triggered = checkEncounterProximity(pos, zones, useStore.getState().storyFlags)
    if (!triggered) return

    let relevantEnemies
    if (isTemplateFormat(triggered)) {
      // New chapter format: resolve templates based on current party
      const pCount = Math.max(1, (partyMembers || []).length + 1) // +1 for self
      const avgLevel = Math.max(1, Math.round(
        [...(partyMembers || []), myCharacter].filter(Boolean).reduce((s, m) => s + (m.level || 1), 0) /
        Math.max(1, (partyMembers || []).length + 1)
      ))
      relevantEnemies = resolveEncounterTemplates(triggered, pCount, avgLevel)
    } else {
      // Legacy format: existing code stays as-is
      relevantEnemies = triggered.enemies?.length
        ? (zone.enemies || []).filter(e => triggered.enemies.some(name => e.name === name || e.name?.startsWith(name + ' ')))
        : (zone.enemies || [])
    }
    const allRelevantDefeated = relevantEnemies.length > 0 && relevantEnemies.every(e => areaDefeated.includes(e.name))
    if (allRelevantDefeated) {
      triggeredZonesRef.current.add(triggered.id)
      return
    }

    triggeredZonesRef.current.add(triggered.id)
    // Any player who reaches this zone first starts the encounter and broadcasts it.
    // Other clients receive 'combat-start' and skip if they're already in combat.
    broadcastEncounterAction({ type: 'encounter-zone-triggered', zoneId: triggered.id })

    const prompt = buildEncounterPrompt(
      { ...triggered, dmPrompt: triggered.narratorPrompt || triggered.dmPrompt },
      ''
    )
    // Capture resolved enemies for the combat start closure
    const resolvedEnemies = relevantEnemies
    const startCombatWithZoneEnemies = () => {
      const { startEncounter } = useStore.getState()
      // Use resolved enemies from templates (V2) or fall back to zone.enemies (legacy)
      const enemies = resolvedEnemies?.length > 0
        ? resolvedEnemies
        : (zone.enemies || [])
      if (enemies.length > 0) {
        const combatEnemies = enemies.map((e, i) => ({
          ...e, isEnemy: true, type: 'enemy',
          position: e.position || { x: pos.x + 3 + (i % 3), y: pos.y - 1 + Math.floor(i / 3) },
        }))
        const myChar = useStore.getState().myCharacter
        const freshParty = useStore.getState().partyMembers || []
        const currentArea = useStore.getState().currentAreaId
        const areaPositions = useStore.getState().areaTokenPositions?.[currentArea] || {}
        const myPos = playerPosRef.current || { x: 5, y: 5 }
        const combatCenter = combatEnemies[0]?.position || myPos
        const areaData = useStore.getState().areas?.[currentArea]
        const fallbackPos = areaData?.playerStart || myPos

        // Build party with live positions — count how many are near combat for scaling
        const combatParty = freshParty.map(p => {
          const isLocal = myChar && (p.id === myChar.id || p.name === myChar.name)
          const livePos = isLocal
            ? { ...myPos }
            : (areaPositions[p.userId] || areaPositions[p.id] || { x: fallbackPos.x + 1, y: fallbackPos.y })
          return { ...p, ...(isLocal ? myChar : {}), position: livePos }
        })
        if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
          combatParty.push({ ...myChar, position: { ...myPos } })
        }

        // Scale enemies to nearby players only (not full partyMembers count)
        const nearbyCount = combatParty.filter(p => {
          const dx = (p.position?.x ?? 0) - combatCenter.x
          const dy = (p.position?.y ?? 0) - combatCenter.y
          return Math.sqrt(dx * dx + dy * dy) <= 10
        }).length || 1

        startEncounter(combatEnemies, combatParty, true, { nearbyPlayerCount: nearbyCount })
        broadcastStartCombat({ enemies: combatEnemies, party: combatParty, autoRoll: true })
      }
    }

    if (sessionApiKey) {
      // Send narrator prompt for flavor text, then auto-start combat
      const encounterPayload = { startCombatWithZoneEnemies, triggered, enemyPositions: (zone.enemies || []).filter(e => e.position).map(e => ({ ...e.position, name: e.name, wis: e.stats?.wis ?? 10 })) }
      setPendingEncounterData(encounterPayload)
      setTimeout(async () => {
        const chat = handleChatRef.current
        if (chat) {
          try { await chat(prompt) } catch { /* narrator failed, still start combat */ }
        }
        // Always start combat after narrator describes the scene (don't wait for AI startCombat flag)
        const { pendingEncounterData: ped, pendingSkillCheck } = useStore.getState()
        if (pendingSkillCheck) return // stealth check in progress — let that flow handle it
        if (ped?.startCombatWithZoneEnemies) {
          clearPendingEncounterData()
          ped.startCombatWithZoneEnemies()
        }
      }, 100)
    } else {
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: triggered.dmPrompt || 'Combat begins!' })
      startCombatWithZoneEnemies()
    }
  }, [playerPos, zone, inCombat, isDM, addNarratorMessage, sessionApiKey, partyMembers, defeatedEnemies, currentAreaId, stealthMode?.active, myCharacter, activeCampaign])

  // Mid-combat join — if combat is active but we're not in it, check if we walked into the radius
  useEffect(() => {
    if (!inCombat || !myCharacter || !playerPos) return
    const { encounter, joinEncounterMidCombat } = useStore.getState()
    // Already in combat
    if (encounter.combatants.some(c => c.id === myCharacter.id || c.name === myCharacter.name)) return
    // Check distance to combat center
    const center = encounter.combatCenter
    const radius = encounter.combatRadius || 10
    if (!center) return
    const pos = playerPosRef.current
    if (!pos) return
    const dx = pos.x - center.x
    const dy = pos.y - center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > radius) return

    // Player entered combat radius — check stealth
    if (stealthMode?.active) {
      // Enemies get a perception check against player's stealth
      const enemies = encounter.combatants.filter(c => c.type === 'enemy' && c.currentHp > 0)
      const stealthDC = stealthMode.stealthRoll || 15
      let detected = false
      for (const enemy of enemies) {
        const wisMod = Math.floor(((enemy.stats?.wis || 10) - 10) / 2)
        const perceptionRoll = Math.floor(Math.random() * 20) + 1 + wisMod
        if (perceptionRoll >= stealthDC) {
          detected = true
          addNarratorMessage({
            role: 'dm', speaker: 'Combat',
            text: `${enemy.name} spots ${myCharacter.name} sneaking nearby! (Perception ${perceptionRoll} vs Stealth ${stealthDC})`,
          })
          break
        }
      }
      if (!detected) {
        // Stealth holds — don't join combat yet
        return
      }
      // Stealth broken — clear it and fall through to join
      useStore.setState({ stealthMode: null })
    }

    // Join combat
    joinEncounterMidCombat({ ...myCharacter, position: { ...pos } })
  }, [playerPos, inCombat, myCharacter, stealthMode?.active])

  // NPC schedule movement on time-of-day changes
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
      const path = findPathEdge({ wallEdges, cellBlocked: cellBlocked || new Uint8Array(w * h) }, w, h, npc.position, targetPosition)
      if (!path || path.length < 2) continue
      const npcId = npc.name
      animateTokenAlongPath(npcId, path, null, () => { npc.position = { ...targetPosition } }, zone.tileSize || 200)
    }
  }, [gameTime?.hour, zone?.npcs, zone?.poiPositions, zone?.wallEdges, zone?.cellBlocked, zone?.width, zone?.height, zone?.tileSize])

  // Real-time game clock ticker (exploration only)
  useEffect(() => {
    if (inCombat) return
    const REAL_SECONDS = 30
    const GAME_HOURS = 5 / 60
    const id = setInterval(() => { advanceGameTime(GAME_HOURS) }, REAL_SECONDS * 1000)
    return () => clearInterval(id)
  }, [inCombat, advanceGameTime])

  // Load area world on mount
  useWorldLoader({ campaign, setPlayerPos })

  // Activate current area whenever currentAreaId changes
  useEffect(() => {
    if (currentAreaId && areas[currentAreaId] && !areaLayers) {
      activateArea(currentAreaId)
    }
  }, [currentAreaId, areas, areaLayers, activateArea])

  // Load API key from env var / localStorage / Supabase on mount
  useEffect(() => {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id

    // If we already have a key, mark loaded and bail
    if (sessionApiKey) { setApiKeyLoaded(true); return }

    // Try local key first (synchronous)
    if (user?.id) {
      const localKey = getClaudeApiKey(user.id)
      if (localKey) {
        useStore.getState().setSessionApiKey(localKey)
        setApiKeyLoaded(true)
        if (isDM && campaignId) broadcastEncounterAction({ type: 'api-key-sync' })
        return
      }
    }

    // Primary path: load platform default key, then fall back to campaign/broadcast
    loadDefaultApiKey().then(async (defaultKey) => {
      if (defaultKey) {
        useStore.getState().setSessionApiKey(defaultKey)
        setApiKeyLoaded(true)
        if (isDM && campaignId) broadcastEncounterAction({ type: 'api-key-sync' })
        return
      }
      // No platform default — try campaign-specific key (DM) or request from DM (player)
      if (!campaignId || !user?.id) { setApiKeyLoaded(true); return }
      if (isDM) {
        try {
          const key = await loadApiKeyFromSupabase(campaignId, user.id)
          if (key) useStore.getState().setSessionApiKey(key)
        } catch {}
        setApiKeyLoaded(true)
      } else {
        // Non-DM: request key from DM via broadcast, with timeout fallback
        broadcastEncounterAction({ type: 'request-api-key' })
        setApiKeyLoaded(true) // Don't block non-DM players with ApiKeyGate
      }
    }).catch(() => setApiKeyLoaded(true))
  }, [campaign?.id, user?.id, isDM, sessionApiKey, addNarratorMessage])

  // World load timeout
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

  // Skill check follow-up
  const { handleChat, triggerDmFollowUp } = useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef })
  handleChatRef.current = handleChat

  useEffect(() => {
    if (!lastSkillCheckResult || !sessionApiKey || !isDM) return
    const { skill, pass } = lastSkillCheckResult
    if (skill === 'Stealth') return
    const { clearLastSkillCheckResult } = useStore.getState()
    clearLastSkillCheckResult()
    const timer = setTimeout(async () => {
      if (!triggerDmFollowUp) return
      const result = await triggerDmFollowUp()
      const { pendingEncounterData: ped } = useStore.getState()
      if (ped && pass && !result?.startCombat) {
        useStore.getState().clearPendingEncounterData()
        useStore.getState().setEncounterLock(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [lastSkillCheckResult, sessionApiKey, isDM, triggerDmFollowUp])

  return {
    apiKeyLoaded,
    setApiKeyLoaded,
    worldLoadError,
    handleChatRef,
    handleInteractRef,
    triggeredZonesRef,
    roofManagerRef,
    hasMovedRef,
  }
}
