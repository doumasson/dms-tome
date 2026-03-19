/**
 * Ornate vertical divider with jeweled terminals and diamond accents.
 */
export default function OrnateDivider({ height = 106, color = '#c9a84c' }) {
  return (
    <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height={height} viewBox={`0 0 16 ${height}`}>
        <line x1="8" y1="0" x2="8" y2={height} stroke={color} strokeWidth="1" opacity="0.25" />
        <line x1="5" y1="4" x2="5" y2={height - 4} stroke={color} strokeWidth="0.3" opacity="0.1" />
        <line x1="11" y1="4" x2="11" y2={height - 4} stroke={color} strokeWidth="0.3" opacity="0.1" />
        {/* Top jewel */}
        <circle cx="8" cy="6" r="3.5" fill={color} opacity="0.4" />
        <circle cx="8" cy="6" r="1.5" fill="#08060c" />
        {/* Upper diamond */}
        <polygon points="5,22 8,15 11,22 8,29" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
        <circle cx="8" cy="22" r="1.5" fill={color} opacity="0.3" />
        {/* Upper leaf */}
        <path d={`M4,38 Q8,34 12,38 Q8,42 4,38`} fill={color} opacity="0.2" stroke={color} strokeWidth="0.8" />
        {/* Center ring */}
        <circle cx="8" cy={height / 2} r="4.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <circle cx="8" cy={height / 2} r="2" fill={color} opacity="0.4" />
        <circle cx="8" cy={height / 2} r="0.8" fill="#08060c" />
        {/* Lower leaf */}
        <path d={`M4,68 Q8,64 12,68 Q8,72 4,68`} fill={color} opacity="0.2" stroke={color} strokeWidth="0.8" />
        {/* Lower diamond */}
        <polygon points="5,84 8,77 11,84 8,91" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
        <circle cx="8" cy="84" r="1.5" fill={color} opacity="0.3" />
        {/* Bottom jewel */}
        <circle cx="8" cy={height - 6} r="3.5" fill={color} opacity="0.4" />
        <circle cx="8" cy={height - 6} r="1.5" fill="#08060c" />
      </svg>
    </div>
  )
}
