import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas } from './tileAtlas'
import { renderV2Layer, clearV2Layer } from './TilemapRendererV2'
import { renderGrid, clearGrid } from './GridOverlay'
import { renderTokens, isAnimating } from './TokenLayer'
import { renderExits, clearExits } from './ExitZone'
import { TileAtlasV2 } from './tileAtlasV2'
import { WallRenderer } from './WallRenderer'
import { renderLighting, clearLighting } from './LightingLayer'
import { updateWeather, clearWeather } from './WeatherRenderer.js'
import { updateStatusEffects } from './StatusEffectRenderer.js'
import { applyDayNightTint } from './DayNightFilter.js'
import { getTimeOfDay } from '../lib/gameTime.js'
import useStore from '../store/useStore.js'

// Atlas manifest files that ship with the build (JSON only — images loaded at runtime)
const ATLAS_NAMES = [
  'atlas-floors', 'atlas-structures', 'atlas-props-furniture',
  'atlas-props-decor', 'atlas-props-craft', 'atlas-terrain',
  'atlas-effects', 'atlas-walls',
]

export default forwardRef(function PixiApp({ zone, tokens, onTileClick, onExitClick, onNpcClick, inCombat, camera, roofManager }, ref) {
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
  const wallRendererRef = useRef(null)
  const roofManagerRef2 = useRef(roofManager)
  roofManagerRef2.current = roofManager
  const roofAlphaRef = useRef({})
  const roofBuildingGridRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [atlasReady, setAtlasReady] = useState(false)

  useImperativeHandle(ref, () => ({
    getApp: () => appRef.current,
    getWorldTransform: () => {
      const w = worldRef.current
      if (!w) return null
      return { x: w.x, y: w.y, scale: w.scale.x }
    },
    getCamera: () => cameraRef.current,
    getMovementRangeLayer: () => stageLayersRef.current.movementRange || null,
    getFogLayer: () => stageLayersRef.current.fog || null,
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
        lighting: new PIXI.Container(),  // warm glow around fire sources
        grid: new PIXI.Container(),
        movementRange: new PIXI.Container(),  // combat reachable-tile highlights
        tokens: new PIXI.Container(),
        statusEffects: new PIXI.Container(),  // condition tints/rings — above tokens, below roof
        roof: new PIXI.Container(),    // above tokens — hides interior + NPCs until revealed
        fog: new PIXI.Container(),
        exits: new PIXI.Container(),
        weather: new PIXI.Container(),  // screen-space particles — rendered above world (on stage)
      }
      // All world layers go inside the scaled world container
      const { weather: weatherLayer, ...worldLayers } = layers
      Object.values(worldLayers).forEach(l => world.addChild(l))
      // Weather is screen-space: not scaled with camera, sits above world on stage
      app.stage.addChild(weatherLayer)
      layers.lighting.blendMode = 'add'
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

          // Load the WebP sprite sheet image from Supabase CDN
          const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tilesets/${name}.webp`
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
      setAtlasReady(true)

      const loaded = Object.keys(atlas.atlases).length
      const texLoaded = Object.keys(atlas.textures).length
      console.log(`[PixiApp] V2 atlases loaded: ${loaded} manifests, ${texLoaded} textures, ${zone.palette.length} palette entries`)
    }

    loadAtlases()

    return () => { cancelled = true; setAtlasReady(false) }
  }, [ready, zone?.palette])

  // V2 tile rendering + camera ticker — updates visible tiles each frame
  useEffect(() => {
    if (!ready || !tileAtlasV2Ref.current) return
    const app = appRef.current
    const world = worldRef.current
    if (!app || !world) return

    const tileSize = zone.tileSize || 200
    const tileAtlas = tileAtlasV2Ref.current
    const { floor, walls, props, roof, grid } = stageLayersRef.current

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
      // Wall edges rendered by WallRenderer (if available), otherwise fall back to solid fill
      if (wallRendererRef.current) {
        wallRendererRef.current.render(bounds)
      } else {
        renderV2Layer(walls, zone.layers.walls, zone.width, zone.height, tileSize, tileAtlas, bounds)
      }
      renderV2Layer(props, zone.layers.props, zone.width, zone.height, tileSize, tileAtlas, bounds)

      // Ambient lighting glow around fire sources
      if (zone.lightSources?.length) {
        renderLighting(stageLayersRef.current.lighting, zone.lightSources, tileSize, bounds)
      }

      // Status effect visuals — condition dots and concentration rings above tokens
      if (inCombat) {
        const combatants = useStore.getState().encounter?.combatants || []
        updateStatusEffects(stageLayersRef.current.statusEffects, combatants, tileSize)
      }

      // Weather particles — outdoor themes only
      const INDOOR_THEMES = new Set(['dungeon', 'cave', 'crypt', 'sewer'])
      if (!INDOOR_THEMES.has(zone.theme)) {
        const weatherType = useStore.getState().weather?.current || 'clear'
        const weatherLayer = stageLayersRef.current.weather
        if (weatherLayer) {
          updateWeather(weatherLayer, weatherType, app.screen.width, app.screen.height, ticker.deltaMS)
        }
      }

      if (zone.layers?.roof) {
        renderV2Layer(roof, zone.layers.roof, zone.width, zone.height, tileSize, tileAtlas, bounds)
      }

      // Animate roof alpha per building (400ms fade)
      const rm = roofManagerRef2.current
      if (rm && zone?.buildings) {
        const FADE_SPEED = 1 / 400
        for (const b of zone.buildings) {
          const target = rm.isRevealed(b.id) ? 0 : 1
          const current = roofAlphaRef.current[b.id] ?? 1
          if (current !== target) {
            const delta = FADE_SPEED * ticker.deltaMS
            roofAlphaRef.current[b.id] = target < current
              ? Math.max(target, current - delta)
              : Math.min(target, current + delta)
          }
        }

        // Apply alpha + pitch tinting using pre-built spatial grid
        const roofContainer = stageLayersRef.current.roof
        const grid = roofBuildingGridRef.current
        if (grid) {
          for (const child of roofContainer.children) {
            if (child._isRoofDecor) {
              // Decorations (backing, ridge, shadow) — just apply building alpha
              // Find which building by checking center of the graphic
              const bounds = child.getBounds()
              const cx = Math.floor((bounds.x + bounds.width / 2) / tileSize)
              const cy = Math.floor((bounds.y + bounds.height / 2) / tileSize)
              const dbi = grid[cy * zone.width + cx]
              if (dbi > 0) {
                child.alpha = roofAlphaRef.current[zone.buildings[dbi - 1].id] ?? 1
              }
              continue
            }

            const tx = Math.floor(child.x / tileSize)
            const ty = Math.floor(child.y / tileSize)
            const bi = grid[ty * zone.width + tx]
            if (bi > 0) {
              const b = zone.buildings[bi - 1]
              const buildingAlpha = roofAlphaRef.current[b.id] ?? 1
              child.alpha = buildingAlpha

              // Pitch tinting: darken tiles near edges, brighten near ridge
              const isWide = b.width >= b.height
              let distFromRidge
              if (isWide) {
                // Ridge runs horizontally — distance is vertical from center
                const centerY = b.y + b.height / 2
                const maxDist = (b.height - 2) / 2
                distFromRidge = maxDist > 0 ? Math.abs(ty - centerY) / maxDist : 0
              } else {
                // Ridge runs vertically — distance is horizontal from center
                const centerX = b.x + b.width / 2
                const maxDist = (b.width - 2) / 2
                distFromRidge = maxDist > 0 ? Math.abs(tx - centerX) / maxDist : 0
              }
              // Tint: ridge = full brightness (0xffffff), edges = darker (0x888888)
              const brightness = Math.round(255 - distFromRidge * 80)
              const clamped = Math.max(140, Math.min(255, brightness))
              child.tint = (clamped << 16) | (clamped << 8) | clamped
            }
          }
        }
      }
    }

    app.ticker.add(tickerFn)
    return () => {
      app.ticker.remove(tickerFn)
      clearV2Layer(floor)
      clearV2Layer(walls)
      clearV2Layer(props)
      clearV2Layer(roof)
      clearLighting(stageLayersRef.current.lighting)
      if (stageLayersRef.current.weather) {
        clearWeather(stageLayersRef.current.weather)
      }
      roofAlphaRef.current = {}
    }
  }, [ready, atlasReady, inCombat])

  // Initialize WallRenderer when wall edge data is available
  useEffect(() => {
    if (!ready || !atlasReady || !tileAtlasV2Ref.current || !stageLayersRef.current.walls) return
    if (!zone?.wallEdges) return

    const wr = new WallRenderer(tileAtlasV2Ref.current, zone.tileSize || 200)
    wr.setWallData(zone.wallEdges, zone.layers?.walls, zone.palette, zone.width, zone.height, zone.theme, zone.buildings)
    stageLayersRef.current.walls.addChild(wr.container)
    wallRendererRef.current = wr

    return () => {
      wr.clear()
      stageLayersRef.current.walls?.removeChild(wr.container)
      wallRendererRef.current = null
    }
  }, [ready, atlasReady, zone?.wallEdges])

  // Draw orange-outlined tiles for revealed (detected but not-yet-triggered) traps
  useEffect(() => {
    if (!ready || !stageLayersRef.current.grid) return
    const gridLayer = stageLayersRef.current.grid
    const tileSize = zone?.tileSize || 200
    const traps = zone?.traps || []

    // Remove any old trap markers
    for (let i = gridLayer.children.length - 1; i >= 0; i--) {
      if (gridLayer.children[i]._isTrapMarker) {
        gridLayer.children[i].destroy()
        gridLayer.removeChildAt(i)
      }
    }

    // Add a marker for each revealed trap
    for (const trap of traps) {
      if (!trap.revealed || trap.triggered) continue
      const marker = new PIXI.Graphics()
      const px = trap.position.x * tileSize
      const py = trap.position.y * tileSize
      marker.rect(px + 4, py + 4, tileSize - 8, tileSize - 8)
      marker.stroke({ width: 4, color: 0xff7700, alpha: 0.85 })
      marker.rect(px + 10, py + 10, tileSize - 20, tileSize - 20)
      marker.stroke({ width: 2, color: 0xffaa00, alpha: 0.5 })
      marker._isTrapMarker = true
      gridLayer.addChild(marker)
    }
  }, [ready, zone?.traps])

  // Pre-compute spatial grid mapping tile index → building index for roof fade
  useEffect(() => {
    if (!zone?.buildings || !zone?.width) {
      roofBuildingGridRef.current = null
      roofAlphaRef.current = {}
      return
    }
    const grid = new Uint8Array(zone.width * zone.height)
    for (let bi = 0; bi < zone.buildings.length; bi++) {
      const b = zone.buildings[bi]
      for (let y = b.y; y < b.y + b.height && y < zone.height; y++) {
        for (let x = b.x; x < b.x + b.width && x < zone.width; x++) {
          if (x >= 0 && y >= 0) grid[y * zone.width + x] = bi + 1
        }
      }
    }
    roofBuildingGridRef.current = grid
    roofAlphaRef.current = {}

    // Build pitched roof shape per building
    const roofContainer = stageLayersRef.current?.roof
    const ts = zone?.tileSize || 200
    const OVERHANG = 0.5 // 50% of a tile past walls
    if (roofContainer) {
      // Remove old roof decorations
      for (let i = roofContainer.children.length - 1; i >= 0; i--) {
        if (roofContainer.children[i]._isRoofDecor) {
          roofContainer.children[i].destroy()
          roofContainer.removeChildAt(i)
        }
      }

      for (const b of zone.buildings) {
        if (!b.roofTile) continue
        const isWide = b.width >= b.height
        // Roof bounds: interior (inset 1 from walls) + overhang
        const oh = OVERHANG * ts
        const ix = (b.x + 1) * ts - oh
        const iy = (b.y + 1) * ts - oh
        const iw = (b.width - 2) * ts + oh * 2
        const ih = (b.height - 2) * ts + oh * 2
        // Ridge inset from gable ends
        const gableInset = ts * 0.4

        // Dark backing — pitched shape (hexagonal)
        const backing = new PIXI.Graphics()
        if (isWide) {
          // Ridge runs horizontally, gable peaks at left and right ends
          const midY = iy + ih / 2
          const peakInset = ts * 0.15 // how much the peak narrows
          backing.moveTo(ix + gableInset, iy)                  // top-left after gable
          backing.lineTo(ix + iw - gableInset, iy)             // top-right before gable
          backing.lineTo(ix + iw, midY)                         // right gable peak
          backing.lineTo(ix + iw - gableInset, iy + ih)        // bottom-right before gable
          backing.lineTo(ix + gableInset, iy + ih)             // bottom-left after gable
          backing.lineTo(ix, midY)                              // left gable peak
          backing.closePath()
          backing.fill(0x1a1210)
        } else {
          // Ridge runs vertically, gable peaks at top and bottom
          const midX = ix + iw / 2
          backing.moveTo(ix, iy + gableInset)                  // top-left after gable
          backing.lineTo(midX, iy)                              // top gable peak
          backing.lineTo(ix + iw, iy + gableInset)             // top-right after gable
          backing.lineTo(ix + iw, iy + ih - gableInset)        // bottom-right before gable
          backing.lineTo(midX, iy + ih)                         // bottom gable peak
          backing.lineTo(ix, iy + ih - gableInset)             // bottom-left before gable
          backing.closePath()
          backing.fill(0x1a1210)
        }
        backing._isRoofDecor = true
        roofContainer.addChildAt(backing, 0)

        // Ridge line — thick visible line along the peak
        const ridge = new PIXI.Graphics()
        if (isWide) {
          const midY = iy + ih / 2
          ridge.moveTo(ix, midY)
          ridge.lineTo(ix + iw, midY)
          ridge.stroke({ width: 4, color: 0x5a4a38, alpha: 0.7 })
        } else {
          const midX = ix + iw / 2
          ridge.moveTo(midX, iy)
          ridge.lineTo(midX, iy + ih)
          ridge.stroke({ width: 4, color: 0x5a4a38, alpha: 0.7 })
        }
        ridge._isRoofDecor = true
        roofContainer.addChild(ridge)

        // Eave shadow — darker strip along the outer edges
        const shadow = new PIXI.Graphics()
        const sw = ts * 0.2 // shadow strip width
        if (isWide) {
          const midY = iy + ih / 2
          // Top slope shadow
          shadow.moveTo(ix + gableInset, iy)
          shadow.lineTo(ix + iw - gableInset, iy)
          shadow.lineTo(ix + iw - gableInset, iy + sw)
          shadow.lineTo(ix + gableInset, iy + sw)
          shadow.closePath()
          shadow.fill({ color: 0x000000, alpha: 0.35 })
          // Bottom slope shadow
          shadow.moveTo(ix + gableInset, iy + ih - sw)
          shadow.lineTo(ix + iw - gableInset, iy + ih - sw)
          shadow.lineTo(ix + iw - gableInset, iy + ih)
          shadow.lineTo(ix + gableInset, iy + ih)
          shadow.closePath()
          shadow.fill({ color: 0x000000, alpha: 0.35 })
        } else {
          const midX = ix + iw / 2
          // Left slope shadow
          shadow.moveTo(ix, iy + gableInset)
          shadow.lineTo(ix + sw, iy + gableInset)
          shadow.lineTo(ix + sw, iy + ih - gableInset)
          shadow.lineTo(ix, iy + ih - gableInset)
          shadow.closePath()
          shadow.fill({ color: 0x000000, alpha: 0.35 })
          // Right slope shadow
          shadow.moveTo(ix + iw - sw, iy + gableInset)
          shadow.lineTo(ix + iw, iy + gableInset)
          shadow.lineTo(ix + iw, iy + ih - gableInset)
          shadow.lineTo(ix + iw - sw, iy + ih - gableInset)
          shadow.closePath()
          shadow.fill({ color: 0x000000, alpha: 0.35 })
        }
        shadow._isRoofDecor = true
        roofContainer.addChild(shadow)
      }
    }
  }, [zone?.buildings, zone?.width])

  // Day/night tint — applied whenever gameTime or zone changes
  const gameTime = useStore(s => s.gameTime)
  useEffect(() => {
    if (!worldRef.current) return
    const isIndoor = ['dungeon', 'cave', 'crypt', 'sewer'].includes(zone?.theme)
    const timeOfDay = isIndoor ? 'day' : getTimeOfDay(gameTime?.hour ?? 8)
    applyDayNightTint(worldRef.current, timeOfDay)
  }, [gameTime, zone?.theme, ready])

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

  // Render exit zones — transform areaBuilder format to ExitZone format
  useEffect(() => {
    if (!ready || !zone?.exits?.length || !stageLayersRef.current.exits) return
    if (inCombat) {
      clearExits(stageLayersRef.current.exits)
      return
    }
    const transformed = zone.exits.map(exit => {
      // Infer direction from position (edge detection)
      let direction = 'north'
      if (exit.edge) direction = exit.edge
      else if (exit.y === 0) direction = 'north'
      else if (exit.y >= (zone.height || 30) - 2) direction = 'south'
      else if (exit.x === 0) direction = 'west'
      else if (exit.x >= (zone.width || 40) - 2) direction = 'east'
      return {
        position: { x: exit.x, y: exit.y },
        width: exit.width || 3,
        direction,
        targetZone: exit.targetArea || exit.targetZone,
        entryPoint: exit.entryPoint,
        label: exit.label || '',
      }
    })
    const ts = zone?.tileSize || 200
    renderExits(stageLayersRef.current.exits, transformed, (exitData) => {
      onExitClickRef.current?.({
        targetArea: exitData.targetZone,
        entryPoint: exitData.entryPoint,
        label: exitData.label,
      })
    }, ts)
  }, [zone?.exits, ready, inCombat])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  )
})
