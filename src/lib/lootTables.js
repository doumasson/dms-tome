/**
 * D&D 5e Loot Table System — generates treasure based on encounter difficulty
 * and character level. Implements official DMG loot tables with item rarities.
 */

// Item rarity tiers
export const ITEM_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  VERY_RARE: 'very_rare',
  LEGENDARY: 'legendary',
  ARTIFACT: 'artifact',
};

// Rarity color mapping for UI
export const RARITY_COLORS = {
  [ITEM_RARITY.COMMON]: '#a0a0a0',      // Gray
  [ITEM_RARITY.UNCOMMON]: '#1eff00',    // Green
  [ITEM_RARITY.RARE]: '#0070dd',        // Blue
  [ITEM_RARITY.VERY_RARE]: '#a335ee',   // Purple
  [ITEM_RARITY.LEGENDARY]: '#ff8000',   // Orange
  [ITEM_RARITY.ARTIFACT]: '#e6cc80',    // Gold
};

// Loot table by character level (DMG)
export const LOOT_BY_LEVEL = {
  1: { copper: '6d6 * 10', silver: '3d6 * 100', gold: 0, platinum: 0, magicItems: 0.1 },
  5: { copper: 0, silver: '4d6 * 100', gold: '2d6 * 100', platinum: 0, magicItems: 0.25 },
  10: { copper: 0, silver: 0, gold: '4d6 * 1000', platinum: '2d6 * 100', magicItems: 0.5 },
  15: { copper: 0, silver: 0, gold: '2d6 * 10000', platinum: '8d6 * 1000', magicItems: 0.75 },
  20: { copper: 0, silver: 0, gold: 0, platinum: '1d6 * 25000', magicItems: 1 },
};

// Difficulty-based loot multipliers
const DIFFICULTY_MULTIPLIERS = {
  Easy: 0.5,
  Medium: 1,
  Hard: 1.5,
  Deadly: 2,
};

// Common magic items (uncommon/rare)
const COMMON_MAGIC_ITEMS = [
  { name: 'Potion of Healing', rarity: ITEM_RARITY.COMMON, value: 50 },
  { name: 'Potion of Strength', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Potion of Dexterity', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Potion of Constitution', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Potion of Intelligence', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Potion of Wisdom', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Potion of Charisma', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Scroll of Magic Missile', rarity: ITEM_RARITY.UNCOMMON, value: 100 },
  { name: 'Wand of Magic Missiles', rarity: ITEM_RARITY.UNCOMMON, value: 200 },
  { name: '+1 Dagger', rarity: ITEM_RARITY.RARE, value: 500 },
  { name: '+1 Shortsword', rarity: ITEM_RARITY.RARE, value: 500 },
  { name: '+1 Longsword', rarity: ITEM_RARITY.RARE, value: 750 },
  { name: '+1 Longbow', rarity: ITEM_RARITY.RARE, value: 750 },
  { name: '+1 Leather Armor', rarity: ITEM_RARITY.RARE, value: 500 },
  { name: '+1 Chain Mail', rarity: ITEM_RARITY.RARE, value: 750 },
  { name: 'Ring of Protection', rarity: ITEM_RARITY.RARE, value: 750 },
  { name: 'Cloak of Elvenkind', rarity: ITEM_RARITY.RARE, value: 500 },
  { name: 'Boots of Speed', rarity: ITEM_RARITY.RARE, value: 500 },
];

// Rare and very rare items
const RARE_MAGIC_ITEMS = [
  { name: '+2 Longsword', rarity: ITEM_RARITY.VERY_RARE, value: 2500 },
  { name: '+2 Plate Armor', rarity: ITEM_RARITY.VERY_RARE, value: 3000 },
  { name: 'Flaming Longsword', rarity: ITEM_RARITY.VERY_RARE, value: 3000 },
  { name: 'Cloak of Displacement', rarity: ITEM_RARITY.VERY_RARE, value: 2500 },
  { name: 'Ring of Spell Storing', rarity: ITEM_RARITY.VERY_RARE, value: 2500 },
  { name: 'Wand of Fireballs', rarity: ITEM_RARITY.VERY_RARE, value: 2000 },
  { name: 'Bag of Holding', rarity: ITEM_RARITY.VERY_RARE, value: 2000 },
  { name: 'Rope of Entanglement', rarity: ITEM_RARITY.VERY_RARE, value: 1500 },
  { name: '+3 Longsword', rarity: ITEM_RARITY.LEGENDARY, value: 10000 },
  { name: '+3 Plate Armor', rarity: ITEM_RARITY.LEGENDARY, value: 15000 },
  { name: 'Holy Avenger', rarity: ITEM_RARITY.LEGENDARY, value: 25000 },
];

/**
 * Roll dice notation (e.g., "4d6", "2d6 * 100", "1d20+5")
 * @param {string} notation - Dice notation
 * @returns {number} Result of roll
 */
function rollDice(notation) {
  // Match dice notation with optional multiplier: "2d6 * 100" or "1d20+5"
  const match = notation.match(/(\d+)d(\d+)(?:\s*\*\s*(\d+))?(?:\+(\d+))?/);
  if (!match) return 0;

  const numDice = parseInt(match[1]);
  const dieSize = parseInt(match[2]);
  const multiplier = parseInt(match[3]) || 1;
  const bonus = parseInt(match[4]) || 0;

  let total = bonus;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }
  return total * multiplier;
}

/**
 * Generate loot for an encounter based on party level and difficulty
 * @param {number} partyLevel - Average party level
 * @param {string} difficulty - 'Easy', 'Medium', 'Hard', 'Deadly'
 * @param {number} partySize - Number of party members
 * @returns {object} { gold, platinum, magicItems, description }
 */
export function generateLoot(partyLevel, difficulty = 'Medium', partySize = 4) {
  // Clamp level to 1-20
  const level = Math.max(1, Math.min(20, partyLevel));

  // Find appropriate loot table (use closest level bracket)
  const levels = [1, 5, 10, 15, 20];
  const closestLevel = levels.reduce((prev, curr) =>
    Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
  );

  const baseLoot = LOOT_BY_LEVEL[closestLevel];
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1;

  // Calculate currency
  let gold = 0;
  let platinum = 0;

  if (baseLoot.gold > 0) {
    if (typeof baseLoot.gold === 'string') {
      gold = rollDice(baseLoot.gold);
    } else {
      gold = baseLoot.gold;
    }
    gold = Math.floor(gold * multiplier / partySize);
  }

  if (baseLoot.platinum > 0) {
    if (typeof baseLoot.platinum === 'string') {
      platinum = rollDice(baseLoot.platinum);
    } else {
      platinum = baseLoot.platinum;
    }
    platinum = Math.floor(platinum * multiplier / partySize);
  }

  // Generate magic items based on difficulty
  const magicItems = [];
  const itemChance = baseLoot.magicItems * multiplier;

  if (Math.random() < itemChance) {
    const itemPool = level >= 15 ? RARE_MAGIC_ITEMS : COMMON_MAGIC_ITEMS;
    const item = itemPool[Math.floor(Math.random() * itemPool.length)];
    if (item) {
      magicItems.push({
        ...item,
        id: crypto.randomUUID(),
      });
    }
  }

  // Occasionally add a second item for deadly encounters
  if (difficulty === 'Deadly' && Math.random() < 0.3) {
    const itemPool = RARE_MAGIC_ITEMS;
    const item = itemPool[Math.floor(Math.random() * itemPool.length)];
    if (item) {
      magicItems.push({
        ...item,
        id: crypto.randomUUID(),
      });
    }
  }

  return {
    gold,
    platinum,
    magicItems,
    totalValue: gold + (platinum * 10),
  };
}

/**
 * Generate a random treasure hoard for special encounters
 * @param {number} challengeRating - Monster CR
 * @returns {object} Treasure hoard
 */
export function generateTreasureHoard(challengeRating) {
  // Map CR to hoard category (DMG p135)
  let hoardValue;
  if (challengeRating <= 4) hoardValue = 100 * (1 + Math.random() * 2);
  else if (challengeRating <= 8) hoardValue = 1000 * (1 + Math.random() * 3);
  else if (challengeRating <= 12) hoardValue = 10000 * (1 + Math.random() * 2);
  else if (challengeRating <= 16) hoardValue = 50000 * (1 + Math.random() * 2);
  else hoardValue = 100000 * (1 + Math.random() * 3);

  // Split between coins and items
  const coinValue = Math.floor(hoardValue * 0.6);
  const itemValue = Math.floor(hoardValue * 0.4);

  const gold = Math.floor(coinValue * 0.7);
  const platinum = Math.floor(coinValue * 0.3 / 10);

  // Generate items by value
  const magicItems = [];
  let remainingValue = itemValue;

  while (remainingValue > 1000) {
    const rarityRoll = Math.random();
    let item;

    if (rarityRoll < 0.5) {
      item = COMMON_MAGIC_ITEMS[Math.floor(Math.random() * COMMON_MAGIC_ITEMS.length)];
    } else {
      item = RARE_MAGIC_ITEMS[Math.floor(Math.random() * RARE_MAGIC_ITEMS.length)];
    }

    if (item && remainingValue >= item.value) {
      magicItems.push({
        ...item,
        id: crypto.randomUUID(),
      });
      remainingValue -= item.value;
    } else {
      break;
    }
  }

  return {
    gold,
    platinum,
    magicItems,
    totalValue: gold + (platinum * 10),
    estimatedValue: hoardValue,
  };
}

/**
 * Get rarity color for UI display
 * @param {string} rarity - Item rarity
 * @returns {string} Hex color code
 */
export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS[ITEM_RARITY.COMMON];
}

/**
 * Get rarity display name
 * @param {string} rarity - Item rarity
 * @returns {string} Display name
 */
export function getRarityName(rarity) {
  const names = {
    [ITEM_RARITY.COMMON]: 'Common',
    [ITEM_RARITY.UNCOMMON]: 'Uncommon',
    [ITEM_RARITY.RARE]: 'Rare',
    [ITEM_RARITY.VERY_RARE]: 'Very Rare',
    [ITEM_RARITY.LEGENDARY]: 'Legendary',
    [ITEM_RARITY.ARTIFACT]: 'Artifact',
  };
  return names[rarity] || 'Unknown';
}
