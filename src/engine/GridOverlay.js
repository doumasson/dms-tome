import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

export function renderGrid(container, width, height, color = 0xc9a84c, alpha = 0.04, tileSizeOverride) {
  const tileSize = tileSizeOverride || getTileSize()
  const g = new PIXI.Graphics()

  // PixiJS v8 Graphics API: chain moveTo/lineTo then call stroke() with style
  for (let x = 0; x <= width; x++) {
    g.moveTo(x * tileSize, 0).lineTo(x * tileSize, height * tileSize)
  }
  for (let y = 0; y <= height; y++) {
    g.moveTo(0, y * tileSize).lineTo(width * tileSize, y * tileSize)
  }

  g.stroke({ width: 0.5, color, alpha })
  container.addChild(g)
}

export function clearGrid(container) {
  container.removeChildren()
}
