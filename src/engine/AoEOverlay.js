import * as PIXI from 'pixi.js'

export function getTilesInSphere(center, radiusTiles) {
  const tiles = []
  for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
    for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) <= radiusTiles) {
        tiles.push({ x: center.x + dx, y: center.y + dy })
      }
    }
  }
  return tiles
}

export function getTilesInCone(origin, direction, lengthTiles) {
  const dirVectors = {
    N: { dx: 0, dy: -1 }, NE: { dx: 1, dy: -1 }, E: { dx: 1, dy: 0 }, SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 }, SW: { dx: -1, dy: 1 }, W: { dx: -1, dy: 0 }, NW: { dx: -1, dy: -1 },
  }
  const dir = dirVectors[direction] || dirVectors.N
  const angle = Math.atan2(dir.dy, dir.dx)
  const halfAngle = Math.PI / 3 // ~53 degrees (5e cone)
  const tiles = []

  for (let dy = -lengthTiles; dy <= lengthTiles; dy++) {
    for (let dx = -lengthTiles; dx <= lengthTiles; dx++) {
      if (dx === 0 && dy === 0) continue
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > lengthTiles) continue
      const tileAngle = Math.atan2(dy, dx)
      let angleDiff = Math.abs(tileAngle - angle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      if (angleDiff <= halfAngle) {
        tiles.push({ x: origin.x + dx, y: origin.y + dy })
      }
    }
  }
  return tiles
}

export function getTilesInLine(origin, direction, lengthTiles) {
  const dirVectors = {
    N: { dx: 0, dy: -1 }, NE: { dx: 1, dy: -1 }, E: { dx: 1, dy: 0 }, SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 }, SW: { dx: -1, dy: 1 }, W: { dx: -1, dy: 0 }, NW: { dx: -1, dy: -1 },
  }
  const dir = dirVectors[direction] || dirVectors.N
  const tiles = []
  for (let i = 1; i <= lengthTiles; i++) {
    tiles.push({ x: origin.x + dir.dx * i, y: origin.y + dir.dy * i })
  }
  return tiles
}

export function getTilesInCube(center, sizeTiles) {
  const half = Math.floor(sizeTiles / 2)
  const tiles = []
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      tiles.push({ x: center.x + dx, y: center.y + dy })
    }
  }
  return tiles
}

/** Render AoE preview as colored tile highlights */
export function renderAoEPreview(container, tiles, tileSize, color = 0xff4400) {
  clearAoEPreview(container)
  for (const { x, y } of tiles) {
    const g = new PIXI.Graphics()
    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
    g.fill({ color, alpha: 0.3 })
    g.stroke({ width: 2, color, alpha: 0.6 })
    g._isAoE = true
    container.addChild(g)
  }
}

export function clearAoEPreview(container) {
  for (let i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i]._isAoE) {
      container.children[i].destroy()
      container.removeChildAt(i)
    }
  }
}

/** Render a range overlay (Chebyshev distance) around caster position */
export function renderRangeOverlay(container, casterPos, rangeTiles, tileSize, color = 0x4466ff) {
  clearRangeOverlay(container)
  for (let dx = -rangeTiles; dx <= rangeTiles; dx++) {
    for (let dy = -rangeTiles; dy <= rangeTiles; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) > rangeTiles) continue
      const g = new PIXI.Graphics()
      g.rect((casterPos.x + dx) * tileSize, (casterPos.y + dy) * tileSize, tileSize, tileSize)
      g.fill({ color, alpha: 0.08 })
      g._isRange = true
      container.addChild(g)
    }
  }
}

export function clearRangeOverlay(container) {
  for (let i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i]._isRange) {
      container.children[i].destroy()
      container.removeChildAt(i)
    }
  }
}
