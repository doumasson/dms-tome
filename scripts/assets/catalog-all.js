#!/usr/bin/env node
/**
 * Asset Catalog Scanner
 *
 * Scans ALL assets in the user's D&D OneDrive folder (ZIPs + loose PNGs)
 * and produces a manifest with descriptions for AI-based regeneration.
 *
 * Usage: node scripts/assets/catalog-all.js
 * Output: scripts/assets/asset-catalog.json
 *
 * The catalog is consumed by the asset generation pipeline (Codex)
 * to create original versions of each asset that the user owns.
 */

import { readdir, stat, writeFile } from 'fs/promises'
import { join, basename, extname, dirname, relative } from 'path'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

const SOURCE_DIR = 'C:/Users/sheme/OneDrive/D&d'
const OUTPUT_FILE = 'scripts/assets/asset-catalog.json'
const OUTPUT_DIR = 'C:/Dev/dms-tome/assets/generated'

// Category detection from folder/file names
const CATEGORY_KEYWORDS = {
  floor: ['floor', 'ground', 'terrain', 'tile', 'cobble', 'brick', 'paving', 'flagstone'],
  wall: ['wall', 'barrier', 'fence', 'hedge', 'connector'],
  structure: ['building', 'structure', 'pillar', 'arch', 'column', 'bridge', 'stairs', 'door', 'gate', 'window'],
  furniture: ['table', 'chair', 'bench', 'bed', 'shelf', 'desk', 'stool', 'throne', 'cabinet', 'wardrobe', 'crate', 'barrel', 'chest', 'bookcase'],
  decor: ['candle', 'lantern', 'torch', 'lamp', 'sconce', 'banner', 'tapestry', 'rug', 'carpet', 'curtain', 'statue', 'fountain', 'well', 'grave', 'tombstone', 'altar', 'decoration', 'clutter', 'painting'],
  craft: ['anvil', 'forge', 'workbench', 'tool', 'cauldron', 'alchemy', 'wagon', 'cart', 'ship', 'boat', 'vehicle'],
  terrain: ['tree', 'bush', 'rock', 'boulder', 'grass', 'flower', 'mushroom', 'vine', 'moss', 'water', 'river', 'lake', 'pond', 'cliff', 'hill', 'path', 'road', 'bridge'],
  effect: ['fire', 'smoke', 'lightning', 'magic', 'spell', 'aura', 'glow', 'explosion', 'beam', 'bolt', 'blast', 'particle', 'blood', 'gore', 'web', 'ice', 'frost', 'shadow'],
  token: ['token', 'creature', 'monster', 'npc', 'character', 'adventurer', 'adversary', 'animal', 'boss', 'guard', 'brigand'],
}

// Material detection
const MATERIALS = ['wood', 'stone', 'iron', 'steel', 'gold', 'silver', 'bronze', 'copper', 'crystal', 'bone', 'leather', 'cloth', 'ceramic', 'glass', 'obsidian', 'marble', 'granite', 'sandstone', 'brick', 'thatch', 'hay', 'slate', 'ice', 'coral']

function detectCategory(filepath) {
  const lower = filepath.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return 'misc'
}

function detectMaterial(filepath) {
  const lower = filepath.toLowerCase()
  return MATERIALS.find(m => lower.includes(m)) || null
}

function extractDescription(filepath) {
  const name = basename(filepath, extname(filepath))
  // Clean up filename: remove numeric prefixes, underscores, variant suffixes
  const cleaned = name
    .replace(/^\d+-/, '')           // remove numeric ID prefix
    .replace(/_/g, ' ')             // underscores to spaces
    .replace(/\b[A-Z]\d*$/g, '')    // remove variant suffix (A1, B, etc.)
    .replace(/\d+x\d+$/, '')        // remove grid size suffix
    .replace(/\s+/g, ' ')           // collapse spaces
    .trim()
  return cleaned
}

function buildPrompt(entry) {
  const parts = []
  parts.push(`Top-down ${entry.category} tile for a dark fantasy RPG tilemap.`)
  parts.push(`Based on: "${entry.description}".`)
  if (entry.material) parts.push(`Material: ${entry.material}.`)
  parts.push(`Style: hand-painted, Forgotten Adventures / Baldur's Gate aesthetic.`)
  parts.push(`200x200 pixels, transparent PNG where appropriate.`)

  if (entry.category === 'wall') {
    parts.push(`Generate 4 directional variants: north-facing, south-facing, east-facing, west-facing.`)
  }
  if (entry.category === 'floor') {
    parts.push(`Must tile seamlessly in all directions.`)
  }
  if (['furniture', 'decor', 'craft', 'terrain'].includes(entry.category)) {
    parts.push(`Transparent background, object only.`)
  }
  if (entry.category === 'token') {
    parts.push(`Circular token portrait, character/creature facing camera, dramatic lighting.`)
  }

  return parts.join(' ')
}

async function scanDirectory(dir, entries = [], rootDir = dir) {
  try {
    const items = await readdir(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.name === 'desktop.ini' || item.name.startsWith('.')) continue
      const fullPath = join(dir, item.name)

      if (item.isDirectory()) {
        await scanDirectory(fullPath, entries, rootDir)
      } else if (['.png', '.webp', '.jpg', '.jpeg'].includes(extname(item.name).toLowerCase())) {
        const relPath = relative(rootDir, fullPath)
        const category = detectCategory(relPath)
        const material = detectMaterial(relPath)
        const description = extractDescription(item.name)

        const entry = {
          id: `gen_${entries.length}`,
          sourcePath: fullPath.replace(/\\/g, '/'),
          relativePath: relPath.replace(/\\/g, '/'),
          filename: item.name,
          category,
          material,
          description,
          prompt: '', // filled below
          outputFilename: `${category}_${description.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`,
          needsVariants: category === 'wall',
        }
        entry.prompt = buildPrompt(entry)
        entries.push(entry)
      }
    }
  } catch (e) {
    console.warn(`[scan] Error reading ${dir}:`, e.message)
  }
  return entries
}

async function main() {
  console.log(`[catalog] Scanning ${SOURCE_DIR}...`)
  const entries = await scanDirectory(SOURCE_DIR)

  // Summary
  const cats = {}
  for (const e of entries) {
    cats[e.category] = (cats[e.category] || 0) + 1
  }

  console.log(`[catalog] Found ${entries.length} assets:`)
  for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    outputDir: OUTPUT_DIR,
    totalAssets: entries.length,
    categoryCounts: cats,
    entries,
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(catalog, null, 2))
  console.log(`[catalog] Wrote ${OUTPUT_FILE}`)
  console.log(`\nNext step: Run Codex with task "generate assets from catalog"`)
  console.log(`  Codex reads: ${OUTPUT_FILE}`)
  console.log(`  Codex outputs to: ${OUTPUT_DIR}`)
}

main().catch(console.error)
