import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import { playParchmentRustle } from '../lib/uiSounds'


/** Map log entry type/icon to a CSS color class */
function getLogColorClass(entry) {
  const t = (entry.type || '').toLowerCase()
  const title = (entry.title || '').toLowerCase()
  const icon = entry.icon || ''
  if (t === 'damage' || title.includes('damage') || icon === '💥') return 'log-damage'
  if (t === 'heal' || title.includes('heal') || icon === '💚') return 'log-heal'
  if (t === 'hit' || t === 'crit' || title.includes('critical')) return 'log-hit'
  if (t === 'miss' || title.includes('miss')) return 'log-miss'
  if (t === 'spell' || title.includes('cast') || icon === '✨') return 'log-spell'
  if (t === 'save' || title.includes('save') || title.includes('saving throw')) return 'log-save'
  return ''
}

export default function SessionLog({ onChat, tab, setTab }) {
  const [chatInput, setChatInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const sessionLog = useStore(s => s.sessionLog) || []
  const narratorHistory = useStore(s => s.narrator?.history) || []
  const inCombat = useStore(s => s.encounter.phase === 'combat')
  const scrollRef = useRef(null)
  const chatInputRef = useRef(null)

  const entries = tab === 'log' ? sessionLog : narratorHistory

  // Auto-scroll to bottom on new messages
  const userScrolledRef = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
      userScrolledRef.current = !nearBottom
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el && !userScrolledRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [entries.length])

  // Focus chat input when SAY is clicked during combat (listen for custom event)
  useEffect(() => {
    const handler = () => {
      setTab('chat')
      setTimeout(() => chatInputRef.current?.focus(), 50)
    }
    window.addEventListener('combat-say-focus', handler)
    return () => window.removeEventListener('combat-say-focus', handler)
  }, [])

  function handleChatSubmit(e) {
    e.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    onChat?.(text)
    setChatInput('')
  }

  return (
    <div className={`hud-log-outer${expanded ? ' hud-log-expanded' : ''}`}>
      {/* Tabs + expand sit OUTSIDE the panel so overflow:hidden doesn't clip them */}
      <div className="hud-log-tab-strip-wrap">
        <img
          src={tab === 'chat' ? '/ui/log-tab1.png' : '/ui/log-tab2.png'}
          alt="" draggable={false}
          className="hud-log-tab-strip-img"
        />
        <button
          className={`hud-log-tab-zone left${tab === 'chat' ? ' active' : ''}`}
          onClick={() => { playParchmentRustle(); setTab('chat') }}
        >CHAT</button>
        <button
          className={`hud-log-tab-zone right${tab === 'log' ? ' active' : ''}`}
          onClick={() => { playParchmentRustle(); setTab('log') }}
        >LOG</button>
      </div>
      <button
        className="hud-log-expand-btn"
        onClick={() => setExpanded(prev => !prev)}
        title={expanded ? 'Collapse log' : 'Expand log'}
      >
        <img
          src={expanded ? '/ui/log-retract.png' : '/ui/log-expand.png'}
          alt={expanded ? 'Collapse' : 'Expand'}
          draggable={false}
        />
      </button>
      {/* Panel with overflow:hidden for content clipping */}
      <div className="hud-log-panel">
        <img src="/ui/log-bg.png" className="hud-log-bg-img" alt="" draggable={false} />
        <div className="hud-log-entries" ref={scrollRef}>
          {tab === 'log' ? (
            sessionLog.length > 0 ? sessionLog.map((entry, i) => {
              const colorClass = getLogColorClass(entry)
              return (
              <div key={entry.id || i} className="hud-log-entry">
                <span className="hud-log-time">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>{' '}
                <span className={`hud-log-action ${colorClass}`}>{entry.icon} {entry.title}</span>
                {entry.detail && <span className={`hud-log-action ${colorClass}`}> — {entry.detail}</span>}
              </div>)
            }) : (
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
        {tab === 'chat' && (
          <form onSubmit={handleChatSubmit} className="hud-chat-form">
            <input
              ref={chatInputRef}
              className="hud-chat-input"
              style={{ flex: 1, margin: 0 }}
              placeholder="Say something..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button type="submit" className="hud-chat-go-btn">GO</button>
          </form>
        )}
      </div>
    </div>
  )
}
