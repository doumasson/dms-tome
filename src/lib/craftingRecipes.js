/**
 * Crafting recipes for DungeonMind.
 * Players combine materials from their inventory to create items.
 * Materials are found as loot drops, purchased from merchants, or gathered.
 */

export const MATERIALS = {
  herbs: { name: 'Herbs', icon: '🌿', type: 'material', rarity: 'common', price: 2 },
  vial: { name: 'Empty Vial', icon: '🧪', type: 'material', rarity: 'common', price: 1 },
  parchment: { name: 'Parchment', icon: '📜', type: 'material', rarity: 'common', price: 1 },
  ink: { name: 'Arcane Ink', icon: '🖋️', type: 'material', rarity: 'uncommon', price: 10 },
  iron_ingot: { name: 'Iron Ingot', icon: '⬛', type: 'material', rarity: 'common', price: 5 },
  leather: { name: 'Leather Strip', icon: '🟤', type: 'material', rarity: 'common', price: 3 },
  gem_dust: { name: 'Gem Dust', icon: '💎', type: 'material', rarity: 'uncommon', price: 15 },
  monster_part: { name: 'Monster Part', icon: '🦴', type: 'material', rarity: 'common', price: 5 },
  holy_water: { name: 'Holy Water', icon: '💧', type: 'material', rarity: 'uncommon', price: 25 },
  dragon_scale: { name: 'Dragon Scale', icon: '🐉', type: 'material', rarity: 'rare', price: 50 },
};

export const RECIPES = [
  {
    id: 'healing_potion',
    name: 'Potion of Healing',
    icon: '🧴',
    description: 'Restores 2d4+2 hit points.',
    ingredients: [{ id: 'herbs', qty: 2 }, { id: 'vial', qty: 1 }],
    result: { name: 'Potion of Healing', type: 'consumable', rarity: 'common', effect: { type: 'heal', dice: '2d4', bonus: 2 }, description: 'Restores 2d4+2 hit points.', price: 50 },
    craftTime: 'Short rest',
    dc: 10,
    skill: 'Medicine',
  },
  {
    id: 'greater_healing',
    name: 'Potion of Greater Healing',
    icon: '🧴',
    description: 'Restores 4d4+4 hit points.',
    ingredients: [{ id: 'herbs', qty: 3 }, { id: 'vial', qty: 1 }, { id: 'gem_dust', qty: 1 }],
    result: { name: 'Potion of Greater Healing', type: 'consumable', rarity: 'uncommon', effect: { type: 'heal', dice: '4d4', bonus: 4 }, description: 'Restores 4d4+4 hit points.', price: 150 },
    craftTime: 'Long rest',
    dc: 15,
    skill: 'Medicine',
  },
  {
    id: 'antitoxin',
    name: 'Antitoxin',
    icon: '💊',
    description: 'Advantage on saves vs. poison for 1 hour.',
    ingredients: [{ id: 'herbs', qty: 1 }, { id: 'vial', qty: 1 }, { id: 'monster_part', qty: 1 }],
    result: { name: 'Antitoxin', type: 'consumable', rarity: 'common', description: 'Advantage on saves vs. poison for 1 hour.', price: 50 },
    craftTime: 'Short rest',
    dc: 12,
    skill: 'Nature',
  },
  {
    id: 'scroll_firebolt',
    name: 'Scroll of Fire Bolt',
    icon: '📜',
    description: 'Single-use cantrip scroll. 1d10 fire damage.',
    ingredients: [{ id: 'parchment', qty: 1 }, { id: 'ink', qty: 1 }],
    result: { name: 'Scroll of Fire Bolt', type: 'consumable', rarity: 'common', damage: '1d10 fire', price: 25 },
    craftTime: 'Short rest',
    dc: 10,
    skill: 'Arcana',
  },
  {
    id: 'scroll_shield',
    name: 'Scroll of Shield',
    icon: '📜',
    description: 'Single-use 1st level spell. +5 AC as reaction.',
    ingredients: [{ id: 'parchment', qty: 2 }, { id: 'ink', qty: 1 }, { id: 'gem_dust', qty: 1 }],
    result: { name: 'Scroll of Shield', type: 'consumable', rarity: 'uncommon', description: '+5 AC as reaction until your next turn.', price: 75 },
    craftTime: 'Long rest',
    dc: 15,
    skill: 'Arcana',
  },
  {
    id: 'oil_of_sharpness',
    name: 'Oil of Sharpness',
    icon: '🫙',
    description: 'Coat a weapon for +1 to attack and damage for 1 hour.',
    ingredients: [{ id: 'monster_part', qty: 2 }, { id: 'vial', qty: 1 }, { id: 'iron_ingot', qty: 1 }],
    result: { name: 'Oil of Sharpness', type: 'consumable', rarity: 'uncommon', description: '+1 to attack and damage for 1 hour.', price: 100 },
    craftTime: 'Short rest',
    dc: 14,
    skill: 'Nature',
  },
  {
    id: 'holy_weapon_oil',
    name: 'Holy Weapon Oil',
    icon: '✨',
    description: 'Coat a weapon for +1d6 radiant damage for 1 hour.',
    ingredients: [{ id: 'holy_water', qty: 1 }, { id: 'vial', qty: 1 }, { id: 'gem_dust', qty: 1 }],
    result: { name: 'Holy Weapon Oil', type: 'consumable', rarity: 'rare', description: '+1d6 radiant damage for 1 hour.', damage: '1d6 radiant', price: 200 },
    craftTime: 'Long rest',
    dc: 16,
    skill: 'Religion',
  },
  {
    id: 'basic_caltrops',
    name: 'Caltrops',
    icon: '⚙',
    description: '20 caltrops. Spread on ground to slow enemies.',
    ingredients: [{ id: 'iron_ingot', qty: 2 }],
    result: { name: 'Caltrops (bag of 20)', type: 'gear', rarity: 'common', description: 'Creatures entering the area must DEX save DC 15 or take 1 piercing and speed becomes 0.', price: 5 },
    craftTime: 'Short rest',
    dc: 8,
    skill: 'Sleight of Hand',
  },
];

/**
 * Check if a player has enough materials for a recipe.
 */
export function canCraft(recipe, inventory) {
  for (const ing of recipe.ingredients) {
    const mat = MATERIALS[ing.id];
    if (!mat) return false;
    const owned = inventory.filter(item =>
      item.name === mat.name || item.id === ing.id
    ).reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (owned < ing.qty) return false;
  }
  return true;
}

/**
 * Remove ingredients from inventory and return remaining items.
 */
export function consumeIngredients(recipe, inventory) {
  const remaining = [...inventory];
  for (const ing of recipe.ingredients) {
    const mat = MATERIALS[ing.id];
    let needed = ing.qty;
    for (let i = remaining.length - 1; i >= 0 && needed > 0; i--) {
      const item = remaining[i];
      if (item.name === mat.name || item.id === ing.id) {
        const qty = item.quantity || 1;
        if (qty <= needed) {
          remaining.splice(i, 1);
          needed -= qty;
        } else {
          remaining[i] = { ...item, quantity: qty - needed };
          needed = 0;
        }
      }
    }
  }
  return remaining;
}
