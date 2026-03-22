// src/lib/derivedStats.js
// Computes character derived stats from base stats + equipped item modifiers.

import { computeAcFromEquipped } from '../data/equipment.js'
import { CLASSES } from '../data/classes.js'

/**
 * Returns the numeric modifier for a D&D ability score.
 * @param {number} score
 * @returns {number}
 */
export function abilityMod(score) {
  return Math.floor((score - 10) / 2)
}

/**
 * Proficiency bonus by character level (5e standard).
 * @param {number} level
 * @returns {number}
 */
export function profBonus(level) {
  return Math.ceil(level / 4) + 1
}

/**
 * Skill → ability mapping (5e SRD).
 */
export const SKILL_ABILITIES = {
  'Athletics': 'str',
  'Acrobatics': 'dex', 'Sleight of Hand': 'dex', 'Stealth': 'dex',
  'Arcana': 'int', 'History': 'int', 'Investigation': 'int', 'Nature': 'int', 'Religion': 'int',
  'Animal Handling': 'wis', 'Insight': 'wis', 'Medicine': 'wis', 'Perception': 'wis', 'Survival': 'wis',
  'Deception': 'cha', 'Intimidation': 'cha', 'Performance': 'cha', 'Persuasion': 'cha',
}

/**
 * Returns the saving throw proficiencies for a class as lowercase ability keys.
 * e.g. Fighter → ['str', 'con']
 * @param {string} className
 * @returns {string[]}
 */
export function getSaveProficiencies(className) {
  const cls = CLASSES[className]
  if (!cls?.savingThrows) return []
  return cls.savingThrows.map(s => s.toLowerCase())
}

/**
 * Computes saving throw bonuses for all 6 abilities, applying proficiency where the class grants it.
 * @param {{ str: number, dex: number, con: number, int: number, wis: number, cha: number }} stats - effective ability scores
 * @param {string} className
 * @param {number} level
 * @returns {{ str: number, dex: number, con: number, int: number, wis: number, cha: number }}
 */
export function getSaveBonuses(stats, className, level) {
  const prof = profBonus(level)
  const saveProfs = getSaveProficiencies(className)
  const bonuses = {}
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const mod = abilityMod(stats[key] || 10)
    bonuses[key] = mod + (saveProfs.includes(key) ? prof : 0)
  }
  return bonuses
}

/**
 * Computes the bonus for a skill check, accounting for proficiency and expertise.
 * @param {{ str: number, dex: number, con: number, int: number, wis: number, cha: number }} stats
 * @param {string} skillName - e.g. 'Stealth'
 * @param {string[]} proficientSkills - skills the character is proficient in
 * @param {string[]} expertiseSkills - skills the character has expertise in (double proficiency)
 * @param {number} level
 * @returns {{ bonus: number, proficient: boolean, expertise: boolean }}
 */
export function getSkillBonus(stats, skillName, proficientSkills = [], expertiseSkills = [], level = 1) {
  const ability = SKILL_ABILITIES[skillName] || 'str'
  const mod = abilityMod(stats[ability] || 10)
  const prof = profBonus(level)
  const hasExpertise = expertiseSkills.includes(skillName)
  const hasProficiency = hasExpertise || proficientSkills.includes(skillName)
  const bonus = mod + (hasExpertise ? prof * 2 : hasProficiency ? prof : 0)
  return { bonus, proficient: hasProficiency, expertise: hasExpertise }
}

/**
 * Sums modifier values for all items that have a modifier matching `stat`.
 * Items are expected to have a `modifiers` array of `{ stat, value }` objects.
 *
 * @param {Array<{ modifiers?: Array<{ stat: string, value: number }> }>} items
 * @param {string} stat - The stat key to sum (e.g. 'ac', 'speed')
 * @returns {number}
 */
export function sumModifiers(items, stat) {
  let total = 0
  for (const item of items) {
    if (!item.modifiers) continue
    for (const mod of item.modifiers) {
      if (mod.stat === stat) total += mod.value
    }
  }
  return total
}

/**
 * Resolves which equipped items are eligible to contribute modifiers.
 * Items that require attunement are only active if their instanceId is in
 * `attunedItems`.
 *
 * @param {Record<string, object>} equippedItems
 * @param {string[]} attunedItems
 * @returns {object[]} Active items
 */
function activeItems(equippedItems, attunedItems) {
  return Object.values(equippedItems ?? {}).filter(item => {
    if (!item) return false
    return !item.requiresAttunement || attunedItems.includes(item.instanceId)
  })
}

/**
 * Computes all derived stats for a character.
 *
 * @param {{
 *   stats: { str: number, dex: number, con: number, int: number, wis: number, cha: number },
 *   equippedItems: Record<string, object>,
 *   attunedItems: string[],
 *   level: number,
 *   class: string,
 *   speed: number,
 * }} character
 *
 * @returns {{
 *   ac: number,
 *   attackBonus: number,
 *   damageBonus: number,
 *   saveBonus: number,
 *   speed: number,
 *   hpBonus: number,
 *   effectiveStats: Record<string, number>,
 * }}
 */
export function computeDerivedStats(character) {
  const { stats, equippedItems = {}, attunedItems = [], level = 1, speed = 30 } = character

  // ── Effective stats (base + any stat-boosting item modifiers) ──────────────
  const active = activeItems(equippedItems, attunedItems)

  const effectiveStats = {}
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    effectiveStats[key] = stats[key] + sumModifiers(active, key)
  }

  // ── AC ────────────────────────────────────────────────────────────────────
  // Base AC from armor/shield via the shared equipment helper, then add any
  // modifier-based AC bonuses (rings of protection, etc.) from active items.
  const baseAc = computeAcFromEquipped(equippedItems, effectiveStats)
  const acFromMods = sumModifiers(active, 'ac')

  // Shield modifiers (e.g. a +1 shield) are already included in baseAC via
  // computeAcFromEquipped only for the flat +2; extra mods still come through
  // sumModifiers so we must not double-count the base shield bonus.
  // computeAcFromEquipped adds a flat +2 for shields; per-item modifiers on the
  // shield item itself flow through sumModifiers separately — that's correct.
  const ac = baseAc + acFromMods

  // ── Attack bonus (STR or DEX mod + proficiency) ───────────────────────────
  const strMod = abilityMod(effectiveStats.str)
  const dexMod = abilityMod(effectiveStats.dex)
  const prof = profBonus(level)
  const attackBonus = Math.max(strMod, dexMod) + prof

  // ── Damage bonus (primary ability modifier) ───────────────────────────────
  const damageBonus = Math.max(strMod, dexMod) + sumModifiers(active, 'damage')

  // ── Save bonus (CON for concentration; generalised as prof + CON mod) ─────
  const conMod = abilityMod(effectiveStats.con)
  const saveBonus = conMod + prof + sumModifiers(active, 'saveBonus')

  // ── Speed ─────────────────────────────────────────────────────────────────
  const effectiveSpeed = speed + sumModifiers(active, 'speed')

  // ── HP bonus (extra HP from items, e.g. Amulet of Health) ────────────────
  const hpBonus = sumModifiers(active, 'hp')

  return {
    ac,
    attackBonus,
    damageBonus,
    saveBonus,
    speed: effectiveSpeed,
    hpBonus,
    effectiveStats,
  }
}
