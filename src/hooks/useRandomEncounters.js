import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { rollRandomEncounter, generateRandomEncounter, calculateRandomEncounterLoot } from '../lib/randomEncounters'
import { broadcastEncounterAction, broadcastNarratorMessage } from '../lib/liveChannel'

/**
 * Monitor player movement and trigger random encounters in dungeons/wilderness.
 * Encounters trigger periodically as the player explores dangerous areas.
 */
export function useRandomEncounters({
  playerPos,
  inCombat,
  isDM,
  zone,
}) {
  const lastEncounterCheckRef = useRef(null)

  useEffect(() => {
    // Only run on host/DM client
    if (!isDM) return
    // Don't check during combat or encounter
    if (inCombat) return
    // Need a zone with area type info
    if (!zone) return

    // Determine area type from zone theme/type
    const areaType = zone.theme === 'dungeon' || zone.dungeon ? 'dungeon' : 'wilderness'

    // Check every ~2 tiles (don't check every position)
    const checkKey = `${Math.floor(playerPos.x / 2)},${Math.floor(playerPos.y / 2)}`
    if (lastEncounterCheckRef.current === checkKey) return
    lastEncounterCheckRef.current = checkKey

    // Roll for encounter
    if (!rollRandomEncounter(areaType)) return

    // Get party info
    const { partyMembers, startEncounter, addNarratorMessage } = useStore.getState()
    if (!partyMembers || partyMembers.length === 0) return

    const partyLevel = Math.round(partyMembers.reduce((s, m) => s + (m.level || 1), 0) / partyMembers.length)

    // Generate encounter
    const { enemies, dmPrompt, difficultyRating } = generateRandomEncounter(
      partyLevel,
      partyMembers.length,
      areaType
    )

    // Set up encounter but don't start combat immediately
    // DM gets narrative prompt, can choose to engage or let party pass
    const msg = {
      role: 'dm',
      speaker: 'Dungeon Master',
      text: `${dmPrompt}\n\nYou notice ${enemies.map(e => e.originalName).join(', ')} ahead! Initiative?`,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    addNarratorMessage(msg)
    broadcastNarratorMessage(msg)

    // Store encounter data for DM to decide how to proceed
    useStore.setState({
      pendingEncounterData: {
        enemies,
        difficulty: difficultyRating,
        dmPrompt,
        loot: calculateRandomEncounterLoot(enemies, partyMembers.length),
      },
    })
  }, [playerPos, inCombat, isDM, zone])
}
