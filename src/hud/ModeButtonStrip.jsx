import { useState } from 'react'
import './ModeScreen.css'

const MODE_BUTTONS = [
  { id: 'character', img: '/ui/btn-char.png',    label: 'Character Record' },
  { id: 'inventory', img: '/ui/btn-pack.png',    label: 'Inventory' },
  { id: 'journal',   img: '/ui/btn-journal.png', label: 'Journal' },
  { id: 'map',       img: '/ui/btn-map.png',      label: 'Map' },
  { id: 'settings',  img: '/ui/btn-settings.png', label: 'Settings' },
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
            style={{ padding: 0, background: 'none', border: 'none' }}
          >
            <img
              src={btn.img}
              alt={btn.label}
              draggable={false}
              style={{
                width: 40,
                height: 40,
                objectFit: 'contain',
                filter: activeMode === btn.id
                  ? 'brightness(1.3) drop-shadow(0 0 6px rgba(212,175,55,0.6))'
                  : 'none',
                transition: 'filter 0.15s, transform 0.15s',
              }}
            />
          </button>
          {hoveredId === btn.id && (
            <div className="mode-btn-tooltip">{btn.label}</div>
          )}
        </div>
      ))}
    </div>
  )
}
