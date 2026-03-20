// src/engine/WallRenderer.js
import * as PIXI from 'pixi.js'
import { resolveWallTile } from '../lib/wallAutotile.js'
import { NORTH, EAST, SOUTH, WEST } from '../lib/wallEdgeExtractor.js'

/**
 * Renders walls using three full-size FA connector sprites per boundary edge.
 * Sprites are spaced along the edge for full coverage with no gaps.
 * No dark fill — just the wall line where floor meets wall.
 */

const SPRITES_PER_EDGE = 3

export class WallRenderer {
  constructor(tileAtlas, tileSize) {
    this.tileAtlas = tileAtlas
    this.tileSize = tileSize
    this.container = new PIXI.Container()
    this.edgeContainer = new PIXI.Container()
    this.doorContainer = new PIXI.Container()
    this.container.addChild(this.edgeContainer)
    this.container.addChild(this.doorContainer)
    this.edgeMap = new Map()
    this.doorMap = new Map()
    this.wallEdges = null
    this.wallsLayer = null
    this.palette = null
    this.doorCells = null
    this.regionMap = null
    this.width = 0
    this.height = 0
    this.theme = 'village'
  }

  setWallData(wallEdges, wallsLayer, palette, width, height, theme, buildings) {
    this.wallEdges = wallEdges
    this.wallsLayer = wallsLayer
    this.palette = palette
    this.width = width
    this.height = height
    this.theme = theme || 'village'
    this._buildRegionMap(buildings)
    this._buildDoorSet()
    this.clear()
  }

  _buildDoorSet() {
    this.doorCells = new Set()
    if (!this.wallsLayer || !this.palette) return
    const size = this.width * this.height
    for (let i = 0; i < size; i++) {
      const pIdx = this.wallsLayer[i]
      if (pIdx === 0) continue
      if ((this.palette[pIdx] || '').includes('door')) {
        this.doorCells.add(i)
      }
    }
  }

  _buildRegionMap(buildings) {
    const size = this.width * this.height
    this.regionMap = new Uint8Array(size)
    this.buildings = buildings || []
    if (!buildings || !buildings.length) return
    for (let bi = 0; bi < buildings.length; bi++) {
      const b = buildings[bi]
      for (let y = b.y; y < b.y + b.height && y < this.height; y++) {
        for (let x = b.x; x < b.x + b.width && x < this.width; x++) {
          if (x >= 0 && y >= 0) {
            this.regionMap[y * this.width + x] = bi + 1
          }
        }
      }
    }
  }

  render(bounds) {
    if (!this.wallEdges || !this.tileAtlas) return

    const ts = this.tileSize
    const tileStartX = Math.max(0, Math.floor(bounds.startX / ts) - 1)
    const tileStartY = Math.max(0, Math.floor(bounds.startY / ts) - 1)
    const tileEndX = Math.min(this.width - 1, Math.ceil(bounds.endX / ts) + 1)
    const tileEndY = Math.min(this.height - 1, Math.ceil(bounds.endY / ts) + 1)

    const neededEdges = new Set()
    const neededDoors = new Set()

    for (let y = tileStartY; y <= tileEndY; y++) {
      for (let x = tileStartX; x <= tileEndX; x++) {
        const idx = y * this.width + x
        const isDoor = this.doorCells.has(idx)

        if (isDoor) {
          const doorKey = `door-${x}-${y}`
          neededDoors.add(doorKey)
          if (!this.doorMap.has(doorKey)) {
            this._renderDoor(x, y, idx, doorKey)
          }
          continue
        }

        const bits = this.wallEdges[idx] & 0x0F
        if (bits === 0) continue

        const regionId = this.regionMap ? this.regionMap[idx] : 0

        // Only render edges that face INWARD (toward building center).
        // This gives a single clean inner wall line — no outer edges, no corner remnants.
        const hasN = bits & NORTH, hasS = bits & SOUTH
        const hasE = bits & EAST,  hasW = bits & WEST

        const b = regionId > 0 ? this.buildings[regionId - 1] : null

        if (b) {
          const centerX = b.x + b.width / 2
          const centerY = b.y + b.height / 2
          // Only render an edge if it faces toward the building center
          if (hasN && y > centerY)  this._renderEdgeTiled(x, y, 'north', regionId, neededEdges)
          if (hasS && y < centerY)  this._renderEdgeTiled(x, y, 'south', regionId, neededEdges)
          if (hasW && x > centerX)  this._renderEdgeTiled(x, y, 'west', regionId, neededEdges)
          if (hasE && x < centerX)  this._renderEdgeTiled(x, y, 'east', regionId, neededEdges)
        } else {
          // Non-building walls: render all edges (no dedup)
          if (hasN) this._renderEdgeTiled(x, y, 'north', regionId, neededEdges)
          if (hasS) this._renderEdgeTiled(x, y, 'south', regionId, neededEdges)
          if (hasE) this._renderEdgeTiled(x, y, 'east', regionId, neededEdges)
          if (hasW) this._renderEdgeTiled(x, y, 'west', regionId, neededEdges)
        }
      }
    }

    for (const [key, sprite] of this.edgeMap) {
      if (!neededEdges.has(key)) {
        this.edgeContainer.removeChild(sprite)
        sprite.destroy()
        this.edgeMap.delete(key)
      }
    }
    for (const [key, sprite] of this.doorMap) {
      if (!neededDoors.has(key)) {
        this.doorContainer.removeChild(sprite)
        sprite.destroy()
        this.doorMap.delete(key)
      }
    }
  }

  _renderEdgeTiled(x, y, dir, regionId, needed) {
    const isVertical = dir === 'east' || dir === 'west'
    const result = resolveWallTile(this.theme, isVertical ? 'vertical' : 'horizontal', x, y, regionId)
    const tileId = typeof result === 'string' ? result : result.tileId
    const rotate = typeof result === 'object' && result.rotate

    const info = this.tileAtlas.resolve(tileId)
    const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
    if (!tex) return

    const ts = this.tileSize
    const step = ts / SPRITES_PER_EDGE

    for (let i = 0; i < SPRITES_PER_EDGE; i++) {
      const key = `edge-${x}-${y}-${dir}-${i}`
      needed.add(key)
      if (this.edgeMap.has(key)) continue

      const sprite = new PIXI.Sprite(tex)
      sprite.anchor.set(0.5, 0.5)
      sprite.width = ts
      sprite.height = ts

      const offset = step * i + step / 2

      if (!isVertical) {
        sprite.x = x * ts + offset
        sprite.y = dir === 'north' ? y * ts : (y + 1) * ts
      } else {
        sprite.x = dir === 'west' ? x * ts : (x + 1) * ts
        sprite.y = y * ts + offset
      }

      if (rotate) sprite.rotation = Math.PI / 2

      this.edgeContainer.addChild(sprite)
      this.edgeMap.set(key, sprite)
    }
  }

  _renderDoor(x, y, idx, key) {
    const pIdx = this.wallsLayer[idx]
    const tileId = this.palette[pIdx]
    if (!tileId) return

    const info = this.tileAtlas.resolve(tileId)
    const tex = info ? this.tileAtlas.getTexture(info, PIXI) : null
    if (!tex) return

    const ts = this.tileSize
    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5, 0.5)
    sprite.width = ts
    sprite.height = ts

    // Position door on the inner wall edge (same logic as wall connectors)
    const regionId = this.regionMap ? this.regionMap[idx] : 0
    const b = regionId > 0 ? this.buildings[regionId - 1] : null
    const bits = this.wallEdges[idx]

    // Find which edge faces interior — that's where the door sits
    const half = ts / 2
    if (b) {
      const centerX = b.x + b.width / 2
      const centerY = b.y + b.height / 2
      // Determine if door is on a horizontal or vertical wall
      const hasN = bits & 0x10, hasS = bits & 0x40 // DOOR_N, DOOR_S
      const hasE = bits & 0x20, hasW = bits & 0x80 // DOOR_E, DOOR_W
      if ((hasN || hasS) && !(hasE || hasW)) {
        // Horizontal wall — door on north or south edge
        sprite.x = x * ts + half
        sprite.y = y < centerY ? (y + 1) * ts : y * ts // inner edge
      } else if ((hasE || hasW) && !(hasN || hasS)) {
        // Vertical wall — door on east or west edge
        sprite.x = x < centerX ? (x + 1) * ts : x * ts // inner edge
        sprite.y = y * ts + half
        sprite.rotation = Math.PI / 2
      } else {
        // Fallback: center of cell
        sprite.x = x * ts + half
        sprite.y = y * ts + half
      }
    } else {
      sprite.x = x * ts + half
      sprite.y = y * ts + half
    }

    this.doorContainer.addChild(sprite)
    this.doorMap.set(key, sprite)
  }

  clear() {
    for (const [, s] of this.edgeMap) s.destroy()
    for (const [, s] of this.doorMap) s.destroy()
    this.edgeMap.clear()
    this.doorMap.clear()
    this.edgeContainer.removeChildren()
    this.doorContainer.removeChildren()
  }
}
