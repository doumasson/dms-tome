import { useState } from 'react'
import BottomBar from './BottomBar'
// NarratorFloat removed — narration is in the chat log
import InitiativeStrip from './InitiativeStrip'
import EnemyInfoPanel from './EnemyInfoPanel'
import Minimap from './Minimap'
import SoundControl from './SoundControl'
import useStore from '../store/useStore'
import { getTimeOfDay, formatTime } from '../lib/gameTime'
import { playParchmentRustle } from '../lib/uiSounds'
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
  const gameTime = useStore(s => s.gameTime)
  const [copied, setCopied] = useState(false)
  const [logTab, setLogTab] = useState('chat')

  const title = campaign?.title || activeCampaign?.name || 'Untitled Campaign'
  const inviteCode = activeCampaign?.invite_code
  const playerCount = (partyMembers?.length || 0) + 1

  // Zone info for top bar
  const zoneName = zone?.name || title
  const npcCount = zone?.npcs?.length || 0
  const zoneTags = zone?.tags || []
  const isSafe = zoneTags.includes('safe')

  // Time of day for center display
  const currentHour = gameTime?.hour ?? 8
  const timeOfDay = getTimeOfDay(currentHour)
  const timeText = formatTime(gameTime || { hour: 8, day: 1 })
  const isNight = currentHour >= 18 || currentHour < 6
  const periodProgress = isNight
    ? (currentHour >= 18 ? (currentHour - 18) / 12 : (currentHour + 6) / 12)
    : (currentHour - 6) / 12

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
        {/* LEFT: zone name, danger level, NPC count */}
        <div className="hud-top-bar-left">
          <span className="hud-zone-name-inline">{zoneName}</span>
          <span className="hud-zone-info-inline">
            {isSafe ? 'SAFE' : 'DANGER'} · {npcCount} NPC{npcCount !== 1 ? 's' : ''}
          </span>
        </div>
        {/* CENTER: clock-style progress bar */}
        <div className="hud-top-bar-center">
          <div className="hud-time-bar-track">
            <div
              className={`hud-time-bar-fill ${isNight ? 'hud-time-night' : 'hud-time-day'}`}
              style={{ width: `${periodProgress * 100}%` }}
            />
            <span className="hud-time-text">{timeText}</span>
          </div>
        </div>
        {/* Chat/Log tab strip — positioned in top bar */}
        <div
          className="hud-log-tab-strip hud-top-bar-tabs"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const half = rect.width / 2
            playParchmentRustle()
            setLogTab(clickX < half ? 'chat' : 'log')
          }}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
        >
          <img
            src={logTab === 'chat' ? '/ui/log-tab1.png' : '/ui/log-tab2.png'}
            alt={logTab === 'chat' ? 'Chat active' : 'Log active'}
            draggable={false}
            className="hud-log-tab-strip-img"
          />
        </div>
        {/* RIGHT: invite, leave, then icon buttons + sound */}
        <div className="hud-top-bar-right">
          <button className="hud-top-bar-btn" onClick={handleCopyInvite} title="Copy invite link">
            {copied ? 'COPIED' : 'INVITE'}
          </button>
          <button className="hud-top-bar-btn hud-top-bar-btn-danger" onClick={onLeave} title="Leave campaign">
            LEAVE
          </button>
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
      {/* Turn banner (combat only) — zone info is now in top bar */}
      {inCombat && (
        <>
          <div className="hud-turn-banner">
            <div className="hud-turn-title">{isMyTurn ? 'Your Turn' : `${activeCombatant?.name || '...'}'s Turn`}</div>
            <div className="hud-turn-sub">{activeCombatant?.name} · {activeCombatant?.class || 'Enemy'}</div>
          </div>
          <InitiativeStrip />
          <EnemyInfoPanel />
        </>
      )}
      <BottomBar areaTheme={areaTheme} onTool={onTool} onChat={onChat} onEndTurn={onEndTurn} onAction={onAction} onPortraitClick={onPortraitClick} logTab={logTab} setLogTab={setLogTab} />
    </div>
  )
}
