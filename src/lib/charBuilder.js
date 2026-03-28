// Shared constants and helper functions for the character builder wizard.
import { CLASSES } from '../data/classes';
import { getFeaturesUpToLevel, getSpellSlots } from '../data/classes';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
export const STAT_FULL = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const BACKGROUNDS = [
  { name: 'Acolyte',      skills: ['Insight', 'Religion'],          description: 'You have spent your life in service to a temple.' },
  { name: 'Criminal',     skills: ['Deception', 'Stealth'],         description: 'You have a history of breaking the law.' },
  { name: 'Folk Hero',    skills: ['Animal Handling', 'Survival'],  description: 'You come from humble beginnings among common people.' },
  { name: 'Noble',        skills: ['History', 'Persuasion'],        description: 'You understand wealth, power, and privilege.' },
  { name: 'Outlander',    skills: ['Athletics', 'Survival'],        description: 'You grew up in the wilds, far from civilization.' },
  { name: 'Sage',         skills: ['Arcana', 'History'],            description: 'You spent years learning the lore of the multiverse.' },
  { name: 'Soldier',      skills: ['Athletics', 'Intimidation'],    description: 'War has been your life for as long as you care to remember.' },
  { name: 'Charlatan',    skills: ['Deception', 'Sleight of Hand'], description: 'You have always had a way with people.' },
  { name: 'Entertainer',  skills: ['Acrobatics', 'Performance'],    description: 'You thrive in front of an audience.' },
  { name: 'Guild Artisan', skills: ['Insight', 'Persuasion'],       description: "You are a member of an artisan's guild." },
  { name: 'Hermit',       skills: ['Medicine', 'Religion'],         description: 'You lived in seclusion — in a monastery or on your own.' },
  { name: 'Sailor',       skills: ['Athletics', 'Perception'],      description: 'You sailed on a seagoing vessel for years.' },
  { name: 'Urchin',       skills: ['Sleight of Hand', 'Stealth'],   description: 'You grew up on the streets alone, orphaned, and poor.' },
];

export const ALIGNMENT_OPTIONS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

export const STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Identity'];

export function statMod(val) {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export function modNum(val) {
  return Math.floor((val - 10) / 2);
}

export function profBonus(level) {
  return Math.ceil(level / 4) + 1;
}

export function calcHp(cls, conScore) {
  const conMod = modNum(conScore);
  return Math.max(1, cls.hitDie + conMod);
}

export function calcAc(cls, dexScore) {
  const dexMod = modNum(dexScore);
  const hasHeavy  = cls.armorProficiencies?.includes('Heavy');
  const hasMedium = cls.armorProficiencies?.includes('Medium');
  const hasLight  = cls.armorProficiencies?.includes('Light');
  if (hasHeavy)  return 16;
  if (hasMedium) return 13 + Math.min(dexMod, 2);
  if (hasLight)  return 11 + dexMod;
  return 10 + dexMod;
}

export function buildSpellSlots(className, level) {
  const slots = getSpellSlots(className, level);
  if (!slots) return {};
  if (slots.slots !== undefined) {
    return { [slots.level]: { total: slots.slots, used: 0 } };
  }
  const result = {};
  slots.forEach((count, idx) => {
    if (count > 0) result[idx + 1] = { total: count, used: 0 };
  });
  return result;
}

export function buildAttacks(className, finalStats) {
  const cls = CLASSES[className];
  if (!cls) return [];
  const strMod = modNum(finalStats.str);
  const dexMod = modNum(finalStats.dex);
  const pb = profBonus(1);
  const isMartial = cls.weaponProficiencies?.includes('Martial');
  const isFinesseClass = ['Rogue', 'Monk', 'Bard'].includes(className);
  const spellAbility = cls.spellAbility;
  const spellMod = spellAbility ? modNum(finalStats[spellAbility.toLowerCase()]) : 0;

  if (className === 'Wizard' || className === 'Sorcerer') {
    return [{ name: 'Fire Bolt', bonus: `+${spellMod + pb}`, damage: '1d10 fire', type: 'cantrip' }];
  }
  if (className === 'Warlock') {
    return [{ name: 'Eldritch Blast', bonus: `+${spellMod + pb}`, damage: '1d10 force', type: 'cantrip' }];
  }
  if (className === 'Druid') {
    return [{ name: 'Shillelagh', bonus: `+${spellMod + pb}`, damage: '1d8 bludgeoning', type: 'cantrip' },
            { name: 'Quarterstaff', bonus: `+${strMod + pb}`, damage: '1d6+' + strMod }];
  }
  if (className === 'Cleric') {
    return [{ name: 'Sacred Flame', bonus: `+${spellMod + pb}`, damage: '1d8 radiant', type: 'cantrip' },
            { name: 'Mace', bonus: `+${strMod + pb}`, damage: '1d6+' + strMod }];
  }
  if (isFinesseClass) {
    const mod = Math.max(strMod, dexMod);
    return [{ name: className === 'Monk' ? 'Unarmed Strike' : 'Shortsword', bonus: `+${mod + pb}`, damage: className === 'Monk' ? '1d4+' + mod : '1d6+' + mod }];
  }
  if (isMartial) {
    return [{ name: 'Longsword', bonus: `+${strMod + pb}`, damage: '1d8+' + strMod }];
  }
  return [{ name: 'Shortsword', bonus: `+${Math.max(strMod, dexMod) + pb}`, damage: '1d6+' + Math.max(strMod, dexMod) }];
}

export function buildFeatures(className, level = 1) {
  return getFeaturesUpToLevel(className, level);
}

// Sensible level-1 starting spells for each spellcasting class.
// Gives new players a functional kit without overwhelming them.
export const STARTER_SPELLS = {
  Wizard:   ['Mage Hand', 'Fire Bolt', 'Magic Missile', 'Shield', 'Sleep'],
  Sorcerer: ['Mage Hand', 'Fire Bolt', 'Magic Missile', 'Shield', 'Chromatic Orb'],
  Warlock:  ['Eldritch Blast', 'Minor Illusion', 'Hex', 'Armor of Agathys'],
  Cleric:   ['Sacred Flame', 'Guidance', 'Cure Wounds', 'Bless', 'Guiding Bolt'],
  Druid:    ['Shillelagh', 'Thorn Whip', 'Healing Word', 'Entangle', 'Faerie Fire'],
  Bard:     ['Vicious Mockery', 'Minor Illusion', 'Healing Word', 'Thunderwave', 'Charm Person'],
  Paladin:  ['Divine Smite', 'Bless', 'Cure Wounds', 'Shield of Faith'],
  Ranger:   ["Hunter's Mark", 'Goodberry', 'Hail of Thorns'],
  // Martials get empty list — they rely on attacks
  Fighter:  [],
  Rogue:    [],
  Barbarian:[],
  Monk:     [],
};

export function getStarterSpells(className) {
  return STARTER_SPELLS[className] || [];
}

export function avatarUrl(name, race, cls) {
  const seed = encodeURIComponent(`${name} ${race} ${cls}`.trim());
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
}

// ASI levels in SRD 5.1 (most classes)
const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

/**
 * Auto-level a character from fromLevel up to toLevel.
 * Returns a new character object (does not mutate the original).
 */
export function autoLevelCharacter(char, fromLevel, toLevel) {
  const className = char.class || '';
  const cls = CLASSES[className];
  const hitDie = cls?.hitDie || 8;
  const conScore = char.stats?.con || char.con || 10;
  const conMod = modNum(conScore);

  // Work on a mutable copy; carry snapshots along the way
  let current = { ...char };
  const snapshots = { ...(char.levelSnapshots || {}) };

  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) {
    // HP gain: floor(hitDie / 2) + 1 + CON mod (minimum 1)
    const hpGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
    const newMaxHp = (current.maxHp || hitDie + conMod) + hpGain;

    // Spell slots for new level
    const newSpellSlots = buildSpellSlots(className, lvl);

    // Features for new level
    const newFeatures = buildFeatures(className, lvl);

    // Proficiency bonus
    const newProfBonus = profBonus(lvl);

    // Stats — apply ASI (+2 to highest stat, capped at 20)
    let newStats = { ...(current.stats || {}) };
    if (ASI_LEVELS.has(lvl)) {
      const highestKey = Object.keys(newStats).reduce(
        (best, k) => ((newStats[k] || 0) > (newStats[best] || 0) ? k : best),
        Object.keys(newStats)[0] || 'str'
      );
      newStats = { ...newStats, [highestKey]: Math.min(20, (newStats[highestKey] || 10) + 2) };
    }

    // Save snapshot at current level before advancing
    const { levelSnapshots: _snap, ...charWithoutSnaps } = current;
    snapshots[String(lvl - 1)] = { ...charWithoutSnaps };

    current = {
      ...current,
      level: lvl,
      maxHp: newMaxHp,
      currentHp: Math.min(current.currentHp || newMaxHp, newMaxHp),
      spellSlots: newSpellSlots,
      features: newFeatures,
      proficiencyBonus: newProfBonus,
      stats: newStats,
    };
  }

  // Save snapshot at final level
  const { levelSnapshots: _final, ...finalWithoutSnaps } = current;
  snapshots[String(toLevel)] = { ...finalWithoutSnaps };

  return { ...current, levelSnapshots: snapshots };
}

/**
 * Strip a character back to targetLevel, recalculating stats from scratch.
 * Returns a new character object (does not mutate the original).
 */
export function stripToLevel(char, targetLevel) {
  const className = char.class || '';
  const cls = CLASSES[className];
  const hitDie = cls?.hitDie || 8;
  const conScore = char.stats?.con || char.con || 10;
  const conMod = modNum(conScore);

  // HP: hitDie + CON mod at level 1, then avg per additional level
  let maxHp = Math.max(1, hitDie + conMod);
  for (let lvl = 2; lvl <= targetLevel; lvl++) {
    maxHp += Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  }

  // Spell slots for target level
  const spellSlots = buildSpellSlots(className, targetLevel);

  // Features for target level
  const features = buildFeatures(className, targetLevel);

  // Proficiency bonus
  const pb = profBonus(targetLevel);

  // Filter known spells to max spell level = ceil(targetLevel / 2)
  const maxSpellLevel = Math.ceil(targetLevel / 2);
  const knownSpells = (char.knownSpells || []).filter(spell => {
    const spellLvl = typeof spell === 'object' ? (spell.level ?? 0) : 0;
    return spellLvl <= maxSpellLevel;
  });
  const preparedSpells = (char.preparedSpells || []).filter(spell => {
    const spellLvl = typeof spell === 'object' ? (spell.level ?? 0) : 0;
    return spellLvl <= maxSpellLevel;
  });

  return {
    ...char,
    level: targetLevel,
    maxHp,
    currentHp: Math.min(char.currentHp || maxHp, maxHp),
    spellSlots,
    features,
    proficiencyBonus: pb,
    knownSpells,
    preparedSpells,
  };
}
