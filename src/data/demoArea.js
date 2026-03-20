import { buildAreaFromBrief } from '../lib/areaBuilder.js'

/**
 * Demo area brief — a small village with tavern, house, and clearing.
 * This replaces demoWorld.json for the default game experience.
 */
const DEMO_BRIEF = {
  id: 'area-village',
  name: 'Millhaven Village',
  width: 40,
  height: 30,
  theme: 'village',
  pois: [
    { type: 'tavern_main', position: 'center-west', label: 'The Weary Traveler' },
    { type: 'house_small', position: 'center-east', label: "Elder's House" },
    { type: 'clearing_grass', position: 'south-center', label: 'Town Square' },
  ],
  connections: [
    { from: 'The Weary Traveler', to: 'Town Square' },
    { from: "Elder's House", to: 'Town Square' },
  ],
  npcs: [
    { name: 'Barkeep Hilda', position: 'The Weary Traveler', personality: 'Gruff but kind tavern owner who hears all the gossip', questRelevant: true },
    { name: 'Elder Maren', position: "Elder's House", personality: 'Wise village elder who knows the old stories', questRelevant: true },
  ],
  enemies: [
    {
      name: 'Goblin Scout',
      position: 'Town Square',
      count: 3,
      stats: { hp: 7, ac: 15, speed: 30, cr: '1/4' },
      attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
    },
  ],
  encounterZones: [
    {
      id: 'goblin_ambush',
      triggerRadius: 5,
      enemies: ['Goblin Scout'],
      dmPrompt: 'Goblin scouts emerge from hiding and attack the party near the town square',
    },
  ],
  exits: [
    { edge: 'north', targetArea: 'area-forest', label: 'Forest Path' },
  ],
  lightSources: [
    { position: { x: 15, y: 12 }, type: 'fireplace' },
    { position: { x: 8, y: 8 }, type: 'torch' },
  ],
  playerStart: { x: 20, y: 20 },
}

/**
 * Build the demo area. Call once at startup if no campaign is loaded.
 */
export function buildDemoArea() {
  return buildAreaFromBrief(DEMO_BRIEF, 42)
}

export { DEMO_BRIEF }
