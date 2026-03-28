import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import { stopSpeaking, isSpeaking } from '../lib/tts'

export default function NarratorFloat() {
  const history = useStore(s => s.narrator?.history) || []

  // Find last DM message
  const lastDm = [...history].reverse().find(m => m.role === 'dm')

  // Auto-hide after 8 seconds
  const [visible, setVisible] = useState(true)
  const [displayedText, setDisplayedText] = useState('')

  // Typewriter effect: show 1 character per 25ms
  useEffect(() => {
    if (!lastDm?.text) {
      setDisplayedText('')
      return
    }

    setDisplayedText('') // Reset when message changes
    let charIndex = 0
    const interval = setInterval(() => {
      charIndex++
      setDisplayedText(lastDm.text.substring(0, charIndex))
      if (charIndex >= lastDm.text.length) clearInterval(interval)
    }, 25)

    return () => clearInterval(interval)
  }, [lastDm?.text])

  // Auto-hide after 8 seconds
  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(t)
  }, [lastDm?.text])

  if (!lastDm || !visible) return null

  return (
    <div style={{
      position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
      maxWidth: 400, width: 'auto', zIndex: 20,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'rgba(10, 8, 6, 0.85)',
        border: '1px solid rgba(201, 168, 76, 0.4)',
        borderRadius: 6,
        padding: '6px 14px',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        pointerEvents: 'auto',
      }}>
        <div className="hud-narrator-text" style={{ fontSize: 11, flex: 1 }}>
          {lastDm.speaker && <span className="hud-narrator-name" style={{ fontSize: 10 }}>{lastDm.speaker}: </span>}
          {displayedText}
        </div>
        <button
          onClick={() => { stopSpeaking(); setVisible(false); }}
          title="Skip narration"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#d4af37',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: "'Cinzel', serif",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          SKIP
        </button>
      </div>
    </div>
  )
}
