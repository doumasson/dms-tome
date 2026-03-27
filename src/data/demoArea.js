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
      { type: 'clearing_grass', position: 'north-east', label: 'Goblin Camp' },
    ],
    connections: [
      { from: 'Forest Edge', to: 'Ancient Clearing' },
      { from: 'Ancient Clearing', to: 'Goblin Camp' },
    ],
    npcs: [
      { name: 'Wounded Scout', position: 'Forest Edge', personality: 'An injured ranger who warns of goblins deeper in the forest and mentions hearing chanting from old ruins', questRelevant: true },
    ],
    encounterZones: [
      {
        id: 'goblin_camp',
        triggerRadius: 5,
        storyFlag: 'warned_about_goblins',
        narratorPrompt: 'Goblins leap from behind the trees, brandishing crude weapons!',
        enemyTemplates: [
          { name: 'Goblin', role: 'grunt', countPerPlayer: 0.75 },
        ],
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
    encounterZones: [
      {
        id: 'skeleton_guard',
        triggerRadius: 5,
        narratorPrompt: 'Ancient skeletons animate and rise from the dusty floor, eyes glowing with unholy light!',
        enemyTemplates: [
          { name: 'Skeleton', role: 'grunt', countPerPlayer: 0.5 },
        ],
      },
      {
        id: 'boss_fight',
        triggerRadius: 4,
        narratorPrompt: 'The Goblin Boss stands before a locked chest, surrounded by stolen village treasures. "You dare challenge me?!"',
        enemyTemplates: [
          { name: 'Goblin Boss', role: 'boss', fixedCount: 1 },
          { name: 'Skeleton', role: 'minion', countPerPlayer: 0.5 },
        ],
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
