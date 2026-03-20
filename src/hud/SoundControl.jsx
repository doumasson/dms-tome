import { useState } from 'react'
import { ambient } from '../lib/ambientAudio'

export default function SoundControl() {
  const [muted, setMuted] = useState(false)
  const toggle = () => {
    const next = !muted
    setMuted(next)
    ambient?.setMuted?.(next)
  }
  return (
    <button
      onClick={toggle}
      style={{
        background: 'none',
        border: 'none',
        color: '#c9a84c',
        cursor: 'pointer',
        fontSize: 14,
        opacity: 0.7,
        pointerEvents: 'all',
      }}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
