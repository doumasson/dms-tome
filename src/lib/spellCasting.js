// src/lib/spellCasting.js
import { CLASSES } from '../data/classes'
import { SPELLS } from '../data/spells'
import { isCaster } from './spellSlots'

const PROF_TABLE = [2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6]

export function profBonus(level) {
  return PROF_TABLE[Math.min(level, 20) - 1] || 2
}

export function getSpellAbility(className) {
  const cls = CLASSES[className]
  if (!cls?.spellAbility) return null
  return cls.spellAbility.toLowerCase()
}

export function getSpellSaveDC(char) {
  const ability = getSpellAbility(char.class)
  if (!ability) return 10
  const score = char.stats?.[ability] || 10
  const mod = Math.floor((score - 10) / 2)
  return 8 + profBonus(char.level || 1) + mod
}

export function getSpellAttackBonus(char) {
  const ability = getSpellAbility(char.class)
  if (!ability) return 0
  const score = char.stats?.[ability] || 10
  const mod = Math.floor((score - 10) / 2)
  return profBonus(char.level || 1) + mod
}

// Prepared casters get access to their entire class spell list (they pick daily)
const PREPARED_CASTERS = new Set(['Cleric', 'Druid', 'Paladin'])

/**
 * Get all spells available to a character.
 * ALL casters (including prepared casters) only see spells in char.spells[].
 * Players select their prepared spells at character creation and level-up.
 */
export function getAvailableSpells(char) {
  if (!isCaster(char.class)) return []
  const knownNames = new Set((char.spells || []).map(s => typeof s === 'string' ? s : s.name))
  if (knownNames.size === 0) return []
  return SPELLS.filter(s => knownNames.has(s.name))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

function maxSpellLevelForClass(cls, charLevel) {
  // Full casters: spell level = ceil(charLevel / 2), max 9
  const fullCasters = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']
  if (fullCasters.includes(cls)) return Math.min(9, Math.ceil(charLevel / 2))
  // Half casters: spell level = ceil((charLevel - 1) / 4), max 5
  const halfCasters = ['Paladin', 'Ranger']
  if (halfCasters.includes(cls)) return Math.min(5, Math.max(0, Math.ceil((charLevel - 1) / 4)))
  // Third casters
  if (cls === 'Eldritch Knight' || cls === 'Arcane Trickster') return Math.min(4, Math.max(0, Math.ceil((charLevel - 2) / 6)))
  return 0
}

export function canCastSpell(spell, spellSlots) {
  if (spell.level === 0) return true
  if (!spellSlots) return false
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) return true
  }
  return false
}

export function getLowestAvailableSlot(spell, spellSlots) {
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) return lvl
  }
  return null
}

export function getAvailableSlotLevels(spell, spellSlots) {
  const levels = []
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = spellSlots[lvl]
    if (slot && slot.used < slot.total) levels.push(lvl)
  }
  return levels
}

export function getUpcastDamage(spell, castLevel) {
  const base = spell.damage?.dice
  if (!base) return null
  const scaling = spell.damage?.scalingDicePerLevel
  if (!scaling || castLevel <= spell.level) return base
  const baseMatch = base.match(/^(\d+)(d\d+)$/)
  const scaleMatch = scaling.match(/^(\d+)(d\d+)$/)
  if (!baseMatch || !scaleMatch) return base
  const extraDice = parseInt(scaleMatch[1]) * (castLevel - spell.level)
  return `${parseInt(baseMatch[1]) + extraDice}${baseMatch[2]}`
}

export function getCantripScaling(charLevel) {
  if (charLevel >= 17) return 3
  if (charLevel >= 11) return 2
  if (charLevel >= 5) return 1
  return 0
}
