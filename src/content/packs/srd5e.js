import {
  LOOT_TABLES,
  MAGIC_ITEMS,
  MONSTERS,
  XP_THRESHOLDS,
  crForLevel,
  getMultiplier,
} from '../../data/monsters';

export const srd5eContentPack = {
  id: 'core-fantasy-srd',
  name: 'Core Fantasy SRD',
  rulesetId: 'srd5e',
  monsters: MONSTERS,
  xpThresholds: XP_THRESHOLDS,
  lootTables: LOOT_TABLES,
  magicItems: MAGIC_ITEMS,
  getMultiplier,
  crForLevel,
};
