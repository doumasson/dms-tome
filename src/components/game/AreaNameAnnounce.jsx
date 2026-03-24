import { useEffect, useState, useRef } from 'react'
import useStore from '../../store/useStore'

/**
 * AreaNameAnnounce — Baldur's Gate style area name that appears
 * when the player enters a new zone. Gold text fades in, holds, fades out.
 */
export default function AreaNameAnnounce() {
  const zone = useStore(s => s.zone)
  const [display, setDisplay] = useState(null) // { name, phase }
  const prevZoneRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const name = zone?.name
    if (!name || name === prevZoneRef.current) return
    prevZoneRef.current = name

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current)

    // Show the area name
    setDisplay({ name, phase: 'in' })

    // After 2s, start fading out
    timerRef.current = setTimeout(() => {
      setDisplay(d => d ? { ...d, phase: 'out' } : null)
      // After fade-out animation (1s), remove
      timerRef.current = setTimeout(() => {
        setDisplay(null)
      }, 1000)
    }, 2500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [zone?.name])

  if (!display) return null

  return (
    <div style={{
      position: 'absolute',
      top: '28%',
      left: 0,
      right: 0,
      zIndex: 25,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      animation: display.phase === 'in'
        ? 'areaNameFadeIn 0.8s ease-out forwards'
        : 'areaNameFadeOut 1s ease-in forwards',
    }}>
      <div style={{
        fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
        fontSize: 'clamp(20px, 3.5vw, 36px)',
        fontWeight: 700,
        color: '#d4af37',
        letterSpacing: '0.15em',
        textShadow: '0 0 20px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.8)',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        {display.name}
      </div>
      {/* Ornamental line below */}
      <div style={{
        width: 120,
        height: 1,
        marginTop: 8,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
      }} />

      <style>{`
        @keyframes areaNameFadeIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes areaNameFadeOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
