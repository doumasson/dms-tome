/**
 * TilemapRendererV2 — renders palette-based flat layers using FA sprite atlases.
 *
 * Uses a sprite pool for efficient per-frame updates driven by viewport culling.
 * Only visible tiles get sprites; off-screen tiles are recycled.
 */

import * as PIXI from 'pixi.js'

/**
 * Render visible tiles from a flat Uint16Array layer into a PIXI container.
 *
 * @param {PIXI.Container} container — target container (one per layer)
 * @param {Uint16Array} layer — flat tile data (palette indices), width*height
 * @param {number} width — area width in tiles
 * @param {number} height — area height in tiles
 * @param {number} tileSize — pixel size per tile (e.g. 200)
 * @param {object} tileAtlas — TileAtlasV2 instance with palette set
 * @param {{ startX: number, startY: number, endX: number, endY: number }} bounds — visible pixel bounds
 */
export function renderV2Layer(container, layer, width, height, tileSize, tileAtlas, bounds) {
  // Calculate visible tile range
  const tileStartX = Math.max(0, Math.floor(bounds.startX / tileSize))
  const tileStartY = Math.max(0, Math.floor(bounds.startY / tileSize))
  const tileEndX = Math.min(width - 1, Math.ceil(bounds.endX / tileSize))
  const tileEndY = Math.min(height - 1, Math.ceil(bounds.endY / tileSize))

  // Build set of needed tile keys for this frame
  const needed = []
  for (let y = tileStartY; y <= tileEndY; y++) {
    for (let x = tileStartX; x <= tileEndX; x++) {
      const paletteIdx = layer[y * width + x]
      if (paletteIdx === 0) continue
      needed.push({ x, y, paletteIdx })
    }
  }

  // Reuse existing sprites where possible, recycle extras
  const existing = container._tileMap || new Map() // key "x,y" → sprite
  const nextMap = new Map()
  const toRemove = new Map(existing)

  for (const { x, y, paletteIdx } of needed) {
    const key = `${x},${y}`
    toRemove.delete(key)

    let sprite = existing.get(key)
    const info = tileAtlas.resolveFromPalette(paletteIdx)
    const tex = info ? tileAtlas.getTexture(info, PIXI) : null

    if (!tex) {
      // No texture available — skip (or remove stale sprite)
      if (sprite) { container.removeChild(sprite); sprite.destroy() }
      continue
    }

    if (sprite) {
      // Update texture if palette index changed
      if (sprite._paletteIdx !== paletteIdx) {
        sprite.texture = tex
        sprite._paletteIdx = paletteIdx
      }
    } else {
      // Create new sprite
      sprite = new PIXI.Sprite(tex)
      sprite.roundPixels = true
      sprite.x = x * tileSize
      sprite.y = y * tileSize
      sprite.width = tileSize
      sprite.height = tileSize
      sprite._paletteIdx = paletteIdx
      container.addChild(sprite)
    }

    nextMap.set(key, sprite)
  }

  // Remove sprites that are no longer visible
  for (const [, sprite] of toRemove) {
    container.removeChild(sprite)
    sprite.destroy()
  }

  container._tileMap = nextMap
}

/**
 * Clear all sprites from a V2 layer container.
 */
export function clearV2Layer(container) {
  if (container._tileMap) {
    for (const [, sprite] of container._tileMap) {
      sprite.destroy()
    }
    container._tileMap = null
  }
  container.removeChildren()
}
