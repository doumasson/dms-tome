import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { loadTileAtlas } from './tileAtlas'
import { renderTilemap, clearTilemap } from './TilemapRenderer'
import { renderGrid, clearGrid } from './GridOverlay'
import { renderTokens } from './TokenLayer'

export default function PixiApp({ zone, tokens, onTileClick }) {
  const containerRef = useRef(null)
  const appRef = useRef(null)
  const stageLayersRef = useRef({})
  const onTileClickRef = useRef(onTileClick)
  onTileClickRef.current = onTileClick

  useEffect(() => {
    const app = new PIXI.Application()
    appRef.current = app

    const init = async () => {
      await app.init({
        resizeTo: containerRef.current,
        background: 0x08060c,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      containerRef.current.appendChild(app.canvas)

      const layers = {
        floor: new PIXI.Container(),
        walls: new PIXI.Container(),
        props: new PIXI.Container(),
        grid: new PIXI.Container(),
        tokens: new PIXI.Container(),
        exits: new PIXI.Container(),
      }
      Object.values(layers).forEach(l => app.stage.addChild(l))
      stageLayersRef.current = layers

      await loadTileAtlas()

      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      app.stage.on('pointerdown', (e) => {
        if (!onTileClickRef.current) return
        const pos = e.global
        const tileSize = 32
        const tx = Math.floor(pos.x / tileSize)
        const ty = Math.floor(pos.y / tileSize)
        onTileClickRef.current({ x: tx, y: ty })
      })
    }

    init()

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!zone || !stageLayersRef.current.floor) return
    const { floor, walls, props, grid } = stageLayersRef.current
    clearTilemap(floor)
    clearTilemap(walls)
    clearTilemap(props)
    renderTilemap(floor, zone.layers.floor)
    renderTilemap(walls, zone.layers.walls)
    renderTilemap(props, zone.layers.props)
    clearGrid(grid)
    renderGrid(grid, zone.width, zone.height)
  }, [zone])

  useEffect(() => {
    if (!tokens?.length || !stageLayersRef.current.tokens) return
    renderTokens(stageLayersRef.current.tokens, tokens)
  }, [tokens])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, bottom: 134 }}
    />
  )
}
