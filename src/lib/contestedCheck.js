// Contested ability check resolution (Grapple, Shove)
// Per 5e SRD: attacker rolls Athletics, defender chooses Athletics or Acrobatics

import { abilityMod, profBonus } from './derivedStats.js'

/**
 * Resolve a contested Athletics check (Grapple/Shove).
 * Attacker rolls Athletics; defender rolls the better of Athletics or Acrobatics.
 * @param {object} attacker - combatant initiating
 * @param {object} defender - combatant defending
 * @returns {{ attackerRoll, attackerBonus, attackerTotal, defenderRoll, defenderBonus, defenderTotal, defenderSkill }}
 */
export function resolveContestedCheck(attacker, defender) {
  const aStats = attacker.stats || attacker.abilityScores || {}
  const dStats = defender.stats || defender.abilityScores || {}
  const aLevel = attacker.level || 1
  const dLevel = defender.level || 1
  const aProf = profBonus(aLevel)
  const dProf = profBonus(dLevel)

  // Attacker: Athletics (STR-based)
  const aStrMod = abilityMod(aStats.str ?? 10)
  const aSkills = attacker.skills || []
  const aProficient = aSkills.some(s => s === 'Athletics' || s === 'athletics')
  const attackerBonus = aStrMod + (aProficient ? aProf : 0)
  const attackerRoll = Math.floor(Math.random() * 20) + 1
  const attackerTotal = attackerRoll + attackerBonus

  // Defender: better of Athletics (STR) or Acrobatics (DEX)
  const dStrMod = abilityMod(dStats.str ?? 10)
  const dDexMod = abilityMod(dStats.dex ?? 10)
  const dSkills = defender.skills || []
  const dAthProf = dSkills.some(s => s === 'Athletics' || s === 'athletics')
  const dAcroProf = dSkills.some(s => s === 'Acrobatics' || s === 'acrobatics')
  const athBonus = dStrMod + (dAthProf ? dProf : 0)
  const acroBonus = dDexMod + (dAcroProf ? dProf : 0)
  const useAcrobatics = acroBonus > athBonus

  const defenderBonus = useAcrobatics ? acroBonus : athBonus
  const defenderSkill = useAcrobatics ? 'Acrobatics' : 'Athletics'
  const defenderRoll = Math.floor(Math.random() * 20) + 1
  const defenderTotal = defenderRoll + defenderBonus

  return {
    attackerRoll, attackerBonus, attackerTotal,
    defenderRoll, defenderBonus, defenderTotal,
    defenderSkill,
  }
}
