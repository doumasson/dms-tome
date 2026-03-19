/**
 * Ornate SVG filigree bar — the decorative top border of the bottom bar.
 * Scrollwork, diamonds, jeweled center ornament, heavy corners.
 */
export default function FiligreeBar({ color = '#c9a84c' }) {
  return (
    <svg
      style={{ position: 'absolute', top: -12, left: 0, right: 0, width: '100%', height: 24, pointerEvents: 'none' }}
      viewBox="0 0 1000 24" preserveAspectRatio="none"
    >
      {/* Double line */}
      <line x1="0" y1="10" x2="1000" y2="10" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="30" y1="14" x2="970" y2="14" stroke={color} strokeWidth="0.6" opacity="0.15" />

      {/* Center ornament */}
      <path d="M440,12 Q455,3 470,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M470,12 Q485,3 500,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M500,12 Q515,21 530,12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M530,12 Q545,21 560,12" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="500" cy="12" r="5.5" fill={color} />
      <circle cx="500" cy="12" r="3" fill="#08060c" />
      <circle cx="500" cy="12" r="1.5" fill={color} opacity="0.6" />
      <polygon points="470,12 474,8 478,12 474,16" fill={color} opacity="0.5" />
      <polygon points="522,12 526,8 530,12 526,16" fill={color} opacity="0.5" />

      {/* Left filigree cluster */}
      <path d="M160,12 Q175,4 190,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <path d="M190,12 Q205,20 220,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <circle cx="190" cy="12" r="3" fill={color} opacity="0.35" />
      <circle cx="190" cy="12" r="1.2" fill="#08060c" />
      <polygon points="130,12 135,7 140,12 135,17" fill="none" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <path d="M70,12 Q82,6 94,12 Q82,18 70,12" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />

      {/* Right filigree cluster */}
      <path d="M780,12 Q795,4 810,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <path d="M810,12 Q825,20 840,12" fill="none" stroke={color} strokeWidth="1.8" opacity="0.4" />
      <circle cx="810" cy="12" r="3" fill={color} opacity="0.35" />
      <circle cx="810" cy="12" r="1.2" fill="#08060c" />
      <polygon points="860,12 865,7 870,12 865,17" fill="none" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <path d="M906,12 Q918,6 930,12 Q918,18 906,12" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />

      {/* Mid accents */}
      <polygon points="320,12 324,8 328,12 324,16" fill={color} opacity="0.3" />
      <circle cx="370" cy="12" r="2" fill={color} opacity="0.25" />
      <polygon points="672,12 676,8 680,12 676,16" fill={color} opacity="0.3" />
      <circle cx="630" cy="12" r="2" fill={color} opacity="0.25" />

      {/* Heavy corners */}
      <path d="M0,23 L0,5 Q0,0 5,0 L40,0" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="5" cy="5" r="3.5" fill={color} /><circle cx="5" cy="5" r="1.5" fill="#08060c" />
      <path d="M1000,23 L1000,5 Q1000,0 995,0 L960,0" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="995" cy="5" r="3.5" fill={color} /><circle cx="995" cy="5" r="1.5" fill="#08060c" />
    </svg>
  )
}
