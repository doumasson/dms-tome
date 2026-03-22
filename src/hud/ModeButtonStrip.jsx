import { useState } from 'react'
import './ModeScreen.css'

const MODE_BUTTONS = [
  { id: 'character', icon: '\u2694', label: 'Character Record' },
  { id: 'inventory', icon: '\uD83C\uDF92', label: 'Inventory' },
  { id: 'journal',   icon: '\uD83D\uDCDC', label: 'Journal' },
  { id: 'map',       icon: '\uD83D\uDDFA', label: 'Map' },
  { id: 'settings',  icon: '\u2699', label: 'Settings' },
]

export default function ModeButtonStrip({ activeMode, onModeSelect }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="mode-button-strip" style={{ pointerEvents: 'all' }}>
      {MODE_BUTTONS.map(btn => (
        <div key={btn.id} style={{ position: 'relative' }}>
          <button
            className={`mode-btn${activeMode === btn.id ? ' active' : ''}`}
            onClick={() => onModeSelect(btn.id)}
            onMouseEnter={() => setHoveredId(btn.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-label={btn.label}
          >
            {btn.icon}
          </button>
          {hoveredId === btn.id && (
            <div className="mode-btn-tooltip">{btn.label}</div>
          )}
        </div>
      ))}
    </div>
  )
}
