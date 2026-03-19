import { rleEncode, rleDecode, rleToBlob, blobToRle } from './rleCodec.js'
import { supabase } from './supabase'

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
  return {
    ...area,
    layers: decodeLayers(area.layers, expectedLength),
  }
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
