import { calcHp, calcAc, buildAttacks, buildSpellSlots, buildFeatures, avatarUrl, profBonus } from './charBuilder';
import { getRace, applyRacialBonuses } from '../data/races';
import { CLASSES } from '../data/classes';
import { getStartingInventory, computeAcFromEquipped } from '../data/equipment';

export function generateDemoCharacter(userName) {
  const race = 'Human';
  const cls = 'Fighter';
  const raceData = getRace(race);
  const clsData = CLASSES[cls];
  const baseStats = { str: 15, dex: 14, con: 16, int: 10, wis: 12, cha: 10 };
  const finalStats = raceData ? applyRacialBonuses(baseStats, race, []) : baseStats;
  const hp = calcHp(clsData, finalStats.con);
  const ac = calcAc(clsData, finalStats.dex);
  const attacks = buildAttacks(cls, finalStats);
  const spellSlots = buildSpellSlots(cls, 1);
  const features = buildFeatures(cls, 1);
  const pb = profBonus(1);

  const starterItems = getStartingInventory();
  const allItems = starterItems.map(item => ({
    ...item,
    instanceId: item.instanceId || crypto.randomUUID()
  }));

  const equippedItems = {};
  const equippedInstanceIds = new Set();
  for (const item of allItems) {
    if (item.name?.includes('Longsword') && !equippedItems.mainHand) {
      equippedItems.mainHand = item;
      equippedInstanceIds.add(item.instanceId);
    } else if (item.name?.includes('Chain Mail') && !equippedItems.chest) {
      equippedItems.chest = item;
      equippedInstanceIds.add(item.instanceId);
    }
  }

  const unequippedItems = allItems.filter(i => !equippedInstanceIds.has(i.instanceId));
  const startingAc = Object.keys(equippedItems).length > 0
    ? computeAcFromEquipped(equippedItems, finalStats)
    : ac;

  return {
    id: crypto.randomUUID(),
    name: 'Demo Adventurer',
    class: cls,
    race,
    background: 'Soldier',
    alignment: 'Lawful Good',
    appearance: 'Grizzled veteran with battle scars',
    backstory: 'A seasoned warrior ready for adventure',
    level: 1,
    xp: 0,
    hp, maxHp: hp, currentHp: hp,
    ac: startingAc,
    speed: raceData?.speed || 30,
    stats: finalStats,
    skills: [],
    attacks,
    features,
    spellSlots,
    spells: [],
    equipment: clsData?.startingEquipment || [],
    inventory: unequippedItems,
    equippedItems,
    gold: 50,
    proficiencyBonus: pb,
    portrait: avatarUrl('Demo Adventurer', race, cls),
    userId: null,
    userName,
  };
}
