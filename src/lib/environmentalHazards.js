/**
 * Environmental Combat Hazards — dynamic battlefield effects
 * that create tactical challenges during combat.
 */

export const HAZARD_TYPES = {
  LAVA: 'lava',           // 2d6 fire damage per turn
  FIRE: 'fire',           // 1d6 fire damage, flammable gear ignites
  ICE: 'ice',             // Difficult terrain, STR save or prone
  POISON_CLOUD: 'poison_cloud', // 1d4 poison damage, stealth interference
  ELECTRIFIED: 'electrified',   // 1d8 lightning, concentration save
  DARKNESS: 'darkness',   // Dim light, disadvantage on ranged attacks
  WEB: 'web',             // Difficult terrain, STR save escape
  COLLAPSE: 'collapse',   // Random tiles become difficult terrain
  BLESSED: 'blessed',     // Radiant aura, advantage on saves vs undead
  CURSED: 'cursed',       // Disadvantage on all rolls
};

/**
 * Hazard template definitions — damage, effects, visuals
 */
export const HAZARD_TEMPLATES = {
  [HAZARD_TYPES.LAVA]: {
    name: 'Lava',
    color: '#ff6600',
    damage: '2d6',
    damageType: 'fire',
    description: 'Searing lava burns exposed flesh.',
    radius: 2,
    turnTrigger: true,
  },
  [HAZARD_TYPES.FIRE]: {
    name: 'Wildfire',
    color: '#ff4400',
    damage: '1d6',
    damageType: 'fire',
    description: 'Flames spread across the battlefield.',
    radius: 1.5,
    turnTrigger: true,
  },
  [HAZARD_TYPES.ICE]: {
    name: 'Frozen Ground',
    color: '#88ccff',
    damage: null,
    damageType: null,
    description: 'Difficult terrain; STR save DC 14 or fall prone.',
    radius: 2,
    difficult: true,
    saveDC: 14,
    saveType: 'str',
    turnTrigger: false,
  },
  [HAZARD_TYPES.POISON_CLOUD]: {
    name: 'Poison Gas',
    color: '#88cc44',
    damage: '1d4',
    damageType: 'poison',
    description: 'Noxious gas clouds vision and sickens combatants.',
    radius: 2.5,
    turnTrigger: true,
    blindsight: false,
  },
  [HAZARD_TYPES.ELECTRIFIED]: {
    name: 'Electric Storm',
    color: '#ffff00',
    damage: '1d8',
    damageType: 'lightning',
    description: 'Lightning crackles across the area.',
    radius: 2,
    turnTrigger: true,
    concentration: true,
  },
  [HAZARD_TYPES.DARKNESS]: {
    name: 'Magical Darkness',
    color: '#220033',
    damage: null,
    damageType: null,
    description: 'Impenetrable darkness; ranged attacks have disadvantage.',
    radius: 3,
    difficult: false,
    turnTrigger: false,
    rangePenalty: true,
  },
  [HAZARD_TYPES.WEB]: {
    name: 'Giant Webs',
    color: '#ccccff',
    damage: null,
    damageType: null,
    description: 'Sticky webs slow movement; STR save DC 12 to escape.',
    radius: 2,
    difficult: true,
    saveDC: 12,
    saveType: 'str',
    turnTrigger: false,
  },
  [HAZARD_TYPES.COLLAPSE]: {
    name: 'Collapsing Ceiling',
    color: '#999999',
    damage: '2d6',
    damageType: 'bludgeoning',
    description: 'Debris falls; random tiles become difficult terrain.',
    radius: 2,
    turnTrigger: true,
    chaotic: true,
  },
  [HAZARD_TYPES.BLESSED]: {
    name: 'Holy Ground',
    color: '#ffffdd',
    damage: null,
    damageType: null,
    description: 'Holy aura grants advantage on saves vs undead.',
    radius: 2,
    turnTrigger: false,
    blessing: true,
  },
  [HAZARD_TYPES.CURSED]: {
    name: 'Cursed Ground',
    color: '#dd00dd',
    damage: null,
    damageType: null,
    description: 'A curse weakens all combatants (disadvantage on rolls).',
    radius: 2,
    turnTrigger: false,
    cursed: true,
  },
};

/**
 * Generate a random hazard for an encounter
 * @param {number} partyLevel - Average party level
 * @returns {object} Hazard configuration
 */
export function generateRandomHazard(partyLevel = 3) {
  const types = Object.values(HAZARD_TYPES);
  const hazardType = types[Math.floor(Math.random() * types.length)];
  const template = HAZARD_TEMPLATES[hazardType];

  return {
    type: hazardType,
    center: { x: 7, y: 7 }, // Center of combat arena
    radius: template.radius || 2,
    ...template,
    active: true,
    turnCounter: 0,
  };
}

/**
 * Get hazards active in current encounter
 * @param {number} probability - 0-1, chance of hazard in encounter (0.3 = 30%)
 * @returns {Array} Array of hazards
 */
export function determineEncounterHazards(probability = 0.3) {
  if (Math.random() > probability) return [];

  // 30-70% chance of 1 hazard, 20% chance of 2 hazards
  const numHazards = Math.random() < 0.7 ? 1 : 2;
  const hazards = [];
  for (let i = 0; i < numHazards; i++) {
    hazards.push(generateRandomHazard());
  }
  return hazards;
}

/**
 * Apply hazard damage to a combatant
 * @param {object} combatant - Combat participant
 * @param {object} hazard - Environmental hazard
 * @returns {object} { damage, saveFailed, effect }
 */
export function applyHazardEffect(combatant, hazard) {
  const result = { damage: 0, saveFailed: false, effect: null };

  // Check distance from hazard center
  if (!combatant.position) return result;
  const dx = combatant.position.x - hazard.center.x;
  const dy = combatant.position.y - hazard.center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > hazard.radius) return result; // Outside hazard area

  // Apply damage if applicable
  if (hazard.damage) {
    const rollMatch = hazard.damage.match(/(\d+)d(\d+)/);
    if (rollMatch) {
      const numDice = parseInt(rollMatch[1]);
      const dieSize = parseInt(rollMatch[2]);
      let damage = 0;
      for (let i = 0; i < numDice; i++) {
        damage += Math.floor(Math.random() * dieSize) + 1;
      }
      result.damage = damage;
    }
  }

  // Apply save effects
  if (hazard.saveType && hazard.saveDC) {
    const modKey = `${hazard.saveType}_save`;
    const saves = combatant.saves || {};
    const modifier = saves[modKey] || 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    result.saveFailed = total < hazard.saveDC;

    if (result.saveFailed) {
      if (hazard.saveType === 'str') {
        result.effect = 'prone';
      }
    }
  }

  // Concentration check for lightning
  if (hazard.concentration && result.damage > 0) {
    const conSave = combatant.saves?.con_save || 0;
    const dc = Math.ceil(result.damage / 2);
    const roll = Math.floor(Math.random() * 20) + 1;
    if (roll + conSave < dc) {
      result.effect = 'concentration_broken';
    }
  }

  return result;
}

/**
 * Get affected tiles for hazard visualization
 * @param {object} hazard - Environmental hazard
 * @param {number} width - Combat arena width
 * @param {number} height - Combat arena height
 * @returns {Array} Array of affected tile coordinates
 */
export function getHazardTiles(hazard, width = 14, height = 14) {
  const tiles = [];
  const cx = hazard.center.x;
  const cy = hazard.center.y;
  const r = hazard.radius;

  for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(width, Math.ceil(cx + r)); x++) {
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(height, Math.ceil(cy + r)); y++) {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= r) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/**
 * Describe a hazard for the DM prompt
 * @param {object} hazard - Environmental hazard
 * @returns {string} Narrative description
 */
export function describeHazard(hazard) {
  const descriptions = {
    [HAZARD_TYPES.LAVA]: `Molten lava pools bubble across the battlefield (${hazard.damage} damage per turn).`,
    [HAZARD_TYPES.FIRE]: `Raging fires spread across the arena (${hazard.damage} damage per turn).`,
    [HAZARD_TYPES.ICE]: `The ground is treacherous ice (difficult terrain; DEX save or prone).`,
    [HAZARD_TYPES.POISON_CLOUD]: `Choking poison gas clouds the air (${hazard.damage} damage per turn).`,
    [HAZARD_TYPES.ELECTRIFIED]: `Lightning arcs through the area (${hazard.damage} damage per turn).`,
    [HAZARD_TYPES.DARKNESS]: `Supernatural darkness obscures the battlefield.`,
    [HAZARD_TYPES.WEB]: `Giant webbing fills the area (difficult terrain; STR save to escape).`,
    [HAZARD_TYPES.COLLAPSE]: `The ceiling crumbles; debris falls randomly.`,
    [HAZARD_TYPES.BLESSED]: `Holy light bathes the area (undead at disadvantage).`,
    [HAZARD_TYPES.CURSED]: `A malevolent curse hangs over the battlefield (disadvantage on all rolls).`,
  };
  return descriptions[hazard.type] || 'An environmental hazard shapes the battlefield.';
}
