/**
 * Spell Preparation System — Prepared casters select spells at rest.
 * Clerics, Druids, Monks (4th level), Paladins select spells from available list.
 * Wizards prepare from spellbook. Sorcerers/Bards don't prepare (always know spells).
 */

/**
 * Check if class uses spell preparation.
 * @param {string} className
 * @returns {boolean}
 */
export function isPreparationCaster(className) {
  return ['Cleric', 'Druid', 'Monk', 'Paladin', 'Wizard'].includes(className);
}

/**
 * Calculate how many spells a caster can prepare.
 * Formula: Class level + ability modifier (varies by class)
 * @param {string} className
 * @param {number} level
 * @param {number} abilityModifier - WIS for Cleric/Druid/Monk, CHA for Paladin, INT for Wizard
 * @returns {number} Number of spells that can be prepared
 */
export function calculatePreparedSpellCount(className, level, abilityModifier = 0) {
  if (!isPreparationCaster(className)) return 0;

  // Base formula: class level + ability modifier
  const baseCount = level + abilityModifier;

  // Minimum of 1
  return Math.max(1, baseCount);
}

/**
 * Get spell list available for preparation based on class and level.
 * Returns only spells the class can access at this level.
 * @param {string} className
 * @param {number} level
 * @param {array} allSpells - All available spells
 * @returns {array} Spells available for preparation
 */
export function getAvailableSpellsForPreparation(className, level, allSpells = []) {
  if (!isPreparationCaster(className)) return [];

  // Filter spells by:
  // 1. Class can access this spell
  // 2. Spell level <= character level (minimum 1st level at char level 1)
  // 3. Not higher than 9th level spells

  const classSpells = allSpells.filter(s => {
    if (!s.classes?.includes(className)) return false;
    if (s.level === 0) return true; // Cantrips always available
    if (s.level > 9) return false;
    if (level < s.level) return false; // Can't prepare spells above available spell levels
    return true;
  });

  // Separate cantrips and leveled spells
  const cantrips = classSpells.filter(s => s.level === 0);
  const leveledSpells = classSpells.filter(s => s.level > 0);

  return {
    cantrips,
    leveledSpells,
    total: classSpells,
  };
}

/**
 * Validate prepared spells selection.
 * @param {string} className
 * @param {number} level
 * @param {number} abilityModifier
 * @param {array} selectedSpells - Spell IDs selected for preparation
 * @param {array} allSpells
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePreparedSpells(className, level, abilityModifier, selectedSpells, allSpells) {
  const errors = [];

  const available = getAvailableSpellsForPreparation(className, level, allSpells);
  const maxPrepared = calculatePreparedSpellCount(className, level, abilityModifier);

  // Check if any selected spells are not available
  const selectedIds = selectedSpells.map(s => typeof s === 'string' ? s : s.id);
  for (const spellId of selectedIds) {
    const spell = allSpells.find(s => s.spellId === spellId);
    if (!spell) {
      errors.push(`Unknown spell: ${spellId}`);
      continue;
    }

    if (!available.total.find(s => s.spellId === spellId)) {
      errors.push(`${spell.name} is not available for ${className} to prepare`);
    }
  }

  // Check if count exceeds max
  if (selectedIds.length > maxPrepared) {
    errors.push(`Too many spells prepared. Maximum: ${maxPrepared}, Selected: ${selectedIds.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    maxPrepared,
    selectedCount: selectedIds.length,
  };
}

/**
 * Get current prepared spells for a character.
 * @param {object} character
 * @returns {array} Prepared spell objects
 */
export function getPreparedSpells(character) {
  if (!isPreparationCaster(character.class)) {
    return character.spells || []; // Non-prep casters know all their spells
  }

  return character.preparedSpells || [];
}

/**
 * Set prepared spells for a character.
 * @param {object} character
 * @param {array} spellIds - IDs of spells to prepare
 * @returns {object} Updated character with preparedSpells set
 */
export function setPreparedSpells(character, spellIds) {
  if (!isPreparationCaster(character.class)) {
    return character; // Non-prep casters can't change prepared spells
  }

  return {
    ...character,
    preparedSpells: spellIds.map(id => {
      // Find spell from character's spell list
      const spell = character.spells?.find(s => s.spellId === id || s.id === id);
      return spell || { id, spellId: id };
    }),
  };
}

/**
 * Get description of spell preparation status for UI.
 * @param {string} className
 * @param {number} level
 * @param {number} preparedCount
 * @param {number} maxPrepared
 * @returns {string} Status description
 */
export function describeSpellPrepStatus(className, level, preparedCount, maxPrepared) {
  if (!isPreparationCaster(className)) {
    return `${className} knows spells (not preparation).`;
  }

  return `${className} has ${preparedCount}/${maxPrepared} spells prepared (level ${level}).`;
}

/**
 * Check if spell is prepared and available for casting.
 * @param {object} character
 * @param {string} spellId
 * @returns {boolean}
 */
export function isSpellPrepared(character, spellId) {
  if (!isPreparationCaster(character.class)) {
    // Non-prep casters always have their spells available
    return character.spells?.some(s => s.spellId === spellId || s.id === spellId) || false;
  }

  // Prep casters only have prepared spells available
  return character.preparedSpells?.some(s => s.spellId === spellId || s.id === spellId) || false;
}
