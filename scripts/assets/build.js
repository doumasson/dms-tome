/**
 * Sprite Atlas Builder
 * Groups FA manifest entries into atlas categories and packs them into sprite sheets.
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Atlas grouping
// ---------------------------------------------------------------------------

const CATEGORY_TO_ATLAS = {
  textures: 'atlas-floors',
  floors: 'atlas-floors',
  walls: 'atlas-walls',
  structures: 'atlas-walls',
  furniture: 'atlas-props-furniture',
  clutter: 'atlas-props-decor',
  decor: 'atlas-props-decor',
  lightsources: 'atlas-props-decor',
  flora: 'atlas-terrain',
  elevation: 'atlas-terrain',
  natural_decor: 'atlas-terrain',
  combat: 'atlas-effects',
  effects: 'atlas-effects',
}

/** Map manifest entries to atlas categories */
export function groupByAtlas(entries) {
  const groups = {}
  for (const entry of entries) {
    const cat = entry.category?.toLowerCase() || 'misc'
    const atlas = CATEGORY_TO_ATLAS[cat] || 'atlas-misc'
    if (!groups[atlas]) groups[atlas] = []
    groups[atlas].push(entry)
  }
  return groups
}

// ---------------------------------------------------------------------------
// Bin packing (row-based)
// ---------------------------------------------------------------------------

/** Simple row-based bin packing for sprite atlas */
export function planAtlasLayout(tiles, maxSize = 4096, { allowMultiSheet = false } = {}) {
  const sheets = []
  let currentSheet = { width: 0, height: 0, positions: [], tiles: [] }
  let rowX = 0
  let rowY = 0
  let rowHeight = 0

  for (const tile of tiles) {
    const w = tile.pixelWidth
    const h = tile.pixelHeight

    // Would this tile exceed the row width?
    if (rowX + w > maxSize) {
      rowY += rowHeight
      rowX = 0
      rowHeight = 0
    }

    // Would this row exceed sheet height?
    if (rowY + h > maxSize) {
      if (allowMultiSheet) {
        currentSheet.width = maxSize
        currentSheet.height = rowY + rowHeight
        sheets.push(currentSheet)
        currentSheet = { width: 0, height: 0, positions: [], tiles: [] }
        rowX = 0
        rowY = 0
        rowHeight = 0
      } else {
        break
      }
    }

    currentSheet.positions.push({ id: tile.id, x: rowX, y: rowY, w, h })
    currentSheet.tiles.push(tile)
    rowX += w
    rowHeight = Math.max(rowHeight, h)
    currentSheet.width = Math.max(currentSheet.width, rowX)
    currentSheet.height = Math.max(currentSheet.height, rowY + rowHeight)
  }

  if (currentSheet.positions.length > 0) {
    sheets.push(currentSheet)
  }

  return allowMultiSheet ? sheets : sheets[0] || { width: 0, height: 0, positions: [] }
}

// ---------------------------------------------------------------------------
// Atlas image compositing
// ---------------------------------------------------------------------------

/**
 * Build a sprite atlas image + JSON manifest from a layout.
 * @param {object} layout - from planAtlasLayout
 * @param {string} atlasName - e.g., 'atlas-floors'
 * @param {function} extractTile - async (id) => Buffer|null
 * @param {string} outDir - output directory
 */
export async function buildAtlasImage(layout, atlasName, extractTile, outDir) {
  mkdirSync(outDir, { recursive: true })

  const canvas = sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })

  const composites = []
  for (const pos of layout.positions) {
    const tileBuffer = await extractTile(pos.id)
    if (tileBuffer) {
      composites.push({ input: tileBuffer, left: pos.x, top: pos.y })
    }
  }

  const imageBuffer = await canvas.composite(composites).webp({ quality: 90 }).toBuffer()
  const imagePath = path.join(outDir, `${atlasName}.webp`)
  writeFileSync(imagePath, imageBuffer)

  // Also save PNG fallback
  const pngBuffer = await sharp(imageBuffer).png().toBuffer()
  writeFileSync(path.join(outDir, `${atlasName}.png`), pngBuffer)

  // Write atlas JSON manifest
  const manifest = {}
  for (const pos of layout.positions) {
    const tile = layout.tiles?.find(t => t.id === pos.id)
    manifest[pos.id] = {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      gw: tile?.gridWidth || Math.round(pos.w / 200),
      gh: tile?.gridHeight || Math.round(pos.h / 200),
    }
  }
  writeFileSync(
    path.join(outDir, `${atlasName}.json`),
    JSON.stringify(manifest, null, 2)
  )

  return { imagePath, tileCount: layout.positions.length }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') ===
    process.argv[1].replace(/\\/g, '/')

if (isMain) {
  const manifestPath = process.argv[2] || 'assets/manifest.json'
  const outDir = process.argv[3] || 'public/tilesets'

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const groups = groupByAtlas(manifest)

  for (const [atlasName, entries] of Object.entries(groups)) {
    console.log(`Building ${atlasName} (${entries.length} tiles)...`)
    const tiles = entries.map(e => ({
      id: `${e.category}:${e.filename.replace('.png', '').toLowerCase()}`,
      pixelWidth: e.gridWidth * 200,
      pixelHeight: e.gridHeight * 200,
      ...e,
    }))
    const layout = planAtlasLayout(tiles, 4096)
    console.log(`  Layout: ${layout.width}x${layout.height}, ${layout.positions.length} tiles`)
  }

  console.log('Atlas layout planning complete. Run with --compose flag to build images.')
}
