// src/lib/readiedAction.js
// Readied Action system — 5e Ready action: specify trigger + response,
// use reaction when trigger occurs before next turn.

/**
 * Trigger types for readied actions.
 * Each has a label for UI and a check function.
 */
export const READY_TRIGGERS = [
  { id: 'enemy-enters-reach', label: 'Enemy enters my reach', description: 'When a hostile creature moves adjacent to you' },
  { id: 'enemy-enters-range', label: 'Enemy enters range', description: 'When a hostile creature moves within 6 tiles (30ft)' },
  { id: 'enemy-casts-spell', label: 'Enemy casts a spell', description: 'When a hostile creature casts a spell' },
  { id: 'ally-takes-damage', label: 'Ally takes damage', description: 'When a friendly creature takes damage' },
]

/**
 * Response types for readied actions.
 */
export const READY_RESPONSES = [
  { id: 'melee-attack', label: 'Melee Attack', description: 'Attack with your melee weapon', requiresWeapon: true },
  { id: 'ranged-attack', label: 'Ranged Attack', description: 'Attack with your ranged weapon', requiresWeapon: true },
  { id: 'move', label: 'Move (up to speed)', description: 'Move up to your speed' },
  { id: 'dash', label: 'Dash away', description: 'Move up to double your speed' },
]

/**
 * Check if a combat event matches a combatant's readied action trigger.
 *
 * @param {object} readied - { trigger, response, weapon? }
 * @param {string} eventType - 'move' | 'cast-spell' | 'take-damage'
 * @param {object} eventData - { moverId, moverIsEnemy, targetId, targetIsEnemy, fromPos, toPos }
 * @param {object} readyHolder - combatant with the readied action
 * @returns {boolean}
 */
export function checkReadiedTrigger(readied, eventType, eventData, readyHolder) {
  if (!readied || !readied.trigger || readyHolder.reactionUsed) return false
  if ((readyHolder.currentHp ?? 1) <= 0) return false

  const holderPos = readyHolder.position
  if (!holderPos) return false

  switch (readied.trigger) {
    case 'enemy-enters-reach': {
      if (eventType !== 'move' || !eventData.moverIsEnemy) return false
      const to = eventData.toPos
      if (!to) return false
      // Adjacent = Chebyshev distance 1
      const dist = Math.max(Math.abs(to.x - holderPos.x), Math.abs(to.y - holderPos.y))
      return dist <= 1
    }
    case 'enemy-enters-range': {
      if (eventType !== 'move' || !eventData.moverIsEnemy) return false
      const to = eventData.toPos
      if (!to) return false
      const dist = Math.max(Math.abs(to.x - holderPos.x), Math.abs(to.y - holderPos.y))
      return dist <= 6 // 30ft
    }
    case 'enemy-casts-spell': {
      return eventType === 'cast-spell' && eventData.moverIsEnemy
    }
    case 'ally-takes-damage': {
      if (eventType !== 'take-damage') return false
      // The damaged creature must be a non-enemy (ally)
      return !eventData.targetIsEnemy && eventData.targetId !== readyHolder.id
    }
    default:
      return false
  }
}

/**
 * Resolve a readied melee attack.
 * @param {object} attacker - combatant executing the readied attack
 * @param {object} target - combatant being attacked
 * @param {object} weapon - { name, bonus, damage }
 * @returns {{ hit, roll, total, damage, damageRoll }}
 */
export function resolveReadiedAttack(attacker, target, weapon) {
  const d20 = Math.floor(Math.random() * 20) + 1
  const bonus = parseInt(weapon?.bonus) || 0
  const total = d20 + bonus
  const ac = target.ac || 10
  const hit = d20 === 20 || (d20 !== 1 && total >= ac)

  let damage = 0
  let damageRoll = ''
  if (hit && weapon?.damage) {
    // Simple dice parsing
    const match = weapon.damage.match(/(\d+)d(\d+)([+-]\d+)?/)
    if (match) {
      const [, count, sides, modStr] = match
      const mod = parseInt(modStr) || 0
      let dmg = mod
      for (let i = 0; i < Number(count); i++) {
        dmg += Math.floor(Math.random() * Number(sides)) + 1
      }
      if (d20 === 20) {
        // Critical hit: double dice
        for (let i = 0; i < Number(count); i++) {
          dmg += Math.floor(Math.random() * Number(sides)) + 1
        }
      }
      damage = Math.max(1, dmg)
      damageRoll = weapon.damage
    } else {
      damage = Math.max(1, parseInt(weapon.damage) || 1)
      damageRoll = String(weapon.damage)
    }
  }

  return { hit, d20, total, ac, damage, damageRoll, crit: d20 === 20 }
}
