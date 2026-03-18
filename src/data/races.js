// D&D 5e SRD Race Data
// All SRD races and subraces as separate entries

export const RACES = [
  // ─── Dwarf ───────────────────────────────────────────────────────────────
  {
    name: "Dwarf",
    baseName: "Dwarf",
    subrace: null,
    speed: 25,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Dwarvish"],
    statBonuses: { con: 2 },
    traits: [
      {
        name: "Dwarven Resilience",
        description: "You have advantage on saving throws against poison, and you have resistance against poison damage."
      },
      {
        name: "Dwarven Combat Training",
        description: "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer."
      },
      {
        name: "Tool Proficiency",
        description: "You gain proficiency with the artisan's tools of your choice: smith's tools, brewer's supplies, or mason's tools."
      },
      {
        name: "Stonecunning",
        description: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus."
      }
    ],
    description: "Bold and hardy, dwarves are known as skilled warriors, miners, and craftworkers of stone and metal."
  },
  {
    name: "Hill Dwarf",
    baseName: "Dwarf",
    subrace: "Hill",
    speed: 25,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Dwarvish"],
    statBonuses: { con: 2, wis: 1 },
    traits: [
      {
        name: "Dwarven Resilience",
        description: "You have advantage on saving throws against poison, and you have resistance against poison damage."
      },
      {
        name: "Dwarven Combat Training",
        description: "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer."
      },
      {
        name: "Tool Proficiency",
        description: "You gain proficiency with the artisan's tools of your choice: smith's tools, brewer's supplies, or mason's tools."
      },
      {
        name: "Stonecunning",
        description: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus."
      },
      {
        name: "Dwarven Toughness",
        description: "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level."
      }
    ],
    description: "Hill dwarves are perceptive and wise, known for their impressive resilience and keen insight."
  },
  {
    name: "Mountain Dwarf",
    baseName: "Dwarf",
    subrace: "Mountain",
    speed: 25,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Dwarvish"],
    statBonuses: { con: 2, str: 2 },
    traits: [
      {
        name: "Dwarven Resilience",
        description: "You have advantage on saving throws against poison, and you have resistance against poison damage."
      },
      {
        name: "Dwarven Combat Training",
        description: "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer."
      },
      {
        name: "Tool Proficiency",
        description: "You gain proficiency with the artisan's tools of your choice: smith's tools, brewer's supplies, or mason's tools."
      },
      {
        name: "Stonecunning",
        description: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus."
      },
      {
        name: "Dwarven Armor Training",
        description: "You have proficiency with light and medium armor."
      }
    ],
    description: "Mountain dwarves are strong and hardy, accustomed to a difficult life in rugged terrain."
  },

  // ─── Elf ─────────────────────────────────────────────────────────────────
  {
    name: "Elf",
    baseName: "Elf",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Elvish"],
    statBonuses: { dex: 2 },
    traits: [
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill."
      },
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
      },
      {
        name: "Trance",
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day (long rest). While meditating, you can dream after a fashion."
      }
    ],
    description: "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it."
  },
  {
    name: "High Elf",
    baseName: "Elf",
    subrace: "High",
    speed: 30,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Elvish", "One extra language of your choice"],
    statBonuses: { dex: 2, int: 1 },
    traits: [
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill."
      },
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
      },
      {
        name: "Trance",
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day (long rest)."
      },
      {
        name: "Elf Weapon Training",
        description: "You have proficiency with the longsword, shortsword, shortbow, and longbow."
      },
      {
        name: "Cantrip",
        description: "You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it."
      }
    ],
    description: "High elves have a keen mind and a mastery of at least the basics of magic."
  },
  {
    name: "Wood Elf",
    baseName: "Elf",
    subrace: "Wood",
    speed: 35,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Elvish"],
    statBonuses: { dex: 2, wis: 1 },
    traits: [
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill."
      },
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
      },
      {
        name: "Trance",
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day (long rest)."
      },
      {
        name: "Elf Weapon Training",
        description: "You have proficiency with the longsword, shortsword, shortbow, and longbow."
      },
      {
        name: "Fleet of Foot",
        description: "Your base walking speed increases to 35 feet."
      },
      {
        name: "Mask of the Wild",
        description: "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena."
      }
    ],
    description: "Wood elves are lithe, swift, and stealthy, dwelling in the primeval forests of the world."
  },
  {
    name: "Dark Elf (Drow)",
    baseName: "Elf",
    subrace: "Dark",
    speed: 30,
    size: "Medium",
    darkvision: 120,
    languages: ["Common", "Elvish"],
    statBonuses: { dex: 2, cha: 1 },
    traits: [
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception skill."
      },
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
      },
      {
        name: "Trance",
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day (long rest)."
      },
      {
        name: "Superior Darkvision",
        description: "Your darkvision has a radius of 120 feet."
      },
      {
        name: "Sunlight Sensitivity",
        description: "You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight."
      },
      {
        name: "Drow Magic",
        description: "You know the dancing lights cantrip. At 3rd level, you can cast faerie fire once per day. At 5th level, you can cast darkness once per day. Charisma is your spellcasting ability for these spells."
      },
      {
        name: "Drow Weapon Training",
        description: "You have proficiency with rapiers, shortswords, and hand crossbows."
      }
    ],
    description: "Descended from an earlier subrace of dark-skinned elves, the drow were banished from the surface world for following the goddess Lolth."
  },

  // ─── Halfling ─────────────────────────────────────────────────────────────
  {
    name: "Halfling",
    baseName: "Halfling",
    subrace: null,
    speed: 25,
    size: "Small",
    darkvision: 0,
    languages: ["Common", "Halfling"],
    statBonuses: { dex: 2 },
    traits: [
      {
        name: "Lucky",
        description: "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      },
      {
        name: "Brave",
        description: "You have advantage on saving throws against being frightened."
      },
      {
        name: "Halfling Nimbleness",
        description: "You can move through the space of any creature that is of a size larger than yours."
      }
    ],
    description: "The diminutive halflings survive in a world full of larger creatures by avoiding notice or, failing that, avoiding offense."
  },
  {
    name: "Lightfoot Halfling",
    baseName: "Halfling",
    subrace: "Lightfoot",
    speed: 25,
    size: "Small",
    darkvision: 0,
    languages: ["Common", "Halfling"],
    statBonuses: { dex: 2, cha: 1 },
    traits: [
      {
        name: "Lucky",
        description: "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      },
      {
        name: "Brave",
        description: "You have advantage on saving throws against being frightened."
      },
      {
        name: "Halfling Nimbleness",
        description: "You can move through the space of any creature that is of a size larger than yours."
      },
      {
        name: "Naturally Stealthy",
        description: "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you."
      }
    ],
    description: "Lightfoot halflings are easygoing, generally jovial, and hard to unsettle. They are gifted in passing unnoticed."
  },
  {
    name: "Stout Halfling",
    baseName: "Halfling",
    subrace: "Stout",
    speed: 25,
    size: "Small",
    darkvision: 0,
    languages: ["Common", "Halfling"],
    statBonuses: { dex: 2, con: 1 },
    traits: [
      {
        name: "Lucky",
        description: "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      },
      {
        name: "Brave",
        description: "You have advantage on saving throws against being frightened."
      },
      {
        name: "Halfling Nimbleness",
        description: "You can move through the space of any creature that is of a size larger than yours."
      },
      {
        name: "Stout Resilience",
        description: "You have advantage on saving throws against poison, and you have resistance against poison damage."
      }
    ],
    description: "Stout halflings are hardier than average and have some resistance to poison. Some say they have dwarf blood."
  },

  // ─── Human ────────────────────────────────────────────────────────────────
  {
    name: "Human",
    baseName: "Human",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 0,
    languages: ["Common", "One extra language of your choice"],
    statBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: [
      {
        name: "Extra Language",
        description: "You can speak, read, and write one extra language of your choice."
      }
    ],
    description: "Humans are the most adaptable and ambitious people among the common races. They have widely varying tastes, morals, and customs in the many different lands where they have settled."
  },

  // ─── Dragonborn ───────────────────────────────────────────────────────────
  {
    name: "Dragonborn",
    baseName: "Dragonborn",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 0,
    languages: ["Common", "Draconic"],
    statBonuses: { str: 2, cha: 1 },
    traits: [
      {
        name: "Draconic Ancestry",
        description: "You have draconic ancestry of a chosen dragon type, which determines your breath weapon damage type and damage resistance."
      },
      {
        name: "Breath Weapon",
        description: "You can use your action to exhale destructive energy. It deals 2d6 damage (save for half: Dex DC 8+CON+prof for line; Con for cone). At 6th level 3d6, at 11th 4d6, at 16th 5d6. Recharges on short or long rest."
      },
      {
        name: "Damage Resistance",
        description: "You have resistance to the damage type associated with your draconic ancestry."
      }
    ],
    description: "Born of dragons, as their name proclaims, the dragonborn walk proudly through a world that greets them with fearful incomprehension."
  },

  // ─── Gnome ────────────────────────────────────────────────────────────────
  {
    name: "Gnome",
    baseName: "Gnome",
    subrace: null,
    speed: 25,
    size: "Small",
    darkvision: 60,
    languages: ["Common", "Gnomish"],
    statBonuses: { int: 2 },
    traits: [
      {
        name: "Gnome Cunning",
        description: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."
      }
    ],
    description: "A gnome's energy and enthusiasm for living shines through every inch of his or her tiny body."
  },
  {
    name: "Forest Gnome",
    baseName: "Gnome",
    subrace: "Forest",
    speed: 25,
    size: "Small",
    darkvision: 60,
    languages: ["Common", "Gnomish"],
    statBonuses: { int: 2, dex: 1 },
    traits: [
      {
        name: "Gnome Cunning",
        description: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."
      },
      {
        name: "Natural Illusionist",
        description: "You know the minor illusion cantrip. Intelligence is your spellcasting ability for it."
      },
      {
        name: "Speak with Small Beasts",
        description: "Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts."
      }
    ],
    description: "Forest gnomes are small and secretive, living in the wild places of the world and rarely encountered by other races."
  },
  {
    name: "Rock Gnome",
    baseName: "Gnome",
    subrace: "Rock",
    speed: 25,
    size: "Small",
    darkvision: 60,
    languages: ["Common", "Gnomish"],
    statBonuses: { int: 2, con: 1 },
    traits: [
      {
        name: "Gnome Cunning",
        description: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."
      },
      {
        name: "Artificer's Lore",
        description: "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, add twice your proficiency bonus."
      },
      {
        name: "Tinker",
        description: "You have proficiency with artisan's tools (tinker's tools). Using them, you can construct a Tiny clockwork device over 1 hour using 10 gp of components."
      }
    ],
    description: "Rock gnomes are inventive tinkerers, fascinated by the workings of machines and magical contraptions."
  },

  // ─── Half-Elf ─────────────────────────────────────────────────────────────
  {
    name: "Half-Elf",
    baseName: "Half-Elf",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Elvish", "One extra language of your choice"],
    // +2 CHA plus +1 to any two other ability scores of your choice
    statBonuses: { cha: 2, _flexible: 2 },
    flexibleBonusCount: 2,
    traits: [
      {
        name: "Fey Ancestry",
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
      },
      {
        name: "Skill Versatility",
        description: "You gain proficiency in two skills of your choice."
      }
    ],
    description: "To many, half-elves seem to have gotten the best of both worlds: the beauty and grace of their elven heritage, the ambition and curiosity of their human side."
  },

  // ─── Half-Orc ─────────────────────────────────────────────────────────────
  {
    name: "Half-Orc",
    baseName: "Half-Orc",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Orc"],
    statBonuses: { str: 2, con: 1 },
    traits: [
      {
        name: "Menacing",
        description: "You gain proficiency in the Intimidation skill."
      },
      {
        name: "Relentless Endurance",
        description: "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest."
      },
      {
        name: "Savage Attacks",
        description: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit."
      }
    ],
    description: "Half-orcs stand apart from both their human and orc ancestors by virtue of their dual nature, and many embrace the hardships of their heritage."
  },

  // ─── Tiefling ─────────────────────────────────────────────────────────────
  {
    name: "Tiefling",
    baseName: "Tiefling",
    subrace: null,
    speed: 30,
    size: "Medium",
    darkvision: 60,
    languages: ["Common", "Infernal"],
    statBonuses: { int: 1, cha: 2 },
    traits: [
      {
        name: "Hellish Resistance",
        description: "You have resistance to fire damage."
      },
      {
        name: "Infernal Legacy",
        description: "You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke as a 2nd-level spell once per long rest. At 5th level, you can cast darkness once per long rest. Charisma is your spellcasting ability for these spells."
      }
    ],
    description: "To be greeted with stares and whispers, to suffer violence and insult on the street, to see mistrust and fear in every eye: this is the lot of the tiefling."
  }
];

// Helper: get race by name
export function getRace(name) {
  return RACES.find(r => r.name === name) ?? null;
}

// Helper: get all subraces for a base race
export function getSubraces(baseName) {
  return RACES.filter(r => r.baseName === baseName && r.subrace !== null);
}

// Helper: get base races only (no subraces)
export function getBaseRaces() {
  return RACES.filter(r => r.subrace === null);
}

// Helper: apply racial stat bonuses to a base stat block
// baseStats: { str, dex, con, int, wis, cha }
// flexibleChoices (for Half-Elf): array of stat keys to receive +1 each
export function applyRacialBonuses(baseStats, raceName, flexibleChoices = []) {
  const race = getRace(raceName);
  if (!race) return { ...baseStats };

  const result = { ...baseStats };
  const bonuses = { ...race.statBonuses };
  delete bonuses._flexible;

  for (const [stat, bonus] of Object.entries(bonuses)) {
    result[stat] = (result[stat] ?? 10) + bonus;
  }

  // Handle flexible bonuses (Half-Elf +1/+1)
  if (race.flexibleBonusCount && flexibleChoices.length > 0) {
    for (const stat of flexibleChoices.slice(0, race.flexibleBonusCount)) {
      result[stat] = (result[stat] ?? 10) + 1;
    }
  }

  return result;
}

// Ordered list for UI
export const RACE_NAMES = RACES.map(r => r.name);
