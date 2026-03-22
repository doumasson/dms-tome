/**
 * 5e Vision Calculator — computes per-character vision ranges
 * based on race darkvision, carried light sources, and ambient lighting.
 */

const LIGHT_SOURCES = {
  torch: { bright: 4, dim: 4 },
  candle: { bright: 1, dim: 1 },
  'lantern-hooded': { bright: 6, dim: 6 },
  'lantern-bullseye': { bright: 12, dim: 12 },
  light: { bright: 4, dim: 4 },
  'dancing-lights': { bright: 2, dim: 0 },
  daylight: { bright: 12, dim: 12 },
  fireplace: { bright: 3, dim: 2 },
  sconce: { bright: 2, dim: 2 },
}

const BRIGHT_VISION = 15 // tiles in bright light (gamified viewport limit)
const DIM_VISION = 8     // tiles in dim light without darkvision

/**
 * Compute a character's vision ranges given lighting conditions.
 * @param {object} character — { race, darkvision (in feet), classFeatures? }
 * @param {string} lighting — 'bright' | 'dim' | 'darkness' | 'magical-darkness'
 * @param {Array} carriedLights — [{ type: 'torch' | 'lantern-hooded' | ... }]
 * @param {number} weatherPenalty — tile reduction from weather (0 = none, from weather.js getVisionPenalty)
 * @returns {{ bright: number, dim: number, darkvision: number }} tile radii
 */
export function getCharacterVisionRange(character, lighting, carriedLights = [], weatherPenalty = 0) {
  const darkvisionTiles = Math.floor((character.darkvision || 0) / 5)

  // Calculate best carried light
  let lightBright = 0
  let lightDim = 0
  for (const light of carriedLights) {
    const spec = LIGHT_SOURCES[light.type]
    if (spec) {
      lightBright = Math.max(lightBright, spec.bright)
      lightDim = Math.max(lightDim, spec.bright + spec.dim)
    }
  }

  const applyPenalty = (val) => Math.max(0, val - weatherPenalty)

  if (lighting === 'magical-darkness') {
    const hasDevilsSight = character.classFeatures?.includes('devils-sight')
    return hasDevilsSight
      ? { bright: 0, dim: 0, darkvision: 24 }
      : { bright: 0, dim: 0, darkvision: 0 }
  }

  if (lighting === 'darkness') {
    return {
      bright: applyPenalty(lightBright),
      dim: applyPenalty(lightDim),
      darkvision: Math.max(darkvisionTiles, applyPenalty(lightDim)),
    }
  }

  if (lighting === 'dim') {
    const base = darkvisionTiles > 0 ? BRIGHT_VISION : DIM_VISION
    return {
      bright: applyPenalty(base),
      dim: applyPenalty(base),
      darkvision: darkvisionTiles,
    }
  }

  // bright light
  return {
    bright: applyPenalty(BRIGHT_VISION),
    dim: applyPenalty(BRIGHT_VISION),
    darkvision: 0,
  }
}

/**
 * Check if a straight line from (x0,y0) to (x1,y1) is blocked by walls.
 * Uses Bresenham's line algorithm to walk cells. A cell blocks if
 * its floor is empty (index 0 in floorLayer) — i.e. solid rock/void.
 * The target cell itself is not checked (we want to see the wall face).
 */
function hasLineOfSight(x0, y0, x1, y1, floorLayer, width, height) {
  if (!floorLayer) return true  // no floor data = no LOS blocking
  let dx = Math.abs(x1 - x0)
  let dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let cx = x0, cy = y0

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx) { err += dx; cy += sy }
    // Don't check the final cell (target) — we want to see walls themselves
    if (cx === x1 && cy === y1) break
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) return false
    // If this intermediate cell has no floor, line is blocked (solid rock/wall)
    if (floorLayer[cy * width + cx] === 0) return false
  }
  return true
}

/**
 * Compute the union of all party members' vision circles.
 * @param {Array} partyVisions — [{ position: {x,y}, brightRadius, dimRadius, darkvisionRadius }]
 * @param {number} width, height — area dimensions
 * @param {Uint16Array} [floorLayer] — optional floor layer for LOS wall blocking
 * @returns {{ active: Set<string>, dim: Set<string>, darkvision: Set<string> }}
 */
export function computeVision(partyVisions, width, height, floorLayer) {
  const active = new Set()
  const dim = new Set()
  const darkvisionTiles = new Set()

  for (const pv of partyVisions) {
    const cx = pv.position.x
    const cy = pv.position.y
    const maxR = Math.max(pv.brightRadius || 0, pv.dimRadius || 0, pv.darkvisionRadius || 0)

    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        const tx = cx + dx
        const ty = cy + dy
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue

        // Check line-of-sight if floor data is available
        if (floorLayer && !hasLineOfSight(cx, cy, tx, ty, floorLayer, width, height)) continue

        const key = `${tx},${ty}`
        if (dist <= (pv.brightRadius || 0)) {
          active.add(key)
        } else if (dist <= (pv.dimRadius || 0)) {
          dim.add(key)
          active.add(key)
        } else if (dist <= (pv.darkvisionRadius || 0)) {
          darkvisionTiles.add(key)
          active.add(key)
        }
      }
    }
  }

  return { active, dim, darkvision: darkvisionTiles }
}

/**
 * Encode explored tiles as a Base64 bitfield.
 */
export function encodeExploredBitfield(exploredSet, width, height) {
  const byteCount = Math.ceil(width * height / 8)
  const bytes = new Uint8Array(byteCount)
  for (const key of exploredSet) {
    const [x, y] = key.split(',').map(Number)
    const idx = y * width + x
    bytes[idx >> 3] |= (1 << (idx & 7))
  }
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/**
 * Decode Base64 bitfield to a Set of explored tile keys.
 */
export function decodeExploredBitfield(base64, width, height) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const explored = new Set()
  for (let i = 0; i < width * height; i++) {
    if (bytes[i >> 3] & (1 << (i & 7))) {
      explored.add(`${i % width},${Math.floor(i / width)}`)
    }
  }
  return explored
}
