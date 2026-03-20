// src/lib/trapSystem.js
import { rollDamage, getAbilityModifier } from './dice.js'

/**
 * Returns true when the passive perception meets or exceeds the trap's detection DC.
 * @param {number} passivePerception
 * @param {number} trapDC
 * @returns {boolean}
 */
export function canDetectTrap(passivePerception, trapDC) {
  return passivePerception >= trapDC
}

/**
 * Checks whether a trap should fire based on player position.
 * A trap only triggers when the player is on the exact same tile AND it
 * has not already been triggered.
 *
 * @param {{ position: { x: number, y: number }, triggered: boolean }} trap
 * @param {{ x: number, y: number }} playerPos
 * @returns {{ triggered: boolean, trap: object }}
 */
export function checkTrapTrigger(trap, playerPos) {
  if (trap.triggered) {
    return { triggered: false, trap }
  }

  const onTile =
    trap.position.x === playerPos.x && trap.position.y === playerPos.y

  return { triggered: onTile, trap }
}

/**
 * Computes a character's passive Perception score.
 * Passive Perception = 10 + WIS modifier
 *
 * @param {{ stats?: { wis?: number } }} character
 * @returns {number}
 */
export function getPassivePerception(character) {
  const wis = character?.stats?.wis ?? 10
  return 10 + Math.floor(((wis - 10) / 2))
}

/**
 * Resolves a trap's effect against a target.
 *
 * The target rolls a saving throw using the relevant ability score.
 * - On a **failed** save: full damage is dealt and any condition is applied.
 * - On a **successful** save: no damage, no condition (traps don't use half-damage
 *   rules like spells — a successful save negates the effect entirely).
 *
 * @param {{ effect: { damage?: string, damageType?: string, condition?: string, save: string, saveDC: number }, description: string }} trap
 * @param {{ stats: Record<string, number> }} target
 * @returns {{ saved: boolean, saveRoll: number, damage: number, condition: string|null, description: string }}
 */
export function resolveTrapEffect(trap, target) {
  const { effect, description } = trap
  const saveAbility = effect.save.toLowerCase() // 'DEX' → 'dex'
  const abilityScore = target?.stats?.[saveAbility] ?? 10
  const modifier = getAbilityModifier(abilityScore)

  // Roll d20 + modifier for saving throw
  const d20 = rollDamage('1d20')
  const saveRoll = d20.total + modifier
  const saved = saveRoll >= effect.saveDC

  if (saved) {
    return {
      saved: true,
      saveRoll,
      damage: 0,
      condition: null,
      description,
    }
  }

  // Failed save — roll damage if the trap deals damage
  const damageResult = effect.damage ? rollDamage(effect.damage) : null
  const damage = damageResult ? damageResult.total : 0

  return {
    saved: false,
    saveRoll,
    damage,
    condition: effect.condition ?? null,
    description,
  }
}
