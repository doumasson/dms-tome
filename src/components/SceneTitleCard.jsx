import { useEffect, useState } from 'react';

// Cinematic title card shown briefly when a scene loads or changes.
// Fades out after ~2.5 seconds.
export default function SceneTitleCard({ title, sceneIndex }) {
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fading' | 'gone'

  useEffect(() => {
    setPhase('visible');
    const fadeTimer = setTimeout(() => setPhase('fading'), 2400);
    const goneTimer = setTimeout(() => setPhase('gone'), 3200);
    return () => { clearTimeout(fadeTimer); clearTimeout(goneTimer); };
  }, [sceneIndex]);

  if (phase === 'gone') return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      opacity: phase === 'fading' ? 0 : 1,
      transition: 'opacity 0.8s ease',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 65%, transparent 100%)',
    }}>
      {/* Decorative line above */}
      <div style={{
        width: 60,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
        marginBottom: 14,
      }} />

      <div style={{
        fontFamily: "'Cinzel', Georgia, serif",
        color: '#d4af37',
        fontSize: 'clamp(0.9rem, 2.5vw, 1.6rem)',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textShadow: '0 2px 24px rgba(0,0,0,0.9), 0 0 50px rgba(212,175,55,0.35)',
        textAlign: 'center',
        padding: '0 24px',
        textTransform: 'uppercase',
      }}>
        {title}
      </div>

      {/* Decorative line below */}
      <div style={{
        width: 60,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
        marginTop: 14,
      }} />
    </div>
  );
}
