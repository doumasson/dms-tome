import { useEffect, useRef, useState } from 'react';

// Overlay that briefly announces whose turn it is in combat.
// Shows prominently for the active player ("⚔ YOUR TURN"), subtly for others.
export default function TurnAnnouncement({ name, isMyTurn, trigger }) {
  const [phase, setPhase] = useState('gone'); // 'visible' | 'fading' | 'gone'
  const prevTriggerRef = useRef(-1);

  useEffect(() => {
    if (!trigger || trigger === prevTriggerRef.current || !name) return;
    prevTriggerRef.current = trigger;

    setPhase('visible');
    const visibleMs = isMyTurn ? 2000 : 1100;
    const totalMs   = isMyTurn ? 2800 : 1900;
    const fadeTimer = setTimeout(() => setPhase('fading'), visibleMs);
    const goneTimer = setTimeout(() => setPhase('gone'),   totalMs);
    return () => { clearTimeout(fadeTimer); clearTimeout(goneTimer); };
  }, [trigger, isMyTurn, name]);

  if (phase === 'gone' || !name) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      opacity: phase === 'fading' ? 0 : 1,
      transition: `opacity ${isMyTurn ? '0.8s' : '0.6s'} ease`,
    }}>
      {isMyTurn ? (
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid rgba(212,175,55,0.7)',
          borderRadius: 6,
          padding: '14px 36px',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.1)',
        }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            color: '#d4af37',
            fontSize: 'clamp(1rem, 2.8vw, 1.6rem)',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(212,175,55,0.8)',
          }}>
            ⚔ YOUR TURN ⚔
          </div>
          <div style={{
            fontSize: '0.62rem',
            color: 'rgba(212,175,55,0.5)',
            marginTop: 6,
            letterSpacing: '0.12em',
            fontFamily: "'Cinzel', Georgia, serif",
            textTransform: 'uppercase',
          }}>
            {name}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 4,
          padding: '7px 20px',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: 'rgba(200,180,140,0.85)',
            fontFamily: "'Cinzel', Georgia, serif",
            letterSpacing: '0.07em',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}>
            {name}'s Turn
          </div>
        </div>
      )}
    </div>
  );
}
