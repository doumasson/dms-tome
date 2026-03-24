/**
 * biomeTemplates.js — Curated area briefs for diverse biomes and environments
 * Used during campaign generation to create varied, thematic areas
 */

/**
 * Mountain Peak — High altitude settlement, snow-touched peaks, alpine meadows
 */
export const MOUNTAIN_PEAK = {
  id: 'area-mountain-peak',
  name: 'Eagle Peak Settlement',
  width: 90,
  height: 70,
  theme: 'mountain',
  pois: [
    { type: 'tavern_main', position: 'center', label: 'The Mountainheart Inn' },
    { type: 'barracks', position: 'north-west', label: 'Guard Garrison' },
    { type: 'temple', position: 'south-east', label: 'Peak Shrine' },
    { type: 'clearing_grass', position: 'south-center', label: 'Mountain Market' },
  ],
  connections: [
    { from: 'The Mountainheart Inn', to: 'Mountain Market' },
    { from: 'Guard Garrison', to: 'Mountain Market' },
    { from: 'Peak Shrine', to: 'Mountain Market' },
  ],
  npcs: [
    { name: 'Ranger Kael', position: 'Guard Garrison', personality: 'Weathered mountain ranger who warns of avalanche danger and creatures in the peaks', questRelevant: true },
    { name: 'Innkeeper Greta', position: 'The Mountainheart Inn', personality: 'Stout dwarf innkeeper with stories of ancient dwarven mines deeper in the mountains', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'south', targetArea: 'area-foothill', label: 'Mountain Pass' },
    { edge: 'north', targetArea: 'area-peak-cave', label: 'Summit Trail' },
  ],
  lightSources: [
    { position: { x: 20, y: 18 }, type: 'torch' },
  ],
  playerStart: { x: 30, y: 35 },
}

/**
 * Desert Oasis — Sandy wastelands, life-giving oasis, merchant caravans
 */
export const DESERT_OASIS = {
  id: 'area-desert-oasis',
  name: 'Starlight Oasis',
  width: 100,
  height: 80,
  theme: 'desert',
  pois: [
    { type: 'well', position: 'center', label: 'Crystal Pool' },
    { type: 'tavern_main', position: 'center-west', label: 'Nomad Tent' },
    { type: 'shop', position: 'center-east', label: 'Caravan Market' },
    { type: 'campsite', position: 'south-center', label: 'Trader Encampment' },
  ],
  connections: [
    { from: 'Crystal Pool', to: 'Nomad Tent' },
    { from: 'Crystal Pool', to: 'Caravan Market' },
    { from: 'Crystal Pool', to: 'Trader Encampment' },
  ],
  npcs: [
    { name: 'Sheik Hamir', position: 'Nomad Tent', personality: 'Wise desert nomad who knows the hidden paths and warns of sandstorms', questRelevant: true },
    { name: 'Merchant Zara', position: 'Caravan Market', personality: 'Sharp-eyed caravan master dealing in exotic goods from distant lands', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'west', targetArea: 'area-dunes', label: 'Great Sand Dunes' },
    { edge: 'east', targetArea: 'area-dusty-canyon', label: 'Red Canyon' },
  ],
  lightSources: [],
  playerStart: { x: 45, y: 40 },
}

/**
 * Coastal Harbor — Seaside town, docks, maritime trade
 */
export const COASTAL_HARBOR = {
  id: 'area-coastal-harbor',
  name: 'Port Haven',
  width: 95,
  height: 75,
  theme: 'coastal',
  pois: [
    { type: 'tavern_main', position: 'center-west', label: 'The Salty Siren' },
    { type: 'shop', position: 'center', label: 'Harbor Trading Post' },
    { type: 'barracks', position: 'north-center', label: 'Captain\'s Quarters' },
    { type: 'warehouse', position: 'south-center', label: 'Customs Warehouse' },
  ],
  connections: [
    { from: 'The Salty Siren', to: 'Harbor Trading Post' },
    { from: 'Captain\'s Quarters', to: 'Harbor Trading Post' },
    { from: 'Customs Warehouse', to: 'Harbor Trading Post' },
  ],
  npcs: [
    { name: 'Captain Aldric', position: 'Captain\'s Quarters', personality: 'Seasoned sea captain with tales of pirate raids and sea monsters', questRelevant: true },
    { name: 'Dock Master Nora', position: 'Customs Warehouse', personality: 'Shrewd logistics expert who notices everything at the docks', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'east', targetArea: 'area-sea-cave', label: 'Coastal Caves' },
    { edge: 'south', targetArea: 'area-island', label: 'Secret Island' },
  ],
  lightSources: [
    { position: { x: 12, y: 15 }, type: 'torch' },
  ],
  playerStart: { x: 35, y: 30 },
}

/**
 * Swamp Outpost — Murky wetlands, research settlement, strange creatures
 */
export const SWAMP_OUTPOST = {
  id: 'area-swamp-outpost',
  name: 'Thornwick Outpost',
  width: 85,
  height: 70,
  theme: 'swamp',
  pois: [
    { type: 'cottage', position: 'center', label: 'Alchemist\'s Cottage' },
    { type: 'library', position: 'north-center', label: 'Lore Archive' },
    { type: 'swamp', position: 'south-center', label: 'Murky Depths' },
    { type: 'well', position: 'east', label: 'Herb Garden' },
  ],
  connections: [
    { from: 'Alchemist\'s Cottage', to: 'Lore Archive' },
    { from: 'Alchemist\'s Cottage', to: 'Herb Garden' },
  ],
  npcs: [
    { name: 'Alchemist Elara', position: 'Alchemist\'s Cottage', personality: 'Eccentric sage studying the swamp\'s rare plants and their magical properties', questRelevant: true },
    { name: 'Scribe Theron', position: 'Lore Archive', personality: 'Ancient scholar documenting lost civilizations hidden beneath the swamp', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'west', targetArea: 'area-swamp-deep', label: 'Deeper Into Marsh' },
    { edge: 'north', targetArea: 'area-ancient-tomb', label: 'Sunken Temple' },
  ],
  lightSources: [
    { position: { x: 25, y: 20 }, type: 'torch' },
  ],
  playerStart: { x: 40, y: 35 },
}

/**
 * Graveyard Watch — Sacred burial grounds, haunted monument, uneasy peace
 */
export const GRAVEYARD_WATCH = {
  id: 'area-graveyard-watch',
  name: 'Blackstone Cemetery',
  width: 80,
  height: 65,
  theme: 'graveyard',
  pois: [
    { type: 'graveyard', position: 'center', label: 'Burial Grounds' },
    { type: 'temple', position: 'north-center', label: 'Mausoleum' },
    { type: 'chapel', position: 'west', label: 'Chapel of Rest' },
    { type: 'cottage', position: 'east', label: 'Groundskeeper\'s Lodge' },
  ],
  connections: [
    { from: 'Burial Grounds', to: 'Mausoleum' },
    { from: 'Burial Grounds', to: 'Chapel of Rest' },
    { from: 'Burial Grounds', to: 'Groundskeeper\'s Lodge' },
  ],
  npcs: [
    { name: 'Priest Aldwin', position: 'Mausoleum', personality: 'Solemn clergy member who has noticed disturbing signs of grave disturbance', questRelevant: true },
    { name: 'Groundskeeper Owen', position: 'Groundskeeper\'s Lodge', personality: 'Weathered caretaker who knows every stone and has seen strange lights at night', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'north', targetArea: 'area-necropolis', label: 'Ancient Necropolis' },
    { edge: 'south', targetArea: 'area-village', label: 'Return to Village' },
  ],
  lightSources: [
    { position: { x: 20, y: 18 }, type: 'torch' },
  ],
  playerStart: { x: 30, y: 32 },
}

/**
 * Marketplace Town — Bustling commerce hub, diverse merchants, city atmosphere
 */
export const MARKETPLACE_TOWN = {
  id: 'area-marketplace-town',
  name: 'Crown Market City',
  width: 105,
  height: 80,
  theme: 'town',
  pois: [
    { type: 'tavern_main', position: 'center-west', label: 'The Golden Griffin' },
    { type: 'shop', position: 'center', label: 'Grand Bazaar' },
    { type: 'guardTower', position: 'north-center', label: 'City Watch Tower' },
    { type: 'library', position: 'south-west', label: 'Merchants\' Guild' },
    { type: 'stable', position: 'south-east', label: 'Caravan Stables' },
  ],
  connections: [
    { from: 'The Golden Griffin', to: 'Grand Bazaar' },
    { from: 'City Watch Tower', to: 'Grand Bazaar' },
    { from: 'Merchants\' Guild', to: 'Grand Bazaar' },
    { from: 'Caravan Stables', to: 'Grand Bazaar' },
  ],
  npcs: [
    { name: 'Guild Master Petra', position: 'Merchants\' Guild', personality: 'Shrewd merchant leader who controls all trade in the city', questRelevant: true },
    { name: 'Guard Captain Royce', position: 'City Watch Tower', personality: 'Stern military officer concerned about rising crime and mysterious strangers', questRelevant: true },
  ],
  enemies: [],
  encounterZones: [],
  exits: [
    { edge: 'east', targetArea: 'area-wealthy-district', label: 'Wealthy District' },
    { edge: 'west', targetArea: 'area-slums', label: 'Lower District' },
  ],
  lightSources: [
    { position: { x: 25, y: 20 }, type: 'torch' },
    { position: { x: 40, y: 35 }, type: 'torch' },
  ],
  playerStart: { x: 50, y: 40 },
}

/**
 * Export all biome templates for use in campaign generation
 */
export const BIOME_TEMPLATES = {
  mountain: MOUNTAIN_PEAK,
  desert: DESERT_OASIS,
  coastal: COASTAL_HARBOR,
  swamp: SWAMP_OUTPOST,
  graveyard: GRAVEYARD_WATCH,
  town: MARKETPLACE_TOWN,
}

/**
 * Get a random biome brief for campaign generation
 */
export function getRandomBiomeBrief() {
  const biomes = Object.values(BIOME_TEMPLATES)
  return biomes[Math.floor(Math.random() * biomes.length)]
}

/**
 * Get a specific biome brief by theme
 */
export function getBiomeBrief(theme) {
  return BIOME_TEMPLATES[theme]
}
