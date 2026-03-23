/**
 * Encounter Scaling System — Dynamically adjust difficulty and warn players about danger.
 * Scales encounters based on party power vs enemy power in real-time during combat.
 */

/**
 * Calculate party power level (total combat capability).
 * Factors: class, level, HP, AC, equipped items, active spells.
 * @param {array} players — Player combatants
 * @returns {number} Power rating (higher = stronger)
 */
export function calculatePartyPower(players) {
  let totalPower = 0;
  for (const p of players) {
    if (p.currentHp <= 0) continue;

    // Base: level and HP
    const levelPower = (p.level || 1) * 10;
    const hpPower = p.currentHp / Math.max(1, p.maxHp) * 5; // Deduct for damage
    const acPower = (p.ac || 10) - 8; // AC 10 = baseline, higher is better

    // Class-based power (some classes are inherently stronger in combat)
    const classPower = {
      Barbarian: 1.15,
      Paladin: 1.15,
      Fighter: 1.1,
      Rogue: 1.0,
      Wizard: 0.95,
      Warlock: 0.95,
      Ranger: 1.0,
      Cleric: 1.05,
      Druid: 0.95,
      Sorcerer: 0.9,
      Bard: 0.95,
      Monk: 0.95,
    };
    const classModifier = classPower[p.class] || 1.0;

    // Spellcasting power (if spells are available)
    const spellSlotsPower = p.spellSlots ? Object.values(p.spellSlots).reduce((a, b) => a + b, 0) * 0.5 : 0;

    const playerPower = (levelPower + hpPower + acPower + spellSlotsPower) * classModifier;
    totalPower += playerPower;
  }

  return totalPower;
}

/**
 * Calculate enemy threat power (total enemy combat capability).
 * Factors: CR, HP, AC, special abilities.
 * @param {array} enemies — Enemy combatants
 * @returns {number} Power rating (higher = stronger)
 */
export function calculateEnemyPower(enemies) {
  let totalPower = 0;
  for (const e of enemies) {
    if (e.currentHp <= 0) continue;

    // Base: CR (main threat indicator)
    const crPower = (e.cr || 0.25) * 100;

    // HP relative to AC (harder enemies have more HP)
    const hpAdjustment = e.currentHp / Math.max(1, e.maxHp);
    const acBonus = Math.max(0, (e.ac || 10) - 10) * 5;

    // Boss multiplier
    const isBoss = e.phases ? 1.5 : 1.0;

    // Minion penalty (minions are weaker)
    const minionPenalty = e.originalName === e.name ? 1.0 : 0.7;

    const enemyPower = (crPower + acBonus) * hpAdjustment * isBoss * minionPenalty;
    totalPower += enemyPower;
  }

  return totalPower;
}

/**
 * Determine encounter difficulty rating.
 * @param {number} partyPower — Party total power
 * @param {number} enemyPower — Enemy total power
 * @param {number} partySize — Number of party members
 * @returns {string} Difficulty: 'Trivial', 'Easy', 'Medium', 'Hard', 'Deadly'
 */
export function rateEncounterDifficulty(partyPower, enemyPower, partySize = 4) {
  if (partySize === 0) return 'Trivial';

  const ratio = enemyPower / (partyPower + 1); // Avoid divide by zero

  if (ratio < 0.25) return 'Trivial';
  if (ratio < 0.5) return 'Easy';
  if (ratio < 1.0) return 'Medium';
  if (ratio < 1.5) return 'Hard';
  return 'Deadly';
}

/**
 * Generate a warning message for the party based on difficulty.
 * @param {string} difficulty — Difficulty rating
 * @returns {string} Warning message (empty if appropriate difficulty)
 */
export function generateDifficultyWarning(difficulty) {
  const warnings = {
    Trivial: 'These enemies seem trivial compared to your might.',
    Easy: 'These enemies should prove no challenge to your group.',
    Medium: 'This looks like a fair fight. Be cautious.',
    Hard: '⚠ WARNING: This looks very dangerous! Tread carefully.',
    Deadly: '⚠⚠ DEADLY THREAT: These enemies vastly outmatch you! Retreat or prepare for death!',
  };

  // Only warn if Hard or Deadly
  return difficulty === 'Hard' || difficulty === 'Deadly' ? warnings[difficulty] : '';
}

/**
 * Suggest enemy scaling adjustment based on difficulty.
 * If encounters are trivially easy or impossibly hard, suggest adding/removing enemies.
 * @param {string} difficulty — Current difficulty
 * @returns {object|null} { action: 'add' | 'remove', count: number, reason: string } or null
 */
export function suggestEncounterScaling(difficulty) {
  if (difficulty === 'Trivial') {
    return {
      action: 'add',
      count: 2,
      reason: 'The party is too powerful. Reinforcements arrive!',
    };
  }

  if (difficulty === 'Deadly') {
    return {
      action: 'remove',
      count: 1,
      reason: 'One of the enemies realizes the odds are bad and retreats.',
    };
  }

  return null;
}

/**
 * Check if party should receive a difficulty warning.
 * Only warn once per encounter, when first combat round starts.
 * @param {object} encounter — Current encounter state
 * @returns {object|null} { difficulty, warning, scaling } or null if no warning needed
 */
export function checkEncounterDifficulty(encounter) {
  if (!encounter || encounter.phase !== 'combat') return null;
  if (encounter.difficultyWarningShown) return null; // Already warned

  const players = encounter.combatants.filter(c => c.type === 'player' && c.currentHp > 0);
  const enemies = encounter.combatants.filter(c => c.type === 'enemy' && c.currentHp > 0);

  if (players.length === 0 || enemies.length === 0) return null;

  const partyPower = calculatePartyPower(players);
  const enemyPower = calculateEnemyPower(enemies);
  const difficulty = rateEncounterDifficulty(partyPower, enemyPower, players.length);
  const warning = generateDifficultyWarning(difficulty);
  const scaling = suggestEncounterScaling(difficulty);

  if (!warning && !scaling) return null;

  return {
    difficulty,
    warning,
    scaling,
    round: encounter.round,
  };
}
