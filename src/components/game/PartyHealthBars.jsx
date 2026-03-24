import useStore from '../../store/useStore';

/**
 * PartyHealthBars — Compact always-visible HP display for all party members.
 * Shows small portrait circles with HP bars below, positioned bottom-left.
 * Updates in real-time from campaign characters + encounter combatants.
 */
export default function PartyHealthBars() {
  const characters = useStore(s => s.campaign?.characters) || [];
  const myCharacter = useStore(s => s.myCharacter);
  const encounter = useStore(s => s.encounter);
  const inCombat = encounter?.phase === 'combat';

  // In combat, use combatant data for live HP; otherwise use campaign characters
  const partyChars = characters.filter(c => c.name && c.class);

  if (partyChars.length <= 1) return null; // Solo player doesn't need party bars

  return (
    <div style={S.container}>
      {partyChars.map((char, i) => {
        // Get live HP from combatants if in combat
        const combatant = inCombat
          ? encounter.combatants?.find(c => c.id === char.id || c.name === char.name)
          : null;
        const hp = combatant?.currentHp ?? char.currentHp ?? char.hp ?? 0;
        const maxHp = combatant?.maxHp ?? char.maxHp ?? char.hp ?? 1;
        const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
        const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
        const isDead = hp <= 0;
        const isMe = myCharacter && (char.id === myCharacter.id || char.name === myCharacter.name);
        const conditions = combatant?.conditions || char.conditions || [];

        return (
          <div key={char.id || char.name || i} style={{
            ...S.member,
            opacity: isDead ? 0.4 : 1,
            borderColor: isMe ? 'rgba(77,208,225,0.5)' : 'rgba(212,175,55,0.2)',
          }}>
            {/* Portrait circle */}
            <div style={{
              ...S.portrait,
              borderColor: isMe ? '#4dd0e1' : 'rgba(212,175,55,0.4)',
            }}>
              {char.portrait ? (
                <img src={char.portrait} alt="" style={S.portraitImg} />
              ) : (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  color: isMe ? '#4dd0e1' : '#d4af37',
                }}>
                  {(char.name || '?')[0]}
                </span>
              )}
              {isDead && <div style={S.deadOverlay}>💀</div>}
            </div>

            {/* Name + Class */}
            <div style={S.info}>
              <div style={{
                ...S.name,
                color: isMe ? '#4dd0e1' : '#d4c090',
              }}>
                {char.name?.length > 8 ? char.name.slice(0, 8) + '.' : char.name}
              </div>

              {/* HP bar */}
              <div style={S.barTrack}>
                <div style={{
                  ...S.barFill,
                  width: `${hpPct * 100}%`,
                  background: hpColor,
                }} />
              </div>

              {/* HP text */}
              <div style={{ ...S.hpText, color: hpColor }}>
                {isDead ? 'DEAD' : `${hp}/${maxHp}`}
              </div>
            </div>

            {/* Condition dots */}
            {conditions.length > 0 && (
              <div style={S.condDots}>
                {conditions.slice(0, 3).map(c => (
                  <div key={c} title={c} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: c === 'Poisoned' ? '#44cc44' : c === 'Burning' ? '#ff6633' : '#e74c3c',
                  }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const S = {
  container: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    zIndex: 90,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    pointerEvents: 'none',
  },
  member: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 8px 3px 3px',
    background: 'rgba(10,8,6,0.85)',
    border: '1px solid',
    borderRadius: 6,
    minWidth: 100,
    transition: 'opacity 0.3s',
  },
  portrait: {
    width: 24, height: 24, borderRadius: '50%',
    border: '1.5px solid',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
    position: 'relative',
  },
  portraitImg: {
    width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%',
  },
  deadOverlay: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.55rem',
  },
  info: {
    flex: 1, minWidth: 0,
  },
  name: {
    fontSize: '0.55rem', fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    lineHeight: 1,
    marginBottom: 2,
  },
  barTrack: {
    height: 3, background: 'rgba(0,0,0,0.4)',
    borderRadius: 2, overflow: 'hidden',
    marginBottom: 1,
  },
  barFill: {
    height: '100%', borderRadius: 2,
    transition: 'width 0.3s ease, background 0.3s ease',
  },
  hpText: {
    fontSize: '0.45rem', fontWeight: 600, lineHeight: 1,
  },
  condDots: {
    display: 'flex', flexDirection: 'column', gap: 2,
    flexShrink: 0,
  },
};
