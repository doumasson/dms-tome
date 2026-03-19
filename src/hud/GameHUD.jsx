import BottomBar from './BottomBar'
import ZoneLabel from './ZoneLabel'
import NarratorFloat from './NarratorFloat'
import './hud.css'

export default function GameHUD({ zone, onTool, onChat }) {
  return (
    <div className="hud-v2" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {/* All child elements re-enable pointer events as needed */}
      <div style={{ pointerEvents: 'auto' }}>
        <ZoneLabel zone={zone} />
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <NarratorFloat />
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <BottomBar onTool={onTool} onChat={onChat} />
      </div>
    </div>
  )
}
