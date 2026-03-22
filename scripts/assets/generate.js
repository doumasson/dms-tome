#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'fs/promises'
import { basename, dirname, join, resolve } from 'path'
import sharp from 'sharp'

const DEFAULT_CATALOG = 'scripts/assets/asset-catalog.json'
const DEFAULT_OUTPUT_DIR = 'assets/generated'
const DEFAULT_STATE_FILE = 'assets/generated/progress.json'
const DEFAULT_QUEUE_FILE = 'assets/generated/queue.json'
const DEFAULT_MODEL = 'gpt-image-1'
const DEFAULT_BATCH_SIZE = 5
const DEFAULT_DELAY_MS = 2500
const DEFAULT_TILE_SIZE = 200
const DEFAULT_CATEGORY_ORDER = [
  'wall',
  'floor',
  'structure',
  'furniture',
  'decor',
  'craft',
  'terrain',
  'effect',
  'token',
  'misc',
]

function parseArgs(argv) {
  const args = {
    catalog: DEFAULT_CATALOG,
    outdir: DEFAULT_OUTPUT_DIR,
    state: DEFAULT_STATE_FILE,
    queue: DEFAULT_QUEUE_FILE,
    model: DEFAULT_MODEL,
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    limit: null,
    categories: null,
    dryRun: false,
    failFast: false,
    tileSize: DEFAULT_TILE_SIZE,
    startAt: 0,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--catalog' && next) {
      args.catalog = next
      i += 1
    } else if (arg === '--outdir' && next) {
      args.outdir = next
      i += 1
    } else if (arg === '--state' && next) {
      args.state = next
      i += 1
    } else if (arg === '--queue' && next) {
      args.queue = next
      i += 1
    } else if (arg === '--model' && next) {
      args.model = next
      i += 1
    } else if (arg === '--batch-size' && next) {
      args.batchSize = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--delay-ms' && next) {
      args.delayMs = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--limit' && next) {
      args.limit = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--categories' && next) {
      args.categories = next.split(',').map(value => value.trim()).filter(Boolean)
      i += 1
    } else if (arg === '--tile-size' && next) {
      args.tileSize = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--start-at' && next) {
      args.startAt = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--fail-fast') {
      args.failFast = true
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`
Usage: node scripts/assets/generate.js [options]

Options:
  --catalog <path>       Asset catalog JSON path
  --outdir <path>        Output directory for generated assets
  --state <path>         Progress state file
  --queue <path>         Queue manifest file
  --categories <list>    Comma-separated category order/filter
  --limit <n>            Maximum queued tasks to process this run
  --start-at <n>         Skip the first N pending tasks
  --batch-size <n>       Advisory batch size written to queue metadata
  --delay-ms <n>         Delay between generations
  --model <name>         OpenAI image model (default: gpt-image-1)
  --tile-size <n>        Output PNG width/height in pixels
  --dry-run              Build queue and print summary without API calls
  --fail-fast            Stop on first failed generation
  --help                 Show this help

Environment:
  OPENAI_API_KEY         Required for non-dry-run generation
`)
}

function normalizeCategoryOrder(categories) {
  if (!categories || categories.length === 0) return DEFAULT_CATEGORY_ORDER

  const seen = new Set()
  const ordered = []
  for (const category of categories) {
    if (!seen.has(category)) {
      ordered.push(category)
      seen.add(category)
    }
  }
  for (const category of DEFAULT_CATEGORY_ORDER) {
    if (!seen.has(category)) ordered.push(category)
  }
  return ordered
}

function buildVariantPrompt(entry, direction) {
  const prompt = entry.prompt.replace(/Generate 4 directional variants:[^.]*\./i, '').trim()
  const orientationMap = {
    north: 'north-facing wall segment aligned horizontally along the top edge of the tile',
    south: 'south-facing wall segment aligned horizontally along the bottom edge of the tile',
    east: 'east-facing wall segment aligned vertically along the right edge of the tile',
    west: 'west-facing wall segment aligned vertically along the left edge of the tile',
  }

  return `${prompt} Create the ${orientationMap[direction]}. Keep the artwork original, top-down, dark fantasy, and gameplay-readable.`
}

function expandTasks(entries, outdir) {
  const tasks = []

  for (const entry of entries) {
    const outputDir = join(outdir, entry.category)
    const baseName = basename(entry.outputFilename, '.png')

    if (entry.needsVariants) {
      for (const direction of ['north', 'south', 'east', 'west']) {
        tasks.push({
          id: `${entry.id}:${direction}`,
          entryId: entry.id,
          category: entry.category,
          prompt: buildVariantPrompt(entry, direction),
          sourcePath: entry.sourcePath,
          outputPath: join(outputDir, `${baseName}_${direction}.png`),
          outputFilename: `${baseName}_${direction}.png`,
          variant: direction,
        })
      }
      continue
    }

    tasks.push({
      id: entry.id,
      entryId: entry.id,
      category: entry.category,
      prompt: entry.prompt,
      sourcePath: entry.sourcePath,
      outputPath: join(outputDir, entry.outputFilename),
      outputFilename: entry.outputFilename,
      variant: null,
    })
  }

  return tasks
}

async function loadJson(path, fallback) {
  try {
    const content = await readFile(path, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback
    throw error
  }
}

async function saveJson(path, data) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`)
}

function sortTasks(tasks, categoryOrder) {
  const order = new Map(categoryOrder.map((category, index) => [category, index]))
  return [...tasks].sort((a, b) => {
    const categoryDelta = (order.get(a.category) ?? 999) - (order.get(b.category) ?? 999)
    if (categoryDelta !== 0) return categoryDelta
    return a.outputFilename.localeCompare(b.outputFilename)
  })
}

function summarizeTasks(tasks) {
  const counts = {}
  for (const task of tasks) {
    counts[task.category] = (counts[task.category] || 0) + 1
  }
  return counts
}

async function fileExists(path) {
  try {
    await readFile(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function ensureOutputDirs(tasks) {
  const dirs = new Set(tasks.map(task => dirname(task.outputPath)))
  await Promise.all([...dirs].map(dir => mkdir(dir, { recursive: true })))
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms))
}

async function generateImage({ apiKey, model, prompt, sourcePath }) {
  const sourceBuffer = await readFile(sourcePath)
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', `${prompt} Use the supplied image only as loose stylistic reference. Do not copy composition or distinctive shapes.`)
  form.append('image', new Blob([sourceBuffer]), basename(sourcePath))

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API ${response.status}: ${errorText}`)
  }

  const payload = await response.json()
  const imageBase64 = payload?.data?.[0]?.b64_json
  if (!imageBase64) {
    throw new Error('OpenAI API response did not include data[0].b64_json')
  }

  return Buffer.from(imageBase64, 'base64')
}

async function writePng(buffer, outputPath, tileSize) {
  await mkdir(dirname(outputPath), { recursive: true })
  await sharp(buffer)
    .resize(tileSize, tileSize, { fit: 'fill' })
    .png()
    .toFile(outputPath)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const catalogPath = resolve(args.catalog)
  const outdir = resolve(args.outdir)
  const statePath = resolve(args.state)
  const queuePath = resolve(args.queue)
  const categoryOrder = normalizeCategoryOrder(args.categories)

  const catalog = await loadJson(catalogPath)
  const state = await loadJson(statePath, {
    completed: {},
    failed: {},
  })

  const categoryFilter = args.categories ? new Set(args.categories) : null
  const filteredEntries = categoryFilter
    ? catalog.entries.filter(entry => categoryFilter.has(entry.category))
    : catalog.entries

  const allTasks = sortTasks(expandTasks(filteredEntries, outdir), categoryOrder)
  const pendingTasks = []

  for (const task of allTasks) {
    if (state.completed[task.id]) continue
    if (await fileExists(task.outputPath)) {
      state.completed[task.id] = {
        outputPath: task.outputPath,
        skippedExisting: true,
        completedAt: new Date().toISOString(),
      }
      continue
    }
    pendingTasks.push(task)
  }

  const selectedTasks = pendingTasks.slice(args.startAt, args.limit ? args.startAt + args.limit : undefined)
  await ensureOutputDirs(selectedTasks)

  const queue = {
    generatedAt: new Date().toISOString(),
    catalogPath,
    outdir,
    categoryOrder,
    requestedCategories: args.categories ?? DEFAULT_CATEGORY_ORDER,
    totalEntries: filteredEntries.length,
    totalTasks: allTasks.length,
    pendingTasks: pendingTasks.length,
    selectedTasks: selectedTasks.length,
    batchSize: args.batchSize,
    delayMs: args.delayMs,
    countsByCategory: summarizeTasks(selectedTasks),
    tasks: selectedTasks.map(task => ({
      id: task.id,
      category: task.category,
      sourcePath: task.sourcePath,
      outputPath: task.outputPath,
      outputFilename: task.outputFilename,
      variant: task.variant,
      prompt: task.prompt,
    })),
  }

  await saveJson(statePath, state)
  await saveJson(queuePath, queue)

  console.log(`[queue] wrote ${queuePath}`)
  console.log(`[queue] selected ${selectedTasks.length}/${pendingTasks.length} pending tasks`)
  for (const [category, count] of Object.entries(queue.countsByCategory)) {
    console.log(`[queue] ${category}: ${count}`)
  }

  if (args.dryRun) {
    console.log('[queue] dry run only, no API calls made')
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for generation. Re-run with --dry-run to only prepare the queue.')
  }

  let completedThisRun = 0
  for (let index = 0; index < selectedTasks.length; index += 1) {
    const task = selectedTasks[index]

    try {
      const imageBuffer = await generateImage({
        apiKey,
        model: args.model,
        prompt: task.prompt,
        sourcePath: task.sourcePath,
      })
      await writePng(imageBuffer, task.outputPath, args.tileSize)

      state.completed[task.id] = {
        outputPath: task.outputPath,
        model: args.model,
        completedAt: new Date().toISOString(),
      }
      delete state.failed[task.id]
      completedThisRun += 1
      console.log(`[gen] ${index + 1}/${selectedTasks.length}: ${task.category}/${task.outputFilename} ✓`)
    } catch (error) {
      state.failed[task.id] = {
        outputPath: task.outputPath,
        failedAt: new Date().toISOString(),
        error: error.message,
      }
      console.error(`[gen] ${index + 1}/${selectedTasks.length}: ${task.category}/${task.outputFilename} x ${error.message}`)
      if (args.failFast) {
        await saveJson(statePath, state)
        throw error
      }
    }

    await saveJson(statePath, state)

    if (index < selectedTasks.length - 1) {
      await sleep(args.delayMs)
    }
  }

  console.log(`[done] completed ${completedThisRun}/${selectedTasks.length} tasks this run`)
}

main().catch(error => {
  console.error(`[error] ${error.message}`)
  process.exit(1)
})
