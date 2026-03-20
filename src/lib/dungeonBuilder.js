import { generateDungeon } from './dungeonGenerator.js'
import { ChunkLibrary } from './chunkLibrary.js'
import allChunks from '../data/chunks/index.js'
import { buildUnifiedPalette, remapChunk, stampChunk } from './mapGenerator.js'
import { THEME_TERRAIN } from './areaBuilder.js'
import { seededRandom } from './seededRandom.js'

// Edge bit constants (matches wallEdgeExtractor.js)
const NORTH = 0x1
const EAST  = 0x2
const SOUTH = 0x4
const WEST  = 0x8

const DIR_BITS = [
  { dx: 0, dy: -1, bit: NORTH },
  { dx: 1, dy:  0, bit: EAST  },
  { dx: 0, dy:  1, bit: SOUTH },
  { dx: -1, dy: 0, bit: WEST  },
]

/* ── Shared chunk library ─────────────────────────────────────── */

let _lib = null
function getChunkLibrary() {
  if (!_lib) {
    _lib = new ChunkLibrary()
    _lib.loadAll(allChunks)
  }
  return _lib
}

/* ── Wall edge generation ─────────────────────────────────────── */

/**
 * Generate wall edges by scanning floor tile boundaries.
 * A cell with floor that has a non-floor neighbour gets an edge bit set.
 */
function generateWallEdges(floorLayer, width, height) {
  const wallEdges = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (floorLayer[idx] === 0) continue
      for (const { dx, dy, bit } of DIR_BITS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          wallEdges[idx] |= bit
        } else if (floorLayer[ny * width + nx] === 0) {
          wallEdges[idx] |= bit
        }
      }
    }
  }
  return wallEdges
}

/* ── Corridor carving ─────────────────────────────────────────── */

function carveCorridors(floorLayer, corridors, floorIdx, width, height) {
  for (const corridor of corridors) {
    const cw = corridor.width || 2
    const { x1, y1, x2, y2 } = corridor

    // Horizontal leg from (x1,y1) to (x2,y1)
    const hx0 = Math.max(0, Math.min(x1, x2))
    const hx1 = Math.min(width - 1, Math.max(x1, x2))
    for (let x = hx0; x <= hx1; x++) {
      for (let w = 0; w < cw; w++) {
        const fy = Math.min(height - 1, y1 + w)
        if (fy >= 0) floorLayer[fy * width + x] = floorIdx
      }
    }

    // Vertical leg from (x2,y1) to (x2,y2)
    const vy0 = Math.max(0, Math.min(y1, y2))
    const vy1 = Math.min(height - 1, Math.max(y1, y2))
    for (let y = vy0; y <= vy1; y++) {
      for (let w = 0; w < cw; w++) {
        const fx = Math.min(width - 1, x2 + w)
        if (fx >= 0) floorLayer[y * width + fx] = floorIdx
      }
    }
  }
}

/* ── Room filling ─────────────────────────────────────────────── */

function fillRoom(floorLayer, room, floorIndices, width, rand) {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (x < 0 || y < 0 || x >= width) continue
      const idx = y * width + x
      floorLayer[idx] = floorIndices[Math.floor(rand() * floorIndices.length)]
    }
  }
}

/* ── Enemy placement ──────────────────────────────────────────── */

/**
 * Resolve a position keyword to a tile coordinate within a room.
 * Keywords: random_room, boss_room, guard_corridor, entrance
 */
function resolveEnemyPosition(keyword, rooms, corridors, rand) {
  if (!rooms.length) return { x: 1, y: 1 }

  if (keyword === 'boss_room') {
    // Largest room by area
    const boss = rooms.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))
    return {
      x: boss.x + Math.floor(boss.width / 2),
      y: boss.y + Math.floor(boss.height / 2),
    }
  }

  if (keyword === 'entrance') {
    const first = rooms[0]
    return {
      x: first.x + Math.floor(first.width / 2),
      y: first.y + Math.floor(first.height / 2),
    }
  }

  if (keyword === 'guard_corridor' && corridors.length) {
    const c = corridors[Math.floor(rand() * corridors.length)]
    return {
      x: Math.floor((c.x1 + c.x2) / 2),
      y: Math.floor((c.y1 + c.y2) / 2),
    }
  }

  // default: random_room
  const room = rooms[Math.floor(rand() * rooms.length)]
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  }
}

/* ── Main builder ─────────────────────────────────────────────── */

/**
 * Build a complete dungeon area from an AI creative brief.
 * @param {object} brief  — { id, name, width, height, theme, dungeonConfig, enemies, exits, npcs }
 * @param {number} [seed] — optional seed for deterministic layout
 * @returns {object} complete area object ready for rendering/storage
 */
export function buildDungeonArea(brief, seed = Date.now()) {
  const {
    id, name,
    width, height,
    theme = 'dungeon',
    dungeonConfig = {},
    enemies = [],
    exits = [],
    npcs = [],
  } = brief

  const {
    minRooms = 4,
    maxRooms = 10,
    corridorWidth = 2,
  } = dungeonConfig

  const rand = seededRandom(seed)

  // 1. Generate BSP layout
  const { rooms, corridors, doors } = generateDungeon(width, height, {
    minRooms, maxRooms, corridorWidth, seed,
  })

  // 2. Build palette — start with theme floor tiles
  const terrainTiles = THEME_TERRAIN[theme] || THEME_TERRAIN.dungeon
  const lib = getChunkLibrary()

  // Find any matching room chunks (we'll use their palettes in the unified palette)
  const matchedChunks = []
  for (const room of rooms) {
    const chunk = lib.findBest('room', [theme])
    if (chunk && chunk.width <= room.width && chunk.height <= room.height) {
      matchedChunks.push(chunk)
      break  // One representative chunk per theme is enough for palette building
    }
  }

  const { palette, tileToIndex } = buildUnifiedPalette(matchedChunks, terrainTiles)

  // 3. Create empty layers
  const size = width * height
  const layers = {
    floor: new Uint16Array(size),
    walls: new Uint16Array(size),
    props:  new Uint16Array(size),
    roof:   new Uint16Array(size),
  }

  // Ensure all theme tiles are in palette
  const floorIndices = terrainTiles.map(id => {
    if (!tileToIndex.has(id)) {
      tileToIndex.set(id, palette.length)
      palette.push(id)
    }
    return tileToIndex.get(id)
  })
  const defaultFloorIdx = floorIndices[0]

  // 4. Fill rooms — try to stamp a matching chunk; otherwise fill procedurally
  for (const room of rooms) {
    const chunk = lib.findBest('room', [theme])
    if (chunk && chunk.width <= room.width && chunk.height <= room.height) {
      // Stamp chunk centered in room
      const offsetX = room.x + Math.floor((room.width - chunk.width) / 2)
      const offsetY = room.y + Math.floor((room.height - chunk.height) / 2)
      const remapped = remapChunk(chunk, tileToIndex)
      stampChunk(layers, remapped, offsetX, offsetY, width)
      // Fill any remaining room area outside chunk stamp with floor
      fillRoom(layers.floor, room, floorIndices, width, rand)
    } else {
      fillRoom(layers.floor, room, floorIndices, width, rand)
    }
  }

  // 5. Carve corridors
  carveCorridors(layers.floor, corridors, defaultFloorIdx, width, height)

  // 6. Generate wall edges from floor boundaries
  const wallEdges = generateWallEdges(layers.floor, width, height)

  // 7. Place enemies
  const placedEnemies = []
  for (const enemy of enemies) {
    const keyword = enemy.position || 'random_room'
    const basePos = resolveEnemyPosition(keyword, rooms, corridors, rand)

    for (let i = 0; i < (enemy.count || 1); i++) {
      const offsetX = i === 0 ? 0 : ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2))
      const offsetY = i === 0 ? 0 : (i % 3 === 0 ? 1 : 0)
      placedEnemies.push({
        id: `${enemy.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
        name: i > 0 ? `${enemy.name} ${i + 1}` : enemy.name,
        position: { x: Math.max(0, basePos.x + offsetX), y: Math.max(0, basePos.y + offsetY) },
        stats: enemy.stats || { hp: 10, ac: 12, speed: 30 },
        attacks: enemy.attacks || [{ name: 'Attack', bonus: '+3', damage: '1d6+1' }],
        isEnemy: true,
      })
    }
  }

  // 8. Place corridor light sources (one torch per corridor midpoint)
  const lightSources = []
  for (const corridor of corridors) {
    lightSources.push({
      position: {
        x: Math.floor((corridor.x1 + corridor.x2) / 2),
        y: Math.floor((corridor.y1 + corridor.y2) / 2),
      },
      type: 'torch',
    })
  }

  // 9. Determine player start — first room center
  const firstRoom = rooms[0] || { x: 1, y: 1, width: 4, height: 4 }
  const playerStart = brief.playerStart || {
    x: firstRoom.x + Math.floor(firstRoom.width / 2),
    y: firstRoom.y + Math.floor(firstRoom.height / 2),
  }

  return {
    id,
    name,
    width,
    height,
    tileSize: 200,
    useCamera: true,
    palette,
    layers,
    wallEdges,
    cellBlocked: new Uint8Array(size),
    playerStart,
    rooms,
    corridors,
    doors,
    npcs: [],
    enemies: placedEnemies,
    buildings: [],
    lightSources,
    exits,
    theme,
    generated: true,
  }
}
