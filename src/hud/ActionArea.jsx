import { useState } from 'react'
import { playStoneClick } from '../lib/uiSounds'

const TOOLS = [
  { label: 'DICE', key: 'dice', icon: '\u{1F3B2}' },
  { label: 'CHAR', key: 'character', icon: 'C' },
  { label: 'PACK', key: 'inventory', icon: 'I' },
  { label: 'CAST', key: 'cast', icon: '\u2728' },
  { label: 'JOURNAL', key: 'journal', icon: 'J' },
  { label: 'REST', key: 'rest', icon: 'R' },
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {TOOLS.slice(0, 3).map(tool => (
            <div key={tool.key} style={{ position: 'relative' }}>
              <button
                className="hud-tool-btn-text"
                title={tool.label}
                onClick={() => handleToolClick(tool.key)}
              >
                {tool.label}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {TOOLS.slice(3).map(tool => (
            <div key={tool.key} style={{ position: 'relative' }}>
              <button
                className="hud-tool-btn-text"
                title={tool.label}
                onClick={() => handleToolClick(tool.key)}
              >
                {tool.label}
              </button>
              {tool.key === 'rest' && showRestPicker && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                  background: 'rgba(8,6,12,0.95)', border: '1px solid rgba(201,168,76,0.3)',
                  borderRadius: 4, padding: 4,
                  display: 'flex', flexDirection: 'column', gap: 3, minWidth: 120, zIndex: 50,
                  backdropFilter: 'blur(8px)',
                }}>
                  <button
                    onClick={() => { onTool?.('short-rest'); setShowRestPicker(false) }}
                    style={{
                      padding: '4px 8px', background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#c8b8a0', borderRadius: 3, cursor: 'pointer', fontSize: 10,
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    Short Rest (1hr)
                  </button>
                  <button
                    onClick={() => { onTool?.('long-rest'); setShowRestPicker(false) }}
                    disabled={isDungeonTheme}
                    title={isDungeonTheme ? 'Cannot long rest here — find a safe location' : ''}
                    style={{
                      padding: '4px 8px', background: isDungeonTheme ? 'rgba(0,0,0,0.3)' : 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: isDungeonTheme ? '#555' : '#c8b8a0',
                      borderRadius: 3, cursor: isDungeonTheme ? 'not-allowed' : 'pointer', fontSize: 10,
                      fontFamily: "'Cinzel', serif",
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
    </div>
  )
}
