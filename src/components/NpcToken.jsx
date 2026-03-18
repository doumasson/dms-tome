const NPC_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function NpcToken({ npc }) {
  const color = NPC_COLORS[npc.name.charCodeAt(0) % NPC_COLORS.length];
  const x = (npc.x ?? 0.5) * 100;
  const y = (npc.y ?? 0.38) * 100;

  return (
    <div
      title={npc.name}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}40, ${color}15)`,
        border: `2px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 18,
        pointerEvents: 'none',
        boxShadow: `0 0 8px ${color}40`,
      }}
    >
      <span style={{
        color,
        fontFamily: "'Cinzel', Georgia, serif",
        fontWeight: 700,
        fontSize: '0.68rem',
        lineHeight: 1,
      }}>
        {npc.name.slice(0, 2).toUpperCase()}
      </span>
      <span style={{
        color: 'rgba(255,255,255,0.65)',
        fontSize: '0.44rem',
        lineHeight: 1,
        marginTop: 1,
        maxWidth: 36,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {npc.name.split(' ')[0]}
      </span>
    </div>
  );
}
