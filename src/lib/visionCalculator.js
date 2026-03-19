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
 * @returns {{ bright: number, dim: number, darkvision: number }} tile radii
 */
export function getCharacterVisionRange(character, lighting, carriedLights = []) {
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

  if (lighting === 'magical-darkness') {
    const hasDevilsSight = character.classFeatures?.includes('devils-sight')
    return hasDevilsSight
      ? { bright: 0, dim: 0, darkvision: 24 }
      : { bright: 0, dim: 0, darkvision: 0 }
  }

  if (lighting === 'darkness') {
    return {
      bright: lightBright,
      dim: lightDim,
      darkvision: Math.max(darkvisionTiles, lightDim),
    }
  }

  if (lighting === 'dim') {
    return {
      bright: darkvisionTiles > 0 ? BRIGHT_VISION : DIM_VISION,
      dim: darkvisionTiles > 0 ? BRIGHT_VISION : DIM_VISION,
      darkvision: darkvisionTiles,
    }
  }

  // bright light
  return {
    bright: BRIGHT_VISION,
    dim: BRIGHT_VISION,
    darkvision: 0,
  }
}

/**
 * Compute the union of all party members' vision circles.
 * @param {Array} partyVisions — [{ position: {x,y}, brightRadius, dimRadius, darkvisionRadius }]
 * @param {number} width, height — area dimensions
 * @returns {{ active: Set<string>, dim: Set<string>, darkvision: Set<string> }}
 */
export function computeVision(partyVisions, width, height) {
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
