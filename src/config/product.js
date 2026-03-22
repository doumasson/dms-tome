export const productConfig = {
  id: 'dms-tome',
  appName: "DM's Tome",
  marketingTagline: 'Rethemeable campaign runner for live tabletop sessions',
  gameplayTagline: 'Create or join campaigns, manage encounters, and run live sessions.',
  roles: {
    gameMasterShort: 'DM',
    gameMasterFull: 'Dungeon Master',
    narratorSpeaker: 'Dungeon Master',
  },
  system: {
    rulesetId: 'srd5e',
    rulesetName: '5e-compatible fantasy',
    contentPackId: 'core-fantasy-srd',
    contentPackName: 'Core Fantasy SRD',
    themeId: 'gilded-fantasy',
    themeName: 'Gilded Fantasy',
    promptSummary: '5e-compatible fantasy adventure',
  },
};

export function getDefaultCampaignMeta(overrides = {}) {
  return {
    schemaVersion: 1,
    productId: productConfig.id,
    productName: productConfig.appName,
    rulesetId: productConfig.system.rulesetId,
    rulesetName: productConfig.system.rulesetName,
    contentPackId: productConfig.system.contentPackId,
    contentPackName: productConfig.system.contentPackName,
    themeId: productConfig.system.themeId,
    themeName: productConfig.system.themeName,
    source: 'manual',
    ...overrides,
  };
}
