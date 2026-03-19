import * as PIXI from 'pixi.js'
import atlasData from '../data/tileAtlas.json'

let sheetTexture = null
const tileTextures = new Map()
const EMPTY = atlasData.emptyTile ?? -1

export async function loadTileAtlas() {
  if (sheetTexture) return
  try {
    sheetTexture = await PIXI.Assets.load(atlasData.sheetPath)
  } catch (e) {
    console.warn('Tileset not found, using fallback colors:', e)
    sheetTexture = null
  }
}

export function getTileTexture(tileIndex) {
  if (tileIndex === EMPTY || tileIndex < 0) return null
  if (tileTextures.has(tileIndex)) return tileTextures.get(tileIndex)

  if (!sheetTexture) return null

  const cols = atlasData.sheetCols
  const size = atlasData.tileSize
  const sx = (tileIndex % cols) * size
  const sy = Math.floor(tileIndex / cols) * size

  const texture = new PIXI.Texture({
    source: sheetTexture.source,
    frame: new PIXI.Rectangle(sx, sy, size, size),
  })
  tileTextures.set(tileIndex, texture)
  return texture
}

export function isTileBlocking(tileIndex) {
  return atlasData.blocking.includes(tileIndex)
}

export function getTileSize() {
  return atlasData.tileSize
}

export function getBlockingSet() {
  return new Set(atlasData.blocking)
}
