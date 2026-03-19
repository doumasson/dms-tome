import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas, getTileSize } from './tileAtlas'
import { renderTilemap, clearTilemap } from './TilemapRenderer'
import { renderGrid, clearGrid } from './GridOverlay'
import { renderTokens, isAnimating } from './TokenLayer'
import { renderExits } from './ExitZone'

export default function PixiApp({ zone, tokens, onTileClick, onExitClick }) {
  const containerRef = useRef(null)
  const appRef = useRef(null)
  const stageLayersRef = useRef({})
  const worldRef = useRef(null)
  const onTileClickRef = useRef(onTileClick)
  onTileClickRef.current = onTileClick
  const onExitClickRef = useRef(onExitClick)
  onExitClickRef.current = onExitClick
  const [ready, setReady] = useState(false)

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
        if (!onTileClickRef.current || !worldRef.current) return
        const pos = e.global
        const w = worldRef.current
        const tileSize = getTileSize()
        // Convert screen position to world position
        const wx = (pos.x - w.x) / w.scale.x
        const wy = (pos.y - w.y) / w.scale.y
        const tx = Math.floor(wx / tileSize)
        const ty = Math.floor(wy / tileSize)
        onTileClickRef.current({ x: tx, y: ty })
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

  // Render zone tilemap and scale to fit viewport
  useEffect(() => {
    if (!ready || !zone || !stageLayersRef.current.floor || !worldRef.current) return
    const { floor, walls, props, grid } = stageLayersRef.current

    clearTilemap(floor)
    clearTilemap(walls)
    clearTilemap(props)
    renderTilemap(floor, zone.layers.floor)
    renderTilemap(walls, zone.layers.walls)
    renderTilemap(props, zone.layers.props)
    clearGrid(grid)
    renderGrid(grid, zone.width, zone.height)
    if (zone.exits?.length) {
      renderExits(stageLayersRef.current.exits, zone.exits, (exitData) => {
        onExitClickRef.current?.(exitData)
      })
    }

    // Scale the world to fit the viewport, centered
    scaleWorldToFit(zone)
  }, [zone, ready])

  // Re-scale on window resize
  useEffect(() => {
    if (!ready || !zone) return
    const handleResize = () => scaleWorldToFit(zone)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ready, zone])

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

  // Render tokens — skip if animation is playing (PixiJS moves sprites directly)
  useEffect(() => {
    if (!ready || !tokens?.length || !stageLayersRef.current.tokens) return
    if (isAnimating()) return // don't rebuild sprites mid-walk
    renderTokens(stageLayersRef.current.tokens, tokens)
  }, [tokens, ready])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  )
}
