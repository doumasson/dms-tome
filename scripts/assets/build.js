/**
 * Sprite Atlas Builder
 * Groups FA manifest entries into atlas categories, extracts PNGs from source
 * zips, and composites them into sprite sheet atlases.
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from 'yauzl-promise'

// ---------------------------------------------------------------------------
// Atlas grouping
// ---------------------------------------------------------------------------

const SUBCATEGORY_TO_ATLAS = {
  textures: 'atlas-floors',
  floors: 'atlas-floors',
  walls: 'atlas-walls',
  structures: 'atlas-structures',
  pillars: 'atlas-structures',
  furniture: 'atlas-props-furniture',
  clutter: 'atlas-props-decor',
  decor: 'atlas-props-decor',
  lightsources: 'atlas-props-decor',
  burial_and_graves: 'atlas-props-decor',
  workplace_equipment: 'atlas-props-craft',
  vehicles: 'atlas-props-craft',
  flora: 'atlas-terrain',
  elevation: 'atlas-terrain',
  natural_decor: 'atlas-terrain',
  water: 'atlas-terrain',
  paths: 'atlas-terrain',
  combat: 'atlas-effects',
  gore: 'atlas-effects',
  fire: 'atlas-effects',
  lightning: 'atlas-effects',
  magic: 'atlas-effects',
  smoke: 'atlas-effects',
  webs: 'atlas-effects',
  spore_clouds: 'atlas-effects',
  blast_marks: 'atlas-effects',
  shadow_paths: 'atlas-effects',
  texture_overlays: 'atlas-effects',
  misc_paths: 'atlas-effects',
}

/** Map manifest entries to atlas categories by subcategory */
export function groupByAtlas(entries) {
  const groups = {}
  for (const entry of entries) {
    const sub = entry.subcategory?.toLowerCase() || 'misc'
    const atlas = SUBCATEGORY_TO_ATLAS[sub] || 'atlas-misc'
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
// Zip extraction
// ---------------------------------------------------------------------------

/**
 * Build a lookup of zip path → entry path for fast extraction.
 * Groups manifest entries by sourceZip so we open each zip only once.
 */
function groupBySourceZip(entries) {
  const groups = {}
  for (const entry of entries) {
    const zip = entry.sourceZip
    if (!groups[zip]) groups[zip] = []
    groups[zip].push(entry)
  }
  return groups
}

/**
 * Extract specific PNG entries from a zip file.
 * @param {string} zipPath - path to zip file
 * @param {Set<string>} wantedPaths - set of entry.path values to extract
 * @returns {Promise<Map<string, Buffer>>} path → PNG buffer
 */
async function extractFromZip(zipPath, wantedPaths) {
  const zip = await open(zipPath)
  const buffers = new Map()

  try {
    for await (const entry of zip) {
      if (wantedPaths.has(entry.filename)) {
        const stream = await entry.openReadStream()
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        buffers.set(entry.filename, Buffer.concat(chunks))
        if (buffers.size === wantedPaths.size) break
      }
    }
  } finally {
    await zip.close()
  }

  return buffers
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
// Tile selection — pick a diverse starter set per atlas
// ---------------------------------------------------------------------------

/**
 * Select up to maxTiles entries, preferring 1x1 tiles and diverse folders.
 * Spreads picks across different path folders for visual variety.
 */
function selectStarterTiles(entries, maxTiles) {
  // Prefer 1x1 tiles first (building blocks), then small multi-tile
  const oneByOne = entries.filter(e => e.gridWidth === 1 && e.gridHeight === 1)
  const small = entries.filter(e => e.gridWidth <= 2 && e.gridHeight <= 2 && !(e.gridWidth === 1 && e.gridHeight === 1))

  // Group by deepest folder for diversity
  function getFolder(e) {
    const parts = e.path.split('/')
    return parts.slice(0, -1).pop() || 'root'
  }

  const folderGroups = {}
  for (const e of oneByOne) {
    const f = getFolder(e)
    if (!folderGroups[f]) folderGroups[f] = []
    folderGroups[f].push(e)
  }

  // Round-robin across folders
  const selected = []
  const folders = Object.keys(folderGroups).sort()
  let idx = 0
  while (selected.length < maxTiles && folders.length > 0) {
    const folder = folders[idx % folders.length]
    const group = folderGroups[folder]
    if (group.length > 0) {
      selected.push(group.shift())
    } else {
      folders.splice(idx % folders.length, 1)
      if (folders.length === 0) break
    }
    idx++
  }

  // Fill remaining with small multi-tile
  if (selected.length < maxTiles) {
    for (const e of small) {
      if (selected.length >= maxTiles) break
      selected.push(e)
    }
  }

  return selected
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') ===
    process.argv[1].replace(/\\/g, '/')

if (isMain) {
  // Parse args
  let manifestPath = 'assets/manifest.json'
  let outDir = 'public/tilesets'
  let zipDir = ''
  let compose = false
  let maxPerAtlas = 400

  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--compose') {
      compose = true
    } else if (args[i] === '--zip-dir' && i + 1 < args.length) {
      zipDir = args[++i]
    } else if (args[i] === '--max' && i + 1 < args.length) {
      maxPerAtlas = parseInt(args[++i], 10)
    } else if (args[i] === '--out' && i + 1 < args.length) {
      outDir = args[++i]
    } else if (!args[i].startsWith('--')) {
      manifestPath = args[i]
    }
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const groups = groupByAtlas(manifest)

  console.log(`Manifest: ${manifest.length} entries across ${Object.keys(groups).length} atlases`)
  console.log(`Max tiles per atlas: ${maxPerAtlas}`)
  console.log()

  // Build path→entry lookup for all selected tiles
  const allSelected = new Map() // path → entry
  const atlasPlans = []

  for (const [atlasName, entries] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    const selected = selectStarterTiles(entries, maxPerAtlas)
    const tiles = selected.map(e => ({
      id: `${atlasName}:${e.filename.replace('.png', '').toLowerCase()}`,
      pixelWidth: e.gridWidth * 200,
      pixelHeight: e.gridHeight * 200,
      ...e,
    }))
    const layout = planAtlasLayout(tiles, 4096)
    console.log(`${atlasName}: ${entries.length} total → ${selected.length} selected → ${layout.positions.length} fit in sheet (${layout.width}x${layout.height})`)

    for (const tile of layout.tiles || []) {
      allSelected.set(tile.path, tile)
    }
    atlasPlans.push({ atlasName, layout })
  }

  if (!compose) {
    console.log('\nDry run complete. Add --compose --zip-dir <path-to-zips> to build images.')
    process.exit(0)
  }

  if (!zipDir) {
    console.error('\n--zip-dir is required when composing. Point it at the folder with the source zip files.')
    process.exit(1)
  }

  // Extract all needed PNGs from zips
  console.log(`\nExtracting ${allSelected.size} tiles from source zips...`)

  const allEntries = [...allSelected.values()]
  const byZip = groupBySourceZip(allEntries)
  const extractedBuffers = new Map() // path → Buffer

  for (const [zipName, entries] of Object.entries(byZip)) {
    const zipPath = path.join(zipDir, zipName)
    if (!existsSync(zipPath)) {
      console.error(`  ZIP not found: ${zipPath}`)
      continue
    }
    const wanted = new Set(entries.map(e => e.path))
    console.log(`  ${zipName}: extracting ${wanted.size} tiles...`)
    const buffers = await extractFromZip(zipPath, wanted)
    for (const [p, buf] of buffers) {
      extractedBuffers.set(p, buf)
    }
    console.log(`    Extracted ${buffers.size}/${wanted.size}`)
  }

  // Build atlas images
  console.log(`\nCompositing ${atlasPlans.length} atlas sheets...`)
  mkdirSync(outDir, { recursive: true })

  for (const { atlasName, layout } of atlasPlans) {
    if (layout.positions.length === 0) continue

    const extractTile = async (id) => {
      const tile = layout.tiles?.find(t => t.id === id)
      if (!tile) return null
      const buf = extractedBuffers.get(tile.path)
      if (!buf) return null
      // Resize to exact grid dimensions (some FA tiles may vary slightly)
      return sharp(buf)
        .resize(tile.pixelWidth, tile.pixelHeight, { fit: 'fill' })
        .png()
        .toBuffer()
    }

    console.log(`  Building ${atlasName} (${layout.positions.length} tiles, ${layout.width}x${layout.height})...`)
    const result = await buildAtlasImage(layout, atlasName, extractTile, outDir)
    console.log(`    → ${result.imagePath}`)
  }

  console.log('\nDone!')
}
