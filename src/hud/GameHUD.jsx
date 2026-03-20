import BottomBar from './BottomBar'
import ZoneLabel from './ZoneLabel'
import NarratorFloat from './NarratorFloat'
import InitiativeStrip from './InitiativeStrip'
import EnemyInfoPanel from './EnemyInfoPanel'
import CampaignBar from './CampaignBar'
import Minimap from './Minimap'
import SoundControl from './SoundControl'
import useStore from '../store/useStore'
import './hud.css'

export default function GameHUD({ zone, areaTheme, onTool, onChat, onEndTurn, onAction, onSettings, onLeave, playerPos, tokens, cameraRef }) {
  const inCombat = useStore(s => s.encounter.phase === 'combat')
  const encounter = useStore(s => s.encounter)
  const myCharacter = useStore(s => s.myCharacter)
  const quests = useStore(s => s.quests) || []
  const activeQuestCount = quests.filter(q => q.status === 'active').length

  const activeCombatant = inCombat ? encounter.combatants?.[encounter.currentTurn] : null
  const isMyTurn = activeCombatant && myCharacter && (
    activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
  )

  return (
    <div className="hud-v2" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      {/* Campaign bar (top-right) — always visible */}
      <CampaignBar onSettings={onSettings} onLeave={onLeave} />
      {/* Sound mute toggle — top-right near campaign bar */}
      <div style={{ position: 'absolute', top: 8, right: 220, pointerEvents: 'all' }}>
        <SoundControl />
      </div>
      {/* Minimap — below campaign bar, top-right */}
      <Minimap playerPos={playerPos} tokens={tokens} cameraRef={cameraRef} />
      {/* Zone label (exploration) or Turn banner (combat) */}
      {inCombat ? (
        <>
          <div className="hud-turn-banner">
            <div className="hud-turn-title">{isMyTurn ? 'Your Turn' : `${activeCombatant?.name || '...'}'s Turn`}</div>
            <div className="hud-turn-sub">{activeCombatant?.name} · {activeCombatant?.class || 'Enemy'}</div>
          </div>
          <InitiativeStrip />
          <EnemyInfoPanel />
        </>
      ) : (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <ZoneLabel zone={zone} />
          {activeQuestCount > 0 && (
            <div style={{
              position: 'absolute', top: 6, right: -52,
              color: '#c9a84c', fontSize: 11,
              fontFamily: "'Cinzel', serif", fontWeight: 700,
              pointerEvents: 'none',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              📜 {activeQuestCount}
            </div>
          )}
        </div>
      )}
      <NarratorFloat />
      <BottomBar areaTheme={areaTheme} onTool={onTool} onChat={onChat} onEndTurn={onEndTurn} onAction={onAction} />
    </div>
  )
}
