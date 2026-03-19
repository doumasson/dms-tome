import * as PIXI from 'pixi.js'
import { getTileTexture, getTileSize } from './tileAtlas'

export function renderTilemap(container, layer) {
  const tileSize = getTileSize()
  for (let y = 0; y < layer.length; y++) {
    for (let x = 0; x < layer[y].length; x++) {
      const tileIndex = layer[y][x]
      if (tileIndex < 0) continue // -1 = empty tile
      const texture = getTileTexture(tileIndex)
      if (!texture) continue
      const sprite = new PIXI.Sprite(texture)
      sprite.x = x * tileSize
      sprite.y = y * tileSize
      sprite.width = tileSize
      sprite.height = tileSize
      container.addChild(sprite)
    }
  }
}

export function clearTilemap(container) {
  container.removeChildren()
}
