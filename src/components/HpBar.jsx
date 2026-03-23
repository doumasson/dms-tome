/**
 * HP Bar component - displays health with color-coded fill
 * Green > 60%, Yellow > 30%, Red > 0%, Gray = 0
 */
export default function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const color =
    pct > 0.6 ? '#27ae60' :
    pct > 0.3 ? '#e67e22' :
    pct > 0   ? '#e74c3c' : '#555';

  const styles = {
    track: {
      position: 'relative',
      height: 14,
      background: 'rgba(0,0,0,0.4)',
      borderRadius: 2,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    fill: {
      height: '100%',
      borderRadius: 2,
      transition: 'width 0.4s ease, background 0.4s ease',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
    },
    label: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.62rem',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: '0.04em',
      textShadow: '0 1px 2px rgba(0,0,0,0.9)',
      fontFamily: "'Cinzel', Georgia, serif",
    },
  };

  return (
    <div style={styles.track}>
      <div style={{ ...styles.fill, width: `${pct * 100}%`, background: color }} />
      <span style={styles.label}>{current}/{max}</span>
    </div>
  );
}
