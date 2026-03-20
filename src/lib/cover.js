// src/lib/cover.js
import { isEdgeBlocked } from './pathfinding.js'

export function bresenhamLine(from, to) {
  const points = []
  let x0 = from.x, y0 = from.y
  const x1 = to.x, y1 = to.y
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  while (true) {
    points.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }
  return points
}

export function calculateCover(attackerPos, targetPos, wallEdges, propCover, width) {
  const line = bresenhamLine(attackerPos, targetPos)
  let wallCrossings = 0
  let propCrossings = 0
  for (let i = 0; i < line.length - 1; i++) {
    const from = line[i], to = line[i + 1]
    if (isEdgeBlocked(wallEdges, width, from.x, from.y, to.x, to.y)) {
      wallCrossings++
    }
    if (propCover.has(`${to.x},${to.y}`)) {
      propCrossings++
    }
  }
  const total = wallCrossings + propCrossings
  if (total >= 2) return 'three-quarters'
  if (total >= 1) return 'half'
  return 'none'
}

export const COVER_BONUS = { none: 0, half: 2, 'three-quarters': 5 }

export function buildPropCoverSet(propsLayer, palette, width, height) {
  const set = new Set()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const tileIdx = propsLayer[idx]
      if (tileIdx > 0) {
        const tileId = palette[tileIdx] || ''
        if (tileId && !tileId.includes('door')) {
          set.add(`${x},${y}`)
        }
      }
    }
  }
  return set
}
