import { useState } from 'react'
import { playStoneClick } from '../lib/uiSounds'

const TOOLS = [
  { img: '/ui/btn-dice.png', label: 'DICE', key: 'dice' },
  { img: '/ui/btn-char.png', label: 'CHAR', key: 'character' },
  { img: '/ui/btn-pack.png', label: 'PACK', key: 'inventory' },
  { img: '/ui/btn-journal.png', label: 'JOURNAL', key: 'journal' },
  { img: '/ui/btn-rest.png', label: 'REST', key: 'rest' },
]

export default function ActionArea({ onTool, areaTheme }) {
  const [showRestPicker, setShowRestPicker] = useState(false)

  const isDungeonTheme = ['dungeon', 'cave', 'crypt', 'sewer'].includes(areaTheme)

  function handleToolClick(key) {
    playStoneClick()
    if (key === 'rest') {
      setShowRestPicker(p => !p)
    } else {
      onTool?.(key)
    }
  }

  return (
    <div className="hud-action-area">
      {/* Tool buttons — 2-column grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, justifyItems: 'center' }}>
        {TOOLS.map(tool => (
          <div key={tool.key} style={{ position: 'relative' }}>
            <button
              className="asset-btn"
              title={tool.label}
              onClick={() => handleToolClick(tool.key)}
            >
              <img src={tool.img} alt={tool.label} draggable={false} />
            </button>
            {/* Rest picker popover — only for the REST button */}
            {tool.key === 'rest' && showRestPicker && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                background: '#0e0b14', border: '1px solid #d4af37', borderRadius: 6, padding: 6,
                display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140, zIndex: 50,
              }}>
                <button
                  onClick={() => { onTool?.('short-rest'); setShowRestPicker(false) }}
                  style={{
                    padding: '6px 10px', background: '#1a1520', border: '1px solid #333',
                    color: '#c8b8a0', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                  }}
                >
                  Short Rest (1hr)
                </button>
                <button
                  onClick={() => { onTool?.('long-rest'); setShowRestPicker(false) }}
                  disabled={isDungeonTheme}
                  title={isDungeonTheme ? 'Cannot long rest here — find a safe location' : ''}
                  style={{
                    padding: '6px 10px', background: isDungeonTheme ? '#111' : '#1a1520',
                    border: '1px solid #333', color: isDungeonTheme ? '#555' : '#c8b8a0',
                    borderRadius: 4, cursor: isDungeonTheme ? 'not-allowed' : 'pointer', fontSize: 11,
                  }}
                >
                  Long Rest (8hr)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
