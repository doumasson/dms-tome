/**
 * Ability Resolver — Execute boss and enemy abilities with mechanical effects.
 * Handles damage, healing, conditions, positioning, and minion spawning.
 */

/**
 * Execute an ability with full mechanical effect.
 * @param {string} abilityName — Name of ability (MULTI_ATTACK, REGENERATION, etc.)
 * @param {object} caster — Casting combatant
 * @param {array} targets — Target combatants
 * @param {object} encounter — Current encounter state
 * @returns {object} { damage, conditions, position, narrative }
 */
export function executeAbility(abilityName, caster, targets, encounter) {
  const abilities = {
    MULTI_ATTACK: executeMultiAttack,
    REGENERATION: executeRegeneration,
    MAGIC_RESISTANCE: executeMagicResistance,
    SPELL_IMMUNITY: executeSpellImmunity,
    DAMAGE_IMMUNITY: executeDamageImmunity,
    AURA: executeAura,
    TELEPORT: executeTeleport,
  };

  const resolver = abilities[abilityName];
  if (!resolver) {
    return { damage: 0, conditions: [], narrative: `${abilityName} (unimplemented)` };
  }

  return resolver(caster, targets, encounter);
}

/**
 * Multi-attack: Caster makes 2-4 additional attacks against targets.
 */
function executeMultiAttack(caster, targets, encounter) {
  const attackCount = Math.min(targets.length, Math.ceil(caster.cr / 3) + 1);
  let totalDamage = 0;
  const affectedTargets = [];

  for (let i = 0; i < attackCount && i < targets.length; i++) {
    const target = targets[i];
    const baseDamage = Math.ceil(Math.random() * 12) + 5; // 5-17 damage
    const roll = Math.floor(Math.random() * 20) + 1;
    if (roll + (caster.attackBonus || 4) > target.ac) {
      totalDamage += baseDamage;
      affectedTargets.push(target.id);
    }
  }

  return {
    damage: totalDamage,
    affectedTargets,
    conditions: [],
    narrative: `The boss unleashes ${attackCount} attacks, dealing ${totalDamage} damage!`,
  };
}

/**
 * Regeneration: Caster heals self for 10-20 HP (but not above max).
 */
function executeRegeneration(caster, targets, encounter) {
  const healAmount = Math.min(15, caster.maxHp - caster.currentHp);
  return {
    damage: 0,
    healTarget: caster.id,
    healAmount,
    narrative: `The boss regenerates ${healAmount} HP!`,
  };
}

/**
 * Magic Resistance: Advantage on spell saves (flagged, not applied here — handled in spell resolver).
 */
function executeMagicResistance(caster, targets, encounter) {
  return {
    damage: 0,
    conditions: [{ type: 'MAGIC_RESISTANCE', duration: 'next_spell_save' }],
    narrative: 'The boss surrounds itself with magical resistance!',
  };
}

/**
 * Spell Immunity: Specific spell schools bounce off (Divination, Enchantment).
 */
function executeSpellImmunity(caster, targets, encounter) {
  return {
    damage: 0,
    conditions: [{ type: 'SPELL_IMMUNITY', schools: ['Divination', 'Enchantment'] }],
    narrative: 'The boss becomes immune to divination and enchantment!',
  };
}

/**
 * Damage Immunity: Nonmagical weapon damage is halved.
 */
function executeDamageImmunity(caster, targets, encounter) {
  return {
    damage: 0,
    conditions: [{ type: 'DAMAGE_IMMUNITY', damageTypes: ['bludgeoning', 'piercing', 'slashing'] }],
    narrative: 'The boss becomes immune to nonmagical weapons!',
  };
}

/**
 * Aura: All nearby enemies within 30ft take disadvantage on attacks, all nearby allies gain advantage.
 */
function executeAura(caster, targets, encounter) {
  const affectedEnemies = targets.filter(t => {
    const dist = Math.hypot((t.position?.x || 0) - (caster.position?.x || 0),
                           (t.position?.y || 0) - (caster.position?.y || 0));
    return dist <= 30 && t.type === 'player';
  });

  return {
    damage: 0,
    conditions: affectedEnemies.map(t => ({
      type: 'FRIGHTENED',
      duration: 'until_end_of_next_turn',
      saveDc: 15,
    })),
    affectedTargets: affectedEnemies.map(t => t.id),
    narrative: `The boss unleashes an aura of power! ${affectedEnemies.length} creatures are frightened!`,
  };
}

/**
 * Teleport: Caster teleports to a new position on the battlefield.
 */
function executeTeleport(caster, targets, encounter) {
  // Teleport to a safe distance from nearest enemy
  const nearestEnemy = targets.reduce((nearest, t) => {
    const dist = Math.hypot((t.position?.x || 0) - (caster.position?.x || 0),
                           (t.position?.y || 0) - (caster.position?.y || 0));
    return !nearest || dist < nearest.dist ? { ...t, dist } : nearest;
  }, null);

  const safeX = nearestEnemy ? nearestEnemy.position.x + 15 : (caster.position?.x || 10) + 10;
  const safeY = nearestEnemy ? nearestEnemy.position.y - 15 : (caster.position?.y || 10) - 10;

  return {
    damage: 0,
    position: { x: Math.max(0, safeX), y: Math.max(0, safeY) },
    narrative: `The boss teleports away in a flash of energy!`,
  };
}

/**
 * Resolve lair action (environmental effect like collapsing ceiling, magical blast).
 * @returns {object} { narrative, damage, conditions, affectedTargets }
 */
export function resolveLairAction(phase, encounter) {
  if (!phase.lairActionEnabled) {
    return { narrative: '', damage: 0, conditions: [], affectedTargets: [] };
  }

  const lairActions = [
    {
      name: 'Shattering Blast',
      narrative: 'The boss triggers a magical blast that shakes the chamber!',
      damage: (partySize) => Math.ceil(partySize * 3),
    },
    {
      name: 'Ceiling Collapse',
      narrative: 'Debris falls from above! DEX save DC 15 to avoid.',
      damage: (partySize) => Math.ceil(partySize * 2),
    },
    {
      name: 'Telekinetic Push',
      narrative: 'A wave of force pushes you backward!',
      damage: (partySize) => Math.ceil(partySize * 1.5),
    },
    {
      name: 'Arcane Explosion',
      narrative: 'The boss detonates magical energy in all directions!',
      damage: (partySize) => Math.ceil(partySize * 2.5),
    },
  ];

  const action = lairActions[Math.floor(Math.random() * lairActions.length)];
  const playerCount = encounter.combatants.filter(c => c.type === 'player').length;

  return {
    name: action.name,
    narrative: action.narrative,
    damage: action.damage(playerCount),
    conditions: [{ type: 'PRONE', duration: 'end_of_turn' }],
  };
}

/**
 * Spawn minions and add to encounter combatants.
 * @param {object} minions — { type: 'Goblin', count: 3 }
 * @param {object} position — { x, y } spawn location
 * @param {array} existingCombatants — Current combatants to avoid duplicate names
 * @returns {array} New combatant objects
 */
export function spawnMinions(minions, position, existingCombatants = []) {
  if (!minions || !minions.type) return [];

  const MINION_STATS = {
    Goblin: { cr: 0.25, hp: 7, ac: 15, attacks: ['Scimitar'] },
    Hobgoblin: { cr: 0.5, hp: 11, ac: 18, attacks: ['Longsword'] },
    Cultist: { cr: 0.125, hp: 5, ac: 12, attacks: ['Dagger'] },
    Acolyte: { cr: 0.25, hp: 9, ac: 10, attacks: ['Mace'] },
    Bandit: { cr: 0.125, hp: 16, ac: 12, attacks: ['Scimitar'] },
  };

  const stats = MINION_STATS[minions.type] || MINION_STATS.Goblin;
  const existingMinions = existingCombatants.filter(c => c.originalName === minions.type);

  const newMinions = [];
  for (let i = 0; i < minions.count; i++) {
    const nameIndex = existingMinions.length + i + 1;
    newMinions.push({
      id: `minion_${Date.now()}_${i}`,
      name: `${minions.type} ${nameIndex}`,
      originalName: minions.type,
      type: 'enemy',
      hp: stats.hp,
      currentHp: stats.hp,
      maxHp: stats.hp,
      ac: stats.ac,
      cr: stats.cr,
      speed: 30,
      position: { x: position.x + i * 5, y: position.y },
      stats: { str: 10, dex: 12, con: 10, int: 9, wis: 10, cha: 8 },
      attacks: stats.attacks,
      conditions: [],
      initiativeRoll: Math.floor(Math.random() * 20) + 1,
    });
  }

  return newMinions;
}

/**
 * Check if ability is legendary (consumes legendary action budget).
 */
export function isLegendaryAbility(abilityName) {
  const legendaryAbilities = ['MULTI_ATTACK', 'TELEPORT'];
  return legendaryAbilities.includes(abilityName);
}
