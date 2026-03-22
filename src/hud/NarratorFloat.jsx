import useStore from '../store/useStore'
import OrnateFrame from './OrnateFrame'

export default function NarratorFloat() {
  const history = useStore(s => s.narrator?.history) || []

  // Find last DM message
  const lastDm = [...history].reverse().find(m => m.role === 'dm')
  if (!lastDm) return null

  return (
    <div style={{
      position: 'absolute', bottom: 170, left: '50%', transform: 'translateX(-50%)',
      maxWidth: '65%', zIndex: 20,
    }}>
      <div className="hud-narrator stone-panel" style={{ position: 'relative' }}>
        <OrnateFrame size={12} stroke="#c9a84c" weight={1.5} jeweled={false} />
        {/* Side flourishes */}
        <svg style={{ position: 'absolute', left: -18, top: '50%', transform: 'translateY(-50%)' }} width="18" height="50" viewBox="0 0 18 50">
          <path d="M16,0 Q6,8 14,16 Q4,25 14,34 Q6,42 16,50" fill="none" stroke="#c9a84c" strokeWidth="1.8" opacity="0.45"/>
          <circle cx="14" cy="25" r="3" fill="#c9a84c" opacity="0.35"/>
          <circle cx="14" cy="25" r="1.2" fill="#08060c"/>
        </svg>
        <svg style={{ position: 'absolute', right: -18, top: '50%', transform: 'translateY(-50%) scaleX(-1)' }} width="18" height="50" viewBox="0 0 18 50">
          <path d="M16,0 Q6,8 14,16 Q4,25 14,34 Q6,42 16,50" fill="none" stroke="#c9a84c" strokeWidth="1.8" opacity="0.45"/>
          <circle cx="14" cy="25" r="3" fill="#c9a84c" opacity="0.35"/>
          <circle cx="14" cy="25" r="1.2" fill="#08060c"/>
        </svg>
        <div className="hud-narrator-text">
          {lastDm.speaker && <span className="hud-narrator-name">{lastDm.speaker}: </span>}
          {lastDm.text}
        </div>
      </div>
    </div>
  )
}
