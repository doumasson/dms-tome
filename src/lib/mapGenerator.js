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
  const gridCols = 5
  const gridRows = 5
  const result = {}
  const occupied = new Set()

  for (const poi of pois) {
    const mapping = POSITION_MAP[poi.position] || { col: 2, row: 2 }
    let gridX = mapping.col
    let gridY = mapping.row

    let key = `${gridX},${gridY}`
    let attempts = 0
    while (occupied.has(key) && attempts < 25) {
      gridX = (gridX + 1) % gridCols
      if (gridX === 0) gridY = (gridY + 1) % gridRows
      key = `${gridX},${gridY}`
      attempts++
    }
    occupied.add(key)

    const baseX = gridX * cellW
    const baseY = gridY * cellH

    const chunkW = poi.width || 10
    const chunkH = poi.height || 10
    const jitterX = Math.floor((rand() - 0.5) * cellW * 0.3)
    const jitterY = Math.floor((rand() - 0.5) * cellH * 0.3)

    const x = Math.max(1, Math.min(areaWidth - chunkW - 1,
      baseX + Math.floor((cellW - chunkW) / 2) + jitterX))
    const y = Math.max(1, Math.min(areaHeight - chunkH - 1,
      baseY + Math.floor((cellH - chunkH) / 2) + jitterY))

    result[poi.label || poi.id] = { x, y }
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

/**
 * Build a unified palette from multiple chunks, deduplicating tile IDs.
 * Index 0 is always '' (empty).
 * @param {Array} chunks — array of chunk objects with .palette arrays
 * @param {string[]} extraTileIds — additional tile IDs to include (e.g., road, terrain)
 * @returns {{ palette: string[], tileToIndex: Map<string, number> }}
 */
export function buildUnifiedPalette(chunks, extraTileIds = []) {
  const palette = ['']
  const tileToIndex = new Map([['', 0]])

  for (const chunk of chunks) {
    for (const tileId of chunk.palette) {
      if (tileId && !tileToIndex.has(tileId)) {
        tileToIndex.set(tileId, palette.length)
        palette.push(tileId)
      }
    }
  }

  for (const tileId of extraTileIds) {
    if (tileId && !tileToIndex.has(tileId)) {
      tileToIndex.set(tileId, palette.length)
      palette.push(tileId)
    }
  }

  return { palette, tileToIndex }
}

/**
 * Scatter prop tiles randomly across empty prop cells.
 */
export function scatterProps(propsLayer, scatterTileIndices, width, height, density = 0.03, seed = 42) {
  let rng = seed
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x
      // Only scatter in empty prop cells that have floor underneath
      if (propsLayer[idx] === 0 && next() < density) {
        propsLayer[idx] = scatterTileIndices[Math.floor(next() * scatterTileIndices.length)]
      }
    }
  }
}

/**
 * Apply border terrain variants near map edges for natural boundary framing.
 */
export function edgePadding(terrainLayer, borderTileIndices, width, height, depth = 3, seed = 42) {
  let rng = seed + 7
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distToEdge = Math.min(x, y, width - 1 - x, height - 1 - y)
      if (distToEdge < depth && next() < 0.7) {
        const idx = y * width + x
        // Only overwrite terrain tiles (non-zero), not buildings/empty
        if (terrainLayer[idx] > 0) {
          terrainLayer[idx] = borderTileIndices[Math.floor(next() * borderTileIndices.length)]
        }
      }
    }
  }
}

/**
 * Remap a chunk's layer indices from its local palette to a unified palette.
 * @param {object} chunk — chunk with .palette and .layers
 * @param {Map<string, number>} tileToIndex — unified palette lookup
 * @returns {object} new chunk object with remapped layer data
 */
export function remapChunk(chunk, tileToIndex) {
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
