/**
 * Pathfinding — binary heap A* on Uint8Array collision grids.
 * Includes legacy wrappers for V1 backward compatibility.
 */

/** Binary min-heap for A* open set */
class MinHeap {
  constructor() { this.data = [] }

  push(item) {
    this.data.push(item)
    this._bubbleUp(this.data.length - 1)
  }

  pop() {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  get size() { return this.data.length }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[i].f >= this.data[parent].f) break
      ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
      i = parent
    }
  }

  _sinkDown(i) {
    const n = this.data.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.data[left].f < this.data[smallest].f) smallest = left
      if (right < n && this.data[right].f < this.data[smallest].f) smallest = right
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}

const DIRS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }]

/**
 * A* pathfinding on a Uint8Array collision grid.
 * @param {Uint8Array} collision — flat array, 0=walkable, 1=blocked
 * @param {number} width — grid width
 * @param {number} height — grid height
 * @param {{x,y}} start
 * @param {{x,y}} end
 * @returns {Array<{x,y}>|null} path including start and end, or null
 */
export function findPath(collision, width, height, start, end) {
  if (collision[end.y * width + end.x] === 1) return null
  if (start.x === end.x && start.y === end.y) return [start]

  const size = width * height
  const gScore = new Float32Array(size).fill(Infinity)
  const cameFrom = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)

  const idx = (x, y) => y * width + x
  const heuristic = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y)

  const startIdx = idx(start.x, start.y)
  gScore[startIdx] = 0

  const open = new MinHeap()
  open.push({ x: start.x, y: start.y, f: heuristic(start.x, start.y), idx: startIdx })

  while (open.size > 0) {
    const curr = open.pop()
    if (curr.x === end.x && curr.y === end.y) {
      const path = []
      let ci = curr.idx
      while (ci !== -1) {
        path.push({ x: ci % width, y: (ci / width) | 0 })
        ci = cameFrom[ci]
      }
      return path.reverse()
    }

    if (closed[curr.idx]) continue
    closed[curr.idx] = 1

    for (const { dx, dy } of DIRS) {
      const nx = curr.x + dx
      const ny = curr.y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

      const ni = idx(nx, ny)
      if (closed[ni] || collision[ni] === 1) continue

      const tentG = gScore[curr.idx] + 1
      if (tentG < gScore[ni]) {
        gScore[ni] = tentG
        cameFrom[ni] = curr.idx
        open.push({ x: nx, y: ny, f: tentG + heuristic(nx, ny), idx: ni })
      }
    }
  }

  return null
}

// Edge bit constants (must match wallEdgeExtractor.js)
const EDGE_N = 0x1, EDGE_E = 0x2, EDGE_S = 0x4, EDGE_W = 0x8

/**
 * Check if movement from (fromX,fromY) to (toX,toY) is blocked by a wall edge.
 */
function isEdgeBlocked(wallEdges, width, fromX, fromY, toX, toY) {
  const fromIdx = fromY * width + fromX
  const dx = toX - fromX
  const dy = toY - fromY
  if (dy === -1) return !!(wallEdges[fromIdx] & EDGE_N)
  if (dx === 1)  return !!(wallEdges[fromIdx] & EDGE_E)
  if (dy === 1)  return !!(wallEdges[fromIdx] & EDGE_S)
  if (dx === -1) return !!(wallEdges[fromIdx] & EDGE_W)
  return false
}

/**
 * A* pathfinding with edge-based wall collision + cell-based prop collision.
 * @param {{ wallEdges: Uint8Array, cellBlocked: Uint8Array }} collisionData
 * @param {number} width
 * @param {number} height
 * @param {{x,y}} start
 * @param {{x,y}} end
 * @returns {Array<{x,y}>|null}
 */
export function findPathEdge(collisionData, width, height, start, end) {
  const { wallEdges, cellBlocked } = collisionData
  if (cellBlocked[end.y * width + end.x] === 1) return null
  if (start.x === end.x && start.y === end.y) return [start]

  const size = width * height
  const gScore = new Float32Array(size).fill(Infinity)
  const cameFrom = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)

  const idx = (x, y) => y * width + x
  const heuristic = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y)

  const startIdx = idx(start.x, start.y)
  gScore[startIdx] = 0

  const open = new MinHeap()
  open.push({ x: start.x, y: start.y, f: heuristic(start.x, start.y), idx: startIdx })

  while (open.size > 0) {
    const curr = open.pop()
    if (curr.x === end.x && curr.y === end.y) {
      const path = []
      let ci = curr.idx
      while (ci !== -1) {
        path.push({ x: ci % width, y: (ci / width) | 0 })
        ci = cameFrom[ci]
      }
      return path.reverse()
    }

    if (closed[curr.idx]) continue
    closed[curr.idx] = 1

    for (const { dx, dy } of DIRS) {
      const nx = curr.x + dx
      const ny = curr.y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

      const ni = idx(nx, ny)
      if (closed[ni]) continue
      if (cellBlocked[ni] === 1) continue
      if (isEdgeBlocked(wallEdges, width, curr.x, curr.y, nx, ny)) continue

      const tentG = gScore[curr.idx] + 1
      if (tentG < gScore[ni]) {
        gScore[ni] = tentG
        cameFrom[ni] = curr.idx
        open.push({ x: nx, y: ny, f: tentG + heuristic(nx, ny), idx: ni })
      }
    }
  }

  return null
}

/**
 * Build collision Uint8Array from tile layers.
 * @param {object} layers — { walls: Uint16Array, props: Uint16Array }
 * @param {string[]} palette — tile ID lookup
 * @param {object} blockingSet — { tileId: true } for blocking tiles
 * @param {number} width
 * @param {number} height
 */
export function buildCollisionLayer(layers, palette, blockingSet, width, height) {
  const collision = new Uint8Array(width * height)

  for (const layerName of ['walls', 'props']) {
    const layer = layers[layerName]
    if (!layer) continue

    for (let i = 0; i < layer.length; i++) {
      const tileIdx = layer[i]
      if (tileIdx === 0) continue
      const tileId = palette[tileIdx]
      if (tileId && blockingSet[tileId]) {
        collision[i] = 1
      }
    }
  }

  return collision
}

/**
 * Legacy wrapper: build walkability grid (boolean[][]) from old tile layers.
 * Preserved for V1 compatibility.
 */
export function buildWalkabilityGrid(walls, props, blocking, width, height) {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const wallTile = walls?.[y]?.[x] ?? -1
      const propTile = props?.[y]?.[x] ?? -1
      const blocked = blocking.has(wallTile) || blocking.has(propTile)
      row.push(!blocked)
    }
    grid.push(row)
  }
  return grid
}

/**
 * Legacy wrapper: find path on boolean[][] grid.
 * Preserved for V1 compatibility.
 */
export function findPathLegacy(grid, start, end) {
  const height = grid.length
  const width = grid[0]?.length || 0
  const collision = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y][x]) collision[y * width + x] = 1
    }
  }
  return findPath(collision, width, height, start, end)
}
