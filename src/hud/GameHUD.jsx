import BottomBar from './BottomBar'
import ZoneLabel from './ZoneLabel'
import NarratorFloat from './NarratorFloat'
import './hud.css'

export default function GameHUD({ zone, onTool, onChat }) {
  return (
    <div className="hud-v2" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      {/* Zone label — absolutely positioned top-left via CSS */}
      <ZoneLabel zone={zone} />
      {/* Narrator float — absolutely positioned bottom-center via CSS */}
      <NarratorFloat />
      {/* Bottom bar — absolutely positioned bottom via CSS */}
      <BottomBar onTool={onTool} onChat={onChat} />
    </div>
  )
}
