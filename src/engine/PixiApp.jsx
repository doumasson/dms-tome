import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas } from './tileAtlas'
import { renderV2Layer, clearV2Layer } from './TilemapRendererV2'
import { renderGrid, clearGrid } from './GridOverlay'
import { renderTokens, isAnimating } from './TokenLayer'
import { renderExits, clearExits } from './ExitZone'
import { TileAtlasV2 } from './tileAtlasV2'

// Atlas manifest files that ship with the build (JSON only — images loaded at runtime)
const ATLAS_NAMES = [
  'atlas-floors', 'atlas-structures', 'atlas-props-furniture',
  'atlas-props-decor', 'atlas-props-craft', 'atlas-terrain',
  'atlas-effects', 'atlas-walls',
]

export default forwardRef(function PixiApp({ zone, tokens, onTileClick, onExitClick, onNpcClick, inCombat, camera }, ref) {
  const containerRef = useRef(null)
  const appRef = useRef(null)
  const stageLayersRef = useRef({})
  const worldRef = useRef(null)
  const onTileClickRef = useRef(onTileClick)
  onTileClickRef.current = onTileClick
  const onExitClickRef = useRef(onExitClick)
  onExitClickRef.current = onExitClick
  const onNpcClickRef = useRef(onNpcClick)
  onNpcClickRef.current = onNpcClick
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const tileAtlasV2Ref = useRef(null)
  const [ready, setReady] = useState(false)

  useImperativeHandle(ref, () => ({
    getApp: () => appRef.current,
    getWorldTransform: () => {
      const w = worldRef.current
      if (!w) return null
      return { x: w.x, y: w.y, scale: w.scale.x }
    },
    getCamera: () => cameraRef.current,
  }), [])

  // Initialize PixiJS application
  useEffect(() => {
    const app = new PIXI.Application()
    appRef.current = app
    let destroyed = false

    const init = async () => {
      await app.init({
        resizeTo: containerRef.current,
        background: 0x08060c,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      if (destroyed) return

      containerRef.current.appendChild(app.canvas)

      // World container — all tile layers go inside, we scale this to fit viewport
      const world = new PIXI.Container()
      worldRef.current = world
      app.stage.addChild(world)

      const layers = {
        floor: new PIXI.Container(),
        walls: new PIXI.Container(),
        props: new PIXI.Container(),
        grid: new PIXI.Container(),
        tokens: new PIXI.Container(),
        fog: new PIXI.Container(),
        exits: new PIXI.Container(),
      }
      Object.values(layers).forEach(l => world.addChild(l))
      stageLayersRef.current = layers

      await loadTileAtlas()
      if (destroyed) return

      // Click handler — convert screen coords to tile coords accounting for world scale/offset
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      app.stage.on('pointerdown', (e) => {
        if (!worldRef.current) return
        const pos = e.global
        const w = worldRef.current
        const tileSize = tileAtlasV2Ref.current ? (zone?.tileSize || 200) : 64
        // Convert screen position to world position
        const wx = (pos.x - w.x) / w.scale.x
        const wy = (pos.y - w.y) / w.scale.y
        const tx = Math.floor(wx / tileSize)
        const ty = Math.floor(wy / tileSize)
        // Check if clicked on an NPC token
        const clickedNpc = tokensRef.current?.find(t => t.isNpc && t.x === tx && t.y === ty)
        if (clickedNpc && onNpcClickRef.current) {
          onNpcClickRef.current(clickedNpc)
          return
        }
        if (onTileClickRef.current) {
          onTileClickRef.current({ x: tx, y: ty })
        }
      })

      setReady(true)
    }

    init()

    return () => {
      destroyed = true
      try {
        if (app.canvas) app.destroy(true, { children: true })
      } catch (e) {
        // Silently handle if destroy fails during partial init
      }
      appRef.current = null
    }
  }, [])

  // Load V2 atlas textures when a palette-based zone is active
  useEffect(() => {
    if (!ready) {
      tileAtlasV2Ref.current = null
      return
    }

    let cancelled = false
    const atlas = new TileAtlasV2()

    const loadAtlases = async () => {
      // Load JSON manifests and WebP images for each atlas
      const loadPromises = ATLAS_NAMES.map(async (name) => {
        try {
          const jsonUrl = `/tilesets/${name}.json`
          const resp = await fetch(jsonUrl)
          if (!resp.ok) return
          const manifest = await resp.json()

          // Strip the atlas prefix from keys: "atlas-floors:tile_name" → "tile_name"
          // so TileAtlasV2.resolve() can look up by atlasName + tileName
          const cleaned = {}
          for (const [fullKey, value] of Object.entries(manifest)) {
            const colonIdx = fullKey.indexOf(':')
            const tileName = colonIdx >= 0 ? fullKey.slice(colonIdx + 1) : fullKey
            cleaned[tileName] = value
          }
          atlas.registerAtlas(name, cleaned)

          // Load the WebP sprite sheet image
          const imageUrl = `/tilesets/${name}.webp`
          await atlas.loadAtlasImage(name, imageUrl, PIXI)
        } catch (e) {
          console.warn(`[PixiApp] Failed to load atlas ${name}:`, e.message)
        }
      })

      await Promise.all(loadPromises)
      if (cancelled) return

      // Set the zone palette
      atlas.setPalette(zone.palette)
      tileAtlasV2Ref.current = atlas

      const loaded = Object.keys(atlas.atlases).length
      const texLoaded = Object.keys(atlas.textures).length
      console.log(`[PixiApp] V2 atlases loaded: ${loaded} manifests, ${texLoaded} textures, ${zone.palette.length} palette entries`)
    }

    loadAtlases()

    return () => { cancelled = true }
  }, [ready, zone?.palette])

  // V2 tile rendering + camera ticker — updates visible tiles each frame
  useEffect(() => {
    if (!ready || !tileAtlasV2Ref.current) return
    const app = appRef.current
    const world = worldRef.current
    if (!app || !world) return

    const tileSize = zone.tileSize || 200
    const tileAtlas = tileAtlasV2Ref.current
    const { floor, walls, props, grid } = stageLayersRef.current

    // Initial grid
    clearGrid(grid)
    renderGrid(grid, zone.width, zone.height, inCombat ? 0xcc3333 : 0xc9a84c, inCombat ? 0.08 : 0.04, tileSize)

    const tickerFn = (ticker) => {
      const cam = cameraRef.current
      if (!cam) return

      cam.update(ticker.deltaMS)
      world.scale.set(cam.zoom)
      world.x = -cam.x * cam.zoom
      world.y = -cam.y * cam.zoom

      // Calculate visible bounds in world-space pixels
      const viewW = app.screen.width
      const viewH = app.screen.height
      const bounds = {
        startX: cam.x,
        startY: cam.y,
        endX: cam.x + viewW / cam.zoom,
        endY: cam.y + viewH / cam.zoom,
      }

      // Render visible tiles for each layer
      renderV2Layer(floor, zone.layers.floor, zone.width, zone.height, tileSize, tileAtlas, bounds)
      renderV2Layer(walls, zone.layers.walls, zone.width, zone.height, tileSize, tileAtlas, bounds)
      renderV2Layer(props, zone.layers.props, zone.width, zone.height, tileSize, tileAtlas, bounds)
    }

    app.ticker.add(tickerFn)
    return () => {
      app.ticker.remove(tickerFn)
      clearV2Layer(floor)
      clearV2Layer(walls)
      clearV2Layer(props)
    }
  }, [ready, tileAtlasV2Ref.current, inCombat])

  // Scroll wheel zoom (camera mode)
  useEffect(() => {
    if (!ready) return
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      const cam = cameraRef.current
      if (!cam) return
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      cam.zoomAt(delta, e.offsetX, e.offsetY)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ready])

  // Render tokens — skip if animation is playing (PixiJS moves sprites directly)
  useEffect(() => {
    if (!ready || !tokens?.length || !stageLayersRef.current.tokens) return
    if (isAnimating()) return // don't rebuild sprites mid-walk
    renderTokens(stageLayersRef.current.tokens, tokens, zone?.tileSize || 200)
  }, [tokens, ready])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  )
})
