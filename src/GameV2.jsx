import { useState, useCallback, useMemo } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoZone from './data/demoZone.json'
import { findPath, buildWalkabilityGrid } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import DiceTray from './components/DiceTray'
import CharacterSheetModal from './components/characterSheet/CharacterSheetModal'
import RestModal from './components/RestModal'
import './hud/hud.css'

export default function GameV2() {
  const [zone] = useState(demoZone)
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [restProposal, setRestProposal] = useState(null)
  const myCharacter = useStore(s => s.myCharacter)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const user = useStore(s => s.user)

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
    if (tool === 'dice') setToolPanel('dice')
    else if (tool === 'character' || tool === 'inventory') setSheetChar(myCharacter)
    else if (tool === 'rest') setRestProposal({ type: 'short', proposedBy: myCharacter?.name || 'Someone' })
    else if (tool === 'settings') console.log('Settings not yet wired in V2')
  }, [myCharacter])

  const handleChat = useCallback((text) => {
    if (!text.trim()) return
    addNarratorMessage({
      role: 'player',
      speaker: myCharacter?.name || user?.email || 'Player',
      text: text.trim(),
    })
  }, [addNarratorMessage, myCharacter, user])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp zone={zone} tokens={tokens} onTileClick={handleTileClick} />
      <GameHUD zone={zone} onTool={handleTool} onChat={handleChat} />
      {/* V1 modals reused in V2 */}
      <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      {sheetChar && (
        <CharacterSheetModal
          character={sheetChar}
          onClose={() => setSheetChar(null)}
        />
      )}
      {restProposal && (
        <RestModal
          type={restProposal.type}
          proposedBy={restProposal.proposedBy}
          partyMembers={[{ id: user?.id, name: myCharacter?.name || 'You' }]}
          isHost={false}
          onResolve={() => setRestProposal(null)}
          onCancel={() => setRestProposal(null)}
        />
      )}
    </div>
  )
}
