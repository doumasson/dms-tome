// Class resource pool definitions for D&D 5e
// Returns array of { name, icon, max, resetOn: 'short'|'long', type: 'pips'|'pool' }

const RAGE_TABLE = [0,2,2,3,3,3,3,4,4,4,4,4,5,5,5,5,5,6,6,6,Infinity];

export function getClassResources(cls, level, stats) {
  const lv = Math.max(1, Math.min(20, parseInt(level) || 1));
  const chaMod = Math.max(1, Math.floor(((stats?.cha || 10) - 10) / 2));

  const defs = {
    Barbarian: () => [
      { name: 'Rages', icon: '😤', max: RAGE_TABLE[lv], resetOn: 'long' },
    ],
    Monk: () => [
      { name: 'Ki Points', icon: '⚡', max: lv, resetOn: 'short' },
    ],
    Fighter: () => [
      { name: 'Action Surge', icon: '⚔️', max: lv >= 17 ? 2 : 1, resetOn: 'short' },
      { name: 'Second Wind',  icon: '💨', max: 1, resetOn: 'short' },
      ...(lv >= 9 ? [{
        name: 'Indomitable', icon: '🛡️',
        max: lv >= 17 ? 3 : lv >= 13 ? 2 : 1,
        resetOn: 'long',
      }] : []),
    ],
    Paladin: () => [
      { name: 'Channel Divinity', icon: '✨', max: lv >= 18 ? 3 : lv >= 6 ? 2 : 1, resetOn: 'short' },
      { name: 'Lay on Hands',     icon: '🙏', max: lv * 5, resetOn: 'long', type: 'pool' },
    ],
    Cleric: () => [
      { name: 'Channel Divinity', icon: '✨', max: lv >= 18 ? 3 : lv >= 6 ? 2 : 1, resetOn: 'short' },
    ],
    Druid: () => [
      { name: 'Wild Shape', icon: '🐺', max: 2, resetOn: 'short' },
    ],
    Warlock: () => [
      {
        name: 'Pact Magic Slots', icon: '🔮',
        max: lv < 2 ? 1 : lv < 11 ? 2 : lv < 17 ? 3 : 4,
        resetOn: 'short',
      },
    ],
    Sorcerer: () => [
      { name: 'Sorcery Points', icon: '💜', max: lv, resetOn: 'long' },
    ],
    Bard: () => [
      {
        name: 'Bardic Inspiration', icon: '🎵',
        max: chaMod,
        resetOn: lv >= 5 ? 'short' : 'long',
      },
    ],
  };

  return (defs[cls] || (() => []))();
}

// Given a character, compute current available count for a resource
export function getResourceAvailable(char, resourceName) {
  const res = getClassResources(char.class, char.level, char.stats)
    .find(r => r.name === resourceName);
  if (!res) return 0;
  const used = char.resourcesUsed?.[resourceName] ?? 0;
  return Math.max(0, res.max - used);
}
