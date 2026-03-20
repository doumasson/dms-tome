import { useState } from 'react'
import OrnateFrame from './OrnateFrame'

const TOOLS = [
  { icon: '🎲', label: 'DICE', key: 'dice' },
  { icon: '📜', label: 'CHAR', key: 'character' },
  { icon: '🎒', label: 'PACK', key: 'inventory' },
  { icon: '📖', label: 'JOURNAL', key: 'journal' },
  { icon: '🏕', label: 'REST', key: 'rest' },
]

export default function ActionArea({ onTool, onChat, areaTheme }) {
  const [input, setInput] = useState('')
  const [showRestPicker, setShowRestPicker] = useState(false)

  const isDungeonTheme = ['dungeon', 'cave', 'crypt', 'sewer'].includes(areaTheme)

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    onChat?.(input.trim())
    setInput('')
  }

  function handleToolClick(key) {
    if (key === 'rest') {
      setShowRestPicker(p => !p)
    } else {
      onTool?.(key)
    }
  }

  return (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
      {/* Tool buttons */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {TOOLS.map(tool => (
          <div key={tool.key} style={{ position: 'relative' }}>
            <button
              className="hud-tool-btn hud-tool-btn-labeled"
              title={tool.label}
              onClick={() => handleToolClick(tool.key)}
            >
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              <span className="hud-tool-label">{tool.label}</span>
              <svg style={{ position: 'absolute', inset: -2, pointerEvents: 'none' }} width="54" height="52" viewBox="0 0 54 52">
                <path d="M0,8 L0,3 Q0,0 3,0 L8,0" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
                <path d="M46,0 L51,0 Q54,0 54,3 L54,8" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
                <path d="M0,44 L0,49 Q0,52 3,52 L8,52" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
                <path d="M46,52 L51,52 Q54,52 54,49 L54,44" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              </svg>
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
      {/* Chat input */}
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'stretch' }}>
        <input
          className="hud-chat-input"
          placeholder="What do you do?"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="button" className="hud-tool-btn" style={{ width: 36 }}>🎤</button>
        <button type="submit" className="hud-send-btn">▶</button>
      </form>
    </div>
  )
}
