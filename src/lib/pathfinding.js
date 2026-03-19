/**
 * Build a walkability grid from zone tile layers.
 * @param {number[][]} walls - Wall layer tile indices
 * @param {number[][]} props - Props layer tile indices
 * @param {Set<number>} blocking - Set of blocking tile indices
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {boolean[][]} true = walkable
 */
export function buildWalkabilityGrid(walls, props, blocking, width, height) {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const wallTile = walls[y]?.[x] ?? 0
      const propTile = props[y]?.[x] ?? 0
      const walkable = !blocking.has(wallTile) && !blocking.has(propTile)
      row.push(walkable)
    }
    grid.push(row)
  }
  return grid
}

/**
 * A* pathfinding on a 2D grid. 4-directional movement.
 * @param {boolean[][]} grid - Walkability grid
 * @param {{x:number, y:number}} start
 * @param {{x:number, y:number}} end
 * @returns {{x:number, y:number}[]|null} Path from start to end, or null
 */
export function findPath(grid, start, end) {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  if (!width || !height) return null

  const key = (x, y) => `${x},${y}`
  const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

  const open = [{ ...start, g: 0, f: heuristic(start, end) }]
  const cameFrom = new Map()
  const gScore = new Map()
  gScore.set(key(start.x, start.y), 0)

  const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]

  while (open.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open.splice(bestIdx, 1)[0]

    if (current.x === end.x && current.y === end.y) {
      const path = [{ x: end.x, y: end.y }]
      let k = key(end.x, end.y)
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k)
        path.unshift(prev)
        k = key(prev.x, prev.y)
      }
      return path
    }

    for (const dir of dirs) {
      const nx = current.x + dir.x
      const ny = current.y + dir.y
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (!grid[ny][nx]) continue

      const tentativeG = current.g + 1
      const nk = key(nx, ny)
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG)
        cameFrom.set(nk, { x: current.x, y: current.y })
        const f = tentativeG + heuristic({ x: nx, y: ny }, end)
        open.push({ x: nx, y: ny, g: tentativeG, f })
      }
    }
  }

  return null
}
