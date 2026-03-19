const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZE = 32
const COLS = 16
const ROWS = 16
const canvas = createCanvas(COLS * SIZE, ROWS * SIZE)
const ctx = canvas.getContext('2d')

// Color map for each tile index
const colors = {
  // Floors 1-14
  1: '#2a1a0c', 2: '#2e1e10', 3: '#261608', 4: '#321e0e',  // wood planks
  5: '#333338', 6: '#2e2e34', 7: '#38383e', 8: '#2a2a30',  // stone
  9: '#3a2a1a', 10: '#342414',                                // dirt
  11: '#1a3a1a', 12: '#1e3e1e', 13: '#163616', 14: '#224222', // grass

  // Walls 17-32
  17: '#4a4a54', 18: '#4a4a54', 19: '#4a4a54', 20: '#4a4a54',
  21: '#555560', 22: '#555560', 23: '#555560', 24: '#555560',
  25: '#4a4a54', 26: '#4a4a54', 27: '#4a4a54', 28: '#4a4a54',
  29: '#3e3e48', 30: '#3e3e48', 31: '#3e3e48', 32: '#3e3e48',

  // Props 33-48
  33: '#5a3a1a', 34: '#5a3a1a', 35: '#3a2010', 36: '#3a2010', // tables/chairs
  37: '#4a3018', 38: '#4a2a14', 39: '#3a2a1a', 40: '#ff6600', // barrel/crate/shelf/fire
  41: '#6b4226', 42: '#3a2a14', 43: '#2a1a0a', 44: '#2a1a0a', // doors/stairs
  45: '#4a3018', 46: '#2a5a3a', 47: '#ffcc00', 48: '#5a2020', // bar/bottles/candle/rug
}

// Fill background black
ctx.fillStyle = '#0a0a0a'
ctx.fillRect(0, 0, canvas.width, canvas.height)

for (let i = 0; i < COLS * ROWS; i++) {
  const x = (i % COLS) * SIZE
  const y = Math.floor(i / COLS) * SIZE
  const color = colors[i]
  if (!color) continue

  // Fill tile
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 1, SIZE - 2, SIZE - 2)

  // Subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, SIZE - 1, SIZE - 1)

  // Add visual differentiation
  if (i >= 17 && i <= 32) {
    // Walls: add inner border to look wall-like
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 3, y + 3, SIZE - 6, SIZE - 6)
  }
  if (i >= 33 && i <= 48) {
    // Props: add center dot
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(x + SIZE/2, y + SIZE/2, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Index label (small, for debugging)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '8px monospace'
  ctx.fillText(String(i), x + 2, y + 10)
}

// Ensure output directory exists
const outDir = path.join(__dirname, '..', 'public', 'tilesets')
fs.mkdirSync(outDir, { recursive: true })

// Write PNG
const buffer = canvas.toBuffer('image/png')
fs.writeFileSync(path.join(outDir, 'tiles.png'), buffer)
console.log('Generated placeholder tileset: public/tilesets/tiles.png')
