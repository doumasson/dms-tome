// src/lib/worldInteractions.js
// World interaction skill checks: pickpocket, lockpick, search, disarm trap
import { abilityMod, profBonus, SKILL_ABILITIES, getSkillBonus } from './derivedStats.js'

/* ── Interaction types ─────────────────────────────────────────── */

/**
 * @typedef {Object} Interactable
 * @property {string} id
 * @property {'chest'|'locked_door'|'searchable'} type
 * @property {{x:number, y:number}} position
 * @property {number} [dc] - DC for Thieves' Tools / Investigation
 * @property {boolean} [locked] - whether it requires lockpicking
 * @property {boolean} [opened] - whether already opened/searched
 * @property {string} [lootTable] - 'common'|'uncommon'|'rare'
 * @property {string} [label]
 */

/* ── Loot tables for chests/searchable spots ───────────────────── */

const CHEST_LOOT = {
  common: [
    { name: 'Healing Potion', type: 'consumable', effect: 'Restores 2d4+2 HP', weight: 0.5, value: 50 },
    { name: 'Torch', type: 'gear', effect: 'Bright light 20ft, dim 20ft more', weight: 1, value: 1 },
    { name: 'Rope (50 ft)', type: 'gear', effect: 'Hempen rope', weight: 10, value: 1 },
    { name: 'Antitoxin', type: 'consumable', effect: 'Advantage on poison saves for 1 hour', weight: 0, value: 50 },
    { name: 'Caltrops', type: 'gear', effect: 'Covers 5ft square, DEX DC 15 or 1 piercing + speed 0', weight: 2, value: 1 },
  ],
  uncommon: [
    { name: 'Greater Healing Potion', type: 'consumable', effect: 'Restores 4d4+4 HP', weight: 0.5, value: 150 },
    { name: 'Scroll of Identify', type: 'scroll', effect: 'Cast Identify once', weight: 0, value: 100 },
    { name: 'Potion of Fire Resistance', type: 'consumable', effect: 'Fire resistance for 1 hour', weight: 0.5, value: 200 },
    { name: "Thieves' Tools", type: 'tool', effect: '+0 lockpicking, +proficiency if proficient', weight: 1, value: 25 },
    { name: 'Alchemist\'s Fire', type: 'consumable', effect: 'Ranged attack, 1d4 fire/turn', weight: 1, value: 50 },
  ],
  rare: [
    { name: 'Superior Healing Potion', type: 'consumable', effect: 'Restores 8d4+8 HP', weight: 0.5, value: 500 },
    { name: 'Scroll of Fireball', type: 'scroll', effect: 'Cast Fireball (3rd level) once', weight: 0, value: 300 },
    { name: 'Potion of Invisibility', type: 'consumable', effect: 'Invisible for 1 hour', weight: 0.5, value: 500 },
    { name: 'Potion of Speed', type: 'consumable', effect: 'Haste for 1 minute', weight: 0.5, value: 400 },
    { name: 'Elixir of Health', type: 'consumable', effect: 'Cure disease, poison, blinded, deafened, paralyzed', weight: 0.5, value: 350 },
  ],
}

const SEARCH_FINDS = [
  { name: 'Loose Coins', type: 'gold', goldAmount: () => Math.floor(Math.random() * 10) + 1 },
  { name: 'Hidden Gem', type: 'valuables', effect: 'Worth 25 gp', value: 25 },
  { name: 'Old Map Fragment', type: 'quest', effect: 'Reveals area details to DM' },
  { name: 'Healer\'s Kit', type: 'gear', effect: '10 uses, stabilize dying creature', weight: 3, value: 5 },
  { name: 'Vial of Poison', type: 'consumable', effect: 'Coat weapon: +1d4 poison for 1 minute', weight: 0, value: 100 },
]

const PICKPOCKET_LOOT = [
  { name: 'Loose Coins', type: 'gold', goldAmount: () => Math.floor(Math.random() * 15) + 1 },
  { name: 'Small Key', type: 'key', effect: 'Opens something nearby...' },
  { name: 'Crumpled Note', type: 'quest', effect: 'Contains a clue or rumor' },
  { name: 'Silver Ring', type: 'valuables', effect: 'Worth 10 gp', value: 10 },
]

/* ── Gold amounts for chests by tier ───────────────────────────── */

function rollChestGold(tier) {
  switch (tier) {
    case 'rare':     return Math.floor(Math.random() * 50) + 30
    case 'uncommon': return Math.floor(Math.random() * 20) + 10
    default:         return Math.floor(Math.random() * 10) + 2
  }
}

/* ── Skill check resolution ────────────────────────────────────── */

/**
 * Roll a d20 + skill bonus. Returns { d20, total, pass, margin }.
 */
export function rollSkillCheck(character, skill, dc) {
  const stats = character.stats || character.abilityScores || {}
  const proficientSkills = character.skills || []
  const expertiseSkills = character.expertiseSkills || []
  const level = character.level || 1
  const { bonus } = getSkillBonus(stats, skill, proficientSkills, expertiseSkills, level)
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + bonus
  return { d20, bonus, total, pass: total >= dc, margin: total - dc }
}

/**
 * Calculate NPC passive Perception.
 */
export function npcPassivePerception(npc) {
  const wis = npc.stats?.wis ?? 10
  return 10 + Math.floor((wis - 10) / 2)
}

/* ── Pickpocket ────────────────────────────────────────────────── */

/**
 * Attempt to pickpocket an NPC.
 * @param {object} character - player character
 * @param {object} npc - NPC being pickpocketed
 * @returns {{ success, roll, loot, npcReaction }}
 */
export function attemptPickpocket(character, npc) {
  const dc = npcPassivePerception(npc)
  const roll = rollSkillCheck(character, 'Sleight of Hand', dc)

  if (roll.pass) {
    const lootPool = PICKPOCKET_LOOT
    const item = { ...lootPool[Math.floor(Math.random() * lootPool.length)] }
    if (item.goldAmount) item.gold = item.goldAmount()
    return {
      success: true,
      roll,
      dc,
      loot: item,
      npcReaction: null,
    }
  }

  // Failed — NPC notices
  const reactions = ['hostile', 'alarmed', 'disappointed']
  const severity = roll.margin <= -5 ? 'hostile' : roll.margin <= -2 ? 'alarmed' : 'disappointed'
  return {
    success: false,
    roll,
    dc,
    loot: null,
    npcReaction: severity,
  }
}

/* ── Lockpick ──────────────────────────────────────────────────── */

/**
 * Attempt to pick a lock.
 * @param {object} character
 * @param {object} interactable - the locked object
 * @returns {{ success, roll, broken }}
 */
export function attemptLockpick(character, interactable) {
  const dc = interactable.dc || 15
  // Check if character has Thieves' Tools proficiency
  const hasTools = (character.toolProficiencies || []).some(t =>
    t.toLowerCase().includes('thieves')
  ) || (character.class === 'Rogue')

  const roll = rollSkillCheck(character, 'Sleight of Hand', dc)
  // Rogues and those with Thieves' Tools get +2 (tool proficiency)
  if (hasTools) {
    roll.total += 2
    roll.bonus += 2
    roll.pass = roll.total >= dc
    roll.margin = roll.total - dc
  }

  return {
    success: roll.pass,
    roll,
    dc,
    hasTools,
    broken: !roll.pass && roll.d20 === 1, // nat 1 breaks tools
  }
}

/**
 * Attempt to force open a lock with STR.
 */
export function attemptForceOpen(character, interactable) {
  const dc = (interactable.dc || 15) + 3 // harder than picking
  const roll = rollSkillCheck(character, 'Athletics', dc)
  return { success: roll.pass, roll, dc, loud: true }
}

/* ── Search ────────────────────────────────────────────────────── */

/**
 * Search the nearby area for hidden items/secrets.
 * @param {object} character
 * @param {number} dc - Investigation DC
 * @returns {{ success, roll, finds }}
 */
export function attemptSearch(character, dc = 12) {
  const roll = rollSkillCheck(character, 'Investigation', dc)
  if (roll.pass) {
    const numFinds = roll.margin >= 5 ? 2 : 1
    const finds = []
    const pool = [...SEARCH_FINDS]
    for (let i = 0; i < numFinds && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      const item = { ...pool.splice(idx, 1)[0] }
      if (item.goldAmount) item.gold = item.goldAmount()
      finds.push(item)
    }
    return { success: true, roll, dc, finds }
  }
  return { success: false, roll, dc, finds: [] }
}

/* ── Chest loot generation ─────────────────────────────────────── */

/**
 * Generate loot from a chest.
 * @param {string} tier - 'common'|'uncommon'|'rare'
 * @returns {{ gold: number, items: object[] }}
 */
export function generateChestLoot(tier = 'common') {
  const pool = CHEST_LOOT[tier] || CHEST_LOOT.common
  const gold = rollChestGold(tier)
  const numItems = tier === 'rare' ? 2 : 1
  const items = []
  const available = [...pool]
  for (let i = 0; i < numItems && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    items.push({ ...available.splice(idx, 1)[0] })
  }
  return { gold, items }
}

/* ── Interactable generation for area builder ──────────────────── */

/**
 * Generate interactable objects for an area based on its theme and buildings.
 * Called by areaBuilder after placing buildings.
 */
export function generateInteractables(brief, buildings, positions, width, height, cellBlocked, seed = 0) {
  const interactables = []
  const rng = seedRng(seed)
  const isDungeon = ['dungeon', 'cave', 'crypt', 'sewer'].includes(brief.theme)

  // Place chests in some buildings / POI locations
  const pois = brief.pois || []
  for (const poi of pois) {
    const pos = positions[poi.label || poi.id]
    if (!pos) continue
    const chunk = poi.chunk || {}

    // Dungeons get more chests; villages occasionally
    const chestChance = isDungeon ? 0.4 : 0.15
    if (rng() < chestChance) {
      // Place chest inside the POI area (offset from edges)
      const cx = pos.x + Math.floor((chunk.width || 6) / 2) + (rng() > 0.5 ? 1 : -1)
      const cy = pos.y + Math.floor((chunk.height || 6) / 2) + 1
      if (cx >= 0 && cy >= 0 && cx < width && cy < height && !cellBlocked[cy * width + cx]) {
        const tier = isDungeon
          ? (rng() < 0.2 ? 'rare' : rng() < 0.5 ? 'uncommon' : 'common')
          : 'common'
        const locked = isDungeon ? rng() < 0.5 : rng() < 0.2
        interactables.push({
          id: `chest_${poi.label || poi.id}`,
          type: 'chest',
          position: { x: cx, y: cy },
          locked,
          dc: locked ? (tier === 'rare' ? 18 : tier === 'uncommon' ? 15 : 12) : 0,
          lootTable: tier,
          opened: false,
          label: locked ? 'Locked Chest' : 'Chest',
        })
      }
    }

    // Searchable spots in some rooms
    const searchChance = isDungeon ? 0.35 : 0.1
    if (rng() < searchChance) {
      const sx = pos.x + 1 + Math.floor(rng() * Math.max(1, (chunk.width || 4) - 2))
      const sy = pos.y + 1 + Math.floor(rng() * Math.max(1, (chunk.height || 4) - 2))
      if (sx >= 0 && sy >= 0 && sx < width && sy < height && !cellBlocked[sy * width + sx]) {
        interactables.push({
          id: `search_${poi.label || poi.id}`,
          type: 'searchable',
          position: { x: sx, y: sy },
          dc: 10 + Math.floor(rng() * 6), // DC 10-15
          opened: false,
          label: isDungeon ? 'Suspicious Rubble' : 'Cluttered Shelves',
        })
      }
    }
  }

  return interactables
}

/* ── Seeded RNG (simple but deterministic) ─────────────────────── */

function seedRng(seed) {
  let s = seed | 0
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}
