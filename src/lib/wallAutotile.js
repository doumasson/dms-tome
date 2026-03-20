/**
 * Wall Autotile Resolver
 *
 * Maps (theme, direction, x, y) to specific Fantasy Assets tile IDs
 * using a deterministic hash for variant selection.
 *
 * Consumed by WallRenderer (Task 4) which places actual PixiJS sprites.
 */

/**
 * Wall style configurations per theme.
 * segmentPrefix + variant + suffix = full tile ID.
 */
export const WALL_STYLES = {
  village: {
    segmentPrefix: 'atlas-structures:wall_stone_earthy_',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'c', 'e'],
    rotateForVertical: true,
    cornerTiles: {
      NE: 'atlas-structures:wall_corner_stone_earthy_l1_1x1',
      NW: 'atlas-structures:wall_corner_stone_earthy_m1_1x1',
      SE: 'atlas-structures:wall_corner_stone_earthy_metal_gray_n1_1x1',
      SW: 'atlas-structures:wall_corner_stone_earthy_o1_1x1',
    },
  },
  forest: {
    segmentPrefix: 'atlas-structures:wall_wood_ashen_',
    segmentSuffix: '_connector_a_1x1',
    variants: ['a', 'c'],
    rotateForVertical: true,
    cornerTiles: null,
  },
  dungeon: {
    segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
    segmentSuffix: '_1x1',
    variants: ['a1', 'c1'],
    rotateForVertical: true,
    cornerTiles: {
      NE: 'atlas-structures:dwarven_wall_stone_earthy_corner_a1_1x1',
      NW: 'atlas-structures:dwarven_wall_stone_earthy_corner_c1_1x1',
      SE: 'atlas-structures:dwarven_wall_stone_earthy_corner_d2_1x1',
      SW: 'atlas-structures:dwarven_wall_stone_earthy_corner_e1_1x1',
    },
  },
  cave: {
    segmentPrefix: 'atlas-walls:flesh_black_wall_connector_',
    horizontalSuffix: '1_1x1',
    verticalSuffix: '2_1x1',
    variants: ['a', 'c'],
    missingVertical: new Set(),
    rotateForVertical: false,
    cornerTiles: {
      NE: 'atlas-walls:flesh_black_wall_corner_a1_1x1',
      NW: 'atlas-walls:flesh_black_wall_corner_b1_1x1',
      SE: 'atlas-walls:flesh_black_wall_corner_c1_1x1',
      SW: 'atlas-walls:flesh_black_wall_corner_d1_1x1',
    },
  },
  town: {
    segmentPrefix: 'atlas-structures:wall_brick_earthy_',
    horizontalSuffix: '_connector_a_1x1',
    verticalSuffix: '_connector_b_1x1',
    variants: ['a', 'b'],
    rotateForVertical: false,
    cornerTiles: null,
  },
  crypt: {
    segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
    segmentSuffix: '_1x1',
    variants: ['a1', 'c1'],
    rotateForVertical: true,
    cornerTiles: {
      NE: 'atlas-structures:dwarven_wall_stone_earthy_corner_a1_1x1',
      NW: 'atlas-structures:dwarven_wall_stone_earthy_corner_c1_1x1',
      SE: 'atlas-structures:dwarven_wall_stone_earthy_corner_d2_1x1',
      SW: 'atlas-structures:dwarven_wall_stone_earthy_corner_e1_1x1',
    },
  },
  sewer: {
    segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
    segmentSuffix: '_1x1',
    variants: ['a1', 'c1'],
    rotateForVertical: true,
    cornerTiles: null,
  },
}

/** Deterministic hash for variant selection */
function tileHash(x, y, dirIndex) {
  return ((x * 73856093) ^ (y * 19349663) ^ (dirIndex * 83492791)) >>> 0
}

/**
 * Resolve the FA tile ID for a wall edge segment.
 * @param {string} theme — 'village' | 'forest' | 'dungeon' | 'cave' | 'town'
 * @param {'horizontal'|'vertical'} direction
 * @param {number} x — tile x
 * @param {number} y — tile y
 * @param {number} [regionId=0] — building/region index for consistent variant within a structure
 * @returns {string | { tileId: string, rotate: boolean }}
 */
export function resolveWallTile(theme, direction, x, y, regionId = 0) {
  const style = WALL_STYLES[theme] || WALL_STYLES.village
  const isVertical = direction === 'vertical'

  let variants = style.variants
  // Filter out missing vertical variants for cave-style themes
  if (isVertical && style.missingVertical) {
    variants = variants.filter(v => !style.missingVertical.has(v))
  }

  // Use regionId (building index) for variant — all walls in same building get same variant
  const variant = variants[regionId % variants.length]

  if (style.rotateForVertical) {
    // Only has horizontal tiles — rotate for vertical
    const tileId = style.segmentPrefix + variant + style.segmentSuffix
    if (isVertical) {
      return { tileId, rotate: true }
    }
    return tileId
  }

  // Has native horizontal and vertical suffixes
  const suffix = isVertical ? style.verticalSuffix : (style.horizontalSuffix || style.segmentSuffix)
  return style.segmentPrefix + variant + suffix
}

/**
 * Resolve corner tile ID for a given theme and corner direction.
 * @param {string} theme — 'village' | 'forest' | 'dungeon' | 'cave' | 'town'
 * @param {'NE'|'NW'|'SE'|'SW'} corner
 * @returns {string|null} tile ID or null if theme composes corners from segments
 */
export function resolveCornerTiles(theme, corner) {
  const style = WALL_STYLES[theme] || WALL_STYLES.village
  if (!style.cornerTiles) return null
  return style.cornerTiles[corner] || null
}
