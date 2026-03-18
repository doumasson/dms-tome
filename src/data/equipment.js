// D&D 5e SRD Equipment Data
// All SRD weapons and armor with accurate stats

// ─── WEAPONS ─────────────────────────────────────────────────────────────────

export const WEAPONS = [

  // ── Simple Melee Weapons ─────────────────────────────────────────────────

  {
    name: "Club",
    category: "simple_melee",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["light"],
    versatile: null,
    range: null,
    weight: 2,
    cost: "1 sp"
  },
  {
    name: "Dagger",
    category: "simple_melee",
    damage: "1d4",
    damageType: "piercing",
    properties: ["finesse", "light", "thrown"],
    versatile: null,
    range: { normal: 20, long: 60 },
    weight: 1,
    cost: "2 gp"
  },
  {
    name: "Greatclub",
    category: "simple_melee",
    damage: "1d8",
    damageType: "bludgeoning",
    properties: ["two-handed"],
    versatile: null,
    range: null,
    weight: 10,
    cost: "2 sp"
  },
  {
    name: "Handaxe",
    category: "simple_melee",
    damage: "1d6",
    damageType: "slashing",
    properties: ["light", "thrown"],
    versatile: null,
    range: { normal: 20, long: 60 },
    weight: 2,
    cost: "5 gp"
  },
  {
    name: "Javelin",
    category: "simple_melee",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thrown"],
    versatile: null,
    range: { normal: 30, long: 120 },
    weight: 2,
    cost: "5 sp"
  },
  {
    name: "Light Hammer",
    category: "simple_melee",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["light", "thrown"],
    versatile: null,
    range: { normal: 20, long: 60 },
    weight: 2,
    cost: "2 gp"
  },
  {
    name: "Mace",
    category: "simple_melee",
    damage: "1d6",
    damageType: "bludgeoning",
    properties: [],
    versatile: null,
    range: null,
    weight: 4,
    cost: "5 gp"
  },
  {
    name: "Quarterstaff",
    category: "simple_melee",
    damage: "1d6",
    damageType: "bludgeoning",
    properties: ["versatile"],
    versatile: "1d8",
    range: null,
    weight: 4,
    cost: "2 sp"
  },
  {
    name: "Sickle",
    category: "simple_melee",
    damage: "1d4",
    damageType: "slashing",
    properties: ["light"],
    versatile: null,
    range: null,
    weight: 2,
    cost: "1 gp"
  },
  {
    name: "Spear",
    category: "simple_melee",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thrown", "versatile"],
    versatile: "1d8",
    range: { normal: 20, long: 60 },
    weight: 3,
    cost: "1 gp"
  },
  {
    name: "Unarmed Strike",
    category: "simple_melee",
    damage: "1",
    damageType: "bludgeoning",
    properties: [],
    versatile: null,
    range: null,
    weight: 0,
    cost: "—"
  },

  // ── Simple Ranged Weapons ─────────────────────────────────────────────────

  {
    name: "Light Crossbow",
    category: "simple_ranged",
    damage: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "loading", "two-handed"],
    versatile: null,
    range: { normal: 80, long: 320 },
    weight: 5,
    cost: "25 gp",
    ammunition: "Bolts"
  },
  {
    name: "Dart",
    category: "simple_ranged",
    damage: "1d4",
    damageType: "piercing",
    properties: ["finesse", "thrown"],
    versatile: null,
    range: { normal: 20, long: 60 },
    weight: 0.25,
    cost: "5 cp"
  },
  {
    name: "Shortbow",
    category: "simple_ranged",
    damage: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "two-handed"],
    versatile: null,
    range: { normal: 80, long: 320 },
    weight: 2,
    cost: "25 gp",
    ammunition: "Arrows"
  },
  {
    name: "Sling",
    category: "simple_ranged",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["ammunition"],
    versatile: null,
    range: { normal: 30, long: 120 },
    weight: 0,
    cost: "1 sp",
    ammunition: "Sling Bullets"
  },

  // ── Martial Melee Weapons ─────────────────────────────────────────────────

  {
    name: "Battleaxe",
    category: "martial_melee",
    damage: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    versatile: "1d10",
    range: null,
    weight: 4,
    cost: "10 gp"
  },
  {
    name: "Flail",
    category: "martial_melee",
    damage: "1d8",
    damageType: "bludgeoning",
    properties: [],
    versatile: null,
    range: null,
    weight: 2,
    cost: "10 gp"
  },
  {
    name: "Glaive",
    category: "martial_melee",
    damage: "1d10",
    damageType: "slashing",
    properties: ["heavy", "reach", "two-handed"],
    versatile: null,
    range: null,
    weight: 6,
    cost: "20 gp"
  },
  {
    name: "Greataxe",
    category: "martial_melee",
    damage: "1d12",
    damageType: "slashing",
    properties: ["heavy", "two-handed"],
    versatile: null,
    range: null,
    weight: 7,
    cost: "30 gp"
  },
  {
    name: "Greatsword",
    category: "martial_melee",
    damage: "2d6",
    damageType: "slashing",
    properties: ["heavy", "two-handed"],
    versatile: null,
    range: null,
    weight: 6,
    cost: "50 gp"
  },
  {
    name: "Halberd",
    category: "martial_melee",
    damage: "1d10",
    damageType: "slashing",
    properties: ["heavy", "reach", "two-handed"],
    versatile: null,
    range: null,
    weight: 6,
    cost: "20 gp"
  },
  {
    name: "Lance",
    category: "martial_melee",
    damage: "1d12",
    damageType: "piercing",
    properties: ["reach", "special"],
    versatile: null,
    special: "Disadvantage on attack rolls against targets within 5 feet. Requires two hands to wield unless mounted.",
    range: null,
    weight: 6,
    cost: "10 gp"
  },
  {
    name: "Longsword",
    category: "martial_melee",
    damage: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    versatile: "1d10",
    range: null,
    weight: 3,
    cost: "15 gp"
  },
  {
    name: "Maul",
    category: "martial_melee",
    damage: "2d6",
    damageType: "bludgeoning",
    properties: ["heavy", "two-handed"],
    versatile: null,
    range: null,
    weight: 10,
    cost: "10 gp"
  },
  {
    name: "Morningstar",
    category: "martial_melee",
    damage: "1d8",
    damageType: "piercing",
    properties: [],
    versatile: null,
    range: null,
    weight: 4,
    cost: "15 gp"
  },
  {
    name: "Pike",
    category: "martial_melee",
    damage: "1d10",
    damageType: "piercing",
    properties: ["heavy", "reach", "two-handed"],
    versatile: null,
    range: null,
    weight: 18,
    cost: "5 gp"
  },
  {
    name: "Rapier",
    category: "martial_melee",
    damage: "1d8",
    damageType: "piercing",
    properties: ["finesse"],
    versatile: null,
    range: null,
    weight: 2,
    cost: "25 gp"
  },
  {
    name: "Scimitar",
    category: "martial_melee",
    damage: "1d6",
    damageType: "slashing",
    properties: ["finesse", "light"],
    versatile: null,
    range: null,
    weight: 3,
    cost: "25 gp"
  },
  {
    name: "Shortsword",
    category: "martial_melee",
    damage: "1d6",
    damageType: "piercing",
    properties: ["finesse", "light"],
    versatile: null,
    range: null,
    weight: 2,
    cost: "10 gp"
  },
  {
    name: "Trident",
    category: "martial_melee",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thrown", "versatile"],
    versatile: "1d8",
    range: { normal: 20, long: 60 },
    weight: 4,
    cost: "5 gp"
  },
  {
    name: "War Pick",
    category: "martial_melee",
    damage: "1d8",
    damageType: "piercing",
    properties: [],
    versatile: null,
    range: null,
    weight: 2,
    cost: "5 gp"
  },
  {
    name: "Warhammer",
    category: "martial_melee",
    damage: "1d8",
    damageType: "bludgeoning",
    properties: ["versatile"],
    versatile: "1d10",
    range: null,
    weight: 2,
    cost: "15 gp"
  },
  {
    name: "Whip",
    category: "martial_melee",
    damage: "1d4",
    damageType: "slashing",
    properties: ["finesse", "reach"],
    versatile: null,
    range: null,
    weight: 3,
    cost: "2 gp"
  },

  // ── Martial Ranged Weapons ─────────────────────────────────────────────────

  {
    name: "Blowgun",
    category: "martial_ranged",
    damage: "1",
    damageType: "piercing",
    properties: ["ammunition", "loading"],
    versatile: null,
    range: { normal: 25, long: 100 },
    weight: 1,
    cost: "10 gp",
    ammunition: "Blowgun Needles"
  },
  {
    name: "Hand Crossbow",
    category: "martial_ranged",
    damage: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "light", "loading"],
    versatile: null,
    range: { normal: 30, long: 120 },
    weight: 3,
    cost: "75 gp",
    ammunition: "Bolts"
  },
  {
    name: "Heavy Crossbow",
    category: "martial_ranged",
    damage: "1d10",
    damageType: "piercing",
    properties: ["ammunition", "heavy", "loading", "two-handed"],
    versatile: null,
    range: { normal: 100, long: 400 },
    weight: 18,
    cost: "50 gp",
    ammunition: "Bolts"
  },
  {
    name: "Longbow",
    category: "martial_ranged",
    damage: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "heavy", "two-handed"],
    versatile: null,
    range: { normal: 150, long: 600 },
    weight: 2,
    cost: "50 gp",
    ammunition: "Arrows"
  },
  {
    name: "Net",
    category: "martial_ranged",
    damage: null,
    damageType: null,
    properties: ["special", "thrown"],
    versatile: null,
    special: "A Large or smaller creature hit by a net is restrained until it is freed. A net has no effect on creatures that are formless or huge or larger. A creature can break free by spending its action to make a DC 10 STR check.",
    range: { normal: 5, long: 15 },
    weight: 3,
    cost: "1 gp"
  }
];

// ─── ARMOR ────────────────────────────────────────────────────────────────────

export const ARMOR = [

  // ── Light Armor ───────────────────────────────────────────────────────────

  {
    name: "Padded",
    type: "light",
    baseAC: 11,
    addDex: true,
    maxDex: null,
    stealthDisadvantage: true,
    strengthRequired: 0,
    weight: 8,
    cost: "5 gp"
  },
  {
    name: "Leather Armor",
    type: "light",
    baseAC: 11,
    addDex: true,
    maxDex: null,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 10,
    cost: "10 gp"
  },
  {
    name: "Studded Leather",
    type: "light",
    baseAC: 12,
    addDex: true,
    maxDex: null,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 13,
    cost: "45 gp"
  },

  // ── Medium Armor ──────────────────────────────────────────────────────────

  {
    name: "Hide",
    type: "medium",
    baseAC: 12,
    addDex: true,
    maxDex: 2,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 12,
    cost: "10 gp"
  },
  {
    name: "Chain Shirt",
    type: "medium",
    baseAC: 13,
    addDex: true,
    maxDex: 2,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 20,
    cost: "50 gp"
  },
  {
    name: "Scale Mail",
    type: "medium",
    baseAC: 14,
    addDex: true,
    maxDex: 2,
    stealthDisadvantage: true,
    strengthRequired: 0,
    weight: 45,
    cost: "50 gp"
  },
  {
    name: "Breastplate",
    type: "medium",
    baseAC: 14,
    addDex: true,
    maxDex: 2,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 20,
    cost: "400 gp"
  },
  {
    name: "Half Plate",
    type: "medium",
    baseAC: 15,
    addDex: true,
    maxDex: 2,
    stealthDisadvantage: true,
    strengthRequired: 0,
    weight: 40,
    cost: "750 gp"
  },

  // ── Heavy Armor ───────────────────────────────────────────────────────────

  {
    name: "Ring Mail",
    type: "heavy",
    baseAC: 14,
    addDex: false,
    maxDex: 0,
    stealthDisadvantage: true,
    strengthRequired: 0,
    weight: 40,
    cost: "30 gp"
  },
  {
    name: "Chain Mail",
    type: "heavy",
    baseAC: 16,
    addDex: false,
    maxDex: 0,
    stealthDisadvantage: true,
    strengthRequired: 13,
    weight: 55,
    cost: "75 gp"
  },
  {
    name: "Splint",
    type: "heavy",
    baseAC: 17,
    addDex: false,
    maxDex: 0,
    stealthDisadvantage: true,
    strengthRequired: 15,
    weight: 60,
    cost: "200 gp"
  },
  {
    name: "Plate",
    type: "heavy",
    baseAC: 18,
    addDex: false,
    maxDex: 0,
    stealthDisadvantage: true,
    strengthRequired: 15,
    weight: 65,
    cost: "1,500 gp"
  },

  // ── Shield ────────────────────────────────────────────────────────────────

  {
    name: "Shield",
    type: "shield",
    baseAC: 2,       // +2 AC bonus
    addDex: false,
    maxDex: null,
    stealthDisadvantage: false,
    strengthRequired: 0,
    weight: 6,
    cost: "10 gp"
  }
];

// ─── PROPERTY DESCRIPTIONS ────────────────────────────────────────────────────

export const WEAPON_PROPERTIES = {
  ammunition: "You can use a weapon that has the ammunition property to make a ranged attack only if you have ammunition to fire from the weapon. Drawing the ammunition is part of the attack.",
  finesse: "When making an attack with a finesse weapon, you use your choice of your Strength or Dexterity modifier for the attack and damage rolls.",
  heavy: "Small creatures have disadvantage on attack rolls with heavy weapons.",
  light: "A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons.",
  loading: "Because of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it.",
  reach: "This weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for opportunity attacks with it.",
  special: "A weapon with the special property has unusual rules governing its use, explained in the weapon's description.",
  thrown: "If a weapon has the thrown property, you can throw the weapon to make a ranged attack.",
  "two-handed": "This weapon requires two hands when you attack with it.",
  versatile: "This weapon can be used with one or two hands. A damage value in parentheses appears with the property — the damage when the weapon is used with two hands."
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getWeapon(name) {
  return WEAPONS.find(w => w.name === name) ?? null;
}

export function getArmor(name) {
  return ARMOR.find(a => a.name === name) ?? null;
}

export function getWeaponsByCategory(category) {
  return WEAPONS.filter(w => w.category === category);
}

export function calculateAC(armorName, dexMod, shieldEquipped = false) {
  const armor = getArmor(armorName);
  if (!armor) return 10 + dexMod; // Unarmored
  let ac = armor.baseAC;
  if (armor.addDex) {
    ac += armor.maxDex !== null ? Math.min(dexMod, armor.maxDex) : dexMod;
  }
  if (shieldEquipped) ac += 2;
  return ac;
}

export const SIMPLE_WEAPONS = WEAPONS.filter(w => w.category.startsWith("simple"));
export const MARTIAL_WEAPONS = WEAPONS.filter(w => w.category.startsWith("martial"));
export const MELEE_WEAPONS = WEAPONS.filter(w => w.category.endsWith("melee"));
export const RANGED_WEAPONS = WEAPONS.filter(w => w.category.endsWith("ranged") || (w.range && !w.category.endsWith("melee")));
