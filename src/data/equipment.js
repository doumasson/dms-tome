// D&D 5e SRD Equipment Data
// All SRD weapons and armor with accurate stats

import { v4 as uuidv4 } from 'uuid';

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
    cost: "1 sp",
    modifiers: []
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
    cost: "2 gp",
    modifiers: []
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
    cost: "2 sp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "5 sp",
    modifiers: []
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
    cost: "2 gp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "2 sp",
    modifiers: []
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
    cost: "1 gp",
    modifiers: []
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
    cost: "1 gp",
    modifiers: []
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
    cost: "—",
    modifiers: []
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
    ammunition: "Bolts",
    modifiers: []
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
    cost: "5 cp",
    modifiers: []
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
    ammunition: "Arrows",
    modifiers: []
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
    ammunition: "Sling Bullets",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "20 gp",
    modifiers: []
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
    cost: "30 gp",
    modifiers: []
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
    cost: "50 gp",
    modifiers: []
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
    cost: "20 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "15 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "15 gp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "25 gp",
    modifiers: []
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
    cost: "25 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "15 gp",
    modifiers: []
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
    cost: "2 gp",
    modifiers: []
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
    ammunition: "Blowgun Needles",
    modifiers: []
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
    ammunition: "Bolts",
    modifiers: []
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
    ammunition: "Bolts",
    modifiers: []
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
    ammunition: "Arrows",
    modifiers: []
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
    cost: "1 gp",
    modifiers: []
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
    cost: "5 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "45 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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
    cost: "50 gp",
    modifiers: []
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
    cost: "50 gp",
    modifiers: []
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
    cost: "400 gp",
    modifiers: []
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
    cost: "750 gp",
    modifiers: []
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
    cost: "30 gp",
    modifiers: []
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
    cost: "75 gp",
    modifiers: []
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
    cost: "200 gp",
    modifiers: []
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
    cost: "1,500 gp",
    modifiers: []
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
    cost: "10 gp",
    modifiers: []
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

// ─── CONSUMABLES ──────────────────────────────────────────────────────────────

export const CONSUMABLES = [
  { id: 'healing-potion',         name: 'Healing Potion',         type: 'consumable', icon: '🧪', effect: { type: 'heal', dice: '2d4',  bonus: 2  }, actionType: 'action',       description: 'Regain 2d4+2 hit points.',          cost: '50 gp',   weight: 0.5 },
  { id: 'greater-healing-potion', name: 'Greater Healing Potion', type: 'consumable', icon: '🧪', effect: { type: 'heal', dice: '4d4',  bonus: 4  }, actionType: 'action',       description: 'Regain 4d4+4 hit points.',          cost: '100 gp',  weight: 0.5 },
  { id: 'superior-healing-potion',name: 'Superior Healing Potion',type: 'consumable', icon: '🧪', effect: { type: 'heal', dice: '8d4',  bonus: 8  }, actionType: 'action',       description: 'Regain 8d4+8 hit points.',          cost: '500 gp',  weight: 0.5 },
  { id: 'antitoxin',              name: 'Antitoxin',              type: 'consumable', icon: '⚗️',  effect: { type: 'advantage', stat: 'CON', duration: '1 hour', against: 'poison' }, actionType: 'action', description: 'Advantage on CON saves vs poison for 1 hour.', cost: '50 gp', weight: 0.5 },
  { id: 'potion-of-speed',        name: 'Potion of Speed',        type: 'consumable', icon: '💨', effect: { type: 'condition', condition: 'Hasted', duration: '1 min' }, actionType: 'bonus',  description: 'Gain the Haste effect for 1 minute.',    cost: '400 gp',  weight: 0.5 },
  { id: 'potion-of-resistance',   name: 'Potion of Resistance',   type: 'consumable', icon: '🛡', effect: { type: 'resistance', duration: '1 hour' },                  actionType: 'bonus',  description: 'Resistance to one damage type for 1 hour.', cost: '300 gp', weight: 0.5 },
  { id: 'torch',                  name: 'Torch',                  type: 'consumable', icon: '🔦', effect: { type: 'light', radius: 20, duration: '1 hour' },            actionType: 'free',   description: 'Bright light 20ft, dim 20ft beyond, 1 hour.', cost: '1 cp', weight: 1 },
  { id: 'rations',                name: 'Rations (1 day)',        type: 'consumable', icon: '🍖', effect: { type: 'sustenance' },                                       actionType: 'free',   description: 'Food and water for one day.',           cost: '5 sp',    weight: 2 },
  { id: 'rope',                   name: "Hempen Rope (50 ft)",    type: 'gear',       icon: '🧵', effect: null,                                                         actionType: null,     description: '50 feet of hemp rope. 2 hit points.',   cost: '1 gp',    weight: 10 },
  { id: 'thieves-tools',          name: "Thieves' Tools",         type: 'gear',       icon: '🔑', effect: { type: 'tool', skill: 'DEX', use: 'Pick locks or disarm traps' }, actionType: 'action', description: 'Proficiency lets you add PB to DEX checks.', cost: '25 gp', weight: 1 },
];

// ─── SLOT HELPERS ─────────────────────────────────────────────────────────────

/** Derive equipment slot from item data. */
export function getSlotType(item) {
  if (!item) return null;
  if (item.type === 'consumable' || item.type === 'gear') return 'consumable';
  if (item.armorType === 'shield') return 'offHand';
  if (item.properties?.includes('two-handed')) return 'twoHanded';
  if (item.baseAC !== undefined) return 'chest';
  if (item.damage !== undefined || item.category?.includes('weapon')) return 'mainHand';
  return 'misc';
}

/** Recalculate AC from equipped items and stats. */
export function computeAcFromEquipped(equippedItems, stats) {
  const dexMod = Math.floor(((stats?.dex || 10) - 10) / 2);
  const chest   = equippedItems?.chest;
  const offHand = equippedItems?.offHand;
  const hasShield = offHand?.armorType === 'shield';
  if (!chest) return 10 + dexMod + (hasShield ? 2 : 0);
  let ac = chest.baseAC ?? 10;
  if (chest.addDex !== false) {
    ac += chest.maxDex != null ? Math.min(dexMod, chest.maxDex) : dexMod;
  }
  if (hasShield) ac += 2;
  return ac;
}

/** Look up any item by name across all tables. */
export function getItem(name) {
  return WEAPONS.find(w => w.name === name)
    || ARMOR.find(a => a.name === name)
    || CONSUMABLES.find(c => c.name === name)
    || null;
}

/** Default starting inventory for a new character. */
export function getStartingInventory() {
  const potion = CONSUMABLES.find(c => c.id === 'healing-potion');
  return [{ ...potion, instanceId: uuidv4(), quantity: 1 }];
}
