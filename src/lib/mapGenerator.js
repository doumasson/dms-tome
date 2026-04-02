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
    const jitterX = Math.floor((rand() - 0.5) * cellW * 0.8)
    const jitterY = Math.floor((rand() - 0.5) * cellH * 0.8)

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
 * Generate a 2D value noise grid using bilinear interpolation.
 * @param {number} w - grid width
 * @param {number} h - grid height
 * @param {number} scale - spacing between random sample points
 * @param {Function} rand - seeded random function returning 0-1
 * @returns {Float32Array} noise values 0-1 for each cell
 */
function makeNoiseGrid(w, h, scale, rand) {
  const cw = Math.ceil(w / scale) + 2
  const ch = Math.ceil(h / scale) + 2
  const coarse = new Float32Array(cw * ch)
  for (let i = 0; i < coarse.length; i++) coarse[i] = rand()

  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fx = x / scale
      const fy = y / scale
      const ix = Math.floor(fx)
      const iy = Math.floor(fy)
      const tx = fx - ix
      const ty = fy - iy
      // Bilinear interpolation of 4 corners
      const tl = coarse[iy * cw + ix]
      const tr = coarse[iy * cw + ix + 1]
      const bl = coarse[(iy + 1) * cw + ix]
      const br = coarse[(iy + 1) * cw + ix + 1]
      const top = tl + (tr - tl) * tx
      const bot = bl + (br - bl) * tx
      out[y * w + x] = top + (bot - top) * ty
    }
  }
  return out
}

/**
 * Fill empty terrain cells using 2D value noise for natural-looking gradients.
 * Two octaves blended 70/30 for smooth terrain with local variety.
 */
export function fillTerrainNoise(terrainLayer, variantIndices, width, height, seed = 42) {
  if (!variantIndices.length) return
  const rand = seededRandom(seed)
  const noiseA = makeNoiseGrid(width, height, 8, rand)
  const noiseB = makeNoiseGrid(width, height, 4, rand)
  const count = variantIndices.length
  for (let i = 0; i < width * height; i++) {
    if (terrainLayer[i] !== 0) continue
    const v = noiseA[i] * 0.7 + noiseB[i] * 0.3
    const idx = Math.min(count - 1, Math.floor(v * count))
    terrainLayer[i] = variantIndices[idx]
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
 * @param {Uint16Array} propsLayer
 * @param {number[]} scatterTileIndices — palette indices of decoration tiles
 * @param {number} width
 * @param {number} height
 * @param {number} density — 0-1, fraction of empty tiles to fill (0.08 = 8%)
 * @param {number} seed
 * @param {Uint16Array} [wallsLayer] — skip cells with walls
 * @param {Set<number>} [roadIndices] — skip cells whose floor is a road tile
 * @param {Uint16Array} [floorLayer] — floor layer for road checking
 */
export function scatterProps(propsLayer, scatterTileIndices, width, height, density = 0.03, seed = 42, wallsLayer, roadIndices, floorLayer) {
  let rng = seed
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x
      // Skip cells that already have props, walls, road tiles, or no floor
      if (propsLayer[idx] !== 0) continue
      if (wallsLayer && wallsLayer[idx] !== 0) continue
      if (floorLayer && floorLayer[idx] === 0) continue // no floor = void/edge
      if (roadIndices && floorLayer && roadIndices.has(floorLayer[idx])) continue
      if (next() < density) {
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

/**
 * Paint a meandering road between two points using sine-wave displacement.
 * Creates organic-looking paths instead of rigid L-shapes.
 */
export function connectWithMeanderingRoad(terrainLayer, roadTileIdx, from, to, roadWidth, areaWidth, areaHeight, seed = 0) {
  let rng = (seed + 13) | 1
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return

  const steps = Math.ceil(dist * 1.5)
  const amplitude = 1 + next() * 1.5 // 1-2.5 tile displacement
  const freq = (0.3 + next() * 0.3) // wave frequency

  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    // Base position: linear interpolation
    let px = from.x + dx * t
    let py = from.y + dy * t
    // Perpendicular displacement via sine wave
    const perpX = -dy / dist
    const perpY = dx / dist
    const wave = Math.sin(t * Math.PI * 2 * freq * (dist / 15)) * amplitude
    px += perpX * wave
    py += perpY * wave

    const ix = Math.round(px)
    const iy = Math.round(py)
    // Paint road width
    for (let w = 0; w < roadWidth; w++) {
      for (let ww = 0; ww < roadWidth; ww++) {
        const rx = ix + w - Math.floor(roadWidth / 2)
        const ry = iy + ww - Math.floor(roadWidth / 2)
        if (rx >= 0 && ry >= 0 && rx < areaWidth && ry < areaHeight) {
          // Center always painted, edges 70% probability for rough look
          const isEdge = w === 0 || w === roadWidth - 1 || ww === 0 || ww === roadWidth - 1
          if (!isEdge || next() < 0.7) {
            terrainLayer[ry * areaWidth + rx] = roadTileIdx
          }
        }
      }
    }
  }
}

/**
 * Rotate a chunk 90 degrees clockwise. Returns a new chunk object.
 */
export function rotateChunk90(chunk) {
  const { width: oldW, height: oldH, layers, palette } = chunk
  const newW = oldH
  const newH = oldW
  const newLayers = {}
  for (const [name, data] of Object.entries(layers)) {
    const rotated = new Array(newW * newH).fill(0)
    for (let y = 0; y < oldH; y++) {
      for (let x = 0; x < oldW; x++) {
        // 90 CW: new(x,y) = old(y, oldW-1-x)
        rotated[x * newW + (newW - 1 - y)] = data[y * oldW + x]
      }
    }
    newLayers[name] = rotated
  }
  return { ...chunk, width: newW, height: newH, layers: newLayers }
}

/**
 * Flip a chunk horizontally. Returns a new chunk object.
 */
export function flipChunkH(chunk) {
  const { width, height, layers } = chunk
  const newLayers = {}
  for (const [name, data] of Object.entries(layers)) {
    const flipped = new Array(width * height).fill(0)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        flipped[y * width + (width - 1 - x)] = data[y * width + x]
      }
    }
    newLayers[name] = flipped
  }
  return { ...chunk, layers: newLayers }
}

/**
 * Apply a random transform (rotation/flip) to a chunk for variety.
 * @param {object} chunk - chunk object
 * @param {Function} rand - seeded RNG
 * @returns {object} transformed chunk
 */
export function randomTransform(chunk, rand) {
  if (chunk.rotatable === false) return chunk
  const roll = Math.floor(rand() * 4)
  let c = chunk
  if (roll === 1) c = rotateChunk90(c)
  else if (roll === 2) { c = rotateChunk90(c); c = rotateChunk90(c) }
  else if (roll === 3) c = flipChunkH(c)
  return c
}
