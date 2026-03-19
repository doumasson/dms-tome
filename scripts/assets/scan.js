/**
 * FA Asset Scanner
 * Parses Forgotten Adventures tileset ZIP files into a structured manifest.
 *
 * FA path format:
 *   FA_Assets/!Core_<Category>/<Subcategory>/.../<Name>_<Material>_<Variant>_NxM.png
 */

import { open } from 'yauzl-promise'
import { createWriteStream } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Tag derivation helpers
// ---------------------------------------------------------------------------

const TYPE_WORDS = new Set([
  'table', 'chair', 'bench', 'stool', 'bed', 'shelf', 'barrel', 'crate',
  'chest', 'door', 'window', 'wall', 'floor', 'ceiling', 'pillar', 'column',
  'arch', 'stairs', 'ramp', 'bridge', 'fence', 'gate', 'tree', 'bush',
  'rock', 'stone', 'grass', 'water', 'river', 'pond', 'road', 'path',
  'campfire', 'fire', 'torch', 'lantern', 'candle', 'rug', 'carpet',
  'statue', 'fountain', 'well', 'altar', 'throne', 'bookshelf', 'book',
  'cauldron', 'pot', 'anvil', 'forge', 'hay', 'cart', 'wagon',
])

const MATERIAL_WORDS = new Set([
  'wood', 'stone', 'iron', 'steel', 'gold', 'silver', 'marble', 'oak',
  'pine', 'dark', 'light', 'rough', 'smooth', 'ornate', 'simple',
  'cobblestone', 'brick', 'sand', 'dirt', 'grass', 'snow', 'ice',
])

const SUBCATEGORY_NAMES = new Set([
  'structures', 'decor', 'clutter', 'furniture', 'textures', 'walls',
  'lightsources', 'combat', 'flora', 'elevation', 'natural_decor',
  'workplace_equipment', 'vehicles', 'burial_and_graves', 'gore',
  'water', 'pillars', 'paths', 'fire', 'lightning', 'magic', 'smoke',
  'webs', 'spore_clouds', 'blast_marks', 'shadow_paths', 'texture_overlays',
  'misc_paths',
])

const BIOME_WORDS = {
  wilderness: 'wilderness',
  settlement: 'settlement',
  dungeon: 'dungeon',
  cave: 'cave',
  cavern: 'cave',
  forest: 'forest',
  desert: 'desert',
  arctic: 'arctic',
  swamp: 'swamp',
  ocean: 'ocean',
  coast: 'coast',
}

/**
 * Derive tag set from path segments and filename stem.
 * @param {string[]} segments - lowercased path parts
 * @param {string} stem - lowercased filename without extension
 * @returns {string[]}
 */
function deriveTags(segments, stem) {
  const tagSet = new Set()

  // Add subcategory words (e.g., "furniture", "floors", "trees")
  for (const seg of segments) {
    const lower = seg.toLowerCase()
    tagSet.add(lower)
    // detect biome keywords in category
    for (const [key, tag] of Object.entries(BIOME_WORDS)) {
      if (lower.includes(key)) tagSet.add(tag)
    }
  }

  // Add type words found in stem parts
  const stemParts = stem.split('_')
  for (const part of stemParts) {
    const p = part.toLowerCase()
    if (TYPE_WORDS.has(p)) tagSet.add(p)
    if (MATERIAL_WORDS.has(p)) tagSet.add(p)
  }

  // Remove empty strings
  tagSet.delete('')

  return Array.from(tagSet)
}

// ---------------------------------------------------------------------------
// parseFAFilename
// ---------------------------------------------------------------------------

/**
 * Parse an FA asset filepath into structured metadata.
 * Returns null for non-PNG files or paths that cannot be parsed.
 *
 * @param {string} filepath
 * @returns {{ category, subcategory, material, variant, gridWidth, gridHeight, tags, filename } | null}
 */
export function parseFAFilename(filepath) {
  if (!filepath || !filepath.toLowerCase().endsWith('.png')) return null

  // Normalise separators
  const normalised = filepath.replace(/\\/g, '/')
  const parts = normalised.split('/').filter(Boolean)
  const filename = parts[parts.length - 1]

  // Expect at least: FA_Assets / !Core_XXX / Subcategory / filename
  // But be lenient — work with what we have.

  // Derive category from the segment starting with '!'
  // Fallback: themed paths like FA_Assets/Underdark/Drow_Settlement/Structures/...
  let category = ''
  let subcategoryIndex = -1
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i].startsWith('!')) {
      // Strip leading '!' and any numeric prefix like "01_"
      category = parts[i].replace(/^!/, '').replace(/^\d+_/, '')
      subcategoryIndex = i + 1
      break
    }
  }

  // Fallback for themed settlement/wilderness paths without '!' prefix
  // e.g., FA_Assets / Underdark / Drow_Settlement / Structures / ...
  if (!category && parts.length >= 4 && parts[0] === 'FA_Assets') {
    category = parts[1] // e.g., "Underdark", "Mountain"
    // Find the first segment that looks like a known subcategory
    for (let i = 2; i < parts.length - 1; i++) {
      const lower = parts[i].toLowerCase()
      if (SUBCATEGORY_NAMES.has(lower)) {
        subcategoryIndex = i
        break
      }
    }
    // If no known subcategory found, use the segment after the settlement name
    if (subcategoryIndex === -1 && parts.length >= 5) {
      subcategoryIndex = 3
    }
  }

  const subcategory =
    subcategoryIndex >= 0 && subcategoryIndex < parts.length - 1
      ? parts[subcategoryIndex]
      : ''

  // Parse filename stem
  const stem = filename.slice(0, -4) // remove .png

  // Extract grid size: trailing _NxM pattern
  let gridWidth = 1
  let gridHeight = 1
  const gridMatch = stem.match(/_(\d+)x(\d+)$/)
  let coreStem = stem
  if (gridMatch) {
    gridWidth = parseInt(gridMatch[1], 10)
    gridHeight = parseInt(gridMatch[2], 10)
    coreStem = stem.slice(0, -gridMatch[0].length)
  }

  // Split remaining stem by '_': Name_Material_..._Variant
  const stemParts = coreStem.split('_').filter(Boolean)

  // Variant is the last part if it matches pattern like A1, B2, A, B...
  let variant = ''
  const variantMatch = stemParts[stemParts.length - 1]?.match(/^[A-Z]\d*$/)
  if (variantMatch) {
    variant = stemParts[stemParts.length - 1]
    stemParts.pop()
  }

  // Material: find first MATERIAL_WORDS match in stemParts (case-insensitive)
  let material = ''
  for (const part of stemParts) {
    if (MATERIAL_WORDS.has(part.toLowerCase())) {
      material = part
      break
    }
  }

  // Tags from category, subcategory, middle path segments + stem
  const middleSegments = parts.slice(subcategoryIndex + 1, parts.length - 1)
  const tagSegments = [
    category.toLowerCase(),
    subcategory.toLowerCase(),
    ...middleSegments.map((s) => s.toLowerCase()),
  ]
  const tags = deriveTags(tagSegments, coreStem)

  return {
    filename,
    category,
    subcategory,
    material,
    variant,
    gridWidth,
    gridHeight,
    tags,
  }
}

// ---------------------------------------------------------------------------
// scanZipManifest
// ---------------------------------------------------------------------------

/**
 * Scan a ZIP file and return an array of manifest entries for PNG assets.
 *
 * @param {string} zipPath - Absolute or relative path to ZIP file
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function scanZipManifest(zipPath, { limit = Infinity, author = '', license = '' } = {}) {
  const zip = await open(zipPath)
  const results = []

  // Extract just the zip filename for source tracking
  const sourceZip = zipPath.replace(/\\/g, '/').split('/').pop()

  try {
    for await (const entry of zip) {
      if (results.length >= limit) break

      const entryPath = entry.filename
      const parsed = parseFAFilename(entryPath)
      if (!parsed) continue

      results.push({
        path: entryPath,
        ...parsed,
        author,
        license,
        sourceZip,
        compressedSize: entry.compressedSize,
        uncompressedSize: entry.uncompressedSize,
      })
    }
  } finally {
    await zip.close()
  }

  return results
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(args) {
  // Parse --author and --license flags
  let author = ''
  let license = ''
  const zipPaths = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--author' && i + 1 < args.length) {
      author = args[++i]
    } else if (args[i] === '--license' && i + 1 < args.length) {
      license = args[++i]
    } else {
      zipPaths.push(args[i])
    }
  }

  if (zipPaths.length === 0) {
    console.error('Usage: node scripts/assets/scan.js [--author "Name"] [--license "Type"] <zip-path> [zip-path...]')
    process.exit(1)
  }

  if (author) console.log(`Author: ${author}`)
  if (license) console.log(`License: ${license}`)

  let total = 0
  const allEntries = []

  for (const zipPath of zipPaths) {
    console.log(`Scanning: ${zipPath}`)
    const entries = await scanZipManifest(zipPath, { author, license })
    console.log(`  Found ${entries.length} PNG assets`)
    allEntries.push(...entries)
    total += entries.length
  }

  const outDir = resolve(process.cwd(), 'assets')
  const outPath = resolve(outDir, 'manifest.json')

  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, JSON.stringify(allEntries, null, 2), 'utf8')

  console.log(`\nTotal: ${total} assets`)
  console.log(`Manifest written to: ${outPath}`)
}

// Run CLI when executed directly
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') ===
    process.argv[1].replace(/\\/g, '/')

if (isMain) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
