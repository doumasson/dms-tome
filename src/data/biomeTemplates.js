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
    { name: 'Ranger Kael', position: 'Guard Garrison', personality: 'Weathered mountain ranger with ice-blue eyes and a scarred face. Speaks in a gruff but respectful tone, always with one eye on the peaks. Has spent decades tracking creatures and avalanche patterns. Warns newcomers about the dangers but will share survival tips with those who show respect. Rumored to have a mysterious past with the ancient dwarven ruins.',questRelevant: true },
    { name: 'Innkeeper Greta', position: 'The Mountainheart Inn', personality: 'Stout dwarf woman with a hearty laugh and a warm heart. Despite her small frame, she commands respect in the inn through sheer force of personality. Loves sharing stories of her family\'s mining heritage and will talk endlessly about the legendary deep mines. Known for strong ale and stronger advice. Has a soft spot for adventurers seeking the old dwarven secrets.',questRelevant: true },
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
    { name: 'Sheik Hamir', position: 'Nomad Tent', personality: 'Elderly Sheik with deep tan skin and keen, observant eyes that miss nothing. Speaks with the wisdom of forty years traversing the desert dunes. Wears traditional flowing robes and always offers hospitality. Can read the stars and sands like few others. Harbors secrets about the old buried ruins and lost cities that legend says lie beneath the dunes.',questRelevant: true },
    { name: 'Merchant Zara', position: 'Caravan Market', personality: 'Striking woman with quick wit and quicker fingers. Always dressed in colorful silks and adorned with jewelry from a hundred lands. Speaks five languages and has a customer for everything. Though fair in price, she\'s always looking for rare treasures. Rumors suggest she\'s more than just a merchant — perhaps a spy or something more enigmatic.',questRelevant: true },
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
    { name: 'Captain Aldric', position: 'Captain\'s Quarters', personality: 'Grizzled sea captain with one eye patched and a voice like grinding stone. Bears scars from battles with both pirates and creatures from the deep. Speaks of distant lands and forgotten islands with a mixture of wonder and dread. Despite his rough exterior, he has a code of honor and respects those with courage. Still captains a ship and knows secrets about the shipping lanes and hidden coves.',questRelevant: true },
    { name: 'Dock Master Nora', position: 'Customs Warehouse', personality: 'Sharp-minded woman who has worked the docks for thirty years and knows everyone\'s business. Iron-gray hair tied in a practical braid. Misses nothing — from smuggled goods to strange newcomers. Fiercely protective of her port and its people. Despite her stern demeanor, she\'s fair and can be an invaluable ally for those who treat her with respect.',questRelevant: true },
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
    { name: 'Alchemist Elara', position: 'Alchemist\'s Cottage', personality: 'Mysterious alchemist with moss-green eyes and ink-stained fingers. Speaks quickly when excited about her work, often finishing thoughts mid-sentence. Obsessed with cataloging rare swamp flora and their alchemical properties. Her cottage smells of strange herbs and magic. She\'s brilliant but somewhat absent-minded, often forgetting to eat while conducting experiments. Those who bring her rare ingredients gain her trust and knowledge.',questRelevant: true },
    { name: 'Scribe Theron', position: 'Lore Archive', personality: 'Elderly scholar with glasses perpetually sliding down his nose and robes covered in bookdust. Speaks in careful, measured tones and quotes ancient texts frequently. Has spent decades piecing together the history of civilizations lost to the swamp. Lonely but kind, he welcomes genuine researchers and adventurers. Harbors theories about what lies in the deepest parts of the marsh.',questRelevant: true },
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
    { name: 'Priest Aldwin', position: 'Mausoleum', personality: 'Solemn priest in his sixties with a face creased by worry and prayer. Speaks softly, as if the dead might hear. Deeply faithful and concerned about recent grave disturbances that trouble his faith. Kind to the grieving but stern with those who show disrespect to the dead. Believes something unnatural is happening and welcomes aid from those he trusts.',questRelevant: true },
    { name: 'Groundskeeper Owen', position: 'Groundskeeper\'s Lodge', personality: 'Gruff groundskeeper with weathered hands and perpetually dirt-stained clothes. Knows the cemetery better than anyone alive — every grave, every family, every story. Has worked here for forty years and takes his responsibility seriously. Recently seen strange lights at night and has heard unsettling sounds. Distrustful of most but opens up to those who show respect for the dead.',questRelevant: true },
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
    { name: 'Guild Master Petra', position: 'Merchants\' Guild', personality: 'Shrewd and elegant woman in her fifties who built the Merchants\' Guild from nothing. Speaks with authority and commands respect from every trader in the city. Sharp-eyed and quick-minded, she knows the value of everything and the cost of favors. Ambitious but fair, she\'s expanded the guild\'s reach to distant lands. Rumors suggest she has contacts with shadowy organizations beyond the city walls.',questRelevant: true },
    { name: 'Guard Captain Royce', position: 'City Watch Tower', personality: 'Stern military officer with iron-gray hair and the bearing of a soldier. Dedicated to protecting the city but increasingly concerned about rising crime and the influx of strangers with unknown intentions. Speaks plainly and expects honesty in return. Gruff but fundamentally decent, he\'ll work with adventurers if they prove trustworthy. Suspects something bigger is unfolding in the shadows.',questRelevant: true },
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
