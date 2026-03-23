import { useEffect } from 'react';

const DIE_SHAPES = {
  4:   'M50,5 L95,90 L5,90 Z',
  6:   'M10,10 L90,10 L90,90 L10,90 Z',
  8:   'M50,5 L95,50 L50,95 L5,50 Z',
  10:  'M50,5 L95,40 L78,95 L22,95 L5,40 Z',
  12:  'M50,5 L93,25 L95,72 L55,95 L45,95 L5,72 L7,25 Z',
  20:  'M50,5 L95,35 L82,90 L18,90 L5,35 Z',
  100: 'M10,10 L90,10 L90,90 L10,90 Z',
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(2px)',
  },
  centerBox: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    animation: 'diePopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
  },
  dieSpin: {
    animation: 'dieSpin 0.55s cubic-bezier(0.25,0.46,0.45,0.94)',
  },
  dieSvg: { display: 'block' },
  result: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '5rem',
    lineHeight: 1,
    animation: 'fadeInUp 0.3s 0.25s ease both',
  },
  dieLabel: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'rgba(200,180,140,0.7)',
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    animation: 'fadeInUp 0.3s 0.35s ease both',
  },
  rolledByLabel: {
    color: 'rgba(200,180,140,0.5)',
    fontSize: '0.75rem',
    fontStyle: 'italic',
    animation: 'fadeInUp 0.3s 0.4s ease both',
  },
  tapHint: {
    color: 'rgba(200,180,140,0.25)',
    fontSize: '0.65rem',
    marginTop: 12,
    animation: 'fadeInUp 0.3s 0.7s ease both',
  },
};

// Animated dice result that overlays the scene
export default function DiceAnimation({ result, die, rolledBy, onDone }) {
  const isNat20 = die === 20 && result === 20;
  const isNat1  = die === 20 && result === 1;

  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  const glowColor = isNat20 ? '#d4af37' : isNat1 ? '#e74c3c' : '#c8b48c';
  const glowShadow = isNat20
    ? '0 0 60px rgba(212,175,55,0.9), 0 0 120px rgba(212,175,55,0.5)'
    : isNat1
      ? '0 0 60px rgba(231,76,60,0.9), 0 0 120px rgba(231,76,60,0.4)'
      : '0 0 30px rgba(200,180,140,0.4)';

  return (
    <div style={styles.overlay} onClick={onDone}>
      <div style={styles.backdrop} />
      <div style={styles.centerBox}>
        {/* Spinning die */}
        <div style={styles.dieSpin}>
          <svg viewBox="0 0 100 100" width={90} height={90} style={styles.dieSvg}>
            <defs>
              <filter id="dieGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path
              d={DIE_SHAPES[die] || DIE_SHAPES[6]}
              fill="rgba(20,12,5,0.95)"
              stroke={glowColor}
              strokeWidth="3"
              filter="url(#dieGlow)"
            />
            <text
              x="50" y="58"
              textAnchor="middle"
              fill={glowColor}
              fontSize={result >= 100 ? '22' : result >= 10 ? '28' : '34'}
              fontFamily="'Cinzel', Georgia, serif"
              fontWeight="700"
            >
              {result}
            </text>
          </svg>
        </div>

        {/* Result */}
        <div style={{ ...styles.result, color: glowColor, textShadow: glowShadow }}>
          {result}
        </div>

        {/* Labels */}
        <div style={styles.dieLabel}>d{die}{isNat20 ? ' — NAT 20!' : isNat1 ? ' — NAT 1!' : ''}</div>
        {rolledBy && <div style={styles.rolledByLabel}>{rolledBy}</div>}
        <div style={styles.tapHint}>tap to dismiss</div>
      </div>
    </div>
  );
}
