/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * DifficultyBadge — Renders encounter difficulty as an ornate wax seal/sigil.
 * Used in VictoryScreen, DefeatScreen, and encounter HUD.
 */

const DIFFICULTY_CONFIG = {
  Easy:   { color: '#5dbd84', glowColor: 'rgba(46,204,113,0.3)',   ring: '#3a9d68', label: 'EASY',   symbol: '✦' },
  Medium: { color: '#d4af37', glowColor: 'rgba(212,175,55,0.3)',   ring: '#a08030', label: 'MEDIUM', symbol: '✦✦' },
  Hard:   { color: '#e06040', glowColor: 'rgba(231,76,60,0.3)',    ring: '#b84030', label: 'HARD',   symbol: '✦✦✦' },
  Deadly: { color: '#9b30ff', glowColor: 'rgba(155,48,255,0.35)',  ring: '#7820c0', label: 'DEADLY', symbol: '💀' },
};

export default function DifficultyBadge({ difficulty = 'Medium', size = 'normal' }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
  const isSmall = size === 'small';
  const dim = isSmall ? 40 : 56;
  const half = dim / 2;

  return (
    <div style={{
      position: 'relative',
      width: dim, height: dim,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      filter: `drop-shadow(0 0 6px ${cfg.glowColor})`,
      flexShrink: 0,
    }}>
      {/* Wax seal SVG */}
      <svg width={dim} height={dim} viewBox="0 0 60 60" style={{ position: 'absolute', inset: 0 }}>
        {/* Outer scalloped edge (seal shape) */}
        <path d={sealPath(30, 30, 28, 24, 12)} fill={cfg.color} opacity="0.15" />
        {/* Inner ring */}
        <circle cx="30" cy="30" r="22" fill="rgba(16,12,6,0.9)"
          stroke={cfg.color} strokeWidth="1.5" opacity="0.9" />
        {/* Decorative inner ring */}
        <circle cx="30" cy="30" r="18" fill="none"
          stroke={cfg.color} strokeWidth="0.6" strokeDasharray="3 2" opacity="0.4" />
        {/* Cardinal tick marks */}
        {[0, 90, 180, 270].map(deg => {
          const rad = deg * Math.PI / 180;
          return (
            <line key={deg}
              x1={30 + Math.cos(rad) * 19} y1={30 + Math.sin(rad) * 19}
              x2={30 + Math.cos(rad) * 22} y2={30 + Math.sin(rad) * 22}
              stroke={cfg.color} strokeWidth="1.2" opacity="0.5"
            />
          );
        })}
        {/* Diagonal tick marks */}
        {[45, 135, 225, 315].map(deg => {
          const rad = deg * Math.PI / 180;
          return (
            <line key={deg}
              x1={30 + Math.cos(rad) * 20} y1={30 + Math.sin(rad) * 20}
              x2={30 + Math.cos(rad) * 22} y2={30 + Math.sin(rad) * 22}
              stroke={cfg.color} strokeWidth="0.8" opacity="0.3"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0,
      }}>
        {/* Difficulty symbol */}
        <div style={{
          fontSize: isSmall ? '0.55rem' : '0.7rem',
          lineHeight: 1,
          color: cfg.color,
          textShadow: `0 0 6px ${cfg.glowColor}`,
        }}>
          {cfg.symbol}
        </div>
        {/* Label */}
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: isSmall ? '0.38rem' : '0.45rem',
          fontWeight: 700,
          color: cfg.color,
          letterSpacing: '0.12em',
          textShadow: `0 0 4px ${cfg.glowColor}`,
          marginTop: 1,
        }}>
          {cfg.label}
        </div>
      </div>
    </div>
  );
}

/** Generate a scalloped seal path */
function sealPath(cx, cy, outerR, innerR, scallops) {
  const points = [];
  for (let i = 0; i < scallops; i++) {
    const outerAngle = (i / scallops) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = ((i + 0.5) / scallops) * Math.PI * 2 - Math.PI / 2;
    points.push(`${cx + Math.cos(outerAngle) * outerR},${cy + Math.sin(outerAngle) * outerR}`);
    points.push(`${cx + Math.cos(innerAngle) * innerR},${cy + Math.sin(innerAngle) * innerR}`);
  }
  return `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')} Z`;
}

/** Inline version for use in stat rows (returns color + styled text) */
export function getDifficultyColor(difficulty) {
  return (DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium).color;
}
