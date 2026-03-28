/**
 * encounterTemplateResolver.js
 * Resolves encounter zone enemy templates into concrete enemy arrays
 * based on current party size and average level.
 */

// Base enemy stat table — common SRD 5.1 enemies
const BASE_ENEMY_STATS = {
  'Goblin':          { hp: 7,  ac: 15, speed: 30, cr: 0.25, str: 8,  dex: 14, con: 10, int: 10, wis: 8,  cha: 8,  attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2', type: 'melee' }] },
  'Goblin Boss':     { hp: 21, ac: 17, speed: 30, cr: 1,    str: 10, dex: 14, con: 10, int: 10, wis: 8,  cha: 10, attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2', type: 'melee' }, { name: 'Javelin', bonus: '+2', damage: '1d6', type: 'ranged' }] },
  'Skeleton':        { hp: 13, ac: 13, speed: 30, cr: 0.25, str: 10, dex: 14, con: 15, int: 6,  wis: 8,  cha: 5,  attacks: [{ name: 'Shortsword', bonus: '+4', damage: '1d6+2', type: 'melee' }, { name: 'Shortbow', bonus: '+4', damage: '1d6+2', type: 'ranged' }] },
  'Zombie':          { hp: 22, ac: 8,  speed: 20, cr: 0.25, str: 13, dex: 6,  con: 16, int: 3,  wis: 6,  cha: 5,  attacks: [{ name: 'Slam', bonus: '+3', damage: '1d6+1', type: 'melee' }] },
  'Wolf':            { hp: 11, ac: 13, speed: 40, cr: 0.25, str: 12, dex: 15, con: 12, int: 3,  wis: 12, cha: 6,  attacks: [{ name: 'Bite', bonus: '+4', damage: '2d4+2', type: 'melee' }] },
  'Bandit':          { hp: 11, ac: 12, speed: 30, cr: 0.125,str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10, attacks: [{ name: 'Scimitar', bonus: '+3', damage: '1d6+1', type: 'melee' }, { name: 'Light Crossbow', bonus: '+3', damage: '1d8+1', type: 'ranged' }] },
  'Bandit Captain':  { hp: 65, ac: 15, speed: 30, cr: 2,    str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14, attacks: [{ name: 'Scimitar', bonus: '+5', damage: '1d6+3', type: 'melee' }, { name: 'Dagger', bonus: '+5', damage: '1d4+3', type: 'melee' }] },
  'Orc':             { hp: 15, ac: 13, speed: 30, cr: 0.5,  str: 16, dex: 12, con: 16, int: 7,  wis: 11, cha: 10, attacks: [{ name: 'Greataxe', bonus: '+5', damage: '1d12+3', type: 'melee' }, { name: 'Javelin', bonus: '+5', damage: '1d6+3', type: 'ranged' }] },
  'Ogre':            { hp: 59, ac: 11, speed: 40, cr: 2,    str: 19, dex: 8,  con: 16, int: 5,  wis: 7,  cha: 7,  attacks: [{ name: 'Greatclub', bonus: '+6', damage: '2d8+4', type: 'melee' }, { name: 'Javelin', bonus: '+6', damage: '2d6+4', type: 'ranged' }] },
  'Giant Spider':    { hp: 26, ac: 14, speed: 30, cr: 1,    str: 14, dex: 16, con: 12, int: 2,  wis: 11, cha: 4,  attacks: [{ name: 'Bite', bonus: '+5', damage: '1d8+3', type: 'melee' }] },
  'Cultist':         { hp: 9,  ac: 12, speed: 30, cr: 0.125,str: 11, dex: 12, con: 10, int: 10, wis: 11, cha: 10, attacks: [{ name: 'Scimitar', bonus: '+3', damage: '1d6+1', type: 'melee' }] },
  'Cult Fanatic':    { hp: 33, ac: 13, speed: 30, cr: 2,    str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14, attacks: [{ name: 'Dagger', bonus: '+4', damage: '1d4+2', type: 'melee' }] },
}

// CR-to-HP/AC baseline for scaling
const CR_BASELINE = {
  0.125: { hp: 10,  ac: 12 },
  0.25:  { hp: 14,  ac: 13 },
  0.5:   { hp: 20,  ac: 13 },
  1:     { hp: 30,  ac: 14 },
  2:     { hp: 50,  ac: 14 },
  3:     { hp: 70,  ac: 15 },
  4:     { hp: 90,  ac: 15 },
  5:     { hp: 110, ac: 16 },
  6:     { hp: 130, ac: 16 },
  7:     { hp: 150, ac: 16 },
  8:     { hp: 170, ac: 17 },
  9:     { hp: 190, ac: 17 },
  10:    { hp: 210, ac: 17 },
}

function getBaselineForCR(cr) {
  if (CR_BASELINE[cr]) return CR_BASELINE[cr]
  // Interpolate for non-standard CRs
  const keys = Object.keys(CR_BASELINE).map(Number).sort((a, b) => a - b)
  if (cr <= keys[0]) return CR_BASELINE[keys[0]]
  if (cr >= keys[keys.length - 1]) return CR_BASELINE[keys[keys.length - 1]]
  let lower = keys[0], upper = keys[keys.length - 1]
  for (const k of keys) {
    if (k <= cr) lower = k
    if (k >= cr && k < upper) upper = k
  }
  if (lower === upper) return CR_BASELINE[lower]
  const t = (cr - lower) / (upper - lower)
  const lo = CR_BASELINE[lower], hi = CR_BASELINE[upper]
  return {
    hp: Math.round(lo.hp + t * (hi.hp - lo.hp)),
    ac: Math.round(lo.ac + t * (hi.ac - lo.ac)),
  }
}

// Difficulty multipliers for CR
const DIFFICULTY_MULT = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.25,
  deadly: 1.5,
}

/**
 * Generate reasonable stats for an enemy not in the base table.
 */
function generateStats(name, targetCR) {
  const baseline = getBaselineForCR(targetCR)
  const statBase = Math.max(8, 10 + Math.floor(targetCR))
  const bonus = Math.max(1, Math.floor(targetCR / 2) + 2)
  const dmg = targetCR < 1 ? '1d6+1' : targetCR < 3 ? '1d8+' + bonus : '2d6+' + bonus
  return {
    hp: baseline.hp,
    ac: baseline.ac,
    speed: 30,
    cr: targetCR,
    str: statBase + 2,
    dex: statBase,
    con: statBase + 1,
    int: 10,
    wis: 10,
    cha: 10,
    attacks: [{ name: 'Attack', bonus: `+${bonus}`, damage: dmg, type: 'melee' }],
  }
}

/**
 * Scale base stats to a target CR.
 */
function scaleStats(baseStats, targetCR) {
  const baseCR = baseStats.cr || 0.25
  if (Math.abs(baseCR - targetCR) < 0.01) return { ...baseStats }

  const baseBaseline = getBaselineForCR(baseCR)
  const targetBaseline = getBaselineForCR(targetCR)

  const hpRatio = targetBaseline.hp / Math.max(1, baseBaseline.hp)
  const acDiff = targetBaseline.ac - baseBaseline.ac

  return {
    ...baseStats,
    hp: Math.max(1, Math.round(baseStats.hp * hpRatio)),
    ac: Math.max(1, baseStats.ac + acDiff),
    cr: targetCR,
    // Scale ability scores slightly
    str: Math.max(1, baseStats.str + Math.round((targetCR - baseCR) * 0.5)),
    dex: Math.max(1, baseStats.dex + Math.round((targetCR - baseCR) * 0.3)),
    con: Math.max(1, baseStats.con + Math.round((targetCR - baseCR) * 0.4)),
  }
}

/**
 * Check if an encounter zone uses the new template format.
 */
export function isTemplateFormat(encounterZone) {
  return Array.isArray(encounterZone?.enemyTemplates) && encounterZone.enemyTemplates.length > 0
}

/**
 * Resolve enemy templates into concrete enemy arrays based on party composition.
 *
 * @param {object} encounterZone - Zone with enemyTemplates array
 * @param {number} playerCount - Number of players in the party
 * @param {number} avgLevel - Average party level
 * @returns {Array} Concrete enemy objects ready for combat
 */
export function resolveEncounterTemplates(encounterZone, playerCount, avgLevel) {
  if (!isTemplateFormat(encounterZone)) return []

  const difficulty = encounterZone.difficulty || 'medium'
  const diffMult = DIFFICULTY_MULT[difficulty] || 1.0
  const templates = encounterZone.enemyTemplates
  const result = []

  for (const tmpl of templates) {
    // Determine count
    const count = tmpl.fixedCount != null
      ? tmpl.fixedCount
      : Math.max(1, Math.ceil((tmpl.countPerPlayer || 1) * playerCount))

    // Determine target CR based on role
    const role = tmpl.role || 'grunt'
    let baseCR
    switch (role) {
      case 'boss':   baseCR = avgLevel + 2; break
      case 'leader': baseCR = avgLevel * 1.0; break
      case 'minion': baseCR = Math.max(0.125, avgLevel * 0.25); break
      case 'grunt':
      default:       baseCR = avgLevel * 0.5; break
    }
    const targetCR = Math.max(0.125, Math.round(baseCR * diffMult * 4) / 4) // Round to nearest 0.25

    // Look up base stats or generate
    const name = tmpl.name || 'Enemy'
    const baseEntry = BASE_ENEMY_STATS[name]
    let stats, attacks
    if (baseEntry) {
      const scaled = scaleStats(baseEntry, targetCR)
      attacks = baseEntry.attacks
      stats = {
        hp: scaled.hp,
        ac: scaled.ac,
        speed: scaled.speed,
        cr: scaled.cr,
        str: scaled.str,
        dex: scaled.dex,
        con: scaled.con,
        int: scaled.int || baseEntry.int,
        wis: scaled.wis || baseEntry.wis,
        cha: scaled.cha || baseEntry.cha,
      }
    } else {
      const generated = generateStats(name, targetCR)
      attacks = generated.attacks
      stats = {
        hp: generated.hp,
        ac: generated.ac,
        speed: generated.speed,
        cr: generated.cr,
        str: generated.str,
        dex: generated.dex,
        con: generated.con,
        int: generated.int,
        wis: generated.wis,
        cha: generated.cha,
      }
    }

    // Expand count into individual enemy objects for combat
    for (let i = 0; i < count; i++) {
      result.push({
        id: `${name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
        name: count > 1 && i > 0 ? `${name} ${i + 1}` : name,
        hp: stats.hp,
        maxHp: stats.hp,
        currentHp: stats.hp,
        ac: stats.ac,
        speed: stats.speed || 30,
        stats,
        attacks,
        role,
        isEnemy: true,
        type: 'enemy',
      })
    }
  }

  return result
}
