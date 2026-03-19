import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import OrnateFrame from './OrnateFrame'

export default function SessionLog() {
  const [tab, setTab] = useState('log')
  const sessionLog = useStore(s => s.sessionLog) || []
  const narratorHistory = useStore(s => s.narrator?.history) || []
  const scrollRef = useRef(null)

  const entries = tab === 'log' ? sessionLog : narratorHistory

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="hud-log-panel" style={{ position: 'relative' }}>
      <OrnateFrame size={18} stroke="#c9a84c" weight={2.5} />
      {/* Tabs */}
      <div className="hud-log-tabs">
        <div
          className={`hud-log-tab ${tab === 'log' ? 'active' : ''}`}
          onClick={() => setTab('log')}
        >Log</div>
        <div
          className={`hud-log-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >Chat</div>
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
            <div className="hud-log-entry" style={{ color: '#4a3a28', fontStyle: 'italic' }}>
              No events yet...
            </div>
          )
        ) : (
          narratorHistory.length > 0 ? narratorHistory.map((msg, i) => (
            <div key={i} className="hud-log-entry">
              <span style={{ color: msg.role === 'dm' ? '#c9a84c' : '#5ab0ee', fontWeight: 700 }}>
                {msg.speaker || (msg.role === 'dm' ? 'DM' : 'You')}:
              </span>{' '}
              <span className="hud-log-action">{msg.text}</span>
            </div>
          )) : (
            <div className="hud-log-entry" style={{ color: '#4a3a28', fontStyle: 'italic' }}>
              No messages yet...
            </div>
          )
        )}
      </div>
    </div>
  )
}
