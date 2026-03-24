import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import useStore from '../store/useStore'
import { rollRandomEncounter, generateRandomEncounter, calculateRandomEncounterLoot } from '../lib/randomEncounters'
import { broadcastEncounterAction, broadcastNarratorMessage } from '../lib/liveChannel'

// Minimum time (ms) between encounter checks — prevents spam during movement
const ENCOUNTER_COOLDOWN_MS = 60_000 // 60 seconds
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
  const lastEncounterTimeRef = useRef(0)

  useEffect(() => {
    // Only run on host/DM client
    if (!isDM) return
    // Don't check during combat or when there's already a pending encounter
    if (inCombat) return
    const { pendingEncounterData } = useStore.getState()
    if (pendingEncounterData) return
    // Need a zone with area type info
    if (!zone) return

    // Determine area type from zone theme/type — no encounters in towns
    const areaType = zone.theme === 'dungeon' || zone.dungeon ? 'dungeon' : 'wilderness'
    if (zone.theme === 'town' || zone.town || zone.safe) return

    // Region-based dedup: only check once per 6x6 tile region
    const regionKey = `${Math.floor(playerPos.x / REGION_SIZE)},${Math.floor(playerPos.y / REGION_SIZE)}`
    if (lastRegionRef.current === regionKey) return
    lastRegionRef.current = regionKey

    // Cooldown: don't check if an encounter happened recently
    const now = Date.now()
    if (now - lastEncounterTimeRef.current < ENCOUNTER_COOLDOWN_MS) return

    // Roll for encounter (low chance — 5% dungeon, 3% wilderness)
    if (!rollRandomEncounter(areaType)) return

    // Mark encounter time to start cooldown
    lastEncounterTimeRef.current = now

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
      text: `${dmPrompt}\n\nYou notice ${enemies.map(e => e.originalName).join(', ')} ahead! Initiative?`,
      id: uuidv4(),
      timestamp: Date.now(),
    }
    addNarratorMessage(msg)
    broadcastNarratorMessage(msg)

    // Store encounter data for DM to decide how to proceed
    useStore.setState({
      pendingEncounterData: {
        enemies,
        hazards,
        difficulty: difficultyRating,
        dmPrompt,
        loot: calculateRandomEncounterLoot(enemies, partyMembers.length),
      },
    })
  }, [playerPos, inCombat, isDM, zone])
}
