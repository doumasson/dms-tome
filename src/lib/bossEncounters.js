/**
 * Boss/Champion Encounter System — special named enemies with unique abilities,
 * tactics, and legendary treasures. Creates memorable combat moments.
 */

import { generateTreasureHoard } from './lootTables.js'

// Boss difficulty tiers
export const BOSS_TIERS = {
  LIEUTENANT: 'lieutenant',    // CR 3-5 (minor boss)
  CHAMPION: 'champion',        // CR 6-10 (major boss)
  LEGENDARY: 'legendary',      // CR 11-16 (world threat)
  ANCIENT: 'ancient',          // CR 17+ (reality-bending power)
};

// Boss special abilities
export const BOSS_ABILITIES = {
  MULTI_ATTACK: {
    name: 'Multiattack',
    description: 'Makes multiple weapon attacks per turn',
    attacks: 2,
  },
  REGENERATION: {
    name: 'Regeneration',
    description: 'Regains 10 HP at start of turn while alive',
    healing: 10,
  },
  LEGENDARY_ACTIONS: {
    name: 'Legendary Actions',
    description: 'Can take actions outside its turn (3 per round)',
    actions: 3,
  },
  MAGIC_RESISTANCE: {
    name: 'Magic Resistance',
    description: 'Advantage on saves against spells',
    advantage: true,
  },
  SPELL_IMMUNITY: {
    name: 'Spell Immunity',
    description: 'Immune to divination and enchantment magic',
    immunity: ['divination', 'enchantment'],
  },
  DAMAGE_IMMUNITY: {
    name: 'Damage Immunity',
    description: 'Immune to damage from non-magical weapons',
    immunity: ['bludgeoning', 'piercing', 'slashing'],
  },
  AURA: {
    name: 'Aura of Power',
    description: 'Nearby creatures have disadvantage on saves',
    radius: 30,
  },
  TELEPORT: {
    name: 'Teleport',
    description: 'Can teleport up to 60 feet as bonus action',
    range: 60,
  },
};

// Boss tactics (how they fight)
export const BOSS_TACTICS = {
  AGGRESSIVE: 'aggressive',        // Attacks strongest target
  DEFENSIVE: 'defensive',          // Tries to reduce incoming damage
  TACTICAL: 'tactical',            // Uses terrain and positioning
  SPELLCASTER: 'spellcaster',     // Prioritizes spell effects
  SUMMONER: 'summoner',            // Summons minions
  BERSERKER: 'berserker',          // Reckless attacks
};

// Boss archetypes with stat modifiers
export const BOSS_ARCHETYPES = {
  WARRIOR: {
    name: 'Warlord',
    strMod: 2,
    dexMod: 0,
    hpMult: 1.5,
    acBonus: 2,
    tactics: [BOSS_TACTICS.AGGRESSIVE, BOSS_TACTICS.TACTICAL],
    abilities: [BOSS_ABILITIES.MULTI_ATTACK, BOSS_ABILITIES.LEGENDARY_ACTIONS],
  },
  MAGE: {
    name: 'Archmage',
    intMod: 2,
    dexMod: 1,
    hpMult: 0.8,
    tactics: [BOSS_TACTICS.SPELLCASTER, BOSS_TACTICS.DEFENSIVE],
    abilities: [BOSS_ABILITIES.MAGIC_RESISTANCE, BOSS_ABILITIES.SPELL_IMMUNITY, BOSS_ABILITIES.TELEPORT],
  },
  ROGUE: {
    name: 'Master Assassin',
    dexMod: 2,
    intMod: 1,
    hpMult: 1.0,
    acBonus: 2,
    tactics: [BOSS_TACTICS.TACTICAL, BOSS_TACTICS.AGGRESSIVE],
    abilities: [BOSS_ABILITIES.MULTI_ATTACK, BOSS_ABILITIES.MAGIC_RESISTANCE],
  },
  CLERIC: {
    name: 'High Priest',
    wisMod: 2,
    strMod: 1,
    hpMult: 1.3,
    acBonus: 1,
    tactics: [BOSS_TACTICS.DEFENSIVE, BOSS_TACTICS.SUMMONER],
    abilities: [BOSS_ABILITIES.MAGIC_RESISTANCE, BOSS_ABILITIES.REGENERATION, BOSS_ABILITIES.AURA],
  },
  DRAGON: {
    name: 'Ancient Dragon',
    strMod: 2,
    dexMod: 0,
    hpMult: 2.0,
    acBonus: 3,
    tactics: [BOSS_TACTICS.AGGRESSIVE, BOSS_TACTICS.TACTICAL],
    abilities: [BOSS_ABILITIES.MULTI_ATTACK, BOSS_ABILITIES.DAMAGE_IMMUNITY, BOSS_ABILITIES.AURA],
  },
};

// Boss names by theme
const BOSS_NAMES = {
  warrior: [
    'Thrall the Destroyer', 'Morgath the Ironclad', 'Drakira the Warlord',
    'Stoneheart the Unyielding', 'Kargash the Butcher', 'Vex the Conqueror',
  ],
  mage: [
    'Archmagus Vorgrim', 'Elara the Spellweaver', 'Malachai the Eternal',
    'Zyx the Void-Touched', 'Meridian the Wise', 'Theron Nightbringer',
  ],
  rogue: [
    'The Phantom', 'Nightshade', 'Whisper the Unseen', 'Shade of the Void',
    'Silencer', 'The Ghost',
  ],
  cleric: [
    'Prophet Malthus', 'High Priestess Senna', 'Saint Aurelion',
    'Inquisitor Caspian', 'Bishop Morthain', 'The Oracle',
  ],
  dragon: [
    'Skarthax', 'Vermithrax', 'Tyraxes', 'Infernathor',
    'Celestrix', 'Dreadwing',
  ],
};

/**
 * Generate a boss/champion encounter
 * @param {number} partyLevel - Average party level
 * @param {string} tier - Boss tier (lieutenant/champion/legendary/ancient)
 * @param {string} archetype - Boss archetype (warrior/mage/rogue/cleric/dragon)
 * @returns {object} Boss configuration
 */
export function generateBossEncounter(partyLevel = 5, tier = BOSS_TIERS.CHAMPION, archetype = 'warrior') {
  const arch = BOSS_ARCHETYPES[archetype.toUpperCase()] || BOSS_ARCHETYPES.WARRIOR;
  const namePool = BOSS_NAMES[archetype.toLowerCase()] || BOSS_NAMES.warrior;
  const bossName = namePool[Math.floor(Math.random() * namePool.length)];

  // Determine CR based on party level and tier
  let cr;
  if (tier === BOSS_TIERS.LIEUTENANT) cr = partyLevel - 1;
  else if (tier === BOSS_TIERS.CHAMPION) cr = partyLevel + 2;
  else if (tier === BOSS_TIERS.LEGENDARY) cr = partyLevel + 5;
  else cr = partyLevel + 8;

  // Calculate HP
  const baseHP = 50 + (partyLevel * 5);
  const hp = Math.floor(baseHP * arch.hpMult);

  // Calculate AC
  const baseAC = 12 + (partyLevel / 5);
  const ac = Math.floor(baseAC + arch.acBonus);

  // Stat modifiers
  const baseStats = { str: 10, dex: 10, con: 12, int: 10, wis: 11, cha: 11 };
  const stats = {
    str: baseStats.str + (arch.strMod || 0) * 2,
    dex: baseStats.dex + (arch.dexMod || 0) * 2,
    con: baseStats.con + (arch.conMod || 0) * 2,
    int: baseStats.int + (arch.intMod || 0) * 2,
    wis: baseStats.wis + (arch.wisMod || 0) * 2,
    cha: baseStats.cha + (arch.chaMod || 0) * 2,
  };

  // Generate abilities based on archetype
  const abilities = [...(arch.abilities || [])].slice(0, 2 + Math.floor(tier === BOSS_TIERS.ANCIENT ? 3 : tier === BOSS_TIERS.LEGENDARY ? 2 : 1));

  // Select tactics
  const tactics = arch.tactics[Math.floor(Math.random() * arch.tactics.length)];

  // Generate treasure
  const treasure = generateTreasureHoard(cr);

  return {
    name: bossName,
    type: 'boss',
    tier,
    archetype,
    cr,
    currentHp: hp,
    maxHp: hp,
    ac,
    speed: 30,
    stats,
    abilities,
    tactics,
    legendary: tier === BOSS_TIERS.LEGENDARY || tier === BOSS_TIERS.ANCIENT,
    legendary_actions: tier === BOSS_TIERS.LEGENDARY || tier === BOSS_TIERS.ANCIENT ? 3 : 0,
    resistance: ['nonmagical damage'],
    conditions: [],
    deathSaves: { successes: 0, failures: 0, stable: false },
    treasure,
    position: { x: 7, y: 7 },
    description: `A formidable ${arch.name} of terrible power. Known as ${bossName}.`,
    xpReward: calculateBossXP(cr, partyLevel),
  };
}

/**
 * Calculate XP reward for defeating a boss
 * @param {number} cr - Challenge rating
 * @param {number} partyLevel - Average party level
 * @returns {number} XP award
 */
export function calculateBossXP(cr, partyLevel) {
  // DMG XP values by CR
  const xpByCR = {
    0: 10, 1: 25, 2: 50, 3: 75, 4: 100, 5: 150,
    6: 225, 7: 300, 8: 450, 9: 550, 10: 900,
    11: 1200, 12: 1600, 13: 2000, 14: 2300, 15: 2900,
    16: 3900, 17: 5000, 18: 5900, 19: 7200, 20: 9000,
  };

  const baseXP = xpByCR[Math.min(cr, 20)] || 9000;
  // Boss multiplier (1.5x for special encounter)
  return Math.floor(baseXP * 1.5);
}

/**
 * Get boss tactical description
 * @param {string} tactic - Boss tactic
 * @returns {string} Description
 */
export function describeBossTactic(tactic) {
  const descriptions = {
    [BOSS_TACTICS.AGGRESSIVE]: 'This boss fights ferociously, attacking the strongest combatants first.',
    [BOSS_TACTICS.DEFENSIVE]: 'This boss fights cautiously, using terrain and positioning to minimize damage.',
    [BOSS_TACTICS.TACTICAL]: 'This boss fights with calculated precision, using the battlefield to its advantage.',
    [BOSS_TACTICS.SPELLCASTER]: 'This boss relies on magic, preferring to control the battlefield from distance.',
    [BOSS_TACTICS.SUMMONER]: 'This boss calls forth minions and allies to overwhelm opponents.',
    [BOSS_TACTICS.BERSERKER]: 'This boss attacks with reckless fury, caring little for defense.',
  };

  return descriptions[tactic] || 'A dangerous foe of uncertain tactics.';
}

/**
 * Get boss tier description for narrative
 * @param {string} tier - Boss tier
 * @returns {string} Narrative description
 */
export function describeBossTier(tier) {
  const descriptions = {
    [BOSS_TIERS.LIEUTENANT]: 'A formidable opponent.',
    [BOSS_TIERS.CHAMPION]: 'A legendary warrior of great renown.',
    [BOSS_TIERS.LEGENDARY]: 'A being of immense power, spoken of in legends.',
    [BOSS_TIERS.ANCIENT]: 'An ancient force of terrible power, capable of reshaping the world.',
  };

  return descriptions[tier] || 'A dangerous foe.';
}
