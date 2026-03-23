export const productConfig = {
  id: 'dms-tome',
  appName: 'DungeonMind',
  marketingTagline: 'AI-powered fantasy RPG for multiplayer campaigns',
  gameplayTagline: 'Create or join campaigns, manage encounters, and play live sessions.',
  roles: {
    gameMasterShort: 'Host',
    gameMasterFull: 'The Narrator',
    narratorSpeaker: 'The Narrator',
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
