import { useState } from 'react'
import BottomBar from './BottomBar'
import ZoneLabel from './ZoneLabel'
import NarratorFloat from './NarratorFloat'
import InitiativeStrip from './InitiativeStrip'
import EnemyInfoPanel from './EnemyInfoPanel'
import Minimap from './Minimap'
import SoundControl from './SoundControl'
import useStore from '../store/useStore'
import './hud.css'

export default function GameHUD({ zone, areaTheme, onTool, onChat, onEndTurn, onAction, onSettings, onLeave, playerPos, tokens, cameraRef, onPortraitClick, activeMode, onModeSelect }) {
  const inCombat = useStore(s => s.encounter.phase === 'combat')
  const encounter = useStore(s => s.encounter)
  const myCharacter = useStore(s => s.myCharacter)
  const quests = useStore(s => s.quests) || []
  const activeQuestCount = quests.filter(q => q.status === 'active').length
  const campaign = useStore(s => s.campaign)
  const activeCampaign = useStore(s => s.activeCampaign)
  const partyMembers = useStore(s => s.partyMembers)
  const [copied, setCopied] = useState(false)

  const title = campaign?.title || activeCampaign?.name || 'Untitled Campaign'
  const inviteCode = activeCampaign?.invite_code
  const playerCount = (partyMembers?.length || 0) + 1

  function handleCopyInvite() {
    if (!inviteCode) return
    const url = `${window.location.origin}?invite=${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const activeCombatant = inCombat ? encounter.combatants?.[encounter.currentTurn] : null
  const isMyTurn = activeCombatant && myCharacter && (
    activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
  )

  return (
    <div className="hud-v2" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      {/* === TOP BAR — full width, bar-top.png as background === */}
      <div className="hud-top-bar">
        {/* LEFT: campaign name, player count, invite */}
        <div className="hud-top-bar-left">
          <span className="hud-campaign-name">{title}</span>
          <span className="hud-campaign-players">
            {playerCount} {playerCount === 1 ? 'Adventurer' : 'Adventurers'}
          </span>
          <button className="hud-top-bar-btn" onClick={handleCopyInvite} title="Copy invite link">
            {copied ? 'COPIED' : 'INVITE'}
          </button>
          <button className="hud-top-bar-btn hud-top-bar-btn-danger" onClick={onLeave} title="Leave campaign">
            LEAVE
          </button>
        </div>
        {/* RIGHT: map, settings, group icon buttons + sound */}
        <div className="hud-top-bar-right">
          <SoundControl />
          <button className="hud-top-bar-icon-btn" onClick={() => onModeSelect('map')} title="Map">
            <img src="/ui/btn-map.png" alt="Map" draggable={false} />
          </button>
          <button className="hud-top-bar-icon-btn" onClick={onSettings} title="Settings">
            <img src="/ui/btn-settings.png" alt="Settings" draggable={false} />
          </button>
          <button className="hud-top-bar-icon-btn" onClick={() => onModeSelect('character')} title="Party">
            <img src="/ui/btn-group.png" alt="Party" draggable={false} />
          </button>
        </div>
      </div>
      {/* Minimap — below top bar, top-right */}
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
              {activeQuestCount}
            </div>
          )}
        </div>
      )}
      <NarratorFloat />
      <BottomBar areaTheme={areaTheme} onTool={onTool} onChat={onChat} onEndTurn={onEndTurn} onAction={onAction} onPortraitClick={onPortraitClick} />
    </div>
  )
}
