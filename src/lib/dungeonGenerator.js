import { seededRandom } from './seededRandom.js'

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h
    this.left = null; this.right = null
    this.room = null
  }
}

function splitBSP(node, rand, minSize = 8, depth = 0, maxDepth = 5) {
  if (depth >= maxDepth || (node.w < minSize * 2 && node.h < minSize * 2)) return

  const splitH = node.w > node.h ? false : node.h > node.w ? true : rand() > 0.5

  if (splitH) {
    const split = Math.floor(node.y + minSize + rand() * (node.h - minSize * 2))
    node.left = new BSPNode(node.x, node.y, node.w, split - node.y)
    node.right = new BSPNode(node.x, split, node.w, node.y + node.h - split)
  } else {
    const split = Math.floor(node.x + minSize + rand() * (node.w - minSize * 2))
    node.left = new BSPNode(node.x, node.y, split - node.x, node.h)
    node.right = new BSPNode(split, node.y, node.x + node.w - split, node.h)
  }

  splitBSP(node.left, rand, minSize, depth + 1, maxDepth)
  splitBSP(node.right, rand, minSize, depth + 1, maxDepth)
}

function placeRooms(node, rand, rooms, padding = 2) {
  if (!node.left && !node.right) {
    const roomW = Math.floor(node.w * (0.5 + rand() * 0.4))
    const roomH = Math.floor(node.h * (0.5 + rand() * 0.4))
    const roomX = node.x + Math.floor(rand() * (node.w - roomW - padding)) + 1
    const roomY = node.y + Math.floor(rand() * (node.h - roomH - padding)) + 1
    node.room = { x: roomX, y: roomY, width: roomW, height: roomH }
    rooms.push(node.room)
    return
  }
  if (node.left) placeRooms(node.left, rand, rooms, padding)
  if (node.right) placeRooms(node.right, rand, rooms, padding)
}

function getRoom(node) {
  if (node.room) return node.room
  if (node.left) return getRoom(node.left)
  if (node.right) return getRoom(node.right)
  return null
}

function connectRooms(node, corridors, cw = 2) {
  if (!node.left || !node.right) return

  connectRooms(node.left, corridors, cw)
  connectRooms(node.right, corridors, cw)

  const roomA = getRoom(node.left)
  const roomB = getRoom(node.right)
  if (!roomA || !roomB) return

  const ax = Math.floor(roomA.x + roomA.width / 2)
  const ay = Math.floor(roomA.y + roomA.height / 2)
  const bx = Math.floor(roomB.x + roomB.width / 2)
  const by = Math.floor(roomB.y + roomB.height / 2)

  corridors.push({ x1: ax, y1: ay, x2: bx, y2: by, width: cw })
}

/**
 * Generate a dungeon layout using BSP.
 * @returns {{ rooms: Array<{x,y,width,height}>, corridors: Array<{x1,y1,x2,y2}>, doors: Array<{x,y}> }}
 */
export function generateDungeon(width, height, { minRooms = 4, maxRooms = 10, corridorWidth = 2, seed = Date.now() } = {}) {
  const rand = seededRandom(seed)
  const root = new BSPNode(0, 0, width, height)

  const maxDepth = Math.ceil(Math.log2(maxRooms)) + 1
  splitBSP(root, rand, 6, 0, maxDepth)

  const rooms = []
  placeRooms(root, rand, rooms)

  while (rooms.length > maxRooms) rooms.pop()

  const corridors = []
  connectRooms(root, corridors, corridorWidth)

  // Find doors at corridor-room intersections
  const doors = []
  for (const corridor of corridors) {
    for (const room of rooms) {
      const mx = Math.floor((corridor.x1 + corridor.x2) / 2)
      const my = Math.floor((corridor.y1 + corridor.y2) / 2)
      if (mx >= room.x && mx < room.x + room.width &&
          my >= room.y && my < room.y + room.height) {
        if (mx === room.x || mx === room.x + room.width - 1 ||
            my === room.y || my === room.y + room.height - 1) {
          doors.push({ x: mx, y: my })
        }
      }
    }
  }

  return { rooms, corridors, doors }
}
