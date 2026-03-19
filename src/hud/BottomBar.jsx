import useStore from '../store/useStore'
import PartyPortraits from './PartyPortraits'
import SessionLog from './SessionLog'
import ActionArea from './ActionArea'
import CombatActionBar from './CombatActionBar'
import OrnateDivider from './OrnateDivider'
import FiligreeBar from './FiligreeBar'

export default function BottomBar({ onTool, onChat, onEndTurn }) {
  const inCombat = useStore(s => s.encounter.phase === 'combat')

  return (
    <div className="hud-bottom-bar">
      <FiligreeBar color={inCombat ? '#cc3333' : '#c9a84c'} />
      <PartyPortraits />
      <OrnateDivider color={inCombat ? '#cc3333' : '#c9a84c'} />
      <SessionLog />
      <OrnateDivider color={inCombat ? '#cc3333' : '#c9a84c'} />
      {inCombat ? (
        <CombatActionBar onEndTurn={onEndTurn} />
      ) : (
        <ActionArea onTool={onTool} onChat={onChat} />
      )}
      {/* Bottom ornament */}
      <svg style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} width="280" height="10" viewBox="0 0 280 10">
        <path d="M0,5 L90,5 Q105,0 118,5 L162,5 Q175,10 190,5 L280,5" fill="none" stroke={inCombat ? '#cc3333' : '#c9a84c'} strokeWidth="1.2" opacity="0.2"/>
        <circle cx="140" cy="5" r="3.5" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.2"/><circle cx="140" cy="5" r="1.5" fill="#08060c"/>
        <polygon points="108,5 112,2 116,5 112,8" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.15"/>
        <polygon points="164,5 168,2 172,5 168,8" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.15"/>
      </svg>
    </div>
  )
}
