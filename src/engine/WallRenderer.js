// src/engine/WallRenderer.js
import * as PIXI from 'pixi.js'
import { resolveWallTile, resolveCornerTiles } from '../lib/wallAutotile.js'
import { NORTH, EAST, SOUTH, WEST } from '../lib/wallEdgeExtractor.js'

/**
 * Renders wall edge sprites at sub-grid positions using FA connector tiles.
 * Replaces the solid-fill wall layer from TilemapRendererV2.
 */
export class WallRenderer {
  constructor(tileAtlas, tileSize) {
    this.tileAtlas = tileAtlas
    this.tileSize = tileSize
    this.container = new PIXI.Container()
    this.spriteMap = new Map() // "edge-x-y-dir" → sprite
    this.wallEdges = null
    this.width = 0
    this.height = 0
    this.theme = 'village'
  }

  setWallData(wallEdges, width, height, theme) {
    this.wallEdges = wallEdges
    this.width = width
    this.height = height
    this.theme = theme || 'village'
    // Clear existing sprites on area change
    this.clear()
  }

  render(bounds) {
    if (!this.wallEdges || !this.tileAtlas) return

    const ts = this.tileSize
    const tileStartX = Math.max(0, Math.floor(bounds.startX / ts))
    const tileStartY = Math.max(0, Math.floor(bounds.startY / ts))
    const tileEndX = Math.min(this.width - 1, Math.ceil(bounds.endX / ts))
    const tileEndY = Math.min(this.height - 1, Math.ceil(bounds.endY / ts))

    const needed = new Set()

    // Render edge segments
    for (let y = tileStartY; y <= tileEndY; y++) {
      for (let x = tileStartX; x <= tileEndX; x++) {
        const bits = this.wallEdges[y * this.width + x]
        if (bits === 0) continue

        // Only render wall bits (low 4), not door bits (high 4) — doors handled separately
        if (bits & NORTH) this._renderEdge(x, y, 'north', needed)
        if (bits & EAST)  this._renderEdge(x, y, 'east', needed)
        if (bits & SOUTH) this._renderEdge(x, y, 'south', needed)
        if (bits & WEST)  this._renderEdge(x, y, 'west', needed)
      }
    }

    // Render corners at grid vertices
    for (let y = tileStartY; y <= tileEndY + 1; y++) {
      for (let x = tileStartX; x <= tileEndX + 1; x++) {
        this._renderCorner(x, y, needed)
      }
    }

    // Remove sprites no longer needed
    for (const [key, sprite] of this.spriteMap) {
      if (!needed.has(key)) {
        this.container.removeChild(sprite)
        sprite.destroy()
        this.spriteMap.delete(key)
      }
    }
  }

  _renderEdge(x, y, dir, needed) {
    const key = `edge-${x}-${y}-${dir}`
    needed.add(key)
    if (this.spriteMap.has(key)) return // already rendered

    const isVertical = dir === 'east' || dir === 'west'
    const result = resolveWallTile(this.theme, isVertical ? 'vertical' : 'horizontal', x, y)
    const tileId = typeof result === 'string' ? result : result.tileId
    const rotate = typeof result === 'object' && result.rotate

    const info = this.tileAtlas.resolve(tileId)
    const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
    if (!tex) return

    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5, 0.5)
    sprite.width = this.tileSize
    sprite.height = this.tileSize

    const ts = this.tileSize
    const half = ts / 2
    switch (dir) {
      case 'north': sprite.x = x * ts + half; sprite.y = y * ts; break
      case 'south': sprite.x = x * ts + half; sprite.y = (y + 1) * ts; break
      case 'east':  sprite.x = (x + 1) * ts;  sprite.y = y * ts + half; break
      case 'west':  sprite.x = x * ts;         sprite.y = y * ts + half; break
    }

    if (rotate) sprite.rotation = Math.PI / 2

    this.container.addChild(sprite)
    this.spriteMap.set(key, sprite)
  }

  _renderCorner(vx, vy, needed) {
    // Check which edges meet at vertex (vx, vy)
    // Vertex is top-left corner of cell (vx, vy)
    const corners = []
    if (this._hasEdge(vx - 1, vy - 1, SOUTH) && this._hasEdge(vx - 1, vy - 1, EAST)) corners.push('SW')
    if (this._hasEdge(vx, vy - 1, SOUTH) && this._hasEdge(vx, vy - 1, WEST)) corners.push('SE')
    if (this._hasEdge(vx - 1, vy, NORTH) && this._hasEdge(vx - 1, vy, EAST)) corners.push('NW')
    if (this._hasEdge(vx, vy, NORTH) && this._hasEdge(vx, vy, WEST)) corners.push('NE')

    for (const corner of corners) {
      const key = `corner-${vx}-${vy}-${corner}`
      needed.add(key)
      if (this.spriteMap.has(key)) continue

      const tileId = resolveCornerTiles(this.theme, corner)
      if (!tileId) continue // theme composes corners from segments

      const info = this.tileAtlas.resolve(tileId)
      const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
      if (!tex) continue

      const sprite = new PIXI.Sprite(tex)
      sprite.anchor.set(0.5, 0.5)
      sprite.width = this.tileSize
      sprite.height = this.tileSize
      sprite.x = vx * this.tileSize
      sprite.y = vy * this.tileSize
      this.container.addChild(sprite)
      this.spriteMap.set(key, sprite)
    }
  }

  _hasEdge(x, y, bit) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false
    return !!(this.wallEdges[y * this.width + x] & bit)
  }

  clear() {
    for (const [, sprite] of this.spriteMap) {
      sprite.destroy()
    }
    this.spriteMap.clear()
    this.container.removeChildren()
  }
}
