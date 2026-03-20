// src/lib/derivedStats.js
// Computes character derived stats from base stats + equipped item modifiers.

import { computeAcFromEquipped } from '../data/equipment.js'

/**
 * Returns the numeric modifier for a D&D ability score.
 * @param {number} score
 * @returns {number}
 */
function abilityMod(score) {
  return Math.floor((score - 10) / 2)
}

/**
 * Proficiency bonus by character level (5e standard).
 * @param {number} level
 * @returns {number}
 */
function profBonus(level) {
  return Math.ceil(level / 4) + 1
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
