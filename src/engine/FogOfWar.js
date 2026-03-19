/**
 * Fog of War — three-state tile visibility system.
 *
 * States:
 * - 'active'     → currently visible (full color)
 * - 'explored'   → previously seen (dimmed grayscale)
 * - 'unexplored' → never seen (fully black)
 */

/**
 * Determine the fog state for each tile.
 * @returns {Map<string, 'active'|'explored'|'unexplored'>}
 */
export function buildFogTileStates(activeVision, exploredSet, width, height) {
  const states = new Map()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`
      if (activeVision.has(key)) {
        states.set(key, 'active')
      } else if (exploredSet.has(key)) {
        states.set(key, 'explored')
      } else {
        states.set(key, 'unexplored')
      }
    }
  }
  return states
}

/**
 * Render fog of war overlay onto a PixiJS container.
 * Uses two shared Graphics objects (one per fog state) to batch all rects
 * into minimal draw calls, avoiding per-tile object creation.
 * @param {object} container — PixiJS container for fog layer
 * @param {Map} fogStates — from buildFogTileStates
 * @param {object} bounds — { startX, startY, endX, endY } from camera
 * @param {number} tileSize
 * @param {object} PIXI — PixiJS namespace
 */
export function renderFog(container, fogStates, bounds, tileSize, PIXI) {
  container.removeChildren()

  const unexploredGfx = new PIXI.Graphics()
  const exploredGfx = new PIXI.Graphics()

  for (let y = bounds.startY; y < bounds.endY; y++) {
    for (let x = bounds.startX; x < bounds.endX; x++) {
      const key = `${x},${y}`
      const state = fogStates.get(key) || 'unexplored'

      if (state === 'active') continue

      const gfx = state === 'unexplored' ? unexploredGfx : exploredGfx
      gfx.rect(x * tileSize, y * tileSize, tileSize, tileSize)
    }
  }

  unexploredGfx.fill({ color: 0x000000, alpha: 1.0 })
  exploredGfx.fill({ color: 0x000000, alpha: 0.55 })

  container.addChild(unexploredGfx)
  container.addChild(exploredGfx)
}

/**
 * Update explored set with newly active tiles.
 * @param {Set} exploredSet — mutable, will be modified
 * @param {Set} activeVision — current active tiles
 * @returns {string[]} newlyExplored — tiles that were added
 */
export function updateExplored(exploredSet, activeVision) {
  const newly = []
  for (const key of activeVision) {
    if (!exploredSet.has(key)) {
      exploredSet.add(key)
      newly.push(key)
    }
  }
  return newly
}
