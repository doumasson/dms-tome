import { useState, useCallback } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoZone from './data/demoZone.json'
import './hud/hud.css'

export default function GameV2() {
  const [zone] = useState(demoZone)

  const handleTileClick = useCallback(({ x, y }) => {
    console.log('Tile clicked:', x, y)
  }, [])

  const handleTool = useCallback((tool) => {
    console.log('Tool:', tool)
  }, [])

  const handleChat = useCallback((text) => {
    console.log('Chat:', text)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp zone={zone} onTileClick={handleTileClick} />
      <GameHUD zone={zone} onTool={handleTool} onChat={handleChat} />
    </div>
  )
}
