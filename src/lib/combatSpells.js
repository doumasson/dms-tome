// ─── Combat Spell Catalog ─────────────────────────────────────────────────────
// areaType: 'single' | 'cone' | 'sphere' | 'line'
// save: ability key for saving throw (dex/con/wis/cha/int/str), undefined = attack roll
// healing: true = adds HP instead of dealing damage
export const COMBAT_SPELLS = {
  // Cantrips (level 0)
  'Fire Bolt':        { level: 0, areaType: 'single', damage: '1d10', damageType: 'fire', range: 120 },
  'Eldritch Blast':   { level: 0, areaType: 'single', damage: '1d10', damageType: 'force', range: 120 },
  'Sacred Flame':     { level: 0, areaType: 'single', damage: '1d8',  damageType: 'radiant', save: 'dex', range: 60 },
  'Toll the Dead':    { level: 0, areaType: 'single', damage: '1d12', damageType: 'necrotic', save: 'wis', range: 60 },
  'Chill Touch':      { level: 0, areaType: 'single', damage: '1d8',  damageType: 'necrotic', range: 120 },
  'Ray of Frost':     { level: 0, areaType: 'single', damage: '1d8',  damageType: 'cold', range: 60 },
  'Poison Spray':     { level: 0, areaType: 'single', damage: '1d12', damageType: 'poison', save: 'con', range: 10 },
  'Shillelagh':       { level: 0, areaType: 'single', damage: '1d8',  damageType: 'bludgeoning', range: 'touch' },
  'Vicious Mockery':  { level: 0, areaType: 'single', damage: '1d4',  damageType: 'psychic', save: 'wis', range: 60 },
  // Level 1
  'Magic Missile':    { level: 1, areaType: 'single', damage: '3d4+3', damageType: 'force', noSave: true, range: 120 },
  'Sleep':            { level: 1, areaType: 'sphere', areaSize: 20, damage: '',     damageType: 'control', range: 90, condition: 'Unconscious', hpPool: '5d8' },
  "Tasha's Hideous Laughter": { level: 1, areaType: 'single', damage: '', damageType: 'control', save: 'wis', concentration: true, range: 30, condition: 'Incapacitated' },
  'Burning Hands':    { level: 1, areaType: 'cone',   areaSize: 15, damage: '3d6',  damageType: 'fire', save: 'dex' },
  'Thunderwave':      { level: 1, areaType: 'sphere', areaSize: 15, damage: '2d8',  damageType: 'thunder', save: 'con', selfCentered: true },
  'Witch Bolt':       { level: 1, areaType: 'single', damage: '1d12', damageType: 'lightning', range: 30 },
  'Chromatic Orb':    { level: 1, areaType: 'single', damage: '3d8',  damageType: 'fire', range: 90 },
  'Ice Knife':        { level: 1, areaType: 'sphere', areaSize: 5,  damage: '2d6',  damageType: 'cold', save: 'dex' },
  'Cure Wounds':      { level: 1, areaType: 'single', damage: '1d8+3', damageType: 'healing', healing: true, range: 'touch' },
  'Healing Word':     { level: 1, areaType: 'single', damage: '1d4+3', damageType: 'healing', healing: true, range: 60 },
  "Hunter's Mark":    { level: 1, areaType: 'single', damage: '',    damageType: 'buff', concentration: true, range: 90 },
  'Hex':              { level: 1, areaType: 'single', damage: '1d6',  damageType: 'necrotic', concentration: true, range: 90 },
  // Level 2
  'Shatter':          { level: 2, areaType: 'sphere', areaSize: 10, damage: '3d8',  damageType: 'thunder', save: 'con' },
  'Scorching Ray':    { level: 2, areaType: 'single', damage: '6d6',  damageType: 'fire', range: 120 },
  'Spiritual Weapon': { level: 2, areaType: 'single', damage: '1d8+3', damageType: 'force', range: 60 },
  'Hold Person':      { level: 2, areaType: 'single', damage: '',    damageType: 'control', save: 'wis', concentration: true, range: 60 },
  'Phantasmal Force': { level: 2, areaType: 'single', damage: '1d6',  damageType: 'psychic', save: 'int', concentration: true },
  'Blindness/Deafness': { level: 2, areaType: 'single', damage: '', damageType: 'control', save: 'con', range: 30 },
  // Level 3
  'Fireball':         { level: 3, areaType: 'sphere', areaSize: 20, damage: '8d6',  damageType: 'fire', save: 'dex', range: 150 },
  'Lightning Bolt':   { level: 3, areaType: 'line',   areaSize: 100, widthFt: 5, damage: '8d6', damageType: 'lightning', save: 'dex' },
  'Call Lightning':   { level: 3, areaType: 'sphere', areaSize: 5,  damage: '3d10', damageType: 'lightning', save: 'dex', concentration: true },
  'Spirit Guardians': { level: 3, areaType: 'sphere', areaSize: 15, damage: '3d8',  damageType: 'radiant', save: 'wis', concentration: true, selfCentered: true },
  'Hypnotic Pattern': { level: 3, areaType: 'sphere', areaSize: 30, damage: '',     damageType: 'control', save: 'wis', concentration: true },
  'Mass Healing Word': { level: 3, areaType: 'sphere', areaSize: 60, damage: '1d4+3', damageType: 'healing', healing: true },
  // Level 4
  'Wall of Fire':     { level: 4, areaType: 'line',   areaSize: 60, widthFt: 5, damage: '5d8', damageType: 'fire', save: 'dex', concentration: true },
  'Banishment':       { level: 4, areaType: 'single', damage: '',    damageType: 'control', save: 'cha', concentration: true, range: 60 },
  'Blight':           { level: 4, areaType: 'single', damage: '8d8',  damageType: 'necrotic', save: 'con', range: 30 },
  // Level 5
  'Cone of Cold':     { level: 5, areaType: 'cone',   areaSize: 60, damage: '8d8',  damageType: 'cold', save: 'con' },
  'Flame Strike':     { level: 5, areaType: 'sphere', areaSize: 10, damage: '4d6+4d6', damageType: 'fire/radiant', save: 'dex' },
  'Hold Monster':     { level: 5, areaType: 'single', damage: '',    damageType: 'control', save: 'wis', concentration: true, range: 90 },
  'Chain Lightning':  { level: 5, areaType: 'single', damage: '10d8', damageType: 'lightning', save: 'dex', range: 150 },
  // Level 6+
  'Disintegrate':     { level: 6, areaType: 'single', damage: '10d6+40', damageType: 'force', save: 'dex', range: 60 },
  'Harm':             { level: 6, areaType: 'single', damage: '14d6', damageType: 'necrotic', save: 'con', range: 60 },
  'Heal':             { level: 6, areaType: 'single', damage: '70',   damageType: 'healing', healing: true, range: 60 },
  'Sunbeam':          { level: 6, areaType: 'line',   areaSize: 60, widthFt: 5, damage: '6d8', damageType: 'radiant', save: 'con', concentration: true },
  'Finger of Death':  { level: 7, areaType: 'single', damage: '7d8+30', damageType: 'necrotic', save: 'con', range: 60 },
  'Meteor Swarm':     { level: 9, areaType: 'sphere', areaSize: 40, damage: '20d6+20d6', damageType: 'fire/bludgeoning', save: 'dex' },
};

// Compute condition-based advantage/disadvantage for an attack (5e PHB rules)
export function getConditionModifiers(attacker, target) {
  const aC = attacker.conditions || [];
  const tC = target.conditions || [];

  // Attacker conditions that impose disadvantage on their attacks
  const attackerDisadv = aC.some(c => ['Blinded', 'Prone', 'Restrained', 'Poisoned', 'Frightened'].includes(c));
  // Target conditions that give the attacker advantage (Prone = melee advantage by default)
  const targetGrantsAdv = tC.some(c => ['Paralyzed', 'Restrained', 'Stunned', 'Unconscious', 'Prone'].includes(c));
  // Invisible attacker → advantage; invisible target → disadvantage
  const attackerInvis = aC.includes('Invisible');
  const targetInvis = tC.includes('Invisible');

  const hasAdv = attackerInvis || targetGrantsAdv;
  const hasDisadv = attackerDisadv || targetInvis;

  // Paralyzed/Unconscious: melee hits are automatic crits (5e PHB)
  const autoCrit = tC.some(c => ['Paralyzed', 'Unconscious'].includes(c));

  return { hasAdv, hasDisadv, autoCrit };
}
