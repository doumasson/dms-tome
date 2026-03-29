#!/usr/bin/env node
/**
 * Full Asset Import Pipeline
 * Phase 1: Scan all compatible FA zips → rebuild atlases with more tiles
 * Phase 2: Scan loose PNG folders → merge into atlases + new token atlas
 *
 * Usage: node scripts/assets/import-all.js
 */

import { scanZipManifest, parseFAFilename } from './scan.js'
import { groupByAtlas, planAtlasLayout, buildAtlasImage } from './build.js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { readdir, stat, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { open } from 'yauzl-promise'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ASSET_DIR = 'C:/Users/sheme/OneDrive/D&d/D&D Assets 1'
const OUT_DIR = 'public/tilesets'
const MANIFEST_DIR = 'assets'
const TILE_SIZE = 200 // pixels per grid unit
const MAX_PER_ATLAS = 800 // increased from 400 for more variety
const MAX_SHEET_SIZE = 8192 // increased from 4096 to fit more tiles

// FA zips with standard FA_Assets/ or FA_Tokens/ directory structure
const FA_ASSET_ZIPS = [
  'Core_Mapmaking_Pack_Part1_v1.08.zip',
  'Core_Mapmaking_Pack_Part2_v1.05.zip',
  'Core_Mapmaking_Pack_Part3_v1.06.zip',
  'Assets_LU_26_March_01.zip',
  'Assets_LU_26_March_02.zip',
]

// Loose asset folders → category mapping
const FOLDER_CATEGORY = {
  // Map tiles
  'Dungeon Designers Tiles': 'structures',
  'Sewer Mapper': 'structures',
  'Greytale\'s Dungeon Elements Pack 1': 'structures',
  'Save Vs. Cave Ice Caves': 'structures',
  'Inns and Taverns': 'furniture',
  'The Fireside Tavern': 'furniture',
  'The Leaky Barrel Tavern & Inn': 'furniture',
  'Mansion of Mystery': 'structures',
  'The Wizard\'s Tower': 'structures',
  'The Dark Below 1': 'structures',
  'Rustic Village': 'structures',
  'Village to Pillage 1': 'structures',
  'Village to Pillage City Docks': 'structures',
  'Village to Pillage Gothic City 1': 'structures',
  'Village to Pillage Medium City 1': 'structures',
  'Quick Encounters Ships Pack 1': 'structures',

  // Props
  'Game Props Dungeon': 'decor',
  'Game Props Furniture': 'furniture',
  'Statue Assets Pack': 'decor',
  'Props 03 - More Statues': 'decor',
  'Tek Magic Pack 7': 'decor',
  'Tek-magic Pack 6 - Halloween': 'decor',

  // Spell FX
  '70 Bolts, Beams and Magic Missiles': 'combat',
  'Faster Caster\'s Spell Fx': 'combat',
  'Faster Caster\'s Spell Fx 2': 'combat',

  // Tokens (character/creature art - goes to atlas-tokens)
  'Boss Monster Token Set': 'token',
  'Boss Monster Token Set 3': 'token',
  'Boss Monster Token Set 4': 'token',
  'Boss Monster Token Set 5': 'token',
  'Boss Monster Token Set 6': 'token',
  'Boss Monster Token Set 7': 'token',
  'Boss Monster Token Set 8': 'token',
  'Boss Monster Token Set 9': 'token',
  'Adversaries - Guards - Pack 1': 'token',
  'Adversaries - Guards - Pack 2': 'token',
  'Animals': 'token',
  'Brigands': 'token',
  'Bump in the Night Set 1': 'token',
  'Bump in the Night Set 2': 'token',
  'Bump in the Night Set 3': 'token',
  'Creature Tokens Pack 2': 'token',
  'Creatures of the Deep': 'token',
  'Creatures of the Horde': 'token',
  'Creatures of the Jungle Set 1': 'token',
  'Creatures of the Underdark Set 1': 'token',
  'Creatures of the Underdark Set 2': 'token',
  'Cthulhu Men Token Set': 'token',
  'Demon Devils': 'token',
  'Dinosaurs': 'token',
  'Dragon Worshipers Token Set': 'token',
  'Dragons and Minions': 'token',
  'Dwarfs': 'token',
  'Essential Animals': 'token',
  'Essential Monsters': 'token',
  'Fantastic Far East': 'token',
  'Forces of Darkness Set 1': 'token',
  'Four Legged Fiends': 'token',
  'GithHord': 'token',
  'Goblin Band': 'token',
  'Greater Denizens of the Dark': 'token',
  'Hero Tokens - Pack 3': 'token',
  'Hero Tokens Pack 1': 'token',
  'Heroes of the Realm Vol. 1': 'token',
  'Heroes of the Realms Set 1': 'token',
  'Heroic Characters 1': 'token',
  'Heroic Characters 12': 'token',
  'Heroic Characters 18': 'token',
  'Heroic Characters 2': 'token',
  'Heroic Characters 6': 'token',
  'Horrific Monstrosities Token Set': 'token',
  'huminoid monsters': 'token',
  'Into the Darkness': 'token',
  'Jans Token Pack 52 - Monstrosities': 'token',
  'Land of the Giants Set 1': 'token',
  'Many Legged Fiends': 'token',
  'More Monsters': 'token',
  'No Legged Fiends': 'token',
  'NPCs - Townsfolk - Pack 1': 'token',
  'NPCs commoners pack 1': 'token',
  'Shambles\' Fantasy Essentials': 'token',
  'Shapeshifters Pack 2': 'token',
  'Two Legged Fiends': 'token',
  'Undead Pack 2': 'token',
  'Vikings 2': 'token',
  'WarTurtle': 'token',
  'Western Dragons': 'token',
  'Winged Fiends': 'token',
}

// Map loose-asset subcategories to atlas names
const LOOSE_SUBCATEGORY_TO_ATLAS = {
  structures: 'atlas-structures',
  furniture: 'atlas-props-furniture',
  decor: 'atlas-props-decor',
  combat: 'atlas-effects',
  token: 'atlas-tokens',
}

// ---------------------------------------------------------------------------
// Phase 1: Scan FA zips
// ---------------------------------------------------------------------------

async function phase1ScanFA() {
  console.log('=== PHASE 1: Scanning FA asset zips ===\n')
  const allEntries = []

  for (const zipName of FA_ASSET_ZIPS) {
    const zipPath = path.join(ASSET_DIR, zipName)
    if (!existsSync(zipPath)) {
      console.log(`  SKIP (not found): ${zipName}`)
      continue
    }
    console.log(`  Scanning: ${zipName}...`)
    const entries = await scanZipManifest(zipPath, {
      author: 'Forgotten Adventures',
      license: 'Commercial',
    })
    console.log(`    → ${entries.length} PNG assets`)
    allEntries.push(...entries)
  }

  console.log(`\n  Total FA assets: ${allEntries.length}`)
  return allEntries
}

// ---------------------------------------------------------------------------
// Phase 2: Scan loose PNG folders
// ---------------------------------------------------------------------------

/**
 * Parse a loose asset filename into manifest-compatible metadata.
 * Handles formats like:
 *   "10492-Rustic House 1.png"
 *   "184932-bed_blue_2x2.png"
 *   "Acid Arrow.png"
 *   "693212-Barbarian Battleaxe A.png"
 */
function parseLooseFilename(filepath, folderName, category) {
  if (!filepath.toLowerCase().endsWith('.png') && !filepath.toLowerCase().endsWith('.jpg'))
    return null

  const filename = path.basename(filepath)
  const ext = path.extname(filename)
  const stem = filename.slice(0, -ext.length)

  // Strip leading numeric ID (e.g., "10492-" or "184932-")
  const cleanStem = stem.replace(/^\d+-/, '')

  // Extract grid size from stem: _NxM or NxM at end
  let gridWidth = 1
  let gridHeight = 1
  const gridMatch = cleanStem.match(/[_\s](\d+)x(\d+)$/i)
  if (gridMatch) {
    gridWidth = parseInt(gridMatch[1], 10)
    gridHeight = parseInt(gridMatch[2], 10)
  }

  // For tokens, always 1x1
  if (category === 'token') {
    gridWidth = 1
    gridHeight = 1
  }

  // Cap at 4x4 for atlas viability
  if (gridWidth > 4 || gridHeight > 4) return null

  // Build a clean tile name
  const tileName = cleanStem
    .replace(/[_\s](\d+)x(\d+)$/i, '') // remove grid suffix
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()

  if (!tileName) return null

  // Derive subcategory from category
  const subcategory = category

  // Derive tags
  const tags = [category, folderName.toLowerCase().replace(/\s+/g, '_')]

  return {
    filename,
    path: filepath,
    category: folderName,
    subcategory,
    material: '',
    variant: '',
    gridWidth,
    gridHeight,
    tags,
    author: 'Third Party',
    license: 'Commercial',
    sourceZip: '', // loose file, no zip
    compressedSize: 0,
    uncompressedSize: 0,
    _isLoose: true, // marker for extraction logic
    _fullPath: filepath, // absolute path to file on disk
  }
}

async function phase2ScanLoose() {
  console.log('\n=== PHASE 2: Scanning loose asset folders ===\n')
  const allEntries = []

  for (const [folderName, category] of Object.entries(FOLDER_CATEGORY)) {
    const folderPath = path.join(ASSET_DIR, folderName)
    if (!existsSync(folderPath)) {
      console.log(`  SKIP (not found): ${folderName}`)
      continue
    }

    let count = 0
    const files = await walkDir(folderPath)
    for (const filePath of files) {
      const entry = parseLooseFilename(filePath, folderName, category)
      if (entry) {
        allEntries.push(entry)
        count++
      }
    }
    if (count > 0) console.log(`  ${folderName}: ${count} assets → ${category}`)
  }

  console.log(`\n  Total loose assets: ${allEntries.length}`)
  return allEntries
}

/** Recursively walk a directory, returning all file paths */
async function walkDir(dir) {
  const results = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walkDir(fullPath))
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Build atlases from merged manifest
// ---------------------------------------------------------------------------

/**
 * Extended groupByAtlas that handles both FA entries and loose entries.
 */
function groupAllByAtlas(entries) {
  const groups = {}

  for (const entry of entries) {
    let atlasName

    if (entry._isLoose) {
      // Loose entries use our mapping
      atlasName = LOOSE_SUBCATEGORY_TO_ATLAS[entry.subcategory] || 'atlas-misc'
    } else {
      // FA entries use subcategory mapping from build.js
      const sub = entry.subcategory?.toLowerCase() || 'misc'
      const FA_SUBCATEGORY_TO_ATLAS = {
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
      atlasName = FA_SUBCATEGORY_TO_ATLAS[sub] || 'atlas-misc'
    }

    if (!groups[atlasName]) groups[atlasName] = []
    groups[atlasName].push(entry)
  }

  return groups
}

/**
 * Select tiles with improved diversity — prioritize 1x1, spread across folders,
 * but also ensure we get key asset types (trees, roofs, etc.)
 * Cap all tiles at 4x4 grid max for atlas space efficiency.
 */
function selectTilesImproved(entries, maxTiles) {
  // Filter to atlas-viable sizes only (max 4x4 = 800x800px)
  const viable = entries.filter(e => e.gridWidth <= 4 && e.gridHeight <= 4)

  // Priority: actual trees first (filling a known gap — only had stumps before)
  const prioritySet = new Set()
  const priority = viable.filter(e => {
    const p = e.path?.toLowerCase() || ''
    const f = e.filename?.toLowerCase() || ''
    const isTree = (p.includes('/trees/') || f.startsWith('tree_') || f.includes('_tree_'))
      && !f.includes('christmas') && !f.includes('gingerbread')
      && !f.includes('feather_token') && !f.includes('spell_component')
    if (isTree) prioritySet.add(e)
    return isTree
  })

  // Then 1x1 tiles
  const oneByOne = viable.filter(e =>
    e.gridWidth === 1 && e.gridHeight === 1 && !prioritySet.has(e)
  )

  // Then small multi-tile (2x2, 3x3)
  const small = viable.filter(e =>
    e.gridWidth <= 3 && e.gridHeight <= 3
    && !(e.gridWidth === 1 && e.gridHeight === 1)
    && !prioritySet.has(e)
  )

  // 4x4 tiles
  const medium = viable.filter(e =>
    (e.gridWidth === 4 || e.gridHeight === 4)
    && !prioritySet.has(e)
  )

  // Group 1x1 by folder for diversity
  function getFolder(e) {
    const p = e.path || e._fullPath || ''
    const parts = p.replace(/\\/g, '/').split('/')
    return parts.slice(0, -1).pop() || 'root'
  }

  const folderGroups = {}
  for (const e of oneByOne) {
    const f = getFolder(e)
    if (!folderGroups[f]) folderGroups[f] = []
    folderGroups[f].push(e)
  }

  const selected = new Set()

  // Add priority items first (trees!) — cap at 25% of budget
  const priorityCap = Math.floor(maxTiles * 0.25)
  for (const e of priority) {
    if (selected.size >= priorityCap) break
    selected.add(e)
  }

  // Round-robin across 1x1 folders
  const folders = Object.keys(folderGroups).sort()
  let idx = 0
  while (selected.size < maxTiles * 0.7 && folders.length > 0) {
    const folder = folders[idx % folders.length]
    const group = folderGroups[folder]
    if (group.length > 0) {
      selected.add(group.shift())
    } else {
      folders.splice(idx % folders.length, 1)
      if (folders.length === 0) break
    }
    idx++
  }

  // Fill with small multi-tile
  for (const e of small) {
    if (selected.size >= maxTiles * 0.9) break
    selected.add(e)
  }

  // Fill remaining with medium
  for (const e of medium) {
    if (selected.size >= maxTiles) break
    selected.add(e)
  }

  return [...selected]
}

// ---------------------------------------------------------------------------
// Extract tiles (supports both zip and loose files)
// ---------------------------------------------------------------------------

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

async function extractAllTiles(selectedTiles) {
  const buffers = new Map() // tile path → Buffer

  // Group zip-based tiles by source zip
  const zipGroups = {}
  const looseFiles = []

  for (const tile of selectedTiles) {
    if (tile._isLoose) {
      looseFiles.push(tile)
    } else {
      const zip = tile.sourceZip
      if (!zipGroups[zip]) zipGroups[zip] = []
      zipGroups[zip].push(tile)
    }
  }

  // Extract from zips
  for (const [zipName, tiles] of Object.entries(zipGroups)) {
    const zipPath = path.join(ASSET_DIR, zipName)
    if (!existsSync(zipPath)) {
      console.log(`  ZIP not found: ${zipPath}`)
      continue
    }
    const wanted = new Set(tiles.map(t => t.path))
    console.log(`  ${zipName}: extracting ${wanted.size} tiles...`)
    const zipBuffers = await extractFromZip(zipPath, wanted)
    for (const [p, buf] of zipBuffers) {
      buffers.set(p, buf)
    }
    console.log(`    → extracted ${zipBuffers.size}/${wanted.size}`)
  }

  // Read loose files from disk
  if (looseFiles.length > 0) {
    console.log(`  Reading ${looseFiles.length} loose files from disk...`)
    let ok = 0
    for (const tile of looseFiles) {
      try {
        const buf = await readFile(tile._fullPath)
        buffers.set(tile.path || tile._fullPath, buf)
        ok++
      } catch {
        // skip unreadable files
      }
    }
    console.log(`    → read ${ok}/${looseFiles.length}`)
  }

  return buffers
}

// ---------------------------------------------------------------------------
// Build all atlases
// ---------------------------------------------------------------------------

async function buildAllAtlases(allEntries) {
  console.log('\n=== BUILDING ATLASES ===\n')

  const groups = groupAllByAtlas(allEntries)

  console.log(`Grouped ${allEntries.length} entries across ${Object.keys(groups).length} atlases`)
  console.log(`Max tiles per atlas: ${MAX_PER_ATLAS}`)
  console.log()

  // Plan all atlases and collect needed tiles
  const allSelected = [] // flat list of all selected tiles with atlas info
  const atlasPlans = []

  for (const [atlasName, entries] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    const selected = selectTilesImproved(entries, MAX_PER_ATLAS)

    // Generate tile IDs
    const seenIds = new Set()
    const tiles = []
    for (const e of selected) {
      const baseName = (e._isLoose
        ? e.filename.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/^\d+-/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
        : e.filename.replace('.png', '').toLowerCase()
      )

      // Ensure unique IDs
      let id = `${atlasName}:${baseName}`
      if (seenIds.has(id)) {
        let suffix = 2
        while (seenIds.has(`${atlasName}:${baseName}_${suffix}`)) suffix++
        id = `${atlasName}:${baseName}_${suffix}`
      }
      seenIds.add(id)

      tiles.push({
        id,
        pixelWidth: e.gridWidth * TILE_SIZE,
        pixelHeight: e.gridHeight * TILE_SIZE,
        ...e,
      })
    }

    const layout = planAtlasLayout(tiles, MAX_SHEET_SIZE)
    console.log(`${atlasName}: ${entries.length} total → ${selected.length} selected → ${layout.positions.length} fit (${layout.width}x${layout.height})`)

    for (const tile of layout.tiles || []) {
      allSelected.push(tile)
    }
    atlasPlans.push({ atlasName, layout })
  }

  // Extract all needed tiles
  console.log(`\nExtracting ${allSelected.length} tiles...`)
  const extractedBuffers = await extractAllTiles(allSelected)

  // Composite atlas images
  console.log(`\nCompositing ${atlasPlans.length} atlas sheets...`)
  mkdirSync(OUT_DIR, { recursive: true })

  const results = []
  for (const { atlasName, layout } of atlasPlans) {
    if (layout.positions.length === 0) continue

    const extractTile = async (id) => {
      const tile = layout.tiles?.find(t => t.id === id)
      if (!tile) return null
      const key = tile._isLoose ? (tile.path || tile._fullPath) : tile.path
      const buf = extractedBuffers.get(key)
      if (!buf) return null
      try {
        return await sharp(buf)
          .resize(tile.pixelWidth, tile.pixelHeight, { fit: 'fill' })
          .png()
          .toBuffer()
      } catch {
        return null // skip corrupt images
      }
    }

    console.log(`  Building ${atlasName} (${layout.positions.length} tiles, ${layout.width}x${layout.height})...`)
    const result = await buildAtlasImage(layout, atlasName, extractTile, OUT_DIR)
    console.log(`    → ${result.imagePath}`)
    results.push({ atlas: atlasName, tiles: layout.positions.length, ...result })
  }

  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('DungeonMind Asset Import Pipeline')
  console.log('=================================\n')

  // Phase 1: Scan FA zips
  const faEntries = await phase1ScanFA()

  // Phase 2: Scan loose folders
  const looseEntries = await phase2ScanLoose()

  // Merge and save manifest
  const allEntries = [...faEntries, ...looseEntries]
  mkdirSync(MANIFEST_DIR, { recursive: true })
  const manifestPath = path.join(MANIFEST_DIR, 'manifest-all.json')
  writeFileSync(manifestPath, JSON.stringify(allEntries, null, 2))
  console.log(`\nFull manifest: ${allEntries.length} entries → ${manifestPath}`)

  // Build atlases
  const results = await buildAllAtlases(allEntries)

  console.log('\n=== COMPLETE ===')
  console.log(`Built ${results.length} atlas sheets`)
  for (const r of results) {
    console.log(`  ${r.atlas}: ${r.tiles} tiles`)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
