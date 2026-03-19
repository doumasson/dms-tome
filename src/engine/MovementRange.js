import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

/**
 * Flood-fill from a position to find all reachable tiles within movement range.
 * @param {boolean[][]} walkGrid - Walkability grid
 * @param {{x:number,y:number}} start - Starting position
 * @param {number} maxTiles - Maximum tiles of movement (speed / 5)
 * @returns {Set<string>} Set of "x,y" strings for reachable tiles
 */
export function getReachableTiles(walkGrid, start, maxTiles) {
  const reachable = new Set()
  const queue = [{ ...start, cost: 0 }]
  const visited = new Set()
  visited.add(`${start.x},${start.y}`)

  while (queue.length > 0) {
    const { x, y, cost } = queue.shift()
    reachable.add(`${x},${y}`)

    if (cost >= maxTiles) continue

    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]
    for (const d of dirs) {
      const nx = x + d.x
      const ny = y + d.y
      const key = `${nx},${ny}`
      if (visited.has(key)) continue
      if (ny < 0 || nx < 0 || ny >= walkGrid.length || nx >= walkGrid[0]?.length) continue
      if (!walkGrid[ny][nx]) continue
      visited.add(key)
      queue.push({ x: nx, y: ny, cost: cost + 1 })
    }
  }

  return reachable
}

/**
 * Render movement range highlight onto a PixiJS container.
 * @param {PIXI.Container} container - Container to render into
 * @param {Set<string>} reachable - Set of "x,y" reachable tile keys
 * @param {number} color - Highlight color (default blue)
 * @param {number} alpha - Highlight alpha
 */
export function renderMovementRange(container, reachable, color = 0x4499dd, alpha = 0.12) {
  container.removeChildren()
  const tileSize = getTileSize()
  const g = new PIXI.Graphics()

  for (const key of reachable) {
    const [x, y] = key.split(',').map(Number)
    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
  }
  g.fill({ color, alpha })

  // Border around the range
  for (const key of reachable) {
    const [x, y] = key.split(',').map(Number)
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
    for (const [dx, dy] of dirs) {
      if (!reachable.has(`${x+dx},${y+dy}`)) {
        // Draw edge border
        const px = x * tileSize
        const py = y * tileSize
        if (dx === 0 && dy === -1) g.moveTo(px, py).lineTo(px + tileSize, py)
        if (dx === 0 && dy === 1) g.moveTo(px, py + tileSize).lineTo(px + tileSize, py + tileSize)
        if (dx === -1 && dy === 0) g.moveTo(px, py).lineTo(px, py + tileSize)
        if (dx === 1 && dy === 0) g.moveTo(px + tileSize, py).lineTo(px + tileSize, py + tileSize)
      }
    }
  }
  g.stroke({ width: 1.5, color, alpha: 0.3 })

  container.addChild(g)
}

export function clearMovementRange(container) {
  container.removeChildren()
}
