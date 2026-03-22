import { useState } from 'react'
import useStore from '../store/useStore'
import { playStoneClick } from '../lib/uiSounds'

const TOOLS = [
  { img: '/ui/btn-dice.png', label: 'DICE', key: 'dice' },
  { img: '/ui/btn-char.png', label: 'CHAR', key: 'character' },
  { img: '/ui/btn-pack.png', label: 'PACK', key: 'inventory' },
  { img: '/ui/btn-journal.png', label: 'JOURNAL', key: 'journal' },
  { img: '/ui/btn-rest.png', label: 'REST', key: 'rest' },
]

export default function ActionArea({ onTool, onChat, areaTheme }) {
  const [input, setInput] = useState('')
  const [showRestPicker, setShowRestPicker] = useState(false)
  const narratorMessages = useStore(s => s.narratorMessages)

  const isDungeonTheme = ['dungeon', 'cave', 'crypt', 'sewer'].includes(areaTheme)

  // Show contextual placeholder — full prompt when DM recently asked something
  const lastDmMsg = narratorMessages?.slice(-3).find(m => m.role === 'dm')
  const hasRecentDmPrompt = lastDmMsg && (
    lastDmMsg.text?.includes('?') || lastDmMsg.text?.toLowerCase().includes('what do you')
  )
  const placeholder = hasRecentDmPrompt ? 'What do you do?' : 'Chat...'

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    onChat?.(input.trim())
    setInput('')
  }

  function handleToolClick(key) {
    playStoneClick()
    if (key === 'rest') {
      setShowRestPicker(p => !p)
    } else {
      onTool?.(key)
    }
  }

  return (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
      {/* Tool buttons — image asset buttons */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
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
      {/* Chat input */}
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'stretch' }}>
        <input
          className="hud-chat-input"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="button" className="hud-tool-btn" style={{ width: 36 }}>🎤</button>
        <button type="submit" className="hud-send-btn">▶</button>
      </form>
    </div>
  )
}
