import { useEffect } from 'react'
import useStore from '../store/useStore'

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

  // --- Stealth check result watcher ---
  useEffect(() => {
    if (!lastSkillCheckResult || !pendingEncounterData) return
    const { skill, total, pass } = lastSkillCheckResult

    // Only handle stealth checks for deferred encounters
    if (skill !== 'Stealth') {
      clearPendingEncounterData()
      clearLastSkillCheckResult()
      pendingEncounterData.startCombatWithZoneEnemies()
      return
    }

    clearLastSkillCheckResult()
    if (!pass) {
      // Stealth failed — start combat immediately
      const { startCombatWithZoneEnemies } = pendingEncounterData
      clearPendingEncounterData()
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: 'You failed to stay hidden! The enemies spot you!' })
      startCombatWithZoneEnemies()
    } else {
      // Stealth succeeded — enter stealth mode
      const { enemyPositions, triggered } = pendingEncounterData
      const zoneEnemies = (zone?.enemies || []).filter(e => {
        const names = triggered?.enemies || []
        return names.some(n => e.name?.includes(n) || e.id?.includes(n))
      })
      const enemies = zoneEnemies.length > 0 ? zoneEnemies : (zone?.enemies || [])
      setStealthMode({
        active: true,
        stealthResult: total,
        enemyPositions: enemyPositions.length > 0
          ? enemyPositions
          : enemies.filter(e => e.position).map(e => ({
              ...e.position, name: e.name, wis: e.stats?.wis ?? 10,
            })),
        zoneEnemies: enemies,
        startCombatFn: pendingEncounterData.startCombatWithZoneEnemies,
      })
      clearPendingEncounterData()
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `You blend into the shadows... (Stealth: ${total})` })
    }
  }, [lastSkillCheckResult, pendingEncounterData])

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
      const { startEncounter } = useStore.getState()
      const enemies = (stealthMode.zoneEnemies || []).map(e => ({
        ...e, isEnemy: true, type: 'enemy',
        position: e.position || { x: pos.x + 2, y: pos.y },
      }))
      const myChar = useStore.getState().myCharacter
      const combatParty = (partyMembers || []).map(p => ({
        ...p,
        position: (myChar && (p.id === myChar.id || p.name === myChar.name))
          ? { ...playerPosRef.current }
          : null,
      }))
      if (myChar && !combatParty.some(p => p.id === myChar.id || p.name === myChar.name)) {
        combatParty.push({ ...myChar, position: { ...playerPosRef.current } })
      }
      startEncounter(enemies, combatParty, true, { surprise: true })
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
        if (stealthMode.startCombatFn) {
          stealthMode.startCombatFn()
        }
      }
    }
  }, [playerPos, stealthMode])

  return { stealthMode }
}
