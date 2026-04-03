import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import useStore from '../store/useStore'
import { rollRandomEncounter, generateRandomEncounter, calculateRandomEncounterLoot, isNearCivilization } from '../lib/randomEncounters'
import { broadcastEncounterAction, broadcastNarratorMessage, broadcastStartCombat } from '../lib/liveChannel'

// Minimum time (ms) after an encounter ends before another can trigger
const ENCOUNTER_COOLDOWN_MS = 240_000 // 4 minutes real time
// Minimum tiles of movement after an encounter before another can trigger
const ENCOUNTER_MOVEMENT_THRESHOLD = 35
// Only check once per N-tile region (grid cells grouped into regions)
const REGION_SIZE = 6

/**
 * Monitor player movement and trigger random encounters in dungeons/wilderness.
 * Encounters trigger rarely as the player explores dangerous areas.
 * Cooldown + region dedup + low probability = encounters feel organic, not spammy.
 */
export function useRandomEncounters({
  playerPos,
  inCombat,
  isDM,
  zone,
}) {
  const lastRegionRef = useRef(null)
  const lastEncounterTimeRef = useRef(Date.now()) // Start with current time to prevent spawn-trigger
  const tilesSinceEncounterRef = useRef(0) // Track tiles moved since last encounter
  const lastPosRef = useRef(null) // Previous position for distance tracking
  const spawnGuardRef = useRef(true) // Skip the very first movement after spawn

  useEffect(() => {
    // Only run on the elected AI runner (host-independent)
    const { isAIRunner, isDM: storeDM } = useStore.getState()
    if (!(isAIRunner ?? storeDM)) return
    // Don't check during combat or when there's already a pending encounter
    if (inCombat) return
    const { pendingEncounterData } = useStore.getState()
    if (pendingEncounterData) return
    // Need a zone with area type info
    if (!zone) return

    // Determine area type from zone theme/type — no encounters in towns
    const areaType = zone.theme === 'dungeon' || zone.dungeon ? 'dungeon' : 'wilderness'
    if (zone.theme === 'town' || zone.town || zone.safe) return

    // Skip the first few movements after spawn to prevent instant encounters
    if (spawnGuardRef.current) {
      spawnGuardRef.current = false
      lastPosRef.current = { ...playerPos }
      return
    }

    // Track cumulative movement distance (Manhattan) for movement-based cooldown
    if (lastPosRef.current) {
      const dx = Math.abs(playerPos.x - lastPosRef.current.x)
      const dy = Math.abs(playerPos.y - lastPosRef.current.y)
      tilesSinceEncounterRef.current += dx + dy
    }
    lastPosRef.current = { ...playerPos }

    // Region-based dedup: only check once per 6x6 tile region
    const regionKey = `${Math.floor(playerPos.x / REGION_SIZE)},${Math.floor(playerPos.y / REGION_SIZE)}`
    if (lastRegionRef.current === regionKey) return
    lastRegionRef.current = regionKey

    // Cooldown: don't check if an encounter happened recently (time-based)
    const now = Date.now()
    if (now - lastEncounterTimeRef.current < ENCOUNTER_COOLDOWN_MS) return

    // Movement-based cooldown: must move 35+ tiles before next encounter
    if (tilesSinceEncounterRef.current < ENCOUNTER_MOVEMENT_THRESHOLD) return

    // Never trigger near NPCs or buildings (8-tile safe radius)
    if (isNearCivilization(playerPos, zone)) return

    // Roll for encounter (low chance — 2% dungeon, 1.5% wilderness)
    if (!rollRandomEncounter(areaType)) return

    // Mark encounter time and reset movement counter to start cooldowns
    lastEncounterTimeRef.current = now
    tilesSinceEncounterRef.current = 0

    // Get party info
    const { partyMembers, addNarratorMessage } = useStore.getState()
    if (!partyMembers || partyMembers.length === 0) return

    const partyLevel = Math.round(partyMembers.reduce((s, m) => s + (m.level || 1), 0) / partyMembers.length)

    // Generate encounter
    const { enemies, dmPrompt, difficultyRating, hazards } = generateRandomEncounter(
      partyLevel,
      partyMembers.length,
      areaType
    )

    // Set up encounter but don't start combat immediately
    // DM gets narrative prompt, can choose to engage or let party pass
    const msg = {
      role: 'dm',
      speaker: 'The Narrator',
      text: dmPrompt,
      id: uuidv4(),
      timestamp: Date.now(),
    }
    addNarratorMessage(msg)
    broadcastNarratorMessage(msg)

    // Position enemies near the player
    const enemiesWithPositions = enemies.map((e, i) => ({
      ...e,
      position: {
        x: playerPos.x + 3 + (i % 3),
        y: playerPos.y - 1 + Math.floor(i / 3),
      },
      startPosition: {
        x: playerPos.x + 3 + (i % 3),
        y: playerPos.y - 1 + Math.floor(i / 3),
      },
    }))

    // Create the combat start function that other systems (narrator chat, stealth) expect
    const startCombatWithZoneEnemies = () => {
      const state = useStore.getState()
      const { startEncounter, partyMembers: pm, myCharacter: mc, currentAreaId: areaId, areaTokenPositions } = state
      if (startEncounter) {
        // Include live positions for all party members
        const areaPos = areaTokenPositions?.[areaId] || {}
        const partyWithPositions = (pm || []).map(p => {
          const isLocal = mc && (p.id === mc.id || p.name === mc.name)
          return {
            ...p,
            ...(isLocal ? mc : {}),
            position: isLocal ? { ...playerPos } : (areaPos[p.userId] || areaPos[p.id] || null),
          }
        })
        if (mc && !partyWithPositions.some(p => p.id === mc.id || p.name === mc.name)) {
          partyWithPositions.push({ ...mc, position: { ...playerPos } })
        }
        startEncounter(enemiesWithPositions, partyWithPositions, true, { hazards })
        broadcastStartCombat({ enemies: enemiesWithPositions, party: partyWithPositions, autoRoll: true })
      }
    }

    // Store encounter data and auto-start combat after a short delay
    // (gives the narrator message time to display before switching to combat UI)
    useStore.setState({
      pendingEncounterData: {
        enemies: enemiesWithPositions,
        hazards,
        difficulty: difficultyRating,
        dmPrompt,
        loot: calculateRandomEncounterLoot(enemies, partyMembers.length),
        startCombatWithZoneEnemies,
      },
    })

    // Auto-initiate combat after 2 seconds so the encounter message is visible
    setTimeout(() => {
      const { pendingEncounterData: pending } = useStore.getState()
      if (pending?.startCombatWithZoneEnemies) {
        pending.startCombatWithZoneEnemies()
        useStore.setState({ pendingEncounterData: null })
      }
    }, 2000)
  }, [playerPos, inCombat, isDM, zone])
}
