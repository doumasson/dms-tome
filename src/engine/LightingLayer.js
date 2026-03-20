import * as PIXI from 'pixi.js'

// Light source colors and default radii (in tiles)
const LIGHT_CONFIGS = {
  fireplace:  { color: 0xff8833, bright: 3, dim: 2, alpha: 0.15 },
  torch:      { color: 0xffaa44, bright: 4, dim: 4, alpha: 0.12 },
  candle:     { color: 0xffcc66, bright: 1, dim: 1, alpha: 0.10 },
  lantern:    { color: 0xffbb55, bright: 6, dim: 6, alpha: 0.12 },
  sconce:     { color: 0xff9944, bright: 3, dim: 2, alpha: 0.12 },
  campfire:   { color: 0xff6622, bright: 4, dim: 4, alpha: 0.15 },
}

/**
 * Render warm glow circles around light sources.
 * @param {PIXI.Container} container — lighting layer container
 * @param {Array} lightSources — [{position: {x,y}, type: string, bright?: number, dim?: number}]
 * @param {number} tileSize — pixel size per tile
 * @param {{ startX: number, startY: number, endX: number, endY: number }} bounds — visible pixel bounds for culling
 */
export function renderLighting(container, lightSources, tileSize, bounds) {
  container.removeChildren()
  if (!lightSources?.length) return

  for (const source of lightSources) {
    const config = LIGHT_CONFIGS[source.type] || LIGHT_CONFIGS.torch
    const px = source.position.x * tileSize + tileSize / 2
    const py = source.position.y * tileSize + tileSize / 2

    // Cull lights outside viewport (with generous buffer)
    const brightR = (source.bright || config.bright) * tileSize
    const dimR = (source.dim || config.dim) * tileSize
    const maxRadius = brightR + dimR
    if (px + maxRadius < bounds.startX || px - maxRadius > bounds.endX) continue
    if (py + maxRadius < bounds.startY || py - maxRadius > bounds.endY) continue

    const totalRadius = brightR + dimR
    const baseAlpha = config.alpha

    // Draw concentric circles from outside in (dim → bright)
    const g = new PIXI.Graphics()

    const rings = 6
    for (let i = rings; i >= 1; i--) {
      const r = totalRadius * (i / rings)
      const a = baseAlpha * (1 - i / (rings + 1))
      g.circle(px, py, r).fill({ color: config.color, alpha: a })
    }

    // Inner bright core
    g.circle(px, py, brightR * 0.5).fill({ color: config.color, alpha: baseAlpha * 1.2 })

    container.addChild(g)
  }
}

export function clearLighting(container) {
  container.removeChildren()
}
