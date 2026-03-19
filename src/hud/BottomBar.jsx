import PartyPortraits from './PartyPortraits'
import SessionLog from './SessionLog'
import ActionArea from './ActionArea'
import OrnateDivider from './OrnateDivider'
import FiligreeBar from './FiligreeBar'

export default function BottomBar({ onTool, onChat }) {
  return (
    <div className="hud-bottom-bar">
      {/* Top filigree border */}
      <FiligreeBar />

      {/* Left: Party portraits */}
      <PartyPortraits />

      {/* Divider */}
      <OrnateDivider />

      {/* Center: Session log */}
      <SessionLog />

      {/* Divider */}
      <OrnateDivider />

      {/* Right: Action area */}
      <ActionArea onTool={onTool} onChat={onChat} />

      {/* Bottom edge ornament */}
      <svg style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} width="280" height="10" viewBox="0 0 280 10">
        <path d="M0,5 L90,5 Q105,0 118,5 L162,5 Q175,10 190,5 L280,5" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.2"/>
        <circle cx="140" cy="5" r="3.5" fill="#c9a84c" opacity="0.2"/><circle cx="140" cy="5" r="1.5" fill="#08060c"/>
        <polygon points="108,5 112,2 116,5 112,8" fill="#c9a84c" opacity="0.15"/>
        <polygon points="164,5 168,2 172,5 168,8" fill="#c9a84c" opacity="0.15"/>
      </svg>
    </div>
  )
}
