/**
 * Minion Tactical AI — Intelligent coordination with boss and other minions.
 * Minions support boss, focus fire, and adapt to battlefield conditions.
 */

/**
 * Calculate minion action based on tactical situation.
 * Prioritizes: boss support > focus fire > disrupt weak targets > retreat if doomed.
 * @param {object} minion — Minion combatant
 * @param {object} boss — Boss combatant
 * @param {array} allies — Other allied minions
 * @param {array} enemies — Player combatants
 * @returns {object} { action, targetId, narrative }
 */
export function getMinionsActionPriority(minion, boss, allies, enemies) {
  if (!minion.position || !boss.position) {
    return { action: 'idle', narrative: `${minion.name} stands ready.` };
  }

  const livingEnemies = enemies.filter(e => e.currentHp > 0);
  const distToBoss = Math.hypot(minion.position.x - boss.position.x, minion.position.y - boss.position.y);

  // **Priority 1: Boss is in danger (surrounded or low HP) — go protect**
  const enemiesNearBoss = livingEnemies.filter(e => {
    const d = Math.hypot(e.position?.x - boss.position.x, e.position?.y - boss.position.y);
    return d <= 2; // Adjacent or very close
  });

  if (boss.currentHp < boss.maxHp * 0.3 && enemiesNearBoss.length > 0 && distToBoss > 1.5) {
    return {
      action: 'defend-boss',
      targetId: null,
      moveTo: moveTowardsBoss(minion.position, boss.position),
      narrative: `${minion.name} rushes to defend ${boss.name}!`,
    };
  }

  // **Priority 2: Focus fire on wounded target (if boss already engaged)**
  if (livingEnemies.length > 0) {
    const bossTarget = findBossTarget(boss, livingEnemies);
    if (bossTarget) {
      const woundedFactor = (bossTarget.maxHp - bossTarget.currentHp) / bossTarget.maxHp;
      const nearMinion = distanceToEnemy(minion, bossTarget) <= 1.5;

      if (nearMinion && woundedFactor > 0.4) {
        // Close to wounded target - focus fire
        return {
          action: 'focus-fire',
          targetId: bossTarget.id,
          narrative: `${minion.name} joins the assault on ${bossTarget.name}!`,
        };
      }
    }
  }

  // **Priority 3: Attack weakest enemy**
  if (livingEnemies.length > 0) {
    const weakest = livingEnemies.reduce((w, e) => {
      const wHp = w.currentHp / Math.max(1, w.maxHp);
      const eHp = e.currentHp / Math.max(1, e.maxHp);
      return eHp < wHp ? e : w;
    });

    const distToWeakest = distanceToEnemy(minion, weakest);
    if (distToWeakest <= 1.5) {
      // Adjacent - attack
      return {
        action: 'attack',
        targetId: weakest.id,
        narrative: `${minion.name} strikes ${weakest.name}!`,
      };
    } else if (distToWeakest <= 4) {
      // Can reach - move and prepare to attack
      return {
        action: 'advance',
        targetId: weakest.id,
        moveTo: moveTowardsEnemy(minion.position, weakest.position),
        narrative: `${minion.name} advances toward ${weakest.name}.`,
      };
    }
  }

  // **Priority 4: Move toward nearest enemy**
  if (livingEnemies.length > 0) {
    const nearest = livingEnemies.reduce((n, e) => {
      const nDist = distanceToEnemy(minion, n);
      const eDist = distanceToEnemy(minion, e);
      return eDist < nDist ? e : n;
    });

    return {
      action: 'advance',
      targetId: nearest.id,
      moveTo: moveTowardsEnemy(minion.position, nearest.position),
      narrative: `${minion.name} moves toward the party.`,
    };
  }

  return { action: 'idle', narrative: `${minion.name} waits.` };
}

/**
 * Find what target the boss is attacking (for focus fire).
 */
function findBossTarget(boss, enemies) {
  // Assume boss is targeting the closest enemy, or use last_target if available
  return enemies.reduce((closest, e) => {
    if (!closest) return e;
    const cDist = Math.hypot(e.position?.x - boss.position.x, e.position?.y - boss.position.y);
    const eDist = Math.hypot(closest.position?.x - boss.position.x, closest.position?.y - boss.position.y);
    return eDist < cDist ? closest : e;
  });
}

/**
 * Calculate distance from minion to enemy.
 */
function distanceToEnemy(minion, enemy) {
  if (!minion.position || !enemy.position) return 999;
  return Math.hypot(minion.position.x - enemy.position.x, minion.position.y - enemy.position.y);
}

/**
 * Suggest move position toward boss (for protection).
 */
function moveTowardsBoss(fromPos, toPos) {
  if (!fromPos || !toPos) return fromPos;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return fromPos;
  return {
    x: Math.round(fromPos.x + (dx / dist) * 1.5),
    y: Math.round(fromPos.y + (dy / dist) * 1.5),
  };
}

/**
 * Suggest move position toward enemy (for attack).
 */
function moveTowardsEnemy(fromPos, toPos) {
  if (!fromPos || !toPos) return fromPos;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return fromPos;
  // Move 1-1.5 squares toward target
  const moveAmount = Math.min(1.5, Math.max(0.5, dist - 1));
  return {
    x: Math.round(fromPos.x + (dx / dist) * moveAmount),
    y: Math.round(fromPos.y + (dy / dist) * moveAmount),
  };
}

/**
 * Check if minion should retreat (boss dead, all allies dead, outnumbered badly).
 * @returns {boolean} true if minion should attempt to flee
 */
export function shouldMinionRetreat(minion, boss, allies, enemies) {
  // Boss is dead - always retreat
  if (boss.currentHp <= 0) return true;

  // Heavily outnumbered and low HP - retreat
  const livingAllies = allies.filter(a => a.currentHp > 0).length;
  const livingEnemies = enemies.filter(e => e.currentHp > 0).length;

  if (livingAllies === 0 && livingEnemies > 0) return true; // Last minion standing
  if (minion.currentHp < minion.maxHp * 0.2 && livingEnemies > livingAllies) return true; // Nearly dead and losing

  return false;
}

/**
 * Generate flanking bonus if minion is positioned tactically.
 * Returns attack bonus if minion is flanking with boss/allies.
 * @returns {number} Bonus to add to attack roll (0 or +2)
 */
export function calculateFlankingBonus(minion, allies, target) {
  if (!minion.position || !target.position) return 0;

  // Check if boss (or other ally) is on opposite side of target
  for (const ally of allies) {
    if (!ally.position || ally.id === minion.id) continue;

    const minionOnLeft = minion.position.x < target.position.x;
    const allyOnRight = ally.position.x > target.position.x;
    const sameYAxis = Math.abs(minion.position.y - ally.position.y) <= 1;

    if ((minionOnLeft && allyOnRight && sameYAxis) || (!minionOnLeft && !allyOnRight && sameYAxis)) {
      return 2; // Flanking bonus
    }
  }

  return 0;
}

/**
 * Describe minion tactical situation for narrator.
 */
export function describeMinionsStatus(minions, boss) {
  if (minions.length === 0) return '';

  const living = minions.filter(m => m.currentHp > 0);
  if (living.length === 0) return 'The minions have all fallen!';

  const healthy = living.filter(m => m.currentHp > m.maxHp * 0.75).length;
  const wounded = living.filter(m => m.currentHp <= m.maxHp * 0.3).length;

  const descriptions = [];
  if (wounded > 0) descriptions.push(`${wounded} minion${wounded > 1 ? 's' : ''} [bloodied]`);
  if (healthy === living.length) descriptions.push(`${living.length} fresh minion${living.length > 1 ? 's' : ''}`);
  if (descriptions.length === 0) descriptions.push(`${living.length} minion${living.length > 1 ? 's' : ''}`);

  return `The ${boss?.name || 'boss'} is supported by ${descriptions.join(', ')}.`;
}
