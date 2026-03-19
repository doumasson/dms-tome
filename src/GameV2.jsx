import { useState, useCallback, useMemo, useEffect } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoWorld from './data/demoWorld.json'
import { buildWorldFromAiOutput } from './lib/campaignGenerator'
import { broadcastZoneTransition } from './lib/liveChannel'
import { findPath, buildWalkabilityGrid } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import DiceTray from './components/DiceTray'
import CharacterSheetModal from './components/characterSheet/CharacterSheetModal'
import RestModal from './components/RestModal'
import './hud/hud.css'

export default function GameV2() {
  const currentZoneId = useStore(s => s.currentZoneId)
  const zones = useStore(s => s.campaign.zones)
  const loadZoneWorld = useStore(s => s.loadZoneWorld)
  const setCurrentZone = useStore(s => s.setCurrentZone)
  const myCharacter = useStore(s => s.myCharacter)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const user = useStore(s => s.user)

  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [transitioning, setTransitioning] = useState(false)
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [restProposal, setRestProposal] = useState(null)

  // Load demo world on mount if no zones exist
  useEffect(() => {
    if (!zones) {
      const world = buildWorldFromAiOutput(demoWorld)
      loadZoneWorld(world)
    }
  }, [])

  const zone = zones?.[currentZoneId] || null

  // Build walkability grid from zone data
  const walkGrid = useMemo(() => {
    if (!zone?.layers) return null
    return buildWalkabilityGrid(zone.layers.walls, zone.layers.props, getBlockingSet(), zone.width, zone.height)
  }, [zone])

  // Build token list
  const tokens = useMemo(() => {
    if (!zone) return []
    const t = []
    t.push({
      id: 'player',
      name: myCharacter?.name || 'Hero',
      x: playerPos.x,
      y: playerPos.y,
      color: 0x0c1828,
      borderColor: 0x4499dd,
      isNpc: false,
    })
    if (zone.npcs) {
      zone.npcs.forEach(npc => {
        if (!npc.position) return
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
  }, [playerPos, zone, myCharacter])

  const handleTileClick = useCallback(({ x, y }) => {
    if (!walkGrid || !walkGrid[y]?.[x]) return
    const path = findPath(walkGrid, playerPos, { x, y })
    if (path && path.length > 1) {
      setPlayerPos({ x, y })
    }
  }, [walkGrid, playerPos])

  const handleExitClick = useCallback(({ targetZone, entryPoint }) => {
    if (transitioning || !zones?.[targetZone]) return
    setTransitioning(true)
    broadcastZoneTransition(targetZone, entryPoint)
    setCurrentZone(targetZone)
    setPlayerPos(entryPoint || { x: 5, y: 5 })
    setTimeout(() => setTransitioning(false), 700)
  }, [transitioning, zones, setCurrentZone])

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

  if (!zone) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#08060c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: 18 }}>
        Loading world...
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08060c' }}>
      <PixiApp zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleExitClick} />
      <GameHUD zone={zone} onTool={handleTool} onChat={handleChat} />
      <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      {sheetChar && (
        <CharacterSheetModal character={sheetChar} onClose={() => setSheetChar(null)} />
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
