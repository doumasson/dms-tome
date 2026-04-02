import { seededRandom } from './seededRandom.js'
import { ChunkLibrary } from './chunkLibrary.js'
import allChunks from '../data/chunks/index.js'
import { buildDungeonArea } from './dungeonBuilder.js'
import { generateInteractables } from './worldInteractions.js'
import {
  resolvePositions, stampChunk, connectWithRoad, connectWithMeanderingRoad,
  fillTerrain, fillTerrainNoise, buildUnifiedPalette, remapChunk,
  scatterProps, edgePadding, randomTransform,
} from './mapGenerator.js'
import { extractWallEdges } from './wallEdgeExtractor.js'
import { getBlockingSet } from '../engine/tileAtlas'
import { resolveRoofTile } from './roofStyles.js'
import { safeguardSpawn } from './gridUtils.js'
import {
  DUNGEON_THEMES, THEME_TERRAIN, THEME_ROAD, THEME_ROAD_WIDTH,
  V2_BLOCKING_TILES, getScatterTileIds,
} from './themeData.js'
import { clusterScatter } from './scatterCluster.js'

/* ── Area sizing ─────────────────────────────────────────────── */

// Semantic size categories — match area name/type to realistic dimensions
const SIZE_KEYWORDS = {
  // Tiny rooms: 4x4 to 8x8 (elevator shafts, cells, closets)
  tiny: /elevator|shaft|cell|closet|alcove|nook|crawl|vent|hatch/i,
  // Small rooms: 8x6 to 15x12 (corridors, hallways, small rooms)
  small: /corridor|hallway|hall\b|passage|tunnel|bridge|stairw|landing|airlock|pod|booth/i,
  // Medium rooms: 15x12 to 30x25 (rooms, chambers, bays, docks)
  medium: /room|chamber|bay|dock|office|quarters|barracks|lab|armory|mess|storage|workshop|shrine|chapel/i,
  // Large areas: 30x25 to 60x50 (plazas, markets, caverns, arenas)
  large: /plaza|market|arena|cavern|courtyard|garden|warehouse|hangar|throne|great.*hall/i,
  // Hub areas: 50x40 to 80x60 (towns, villages, camps, outposts)
  hub: /town|village|camp|outpost|settlement|fortress|castle|keep|stronghold|hub|station|command.*center/i,
  // Open world: 60x50 to 100x75 (forests, fields, deserts, wilderness)
  open: /forest|field|desert|wilderness|plains|swamp|mountain|coast|beach|lake|river|road|trail/i,
}

const SIZE_RANGES = {
  tiny:   { minW: 6,  maxW: 10, minH: 6,  maxH: 10 },
  small:  { minW: 8,  maxW: 16, minH: 6,  maxH: 12 },
  medium: { minW: 14, maxW: 28, minH: 12, maxH: 22 },
  large:  { minW: 24, maxW: 40, minH: 20, maxH: 32 },
  hub:    { minW: 32, maxW: 50, minH: 26, maxH: 38 },
  open:   { minW: 30, maxW: 50, minH: 25, maxH: 38 },
}

function detectSizeCategory(name, theme) {
  const text = (name || '') + ' ' + (theme || '')
  for (const [cat, regex] of Object.entries(SIZE_KEYWORDS)) {
    if (regex.test(text)) return cat
  }
  // Fallback by theme
  if (DUNGEON_THEMES.has(theme)) return 'medium'
  return 'large'
}

// Hard maximum — no area should ever exceed this regardless of brief or category
const HARD_MAX_W = 55
const HARD_MAX_H = 42

export function calculateAreaSize(brief) {
  const poiCount = brief.pois?.length || 3
  const category = detectSizeCategory(brief.name, brief.theme)
  const range = SIZE_RANGES[category]
  // Scale within range based on POI count (more POIs = bigger)
  const poiFactor = Math.min(1, (poiCount - 1) / 5) // 0 to 1
  const calcW = Math.round(range.minW + (range.maxW - range.minW) * poiFactor)
  const calcH = Math.round(range.minH + (range.maxH - range.minH) * poiFactor)
  // If brief specifies size, cap to category max; always enforce hard cap
  const width = Math.min(brief.width ? Math.min(brief.width, range.maxW) : calcW, HARD_MAX_W)
  const height = Math.min(brief.height ? Math.min(brief.height, range.maxH) : calcH, HARD_MAX_H)
  return { width, height }
}

/* ── Theme constants imported from themeData.js ──────────────── */

/* ── Shared chunk library singleton ──────────────────────────── */

let _lib = null
function getChunkLibrary() {
  if (!_lib) {
    _lib = new ChunkLibrary()
    _lib.loadAll(allChunks)
  }
  return _lib
}

/* ── Build pipeline ──────────────────────────────────────────── */

/**
 * Build a complete area object from an AI creative brief.
 * @param {object} brief — { id, name, width, height, theme, pois, connections, npcs, exits }
 * @param {number} [seed] — optional seed for deterministic layout
 * @returns {object} complete area object ready for rendering/storage
 */
export function buildAreaFromBrief(brief, seed = Date.now()) {
  if (brief.dungeonConfig || DUNGEON_THEMES.has(brief.theme)) {
    return buildDungeonArea(brief, seed)
  }

  const { id, name, theme = 'village', pois = [], connections = [], npcs = [], exits = [], enemies = [], encounterZones = [] } = brief
  const areaSize = calculateAreaSize(brief)
  const width = areaSize.width   // always use capped size from calculateAreaSize
  const height = areaSize.height
  const lib = getChunkLibrary()

  // 1. Match chunks for each POI (with random transforms + avoid duplicates)
  const rand = seededRandom(seed)
  const usedChunkIds = new Set()
  const matchedPois = []
  for (const poi of pois) {
    const chunk = lib.get(poi.type) || lib.findBest(poi.type, poi.tags || [], rand, usedChunkIds)
    if (!chunk) {
      console.warn(`[areaBuilder] No chunk found for POI type "${poi.type}" (label: "${poi.label}"), skipping`)
      continue
    }
    usedChunkIds.add(chunk.id)
    // Apply random rotation/flip for visual variety
    const transformed = randomTransform(chunk, rand)
    matchedPois.push({ ...poi, chunk: transformed, width: transformed.width, height: transformed.height })
  }

  // 2. Resolve positions (keyed by label)
  const positions = resolvePositions(matchedPois, width, height, seed)

  // 3. Build unified palette from all matched chunks + theme tiles
  const terrainTiles = THEME_TERRAIN[theme] || THEME_TERRAIN.village
  const roadTile = THEME_ROAD[theme] || THEME_ROAD.village
  const scatterTileIds = getScatterTileIds(theme)
  const extraTiles = [...terrainTiles, roadTile, ...scatterTileIds]
  const matchedChunks = matchedPois.map(p => p.chunk)
  const { palette, tileToIndex } = buildUnifiedPalette(matchedChunks, extraTiles)

  // 4. Create empty layers
  const size = width * height
  const layers = {
    floor: new Uint16Array(size),
    walls: new Uint16Array(size),
    props: new Uint16Array(size),
    roof:  new Uint16Array(size),
  }

  // 5. Remap & stamp chunks, collect buildings
  const buildings = []
  for (const poi of matchedPois) {
    const pos = positions[poi.label || poi.id]
    if (!pos) continue
    const remapped = remapChunk(poi.chunk, tileToIndex)
    stampChunk(layers, remapped, pos.x, pos.y, width)

    if (poi.chunk.type === 'building') {
      const roofTileId = resolveRoofTile(poi.chunk.tags || [], buildings.length)
      if (roofTileId) {
        if (!tileToIndex.has(roofTileId)) {
          tileToIndex.set(roofTileId, palette.length)
          palette.push(roofTileId)
        }
        const roofTileIdx = tileToIndex.get(roofTileId)
        // Fill roof layer over building interior (inset 1 tile from walls)
        for (let ry = pos.y + 1; ry < pos.y + poi.chunk.height - 1; ry++) {
          for (let rx = pos.x + 1; rx < pos.x + poi.chunk.width - 1; rx++) {
            if (rx >= 0 && ry >= 0 && rx < width && ry < height) {
              layers.roof[ry * width + rx] = roofTileIdx
            }
          }
        }
      }

      buildings.push({
        id: poi.label || poi.id,
        x: pos.x,
        y: pos.y,
        width: poi.chunk.width,
        height: poi.chunk.height,
        roofTile: roofTileId,
      })
    }
  }

  // 6. Connect POIs with meandering roads
  const roadIdx = tileToIndex.get(roadTile)
  const roadW = THEME_ROAD_WIDTH[theme] || 2
  for (let ci = 0; ci < connections.length; ci++) {
    const conn = connections[ci]
    const fromPos = positions[conn.from]
    const toPos = positions[conn.to]
    if (!fromPos || !toPos) continue
    const fromChunk = matchedPois.find(p => (p.label || p.id) === conn.from)
    const toChunk = matchedPois.find(p => (p.label || p.id) === conn.to)
    const fromPt = {
      x: fromPos.x + Math.floor((fromChunk?.chunk.width || 6) / 2),
      y: fromPos.y + (fromChunk?.chunk.height || 6) - 1,
    }
    const toPt = {
      x: toPos.x + Math.floor((toChunk?.chunk.width || 6) / 2),
      y: toPos.y + (toChunk?.chunk.height || 6) - 1,
    }
    connectWithMeanderingRoad(layers.floor, roadIdx, fromPt, toPt, roadW, width, height, seed + ci)
  }

  // 7. Fill terrain with noise-based gradients
  const terrainIndices = terrainTiles.map(id => tileToIndex.get(id)).filter(v => v !== undefined)
  fillTerrainNoise(layers.floor, terrainIndices, width, height, seed)

  // 7b. Apply edge padding — darken/vary border cells for natural framing
  if (terrainIndices.length > 0) {
    edgePadding(layers.floor, terrainIndices, width, height, 3, seed + 1)
  }

  // 7c. Scatter decoration props using cluster-based placement
  const roadIdxSet = new Set([tileToIndex.get(roadTile)].filter(Boolean))
  clusterScatter(layers, theme, width, height, seed + 2, roadIdxSet, tileToIndex)

  // 8. Extract wall edges (also backfills floor under wall cells)
  const doorSet = new Set()
  for (let i = 0; i < palette.length; i++) {
    if (palette[i] && palette[i].includes('door')) doorSet.add(palette[i])
  }
  const { wallEdges } = extractWallEdges(layers.walls, layers.floor, palette, doorSet, width, height)

  // 8b. Strip outer-facing wall edges for building cells so collision
  // matches rendering (only inner wall line blocks movement)
  for (const b of buildings) {
    const cx = b.x + b.width / 2
    const cy = b.y + b.height / 2
    for (let by = b.y; by < b.y + b.height && by < height; by++) {
      for (let bx = b.x; bx < b.x + b.width && bx < width; bx++) {
        if (bx < 0 || by < 0) continue
        const idx = by * width + bx
        if (layers.walls[idx] === 0) continue
        const bits = wallEdges[idx] & 0x0F
        if (bits === 0) continue
        let keep = 0
        // Only keep edges that face toward building center (inner edges)
        if ((bits & 0x1) && by > cy) keep |= 0x1   // NORTH, cell below center
        if ((bits & 0x4) && by < cy) keep |= 0x4   // SOUTH, cell above center
        if ((bits & 0x8) && bx > cx) keep |= 0x8   // WEST, cell right of center
        if ((bits & 0x2) && bx < cx) keep |= 0x2   // EAST, cell left of center
        // Preserve door bits (upper nibble)
        wallEdges[idx] = keep | (wallEdges[idx] & 0xF0)
      }
    }
  }

  // 8c. Auto-detect light sources from fire-related prop tiles
  const autoLights = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const propIdx = layers.props[y * width + x]
      if (propIdx === 0) continue
      const tileId = palette[propIdx] || ''
      if (tileId.match(/fire|torch|candle|lantern|brazier|campfire/i)) {
        const type = tileId.includes('candle') ? 'candle'
          : tileId.includes('torch') ? 'torch'
          : tileId.includes('lantern') ? 'lantern'
          : tileId.includes('brazier') ? 'campfire'
          : 'fireplace'
        autoLights.push({ position: { x, y }, type })
      }
    }
  }
  // Only use auto-detected light sources from actual prop tiles.
  // Brief-level lightSources are only used if they match a prop tile position.
  const briefLights = (brief.lightSources || []).filter(ls => {
    const idx = ls.position.y * width + ls.position.x
    const propIdx = layers.props[idx]
    return propIdx > 0 // only include if there's a prop at this position
  })
  // Auto-add light sources inside buildings (interiors should be lit at night)
  for (const building of buildings) {
    // Place a warm light at the center of each building interior
    const cx = building.x + Math.floor(building.width / 2)
    const cy = building.y + Math.floor(building.height / 2)
    // Check if there's already a light here from props
    const hasLight = autoLights.some(l =>
      Math.abs(l.position.x - cx) <= 2 && Math.abs(l.position.y - cy) <= 2
    )
    if (!hasLight) {
      autoLights.push({ position: { x: cx, y: cy }, type: 'fireplace', bright: 4, dim: 6 })
    }
  }

  const allLightSources = [...briefLights, ...autoLights]

  // 9. Build collision: edge-based walls handle wall blocking,
  // cellBlocked only tracks blocking props (furniture, boulders, etc.)
  const blockingSet = getBlockingSet()
  const cellBlocked = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const propIdx = layers.props[i]
    if (propIdx === 0) continue
    const tileId = palette[propIdx] || ''
    if (blockingSet.has(tileId) || V2_BLOCKING_TILES.has(tileId)) cellBlocked[i] = 1
  }

  // 9b. Compute POI center positions for NPC scheduling
  const poiPositions = {}
  for (const poi of matchedPois) {
    const label = poi.label || poi.id
    const pos = positions[label]
    if (pos) {
      poiPositions[label] = {
        x: pos.x + Math.floor((poi.chunk.width || 6) / 2),
        y: pos.y + Math.floor((poi.chunk.height || 6) / 2),
      }
    }
  }

  // 10. Place NPCs
  const poiLabels = Object.keys(poiPositions)
  const placedNpcs = []
  for (const npc of npcs) {
    const poiLabel = npc.position // POI label where NPC should be placed
    const pos = positions[poiLabel]
    if (!pos) {
      console.warn(`[areaBuilder] NPC "${npc.name}" references unknown POI "${poiLabel}", placing at center`)
      placedNpcs.push({
        id: npc.name.toLowerCase().replace(/\s+/g, '_'),
        name: npc.name,
        personality: npc.personality || '',
        position: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
        questRelevant: npc.questRelevant || false,
      })
      continue
    }
    const matchedPoi = matchedPois.find(p => (p.label || p.id) === poiLabel)
    const chunkW = matchedPoi?.chunk.width || 6
    const chunkH = matchedPoi?.chunk.height || 6
    // Place at center of chunk interior (offset from walls)
    const npcX = pos.x + Math.floor(chunkW / 2)
    const npcY = pos.y + Math.floor(chunkH / 2)
    // Auto-generate schedule if NPC has a position reference but no schedule
    const schedule = npc.schedule || (poiLabels.length >= 2
      ? [
          { time: 'dawn', position: poiLabel },
          { time: 'day', position: poiLabel },
          { time: 'dusk', position: poiLabels.find(l => l !== poiLabel) || poiLabel },
          { time: 'night', position: poiLabel },
        ]
      : null)
    placedNpcs.push({
      id: npc.name.toLowerCase().replace(/\s+/g, '_'),
      name: npc.name,
      personality: npc.personality || '',
      position: { x: npcX, y: npcY },
      questRelevant: npc.questRelevant || false,
      ...(schedule ? { schedule } : {}),
    })
  }

  // 11. Place enemies
  const placedEnemies = []
  for (const enemy of (enemies || [])) {
    const poiLabel = enemy.position
    const pos = positions[poiLabel]
    const matchedPoi = matchedPois.find(p => (p.label || p.id) === poiLabel)
    const chunkW = matchedPoi?.chunk.width || 6
    const chunkH = matchedPoi?.chunk.height || 6
    const baseX = pos ? pos.x + Math.floor(chunkW / 2) : Math.floor(width / 2)
    const baseY = pos ? pos.y + Math.floor(chunkH / 2) : Math.floor(height / 2)

    for (let i = 0; i < (enemy.count || 1); i++) {
      const offsetX = i === 0 ? 0 : ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2))
      const offsetY = i === 0 ? 0 : ((i % 3 === 0 ? 1 : 0))
      placedEnemies.push({
        id: `${enemy.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
        name: i > 0 ? `${enemy.name} ${i + 1}` : enemy.name,
        position: { x: baseX + offsetX, y: baseY + offsetY },
        stats: enemy.stats || { hp: 10, ac: 12, speed: 30 },
        attacks: enemy.attacks || [{ name: 'Attack', bonus: '+3', damage: '1d6+1' }],
        isEnemy: true,
      })
    }
  }

  // 11b. Calculate encounter zone centers from placed enemy positions
  const processedEncounterZones = (encounterZones || []).map(ez => {
    const ezEnemyNames = ez.enemies || [];
    // Find placed enemies that match this encounter zone
    const matchingEnemies = placedEnemies.filter(pe =>
      ezEnemyNames.some(name => pe.name === name || pe.name.startsWith(name + ' '))
    );
    if (matchingEnemies.length > 0) {
      // Calculate center as average position of matching enemies
      const avgX = Math.round(matchingEnemies.reduce((sum, e) => sum + e.position.x, 0) / matchingEnemies.length);
      const avgY = Math.round(matchingEnemies.reduce((sum, e) => sum + e.position.y, 0) / matchingEnemies.length);
      return { ...ez, center: { x: avgX, y: avgY } };
    }
    return ez;
  });

  // 12. Place exits
  const placedExits = []
  for (const exit of exits) {
    // Stair/ladder exits are interior POI-anchored, not edge-anchored
    if (exit.type === 'stairs_up' || exit.type === 'stairs_down' || exit.type === 'ladder') {
      const poiPos = positions[exit.spawnAt || exit.label]
      if (poiPos) {
        placedExits.push({
          x: poiPos.x + 1, y: poiPos.y + 1, width: 1, height: 1,
          targetArea: exit.targetArea,
          label: exit.label || '',
          type: exit.type,
          entryPoint: exit.entryPoint,
        })
      } else {
        console.warn(`[areaBuilder] Stair exit "${exit.label}" has no matching POI position (spawnAt: "${exit.spawnAt}"), skipping`)
      }
      continue
    }

    const exitW = exit.width || 3
    const exitH = exit.height || 3
    let x, y, ew, eh, entryPoint
    switch (exit.edge) {
      case 'north':
        x = Math.floor((width - exitW) / 2); y = 0; ew = exitW; eh = 1
        entryPoint = { x, y: (exit.targetHeight || height) - 2 }
        break
      case 'south':
        x = Math.floor((width - exitW) / 2); y = height - 1; ew = exitW; eh = 1
        entryPoint = { x, y: 1 }
        break
      case 'east':
        x = width - 1; y = Math.floor((height - exitH) / 2); ew = 1; eh = exitH
        entryPoint = { x: 1, y }
        break
      case 'west':
        x = 0; y = Math.floor((height - exitH) / 2); ew = 1; eh = exitH
        entryPoint = { x: (exit.targetWidth || width) - 2, y }
        break
      default:
        console.warn(`[areaBuilder] Unknown exit edge "${exit.edge}", skipping`)
        continue
    }
    placedExits.push({
      x, y, width: ew, height: eh,
      targetArea: exit.targetArea,
      entryPoint,
      label: exit.label || '',
    })
  }

  // 12b. Generate interactable objects (chests, searchable spots)
  const poisWithChunks = matchedPois.map(p => ({ ...p, chunk: p.chunk || {} }))
  const interactables = generateInteractables(
    { ...brief, pois: poisWithChunks },
    buildings, positions, width, height, cellBlocked, seed
  )

  // 13. Determine player start — first exit entry point or center
  const rawStart = brief.playerStart || (placedExits.length > 0
    ? { x: placedExits[0].x, y: placedExits[0].y === 0 ? 1 : placedExits[0].y }
    : { x: Math.floor(width / 2), y: Math.floor(height / 2) })
  // Ensure player doesn't spawn on top of enemies
  const playerStart = safeguardSpawn(rawStart, placedEnemies, { width, height, cellBlocked, layers })

  // Note: layers are returned as raw Uint16Arrays for immediate rendering.
  // Encoding to base64 happens at storage time via areaStorage.encodeLayers().
  return {
    id,
    name,
    width,
    height,
    tileSize: 200,
    useCamera: true,
    palette,
    layers,       // raw Uint16Arrays — encoded to base64 only when saving to Supabase
    wallEdges,        // Uint8Array — edge-based wall collision
    cellBlocked,      // Uint8Array — cell-based prop collision
    playerStart,
    npcs: placedNpcs,
    enemies: placedEnemies,
    encounterZones: processedEncounterZones,
    buildings,
    lightSources: allLightSources,
    exits: placedExits,
    interactables,
    poiPositions,
    theme,
    generated: true,
  }
}
