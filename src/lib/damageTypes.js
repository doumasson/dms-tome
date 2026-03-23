/**
 * Damage Types and Resistances System
 *
 * Handles:
 * - 13 damage types from D&D 5e (bludgeoning, piercing, slashing, fire, cold, lightning,
 *   thunder, poison, acid, psychic, radiant, necrotic, force)
 * - Damage resistances (half damage)
 * - Damage vulnerabilities (double damage)
 * - Damage immunities (no damage)
 * - Nonmagical damage resistance
 */

export const DAMAGE_TYPES = {
  // Physical
  BLUDGEONING: 'bludgeoning',
  PIERCING: 'piercing',
  SLASHING: 'slashing',
  // Elemental
  FIRE: 'fire',
  COLD: 'cold',
  LIGHTNING: 'lightning',
  THUNDER: 'thunder',
  // Exotic
  POISON: 'poison',
  ACID: 'acid',
  PSYCHIC: 'psychic',
  RADIANT: 'radiant',
  NECROTIC: 'necrotic',
  FORCE: 'force',
};

/**
 * Calculate actual damage after applying resistances, vulnerabilities, and immunities
 * @param {number} baseDamage - Raw damage value
 * @param {string} damageType - Type of damage (fire, cold, etc.)
 * @param {boolean} isMagical - Whether the damage is from a magical source
 * @param {object} target - Target character/creature
 * @returns {{ actualDamage: number, notes: string[] }}
 */
export function calculateActualDamage(baseDamage, damageType, isMagical, target) {
  const notes = [];
  let actualDamage = baseDamage;

  if (!target) return { actualDamage, notes };

  // Extract resistances, vulnerabilities, immunities
  const resistances = target.resistances || [];
  const vulnerabilities = target.vulnerabilities || [];
  const immunities = target.immunities || [];

  // Check for immunity
  if (immunities.includes(damageType) || (immunities.includes('nonmagical') && !isMagical)) {
    notes.push(`${target.name} is immune to ${damageType} damage`);
    return { actualDamage: 0, notes };
  }

  // Check for vulnerability (applies first, before resistance can negate)
  if (vulnerabilities.includes(damageType)) {
    actualDamage *= 2;
    notes.push(`${target.name} is vulnerable to ${damageType} (×2 damage)`);
  }

  // Check for resistance
  if (resistances.includes(damageType) || (resistances.includes('nonmagical') && !isMagical)) {
    actualDamage = Math.ceil(actualDamage / 2);
    notes.push(`${target.name} resists ${damageType} (½ damage)`);
  }

  // Cleric feature: Petrified immunity to poison/disease, resistance to all damage
  if (target.conditions?.includes('Petrified')) {
    if (damageType === 'poison' || damageType === 'disease') {
      notes.push('Petrified creatures are immune to poison');
      return { actualDamage: 0, notes };
    }
    // Petrified still takes 25% damage from most sources (resistance bonus)
    actualDamage = Math.ceil(actualDamage / 4);
    notes.push('Petrified creature takes reduced damage');
  }

  // Barbarian Rage: resistance to B/P/S damage
  if (target.conditions?.includes('Raging') && ['bludgeoning', 'piercing', 'slashing'].includes(damageType)) {
    actualDamage = Math.ceil(actualDamage / 2);
    notes.push('Raging barbarian resists physical damage (½)');
  }

  return { actualDamage: Math.max(0, actualDamage), notes };
}

/**
 * Get racial damage resistances/immunities
 * @param {string} race - Character race
 * @returns {{ resistances: string[], immunities: string[] }}
 */
export function getRacialResistances(race) {
  const resistances = {
    Dwarf: ['poison'],
    Elf: [],
    Halfling: ['poison'],
    Human: [],
    Dragonborn: [], // Draconic Resilience adds elemental resistance by color
    Gnome: [],
    HalfElf: [],
    HalfOrc: [],
    Tiefling: ['fire'],
  };

  return {
    resistances: resistances[race] || [],
    immunities: [],
  };
}

/**
 * Get class-based damage resistances
 * @param {string} className - Character class
 * @param {object} conditions - Current conditions/features
 * @returns {{ resistances: string[], immunities: string[] }}
 */
export function getClassResistances(className, conditions = []) {
  let resistances = [];
  let immunities = [];

  // Barbarian rage gives B/P/S resistance (checked in calculateActualDamage)
  // Rogue evasion is DEX save, not damage resistance
  // Cleric features vary by domain

  return { resistances, immunities };
}

/**
 * Get magical item-based resistances
 * @param {array} equipment - Character's equipped items
 * @returns {{ resistances: string[], immunities: string[] }}
 */
export function getEquipmentResistances(equipment = []) {
  const resistances = new Set();
  const immunities = new Set();

  if (!Array.isArray(equipment)) return { resistances: [], immunities: [] };

  for (const item of equipment) {
    if (!item) continue;

    // Potion of Fire Resistance
    if (item.name === 'Potion of Fire Resistance' || item.effect?.includes('fire resistance')) {
      resistances.add('fire');
    }

    // Ring of Protection (not damage resistance, skip)
    // Wyvern Armor (poison resistance)
    if (item.name?.includes('Wyvern')) {
      resistances.add('poison');
    }
  }

  return { resistances: Array.from(resistances), immunities: Array.from(immunities) };
}

/**
 * Compile all resistances from all sources
 * @param {object} character - Character object
 * @returns {{ resistances: string[], vulnerabilities: string[], immunities: string[] }}
 */
export function getAllDamageResistances(character) {
  if (!character) return { resistances: [], vulnerabilities: [], immunities: [] };

  const allResistances = new Set();
  const allVulnerabilities = new Set();
  const allImmunities = new Set();

  // Racial resistances
  const racial = getRacialResistances(character.race || '');
  racial.resistances.forEach(r => allResistances.add(r));
  racial.immunities.forEach(i => allImmunities.add(i));

  // Class resistances
  const classResist = getClassResistances(character.class || '', character.conditions || []);
  classResist.resistances.forEach(r => allResistances.add(r));
  classResist.immunities.forEach(i => allImmunities.add(i));

  // Equipment resistances
  const equip = getEquipmentResistances(character.equippedItems || []);
  equip.resistances.forEach(r => allResistances.add(r));
  equip.immunities.forEach(i => allImmunities.add(i));

  // Character-specific resistances (from abilities or spells)
  if (character.resistances?.length) {
    character.resistances.forEach(r => allResistances.add(r));
  }
  if (character.vulnerabilities?.length) {
    character.vulnerabilities.forEach(v => allVulnerabilities.add(v));
  }
  if (character.immunities?.length) {
    character.immunities.forEach(i => allImmunities.add(i));
  }

  return {
    resistances: Array.from(allResistances),
    vulnerabilities: Array.from(allVulnerabilities),
    immunities: Array.from(allImmunities),
  };
}

/**
 * Check if damage is magical
 * Common nonmagical weapons: mundane swords, clubs, arrows
 * Magical damage: spells, magical weapons, special abilities
 */
export function isDamageMagical(source) {
  if (!source) return false;

  // Spells are always magical
  if (source.isSpell || source.type === 'spell') return true;

  // Magical weapons
  if (source.magical === true || source.rarity) return true;

  // Common nonmagical weapons
  const nonmagical = ['Longsword', 'Shortsword', 'Dagger', 'Club', 'Staff', 'Crossbow', 'Shortbow', 'Longbow'];
  if (nonmagical.includes(source.name)) return false;

  // Default: assume mundane unless explicitly marked magical
  return false;
}

/**
 * Get damage type from an attack or spell
 */
export function getDamageType(source) {
  if (!source) return 'bludgeoning';

  if (source.damageType) return source.damageType;
  if (source.type === 'fire') return 'fire';
  if (source.type === 'cold') return 'cold';

  // Default physical damage from weapons
  if (source.isMeleeAttack) return 'bludgeoning';
  if (source.damageText?.includes('fire')) return 'fire';
  if (source.damageText?.includes('cold')) return 'cold';

  return 'bludgeoning';
}
