import { useState } from 'react'
import { ambient } from '../lib/ambientAudio'
import { setUiMuted } from '../lib/uiSounds'
import { stopMusic, setMood, setMusicVolume } from '../lib/ambientMusic'

export default function SoundControl() {
  const [muted, setMuted] = useState(() => {
    return typeof localStorage !== 'undefined' && localStorage.getItem('dm-music') === 'off'
  })
  const toggle = () => {
    const next = !muted
    setMuted(next)
    ambient?.setMuted?.(next)
    setUiMuted(next)
    // Control procedural ambient music
    if (next) {
      stopMusic(0.5)
      localStorage.setItem('dm-music', 'off')
    } else {
      localStorage.removeItem('dm-music')
      // Restore saved volume and restart music
      const savedVol = localStorage.getItem('dm-music-vol')
      if (savedVol) setMusicVolume(parseFloat(savedVol))
      else setMusicVolume(0.15)
      setMood('exploration')
    }
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
        marginTop: -6,
      }}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
