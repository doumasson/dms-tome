const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZE = 32
const COLS = 16
const ROWS = 16
const canvas = createCanvas(COLS * SIZE, ROWS * SIZE)
const ctx = canvas.getContext('2d')

// ─── Helpers ────────────────────────────────────────────────────────────────

function tileXY(index) {
  return { x: (index % COLS) * SIZE, y: Math.floor(index / COLS) * SIZE }
}

// Seed-based pseudo-random for repeatable results per tile
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const cl = (v) => Math.min(255, Math.max(0, v + amt))
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`
}

function darken(hex, amt) {
  return lighten(hex, -amt)
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ─── Tile Drawers ────────────────────────────────────────────────────────────

// WOOD PLANK FLOORS (1-4)
function drawWoodFloor(index) {
  const { x, y } = tileXY(index)
  const rand = seededRand(index * 997)

  // Base colours vary per tile variant
  const bases = ['#3b2212', '#412814', '#362010', '#47290f']
  const base = bases[(index - 1) % 4]

  ctx.fillStyle = base
  ctx.fillRect(x, y, SIZE, SIZE)

  // Draw horizontal planks (5-6 per tile)
  const plankCount = 5
  const plankH = SIZE / plankCount

  for (let p = 0; p < plankCount; p++) {
    const py = y + p * plankH
    const plankVar = (rand() - 0.5) * 20
    const plankColor = lighten(base, plankVar)

    ctx.fillStyle = plankColor
    ctx.fillRect(x, py + 0.5, SIZE, plankH - 1)

    // Wood grain lines within plank
    for (let g = 0; g < 3; g++) {
      const gy = py + 2 + g * (plankH / 4)
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + rand() * 0.08})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.lineTo(x + SIZE, gy + (rand() - 0.5) * 2)
      ctx.stroke()
    }

    // Plank gap (dark line)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(x, py, SIZE, 1)

    // Occasional knot
    if (rand() > 0.6) {
      const kx = x + 4 + rand() * (SIZE - 8)
      const ky = py + plankH * 0.4 + rand() * plankH * 0.2
      const kr = 1 + rand() * 1.5
      ctx.strokeStyle = `rgba(0,0,0,0.3)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(kx, ky, kr * 1.5, kr, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Subtle top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(x, y, SIZE, 1)
}

// STONE FLOORS (5-8)
function drawStoneFloor(index) {
  const { x, y } = tileXY(index)
  const rand = seededRand(index * 1103)

  const bases = ['#3a3a3f', '#343438', '#3f3f45', '#303035']
  const base = bases[(index - 5) % 4]
  const mortar = '#1e1e22'

  ctx.fillStyle = mortar
  ctx.fillRect(x, y, SIZE, SIZE)

  // Lay stone blocks in a 3x2 staggered grid
  const layouts = [
    // [col, row, w, h] in units where tile = 3 wide, 2 tall
    // Row 0: 3 stones
    [0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1],
    // Row 1: 2 stones (offset/staggered)
    [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1],
  ]

  const colW = (SIZE - 4) / 3
  const rowH = (SIZE - 3) / 2
  const gap = 1.5

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      // Stagger odd rows
      const offsetX = row % 2 === 1 ? colW * 0.5 : 0
      const sx = x + 2 + col * colW + gap / 2 + offsetX
      const sy = y + 1.5 + row * rowH + gap / 2
      const sw = colW - gap - (row % 2 === 1 && col === 2 ? colW * 0.5 : 0)
      const sh = rowH - gap

      if (sw < 3) continue

      const stoneVar = (rand() - 0.5) * 18
      ctx.fillStyle = lighten(base, stoneVar)
      ctx.fillRect(sx, sy, sw, sh)

      // Top-left highlight
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.fillRect(sx, sy, sw, 1)
      ctx.fillRect(sx, sy, 1, sh)

      // Bottom-right shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.fillRect(sx, sy + sh - 1, sw, 1)
      ctx.fillRect(sx + sw - 1, sy, 1, sh)

      // Occasional crack
      if (rand() > 0.75) {
        const cx1 = sx + 2 + rand() * (sw - 4)
        const cy1 = sy + 2 + rand() * (sh - 4)
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(cx1, cy1)
        ctx.lineTo(cx1 + (rand() - 0.5) * 6, cy1 + (rand() - 0.5) * 6)
        ctx.stroke()
      }
    }
  }
}

// DIRT (9-10)
function drawDirt(index) {
  const { x, y } = tileXY(index)
  const rand = seededRand(index * 761)

  const bases = ['#4a3520', '#42301c']
  const base = bases[(index - 9) % 2]

  ctx.fillStyle = base
  ctx.fillRect(x, y, SIZE, SIZE)

  // Random pebbles and texture dots
  for (let d = 0; d < 28; d++) {
    const dx = x + rand() * SIZE
    const dy = y + rand() * SIZE
    const dr = 0.5 + rand() * 1.5
    const dark = rand() > 0.5
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.arc(dx, dy, dr, 0, Math.PI * 2)
    ctx.fill()
  }

  // Subtle horizontal streaks
  for (let s = 0; s < 6; s++) {
    const sy = y + rand() * SIZE
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`
    ctx.lineWidth = 0.5 + rand()
    ctx.beginPath()
    ctx.moveTo(x, sy)
    ctx.lineTo(x + SIZE, sy + (rand() - 0.5) * 3)
    ctx.stroke()
  }
}

// GRASS (11-14)
function drawGrass(index) {
  const { x, y } = tileXY(index)
  const rand = seededRand(index * 883)

  const bases = ['#2a5c2a', '#2e6630', '#265426', '#336633']
  const base = bases[(index - 11) % 4]

  ctx.fillStyle = base
  ctx.fillRect(x, y, SIZE, SIZE)

  // Texture dots (grass blades from above)
  for (let d = 0; d < 40; d++) {
    const dx = x + rand() * SIZE
    const dy = y + rand() * SIZE
    const bright = rand() > 0.5
    ctx.fillStyle = bright ? lighten(base, 18) : darken(base, 14)
    ctx.fillRect(dx, dy, 1, 1 + rand() * 2)
  }

  // Occasional small darker patch
  if (rand() > 0.5) {
    const px = x + 4 + rand() * (SIZE - 10)
    const py = y + 4 + rand() * (SIZE - 10)
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.beginPath()
    ctx.ellipse(px, py, 3 + rand() * 3, 2 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

// WALLS (17-32)
// All stone walls — solid, dark, with depth
function drawWall(index) {
  const { x, y } = tileXY(index)
  const rand = seededRand(index * 1307)

  const base = '#3e3e46'
  const dark = '#22222a'
  const light = '#58586a'

  // Fill dark base
  ctx.fillStyle = dark
  ctx.fillRect(x, y, SIZE, SIZE)

  // Stone block face (slightly recessed inward look)
  ctx.fillStyle = base
  ctx.fillRect(x + 2, y + 2, SIZE - 4, SIZE - 4)

  // Stone texture: lay 2x3 micro-blocks
  const bw = (SIZE - 6) / 3
  const bh = (SIZE - 5) / 2

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const staggerX = row % 2 === 1 ? bw * 0.5 : 0
      const bx = x + 3 + col * bw + staggerX
      const by = y + 3 + row * bh
      const bvw = bw - 1 - (row % 2 === 1 && col === 2 ? bw * 0.5 : 0)
      const bvh = bh - 1

      if (bvw < 2) continue

      const v = (rand() - 0.5) * 14
      ctx.fillStyle = lighten(base, v)
      ctx.fillRect(bx, by, bvw, bvh)

      // Block highlight top-left
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(bx, by, bvw, 1)
      ctx.fillRect(bx, by, 1, bvh)
    }
  }

  // Top edge strong highlight (light from above)
  ctx.fillStyle = rgba(light, 0.6)
  ctx.fillRect(x, y, SIZE, 2)

  // Bottom edge deep shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(x, y + SIZE - 2, SIZE, 2)

  // Left edge slight highlight
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(x, y, 2, SIZE)

  // Right edge shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x + SIZE - 2, y, 2, SIZE)
}

// ROUND TABLE (33)
function drawTableRound(index) {
  const { x, y } = tileXY(index)
  const cx = x + SIZE / 2, cy = y + SIZE / 2

  // Floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(cx + 1, cy + 2, 11, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  // Table top edge (dark)
  ctx.fillStyle = '#3a220e'
  ctx.beginPath()
  ctx.arc(cx, cy, 11, 0, Math.PI * 2)
  ctx.fill()

  // Table surface
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 10)
  grad.addColorStop(0, '#6b4422')
  grad.addColorStop(1, '#4a2e12')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, 9.5, 0, Math.PI * 2)
  ctx.fill()

  // Wood grain arc lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.6
  for (let r = 3; r < 9; r += 2.5) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.ellipse(cx - 3, cy - 3, 3, 2, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

// RECTANGLE TABLE (34)
function drawTableRect(index) {
  const { x, y } = tileXY(index)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fillRect(x + 3, y + 5, 27, 24)

  // Table edge (dark)
  ctx.fillStyle = '#3a220e'
  ctx.fillRect(x + 2, y + 3, 27, 23)

  // Table surface gradient
  const grad = ctx.createLinearGradient(x + 2, y + 3, x + 2, y + 26)
  grad.addColorStop(0, '#6b4422')
  grad.addColorStop(1, '#4a2e12')
  ctx.fillStyle = grad
  ctx.fillRect(x + 3, y + 4, 25, 21)

  // Wood grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.6
  for (let gy = y + 7; gy < y + 24; gy += 3.5) {
    ctx.beginPath()
    ctx.moveTo(x + 4, gy)
    ctx.lineTo(x + 27, gy)
    ctx.stroke()
  }

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x + 3, y + 4, 25, 1)
}

// CHAIRS (35-36)
function drawChair(index) {
  const { x, y } = tileXY(index)
  const facingRight = index === 36

  const bx = facingRight ? x + 8 : x + 5
  const by = y + 12

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(bx + 2, by + 2, 17, 17)

  // Seat
  ctx.fillStyle = '#4a2e12'
  ctx.fillRect(bx, by + 4, 17, 13)

  const grad = ctx.createLinearGradient(bx, by + 4, bx, by + 17)
  grad.addColorStop(0, '#6b4020')
  grad.addColorStop(1, '#4a2e12')
  ctx.fillStyle = grad
  ctx.fillRect(bx + 1, by + 5, 15, 11)

  // Chair back (thick top bar)
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(bx, by, 17, 5)
  ctx.fillStyle = '#5a3518'
  ctx.fillRect(bx + 1, by + 1, 15, 3)

  // Legs (tiny)
  ctx.fillStyle = '#2a1808'
  ctx.fillRect(bx + 1, by + 15, 3, 3)
  ctx.fillRect(bx + 13, by + 15, 3, 3)
}

// BARREL (37)
function drawBarrel(index) {
  const { x, y } = tileXY(index)
  const cx = x + SIZE / 2, cy = y + SIZE / 2

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(cx + 1, cy + 2, 11, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  // Barrel body (top-down: circle with stave lines)
  ctx.fillStyle = '#2e1a08'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 12, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11)
  grad.addColorStop(0, '#5a3a18')
  grad.addColorStop(0.7, '#3e2610')
  grad.addColorStop(1, '#2a1808')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, cy, 10, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  // Stave lines (vertical wood slats from top-down)
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.7
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
    const ex = cx + Math.cos(a) * 10
    const ey = cy + Math.sin(a) * 9
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  // Metal bands (2 rings)
  ctx.strokeStyle = '#888070'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(cx, cy - 3, 10, 4, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx, cy + 3, 10, 4, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Center highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.ellipse(cx - 3, cy - 3, 3, 2, -0.4, 0, Math.PI * 2)
  ctx.fill()
}

// CRATE (38)
function drawCrate(index) {
  const { x, y } = tileXY(index)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x + 4, y + 5, 25, 25)

  // Crate body
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(x + 3, y + 3, 25, 25)

  const grad = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + 28)
  grad.addColorStop(0, '#5c3a1a')
  grad.addColorStop(1, '#3a2010')
  ctx.fillStyle = grad
  ctx.fillRect(x + 4, y + 4, 23, 23)

  // Cross braces
  ctx.strokeStyle = '#2a1408'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x + 4, y + 4)
  ctx.lineTo(x + 27, y + 27)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + 27, y + 4)
  ctx.lineTo(x + 4, y + 27)
  ctx.stroke()

  // Nail dots at corners and center
  const nails = [
    [x + 5, y + 5], [x + 26, y + 5], [x + 5, y + 26], [x + 26, y + 26],
    [x + SIZE / 2, y + SIZE / 2]
  ]
  ctx.fillStyle = '#888070'
  for (const [nx, ny] of nails) {
    ctx.beginPath()
    ctx.arc(nx, ny, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(x + 4, y + 4, 23, 1)
  ctx.fillRect(x + 4, y + 4, 1, 23)
}

// BOOKSHELF (39)
function drawBookshelf(index) {
  const { x, y } = tileXY(index)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(x + 3, y + 3, 27, 27)

  // Shelf frame
  ctx.fillStyle = '#2e1c08'
  ctx.fillRect(x + 2, y + 2, 26, 26)

  ctx.fillStyle = '#3e2a10'
  ctx.fillRect(x + 3, y + 3, 24, 24)

  // Shelves (3 rows of books)
  const shelfColors = [
    ['#7a2020', '#204070', '#207040', '#706020', '#702060'],
    ['#403080', '#206040', '#803020', '#204050', '#703030'],
    ['#506020', '#602020', '#204060', '#307030', '#605020'],
  ]

  const bookW = 4.5
  const shelfH = 7

  for (let row = 0; row < 3; row++) {
    const sy = y + 4 + row * (shelfH + 1)

    // Shelf board
    ctx.fillStyle = '#2e1c08'
    ctx.fillRect(x + 3, sy + shelfH, 24, 1.5)

    const rowColors = shelfColors[row]
    for (let b = 0; b < 5; b++) {
      const bx = x + 4 + b * bookW
      const bookColor = rowColors[b % rowColors.length]

      ctx.fillStyle = darken(bookColor, 20)
      ctx.fillRect(bx, sy, bookW - 0.5, shelfH)

      ctx.fillStyle = bookColor
      ctx.fillRect(bx + 0.5, sy + 0.5, bookW - 2, shelfH - 1)

      // Spine highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(bx + 0.5, sy + 0.5, 1, shelfH - 1)
    }
  }

  // Frame edges
  ctx.strokeStyle = '#1e1008'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 2.5, y + 2.5, 25, 25)
}

// FIREPLACE (40)
function drawFireplace(index) {
  const { x, y } = tileXY(index)

  // Stone surround
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(x, y, SIZE, SIZE)

  // Brick texture on surround
  ctx.fillStyle = '#383840'
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const stagger = row % 2 === 1 ? 8 : 0
      ctx.fillRect(x + col * 16 + stagger, y + row * 8, 14, 7)
    }
  }

  // Fireplace opening
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(x + 6, y + 6, 20, 20)

  // Fire glow: radial gradient
  const grad = ctx.createRadialGradient(x + 16, y + 22, 1, x + 16, y + 20, 12)
  grad.addColorStop(0, 'rgba(255,240,100,0.95)')
  grad.addColorStop(0.3, 'rgba(255,140,20,0.85)')
  grad.addColorStop(0.7, 'rgba(200,40,0,0.5)')
  grad.addColorStop(1, 'rgba(100,10,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(x + 6, y + 6, 20, 20)

  // Flame shapes
  ctx.fillStyle = 'rgba(255,200,50,0.8)'
  ctx.beginPath()
  ctx.moveTo(x + 16, y + 9)
  ctx.bezierCurveTo(x + 12, y + 14, x + 11, y + 20, x + 16, y + 25)
  ctx.bezierCurveTo(x + 21, y + 20, x + 20, y + 14, x + 16, y + 9)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,150,0.7)'
  ctx.beginPath()
  ctx.moveTo(x + 16, y + 11)
  ctx.bezierCurveTo(x + 13, y + 16, x + 14, y + 21, x + 16, y + 24)
  ctx.bezierCurveTo(x + 18, y + 21, x + 19, y + 16, x + 16, y + 11)
  ctx.fill()

  // Ember glow at bottom
  ctx.fillStyle = 'rgba(255,100,0,0.4)'
  ctx.fillRect(x + 7, y + 22, 18, 3)

  // Top highlight on stone
  ctx.fillStyle = 'rgba(255,180,50,0.15)'
  ctx.fillRect(x, y, SIZE, 3)
}

// DOOR CLOSED (41)
function drawDoorClosed(index) {
  const { x, y } = tileXY(index)

  // Door frame (stone)
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(x, y, SIZE, SIZE)
  ctx.fillStyle = '#38383e'
  ctx.fillRect(x + 1, y + 1, SIZE - 2, SIZE - 2)

  // Frame inset
  ctx.fillStyle = '#1a1a20'
  ctx.fillRect(x + 3, y, 26, 3)
  ctx.fillRect(x + 3, y + 29, 26, 3)
  ctx.fillRect(x, y + 3, 3, 26)
  ctx.fillRect(x + 29, y + 3, 3, 26)

  // Door panel
  const dgrad = ctx.createLinearGradient(x + 4, y + 2, x + 4, y + 30)
  dgrad.addColorStop(0, '#7a4a22')
  dgrad.addColorStop(1, '#4a2e12')
  ctx.fillStyle = dgrad
  ctx.fillRect(x + 4, y + 2, 24, 28)

  // Panel detail (recessed rectangle)
  ctx.strokeStyle = '#3a2010'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 7, y + 5, 18, 10)
  ctx.strokeRect(x + 7, y + 17, 18, 10)

  ctx.fillStyle = darken('#4a2e12', 10)
  ctx.fillRect(x + 8, y + 6, 16, 8)
  ctx.fillRect(x + 8, y + 18, 16, 8)

  // Panel highlights
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(x + 8, y + 6, 16, 1)
  ctx.fillRect(x + 8, y + 18, 16, 1)

  // Doorknob
  ctx.fillStyle = '#d4af37'
  ctx.beginPath()
  ctx.arc(x + 22, y + 16, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0d060'
  ctx.beginPath()
  ctx.arc(x + 21.5, y + 15.5, 0.9, 0, Math.PI * 2)
  ctx.fill()

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(x + 4, y + 2, 24, 1)
}

// DOOR OPEN (42)
function drawDoorOpen(index) {
  const { x, y } = tileXY(index)

  // Stone frame
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(x, y, SIZE, SIZE)
  ctx.fillStyle = '#38383e'
  ctx.fillRect(x + 1, y + 1, SIZE - 2, SIZE - 2)

  // Doorway opening (very dark — open passage)
  ctx.fillStyle = '#08080c'
  ctx.fillRect(x + 4, y + 2, 24, 28)

  // Depth effect inside doorway
  const dgrad = ctx.createLinearGradient(x + 4, y + 2, x + 28, y + 30)
  dgrad.addColorStop(0, 'rgba(30,30,40,0.5)')
  dgrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = dgrad
  ctx.fillRect(x + 4, y + 2, 24, 28)

  // Door ajar (visible against left frame)
  const agrad = ctx.createLinearGradient(x + 3, y + 2, x + 8, y + 2)
  agrad.addColorStop(0, '#3a2010')
  agrad.addColorStop(1, '#5a3a1a')
  ctx.fillStyle = agrad
  ctx.fillRect(x + 3, y + 2, 5, 28)

  // Door edge line
  ctx.strokeStyle = '#2a1808'
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 3, y + 2, 5, 28)

  // Frame top edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(x + 4, y + 1, 24, 1)
  ctx.fillRect(x + 3, y + 2, 1, 28)

  // Dark vignette corners inside opening
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(x + 4, y + 2, 4, 4)
  ctx.fillRect(x + 24, y + 2, 4, 4)
}

// STAIRS (43-44)
function drawStairs(index) {
  const { x, y } = tileXY(index)
  const ascending = index === 43

  ctx.fillStyle = '#2a2228'
  ctx.fillRect(x, y, SIZE, SIZE)

  const steps = 5
  const stepH = SIZE / steps

  for (let s = 0; s < steps; s++) {
    const step = ascending ? s : (steps - 1 - s)
    const sy = y + s * stepH
    const indent = step * (SIZE / (steps * 2))

    // Step riser (vertical face)
    ctx.fillStyle = darken('#4a4050', s * 8)
    ctx.fillRect(x + indent, sy, SIZE - indent * 2, stepH * 0.35)

    // Step tread (horizontal surface)
    const tgrad = ctx.createLinearGradient(x + indent, sy + stepH * 0.35, x + indent, sy + stepH)
    tgrad.addColorStop(0, lighten('#5a5068', 10))
    tgrad.addColorStop(1, darken('#4a4058', 10))
    ctx.fillStyle = tgrad
    ctx.fillRect(x + indent, sy + stepH * 0.35, SIZE - indent * 2, stepH * 0.65)

    // Step edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(x + indent, sy + stepH * 0.35, SIZE - indent * 2, 1)

    // Mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x + indent, sy)
    ctx.lineTo(x + SIZE - indent, sy)
    ctx.stroke()
  }

  // Side shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x, y, 2, SIZE)
  ctx.fillRect(x + SIZE - 2, y, 2, SIZE)
}

// BAR COUNTER (45)
function drawBarCounter(index) {
  const { x, y } = tileXY(index)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x + 2, y + 4, 30, 26)

  // Counter body (dark wood)
  ctx.fillStyle = '#2a1808'
  ctx.fillRect(x, y + 3, SIZE, 26)

  // Counter surface top
  const sgrad = ctx.createLinearGradient(x, y + 3, x, y + 10)
  sgrad.addColorStop(0, '#7a4a1e')
  sgrad.addColorStop(1, '#4a2e10')
  ctx.fillStyle = sgrad
  ctx.fillRect(x, y + 3, SIZE, 7)

  // Wood grain on top surface
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.5
  for (let gx = x + 4; gx < x + SIZE; gx += 5) {
    ctx.beginPath()
    ctx.moveTo(gx, y + 3)
    ctx.lineTo(gx + 1, y + 10)
    ctx.stroke()
  }

  // Front panel
  ctx.fillStyle = '#3e2010'
  ctx.fillRect(x, y + 10, SIZE, 19)

  // Panel decorative grooves
  ctx.strokeStyle = '#2a1408'
  ctx.lineWidth = 1
  for (let px = x + 6; px < x + SIZE - 3; px += 9) {
    ctx.strokeRect(px, y + 12, 7, 15)
  }

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x, y + 3, SIZE, 1)
}

// BOTTLES (46)
function drawBottles(index) {
  const { x, y } = tileXY(index)

  // Floor
  ctx.fillStyle = '#1a1a1e'
  ctx.fillRect(x, y, SIZE, SIZE)

  // Shelf board
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(x + 2, y + 22, 28, 3)

  const bottleData = [
    { bx: x + 4, color: '#1a5a2a', hlColor: '#3a9a4a', label: '#0a4a1a' },
    { bx: x + 12, color: '#5a3a10', hlColor: '#8a6030', label: '#3a2008' },
    { bx: x + 20, color: '#1a2a6a', hlColor: '#3a5aaa', label: '#0a1a4a' },
  ]

  for (const b of bottleData) {
    // Bottle body
    ctx.fillStyle = b.color
    ctx.beginPath()
    ctx.roundRect(b.bx, y + 8, 6, 14, 2)
    ctx.fill()

    // Bottle neck
    ctx.fillStyle = darken(b.color, 10)
    ctx.fillRect(b.bx + 2, y + 4, 2, 5)

    // Cork/stopper
    ctx.fillStyle = '#c8a060'
    ctx.fillRect(b.bx + 2, y + 3, 2, 2)

    // Highlight
    ctx.fillStyle = b.hlColor
    ctx.fillRect(b.bx + 1, y + 9, 1, 8)

    // Label
    ctx.fillStyle = '#d4c090'
    ctx.fillRect(b.bx + 1, y + 13, 4, 5)
    ctx.fillStyle = b.label
    ctx.fillRect(b.bx + 1.5, y + 14, 3, 3)
  }

  // Shelf highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x + 2, y + 22, 28, 1)
}

// CANDLE (47)
function drawCandle(index) {
  const { x, y } = tileXY(index)
  const cx = x + SIZE / 2, cy = y + SIZE / 2

  // Glow aura (outer)
  const glow = ctx.createRadialGradient(cx, cy - 4, 1, cx, cy - 2, 13)
  glow.addColorStop(0, 'rgba(255,220,80,0.45)')
  glow.addColorStop(0.4, 'rgba(255,150,20,0.25)')
  glow.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x, y, SIZE, SIZE)

  // Candle holder (small plate)
  ctx.fillStyle = '#888070'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 9, 6, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b0a880'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 8.5, 5.5, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Candle body
  ctx.fillStyle = '#e8e0d0'
  ctx.fillRect(cx - 3, cy - 4, 6, 14)

  ctx.fillStyle = '#f0ece4'
  ctx.fillRect(cx - 2, cy - 4, 4, 13)

  // Wax drip
  ctx.fillStyle = 'rgba(230,220,200,0.6)'
  ctx.beginPath()
  ctx.ellipse(cx + 2, cy - 1, 1.5, 3, 0.3, 0, Math.PI * 2)
  ctx.fill()

  // Wick
  ctx.strokeStyle = '#3a2a10'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy - 4)
  ctx.lineTo(cx - 1, cy - 7)
  ctx.stroke()

  // Flame
  const flame = ctx.createRadialGradient(cx - 1, cy - 9, 0.5, cx - 0.5, cy - 8, 4)
  flame.addColorStop(0, 'rgba(255,255,200,1)')
  flame.addColorStop(0.4, 'rgba(255,200,50,0.9)')
  flame.addColorStop(1, 'rgba(255,100,0,0)')
  ctx.fillStyle = flame
  ctx.beginPath()
  ctx.moveTo(cx - 1, cy - 7)
  ctx.bezierCurveTo(cx - 4, cy - 9, cx - 4, cy - 13, cx - 1, cy - 14)
  ctx.bezierCurveTo(cx + 2, cy - 13, cx + 2, cy - 9, cx - 1, cy - 7)
  ctx.fill()

  // Flame inner (bright)
  ctx.fillStyle = 'rgba(255,255,220,0.9)'
  ctx.beginPath()
  ctx.ellipse(cx - 1, cy - 11, 1, 2, 0, 0, Math.PI * 2)
  ctx.fill()
}

// RUG (48)
function drawRug(index) {
  const { x, y } = tileXY(index)

  // Rug base
  ctx.fillStyle = '#5a1818'
  ctx.fillRect(x + 2, y + 2, SIZE - 4, SIZE - 4)

  const rgrad = ctx.createRadialGradient(x + 16, y + 16, 2, x + 16, y + 16, 14)
  rgrad.addColorStop(0, '#7a2020')
  rgrad.addColorStop(0.6, '#5a1818')
  rgrad.addColorStop(1, '#3a1010')
  ctx.fillStyle = rgrad
  ctx.fillRect(x + 2, y + 2, SIZE - 4, SIZE - 4)

  // Outer border (lighter)
  ctx.strokeStyle = '#8a3030'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 3.5, y + 3.5, SIZE - 7, SIZE - 7)

  // Inner border
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 6, y + 6, SIZE - 12, SIZE - 12)

  // Geometric center pattern
  const cx = x + SIZE / 2, cy = y + SIZE / 2

  // Center diamond
  ctx.fillStyle = '#d4af37'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 5)
  ctx.lineTo(cx + 5, cy)
  ctx.lineTo(cx, cy + 5)
  ctx.lineTo(cx - 5, cy)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#8a2020'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 3)
  ctx.lineTo(cx + 3, cy)
  ctx.lineTo(cx, cy + 3)
  ctx.lineTo(cx - 3, cy)
  ctx.closePath()
  ctx.fill()

  // Corner ornaments
  const corners = [
    [x + 9, y + 9], [x + 23, y + 9], [x + 9, y + 23], [x + 23, y + 23]
  ]
  for (const [ox, oy] of corners) {
    ctx.fillStyle = '#d4af37'
    ctx.beginPath()
    ctx.moveTo(ox, oy - 2)
    ctx.lineTo(ox + 2, oy)
    ctx.lineTo(ox, oy + 2)
    ctx.lineTo(ox - 2, oy)
    ctx.closePath()
    ctx.fill()
  }

  // Fringe (top and bottom edges)
  ctx.strokeStyle = '#c09040'
  ctx.lineWidth = 1
  for (let fx = x + 3; fx < x + SIZE - 2; fx += 2.5) {
    ctx.beginPath()
    ctx.moveTo(fx, y + 2)
    ctx.lineTo(fx, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(fx, y + SIZE - 2)
    ctx.lineTo(fx, y + SIZE)
    ctx.stroke()
  }
}

// ─── Render all tiles ─────────────────────────────────────────────────────────

// Background
ctx.fillStyle = '#050508'
ctx.fillRect(0, 0, canvas.width, canvas.height)

// Floors
for (let i = 1; i <= 4; i++) drawWoodFloor(i)
for (let i = 5; i <= 8; i++) drawStoneFloor(i)
for (let i = 9; i <= 10; i++) drawDirt(i)
for (let i = 11; i <= 14; i++) drawGrass(i)

// Walls
for (let i = 17; i <= 32; i++) drawWall(i)

// Props
drawTableRound(33)
drawTableRect(34)
drawChair(35)
drawChair(36)
drawBarrel(37)
drawCrate(38)
drawBookshelf(39)
drawFireplace(40)
drawDoorClosed(41)
drawDoorOpen(42)
drawStairs(43)
drawStairs(44)
drawBarCounter(45)
drawBottles(46)
drawCandle(47)
drawRug(48)

// ─── Write output ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'tilesets')
fs.mkdirSync(outDir, { recursive: true })

const buffer = canvas.toBuffer('image/png')
fs.writeFileSync(path.join(outDir, 'tiles.png'), buffer)
console.log('Generated high-quality tileset: public/tilesets/tiles.png')
