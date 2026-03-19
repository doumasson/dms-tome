import allChunks from './chunks/index.js'
import { ChunkLibrary } from '../lib/chunkLibrary.js'
import { stampChunk, connectWithRoad, fillTerrain, buildUnifiedPalette, remapChunk } from '../lib/mapGenerator.js'

const AREA_WIDTH = 40
const AREA_HEIGHT = 30

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

  // 8. Return assembled area with V2 palette-based layers
  return {
    id: 'test-area',
    name: 'Test Village',
    width: AREA_WIDTH,
    height: AREA_HEIGHT,
    tileSize: 200,
    useCamera: true,
    palette,
    layers,  // V2: flat Uint16Array with palette indices
    playerStart: { x: 10, y: 14 },
    npcs: [
      { id: 'barkeep', name: 'Barkeep', x: 7, y: 8, personality: 'Gruff but kind tavern owner', position: { x: 7, y: 8 } },
    ],
    buildings: [
      { id: 'tavern', x: 5, y: 5, width: 10, height: 8, roofTile: 'atlas-floors:roof_texture_hay_01_a1' },
    ],
  }
}
