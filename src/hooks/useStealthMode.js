import { useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { broadcastEncounterAction, broadcastStartCombat } from '../lib/liveChannel'

/**
 * Manages stealth approach gameplay:
 * - Watches skill check results to determine stealth pass/fail
 * - On pass: enters stealth mode (player can move freely while sneaking)
 * - On fail: starts combat immediately
 * - While sneaking: checks enemy passive perception each tile moved
 * - Adjacent to enemy undetected: combat starts with surprise
 */
export function useStealthMode({ playerPos, playerPosRef, partyMembers, zone }) {
  const stealthMode = useStore(s => s.stealthMode)
  const setStealthMode = useStore(s => s.setStealthMode)
  const clearStealthMode = useStore(s => s.clearStealthMode)
  const lastSkillCheckResult = useStore(s => s.lastSkillCheckResult)
  const clearLastSkillCheckResult = useStore(s => s.clearLastSkillCheckResult)
  const pendingEncounterData = useStore(s => s.pendingEncounterData)
  const clearPendingEncounterData = useStore(s => s.clearPendingEncounterData)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)

  // Stable callback to start surprise combat from stealth
  const startSurpriseCombat = useCallback((stealthData) => {
    const pos = playerPosRef.current
    const { startEncounter } = useStore.getState()
    const enemies = (stealthData.zoneEnemies || []).map(e => ({
      ...e, isEnemy: true, type: 'enemy',
      position: e.position || { x: pos.x + 2, y: pos.y },
    }))
    const myChar = useStore.getState().myCharacter
    const currentParty = useStore.getState().partyMembers || partyMembers || []
    const combatParty = currentParty.map(p => ({
      ...p,
      position: (myChar && (p.id === myChar.id || p.name === myChar.name))
        ? { ...pos }
        : null,
    }))
    if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
      combatParty.push({ ...myChar, position: { ...pos } })
    }
    startEncounter(enemies, combatParty, true, { surprise: true })
    broadcastStartCombat({ enemies, party: combatParty, autoRoll: true })
  }, [partyMembers, playerPosRef])

  // --- Stealth check result watcher ---
  useEffect(() => {
    if (!lastSkillCheckResult || !pendingEncounterData) return
    const { skill, total, pass } = lastSkillCheckResult

    // Only handle stealth checks here — non-stealth checks (Persuasion, etc.)
    // are handled by the skill-check follow-up flow in GameV2, which sends
    // the result back to the AI DM and lets it decide the outcome.
    // Don't clear lastSkillCheckResult — let GameV2's watcher consume it.
    if (skill !== 'Stealth') return

    clearLastSkillCheckResult()
    if (!pass) {
      // Stealth failed — start combat immediately
      const { startCombatWithZoneEnemies } = pendingEncounterData
      clearPendingEncounterData()
      useStore.getState().setEncounterLock(false)
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: 'You failed to stay hidden! The enemies spot you!' })
      startCombatWithZoneEnemies()
    } else {
      // Stealth succeeded — enter stealth mode
      const { enemyPositions, triggered } = pendingEncounterData
      const currentZone = useStore.getState().zone || zone
      const zoneEnemies = (currentZone?.enemies || []).filter(e => {
        const names = triggered?.enemies || []
        return names.some(n => e.name?.includes(n) || e.id?.includes(n))
      })
      const enemies = zoneEnemies.length > 0 ? zoneEnemies : (currentZone?.enemies || [])
      const stealthData = {
        active: true,
        stealthResult: total,
        enemyPositions: enemyPositions.length > 0
          ? enemyPositions
          : enemies.filter(e => e.position).map(e => ({
              ...e.position, name: e.name, wis: e.stats?.wis ?? 10,
            })),
        zoneEnemies: enemies,
        startCombatFn: pendingEncounterData.startCombatWithZoneEnemies,
      }
      setStealthMode(stealthData)
      clearPendingEncounterData()
      useStore.getState().setEncounterLock(false)
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `You blend into the shadows... (Stealth: ${total})` })
      // Broadcast stealth state to other players
      broadcastEncounterAction?.({ type: 'stealth-mode', active: true, stealthResult: total })
    }
  }, [lastSkillCheckResult, pendingEncounterData, zone, addNarratorMessage,
      clearLastSkillCheckResult, clearPendingEncounterData, setStealthMode])

  // --- Stealth proximity checker ---
  useEffect(() => {
    if (!stealthMode?.active) return
    const pos = playerPosRef.current
    const { stealthResult, enemyPositions } = stealthMode
    if (!enemyPositions?.length) return

    // Find nearest enemy and distance (Chebyshev)
    let nearestDist = Infinity
    let nearestEnemy = null
    for (const ep of enemyPositions) {
      const dx = Math.abs(pos.x - ep.x)
      const dy = Math.abs(pos.y - ep.y)
      const dist = Math.max(dx, dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestEnemy = ep
      }
    }

    if (nearestDist <= 1) {
      // Adjacent to enemy — surprise attack!
      clearStealthMode()
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: 'You reach striking distance undetected! The enemies are caught off guard!' })
      broadcastEncounterAction?.({ type: 'stealth-mode', active: false })
      startSurpriseCombat(stealthMode)
      return
    }

    // Enemy passive perception check (10 + WIS mod) vs player's stealth
    if (nearestEnemy && nearestDist <= 6) {
      const wisMod = Math.floor(((nearestEnemy.wis || 10) - 10) / 2)
      const passivePerception = 10 + wisMod
      if (passivePerception >= stealthResult) {
        // Detected!
        clearStealthMode()
        addNarratorMessage({ role: 'dm', speaker: 'DM', text: `${nearestEnemy.name || 'An enemy'} notices movement! You've been spotted!` })
        broadcastEncounterAction?.({ type: 'stealth-mode', active: false })
        if (stealthMode.startCombatFn) {
          stealthMode.startCombatFn()
        }
      }
    }
  }, [playerPos, stealthMode, clearStealthMode, addNarratorMessage,
      startSurpriseCombat])

  return { stealthMode }
}
