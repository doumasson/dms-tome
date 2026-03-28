/**
 * Random Encounter System — wandering monsters in dungeons/wilderness.
 * Encounters scale by area type (dungeon/wilderness/town) and party level.
 * May include environmental hazards for tactical challenge.
 */

import { determineEncounterHazards, describeHazard } from './environmentalHazards.js'
import { generateLoot } from './lootTables.js'

// Encounter tables by area type and level (monsters by CR)
const ENCOUNTER_TABLES = {
  dungeon: {
    1: ['Goblin', 'Rat', 'Skeleton', 'Cultist'],
    2: ['Goblin', 'Hobgoblin', 'Skeleton', 'Zombie', 'Cultist', 'Acolyte'],
    3: ['Hobgoblin', 'Ogre', 'Ghoul', 'Thug'],
    4: ['Ogre', 'Ghast', 'Bugbear', 'Knight'],
    5: ['Bugbear', 'Ogre Mage', 'Minotaur', 'Assassin'],
  },
  wilderness: {
    1: ['Goblin', 'Wolf', 'Giant Spider', 'Bandit'],
    2: ['Hobgoblin', 'Dire Wolf', 'Giant Spider', 'Bandit Captain'],
    3: ['Dire Wolf', 'Wyvern', 'Giant Ape', 'Bandit Captain'],
    4: ['Giant Ape', 'Young Dragon', 'Manticore', 'Werewolf'],
    5: ['Young Dragon', 'Manticore', 'Hydra', 'Werewolf'],
  },
  town: {
    1: ['Cultist', 'Thug', 'Spy'],
    2: ['Acolyte', 'Thug', 'Bandit', 'Knight'],
    3: ['Assassin', 'Knight', 'Mage'],
    4: ['Assassin', 'Mage', 'Veteran'],
    5: ['Veteran', 'Warlord', 'Mage'],
  },
};

// Monster stats (CR, HD, AC, typical attacks)
const MONSTER_STATS = {
  Goblin: { cr: 0.25, hd: 1, ac: 15, hp: 7, attacks: ['Scimitar'] },
  Rat: { cr: 0, hd: 1, ac: 10, hp: 1, attacks: ['Bite'] },
  Skeleton: { cr: 0.125, hd: 1, ac: 15, hp: 13, attacks: ['Shortsword'] },
  Cultist: { cr: 0.125, hd: 1, ac: 12, hp: 5, attacks: ['Dagger'] },
  Hobgoblin: { cr: 0.5, hd: 2, ac: 18, hp: 11, attacks: ['Longsword'] },
  Zombie: { cr: 0.25, hd: 1, ac: 8, hp: 22, attacks: ['Fist'] },
  Acolyte: { cr: 0.25, hd: 1, ac: 10, hp: 9, attacks: ['Mace'] },
  Ogre: { cr: 2, hd: 4, ac: 11, hp: 59, attacks: ['Greatclub'] },
  Ghoul: { cr: 1, hd: 3, ac: 12, hp: 22, attacks: ['Bite', 'Claws'] },
  Thug: { cr: 0.125, hd: 1, ac: 11, hp: 27, attacks: ['Mace'] },
  Ghast: { cr: 2, hd: 5, ac: 13, hp: 36, attacks: ['Bite', 'Claws'] },
  Bugbear: { cr: 1, hd: 3, ac: 15, hp: 27, attacks: ['Morningstar'] },
  Knight: { cr: 3, hd: 6, ac: 18, hp: 45, attacks: ['Longsword'] },
  'Ogre Mage': { cr: 3, hd: 6, ac: 15, hp: 59, attacks: ['Quarterstaff'] },
  Minotaur: { cr: 3, hd: 6, ac: 14, hp: 76, attacks: ['Greataxe'] },
  Assassin: { cr: 8, hd: 13, ac: 16, hp: 78, attacks: ['Shortsword'] },
  Wolf: { cr: 0.25, hd: 1, ac: 13, hp: 11, attacks: ['Bite'] },
  'Giant Spider': { cr: 0.25, hd: 1, ac: 14, hp: 10, attacks: ['Bite'] },
  Bandit: { cr: 0.125, hd: 1, ac: 12, hp: 16, attacks: ['Scimitar'] },
  'Dire Wolf': { cr: 1, hd: 3, ac: 13, hp: 37, attacks: ['Bite'] },
  Wyvern: { cr: 3, hd: 6, ac: 12, hp: 110, attacks: ['Sting', 'Bite'] },
  'Giant Ape': { cr: 7, hd: 14, ac: 12, hp: 157, attacks: ['Fist'] },
  'Bandit Captain': { cr: 2, hd: 4, ac: 16, hp: 65, attacks: ['Parry'] },
  'Young Dragon': { cr: 10, hd: 20, ac: 17, hp: 110, attacks: ['Bite', 'Claws'] },
  Manticore: { cr: 3, hd: 6, ac: 14, hp: 68, attacks: ['Bite', 'Claws'] },
  Werewolf: { cr: 3, hd: 6, ac: 12, hp: 110, attacks: ['Bite', 'Claws'] },
  Hydra: { cr: 8, hd: 16, ac: 15, hp: 172, attacks: ['Bite'] },
  Spy: { cr: 0.125, hd: 1, ac: 12, hp: 27, attacks: ['Dagger'] },
  Mage: { cr: 6, hd: 12, ac: 12, hp: 40, attacks: ['Dagger'] },
  Veteran: { cr: 3, hd: 6, ac: 17, hp: 27, attacks: ['Longsword'] },
  Warlord: { cr: 12, hd: 24, ac: 18, hp: 229, attacks: ['Longsword'] },
};

/**
 * Roll a d100 to check for random encounter.
 * Low chance per check — combined with region dedup + cooldown in the hook,
 * this means encounters happen roughly once every few minutes of exploration.
 * @param {string} areaType — 'dungeon', 'wilderness', or 'town'
 * @returns {boolean} true if encounter triggered
 */
export function rollRandomEncounter(areaType = 'dungeon') {
  const roll = Math.random() * 100;
  const threshold = areaType === 'dungeon' ? 5 : areaType === 'wilderness' ? 3 : 0;
  return roll <= threshold;
}

/**
 * Generate a random encounter group for the party.
 * @param {number} partyLevel — average party level (1-20)
 * @param {number} partySize — number of party members
 * @param {string} areaType — 'dungeon', 'wilderness', or 'town'
 * @returns {object} { enemies: [], dmPrompt, difficultyRating }
 */
export function generateRandomEncounter(partyLevel, partySize, areaType = 'dungeon') {
  const level = Math.max(1, Math.min(5, Math.ceil(partyLevel / 4)));
  const table = ENCOUNTER_TABLES[areaType] || ENCOUNTER_TABLES.dungeon;
  const monsterNames = table[level] || table[5];

  // Pick 1-4 monsters based on party size and level
  const count = Math.min(
    Math.ceil(Math.random() * (partySize + 1)),
    monsterNames.length
  );
  const selectedMonsters = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * monsterNames.length);
    selectedMonsters.push(monsterNames[idx]);
  }

  // Build encounter with positions
  const enemies = selectedMonsters.map((name, i) => {
    const stats = MONSTER_STATS[name] || MONSTER_STATS.Goblin;
    return {
      name: `${name} ${i + 1}`,
      originalName: name,
      hp: stats.hp || 10,
      ac: stats.ac || 10,
      speed: 30,
      cr: stats.cr || 0.25,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      attacks: stats.attacks || ['Attack'],
      startPosition: { x: 5 + i, y: 5 },
    };
  });

  // Calculate difficulty
  const totalCR = enemies.reduce((sum, e) => sum + (e.cr || 0.25), 0);
  const xpBudget = partySize * partyLevel * (10 + partyLevel);
  const difficultyRating =
    totalCR < xpBudget * 0.25
      ? 'Easy'
      : totalCR < xpBudget * 0.5
        ? 'Medium'
        : totalCR < xpBudget
          ? 'Hard'
          : 'Deadly';

  // Generate environmental hazards (30% chance, more common in deadly encounters)
  // Pass area type as biome to filter inappropriate hazards (no lava in forests)
  const hazardProbability = difficultyRating === 'Deadly' ? 0.5 : 0.3;
  const biomeMap = { dungeon: 'dungeon', wilderness: 'forest', town: 'village' }
  const hazards = determineEncounterHazards(hazardProbability, biomeMap[areaType] || areaType);
  const hazardDescriptions = hazards.map(h => describeHazard(h));

  // Generate loot based on difficulty and party level
  const loot = generateLoot(partyLevel, difficultyRating, partySize);

  return {
    enemies,
    hazards,
    loot,
    dmPrompt: `Random encounter: ${selectedMonsters.join(', ')} (${difficultyRating})${hazardDescriptions.length > 0 ? '\n' + hazardDescriptions.join('\n') : ''}`,
    difficultyRating,
  };
}

/**
 * Calculate loot for a random encounter (simpler than boss fights).
 * @deprecated Use generateLoot from lootTables.js instead for better scaling
 * @param {Array} enemies — encounter enemies
 * @param {number} partySize — number of party members
 * @returns {object} { gold, items }
 */
export function calculateRandomEncounterLoot(enemies, partySize = 4) {
  const totalCR = enemies.reduce((sum, e) => sum + (e.cr || 0.25), 0);
  const goldPerCR = 50 + Math.random() * 100;
  const gold = Math.round(totalCR * goldPerCR / partySize);

  // 20% chance of a minor item
  const hasItem = Math.random() < 0.2;
  const items = hasItem ? [{ name: 'Potion of Healing', quantity: 1 }] : [];

  return { gold, items };
}
