import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas, getTileSize } from './tileAtlas'
import { renderTilemap, clearTilemap } from './TilemapRenderer'
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

  // Is this a V2 palette-based zone?
  const isV2 = Boolean(zone?.palette)

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
        const tileSize = tileAtlasV2Ref.current ? (zone?.tileSize || 200) : getTileSize()
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
    if (!ready || !isV2) {
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
  }, [ready, isV2, zone?.palette])

  // Render V1 zone tilemap (legacy 2D array layers)
  useEffect(() => {
    if (!ready || !zone || isV2 || !stageLayersRef.current.floor || !worldRef.current) return
    const { floor, walls, props, grid } = stageLayersRef.current

    clearTilemap(floor)
    clearTilemap(walls)
    clearTilemap(props)
    renderTilemap(floor, zone.layers.floor)
    renderTilemap(walls, zone.layers.walls)
    renderTilemap(props, zone.layers.props)
    clearGrid(grid)
    renderGrid(grid, zone.width, zone.height, inCombat ? 0xcc3333 : 0xc9a84c, inCombat ? 0.08 : 0.04)
    clearExits(stageLayersRef.current.exits)
    if (zone.exits?.length && !inCombat) {
      renderExits(stageLayersRef.current.exits, zone.exits, (exitData) => {
        onExitClickRef.current?.(exitData)
      })
    }

    // Scale the world to fit the viewport, centered (only in legacy mode — no camera)
    if (!cameraRef.current) {
      scaleWorldToFit(zone)
    }
  }, [zone, ready, inCombat, isV2])

  // Re-scale on window resize (legacy mode only — camera handles its own resize)
  useEffect(() => {
    if (!ready || !zone || cameraRef.current) return
    const handleResize = () => scaleWorldToFit(zone)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ready, zone, camera])

  // V2 tile rendering + camera ticker — updates visible tiles each frame
  useEffect(() => {
    if (!ready || !isV2 || !tileAtlasV2Ref.current) return
    const app = appRef.current
    const world = worldRef.current
    if (!app || !world) return

    const tileSize = zone.tileSize || 200
    const tileAtlas = tileAtlasV2Ref.current
    const { floor, walls, props, grid } = stageLayersRef.current

    // Clear any V1 leftovers
    clearTilemap(floor)
    clearTilemap(walls)
    clearTilemap(props)

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
  }, [ready, isV2, tileAtlasV2Ref.current, inCombat])

  // Camera-driven rendering for V1 zones with camera (non-V2)
  useEffect(() => {
    if (!ready || !camera || isV2) return
    const app = appRef.current
    const world = worldRef.current
    if (!app || !world) return

    const tickerFn = (ticker) => {
      const cam = cameraRef.current
      if (!cam) return
      cam.update(ticker.deltaMS)
      world.scale.set(cam.zoom)
      world.x = -cam.x * cam.zoom
      world.y = -cam.y * cam.zoom
    }

    app.ticker.add(tickerFn)
    return () => app.ticker.remove(tickerFn)
  }, [ready, camera, isV2])

  function scaleWorldToFit(z) {
    const world = worldRef.current
    const container = containerRef.current
    if (!world || !container) return

    const tileSize = getTileSize()
    const mapWidth = z.width * tileSize
    const mapHeight = z.height * tileSize
    const viewWidth = container.clientWidth
    const viewHeight = container.clientHeight
    const hudHeight = 134 // bottom bar height

    // Available play area (full width, height minus HUD overlap)
    const playHeight = viewHeight - hudHeight
    const padding = 30
    const scaleX = (viewWidth - padding * 2) / mapWidth
    const scaleY = (playHeight - padding * 2) / mapHeight
    const scale = Math.min(scaleX, scaleY)

    world.scale.set(scale)
    // Center horizontally, vertically center in the play area (above HUD)
    world.x = (viewWidth - mapWidth * scale) / 2
    world.y = (playHeight - mapHeight * scale) / 2 + padding / 2
  }

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
    renderTokens(stageLayersRef.current.tokens, tokens, isV2 ? (zone?.tileSize || 200) : undefined)
  }, [tokens, ready, isV2])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  )
})
