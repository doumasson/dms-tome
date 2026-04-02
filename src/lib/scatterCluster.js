/**
 * Cluster-based scatter system for natural-looking prop placement.
 * Replaces uniform random scattering with grouped clusters + ambient fill.
 */

import { THEME_SCATTER, THEME_SCATTER_DENSITY, CLUSTER_CONFIG } from './themeData.js'

/**
 * Simple LCG PRNG for fast, deterministic random numbers.
 */
function makeLCG(seed) {
  let s = seed | 0 || 1
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/**
 * Weighted random selection from scatter items.
 * @param {Array} items - scatter items with .weight
 * @param {number[]} weights - cumulative weight array (precomputed)
 * @param {number} totalWeight - sum of all weights
 * @param {Function} rand - RNG function
 * @returns {object} selected scatter item
 */
function weightedPick(items, cumWeights, totalWeight, rand) {
  const r = rand() * totalWeight
  for (let i = 0; i < items.length; i++) {
    if (r < cumWeights[i]) return items[i]
  }
  return items[items.length - 1]
}

/**
 * Check if a multi-tile prop can be placed at (x,y) without overlapping
 * existing props, walls, roads, or map edges.
 */
function canPlace(x, y, sw, sh, width, height, propsLayer, wallsLayer, floorLayer, roadIdxSet) {
  if (x + sw > width - 2 || y + sh > height - 2 || x < 2 || y < 2) return false
  for (let dy = 0; dy < sh; dy++) {
    for (let dx = 0; dx < sw; dx++) {
      const idx = (y + dy) * width + (x + dx)
      if (propsLayer[idx] !== 0) return false
      if (wallsLayer && wallsLayer[idx] !== 0) return false
      if (floorLayer && floorLayer[idx] === 0) return false
      if (roadIdxSet && floorLayer && roadIdxSet.has(floorLayer[idx])) return false
    }
  }
  return true
}

/**
 * Mark cells as occupied after placing a multi-tile prop.
 * Only the top-left cell gets the tile index; other cells get a sentinel (-1 cast to uint16).
 */
function markPlaced(x, y, sw, sh, width, propsLayer, tileIdx) {
  propsLayer[y * width + x] = tileIdx
  // Mark remaining cells of multi-tile prop so they aren't overwritten
  for (let dy = 0; dy < sh; dy++) {
    for (let dx = 0; dx < sw; dx++) {
      if (dx === 0 && dy === 0) continue
      const idx = (y + dy) * width + (x + dx)
      // Use a sentinel value (65535) to mark as occupied without rendering
      if (propsLayer[idx] === 0) propsLayer[idx] = 65535
    }
  }
}

/**
 * Run clustered scatter across an area.
 * @param {object} layers - { floor, walls, props, roof } Uint16Arrays
 * @param {string} theme - theme name
 * @param {number} width - area width
 * @param {number} height - area height
 * @param {number} seed - RNG seed
 * @param {Set<number>} roadIdxSet - floor indices that are roads
 * @param {Map<string,number>} tileToIndex - palette lookup
 */
export function clusterScatter(layers, theme, width, height, seed, roadIdxSet, tileToIndex) {
  const scatterItems = THEME_SCATTER[theme] || THEME_SCATTER.village
  const density = THEME_SCATTER_DENSITY[theme] || 0.08
  const rand = makeLCG(seed)

  // Resolve palette indices for all scatter items
  const resolved = scatterItems
    .map(item => ({ ...item, idx: tileToIndex.get(item.id) }))
    .filter(item => item.idx)

  if (!resolved.length) return

  // Precompute cumulative weights
  const cumWeights = []
  let totalWeight = 0
  for (const item of resolved) {
    totalWeight += item.weight
    cumWeights.push(totalWeight)
  }

  // Group items by scatter group
  const groups = new Map()
  for (const item of resolved) {
    if (!groups.has(item.group)) groups.set(item.group, [])
    groups.get(item.group).push(item)
  }

  // Phase 1: Seed clusters for each group
  const clusterCenters = [] // { x, y, group, radius }
  for (const [groupName, groupItems] of groups) {
    const config = CLUSTER_CONFIG[groupName] || { clusterChance: 0.3, radius: 3, minClusters: 1, maxClusters: 2 }
    if (rand() > config.clusterChance) continue
    const numClusters = config.minClusters + Math.floor(rand() * (config.maxClusters - config.minClusters + 1))
    for (let c = 0; c < numClusters; c++) {
      const cx = 4 + Math.floor(rand() * (width - 8))
      const cy = 4 + Math.floor(rand() * (height - 8))
      clusterCenters.push({ x: cx, y: cy, group: groupName, radius: config.radius, items: groupItems })
    }
  }

  // Phase 2: Fill clusters — density falls off from center
  for (const cluster of clusterCenters) {
    const { x: cx, y: cy, radius, items } = cluster
    // Precompute group-specific cumulative weights
    const groupCum = []
    let groupTotal = 0
    for (const item of items) {
      groupTotal += item.weight
      groupCum.push(groupTotal)
    }

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = cx + dx
        const py = cy + dy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > radius) continue
        // Falloff: denser at center
        const falloff = 1 - (dist / radius)
        const placeProbability = density * 2.5 * falloff * falloff
        if (rand() > placeProbability) continue

        const item = weightedPick(items, groupCum, groupTotal, rand)
        const [sw, sh] = item.size
        if (canPlace(px, py, sw, sh, width, height, layers.props, layers.walls, layers.floor, roadIdxSet)) {
          markPlaced(px, py, sw, sh, width, layers.props, item.idx)
        }
      }
    }
  }

  // Phase 3: Ambient fill — sparse uniform pass for props outside clusters
  const ambientDensity = density * 0.35
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x
      if (layers.props[idx] !== 0) continue
      if (layers.walls && layers.walls[idx] !== 0) continue
      if (layers.floor && layers.floor[idx] === 0) continue
      if (roadIdxSet && layers.floor && roadIdxSet.has(layers.floor[idx])) continue
      if (rand() > ambientDensity) continue

      const item = weightedPick(resolved, cumWeights, totalWeight, rand)
      const [sw, sh] = item.size
      if (canPlace(x, y, sw, sh, width, height, layers.props, layers.walls, layers.floor, roadIdxSet)) {
        markPlaced(x, y, sw, sh, width, layers.props, item.idx)
      }
    }
  }

  // Clean up sentinel values (65535) — set to 0 so renderer skips them
  // The renderer only draws cells with valid palette indices
  for (let i = 0; i < layers.props.length; i++) {
    if (layers.props[i] === 65535) layers.props[i] = 0
  }
}
