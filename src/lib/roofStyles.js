const HAY_TILES = [
  'atlas-floors:roof_texture_hay_01_a1',
  'atlas-floors:roof_texture_hay_02_a1',
  'atlas-floors:roof_texture_hay_03_a1',
  'atlas-floors:roof_texture_hay_04_a1',
  'atlas-floors:roof_texture_hay_05_a1',
]

const SLATE_TILES = [
  'atlas-floors:roof_texture_slate_black_a1',
  'atlas-floors:roof_texture_slate_blue_a1',
  'atlas-floors:roof_texture_slate_mossy_a1',
  'atlas-floors:roof_texture_slate_purple_a1',
]

const TILE_TILES = [
  'atlas-floors:roof_texture_tile_black_a1',
  'atlas-floors:roof_texture_tile_blue_a1',
]

const SLATE_TAGS = new Set(['temple', 'guild', 'castle', 'noble', 'library', 'palace'])
const TILE_TAGS = new Set(['shop', 'blacksmith', 'forge', 'warehouse', 'armory', 'market'])
const NO_ROOF_TAGS = new Set(['dungeon', 'underground', 'cave', 'outdoor', 'terrain', 'clearing'])

/**
 * Resolve a roof tile ID based on chunk tags and building index.
 * @param {string[]} tags
 * @param {number} buildingIndex
 * @returns {string|null}
 */
export function resolveRoofTile(tags, buildingIndex) {
  const tagSet = new Set(tags)

  for (const t of NO_ROOF_TAGS) {
    if (tagSet.has(t)) return null
  }

  let pool = HAY_TILES
  for (const t of SLATE_TAGS) {
    if (tagSet.has(t)) { pool = SLATE_TILES; break }
  }
  if (pool === HAY_TILES) {
    for (const t of TILE_TAGS) {
      if (tagSet.has(t)) { pool = TILE_TILES; break }
    }
  }

  return pool[buildingIndex % pool.length]
}
