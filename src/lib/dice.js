export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function getAbilityModifier(score) {
  return Math.floor(((score || 10) - 10) / 2);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function parseAttackBonus(bonus) {
  if (!bonus && bonus !== 0) return 0;
  const match = bonus.toString().trim().match(/^([+-]?\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Parse and roll a damage expression like "2d6+3", "1d8", "1d4-1"
export function rollDamage(expr) {
  if (!expr) return { total: 0, display: '0', rolls: [] };
  const clean = expr.toString().trim();
  const match = clean.match(/^(?:(\d+)d(\d+))?([+-]\d+)?$/i);
  if (!match) return { total: 0, display: '0', rolls: [] };

  const count = match[1] ? parseInt(match[1]) : 0;
  const sides = match[2] ? parseInt(match[2]) : 0;
  const mod   = match[3] ? parseInt(match[3]) : 0;

  const rolls = count > 0 ? Array.from({ length: count }, () => rollDie(sides)) : [];
  const total = Math.max(1, rolls.reduce((a, b) => a + b, 0) + mod);

  const rollStr = rolls.length > 0 ? `[${rolls.join('+')}]` : '';
  const modStr  = mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : '';
  const display = `${rollStr}${modStr} = ${total}`;

  return { total, rolls, modifier: mod, display };
}

export function rollInitiative(dexScore) {
  const mod = getAbilityModifier(dexScore);
  const roll = rollDie(20);
  return { roll, modifier: mod, total: roll + mod };
}

// D&D 5e saving throw ability scores
export const SAVE_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

// DiceBear portrait URL — adventurer style, seeded by name+race+class
export function getPortraitUrl(name, race, charClass) {
  const seed = encodeURIComponent(`${name || 'adventurer'} ${race || ''} ${charClass || ''}`.trim());
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
}

// Token colors per combatant type
export function getTokenColor(type, index) {
  if (type === 'enemy') {
    const colors = ['#c0392b', '#e74c3c', '#922b21', '#d35400', '#cb4335'];
    return colors[index % colors.length];
  }
  const colors = ['#1a5276', '#117a65', '#6c3483', '#1e8449', '#784212'];
  return colors[index % colors.length];
}
