// ─── Class action definitions for combat ───────────────────────────────────
// Each entry describes what actions/bonus actions a class gets at a given level.
// Used to build the action panel dynamically in ActionPanel.jsx

export const CLASS_ACTIONS = {
  Fighter: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
      level >= 2 ? { id: 'action_surge', label: 'Action Surge', icon: '⚡', description: 'Take one additional action', type: 'resource', resource: 'Action Surge', rechargeOn: 'short' } : null,
    ].filter(Boolean),
    bonusActions: (level, char) => [
      { id: 'second_wind', label: 'Second Wind', icon: '💚', description: `Regain 1d10+${level} HP`, type: 'resource', resource: 'Second Wind', rechargeOn: 'short' },
    ],
  },

  Barbarian: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Reckless or normal attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'rage', label: 'Rage', icon: '🔥', description: 'Enter a rage for 1 minute', type: 'resource', resource: 'Rage', rechargeOn: 'long' },
      { id: 'reckless', label: 'Reckless Attack', icon: '💥', description: 'Advantage on attack, enemies have advantage against you', type: 'toggle' },
    ],
  },

  Rogue: {
    actions: (level) => [
      { id: 'attack', label: 'Attack (Sneak?)', icon: '🗡', description: 'Attack — Sneak Attack applies if conditions met', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'cunning_dash', label: 'Cunning: Dash', icon: '💨', description: 'Dash as a bonus action', type: 'special' },
      { id: 'cunning_disengage', label: 'Cunning: Disengage', icon: '🏃', description: 'Disengage as a bonus action', type: 'special' },
      { id: 'cunning_hide', label: 'Cunning: Hide', icon: '👁', description: 'Hide as a bonus action', type: 'special' },
    ],
  },

  Wizard: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: () => [
      { id: 'arcane_recovery', label: 'Arcane Recovery', icon: '🔮', description: 'Recover spell slots (once per long rest, on short rest)', type: 'resource', resource: 'Arcane Recovery', rechargeOn: 'long' },
    ],
  },

  Sorcerer: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
    ],
    bonusActions: (level) => [
      level >= 2 ? { id: 'metamagic', label: 'Metamagic', icon: '🌀', description: 'Modify a spell with sorcery points', type: 'resource', resource: 'Sorcery Points', rechargeOn: 'long' } : null,
    ].filter(Boolean),
  },

  Cleric: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'channel_divinity', label: 'Channel Divinity', icon: '☀', description: 'Turn Undead or domain ability', type: 'resource', resource: 'Channel Divinity', rechargeOn: 'short' },
    ],
  },

  Paladin: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell', type: 'spell' },
      { id: 'lay_on_hands', label: 'Lay on Hands', icon: '🖐', description: 'Restore HP from your pool (30 × level pts)', type: 'resource', resource: 'Lay on Hands', rechargeOn: 'long' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: (level) => [
      { id: 'divine_smite', label: 'Divine Smite', icon: '⚡', description: 'Expend spell slot on hit for extra radiant damage', type: 'spell_trigger' },
      { id: 'channel_divinity', label: 'Channel Divinity', icon: '☀', description: 'Sacred Weapon or divine domain ability', type: 'resource', resource: 'Channel Divinity', rechargeOn: 'short' },
    ],
  },

  Ranger: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '🏹', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a ranger spell', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: "hunters_mark", label: "Hunter's Mark", icon: '🎯', description: 'Mark a target — +1d6 damage on attacks vs it', type: 'spell', spellLevel: 1 },
    ],
  },

  Monk: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '👊', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make an unarmed or monk weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: (level, char) => {
      const ki = char?.resourcesUsed?.['Ki Points'] || 0;
      const kiMax = level >= 2 ? level : 0;
      return [
        level >= 2 ? { id: 'flurry', label: 'Flurry of Blows', icon: '👊👊', description: 'Spend 1 Ki: 2 unarmed strikes', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
        level >= 2 ? { id: 'patient_defense', label: 'Patient Defense', icon: '🛡', description: 'Spend 1 Ki: Dodge as bonus action', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
        level >= 2 ? { id: 'step_of_wind', label: 'Step of the Wind', icon: '💨', description: 'Spend 1 Ki: Dash or Disengage as bonus', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
      ].filter(Boolean);
    },
  },

  Bard: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a bard spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'bardic_inspiration', label: 'Bardic Inspiration', icon: '🎵', description: `Give ally a d${level < 5 ? 6 : level < 10 ? 8 : level < 15 ? 10 : 12} to add to a roll`, type: 'resource', resource: 'Bardic Inspiration', rechargeOn: level >= 5 ? 'short' : 'long' },
    ],
  },

  Druid: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '🌿', description: 'Cast a druid spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: (level) => [
      level >= 2 ? { id: 'wild_shape', label: 'Wild Shape', icon: '🐺', description: 'Transform into a beast (CR ≤ level/4)', type: 'resource', resource: 'Wild Shape', rechargeOn: 'short' } : null,
    ].filter(Boolean),
  },

  Warlock: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell (Pact Magic)', icon: '🌑', description: 'Cast using Pact Magic slots (recharge on short rest)', type: 'spell' },
      { id: 'eldritch_blast', label: 'Eldritch Blast', icon: '💜', description: `${Math.max(1, Math.ceil(level / 5))}d10 force damage, ranged spell attack`, type: 'cantrip' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: () => [
      { id: 'hex', label: 'Hex / Curse', icon: '🎭', description: 'Hex: bonus necrotic damage and disadvantage on ability checks', type: 'spell', spellLevel: 1 },
    ],
  },
};

// Fallback for unknown/generic class
export const GENERIC_ACTIONS = {
  actions: () => [
    { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
    { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
    { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
  ],
  bonusActions: () => [],
};
