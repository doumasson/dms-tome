import { useState } from 'react'
import OrnateFrame from './OrnateFrame'

const TOOLS = [
  { icon: '🎲', title: 'Dice', key: 'dice' },
  { icon: '📜', title: 'Character', key: 'character' },
  { icon: '🎒', title: 'Inventory', key: 'inventory' },
  { icon: '🏕', title: 'Rest', key: 'rest' },
  { icon: '⚙', title: 'Settings', key: 'settings' },
]

export default function ActionArea({ onTool, onChat }) {
  const [input, setInput] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    onChat?.(input.trim())
    setInput('')
  }

  return (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
      {/* Tool buttons */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {TOOLS.map(tool => (
          <button
            key={tool.key}
            className="hud-tool-btn"
            title={tool.title}
            onClick={() => onTool?.(tool.key)}
          >
            {tool.icon}
            <svg style={{ position: 'absolute', inset: -2, pointerEvents: 'none' }} width="44" height="42" viewBox="0 0 44 42">
              <path d="M0,8 L0,3 Q0,0 3,0 L8,0" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M36,0 L41,0 Q44,0 44,3 L44,8" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M0,34 L0,39 Q0,42 3,42 L8,42" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M36,42 L41,42 Q44,42 44,39 L44,34" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
            </svg>
          </button>
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
