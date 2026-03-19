import { seededRandom } from './seededRandom.js'

const POSITION_MAP = {
  'north-center': { col: 2, row: 0 },
  'north-west': { col: 0, row: 0 },
  'north-east': { col: 4, row: 0 },
  'center': { col: 2, row: 2 },
  'center-west': { col: 0, row: 2 },
  'center-east': { col: 4, row: 2 },
  'east': { col: 4, row: 2 },
  'west': { col: 0, row: 2 },
  'south-center': { col: 2, row: 4 },
  'south-west': { col: 0, row: 4 },
  'south-east': { col: 4, row: 4 },
  'far-south': { col: 2, row: 4 },
  'far-north': { col: 2, row: 0 },
  'far-east': { col: 4, row: 2 },
  'far-west': { col: 0, row: 2 },
}

/**
 * Convert relative position strings to grid coordinates.
 * Divides area into a 5x5 logical grid, maps positions, adds jitter.
 */
export function resolvePositions(pois, areaWidth, areaHeight, seed = Date.now()) {
  const rand = seededRandom(seed)
  const cellW = Math.floor(areaWidth / 5)
  const cellH = Math.floor(areaHeight / 5)
  const result = {}

  for (const poi of pois) {
    const mapping = POSITION_MAP[poi.position] || { col: 2, row: 2 }
    const baseX = mapping.col * cellW
    const baseY = mapping.row * cellH

    const chunkW = poi.width || 10
    const chunkH = poi.height || 10
    const jitterX = Math.floor((rand() - 0.5) * cellW * 0.3)
    const jitterY = Math.floor((rand() - 0.5) * cellH * 0.3)

    const x = Math.max(1, Math.min(areaWidth - chunkW - 1,
      baseX + Math.floor((cellW - chunkW) / 2) + jitterX))
    const y = Math.max(1, Math.min(areaHeight - chunkH - 1,
      baseY + Math.floor((cellH - chunkH) / 2) + jitterY))

    result[poi.id] = { x, y }
  }

  return result
}

/**
 * Stamp a chunk's layers onto the area grid at a given position.
 */
export function stampChunk(areaLayers, chunk, posX, posY, areaWidth) {
  const layerNames = ['floor', 'walls', 'props', 'roof']

  for (const name of layerNames) {
    const chunkLayer = chunk.layers?.[name]
    const areaLayer = areaLayers[name]
    if (!chunkLayer || !areaLayer) continue

    for (let cy = 0; cy < chunk.height; cy++) {
      for (let cx = 0; cx < chunk.width; cx++) {
        const tileVal = chunkLayer[cy * chunk.width + cx]
        if (tileVal === 0) continue
        const ax = posX + cx
        const ay = posY + cy
        if (ax < 0 || ay < 0 || ax >= areaWidth) continue
        areaLayer[ay * areaWidth + ax] = tileVal
      }
    }
  }
}

/**
 * Paint a road/trail between two points using L-shaped path.
 */
export function connectWithRoad(terrainLayer, roadTileIdx, from, to, roadWidth, areaWidth) {
  const startX = Math.min(from.x, to.x)
  const endX = Math.max(from.x, to.x)
  const midY = from.y

  // Horizontal segment
  for (let x = startX; x <= endX; x++) {
    for (let w = 0; w < roadWidth; w++) {
      terrainLayer[(midY + w) * areaWidth + x] = roadTileIdx
    }
  }

  // Vertical segment
  const startY = Math.min(midY, to.y)
  const endY = Math.max(midY, to.y)
  for (let y = startY; y <= endY; y++) {
    for (let w = 0; w < roadWidth; w++) {
      terrainLayer[y * areaWidth + (to.x + w)] = roadTileIdx
    }
  }
}

/**
 * Fill empty terrain cells with biome-appropriate tiles.
 */
export function fillTerrain(terrainLayer, variantIndices, width, height, seed = 42) {
  const rand = seededRandom(seed)
  for (let i = 0; i < width * height; i++) {
    if (terrainLayer[i] === 0) {
      terrainLayer[i] = variantIndices[Math.floor(rand() * variantIndices.length)]
    }
  }
}
