import { buildAreaFromBrief } from '../lib/areaBuilder.js'

/**
 * Demo world briefs — a playable mini-campaign across 3 connected areas:
 *   Village → Forest (goblins) → Ruins (boss)
 */
const DEMO_BRIEFS = {
  'area-village': {
    id: 'area-village',
    name: 'Millhaven Village',
    width: 80,
    height: 60,
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
      { name: 'Barkeep Hilda', position: 'The Weary Traveler', personality: 'Gruff but kind tavern owner who has heard rumors of goblin activity in the forest to the north', questRelevant: true },
      { name: 'Elder Maren', position: "Elder's House", personality: 'Wise village elder who asks you to investigate the old ruins in the forest', questRelevant: true },
    ],
    enemies: [],
    encounterZones: [],
    exits: [
      { edge: 'north', targetArea: 'area-forest', label: 'Forest Path' },
    ],
    lightSources: [
      { position: { x: 15, y: 12 }, type: 'fireplace' },
      { position: { x: 8, y: 8 }, type: 'torch' },
    ],
    playerStart: { x: 20, y: 20 },
  },
  'area-forest': {
    id: 'area-forest',
    name: 'Darkwood Forest',
    width: 100,
    height: 75,
    theme: 'forest',
    pois: [
      { type: 'clearing_grass', position: 'south-center', label: 'Forest Edge' },
      { type: 'clearing_grass', position: 'center', label: 'Ancient Clearing' },
      { type: 'campsite', position: 'north-east', label: 'Goblin Camp' },
    ],
    connections: [
      { from: 'Forest Edge', to: 'Ancient Clearing' },
      { from: 'Ancient Clearing', to: 'Goblin Camp' },
    ],
    npcs: [
      { name: 'Wounded Scout', position: 'Forest Edge', personality: 'An injured ranger who warns of goblins deeper in the forest and mentions hearing chanting from old ruins', questRelevant: true },
    ],
    enemies: [
      {
        name: 'Goblin',
        position: 'Goblin Camp',
        count: 3,
        stats: { hp: 7, ac: 15, speed: 30, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
        attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
      },
    ],
    encounterZones: [
      {
        id: 'goblin_camp',
        triggerRadius: 5,
        enemies: ['Goblin'],
        storyFlag: 'warned_about_goblins',
        dmPrompt: 'Three goblins leap from behind the trees, brandishing crude weapons!',
      },
    ],
    exits: [
      { edge: 'south', targetArea: 'area-village', label: 'Back to Village' },
      { edge: 'north', targetArea: 'area-ruins', label: 'Ancient Ruins' },
    ],
    lightSources: [],
    playerStart: { x: 25, y: 35 },
  },
  'area-ruins': {
    id: 'area-ruins',
    name: 'Sunken Ruins',
    width: 40,
    height: 40,
    theme: 'dungeon',
    pois: [
      { type: 'dungeon_room_basic', position: 'south-center', label: 'Entrance Hall' },
      { type: 'dungeon_room_basic', position: 'center', label: 'Ritual Chamber' },
      { type: 'dungeon_room_basic', position: 'north-center', label: 'Vault' },
    ],
    connections: [
      { from: 'Entrance Hall', to: 'Ritual Chamber' },
      { from: 'Ritual Chamber', to: 'Vault' },
    ],
    npcs: [],
    enemies: [
      {
        name: 'Skeleton',
        position: 'Ritual Chamber',
        count: 2,
        stats: { hp: 13, ac: 13, speed: 30, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
        attacks: [{ name: 'Shortsword', bonus: '+4', damage: '1d6+2' }],
      },
      {
        name: 'Goblin Boss',
        position: 'Vault',
        count: 1,
        stats: { hp: 21, ac: 17, speed: 30, str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10 },
        attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }, { name: 'Javelin', bonus: '+2', damage: '1d6' }],
      },
    ],
    encounterZones: [
      {
        id: 'skeleton_guard',
        triggerRadius: 5,
        enemies: ['Skeleton'],
        dmPrompt: 'Ancient skeletons animate and rise from the dusty floor, eyes glowing with unholy light!',
      },
      {
        id: 'boss_fight',
        triggerRadius: 4,
        enemies: ['Goblin Boss'],
        dmPrompt: 'The Goblin Boss stands before a locked chest, surrounded by stolen village treasures. "You dare challenge me?!"',
      },
    ],
    exits: [
      { edge: 'south', targetArea: 'area-forest', label: 'Back to Forest' },
    ],
    lightSources: [
      { position: { x: 20, y: 30 }, type: 'torch' },
      { position: { x: 20, y: 20 }, type: 'torch' },
    ],
  },
}

/**
 * Build the demo area. Call once at startup if no campaign is loaded.
 * Returns the starting area with full areaBriefs for transitions.
 */
export function buildDemoArea() {
  const startArea = buildAreaFromBrief(DEMO_BRIEFS['area-village'], 42)
  return startArea
}

/**
 * Get the full demo world briefs for area transitions.
 */
export function getDemoBriefs() {
  return { ...DEMO_BRIEFS }
}
