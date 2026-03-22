/**
 * ModeScreen — BG2-style full-viewport panel takeover.
 * When a mode screen opens, the game viewport fades and this panel covers it.
 * PLACEHOLDER: Stone/parchment textures will be replaced with real assets.
 */
import './ModeScreen.css'

export default function ModeScreen({ open, onClose, title, children }) {
  if (!open) return null

  return (
    <div className="mode-screen-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mode-screen-panel">
        <div className="mode-screen-header">
          <h2 className="mode-screen-title">{title}</h2>
          <button className="mode-screen-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mode-screen-content">
          {children}
        </div>
      </div>
    </div>
  )
}
