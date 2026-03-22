// D&D 5e SRD Class Data
// All 12 classes with accurate 5e SRD mechanics

// Full caster spell slots by level [level1, level2, ..., level9]
const FULL_CASTER_SLOTS = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
};

// Half caster spell slots by level
const HALF_CASTER_SLOTS = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [2,0,0,0,0,0,0,0,0],
  3:  [3,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [4,2,0,0,0,0,0,0,0],
  6:  [4,2,0,0,0,0,0,0,0],
  7:  [4,3,0,0,0,0,0,0,0],
  8:  [4,3,0,0,0,0,0,0,0],
  9:  [4,3,2,0,0,0,0,0,0],
  10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0],
  12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0],
  14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,2,0,0,0,0,0],
  16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0],
  18: [4,3,3,3,1,0,0,0,0],
  19: [4,3,3,3,2,0,0,0,0],
  20: [4,3,3,3,2,0,0,0,0],
};

// Warlock pact magic slots (always highest available slot, recharge on short rest)
const WARLOCK_SLOTS = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

export const CLASSES = {
  Fighter: {
    name: "Fighter",
    hitDie: 10,
    primaryAbility: "STR or DEX",
    savingThrows: ["STR", "CON"],
    armorProficiencies: ["Light", "Medium", "Heavy", "Shields"],
    weaponProficiencies: ["Simple", "Martial"],
    toolProficiencies: [],
    skillChoices: [
      "Acrobatics", "Animal Handling", "Athletics", "History",
      "Insight", "Intimidation", "Perception", "Survival"
    ],
    skillCount: 2,
    castingType: null,
    spellAbility: null,
    startingEquipment: [
      "(a) chain mail or (b) leather armor, longbow, and 20 arrows",
      "(a) a martial weapon and a shield or (b) two martial weapons",
      "(a) a light crossbow and 20 bolts or (b) two handaxes",
      "(a) a dungeoneer's pack or (b) an explorer's pack"
    ],
    features: {
      1:  ["Fighting Style", "Second Wind"],
      2:  ["Action Surge (×1)"],
      3:  ["Martial Archetype"],
      4:  ["Ability Score Improvement"],
      5:  ["Extra Attack (×2)"],
      6:  ["Ability Score Improvement"],
      7:  ["Martial Archetype Feature"],
      8:  ["Ability Score Improvement"],
      9:  ["Indomitable (×1)"],
      10: ["Martial Archetype Feature"],
      11: ["Extra Attack (×3)"],
      12: ["Ability Score Improvement"],
      13: ["Indomitable (×2)"],
      14: ["Ability Score Improvement"],
      15: ["Martial Archetype Feature"],
      16: ["Ability Score Improvement"],
      17: ["Action Surge (×2)", "Indomitable (×3)"],
      18: ["Martial Archetype Feature"],
      19: ["Ability Score Improvement"],
      20: ["Extra Attack (×4)"]
    },
    resources: {
      "Second Wind": {
        maxFormula: "1",
        recharge: "short",
        actionType: "bonus_action",
        description: "Regain 1d10 + Fighter level HP"
      },
      "Action Surge": {
        maxFormula: "level >= 17 ? 2 : 1",
        recharge: "short",
        actionType: "action",
        description: "Take one additional action on your turn"
      },
      "Indomitable": {
        maxFormula: "level >= 17 ? 3 : level >= 13 ? 2 : 1",
        recharge: "long",
        actionType: "reaction",
        description: "Reroll a saving throw (must use before or after the result, your choice)"
      }
    },
    spellSlots: null,
    extraAttacks: { 5: 2, 11: 3, 20: 4 },
    primaryStats: ['str'],
    secondaryStats: ['con']
  },

  Barbarian: {
    name: "Barbarian",
    hitDie: 12,
    primaryAbility: "STR",
    savingThrows: ["STR", "CON"],
    armorProficiencies: ["Light", "Medium", "Shields"],
    weaponProficiencies: ["Simple", "Martial"],
    toolProficiencies: [],
    skillChoices: [
      "Animal Handling", "Athletics", "Intimidation",
      "Nature", "Perception", "Survival"
    ],
    skillCount: 2,
    castingType: null,
    spellAbility: null,
    startingEquipment: [
      "(a) a greataxe or (b) any martial melee weapon",
      "(a) two handaxes or (b) any simple weapon",
      "An explorer's pack and four javelins"
    ],
    features: {
      1:  ["Rage", "Unarmored Defense"],
      2:  ["Reckless Attack", "Danger Sense"],
      3:  ["Primal Path"],
      4:  ["Ability Score Improvement"],
      5:  ["Extra Attack", "Fast Movement"],
      6:  ["Path Feature"],
      7:  ["Feral Instinct"],
      8:  ["Ability Score Improvement"],
      9:  ["Brutal Critical (×1)"],
      10: ["Path Feature"],
      11: ["Relentless Rage"],
      12: ["Ability Score Improvement"],
      13: ["Brutal Critical (×2)"],
      14: ["Path Feature"],
      15: ["Persistent Rage"],
      16: ["Ability Score Improvement"],
      17: ["Brutal Critical (×3)"],
      18: ["Indomitable Might"],
      19: ["Ability Score Improvement"],
      20: ["Primal Champion"]
    },
    resources: {
      "Rage": {
        maxFormula: "level >= 20 ? Infinity : level >= 17 ? 6 : level >= 15 ? 5 : level >= 12 ? 4 : level >= 6 ? 3 : 2",
        recharge: "long",
        actionType: "bonus_action",
        description: "Enter a rage granting bonus damage, advantage on STR checks/saves, and resistance to bludgeoning/piercing/slashing damage. Lasts 1 minute."
      }
    },
    spellSlots: null,
    extraAttacks: { 5: 2 },
    specialDefense: {
      "Unarmored Defense": "AC = 10 + DEX modifier + CON modifier (when not wearing armor)"
    },
    rageDamageBonus: { 1: 2, 9: 3, 16: 4 },
    primaryStats: ['str'],
    secondaryStats: ['con']
  },

  Rogue: {
    name: "Rogue",
    hitDie: 8,
    primaryAbility: "DEX",
    savingThrows: ["DEX", "INT"],
    armorProficiencies: ["Light"],
    weaponProficiencies: ["Simple", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Thieves' Tools"],
    skillChoices: [
      "Acrobatics", "Athletics", "Deception", "Insight",
      "Intimidation", "Investigation", "Perception", "Performance",
      "Persuasion", "Sleight of Hand", "Stealth"
    ],
    skillCount: 4,
    castingType: null,
    spellAbility: null,
    startingEquipment: [
      "(a) a rapier or (b) a shortsword",
      "(a) a shortbow and quiver of 20 arrows or (b) a shortsword",
      "(a) a burglar's pack, (b) a dungeoneer's pack, or (c) an explorer's pack",
      "Leather armor, two daggers, and thieves' tools"
    ],
    features: {
      1:  ["Expertise (×2 skills)", "Sneak Attack", "Thieves' Cant"],
      2:  ["Cunning Action"],
      3:  ["Roguish Archetype"],
      4:  ["Ability Score Improvement"],
      5:  ["Uncanny Dodge"],
      6:  ["Expertise (×2 more skills)"],
      7:  ["Evasion"],
      8:  ["Ability Score Improvement"],
      9:  ["Roguish Archetype Feature"],
      10: ["Ability Score Improvement"],
      11: ["Reliable Talent"],
      12: ["Ability Score Improvement"],
      13: ["Roguish Archetype Feature"],
      14: ["Blindsense"],
      15: ["Slippery Mind"],
      16: ["Ability Score Improvement"],
      17: ["Roguish Archetype Feature"],
      18: ["Elusive"],
      19: ["Ability Score Improvement"],
      20: ["Stroke of Luck"]
    },
    resources: {
      "Cunning Action": {
        maxFormula: "1",
        recharge: "turn",
        actionType: "bonus_action",
        description: "Dash, Disengage, or Hide as a bonus action"
      },
      "Uncanny Dodge": {
        maxFormula: "1",
        recharge: "turn",
        actionType: "reaction",
        description: "When an attacker you can see hits you, halve the attack's damage (available at level 5)"
      }
    },
    spellSlots: null,
    extraAttacks: {},
    // Sneak Attack dice by level
    sneakAttackDice: {
      1: "1d6",  2: "1d6",  3: "2d6",  4: "2d6",  5: "3d6",
      6: "3d6",  7: "4d6",  8: "4d6",  9: "5d6", 10: "5d6",
      11: "6d6", 12: "6d6", 13: "7d6", 14: "7d6", 15: "8d6",
      16: "8d6", 17: "9d6", 18: "9d6", 19: "10d6", 20: "10d6"
    },
    primaryStats: ['dex'],
    secondaryStats: ['con', 'int']
  },

  Wizard: {
    name: "Wizard",
    hitDie: 6,
    primaryAbility: "INT",
    savingThrows: ["INT", "WIS"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    toolProficiencies: [],
    skillChoices: [
      "Arcana", "History", "Insight", "Investigation",
      "Medicine", "Religion"
    ],
    skillCount: 2,
    castingType: "full",
    spellAbility: "INT",
    startingEquipment: [
      "(a) a quarterstaff or (b) a dagger",
      "(a) a component pouch or (b) an arcane focus",
      "(a) a scholar's pack or (b) an explorer's pack",
      "A spellbook"
    ],
    features: {
      1:  ["Spellcasting", "Arcane Recovery"],
      2:  ["Arcane Tradition"],
      3:  [],
      4:  ["Ability Score Improvement"],
      5:  [],
      6:  ["Arcane Tradition Feature"],
      7:  [],
      8:  ["Ability Score Improvement"],
      9:  [],
      10: ["Arcane Tradition Feature"],
      11: [],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Arcane Tradition Feature"],
      15: [],
      16: ["Ability Score Improvement"],
      17: [],
      18: ["Spell Mastery"],
      19: ["Ability Score Improvement"],
      20: ["Signature Spells"]
    },
    resources: {
      "Arcane Recovery": {
        maxFormula: "1",
        recharge: "long",
        actionType: "action",
        description: "Recover spell slots totaling up to half Wizard level (rounded up) during a short rest. Cannot recover 6th level or higher slots."
      }
    },
    spellSlots: FULL_CASTER_SLOTS,
    extraAttacks: {},
    primaryStats: ['int'],
    secondaryStats: ['con']
  },

  Sorcerer: {
    name: "Sorcerer",
    hitDie: 6,
    primaryAbility: "CHA",
    savingThrows: ["CON", "CHA"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    toolProficiencies: [],
    skillChoices: [
      "Arcana", "Deception", "Insight", "Intimidation",
      "Persuasion", "Religion"
    ],
    skillCount: 2,
    castingType: "full",
    spellAbility: "CHA",
    startingEquipment: [
      "(a) a light crossbow and 20 bolts or (b) any simple weapon",
      "(a) a component pouch or (b) an arcane focus",
      "(a) a dungeoneer's pack or (b) an explorer's pack",
      "Two daggers"
    ],
    features: {
      1:  ["Spellcasting", "Sorcerous Origin"],
      2:  ["Font of Magic"],
      3:  ["Metamagic (×2)"],
      4:  ["Ability Score Improvement"],
      5:  [],
      6:  ["Sorcerous Origin Feature"],
      7:  [],
      8:  ["Ability Score Improvement"],
      9:  [],
      10: ["Metamagic (×3)"],
      11: [],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Sorcerous Origin Feature"],
      15: [],
      16: ["Ability Score Improvement"],
      17: ["Metamagic (×4)"],
      18: ["Sorcerous Origin Feature"],
      19: ["Ability Score Improvement"],
      20: ["Sorcerous Restoration"]
    },
    resources: {
      "Sorcery Points": {
        maxFormula: "level",
        recharge: "long",
        actionType: "bonus_action",
        description: "Flexible resource to create spell slots or fuel Metamagic options. Convert spell slots to Sorcery Points (Flexible Casting)."
      }
    },
    spellSlots: FULL_CASTER_SLOTS,
    extraAttacks: {},
    // Sorcery points equal to Sorcerer level starting at level 2
    sorceryPoints: "level >= 2 ? level : 0",
    primaryStats: ['cha'],
    secondaryStats: ['con']
  },

  Cleric: {
    name: "Cleric",
    hitDie: 8,
    primaryAbility: "WIS",
    savingThrows: ["WIS", "CHA"],
    armorProficiencies: ["Light", "Medium", "Shields"],
    weaponProficiencies: ["Simple"],
    toolProficiencies: [],
    skillChoices: [
      "History", "Insight", "Medicine", "Persuasion", "Religion"
    ],
    skillCount: 2,
    castingType: "full",
    spellAbility: "WIS",
    startingEquipment: [
      "(a) a mace or (b) a warhammer",
      "(a) scale mail, (b) leather armor, or (c) chain mail",
      "(a) a light crossbow and 20 bolts or (b) any simple weapon",
      "(a) a priest's pack or (b) an explorer's pack",
      "A shield and a holy symbol"
    ],
    features: {
      1:  ["Spellcasting", "Divine Domain"],
      2:  ["Channel Divinity (×1)", "Divine Domain Feature"],
      3:  [],
      4:  ["Ability Score Improvement"],
      5:  ["Destroy Undead (CR 1/2)"],
      6:  ["Channel Divinity (×2)", "Divine Domain Feature"],
      7:  [],
      8:  ["Ability Score Improvement", "Destroy Undead (CR 1)", "Divine Domain Feature"],
      9:  [],
      10: ["Divine Intervention"],
      11: ["Destroy Undead (CR 2)"],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Destroy Undead (CR 3)"],
      15: [],
      16: ["Ability Score Improvement"],
      17: ["Destroy Undead (CR 4)", "Divine Domain Feature"],
      18: ["Channel Divinity (×3)"],
      19: ["Ability Score Improvement"],
      20: ["Divine Intervention Improvement"]
    },
    resources: {
      "Channel Divinity": {
        maxFormula: "level >= 18 ? 3 : level >= 6 ? 2 : 1",
        recharge: "short",
        actionType: "action",
        description: "Channel divine energy for domain-specific effects. Turn Undead is available to all Clerics."
      }
    },
    spellSlots: FULL_CASTER_SLOTS,
    extraAttacks: {},
    primaryStats: ['wis'],
    secondaryStats: ['str', 'con']
  },

  Paladin: {
    name: "Paladin",
    hitDie: 10,
    primaryAbility: "STR and CHA",
    savingThrows: ["WIS", "CHA"],
    armorProficiencies: ["Light", "Medium", "Heavy", "Shields"],
    weaponProficiencies: ["Simple", "Martial"],
    toolProficiencies: [],
    skillChoices: [
      "Athletics", "Insight", "Intimidation",
      "Medicine", "Persuasion", "Religion"
    ],
    skillCount: 2,
    castingType: "half",
    spellAbility: "CHA",
    startingEquipment: [
      "(a) a martial weapon and a shield or (b) two martial weapons",
      "(a) five javelins or (b) any simple melee weapon",
      "(a) a priest's pack or (b) an explorer's pack",
      "Chain mail and a holy symbol"
    ],
    features: {
      1:  ["Divine Sense", "Lay on Hands"],
      2:  ["Fighting Style", "Spellcasting", "Divine Smite"],
      3:  ["Divine Health", "Sacred Oath"],
      4:  ["Ability Score Improvement"],
      5:  ["Extra Attack"],
      6:  ["Aura of Protection"],
      7:  ["Sacred Oath Feature"],
      8:  ["Ability Score Improvement"],
      9:  [],
      10: ["Aura of Courage"],
      11: ["Improved Divine Smite"],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Cleansing Touch"],
      15: ["Sacred Oath Feature"],
      16: ["Ability Score Improvement"],
      17: [],
      18: ["Aura Improvements"],
      19: ["Ability Score Improvement"],
      20: ["Sacred Oath Feature"]
    },
    resources: {
      "Lay on Hands": {
        maxFormula: "level * 5",
        recharge: "long",
        actionType: "action",
        description: "Heal a creature for any number of HP from your pool (5 × Paladin level). Spend 5 HP to cure disease or poison instead."
      },
      "Divine Sense": {
        maxFormula: "1 + CHA modifier",
        recharge: "long",
        actionType: "action",
        description: "Until the end of your next turn, know the location of celestials, fiends, and undead within 60 ft."
      },
      "Channel Divinity": {
        maxFormula: "1",
        recharge: "short",
        actionType: "action",
        description: "Channel divine energy for Sacred Oath effects."
      }
    },
    spellSlots: HALF_CASTER_SLOTS,
    extraAttacks: { 5: 2 },
    primaryStats: ['str', 'cha'],
    secondaryStats: ['con']
  },

  Ranger: {
    name: "Ranger",
    hitDie: 10,
    primaryAbility: "DEX and WIS",
    savingThrows: ["STR", "DEX"],
    armorProficiencies: ["Light", "Medium", "Shields"],
    weaponProficiencies: ["Simple", "Martial"],
    toolProficiencies: [],
    skillChoices: [
      "Animal Handling", "Athletics", "Insight", "Investigation",
      "Nature", "Perception", "Stealth", "Survival"
    ],
    skillCount: 3,
    castingType: "half",
    spellAbility: "WIS",
    startingEquipment: [
      "(a) scale mail or (b) leather armor",
      "(a) two shortswords or (b) two simple melee weapons",
      "(a) a dungeoneer's pack or (b) an explorer's pack",
      "A longbow and a quiver of 20 arrows"
    ],
    features: {
      1:  ["Favored Enemy", "Natural Explorer"],
      2:  ["Fighting Style", "Spellcasting"],
      3:  ["Ranger Archetype", "Primeval Awareness"],
      4:  ["Ability Score Improvement"],
      5:  ["Extra Attack"],
      6:  ["Favored Enemy Improvement", "Natural Explorer Improvement"],
      7:  ["Ranger Archetype Feature"],
      8:  ["Ability Score Improvement", "Land's Stride"],
      9:  [],
      10: ["Natural Explorer Improvement", "Hide in Plain Sight"],
      11: ["Ranger Archetype Feature"],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Favored Enemy Improvement", "Vanish"],
      15: ["Ranger Archetype Feature"],
      16: ["Ability Score Improvement"],
      17: [],
      18: ["Feral Senses"],
      19: ["Ability Score Improvement"],
      20: ["Foe Slayer"]
    },
    resources: {
      "Hunter's Mark": {
        maxFormula: "Infinity",
        recharge: "spell_slot",
        actionType: "bonus_action",
        description: "Mark a creature as your quarry. Deal 1d6 extra damage to it on weapon attacks and have advantage on Perception/Survival checks to find it."
      }
    },
    spellSlots: HALF_CASTER_SLOTS,
    extraAttacks: { 5: 2 },
    primaryStats: ['dex'],
    secondaryStats: ['wis']
  },

  Monk: {
    name: "Monk",
    hitDie: 8,
    primaryAbility: "DEX and WIS",
    savingThrows: ["STR", "DEX"],
    armorProficiencies: [],
    weaponProficiencies: ["Simple", "Shortswords"],
    toolProficiencies: ["One artisan's tool or musical instrument"],
    skillChoices: [
      "Acrobatics", "Athletics", "History", "Insight",
      "Religion", "Stealth"
    ],
    skillCount: 2,
    castingType: null,
    spellAbility: null,
    startingEquipment: [
      "(a) a shortsword or (b) any simple weapon",
      "(a) a dungeoneer's pack or (b) an explorer's pack",
      "10 darts"
    ],
    features: {
      1:  ["Unarmored Defense", "Martial Arts"],
      2:  ["Ki", "Unarmored Movement"],
      3:  ["Monastic Tradition", "Deflect Missiles"],
      4:  ["Ability Score Improvement", "Slow Fall"],
      5:  ["Extra Attack", "Stunning Strike"],
      6:  ["Ki-Empowered Strikes", "Monastic Tradition Feature"],
      7:  ["Evasion", "Stillness of Mind"],
      8:  ["Ability Score Improvement"],
      9:  ["Unarmored Movement Improvement"],
      10: ["Purity of Body"],
      11: ["Monastic Tradition Feature"],
      12: ["Ability Score Improvement"],
      13: ["Tongue of the Sun and Moon"],
      14: ["Diamond Soul"],
      15: ["Timeless Body"],
      16: ["Ability Score Improvement"],
      17: ["Monastic Tradition Feature"],
      18: ["Empty Body"],
      19: ["Ability Score Improvement"],
      20: ["Perfect Self"]
    },
    resources: {
      "Ki": {
        maxFormula: "level",
        recharge: "short",
        actionType: "bonus_action",
        description: "Spend Ki points to fuel special Monk abilities: Flurry of Blows, Patient Defense, Step of the Wind, and Stunning Strike."
      },
      "Stunning Strike": {
        maxFormula: "Infinity",
        recharge: "turn",
        actionType: "free",
        description: "Spend 1 Ki point after hitting with a melee weapon attack. Target must succeed on a CON save (DC = 8 + proficiency + WIS modifier) or be stunned until end of your next turn."
      }
    },
    spellSlots: null,
    extraAttacks: { 5: 2 },
    specialDefense: {
      "Unarmored Defense": "AC = 10 + DEX modifier + WIS modifier (when not wearing armor)"
    },
    // Martial Arts die by level
    martialArtsDie: {
      1: "1d4",  5: "1d6",  11: "1d8",  17: "1d10"
    },
    // Ki points equal to Monk level
    kiPoints: "level",
    primaryStats: ['dex', 'wis'],
    secondaryStats: ['con']
  },

  Bard: {
    name: "Bard",
    hitDie: 8,
    primaryAbility: "CHA",
    savingThrows: ["DEX", "CHA"],
    armorProficiencies: ["Light"],
    weaponProficiencies: ["Simple", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
    toolProficiencies: ["Three musical instruments"],
    skillChoices: [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics",
      "Deception", "History", "Insight", "Intimidation",
      "Investigation", "Medicine", "Nature", "Perception",
      "Performance", "Persuasion", "Religion", "Sleight of Hand",
      "Stealth", "Survival"
    ],
    skillCount: 3,
    castingType: "full",
    spellAbility: "CHA",
    startingEquipment: [
      "(a) a rapier, (b) a longsword, or (c) any simple weapon",
      "(a) a diplomat's pack or (b) an entertainer's pack",
      "(a) a lute or (b) any other musical instrument",
      "Leather armor and a dagger"
    ],
    features: {
      1:  ["Spellcasting", "Bardic Inspiration (d6)"],
      2:  ["Jack of All Trades", "Song of Rest (d6)"],
      3:  ["Bard College", "Expertise (×2)"],
      4:  ["Ability Score Improvement"],
      5:  ["Bardic Inspiration (d8)", "Font of Inspiration"],
      6:  ["Countercharm", "Bard College Feature"],
      7:  [],
      8:  ["Ability Score Improvement"],
      9:  ["Song of Rest (d8)"],
      10: ["Bardic Inspiration (d10)", "Expertise (×2 more)", "Magical Secrets (×2)"],
      11: [],
      12: ["Ability Score Improvement"],
      13: ["Song of Rest (d10)"],
      14: ["Magical Secrets (×2 more)", "Bard College Feature"],
      15: ["Bardic Inspiration (d12)"],
      16: ["Ability Score Improvement"],
      17: ["Song of Rest (d12)"],
      18: ["Magical Secrets (×2 more)"],
      19: ["Ability Score Improvement"],
      20: ["Superior Inspiration"]
    },
    resources: {
      "Bardic Inspiration": {
        maxFormula: "Math.max(1, chaMod)",
        recharge: "long",
        actionType: "bonus_action",
        description: "Give one creature within 60 ft a Bardic Inspiration die (d6 at lvl 1, d8 at 5, d10 at 10, d12 at 15). They can add it to an ability check, attack roll, or saving throw within 10 minutes."
      }
    },
    spellSlots: FULL_CASTER_SLOTS,
    extraAttacks: {},
    // Bardic Inspiration die by level
    bardicInspirationDie: {
      1: "d6",  5: "d8",  10: "d10",  15: "d12"
    },
    primaryStats: ['cha'],
    secondaryStats: ['dex']
  },

  Druid: {
    name: "Druid",
    hitDie: 8,
    primaryAbility: "WIS",
    savingThrows: ["INT", "WIS"],
    armorProficiencies: ["Light (non-metal)", "Medium (non-metal)", "Shields (non-metal)"],
    weaponProficiencies: [
      "Clubs", "Daggers", "Darts", "Javelins", "Maces",
      "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"
    ],
    toolProficiencies: ["Herbalism Kit"],
    skillChoices: [
      "Arcana", "Animal Handling", "Insight", "Medicine",
      "Nature", "Perception", "Religion", "Survival"
    ],
    skillCount: 2,
    castingType: "full",
    spellAbility: "WIS",
    startingEquipment: [
      "(a) a wooden shield or (b) any simple weapon",
      "(a) a scimitar or (b) any simple melee weapon",
      "Leather armor, an explorer's pack, and a druidic focus"
    ],
    features: {
      1:  ["Druidic", "Spellcasting"],
      2:  ["Wild Shape (×2)", "Druid Circle"],
      3:  [],
      4:  ["Wild Shape Improvement", "Ability Score Improvement"],
      5:  [],
      6:  ["Druid Circle Feature"],
      7:  [],
      8:  ["Wild Shape Improvement", "Ability Score Improvement"],
      9:  [],
      10: ["Druid Circle Feature"],
      11: [],
      12: ["Ability Score Improvement"],
      13: [],
      14: ["Druid Circle Feature"],
      15: [],
      16: ["Ability Score Improvement"],
      17: [],
      18: ["Timeless Body", "Beast Spells"],
      19: ["Ability Score Improvement"],
      20: ["Archdruid"]
    },
    resources: {
      "Wild Shape": {
        maxFormula: "2",
        recharge: "short",
        actionType: "action",
        description: "Magically assume the shape of a beast you have seen. CR limit: 1/4 (no fly/swim) at lvl 2, 1/2 (no fly) at lvl 4, 1 at lvl 8. Lasts up to half Druid level hours."
      }
    },
    spellSlots: FULL_CASTER_SLOTS,
    extraAttacks: {},
    primaryStats: ['wis'],
    secondaryStats: ['con']
  },

  Warlock: {
    name: "Warlock",
    hitDie: 8,
    primaryAbility: "CHA",
    savingThrows: ["WIS", "CHA"],
    armorProficiencies: ["Light"],
    weaponProficiencies: ["Simple"],
    toolProficiencies: [],
    skillChoices: [
      "Arcana", "Deception", "History", "Intimidation",
      "Investigation", "Nature", "Religion"
    ],
    skillCount: 2,
    castingType: "warlock",
    spellAbility: "CHA",
    startingEquipment: [
      "(a) a light crossbow and 20 bolts or (b) any simple weapon",
      "(a) a component pouch or (b) an arcane focus",
      "(a) a scholar's pack or (b) a dungeoneer's pack",
      "Leather armor, any simple weapon, and two daggers"
    ],
    features: {
      1:  ["Otherworldly Patron", "Pact Magic"],
      2:  ["Eldritch Invocations (×2)"],
      3:  ["Pact Boon"],
      4:  ["Ability Score Improvement"],
      5:  ["Eldritch Invocations (×3)"],
      6:  ["Otherworldly Patron Feature"],
      7:  ["Eldritch Invocations (×4)"],
      8:  ["Ability Score Improvement"],
      9:  ["Eldritch Invocations (×5)"],
      10: ["Otherworldly Patron Feature"],
      11: ["Mystic Arcanum (6th level)", "Eldritch Invocations (×5)"],
      12: ["Ability Score Improvement"],
      13: ["Mystic Arcanum (7th level)"],
      14: ["Otherworldly Patron Feature"],
      15: ["Mystic Arcanum (8th level)"],
      16: ["Ability Score Improvement"],
      17: ["Mystic Arcanum (9th level)"],
      18: ["Eldritch Invocations (×6)"],
      19: ["Ability Score Improvement"],
      20: ["Eldritch Master"]
    },
    resources: {
      "Eldritch Blast": {
        maxFormula: "Infinity",
        recharge: "at_will",
        actionType: "action",
        description: "Cantrip: hurl a beam of crackling energy (1d10 force). Extra beams at levels 5, 11, 17."
      },
      "Eldritch Master": {
        maxFormula: "1",
        recharge: "long",
        actionType: "action",
        description: "Spend 1 minute entreating your patron to regain all Pact Magic spell slots."
      }
    },
    // Pact magic: short-rest recharge, always highest available slot level
    spellSlots: null,
    pactMagic: WARLOCK_SLOTS,
    extraAttacks: {},
    primaryStats: ['cha'],
    secondaryStats: ['con']
  }
};

// Helper: get spell slots for a class at a given level
export function getSpellSlots(className, level) {
  const cls = CLASSES[className];
  if (!cls) return null;
  if (cls.castingType === "warlock") {
    return cls.pactMagic?.[level] ?? null;
  }
  if (cls.spellSlots) {
    return cls.spellSlots[level] ?? null;
  }
  return null;
}

// Helper: get extra attack count for a class at a given level
export function getExtraAttacks(className, level) {
  const cls = CLASSES[className];
  if (!cls || !cls.extraAttacks) return 1;
  let attacks = 1;
  for (const [lvl, count] of Object.entries(cls.extraAttacks)) {
    if (level >= Number(lvl)) attacks = count;
  }
  return attacks;
}

// Helper: get all features for a class up through a given level
export function getFeaturesUpToLevel(className, level) {
  const cls = CLASSES[className];
  if (!cls) return [];
  const features = [];
  for (let l = 1; l <= level; l++) {
    if (cls.features[l]) {
      features.push(...cls.features[l]);
    }
  }
  return features;
}

// Ordered list for UI
export const CLASS_NAMES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter",
  "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer",
  "Warlock", "Wizard"
];
