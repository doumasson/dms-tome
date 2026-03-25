import { useState } from 'react'
import './ModeScreen.css'

const MODE_BUTTONS = [
  { id: 'character', label: 'CHAR', longLabel: 'Character Record', key: 'C' },
  { id: 'inventory', label: 'INV',  longLabel: 'Inventory',        key: 'I' },
  { id: 'journal',   label: 'LOG',  longLabel: 'Journal',          key: 'J' },
  { id: 'map',       label: 'MAP',  longLabel: 'Map',              key: 'M' },
  { id: 'settings',  label: 'SET',  longLabel: 'Settings',         key: '' },
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
            aria-label={btn.longLabel}
            style={{
              padding: '4px 10px',
              background: activeMode === btn.id ? 'rgba(201,168,76,0.15)' : 'rgba(8,6,12,0.6)',
              border: `1px solid ${activeMode === btn.id ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)'}`,
              borderRadius: 3,
              color: activeMode === btn.id ? '#eedd88' : '#8a7a52',
              fontFamily: "'Cinzel', serif",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              minHeight: 0,
            }}
          >
            {btn.label}
          </button>
          {hoveredId === btn.id && (
            <div className="mode-btn-tooltip">{btn.longLabel}{btn.key ? ` (${btn.key})` : ''}</div>
          )}
        </div>
      ))}
    </div>
  )
}
