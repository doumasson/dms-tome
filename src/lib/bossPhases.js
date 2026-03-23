/**
 * Boss Phase System — Multi-phase encounters with HP-threshold-triggered transitions.
 * Bosses escalate through phases (100% → 75% → 50% → 0%), changing tactics and abilities per phase.
 */

/**
 * Generate phase array for a boss.
 * @param {object} boss — Full boss config from bossEncounters.js
 * @returns {array} Phases ordered by HP threshold, highest-HP-first
 */
export function generateBossPhases(boss) {
  const { tier, archetype, maxHp } = boss;

  // Tier → phase count + intensity
  const tierPhaseConfig = {
    lieutenant: { count: 2, intensity: 1 },
    champion: { count: 3, intensity: 1.5 },
    legendary: { count: 4, intensity: 2 },
    ancient: { count: 4, intensity: 2.5 },
  };

  const config = tierPhaseConfig[tier] || tierPhaseConfig.champion;
  const phaseCount = config.count;

  // Generate HP thresholds: phase 1 is 100%-next, phase 2 is next%-next, etc.
  const thresholds = [];
  for (let i = 1; i < phaseCount; i++) {
    thresholds.push(1 - (i / phaseCount));
  }
  thresholds.push(0); // Final threshold

  const phases = [];
  for (let i = 0; i < phaseCount; i++) {
    const minHp = i === phaseCount - 1 ? 0 : thresholds[i];
    const maxHpThreshold = i === 0 ? 1 : thresholds[i - 1];

    const phase = {
      id: `phase_${i + 1}`,
      number: i + 1,
      minHpPercent: minHp,
      maxHpPercent: maxHpThreshold,
      tactics: selectPhaseTactics(boss.tactics, i, phaseCount),
      activatedAbilities: selectPhaseAbilities(boss, i, phaseCount, config.intensity),
      lairActionEnabled: i >= phaseCount - 2, // Lair actions in final 2 phases
      minionSpawn: generateMinionSpawn(archetype, i, phaseCount),
      description: describePhase(i + 1, phaseCount, boss.tier),
    };
    phases.push(phase);
  }

  return phases;
}

/**
 * Select combat tactics for phase. Escalate from base toward aggressive/desperate.
 */
function selectPhaseTactics(baseTactic, phaseIndex, totalPhases) {
  const tacticEscalation = {
    defensive: ['defensive', 'tactical', 'aggressive'],
    tactical: ['tactical', 'aggressive', 'berserker'],
    aggressive: ['aggressive', 'aggressive', 'berserker'],
    spellcaster: ['spellcaster', 'spellcaster', 'berserker'],
    summoner: ['summoner', 'summoner', 'spellcaster'],
    berserker: ['berserker', 'berserker', 'berserker'],
  };

  const escalation = tacticEscalation[baseTactic] || ['tactical', 'aggressive', 'berserker'];
  const escalateIndex = Math.min(phaseIndex, escalation.length - 1);
  return escalation[escalateIndex];
}

/**
 * Select abilities that activate in this phase. More abilities in later phases.
 */
function selectPhaseAbilities(boss, phaseIndex, totalPhases, intensity) {
  const allAbilities = boss.abilities || [];
  if (allAbilities.length === 0) return [];

  // Phase count: phase 1 = boss.abilities, phase 2+ = add more, final = all
  const abilitiesPerPhase = Math.max(
    1,
    Math.ceil((allAbilities.length / totalPhases) * (phaseIndex + 1))
  );

  // Return first N abilities (they're already selected by archetype/tier)
  return allAbilities.slice(0, abilitiesPerPhase);
}

/**
 * Generate minion spawn for this phase (if applicable).
 */
function generateMinionSpawn(archetype, phaseIndex, totalPhases) {
  if (phaseIndex === 0) return null; // No minions in phase 1

  // Summoner and Warrior types spawn minions
  const minionConfig = {
    WARLORD: { type: 'Hobgoblin', baseCount: 2 },
    ARCHMAGE: { type: 'Cultist', baseCount: 1 },
    ASSASSIN: { type: 'Bandit', baseCount: 2 },
    HIGH_PRIEST: { type: 'Acolyte', baseCount: 2 },
    DRAGON: null, // Dragons don't spawn minions typically
  };

  const config = minionConfig[archetype];
  if (!config) return null;

  const count = Math.min(4, config.baseCount + Math.floor(phaseIndex / 2));
  return { type: config.type, count };
}

/**
 * Check if combatant has transitioned into a new phase.
 * @param {object} combatant — Enemy combatant from encounter
 * @returns {object|null} New phase object or null if no transition
 */
export function checkPhaseTransition(combatant) {
  if (!combatant.phases || combatant.phases.length === 0) return null;

  const currentPhaseNum = combatant.bossPhase || 1;
  const currentPhase = combatant.phases[currentPhaseNum - 1];
  if (!currentPhase) return null;

  const hpPercent = combatant.currentHp / combatant.maxHp;

  // Check if we've dropped below this phase's minimum
  if (hpPercent < currentPhase.minHpPercent) {
    // Find next phase
    for (let i = currentPhaseNum; i < combatant.phases.length; i++) {
      if (hpPercent >= combatant.phases[i].minHpPercent) {
        return combatant.phases[i];
      }
    }
    // All phases exhausted (HP at 0 or below)
    return null;
  }

  return null;
}

/**
 * Generate narrative description for phase escalation.
 */
export function describePhase(phaseNum, totalPhases, tier) {
  const descriptions = {
    1: [
      'The boss sizes you up, ready for battle.',
      'Combat begins! The enemy prepares for conflict.',
      'The encounter starts as the foe faces you down.',
    ],
    2: [
      'Bloodied and enraged, the boss escalates its assault!',
      'Wounded, the enemy fights with renewed fury!',
      'The boss shrieks with rage and unleashes more power!',
    ],
    3: [
      'The boss is desperate now, pulling out all stops!',
      'Cornered, the enemy fights with primal ferocity!',
      'The boss unleashes a final, devastating assault!',
    ],
    4: [
      'The boss is in its final throes, fighting with everything!',
      'Near defeat, the enemy makes a last stand!',
      'The boss goes berserk in its death throes!',
    ],
  };

  const tierIntensity = { lieutenant: 0.8, champion: 1, legendary: 1.2, ancient: 1.5 };
  const msgs = descriptions[phaseNum] || descriptions[Math.min(4, phaseNum)];
  return msgs ? msgs[Math.floor(Math.random() * msgs.length)] : `Phase ${phaseNum}`;
}

/**
 * Get all phases at once for a boss (for initialization).
 */
export function getAllPhasesForBoss(boss) {
  return generateBossPhases(boss);
}
