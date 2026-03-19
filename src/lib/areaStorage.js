import { rleEncode, rleDecode, rleToBlob, blobToRle } from './rleCodec.js'
import { supabase } from './supabase'
import { extractWallEdges } from './wallEdgeExtractor.js'
import { getBlockingSet } from '../engine/tileAtlas'

/* ── Layer Encoding ───────────────────────────────────────────── */

/**
 * Encode a flat Uint16Array layer to a base64 string for JSON storage.
 * Pipeline: Uint16Array → rleEncode → rleToBlob → base64
 */
export function encodeLayer(layer) {
  const encoded = rleEncode(layer)
  const blob = rleToBlob(encoded)
  const bytes = new Uint8Array(blob)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decode a base64 string back to a flat Uint16Array.
 * Pipeline: base64 → ArrayBuffer → blobToRle → rleDecode
 */
export function decodeLayer(base64Str, expectedLength) {
  const binary = atob(base64Str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const encoded = blobToRle(bytes.buffer)
  return rleDecode(encoded, expectedLength)
}

/**
 * Encode all layers of an area for storage.
 * @param {object} layers — { floor, walls, props, roof } as Uint16Arrays
 * @returns {object} — { floor, walls, props, roof } as base64 strings
 */
export function encodeLayers(layers) {
  const result = {}
  for (const [name, data] of Object.entries(layers)) {
    result[name] = encodeLayer(data)
  }
  return result
}

/**
 * Decode all layers from storage.
 * @param {object} encodedLayers — { floor, walls, props, roof } as base64 strings
 * @param {number} expectedLength — width * height
 * @returns {object} — { floor, walls, props, roof } as Uint16Arrays
 */
export function decodeLayers(encodedLayers, expectedLength) {
  const result = {}
  for (const [name, data] of Object.entries(encodedLayers)) {
    result[name] = typeof data === 'string'
      ? decodeLayer(data, expectedLength)
      : data // already decoded (Uint16Array)
  }
  return result
}

/* ── Supabase Persistence ─────────────────────────────────────── */

/**
 * Save a built area to Supabase campaign_data.areas[areaId].
 * Encodes layers to base64 before saving.
 */
export async function saveArea(campaignId, area) {
  const storageArea = {
    ...area,
    layers: encodeLayers(area.layers),
  }
  // Don't store collision (regenerated on load)
  delete storageArea.collision

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const campaignData = campaign?.campaign_data || {}
  const areas = campaignData.areas || {}
  areas[area.id] = storageArea

  await supabase
    .from('campaigns')
    .update({ campaign_data: { ...campaignData, areas } })
    .eq('id', campaignId)
}

/**
 * Load an area from Supabase, decode layers.
 */
export async function loadArea(campaignId, areaId) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const area = campaign?.campaign_data?.areas?.[areaId]
  if (!area) return null

  const expectedLength = area.width * area.height
  const layers = decodeLayers(area.layers, expectedLength)

  // Re-derive wall edges from walls layer (not persisted to save storage)
  const palette = area.palette || []
  const doorSet = new Set()
  for (let i = 0; i < palette.length; i++) {
    if (palette[i] && palette[i].includes('door')) doorSet.add(palette[i])
  }
  const { wallEdges, floor: backfilledFloor } = extractWallEdges(
    layers.walls, layers.floor, palette, doorSet, area.width, area.height
  )
  layers.floor = backfilledFloor

  // Build cellBlocked from blocking props
  const blockingSet = getBlockingSet()
  const cellBlocked = new Uint8Array(expectedLength)
  for (let i = 0; i < expectedLength; i++) {
    const propIdx = layers.props?.[i]
    if (propIdx === 0 || !propIdx) continue
    const tileId = palette[propIdx] || ''
    if (blockingSet.has(tileId)) cellBlocked[i] = 1
  }

  return { ...area, layers, wallEdges, cellBlocked }
}

/**
 * Remove a brief from areaBriefs after building.
 */
export async function removeBrief(campaignId, briefId) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_data')
    .eq('id', campaignId)
    .single()

  const campaignData = campaign?.campaign_data || {}
  const briefs = { ...campaignData.areaBriefs }
  delete briefs[briefId]

  await supabase
    .from('campaigns')
    .update({ campaign_data: { ...campaignData, areaBriefs: briefs } })
    .eq('id', campaignId)
}
