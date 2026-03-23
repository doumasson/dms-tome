import { v4 as uuidv4 } from 'uuid';
import lootTables from '../data/lootTables.json';
import magicItems from '../data/magicItems.json';
import { rollDamage } from './dice.js';

export function generateLoot(enemies, partySize) {
  const highestCr = Math.max(...enemies.map(e => parseFloat(e.cr || e.stats?.cr || 0)), 0);
  const tier =
    highestCr >= 17 ? 'cr17+' :
    highestCr >= 11 ? 'cr11-16' :
    highestCr >= 5  ? 'cr5-10' : 'cr0-4';
  const table = lootTables.individual[tier];

  // Gold — handle multiplication like "2d6*5"
  const parts = (table.gold || '2d6').split('*');
  const baseGold = rollDamage(parts[0]).total;
  const multiplier = parts[1] ? parseInt(parts[1]) : 1;
  const totalGold = baseGold * multiplier;
  const goldPerPlayer = Math.floor(totalGold / Math.max(1, partySize));

  // Magic items
  const items = [];
  if (Math.random() < (table.magicChance || 0)) {
    const rarity = weightedRarityPick(table.maxRarity);
    const candidates = magicItems.filter(i => i.rarity === rarity);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      items.push({ ...pick, instanceId: uuidv4() });
    }
  }

  return { totalGold, goldPerPlayer, items };
}

function weightedRarityPick(maxRarity) {
  const weights = lootTables.rarityWeights?.[maxRarity] || { common: 1 };
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[0][0];
}

export function isEligibleForItem(character, item) {
  if (!item.type || item.type === 'consumable' || item.type === 'wondrous') return true;
  if (item.type === 'armor') {
    const profs = (character.armorProficiencies || []).map(p => p.toLowerCase());
    const aType = (item.armorType || item.baseName || '').toLowerCase();
    return profs.some(p => aType.includes(p) || p === 'all');
  }
  if (item.type === 'weapon') {
    const profs = (character.weaponProficiencies || []).map(p => p.toLowerCase());
    const cat = (item.category || item.baseName || '').toLowerCase();
    return profs.some(
      p => cat.includes(p) || p === 'all' ||
        (p === 'simple' && cat.includes('simple')) ||
        (p === 'martial' && cat.includes('martial'))
    );
  }
  return true;
}
