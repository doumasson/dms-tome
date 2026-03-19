// Edge bit constants
export const NORTH  = 0x1
export const EAST   = 0x2
export const SOUTH  = 0x4
export const WEST   = 0x8
export const DOOR_N = 0x10
export const DOOR_E = 0x20
export const DOOR_S = 0x40
export const DOOR_W = 0x80

const DIR_BITS = [
  { dx: 0, dy: -1, wall: NORTH, door: DOOR_N },
  { dx: 1, dy: 0,  wall: EAST,  door: DOOR_E },
  { dx: 0, dy: 1,  wall: SOUTH, door: DOOR_S },
  { dx: -1, dy: 0, wall: WEST,  door: DOOR_W },
]

/**
 * Extract wall edge bitfield from walls layer.
 * Also backfills floor under wall cells that have empty floor.
 *
 * @param {Uint16Array} walls — palette-indexed wall layer
 * @param {Uint16Array} floor — palette-indexed floor layer (mutated: backfilled)
 * @param {string[]} palette — index → tile ID
 * @param {Set<string>} doorSet — tile IDs that are doors
 * @param {number} width
 * @param {number} height
 * @returns {{ wallEdges: Uint8Array, floor: Uint16Array }}
 */
export function extractWallEdges(walls, floor, palette, doorSet, width, height) {
  const size = width * height
  const wallEdges = new Uint8Array(size)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const tileIdx = walls[idx]
      if (tileIdx === 0) continue

      const tileId = palette[tileIdx] || ''
      const isDoor = doorSet.has(tileId)

      for (const { dx, dy, wall, door } of DIR_BITS) {
        const nx = x + dx
        const ny = y + dy
        // Out of bounds or neighbor has no wall → this edge is a boundary
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          wallEdges[idx] |= isDoor ? door : wall
        } else {
          const neighborIdx = ny * width + nx
          if (walls[neighborIdx] === 0) {
            wallEdges[idx] |= isDoor ? door : wall
          }
        }
      }
    }
  }

  // Backfill floor under wall cells (multi-pass for thick walls)
  let changed = true
  while (changed) {
    changed = false
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (walls[idx] === 0 || floor[idx] !== 0) continue
        for (const { dx, dy } of DIR_BITS) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nFloor = floor[ny * width + nx]
          if (nFloor !== 0) { floor[idx] = nFloor; changed = true; break }
        }
      }
    }
  }

  return { wallEdges, floor }
}
