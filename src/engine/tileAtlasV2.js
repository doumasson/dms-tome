/**
 * TileAtlasV2 — multi-atlas tile resolver with integer palette support.
 *
 * Tile IDs use "atlasName:tileName" format (e.g., "floors:stone_earthy_01").
 * For compact layer storage, tile IDs are mapped to integer palette indices.
 */

export class TileAtlasV2 {
  constructor() {
    this.atlases = {}    // { atlasName: { tileName: { x, y, w, h, gw, gh, blocking? } } }
    this.textures = {}   // { atlasName: PIXI.BaseTexture } — populated by loadAtlasImage
    this.palette = []    // string tile IDs, indexed by integer
    this._cache = new Map()  // tile ID string → resolved info
  }

  registerAtlas(name, manifest) {
    this.atlases[name] = manifest
    this._cache.clear()
  }

  setPalette(palette) {
    this.palette = palette
    this._cache.clear()
  }

  resolve(tileId) {
    if (!tileId || tileId === '0' || tileId === 0) return null

    if (this._cache.has(tileId)) return this._cache.get(tileId)

    const colonIdx = tileId.indexOf(':')
    if (colonIdx === -1) return null

    const atlasName = tileId.slice(0, colonIdx)
    const tileName = tileId.slice(colonIdx + 1)

    const atlas = this.atlases[atlasName]
    if (!atlas || !atlas[tileName]) {
      this._cache.set(tileId, null)
      return null
    }

    const info = { atlasName, ...atlas[tileName] }
    this._cache.set(tileId, info)
    return info
  }

  resolveFromPalette(index) {
    if (index < 0 || index >= this.palette.length) return null
    return this.resolve(this.palette[index])
  }

  isBlocking(tileId) {
    const info = this.resolve(tileId)
    return info?.blocking === true
  }

  /** Load atlas image as PixiJS texture (call from renderer) */
  async loadAtlasImage(name, url, PIXI) {
    const texture = await PIXI.Assets.load(url)
    if (texture?.source) texture.source.scaleMode = 'nearest'
    if (texture) this.textures[name] = texture
    return texture
  }

  /** Get a PixiJS sub-texture for a resolved tile */
  getTexture(info, PIXI) {
    if (!info) return null
    const baseTexture = this.textures[info.atlasName]
    if (!baseTexture) return null

    const cacheKey = `${info.atlasName}:${info.x}:${info.y}:${info.w}:${info.h}`
    if (!this._texCache) this._texCache = new Map()
    if (this._texCache.has(cacheKey)) return this._texCache.get(cacheKey)

    const frame = new PIXI.Rectangle(info.x, info.y, info.w, info.h)
    const tex = new PIXI.Texture({ source: baseTexture.source || baseTexture, frame })
    this._texCache.set(cacheKey, tex)
    return tex
  }
}
