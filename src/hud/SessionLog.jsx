import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import OrnateFrame from './OrnateFrame'
import { playParchmentRustle } from '../lib/uiSounds'

export default function SessionLog() {
  const [tab, setTab] = useState('chat')
  const sessionLog = useStore(s => s.sessionLog) || []
  const narratorHistory = useStore(s => s.narrator?.history) || []
  const scrollRef = useRef(null)

  const entries = tab === 'log' ? sessionLog : narratorHistory

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      // Only auto-scroll if user is near the bottom (within 60px)
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
      if (nearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [entries.length])

  return (
    <div className="hud-log-panel" style={{ position: 'relative' }}>
      <OrnateFrame size={18} stroke="#c9a84c" weight={2.5} />
      {/* Tabs */}
      <div className="hud-log-tabs">
        <div
          className={`hud-log-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => { playParchmentRustle(); setTab('chat') }}
        >Chat</div>
        <div
          className={`hud-log-tab ${tab === 'log' ? 'active' : ''}`}
          onClick={() => { playParchmentRustle(); setTab('log') }}
        >Log</div>
      </div>
      {/* Entries */}
      <div className="hud-log-entries" ref={scrollRef}>
        {tab === 'log' ? (
          sessionLog.length > 0 ? sessionLog.map((entry, i) => (
            <div key={entry.id || i} className="hud-log-entry">
              <span className="hud-log-time">
                {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>{' '}
              <span className="hud-log-action">{entry.icon} {entry.title}</span>
              {entry.detail && <span className="hud-log-action"> — {entry.detail}</span>}
            </div>
          )) : (
            <div className="hud-log-entry hud-log-empty">No events yet...</div>
          )
        ) : (
          narratorHistory.length > 0 ? narratorHistory.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`hud-log-entry hud-chat-msg ${msg.role === 'dm' ? 'hud-chat-dm' : 'hud-chat-player'}`}
            >
              <span className="hud-chat-speaker">
                {msg.speaker || (msg.role === 'dm' ? 'DM' : 'You')}
              </span>
              <span className="hud-chat-text">{msg.text}</span>
            </div>
          )) : (
            <div className="hud-log-entry hud-log-empty">No messages yet...</div>
          )
        )}
      </div>
    </div>
  )
}
