// SRD 5.1 Monster Database
// Each monster includes: name, cr, xp, hp, ac, speed, attacks[], specialAbilities[], type, size

export const MONSTERS = [
  // ─── CR 0 ───
  {
    name: "Commoner",
    cr: 0, xp: 10, size: "Medium", type: "humanoid",
    hp: 4, ac: 10, speed: "30 ft.",
    attacks: [{ name: "Club", bonus: 2, damage: "1d4", damageType: "bludgeoning" }],
    special: [],
  },
  {
    name: "Rat",
    cr: 0, xp: 10, size: "Tiny", type: "beast",
    hp: 1, ac: 10, speed: "20 ft.",
    attacks: [{ name: "Bite", bonus: 0, damage: "1", damageType: "piercing" }],
    special: ["Keen Smell"],
  },
  {
    name: "Twig Blight",
    cr: 0, xp: 25, size: "Small", type: "plant",
    hp: 4, ac: 13, speed: "20 ft.",
    attacks: [{ name: "Claws", bonus: 3, damage: "1d4+1", damageType: "piercing" }],
    special: ["False Appearance"],
  },

  // ─── CR 1/8 ───
  {
    name: "Bandit",
    cr: 0.125, xp: 25, size: "Medium", type: "humanoid",
    hp: 11, ac: 12, speed: "30 ft.",
    attacks: [{ name: "Scimitar", bonus: 3, damage: "1d6+1", damageType: "slashing" }],
    special: [],
  },
  {
    name: "Cultist",
    cr: 0.125, xp: 25, size: "Medium", type: "humanoid",
    hp: 9, ac: 12, speed: "30 ft.",
    attacks: [{ name: "Scimitar", bonus: 3, damage: "1d6+1", damageType: "slashing" }],
    special: ["Dark Devotion"],
  },
  {
    name: "Giant Rat",
    cr: 0.125, xp: 25, size: "Small", type: "beast",
    hp: 7, ac: 12, speed: "30 ft.",
    attacks: [{ name: "Bite", bonus: 4, damage: "1d4+2", damageType: "piercing" }],
    special: ["Keen Smell", "Pack Tactics"],
  },
  {
    name: "Kobold",
    cr: 0.125, xp: 25, size: "Small", type: "humanoid",
    hp: 5, ac: 12, speed: "30 ft.",
    attacks: [{ name: "Dagger", bonus: 4, damage: "1d4+2", damageType: "piercing" }],
    special: ["Pack Tactics", "Sunlight Sensitivity"],
  },
  {
    name: "Merfolk",
    cr: 0.125, xp: 25, size: "Medium", type: "humanoid",
    hp: 11, ac: 11, speed: "10 ft., swim 40 ft.",
    attacks: [{ name: "Spear", bonus: 2, damage: "1d6", damageType: "piercing" }],
    special: ["Amphibious"],
  },

  // ─── CR 1/4 ───
  {
    name: "Goblin",
    cr: 0.25, xp: 50, size: "Small", type: "humanoid",
    hp: 7, ac: 15, speed: "30 ft.",
    attacks: [
      { name: "Scimitar", bonus: 4, damage: "1d6+2", damageType: "slashing" },
      { name: "Shortbow", bonus: 4, damage: "1d6+2", damageType: "piercing" },
    ],
    special: ["Nimble Escape"],
  },
  {
    name: "Skeleton",
    cr: 0.25, xp: 50, size: "Medium", type: "undead",
    hp: 13, ac: 13, speed: "30 ft.",
    attacks: [
      { name: "Shortsword", bonus: 4, damage: "1d6+2", damageType: "piercing" },
      { name: "Shortbow", bonus: 4, damage: "1d6+2", damageType: "piercing" },
    ],
    special: ["Vulnerabilities: Bludgeoning"],
  },
  {
    name: "Wolf",
    cr: 0.25, xp: 50, size: "Medium", type: "beast",
    hp: 11, ac: 13, speed: "40 ft.",
    attacks: [{ name: "Bite", bonus: 4, damage: "2d4+2", damageType: "piercing" }],
    special: ["Keen Hearing and Smell", "Pack Tactics", "Trip Attack (DC 11 Str)"],
  },
  {
    name: "Zombie",
    cr: 0.25, xp: 50, size: "Medium", type: "undead",
    hp: 22, ac: 8, speed: "20 ft.",
    attacks: [{ name: "Slam", bonus: 3, damage: "1d6+1", damageType: "bludgeoning" }],
    special: ["Undead Fortitude"],
  },
  {
    name: "Stirge",
    cr: 0.125, xp: 25, size: "Tiny", type: "beast",
    hp: 2, ac: 14, speed: "10 ft., fly 40 ft.",
    attacks: [{ name: "Blood Drain", bonus: 5, damage: "1d4+3", damageType: "piercing" }],
    special: ["Blood Drain"],
  },
  {
    name: "Needle Blight",
    cr: 0.25, xp: 50, size: "Small", type: "plant",
    hp: 11, ac: 12, speed: "30 ft.",
    attacks: [{ name: "Claws", bonus: 3, damage: "1d4+1", damageType: "piercing" }],
    special: ["False Appearance"],
  },

  // ─── CR 1/2 ───
  {
    name: "Hobgoblin",
    cr: 0.5, xp: 100, size: "Medium", type: "humanoid",
    hp: 11, ac: 18, speed: "30 ft.",
    attacks: [
      { name: "Longsword", bonus: 3, damage: "1d8+1", damageType: "slashing" },
      { name: "Longbow", bonus: 3, damage: "1d8+1", damageType: "piercing" },
    ],
    special: ["Martial Advantage"],
  },
  {
    name: "Orc",
    cr: 0.5, xp: 100, size: "Medium", type: "humanoid",
    hp: 15, ac: 13, speed: "30 ft.",
    attacks: [
      { name: "Greataxe", bonus: 5, damage: "1d12+3", damageType: "slashing" },
      { name: "Javelin", bonus: 5, damage: "1d6+3", damageType: "piercing" },
    ],
    special: ["Aggressive"],
  },
  {
    name: "Scout",
    cr: 0.5, xp: 100, size: "Medium", type: "humanoid",
    hp: 16, ac: 13, speed: "30 ft.",
    attacks: [
      { name: "Shortsword", bonus: 4, damage: "1d6+2", damageType: "piercing" },
      { name: "Longbow", bonus: 4, damage: "1d8+2", damageType: "piercing" },
    ],
    special: ["Keen Hearing and Sight"],
  },
  {
    name: "Shadow",
    cr: 0.5, xp: 100, size: "Medium", type: "undead",
    hp: 16, ac: 12, speed: "40 ft.",
    attacks: [{ name: "Strength Drain", bonus: 4, damage: "2d6+2", damageType: "necrotic" }],
    special: ["Amorphous", "Shadow Stealth", "Sunlight Weakness"],
  },
  {
    name: "Worg",
    cr: 0.5, xp: 100, size: "Large", type: "monstrosity",
    hp: 26, ac: 13, speed: "50 ft.",
    attacks: [{ name: "Bite", bonus: 5, damage: "2d6+3", damageType: "piercing" }],
    special: ["Keen Hearing and Smell"],
  },
  {
    name: "Vine Blight",
    cr: 0.5, xp: 100, size: "Medium", type: "plant",
    hp: 26, ac: 12, speed: "10 ft.",
    attacks: [{ name: "Constrict", bonus: 4, damage: "2d6+2", damageType: "bludgeoning" }],
    special: ["False Appearance", "Constrict (restrained on hit)"],
  },

  // ─── CR 1 ───
  {
    name: "Bugbear",
    cr: 1, xp: 200, size: "Medium", type: "humanoid",
    hp: 27, ac: 16, speed: "30 ft.",
    attacks: [
      { name: "Morningstar", bonus: 4, damage: "2d8+2", damageType: "piercing" },
      { name: "Javelin", bonus: 4, damage: "2d6+2", damageType: "piercing" },
    ],
    special: ["Brute", "Surprise Attack (+2d6)"],
  },
  {
    name: "Dire Wolf",
    cr: 1, xp: 200, size: "Large", type: "beast",
    hp: 37, ac: 14, speed: "50 ft.",
    attacks: [{ name: "Bite", bonus: 5, damage: "2d6+3", damageType: "piercing" }],
    special: ["Keen Hearing and Smell", "Pack Tactics", "Trip Attack (DC 13 Str)"],
  },
  {
    name: "Ghoul",
    cr: 1, xp: 200, size: "Medium", type: "undead",
    hp: 22, ac: 12, speed: "30 ft.",
    attacks: [
      { name: "Bite", bonus: 2, damage: "2d6", damageType: "piercing" },
      { name: "Claws", bonus: 4, damage: "2d4+2", damageType: "slashing" },
    ],
    special: ["Claw Paralysis (DC 10 Con)", "Ghoul Feast"],
  },
  {
    name: "Goblin Boss",
    cr: 1, xp: 200, size: "Small", type: "humanoid",
    hp: 21, ac: 17, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Scimitar)", bonus: 4, damage: "1d6+2", damageType: "slashing" },
      { name: "Javelin", bonus: 2, damage: "1d6", damageType: "piercing" },
    ],
    special: ["Nimble Escape", "Redirect Attack"],
  },
  {
    name: "Specter",
    cr: 1, xp: 200, size: "Medium", type: "undead",
    hp: 22, ac: 12, speed: "fly 50 ft.",
    attacks: [{ name: "Life Drain", bonus: 4, damage: "3d6", damageType: "necrotic" }],
    special: ["Life Drain (DC 10 Con or max HP reduced)", "Incorporeal Movement", "Sunlight Sensitivity"],
  },

  // ─── CR 2 ───
  {
    name: "Bandit Captain",
    cr: 2, xp: 450, size: "Medium", type: "humanoid",
    hp: 65, ac: 15, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (3× Scimitar)", bonus: 5, damage: "1d6+3", damageType: "slashing" },
      { name: "Dagger", bonus: 5, damage: "1d4+3", damageType: "piercing" },
    ],
    special: ["Cunning Action"],
  },
  {
    name: "Berserker",
    cr: 2, xp: 450, size: "Medium", type: "humanoid",
    hp: 67, ac: 13, speed: "30 ft.",
    attacks: [{ name: "Greataxe", bonus: 5, damage: "1d12+3", damageType: "slashing" }],
    special: ["Reckless"],
  },
  {
    name: "Cult Fanatic",
    cr: 2, xp: 450, size: "Medium", type: "humanoid",
    hp: 33, ac: 13, speed: "30 ft.",
    attacks: [{ name: "Multiattack (2× Dagger)", bonus: 4, damage: "1d4+2", damageType: "piercing" }],
    special: ["Dark Devotion", "Spellcasting (Inflict Wounds, Spiritual Weapon, Blindness)"],
  },
  {
    name: "Gargoyle",
    cr: 2, xp: 450, size: "Medium", type: "elemental",
    hp: 52, ac: 15, speed: "30 ft., fly 60 ft.",
    attacks: [
      { name: "Multiattack (Bite + Claws)", bonus: 4, damage: "1d6+2", damageType: "piercing" },
      { name: "Claws", bonus: 4, damage: "2d6+2", damageType: "slashing" },
    ],
    special: ["False Appearance"],
  },
  {
    name: "Ghast",
    cr: 2, xp: 450, size: "Medium", type: "undead",
    hp: 36, ac: 13, speed: "30 ft.",
    attacks: [
      { name: "Bite", bonus: 3, damage: "2d8+1", damageType: "piercing" },
      { name: "Claws", bonus: 5, damage: "2d6+3", damageType: "slashing" }
    ],
    special: ["Paralyzing Claws (DC 10 Con)", "Stench (DC 10 Con or poisoned)"],
  },
  {
    name: "Ogre",
    cr: 2, xp: 450, size: "Large", type: "giant",
    hp: 59, ac: 11, speed: "40 ft.",
    attacks: [
      { name: "Greatclub", bonus: 6, damage: "2d8+4", damageType: "bludgeoning" },
      { name: "Javelin", bonus: 6, damage: "2d6+4", damageType: "piercing" },
    ],
    special: [],
  },
  {
    name: "Werewolf",
    cr: 3, xp: 700, size: "Medium", type: "humanoid (shapechanger)",
    hp: 58, ac: 11, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (Bite + Claw)", bonus: 4, damage: "2d6+2", damageType: "piercing" },
      { name: "Claw (Wolf Form)", bonus: 4, damage: "2d4+2", damageType: "slashing" },
    ],
    special: ["Shapechanger", "Curse of Lycanthropy"],
  },

  // ─── CR 3 ───
  {
    name: "Doppelganger",
    cr: 3, xp: 700, size: "Medium", type: "monstrosity (shapechanger)",
    hp: 52, ac: 14, speed: "30 ft.",
    attacks: [{ name: "Multiattack (2× Slam)", bonus: 6, damage: "2d6+4", damageType: "bludgeoning" }],
    special: ["Shapechanger", "Ambusher", "Surprise Attack", "Read Thoughts"],
  },
  {
    name: "Green Hag",
    cr: 3, xp: 700, size: "Medium", type: "fey",
    hp: 82, ac: 14, speed: "30 ft.",
    attacks: [{ name: "Claws", bonus: 6, damage: "2d6+4", damageType: "slashing" }],
    special: ["Amphibious", "Illusory Appearance", "Invisible Passage"],
  },
  {
    name: "Knight",
    cr: 3, xp: 700, size: "Medium", type: "humanoid",
    hp: 52, ac: 18, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Greatsword)", bonus: 5, damage: "2d6+3", damageType: "slashing" },
      { name: "Heavy Crossbow", bonus: 2, damage: "1d10", damageType: "piercing" },
    ],
    special: ["Brave"],
  },
  {
    name: "Minotaur",
    cr: 3, xp: 700, size: "Large", type: "monstrosity",
    hp: 114, ac: 14, speed: "40 ft.",
    attacks: [
      { name: "Greataxe", bonus: 6, damage: "2d12+4", damageType: "slashing" },
      { name: "Gore", bonus: 6, damage: "2d8+4", damageType: "piercing" },
    ],
    special: ["Charge (+9 damage, DC 14 Str push)", "Labyrinthine Recall", "Reckless"],
  },
  {
    name: "Owlbear",
    cr: 3, xp: 700, size: "Large", type: "monstrosity",
    hp: 59, ac: 13, speed: "40 ft.",
    attacks: [
      { name: "Multiattack (Beak + Claws)", bonus: 5, damage: "1d10+3", damageType: "piercing" },
      { name: "Claws", bonus: 5, damage: "2d8+3", damageType: "slashing" },
    ],
    special: ["Keen Sight and Smell"],
  },
  {
    name: "Vampire Spawn",
    cr: 5, xp: 1800, size: "Medium", type: "undead",
    hp: 82, ac: 15, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (Claws + Bite)", bonus: 6, damage: "2d6+3", damageType: "slashing" },
      { name: "Bite", bonus: 6, damage: "1d6+3+3d6", damageType: "piercing+necrotic" },
    ],
    special: ["Regeneration (10 HP/turn)", "Spider Climb", "Sunlight Hypersensitivity", "Life Drain"],
  },

  // ─── CR 4 ───
  {
    name: "Ettin",
    cr: 4, xp: 1100, size: "Large", type: "giant",
    hp: 85, ac: 12, speed: "40 ft.",
    attacks: [
      { name: "Multiattack (Battleaxe + Morningstar)", bonus: 7, damage: "2d8+5", damageType: "slashing" },
      { name: "Morningstar", bonus: 7, damage: "2d8+5", damageType: "piercing" },
    ],
    special: ["Two Heads (advantage on Perception, Wis saves)", "Wakeful"],
  },
  {
    name: "Ghost",
    cr: 4, xp: 1100, size: "Medium", type: "undead",
    hp: 45, ac: 11, speed: "fly 40 ft.",
    attacks: [{ name: "Withering Touch", bonus: 5, damage: "4d6+3", damageType: "necrotic" }],
    special: ["Ethereal Sight", "Incorporeal Movement", "Possession (DC 13 Cha)", "Horrifying Visage"],
  },
  {
    name: "Wereboar",
    cr: 4, xp: 1100, size: "Medium", type: "humanoid (shapechanger)",
    hp: 78, ac: 11, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Attacks)", bonus: 5, damage: "2d6+3", damageType: "slashing" },
      { name: "Tusk (Boar Form)", bonus: 5, damage: "2d6+3", damageType: "slashing" },
    ],
    special: ["Charge", "Relentless (1/day survive to 1 HP)", "Curse of Lycanthropy"],
  },

  // ─── CR 5 ───
  {
    name: "Gladiator",
    cr: 5, xp: 1800, size: "Medium", type: "humanoid",
    hp: 112, ac: 16, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (3× Spear)", bonus: 7, damage: "1d6+4", damageType: "piercing" },
      { name: "Shield Bash", bonus: 7, damage: "2d6+4", damageType: "bludgeoning" },
    ],
    special: ["Brave", "Brute"],
  },
  {
    name: "Hill Giant",
    cr: 5, xp: 1800, size: "Huge", type: "giant",
    hp: 105, ac: 13, speed: "40 ft.",
    attacks: [
      { name: "Multiattack (2× Greatclub)", bonus: 8, damage: "3d8+5", damageType: "bludgeoning" },
      { name: "Rock", bonus: 8, damage: "3d10+5", damageType: "bludgeoning" },
    ],
    special: [],
  },
  {
    name: "Troll",
    cr: 5, xp: 1800, size: "Large", type: "giant",
    hp: 84, ac: 15, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (Bite + 2× Claw)", bonus: 7, damage: "1d6+4", damageType: "piercing" },
      { name: "Claw", bonus: 7, damage: "2d6+4", damageType: "slashing" },
    ],
    special: ["Keen Smell", "Regeneration (10 HP/turn, stopped by acid/fire)"],
  },
  {
    name: "Wraith",
    cr: 5, xp: 1800, size: "Medium", type: "undead",
    hp: 67, ac: 13, speed: "fly 60 ft.",
    attacks: [{ name: "Life Drain", bonus: 6, damage: "4d8+3", damageType: "necrotic" }],
    special: ["Life Drain (DC 14 Con or max HP reduced)", "Create Specter", "Incorporeal Movement"],
  },

  // ─── CR 6 ───
  {
    name: "Mage",
    cr: 6, xp: 2300, size: "Medium", type: "humanoid",
    hp: 40, ac: 15, speed: "30 ft.",
    attacks: [{ name: "Dagger", bonus: 5, damage: "1d4+3", damageType: "piercing" }],
    special: ["Spellcasting (Fireball 8d6, Lightning Bolt 8d6, Fly, Counterspell)"],
  },
  {
    name: "Wyvern",
    cr: 6, xp: 2300, size: "Large", type: "dragon",
    hp: 110, ac: 13, speed: "20 ft., fly 80 ft.",
    attacks: [
      { name: "Multiattack (Bite + Stinger)", bonus: 7, damage: "2d6+4", damageType: "piercing" },
      { name: "Stinger", bonus: 7, damage: "2d6+4+7d6", damageType: "piercing+poison" },
    ],
    special: ["Stinger Poison (DC 15 Con or 7d6 poison)"],
  },

  // ─── CR 7 ───
  {
    name: "Stone Giant",
    cr: 7, xp: 2900, size: "Huge", type: "giant",
    hp: 126, ac: 17, speed: "40 ft.",
    attacks: [
      { name: "Multiattack (2× Greatclub)", bonus: 9, damage: "3d8+6", damageType: "bludgeoning" },
      { name: "Rock", bonus: 9, damage: "4d10+6", damageType: "bludgeoning" },
    ],
    special: ["Stone Camouflage"],
  },
  {
    name: "Yuan-Ti Abomination",
    cr: 7, xp: 2900, size: "Large", type: "monstrosity (shapechanger)",
    hp: 127, ac: 15, speed: "40 ft., swim 40 ft.",
    attacks: [
      { name: "Multiattack (3× Scimitar or Constrict + Scimitar)", bonus: 8, damage: "3d6+5", damageType: "slashing" },
      { name: "Constrict", bonus: 8, damage: "2d6+5", damageType: "bludgeoning" },
    ],
    special: ["Shapechanger", "Innate Spellcasting (Suggestion, Fear, Enthrall)", "Magic Resistance"],
  },

  // ─── CR 8 ───
  {
    name: "Frost Giant",
    cr: 8, xp: 3900, size: "Huge", type: "giant",
    hp: 138, ac: 15, speed: "40 ft.",
    attacks: [
      { name: "Multiattack (2× Greataxe)", bonus: 9, damage: "3d12+6", damageType: "slashing" },
      { name: "Rock", bonus: 9, damage: "4d10+6", damageType: "bludgeoning" },
    ],
    special: ["Cold Immunity"],
  },
  {
    name: "Assassin",
    cr: 8, xp: 3900, size: "Medium", type: "humanoid",
    hp: 78, ac: 15, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Shortsword)", bonus: 6, damage: "1d6+3+4d6", damageType: "piercing+poison" },
    ],
    special: ["Assassinate (advantage on first round, auto-crit)", "Evasion", "Sneak Attack 4d6", "Poison Coating"],
  },

  // ─── CR 9 ───
  {
    name: "Fire Giant",
    cr: 9, xp: 5000, size: "Huge", type: "giant",
    hp: 162, ac: 18, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Greatsword)", bonus: 11, damage: "6d6+7", damageType: "slashing" },
      { name: "Rock", bonus: 11, damage: "4d10+7", damageType: "bludgeoning" },
    ],
    special: ["Fire Immunity"],
  },

  // ─── CR 10 ───
  {
    name: "Aboleth",
    cr: 10, xp: 5900, size: "Large", type: "aberration",
    hp: 135, ac: 17, speed: "10 ft., swim 40 ft.",
    attacks: [
      { name: "Multiattack (3× Tentacle)", bonus: 9, damage: "2d6+5", damageType: "bludgeoning" },
    ],
    special: ["Enslave (DC 14 Wis)", "Mucous Cloud", "Probing Telepathy", "Legendary Actions"],
  },
  {
    name: "Stone Golem",
    cr: 10, xp: 5900, size: "Large", type: "construct",
    hp: 178, ac: 17, speed: "30 ft.",
    attacks: [
      { name: "Multiattack (2× Slam)", bonus: 10, damage: "3d8+6", damageType: "bludgeoning" },
    ],
    special: ["Immutable Form", "Magic Resistance", "Slow (DC 17 Con)", "Magic Weapons"],
  },
];

// XP thresholds per player per level for difficulty
export const XP_THRESHOLDS = {
  1:  { easy: 25,   medium: 50,   hard: 75,    deadly: 100  },
  2:  { easy: 50,   medium: 100,  hard: 150,   deadly: 200  },
  3:  { easy: 75,   medium: 150,  hard: 225,   deadly: 400  },
  4:  { easy: 125,  medium: 250,  hard: 375,   deadly: 500  },
  5:  { easy: 250,  medium: 500,  hard: 750,   deadly: 1100 },
  6:  { easy: 300,  medium: 600,  hard: 900,   deadly: 1400 },
  7:  { easy: 350,  medium: 750,  hard: 1100,  deadly: 1700 },
  8:  { easy: 450,  medium: 900,  hard: 1400,  deadly: 2100 },
  9:  { easy: 550,  medium: 1100, hard: 1600,  deadly: 2400 },
  10: { easy: 600,  medium: 1200, hard: 1900,  deadly: 2800 },
  11: { easy: 800,  medium: 1600, hard: 2400,  deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000,  deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400,  deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800,  deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300,  deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800,  deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900,  deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300,  deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300,  deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500,  deadly: 12700 },
};

// Multiplier for number of monsters
export function getMultiplier(count) {
  if (count === 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

// CR to recommended max party level mapping (rough guideline)
export function crForLevel(partyLevel) {
  const table = [
    // [maxCR, minCR]
    [0.25, 0],   // level 1
    [0.5,  0],   // level 2
    [1,    0.125], // level 3
    [2,    0.25],  // level 4
    [3,    0.25],  // level 5
    [4,    0.5],   // level 6
    [5,    0.5],   // level 7
    [6,    1],     // level 8
    [7,    1],     // level 9
    [8,    2],     // level 10
  ];
  const idx = Math.min(partyLevel - 1, table.length - 1);
  return table[Math.max(0, idx)];
}

// Loot tables by encounter XP bracket
export const LOOT_TABLES = {
  low: {
    goldRange: [2, 20],
    mundane: ["Torch", "Rope (50 ft.)", "Rations (1 day)", "Tinderbox", "Waterskin", "Crude map", "Lock picks"],
    magicChance: 0,
  },
  medium: {
    goldRange: [10, 60],
    mundane: ["Healing Potion (2d4+2)", "Antitoxin", "Climber's Kit", "Disguise Kit", "Fine clothing", "Spyglass (damaged)", "Jeweled brooch (15 gp)"],
    magicChance: 0.1,
  },
  high: {
    goldRange: [50, 200],
    mundane: ["Healing Potion ×2", "Potion of Greater Healing", "Gem (50 gp)", "Jewelry (100 gp)", "Spell scroll (cantrip)", "Wand (3 charges)", "Bag of Holding"],
    magicChance: 0.35,
  },
  deadly: {
    goldRange: [150, 500],
    mundane: ["Greater Healing Potion", "Gems (250 gp total)", "Art object (500 gp)", "Spell scroll (1st-3rd level)"],
    magicChance: 0.6,
  },
};

export const MAGIC_ITEMS = [
  "+1 Weapon (player's choice)",
  "+1 Shield",
  "Bag of Holding",
  "Boots of Elvenkind",
  "Cloak of Protection",
  "Eyes of the Eagle",
  "Gauntlets of Ogre Power",
  "Headband of Intellect",
  "Medallion of Thoughts",
  "Necklace of Adaptation",
  "Periapt of Health",
  "Potion of Flying",
  "Potion of Heroism",
  "Potion of Invisibility",
  "Ring of Protection",
  "Ring of Swimming",
  "Rope of Climbing",
  "Stone of Good Luck",
  "Wand of Magic Missiles",
  "Wand of Web",
];
