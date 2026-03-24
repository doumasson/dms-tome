import { useEffect, useState, useRef } from 'react'
import useStore from '../../store/useStore'

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]

/**
 * XpNotification — shows brief toasts when the player gains XP or gold.
 * Watches myCharacter.xp and myCharacter.gold for changes.
 */
export default function XpNotification() {
  const xp = useStore(s => s.myCharacter?.xp ?? 0)
  const gold = useStore(s => s.myCharacter?.gold ?? 0)
  const level = useStore(s => s.myCharacter?.level ?? 1)
  const prevXpRef = useRef(xp)
  const prevGoldRef = useRef(gold)
  const [notification, setNotification] = useState(null)
  const timerRef = useRef(null)

  // Watch XP changes
  useEffect(() => {
    const prev = prevXpRef.current
    prevXpRef.current = xp
    if (xp <= prev || prev === 0) return

    const gained = xp - prev
    const nextThreshold = XP_THRESHOLDS[Math.min(level, 19)] || 355000
    const currThreshold = XP_THRESHOLDS[Math.min(level - 1, 19)] || 0
    const progress = nextThreshold > currThreshold
      ? Math.min(1, (xp - currThreshold) / (nextThreshold - currThreshold))
      : 1

    if (timerRef.current) clearTimeout(timerRef.current)
    setNotification(n => ({ ...(n || {}), xpGained: gained, progress, phase: 'in' }))

    timerRef.current = setTimeout(() => {
      setNotification(n => n ? { ...n, phase: 'out' } : null)
      timerRef.current = setTimeout(() => setNotification(null), 600)
    }, 2500)
  }, [xp, level])

  // Watch gold changes
  useEffect(() => {
    const prev = prevGoldRef.current
    prevGoldRef.current = gold
    if (gold <= prev || prev === 0) return

    const gained = gold - prev
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotification(n => ({ ...(n || {}), goldGained: gained, phase: 'in' }))

    timerRef.current = setTimeout(() => {
      setNotification(n => n ? { ...n, phase: 'out' } : null)
      timerRef.current = setTimeout(() => setNotification(null), 600)
    }, 2500)
  }, [gold])

  if (!notification) return null

  return (
    <div style={{
      position: 'absolute',
      top: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      pointerEvents: 'none',
      animation: notification.phase === 'in'
        ? 'xpFadeIn 0.4s ease-out forwards'
        : 'xpFadeOut 0.6s ease-in forwards',
    }}>
      <div style={{
        background: 'rgba(10, 8, 6, 0.9)',
        border: '1px solid rgba(212, 175, 55, 0.5)',
        borderRadius: 6,
        padding: '8px 20px',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 0 20px rgba(212,175,55,0.15)',
      }}>
        {notification.xpGained > 0 && (
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#d4af37',
            textShadow: '0 0 10px rgba(212,175,55,0.4)',
            letterSpacing: '2px',
          }}>
            +{notification.xpGained} XP
          </div>
        )}
        {notification.goldGained > 0 && (
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#f0c868',
            textShadow: '0 0 8px rgba(240,200,104,0.3)',
            letterSpacing: '1px',
            marginTop: notification.xpGained ? 4 : 0,
          }}>
            +{notification.goldGained} Gold
          </div>
        )}
        {/* XP progress bar */}
        {notification.progress != null && (
          <>
            <div style={{
              marginTop: 6,
              height: 3,
              width: 120,
              background: 'rgba(212,175,55,0.15)',
              borderRadius: 2,
              overflow: 'hidden',
              margin: '6px auto 0',
            }}>
              <div style={{
                width: `${notification.progress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #d4af37, #f0c868)',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              color: '#8a7a5a',
              marginTop: 3,
              letterSpacing: '0.5px',
            }}>
              Level {level} Progress
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes xpFadeIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes xpFadeOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
