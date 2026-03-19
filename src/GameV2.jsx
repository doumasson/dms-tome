import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useStore from './store/useStore'
import PixiApp from './engine/PixiApp'
import GameHUD from './hud/GameHUD'
import demoWorld from './data/demoWorld.json'
import { buildWorldFromAiOutput } from './lib/campaignGenerator'
import { broadcastZoneTransition } from './lib/liveChannel'
import { findPath, buildWalkabilityGrid } from './lib/pathfinding'
import { getBlockingSet } from './engine/tileAtlas'
import { animateTokenAlongPath, isAnimating } from './engine/TokenLayer'
import { getReachableTiles, renderMovementRange, clearMovementRange } from './engine/MovementRange'
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
  const encounter = useStore(s => s.encounter)
  const nextEncounterTurn = useStore(s => s.nextEncounterTurn)
  const inCombat = encounter.phase === 'combat'

  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 })
  const [transitioning, setTransitioning] = useState(false)
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [restProposal, setRestProposal] = useState(null)
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos

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
  const walkGridRef = useRef(walkGrid)
  walkGridRef.current = walkGrid

  // Build token list — uses playerPos so tokens update as player walks
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

  // Click-to-move: pathfind and animate walk
  // Only update React state at the END — PixiJS handles the visual walk directly
  const handleTileClick = useCallback(({ x, y }) => {
    if (isAnimating()) return
    const grid = walkGridRef.current
    const pos = playerPosRef.current
    if (!grid || !grid[y]?.[x]) return
    const path = findPath(grid, pos, { x, y })
    if (path && path.length > 1) {
      // Update ref immediately so WASD knows the target position
      playerPosRef.current = { x, y }
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x, y })
      })
    }
  }, [])

  // WASD keyboard movement — one tile at a time
  useEffect(() => {
    const dirs = {
      w: { x: 0, y: -1 }, W: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 },
      s: { x: 0, y: 1 },  S: { x: 0, y: 1 },  ArrowDown: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, A: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 },
      d: { x: 1, y: 0 },  D: { x: 1, y: 0 },  ArrowRight: { x: 1, y: 0 },
    }

    function handleKeyDown(e) {
      // Don't move if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const dir = dirs[e.key]
      if (!dir) return
      e.preventDefault()

      if (isAnimating()) return
      const grid = walkGridRef.current
      const pos = playerPosRef.current
      const nx = pos.x + dir.x
      const ny = pos.y + dir.y
      if (!grid || ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0]?.length) return
      if (!grid[ny][nx]) return

      // Animate one tile step
      playerPosRef.current = { x: nx, y: ny }
      const path = [pos, { x: nx, y: ny }]
      animateTokenAlongPath('player', path, null, () => {
        setPlayerPos({ x: nx, y: ny })
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Zone transition via exit click
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

  const handleEndTurn = useCallback(() => {
    nextEncounterTurn()
  }, [nextEncounterTurn])

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
      <PixiApp zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleExitClick} inCombat={inCombat} />
      <GameHUD zone={zone} onTool={handleTool} onChat={handleChat} onEndTurn={handleEndTurn} />
      {/* Debug: start test combat */}
      {!inCombat && (
        <button
          onClick={() => {
            const { startEncounter } = useStore.getState()
            startEncounter([
              { name: 'Goblin', hp: 15, maxHp: 15, ac: 15, isEnemy: true, type: 'enemy',
                attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
                position: { x: 6, y: 4 }, speed: 30 },
              { name: 'Goblin Archer', hp: 12, maxHp: 12, ac: 13, isEnemy: true, type: 'enemy',
                attacks: [{ name: 'Shortbow', bonus: '+4', damage: '1d6+2' }],
                position: { x: 8, y: 3 }, speed: 30 },
            ])
          }}
          style={{
            position: 'fixed', top: 50, right: 10, zIndex: 100,
            background: '#cc3333', color: '#fff', border: 'none',
            padding: '8px 16px', cursor: 'pointer', fontFamily: "'Cinzel', serif",
            fontSize: 11, letterSpacing: 1, fontWeight: 700,
          }}
        >
          ⚔ TEST COMBAT
        </button>
      )}
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
