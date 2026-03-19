import { useState, useCallback, useMemo } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoZone from './data/demoZone.json'
import { findPath, buildWalkabilityGrid } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import './hud/hud.css'

export default function GameV2() {
  const [zone] = useState(demoZone)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })

  // Build walkability grid from zone data
  const walkGrid = useMemo(() => {
    if (!zone) return null
    return buildWalkabilityGrid(zone.layers.walls, zone.layers.props, getBlockingSet(), zone.width, zone.height)
  }, [zone])

  // Build token list from zone NPCs + player position
  const tokens = useMemo(() => {
    const t = []
    // Player token
    t.push({
      id: 'player',
      name: 'Hero',
      x: playerPos.x,
      y: playerPos.y,
      color: 0x0c1828,
      borderColor: 0x4499dd,
      isNpc: false,
    })
    // NPC tokens from zone data
    if (zone?.npcs) {
      zone.npcs.forEach(npc => {
        t.push({
          id: npc.name,
          name: npc.name,
          x: npc.position.x,
          y: npc.position.y,
          color: 0x1a1208,
          borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
          isNpc: true,
          questRelevant: npc.questRelevant,
        })
      })
    }
    return t
  }, [playerPos, zone])

  const handleTileClick = useCallback(({ x, y }) => {
    if (!walkGrid || !walkGrid[y]?.[x]) return // can't walk there
    const path = findPath(walkGrid, playerPos, { x, y })
    if (path && path.length > 1) {
      // For now, just teleport to destination. Animation comes later.
      setPlayerPos({ x, y })
    }
  }, [walkGrid, playerPos])

  const handleTool = useCallback((tool) => {
    console.log('Tool:', tool)
  }, [])

  const handleChat = useCallback((text) => {
    console.log('Chat:', text)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp zone={zone} tokens={tokens} onTileClick={handleTileClick} />
      <GameHUD zone={zone} onTool={handleTool} onChat={handleChat} />
    </div>
  )
}
