import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import { playParchmentRustle } from '../lib/uiSounds'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SPEECH_SUPPORTED = !!SpeechRecognition


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
  const [isRecording, setIsRecording] = useState(false)
  const pttRecogRef = useRef(null)

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

  function startPTT() {
    if (!SPEECH_SUPPORTED) return
    try {
      const recog = new SpeechRecognition()
      recog.lang = 'en-US'
      recog.interimResults = false
      recog.maxAlternatives = 1
      recog.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        setChatInput(transcript)
      }
      recog.onerror = () => setIsRecording(false)
      recog.onend = () => setIsRecording(false)
      recog.start()
      pttRecogRef.current = recog
      setIsRecording(true)
    } catch { setIsRecording(false) }
  }

  function stopPTT() {
    if (pttRecogRef.current) {
      pttRecogRef.current.stop()
      pttRecogRef.current = null
    }
    setIsRecording(false)
  }

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
          <>
          {!inCombat && (
            <div style={{ display: 'flex', gap: 3, padding: '2px 6px 0', flexWrap: 'wrap' }}>
              {[
                { label: 'Look around', action: 'I look around and describe what I see.' },
                { label: 'Search', action: 'I search the area for anything useful — hidden items, traps, or clues.' },
                { label: 'Sneak', action: 'I try to move stealthily, staying in the shadows.' },
                { label: 'Listen', action: 'I stop and listen carefully for any sounds nearby.' },
              ].map(qa => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => onChat?.(qa.action)}
                  style={{
                    padding: '2px 8px', fontSize: 9, fontFamily: "'Cinzel', serif",
                    background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
                    color: '#a89060', borderRadius: 3, cursor: 'pointer', minHeight: 0,
                    letterSpacing: '0.5px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.target.style.color = '#d4af37'; e.target.style.borderColor = 'rgba(201,168,76,0.5)' }}
                  onMouseLeave={e => { e.target.style.color = '#a89060'; e.target.style.borderColor = 'rgba(201,168,76,0.2)' }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleChatSubmit} className="hud-chat-form">
            <input
              ref={chatInputRef}
              className="hud-chat-input"
              style={{ flex: 1, margin: 0 }}
              placeholder="Say something..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            {SPEECH_SUPPORTED && (
              <button
                type="button"
                className="hud-mic-btn"
                onMouseDown={startPTT}
                onMouseUp={stopPTT}
                onMouseLeave={stopPTT}
                onTouchStart={startPTT}
                onTouchEnd={stopPTT}
                title="Hold to speak"
                style={{
                  background: isRecording ? 'rgba(200,50,50,0.3)' : 'rgba(201,168,76,0.1)',
                  border: `1px solid ${isRecording ? 'rgba(200,50,50,0.6)' : 'rgba(201,168,76,0.2)'}`,
                  color: isRecording ? '#e74c3c' : '#d4af37',
                  borderRadius: 4,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {isRecording ? '\u{1F534}' : '\u{1F3A4}'}
              </button>
            )}
            <button type="submit" className="hud-chat-go-btn">GO</button>
          </form>
          </>
        )}
      </div>
    </div>
  )
}
