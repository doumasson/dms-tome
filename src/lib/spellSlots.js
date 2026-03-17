// D&D 5e spell slot tables
// Returns array of 9 numbers: max slots for levels 1-9 at a given character level

// Full casters: Bard, Cleric, Druid, Sorcerer, Wizard
const FULL = [
  //  L1  L2  L3  L4  L5  L6  L7  L8  L9
  [0,  0,  0,  0,  0,  0,  0,  0,  0], // placeholder index 0
  [2,  0,  0,  0,  0,  0,  0,  0,  0], // 1
  [3,  0,  0,  0,  0,  0,  0,  0,  0], // 2
  [4,  2,  0,  0,  0,  0,  0,  0,  0], // 3
  [4,  3,  0,  0,  0,  0,  0,  0,  0], // 4
  [4,  3,  2,  0,  0,  0,  0,  0,  0], // 5
  [4,  3,  3,  0,  0,  0,  0,  0,  0], // 6
  [4,  3,  3,  1,  0,  0,  0,  0,  0], // 7
  [4,  3,  3,  2,  0,  0,  0,  0,  0], // 8
  [4,  3,  3,  3,  1,  0,  0,  0,  0], // 9
  [4,  3,  3,  3,  2,  0,  0,  0,  0], // 10
  [4,  3,  3,  3,  2,  1,  0,  0,  0], // 11
  [4,  3,  3,  3,  2,  1,  0,  0,  0], // 12
  [4,  3,  3,  3,  2,  1,  1,  0,  0], // 13
  [4,  3,  3,  3,  2,  1,  1,  0,  0], // 14
  [4,  3,  3,  3,  2,  1,  1,  1,  0], // 15
  [4,  3,  3,  3,  2,  1,  1,  1,  0], // 16
  [4,  3,  3,  3,  2,  1,  1,  1,  1], // 17
  [4,  3,  3,  3,  3,  1,  1,  1,  1], // 18
  [4,  3,  3,  3,  3,  2,  1,  1,  1], // 19
  [4,  3,  3,  3,  3,  2,  2,  1,  1], // 20
];

// Half casters: Paladin, Ranger (no slots at level 1)
const HALF = [
  [0,  0,  0,  0,  0,  0,  0,  0,  0], // 0
  [0,  0,  0,  0,  0,  0,  0,  0,  0], // 1
  [2,  0,  0,  0,  0,  0,  0,  0,  0], // 2
  [3,  0,  0,  0,  0,  0,  0,  0,  0], // 3
  [3,  0,  0,  0,  0,  0,  0,  0,  0], // 4
  [4,  2,  0,  0,  0,  0,  0,  0,  0], // 5
  [4,  2,  0,  0,  0,  0,  0,  0,  0], // 6
  [4,  3,  0,  0,  0,  0,  0,  0,  0], // 7
  [4,  3,  0,  0,  0,  0,  0,  0,  0], // 8
  [4,  3,  2,  0,  0,  0,  0,  0,  0], // 9
  [4,  3,  2,  0,  0,  0,  0,  0,  0], // 10
  [4,  3,  3,  0,  0,  0,  0,  0,  0], // 11
  [4,  3,  3,  0,  0,  0,  0,  0,  0], // 12
  [4,  3,  3,  1,  0,  0,  0,  0,  0], // 13
  [4,  3,  3,  1,  0,  0,  0,  0,  0], // 14
  [4,  3,  3,  2,  0,  0,  0,  0,  0], // 15
  [4,  3,  3,  2,  0,  0,  0,  0,  0], // 16
  [4,  3,  3,  3,  1,  0,  0,  0,  0], // 17
  [4,  3,  3,  3,  1,  0,  0,  0,  0], // 18
  [4,  3,  3,  3,  2,  0,  0,  0,  0], // 19
  [4,  3,  3,  3,  2,  0,  0,  0,  0], // 20
];

const FULL_CASTERS  = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']);
const HALF_CASTERS  = new Set(['Paladin', 'Ranger']);
// Warlock handled separately via classResources (Pact Magic Slots)
// Artificer, Arcane Trickster, Eldritch Knight omitted (subclass-dependent)

/**
 * Returns max spell slots per level [L1..L9] for a given class and character level.
 * Non-casters return all zeros.
 */
export function getSpellSlots(cls, level) {
  const lv = Math.max(1, Math.min(20, parseInt(level) || 1));
  if (FULL_CASTERS.has(cls))  return FULL[lv];
  if (HALF_CASTERS.has(cls))  return HALF[lv];
  return [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

export function isCaster(cls) {
  return FULL_CASTERS.has(cls) || HALF_CASTERS.has(cls) || cls === 'Warlock';
}

// Convert getSpellSlots array to { [slotLevel]: { total, used } } format
// used by character.spellSlots. Preserves existing used counts.
export function buildSpellSlotMap(cls, level, existing = {}) {
  const slots = getSpellSlots(cls, level);
  const result = {};
  slots.forEach((total, i) => {
    if (total === 0) return;
    const slotLevel = i + 1;
    result[slotLevel] = {
      total,
      used: Math.min(existing[slotLevel]?.used ?? 0, total),
    };
  });
  return Object.keys(result).length > 0 ? result : null;
}

// Slot level accent colors
export const SLOT_COLORS = [
  '#aaa',     // L1 - white/silver
  '#2ecc71',  // L2 - green
  '#3498db',  // L3 - blue
  '#9b59b6',  // L4 - purple
  '#f1c40f',  // L5 - gold
  '#e67e22',  // L6 - orange
  '#e74c3c',  // L7 - red
  '#c0392b',  // L8 - dark red
  '#8e44ad',  // L9 - deep purple
];
