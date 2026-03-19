import allChunks from './chunks/index.js'
import { ChunkLibrary } from '../lib/chunkLibrary.js'
import { stampChunk, connectWithRoad, fillTerrain } from '../lib/mapGenerator.js'

const AREA_WIDTH = 40
const AREA_HEIGHT = 30

/**
 * Build a unified palette from all chunks, deduplicating tile IDs.
 * Index 0 is always '' (empty).
 */
function buildUnifiedPalette(chunks) {
  const palette = [''] // index 0 = empty
  const tileToIndex = new Map([['', 0]])

  for (const chunk of chunks) {
    for (const tileId of chunk.palette) {
      if (tileId && !tileToIndex.has(tileId)) {
        tileToIndex.set(tileId, palette.length)
        palette.push(tileId)
      }
    }
  }
  return { palette, tileToIndex }
}

/**
 * Remap a chunk's layer indices from its local palette to the unified palette.
 */
function remapChunk(chunk, tileToIndex) {
  const remapped = { ...chunk, layers: {} }
  for (const [layerName, data] of Object.entries(chunk.layers)) {
    remapped.layers[layerName] = data.map(localIdx => {
      if (localIdx === 0) return 0
      const tileId = chunk.palette[localIdx]
      return tileToIndex.get(tileId) || 0
    })
  }
  return remapped
}

/**
 * Map palette tile IDs to V1 tile indices for the existing 32px placeholder renderer.
 * This is a temporary bridge until the real atlas renderer is wired up.
 */
function paletteIdxToV1(paletteIdx, palette) {
  if (paletteIdx === 0) return -1 // empty

  const tileId = palette[paletteIdx] || ''
  const id = tileId.toLowerCase()

  // Grass/terrain
  if (id.includes('grass')) return 11 + (paletteIdx % 4)     // grass variants 11-14
  // Brick/stone roads/floors
  if (id.includes('brick_floor') || id.includes('cobble')) return 5 + (paletteIdx % 4) // stone 5-8
  // Wood floors
  if (id.includes('wood') && id.includes('floor') || id.includes('shack_floor')) return 1 + (paletteIdx % 4) // wood 1-4
  // Walls
  if (id.includes('wall_stone')) return 18  // stone wall vertical
  if (id.includes('wall_brick')) return 19  // stone wall horizontal
  if (id.includes('wall_wood')) return 18
  if (id.includes('wall_corner')) return 21
  if (id.includes('wall')) return 18
  // Doors
  if (id.includes('door')) return 41
  // Stairs
  if (id.includes('stair')) return 43
  // Furniture
  if (id.includes('armchair') || id.includes('chair')) return 35
  if (id.includes('bed')) return 34
  if (id.includes('table')) return 33
  // Decor/clutter
  if (id.includes('amphora') || id.includes('barrel')) return 37
  if (id.includes('clutter')) return 38
  // Bush/tree (terrain props)
  if (id.includes('bush') || id.includes('branch') || id.includes('twig')) return 11
  // Roof
  if (id.includes('roof')) return 48 // rug as visual stand-in
  // Bank/path terrain
  if (id.includes('bank') || id.includes('path')) return 9 // dirt

  // Fallback: stone floor
  return 5
}

/**
 * Convert flat Uint16Array layer to V1-compatible 2D array.
 */
function flatLayerTo2D(flatLayer, width, height, palette) {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const paletteIdx = flatLayer[y * width + x]
      row.push(paletteIdxToV1(paletteIdx, palette))
    }
    grid.push(row)
  }
  return grid
}

/**
 * Build a test area: small town with tavern, house, clearing, roads, and grass fill.
 * Returns a fully assembled area object ready for the renderer.
 */
export function buildTestArea() {
  // 1. Load chunks into library
  const lib = new ChunkLibrary()
  lib.loadAll(allChunks)

  const tavern = lib.get('tavern_main')
  const house = lib.get('house_small')
  const clearing = lib.get('clearing_grass')

  if (!tavern || !house || !clearing) {
    throw new Error('[buildTestArea] Missing required chunks: tavern_main, house_small, or clearing_grass')
  }

  // 2. Build unified palette
  const { palette, tileToIndex } = buildUnifiedPalette(allChunks)

  // 3. Create empty layers
  const size = AREA_WIDTH * AREA_HEIGHT
  const layers = {
    floor: new Uint16Array(size),
    walls: new Uint16Array(size),
    props: new Uint16Array(size),
    roof: new Uint16Array(size),
  }

  // 4. Remap chunks to unified palette space
  const tavernRemapped = remapChunk(tavern, tileToIndex)
  const houseRemapped = remapChunk(house, tileToIndex)
  const clearingRemapped = remapChunk(clearing, tileToIndex)

  // 5. Stamp chunks onto the area
  stampChunk(layers, tavernRemapped, 5, 5, AREA_WIDTH)
  stampChunk(layers, houseRemapped, 25, 5, AREA_WIDTH)
  stampChunk(layers, clearingRemapped, 15, 18, AREA_WIDTH)

  // 6. Connect tavern to house with a brick road
  const roadTileId = 'atlas-floors:brick_floor_01_d1'
  let roadIdx = tileToIndex.get(roadTileId)
  if (roadIdx === undefined) {
    roadIdx = palette.length
    palette.push(roadTileId)
    tileToIndex.set(roadTileId, roadIdx)
  }

  const tavernDoor = { x: 9, y: 13 }
  const houseDoor = { x: 27, y: 11 }
  connectWithRoad(layers.floor, roadIdx, tavernDoor, houseDoor, 2, AREA_WIDTH)

  // 7. Fill remaining empty floor cells with grass variants
  const grassVariants = [
    'atlas-floors:grass_overlay_medium_a_01',
    'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01',
  ]
  const grassIndices = grassVariants.map(id => {
    let idx = tileToIndex.get(id)
    if (idx === undefined) {
      idx = palette.length
      palette.push(id)
      tileToIndex.set(id, idx)
    }
    return idx
  })
  fillTerrain(layers.floor, grassIndices, AREA_WIDTH, AREA_HEIGHT, 42)

  // 8. Convert flat layers to V1-compatible 2D arrays for the existing renderer
  const v1Layers = {
    floor: flatLayerTo2D(layers.floor, AREA_WIDTH, AREA_HEIGHT, palette),
    walls: flatLayerTo2D(layers.walls, AREA_WIDTH, AREA_HEIGHT, palette),
    props: flatLayerTo2D(layers.props, AREA_WIDTH, AREA_HEIGHT, palette),
  }

  // 9. Return assembled area — includes both V2 palette data and V1 renderer layers
  return {
    id: 'test-area',
    name: 'Test Village',
    width: AREA_WIDTH,
    height: AREA_HEIGHT,
    tileSize: 200,
    palette,
    rawLayers: layers,     // V2: flat Uint16Array with palette indices
    layers: v1Layers,      // V1: 2D arrays with V1 tile indices for current renderer
    playerStart: { x: 10, y: 10 },
    npcs: [
      { id: 'barkeep', name: 'Barkeep', x: 7, y: 7, personality: 'Gruff but kind tavern owner' },
    ],
    buildings: [
      { id: 'tavern', x: 5, y: 5, width: 10, height: 8, roofTile: 'atlas-floors:roof_texture_hay_01_a1' },
    ],
  }
}
