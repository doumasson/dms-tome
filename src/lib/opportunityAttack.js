// src/lib/opportunityAttack.js
import { chebyshev } from './gridUtils.js'
import { rollDamage } from './dice.js'

export function findOATriggers(path, enemies, moverDisengaged) {
  if (moverDisengaged) return []
  const triggers = []
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]
    const to = path[i + 1]
    for (const enemy of enemies) {
      if (enemy.reactionUsed) continue
      if ((enemy.currentHp ?? enemy.hp) <= 0) continue
      const adjBefore = chebyshev(from, enemy.position) <= 1
      const adjAfter = chebyshev(to, enemy.position) <= 1
      if (adjBefore && !adjAfter) {
        triggers.push({ step: i, enemy, tile: from })
      }
    }
  }
  return triggers
}

export function resolveOA(enemy, target) {
  const weapon = enemy.attacks?.[0] || { name: 'Unarmed Strike', bonus: '+0', damage: '1' }
  const bonus = parseInt(weapon.bonus) || 0
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + bonus
  const isCrit = d20 === 20
  const hit = isCrit || total >= (target.ac || 10)
  let damage = 0
  if (hit) {
    const dmgResult = rollDamage(weapon.damage || '1')
    damage = isCrit ? dmgResult.total * 2 : dmgResult.total
  }
  return { hit, d20, total, damage, isCrit, weaponName: weapon.name }
}
