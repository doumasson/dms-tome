// src/lib/gridUtils.js
export function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/**
 * If `pos` is within MIN_DIST tiles of any enemy, find the nearest walkable
 * tile that is at least MIN_DIST tiles from every enemy.
 *
 * @param {object}     pos        — { x, y } candidate spawn
 * @param {Array}      enemies    — [{ position: { x, y } }, ...]
 * @param {object}     area       — { width, height, cellBlocked?, wallEdges?, layers? }
 * @param {number}     [minDist=3]— minimum Chebyshev distance from any enemy
 * @returns {{ x: number, y: number }} safe position (original if already safe)
 */
export function safeguardSpawn(pos, enemies, area, minDist = 3) {
  if (!enemies || enemies.length === 0) return pos

  // Check if current position is already safe
  const tooClose = enemies.some(e => e.position && chebyshev(pos, e.position) < minDist)
  if (!tooClose) return pos

  const { width, height, cellBlocked, wallEdges, layers } = area

  // Helper: is a tile walkable?
  function isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false
    const idx = y * width + x
    // Blocked by prop collision
    if (cellBlocked && cellBlocked[idx]) return false
    // Must have a floor tile (index > 0 means a floor was placed)
    if (layers?.floor && layers.floor[idx] === 0) return false
    // Must not be a wall cell
    if (layers?.walls && layers.walls[idx] !== 0) return false
    return true
  }

  // BFS outward from original pos to find nearest safe + walkable tile
  let best = null
  let bestDist = Infinity
  const maxSearch = 12 // don't search too far

  for (let r = 1; r <= maxSearch; r++) {
    // Check ring at Chebyshev distance r from original pos
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue // only ring edge
        const cx = pos.x + dx
        const cy = pos.y + dy
        if (!isWalkable(cx, cy)) continue

        // Check distance to all enemies
        const candidate = { x: cx, y: cy }
        const safeFromAll = enemies.every(e =>
          !e.position || chebyshev(candidate, e.position) >= minDist
        )
        if (!safeFromAll) continue

        // Pick the candidate closest to original pos
        const d = Math.abs(dx) + Math.abs(dy)
        if (d < bestDist) {
          best = candidate
          bestDist = d
        }
      }
    }
    if (best) break // found something on this ring, no need to go further
  }

  if (best) {
    console.log(`[safeguardSpawn] Moved spawn from (${pos.x},${pos.y}) to (${best.x},${best.y}) — enemies too close`)
    return best
  }

  // Fallback: couldn't find a safe tile, return original
  console.warn(`[safeguardSpawn] No safe tile found within ${maxSearch} tiles, using original position`)
  return pos
}
