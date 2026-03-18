// Floating interaction prompt shown when a player token approaches a scene hotspot.
// Clicking triggers a Dungeon Master interaction for that zone.
export default function InteractionZone({ zone, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 9,
        cursor: 'pointer',
      }}
    >
      {/* Outer proximity ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 56, height: 56,
        borderRadius: '50%',
        border: '1px solid rgba(212,175,55,0.22)',
        animation: 'goldPulse 2.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Prompt bubble */}
      <div style={{
        background: 'rgba(10,5,2,0.82)',
        border: '1px solid rgba(212,175,55,0.55)',
        borderRadius: 20,
        padding: '5px 13px',
        fontSize: '0.72rem',
        color: '#d4af37',
        fontFamily: "'Cinzel', Georgia, serif",
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 3px 16px rgba(0,0,0,0.7)',
        userSelect: 'none',
      }}>
        ✦ {zone.label || 'Interact'}
      </div>

      {/* Click hint */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.6rem',
        color: 'rgba(212,175,55,0.55)',
        marginTop: 3,
        letterSpacing: '0.06em',
        fontFamily: "'Cinzel', Georgia, serif",
        pointerEvents: 'none',
      }}>
        press to engage
      </div>
    </div>
  );
}
