/**
 * Extract tiles from DCSS ProjectUtumno tileset (2048x1536, 64x48 at 32px)
 * Compose into our 16x16 tile atlas at public/tilesets/tiles.png
 *
 * Row 14: col 0-3 dark earth, 4-7 grey stone floor, 8-11 light brick,
 *         12-15 grey block walls, 20-23 dark red, 24-31 brown/wood
 * Row 15: col 0-3 grass/dirt terrain, 8-11 doors/gates, 16+ features
 * Row 16: col 2-5 brown dirt, 7-8 grey brick walls
 */
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const TILE = 32
const OUT_COLS = 16
const OUT_ROWS = 16

// [srcCol, srcRow] → our tile index
const tileMap = {
  // Wood plank floors (1-4) — brown textured, row 14 cols 24-27
  1: [24, 14],
  2: [25, 14],
  3: [26, 14],
  4: [27, 14],

  // Stone floors (5-8) — grey stone with mortar, row 14 cols 4-7
  5: [4, 14],
  6: [5, 14],
  7: [6, 14],
  8: [7, 14],

  // Dirt (9-10) — brown earth with texture, row 16 cols 3-4
  9: [3, 16],
  10: [4, 16],

  // Grass (11-14) — green terrain, row 15 cols 0-3
  11: [0, 15],
  12: [1, 15],
  13: [2, 15],
  14: [3, 15],

  // Walls (17-32) — stone block walls, row 14 cols 8-15
  17: [10, 14],  // wall - light brick
  18: [10, 14],  // wall vertical
  19: [8, 14],   // wall horizontal (lighter)
  20: [11, 14],  // cross/junction
  21: [12, 14],  // corner - grey block
  22: [13, 14],  // corner
  23: [14, 14],  // corner
  24: [15, 14],  // corner
  25: [9, 14],   // T junction
  26: [9, 14],   // T junction
  27: [12, 14],  // T junction
  28: [13, 14],  // T junction
  29: [11, 14],  // end
  30: [11, 14],  // end
  31: [14, 14],  // end
  32: [15, 14],  // end

  // Props (33-48) — mix of DCSS features + procedural fallback
  33: [0, 14],   // table round (dark earth as placeholder)
  34: [1, 14],   // table rect
  35: [2, 14],   // chair
  36: [3, 14],   // chair
  37: [28, 14],  // barrel (brown)
  38: [29, 14],  // crate (brown variant)
  39: [30, 14],  // bookshelf (dark wood)
  40: [20, 14],  // fireplace (dark red/crimson)
  41: [8, 15],   // door closed (gate)
  42: [9, 15],   // door open (gate variant)
  43: [10, 15],  // stairs
  44: [11, 15],  // stairs variant
  45: [31, 14],  // bar counter (wood)
  46: [16, 14],  // bottles (white/light tile)
  47: [17, 14],  // candle (light tile)
  48: [21, 14],  // rug (dark red)
}

async function main() {
  const srcPath = path.join(process.env.TEMP || process.env.TMP, 'dcss-tiles.png')
  if (!fs.existsSync(srcPath)) {
    console.error('DCSS tileset not found. Download first.')
    process.exit(1)
  }

  const src = await loadImage(srcPath)
  const canvas = createCanvas(OUT_COLS * TILE, OUT_ROWS * TILE)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let mapped = 0
  for (const [indexStr, [srcCol, srcRow]] of Object.entries(tileMap)) {
    const index = parseInt(indexStr)
    const destCol = index % OUT_COLS
    const destRow = Math.floor(index / OUT_COLS)
    ctx.drawImage(src, srcCol * TILE, srcRow * TILE, TILE, TILE,
                       destCol * TILE, destRow * TILE, TILE, TILE)
    mapped++
  }

  // Now enhance props that DCSS doesn't have good equivalents for.
  // Draw procedural versions ON TOP of the extracted tiles for props 33-36, 37-39, 45-47
  enhanceProps(ctx)

  const outPath = path.join(__dirname, '..', 'public', 'tilesets', 'tiles.png')
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'))
  console.log(`Mapped ${mapped} tiles → ${outPath}`)
}

function enhanceProps(ctx) {
  const T = TILE

  // Helper: draw into a tile at atlas index
  function atTile(index, fn) {
    const x = (index % OUT_COLS) * T
    const y = Math.floor(index / OUT_COLS) * T
    ctx.save()
    ctx.translate(x, y)
    // Clear the tile first with dark background
    ctx.fillStyle = '#1a1208'
    ctx.fillRect(0, 0, T, T)
    fn(ctx)
    ctx.restore()
  }

  // 33: Round table
  atTile(33, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#5a3a1a'
    c.beginPath(); c.ellipse(16, 16, 12, 10, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#6b4226'
    c.beginPath(); c.ellipse(16, 15, 10, 8, 0, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#3a2010'
    c.lineWidth = 1
    c.beginPath(); c.ellipse(16, 16, 12, 10, 0, 0, Math.PI * 2); c.stroke()
  })

  // 34: Rectangle table
  atTile(34, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#5a3a1a'
    c.fillRect(4, 6, 24, 20)
    c.fillStyle = '#6b4226'
    c.fillRect(6, 8, 20, 16)
    c.strokeStyle = '#3a2010'
    c.lineWidth = 1
    c.strokeRect(4, 6, 24, 20)
  })

  // 35: Chair left
  atTile(35, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#4a2a10'
    c.fillRect(8, 10, 16, 16)
    c.fillStyle = '#5a3a1a'
    c.fillRect(10, 12, 12, 12)
    c.fillStyle = '#6b4a2a'
    c.fillRect(8, 6, 16, 6)
  })

  // 36: Chair right
  atTile(36, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#4a2a10'
    c.fillRect(8, 10, 16, 16)
    c.fillStyle = '#5a3a1a'
    c.fillRect(10, 12, 12, 12)
    c.fillStyle = '#6b4a2a'
    c.fillRect(8, 6, 16, 6)
  })

  // 37: Barrel
  atTile(37, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#5a3818'
    c.beginPath(); c.ellipse(16, 16, 11, 12, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#6b4a28'
    c.beginPath(); c.ellipse(16, 16, 9, 10, 0, 0, Math.PI * 2); c.fill()
    // Bands
    c.strokeStyle = '#8a7355'
    c.lineWidth = 2
    c.beginPath(); c.ellipse(16, 10, 9, 3, 0, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.ellipse(16, 22, 9, 3, 0, 0, Math.PI * 2); c.stroke()
  })

  // 38: Crate
  atTile(38, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#5a3a18'
    c.fillRect(4, 4, 24, 24)
    c.fillStyle = '#6b4a28'
    c.fillRect(6, 6, 20, 20)
    // X cross braces
    c.strokeStyle = '#4a2a10'
    c.lineWidth = 2
    c.beginPath(); c.moveTo(6, 6); c.lineTo(26, 26); c.stroke()
    c.beginPath(); c.moveTo(26, 6); c.lineTo(6, 26); c.stroke()
    // Corner nails
    c.fillStyle = '#8a7355'
    c.fillRect(5, 5, 3, 3); c.fillRect(24, 5, 3, 3)
    c.fillRect(5, 24, 3, 3); c.fillRect(24, 24, 3, 3)
  })

  // 39: Bookshelf
  atTile(39, (c) => {
    c.fillStyle = '#3a2a1a'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#4a3420'
    c.fillRect(2, 2, 28, 28)
    // Book rows
    const bookColors = ['#2a5a3a', '#5a2a2a', '#3a3a5a', '#5a4a2a', '#2a4a5a', '#5a3a4a']
    for (let row = 0; row < 3; row++) {
      const y = 4 + row * 9
      c.fillStyle = '#2a1a0a'
      c.fillRect(3, y, 26, 8)
      for (let b = 0; b < 6; b++) {
        c.fillStyle = bookColors[(row * 6 + b) % bookColors.length]
        c.fillRect(4 + b * 4, y + 1, 3, 6)
      }
    }
  })

  // 45: Bar counter
  atTile(45, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    c.fillStyle = '#4a3018'
    c.fillRect(2, 4, 28, 24)
    c.fillStyle = '#5a3a20'
    c.fillRect(4, 6, 24, 20)
    // Top surface highlight
    c.fillStyle = '#6b4a28'
    c.fillRect(4, 4, 24, 4)
  })

  // 46: Bottles
  atTile(46, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    // 3 bottles
    const cols = ['#2a6a3a', '#6a2a2a', '#3a4a6a']
    for (let i = 0; i < 3; i++) {
      const bx = 6 + i * 8
      c.fillStyle = cols[i]
      c.fillRect(bx, 8, 5, 16)
      c.fillRect(bx + 1, 4, 3, 6)
      c.fillStyle = '#ddd'
      c.fillRect(bx + 1, 14, 3, 3)
    }
  })

  // 47: Candle
  atTile(47, (c) => {
    c.fillStyle = '#1a1208'
    c.fillRect(0, 0, T, T)
    // Glow
    const grd = c.createRadialGradient(16, 12, 2, 16, 12, 14)
    grd.addColorStop(0, 'rgba(255,200,60,0.4)')
    grd.addColorStop(1, 'rgba(255,200,60,0)')
    c.fillStyle = grd
    c.fillRect(0, 0, T, T)
    // Candle body
    c.fillStyle = '#e8dcc8'
    c.fillRect(14, 14, 4, 12)
    // Flame
    c.fillStyle = '#ffcc00'
    c.beginPath(); c.ellipse(16, 12, 3, 5, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#fff4cc'
    c.beginPath(); c.ellipse(16, 11, 1.5, 3, 0, 0, Math.PI * 2); c.fill()
    // Holder plate
    c.fillStyle = '#8a7355'
    c.fillRect(10, 26, 12, 3)
  })
}

main().catch(console.error)
