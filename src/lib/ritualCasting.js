/**
 * Ritual Casting System
 * Allows certain spells to be cast outside of combat without using spell slots.
 *
 * D&D 5e Rules:
 * - Spell must have ritual tag
 * - Caster must have spell prepared (or know it for non-prep casters)
 * - Ritual takes 10 minutes + regular casting time
 * - Caster must have ritual casting feature (Wizard, Cleric ritual domain, etc.)
 */

import { CLASSES } from '../data/classes'
import { SPELLS } from '../data/spells'
import { isCaster } from './spellSlots'
import { getPreparedSpells } from './spellPreparation'
import { isPreparationCaster } from './spellPreparation'

/**
 * Check if a character can cast spells as rituals
 * Wizards, Clerics, Druids, Bards, Paladins, Rangers can cast rituals
 * Sorcerers and Warlocks cannot (no ritual casting feature)
 */
export function canCastRituals(character) {
  if (!character || !character.class) return false
  const cls = character.class
  // Sorcerers and Warlocks cannot cast rituals (5e rules)
  if (cls === 'Sorcerer' || cls === 'Warlock') return false
  // Monks don't have spellcasting
  if (cls === 'Monk') return false
  // Full/half casters have ritual casting: Wizard, Cleric, Druid, Bard, Paladin, Ranger
  return isCaster(cls)
}

/**
 * Get rituals a character can cast
 * Returns spells that are:
 * 1. Marked as ritual spells
 * 2. Character can access (prepared or known)
 * 3. Character has time to cast
 */
export function getAvailableRituals(character) {
  if (!canCastRituals(character)) return []

  const allSpells = SPELLS.filter(s => s.ritual === true)

  // For prep casters, only return spells they've prepared
  if (isPreparationCaster(character.class)) {
    const prepared = getPreparedSpells(character)
    if (!prepared || prepared.length === 0) return []
    return allSpells.filter(s =>
      prepared.some(p =>
        (typeof p === 'string' ? p === s.name : p.name === s.name) ||
        (typeof p === 'string' ? p === s.spellId : p.spellId === s.spellId)
      )
    )
  }

  // For non-prep casters, check known spells
  const known = character.spells || []
  return allSpells.filter(s =>
    known.some(k =>
      (typeof k === 'string' ? k === s.name : k.name === s.name) ||
      (typeof k === 'string' ? k === s.spellId : k.spellId === s.spellId)
    )
  )
}

/**
 * Validate that a character can cast a specific ritual
 */
export function canCastRitual(character, spellName) {
  const rituals = getAvailableRituals(character)
  return rituals.some(s => s.name === spellName || s.spellId === spellName)
}

/**
 * Calculate ritual casting time (10 minutes + spell casting time)
 * For simplicity in exploration mode, we assume base casting time is 1 action = 6 seconds
 * So ritual takes ~10 minutes
 */
export function getRitualCastingTime(spell) {
  if (!spell) return null
  // Spells with 1 action or bonus action take ~10 minutes as ritual
  // Spells with longer casting times add that time
  // For game purposes, all rituals take "10 minutes" in exploration
  return '10 minutes'
}

/**
 * Describe a ritual spell for UI
 */
export function describeRitual(spell) {
  if (!spell) return 'Unknown ritual'
  return `${spell.name} (ritual, ${getRitualCastingTime(spell)})`
}

/**
 * Track ritual casting (for time passage in exploration)
 * Returns object with ritual name, character name, time cost
 */
export function createRitualCast(character, spell) {
  return {
    character: character.name,
    spell: spell.name,
    time: 10, // minutes
    success: true,
    timestamp: Date.now(),
  }
}
