import { ChunkLibrary } from './chunkLibrary.js'
import allChunks from '../data/chunks/index.js'
import {
  resolvePositions, stampChunk, connectWithRoad,
  fillTerrain, buildUnifiedPalette, remapChunk,
} from './mapGenerator.js'
import { extractWallEdges } from './wallEdgeExtractor.js'
import { getBlockingSet } from '../engine/tileAtlas'
import { resolveRoofTile } from './roofStyles.js'

/* ── Area sizing ─────────────────────────────────────────────── */

export function calculateAreaSize(brief) {
  if (brief.width && brief.height) return { width: brief.width, height: brief.height }
  const poiCount = brief.pois?.length || 3
  const width = Math.min(120, Math.max(40, poiCount * 12))
  const height = Math.round(width * 0.75)
  return { width, height }
}

/* ── Theme constants ──────────────────────────────────────────── */

export const THEME_TERRAIN = {
  village: ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01', 'atlas-floors:grass_overlay_medium_c_01'],
  forest:  ['atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01'],
  dungeon: ['atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2', 'atlas-floors:brick_floor_04_d1'],
  cave:    ['atlas-floors:brick_floor_03_d3', 'atlas-floors:brick_floor_03_d4'],
  town:    ['atlas-floors:brick_floor_01_d1', 'atlas-floors:brick_floor_01_d2'],
}

export const THEME_ROAD = {
  village: 'atlas-floors:brick_floor_01_d1',
  forest:  'atlas-floors:brick_floor_02_d1',
  dungeon: 'atlas-floors:brick_floor_03_d1',
  cave:    'atlas-floors:brick_floor_04_d1',
  town:    'atlas-floors:brick_floor_01_d3',
}

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
  const { id, name, theme = 'village', pois = [], connections = [], npcs = [], exits = [], enemies = [], encounterZones = [] } = brief
  const size = calculateAreaSize(brief)
  const width = brief.width || size.width
  const height = brief.height || size.height
  const lib = getChunkLibrary()

  // 1. Match chunks for each POI
  const matchedPois = []
  for (const poi of pois) {
    const chunk = lib.get(poi.type) || lib.findBest(poi.type, poi.tags || [])
    if (!chunk) {
      console.warn(`[areaBuilder] No chunk found for POI type "${poi.type}" (label: "${poi.label}"), skipping`)
      continue
    }
    matchedPois.push({ ...poi, chunk, width: chunk.width, height: chunk.height })
  }

  // 2. Resolve positions (keyed by label)
  const positions = resolvePositions(matchedPois, width, height, seed)

  // 3. Build unified palette from all matched chunks + theme tiles
  const terrainTiles = THEME_TERRAIN[theme] || THEME_TERRAIN.village
  const roadTile = THEME_ROAD[theme] || THEME_ROAD.village
  const extraTiles = [...terrainTiles, roadTile]
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

  // 6. Connect POIs with roads
  const roadIdx = tileToIndex.get(roadTile)
  for (const conn of connections) {
    const fromPos = positions[conn.from]
    const toPos = positions[conn.to]
    if (!fromPos || !toPos) continue
    const fromChunk = matchedPois.find(p => (p.label || p.id) === conn.from)
    const toChunk = matchedPois.find(p => (p.label || p.id) === conn.to)
    // Connect from bottom-center of source to bottom-center of target
    const fromPt = {
      x: fromPos.x + Math.floor((fromChunk?.chunk.width || 6) / 2),
      y: fromPos.y + (fromChunk?.chunk.height || 6) - 1,
    }
    const toPt = {
      x: toPos.x + Math.floor((toChunk?.chunk.width || 6) / 2),
      y: toPos.y + (toChunk?.chunk.height || 6) - 1,
    }
    connectWithRoad(layers.floor, roadIdx, fromPt, toPt, 2, width)
  }

  // 7. Fill terrain
  const terrainIndices = terrainTiles.map(id => tileToIndex.get(id))
  fillTerrain(layers.floor, terrainIndices, width, height, seed)

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
  const allLightSources = [...(brief.lightSources || []), ...autoLights]

  // 9. Build collision: edge-based walls handle wall blocking,
  // cellBlocked only tracks blocking props (furniture, boulders, etc.)
  const blockingSet = getBlockingSet()
  const cellBlocked = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const propIdx = layers.props[i]
    if (propIdx === 0) continue
    const tileId = palette[propIdx] || ''
    if (blockingSet.has(tileId)) cellBlocked[i] = 1
  }

  // 10. Place NPCs
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
    placedNpcs.push({
      id: npc.name.toLowerCase().replace(/\s+/g, '_'),
      name: npc.name,
      personality: npc.personality || '',
      position: { x: npcX, y: npcY },
      questRelevant: npc.questRelevant || false,
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

  // 13. Determine player start — first exit entry point or center
  const playerStart = brief.playerStart || (placedExits.length > 0
    ? { x: placedExits[0].x, y: placedExits[0].y === 0 ? 1 : placedExits[0].y }
    : { x: Math.floor(width / 2), y: Math.floor(height / 2) })

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
    encounterZones,
    buildings,
    lightSources: allLightSources,
    exits: placedExits,
    theme,
    generated: true,
  }
}
