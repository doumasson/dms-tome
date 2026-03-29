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
 * @param {boolean} isNight — boost light intensity at night to counteract darkness tint
 */
export function renderLighting(container, lightSources, tileSize, bounds, isNight = false) {
  container.removeChildren()
  if (!lightSources?.length) return

  // At night, lights glow brighter to counteract the darkness tint
  const nightBoost = isNight ? 2.5 : 1.0

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
    const baseAlpha = Math.min(config.alpha * nightBoost, 0.5)

    // Draw smooth gradient with many rings (outer dim → inner bright)
    const g = new PIXI.Graphics()

    const rings = 16 // smooth gradient (was 6 = visible stepped circles)
    for (let i = rings; i >= 1; i--) {
      const t = i / rings // 1 (outer) → 0 (inner)
      const r = totalRadius * t
      // Exponential falloff for more natural light
      const a = baseAlpha * Math.pow(1 - t, 1.5)
      g.circle(px, py, r).fill({ color: config.color, alpha: a })
    }

    // Soft bright core
    g.circle(px, py, brightR * 0.4).fill({ color: config.color, alpha: Math.min(baseAlpha * 0.8, 0.35) })

    container.addChild(g)
  }
}

export function clearLighting(container) {
  container.removeChildren()
}
