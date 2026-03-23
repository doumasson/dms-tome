/**
 * Exploration Skill Checks — Let players use abilities to interact with the world
 * during non-combat exploration. Perception to find secrets, Investigation to examine,
 * Stealth to hide, Acrobatics to climb, etc.
 */

// Available skills for exploration
export const EXPLORATION_SKILLS = {
  PERCEPTION: 'perception',        // Spot hidden things, notice details
  INVESTIGATION: 'investigation',  // Examine objects closely, find clues
  STEALTH: 'stealth',              // Hide, sneak unseen
  ACROBATICS: 'acrobatics',        // Climb, balance, navigate terrain
  SURVIVAL: 'survival',            // Track, forage, navigate wilderness
  INSIGHT: 'insight',              // Read people, sense motives
  DECEPTION: 'deception',          // Lie convincingly
  NATURE: 'nature',                // Know about plants, animals, terrain
  ARCANA: 'arcana',                // Understand magical phenomena
  ATHLETICS: 'athletics',          // Swim, climb, jump obstacles
};

// Challenge difficulties (DC)
export const SKILL_DC = {
  TRIVIAL: 5,      // Automatic success for trained
  EASY: 8,         // Common task
  MODERATE: 12,    // Challenging but doable
  HARD: 16,        // Very difficult
  VERY_HARD: 20,   // Borderline impossible
  NEAR_IMPOSSIBLE: 24, // Legendary difficulty
};

// Exploration scenarios that trigger skill checks
export const EXPLORATION_SCENARIOS = {
  // Perception scenarios
  HIDDEN_PASSAGE: {
    skill: EXPLORATION_SKILLS.PERCEPTION,
    dc: SKILL_DC.MODERATE,
    success: 'You notice a hidden passage behind the bookshelf.',
    failure: 'You don\'t spot anything unusual.',
    reward: 'secret_area',
  },
  TRAP_DETECTION: {
    skill: EXPLORATION_SKILLS.PERCEPTION,
    dc: SKILL_DC.HARD,
    success: 'You notice pressure plates on the floor ahead. A trap!',
    failure: 'You don\'t notice the trap until it\'s too late.',
    consequence: 'trigger_trap',
  },
  HIDDEN_CHEST: {
    skill: EXPLORATION_SKILLS.INVESTIGATION,
    dc: SKILL_DC.MODERATE,
    success: 'You find a hidden compartment with treasure!',
    failure: 'You don\'t find anything valuable.',
    reward: 'treasure',
  },
  CLUE_INVESTIGATION: {
    skill: EXPLORATION_SKILLS.INVESTIGATION,
    dc: SKILL_DC.HARD,
    success: 'You piece together vital clues about what happened here.',
    failure: 'You find nothing of significance.',
    reward: 'quest_clue',
  },
  // Stealth scenarios
  SNEAK_PAST_GUARDS: {
    skill: EXPLORATION_SKILLS.STEALTH,
    dc: SKILL_DC.MODERATE,
    success: 'You slip past the guards unnoticed.',
    failure: 'The guards spot you!',
    consequence: 'combat_encounter',
  },
  PICK_LOCK: {
    skill: EXPLORATION_SKILLS.STEALTH,
    dc: SKILL_DC.HARD,
    success: 'Click! The lock opens.',
    failure: 'The lock resists your efforts.',
    consequence: 'locked_door',
  },
  // Acrobatics scenarios
  BALANCE_BEAM: {
    skill: EXPLORATION_SKILLS.ACROBATICS,
    dc: SKILL_DC.MODERATE,
    success: 'You carefully balance across the narrow bridge.',
    failure: 'You slip and fall!',
    consequence: 'environmental_damage',
  },
  CLIMB_CLIFF: {
    skill: EXPLORATION_SKILLS.ACROBATICS,
    dc: SKILL_DC.HARD,
    success: 'You climb to the top with confidence.',
    failure: 'You can\'t make the climb.',
    consequence: 'blocked_path',
  },
  // Survival scenarios
  TRACK_CREATURE: {
    skill: EXPLORATION_SKILLS.SURVIVAL,
    dc: SKILL_DC.MODERATE,
    success: 'You follow the trail deeper into the wilderness.',
    failure: 'The trail goes cold.',
    reward: 'encounter_discovery',
  },
  FIND_SHELTER: {
    skill: EXPLORATION_SKILLS.SURVIVAL,
    dc: SKILL_DC.EASY,
    success: 'You find a safe place to rest.',
    failure: 'You\'re exposed to the elements.',
    consequence: 'exhaustion',
  },
  // Insight scenarios
  READ_PERSON: {
    skill: EXPLORATION_SKILLS.INSIGHT,
    dc: SKILL_DC.MODERATE,
    success: 'You sense they\'re being truthful.',
    failure: 'You can\'t tell what they\'re thinking.',
    reward: 'social_advantage',
  },
  // Arcana scenarios
  IDENTIFY_MAGIC: {
    skill: EXPLORATION_SKILLS.ARCANA,
    dc: SKILL_DC.MODERATE,
    success: 'This is clearly a magical aura.',
    failure: 'You can\'t identify the magic.',
    reward: 'lore_knowledge',
  },
};

/**
 * Perform a skill check during exploration
 * @param {string} skillName - Skill being used
 * @param {number} modifier - Character's skill modifier
 * @param {number} dc - Difficulty class (target number)
 * @returns {object} { success, total, rollResult, margin }
 */
export function performSkillCheck(skillName, modifier = 0, dc = SKILL_DC.MODERATE) {
  const rollResult = Math.floor(Math.random() * 20) + 1;
  const total = rollResult + modifier;
  const success = total >= dc;
  const margin = total - dc;

  return {
    skill: skillName,
    rollResult,
    modifier,
    total,
    dc,
    success,
    margin, // Positive = success margin, negative = how close to success
    criticalSuccess: rollResult === 20,
    criticalFailure: rollResult === 1,
  };
}

/**
 * Generate a random exploration skill challenge
 * @param {number} area_level - Zone difficulty (1-5)
 * @returns {object} Scenario configuration
 */
export function generateSkillChallenge(area_level = 1) {
  const scenarios = Object.values(EXPLORATION_SCENARIOS);
  const scenario = { ...scenarios[Math.floor(Math.random() * scenarios.length)] };

  // Scale DC by area level
  const baseDC = scenario.dc || SKILL_DC.MODERATE;
  scenario.dc = baseDC + (area_level - 1) * 2;

  return scenario;
}

/**
 * Get skill list for a character class
 * @param {string} characterClass - D&D class
 * @returns {Array<string>} Available skills for class
 */
export function getClassSkills(characterClass = 'Fighter') {
  const classSkills = {
    Barbarian: ['Perception', 'Survival', 'Athletics'],
    Bard: ['Deception', 'Insight', 'Perception', 'Stealth'],
    Cleric: ['Insight', 'Medicine', 'Perception'],
    Druid: ['Nature', 'Perception', 'Survival'],
    Fighter: ['Athletics', 'Perception'],
    Monk: ['Acrobatics', 'Stealth', 'Perception'],
    Paladin: ['Insight', 'Perception'],
    Ranger: ['Perception', 'Stealth', 'Survival', 'Nature'],
    Rogue: ['Stealth', 'Perception', 'Insight', 'Deception'],
    Sorcerer: ['Arcana', 'Perception'],
    Warlock: ['Arcana', 'Deception', 'Insight'],
    Wizard: ['Arcana', 'Investigation', 'Perception'],
  };

  return classSkills[characterClass] || ['Perception'];
}

/**
 * Determine skill modifier from ability scores
 * @param {object} abilityScores - Character's ability scores { str, dex, con, int, wis, cha }
 * @param {string} skillName - Skill being used
 * @param {number} proficiency - Proficiency bonus
 * @param {boolean} isExpertise - Has expertise in skill (double proficiency)
 * @returns {number} Total modifier
 */
export function calculateSkillModifier(abilityScores = {}, skillName, proficiency = 0, isExpertise = false) {
  // Map skills to ability scores
  const skillAbilities = {
    [EXPLORATION_SKILLS.ACROBATICS]: 'dex',
    [EXPLORATION_SKILLS.ANIMAL_HANDLING]: 'wis',
    [EXPLORATION_SKILLS.ARCANA]: 'int',
    [EXPLORATION_SKILLS.ATHLETICS]: 'str',
    [EXPLORATION_SKILLS.DECEPTION]: 'cha',
    [EXPLORATION_SKILLS.HISTORY]: 'int',
    [EXPLORATION_SKILLS.INSIGHT]: 'wis',
    [EXPLORATION_SKILLS.INTIMIDATION]: 'cha',
    [EXPLORATION_SKILLS.INVESTIGATION]: 'int',
    [EXPLORATION_SKILLS.MEDICINE]: 'wis',
    [EXPLORATION_SKILLS.NATURE]: 'int',
    [EXPLORATION_SKILLS.PERCEPTION]: 'wis',
    [EXPLORATION_SKILLS.PERFORMANCE]: 'cha',
    [EXPLORATION_SKILLS.PERSUASION]: 'cha',
    [EXPLORATION_SKILLS.SLEIGHT_OF_HAND]: 'dex',
    [EXPLORATION_SKILLS.STEALTH]: 'dex',
    [EXPLORATION_SKILLS.SURVIVAL]: 'wis',
  };

  const abilityKey = skillAbilities[skillName] || 'wis';
  const abilityScore = abilityScores[abilityKey] || 10;
  const abilityModifier = Math.floor((abilityScore - 10) / 2);

  const profBonus = isExpertise ? proficiency * 2 : proficiency;

  return abilityModifier + profBonus;
}

/**
 * Build a narrative description of skill check result
 * @param {object} checkResult - Result from performSkillCheck
 * @param {object} scenario - Scenario from EXPLORATION_SCENARIOS
 * @returns {string} Narrative description
 */
export function describeSkillResult(checkResult, scenario) {
  if (checkResult.criticalSuccess) {
    return `${scenario.success} Not only that, but you found something extra!`;
  }
  if (checkResult.success) {
    return scenario.success;
  }
  if (checkResult.criticalFailure) {
    return `${scenario.failure} Spectacularly so.`;
  }
  return scenario.failure;
}
