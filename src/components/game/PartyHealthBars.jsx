import useStore from '../../store/useStore';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * PartyHealthBars — BG2/Icewind Dale style portrait bars.
 * Ornate gold-framed portraits with chiseled HP bars beneath.
 * Positioned bottom-left, always visible during gameplay.
 */
export default function PartyHealthBars() {
  const characters = useStore(s => s.campaign?.characters) || [];
  const myCharacter = useStore(s => s.myCharacter);
  const encounter = useStore(s => s.encounter);
  const inCombat = encounter?.phase === 'combat';

  const partyChars = characters.filter(c => c.name && c.class);

  if (partyChars.length <= 1) return null;

  return (
    <div style={S.container}>
      {partyChars.map((char, i) => {
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
        const accentColor = isMe ? '#4dd0e1' : '#c9a84c';

        return (
          <div key={char.id || char.name || i} style={{
            ...S.member,
            opacity: isDead ? 0.45 : 1,
          }}>
            {/* Ornate portrait frame */}
            <div style={S.portraitFrame}>
              {/* Outer ornate border */}
              <div style={{
                ...S.portraitOuter,
                boxShadow: `0 0 6px rgba(${isMe ? '77,208,225' : '201,168,76'},0.3), inset 0 0 4px rgba(0,0,0,0.8)`,
                border: `2px solid ${accentColor}`,
              }}>
                {/* Inner portrait */}
                <div style={S.portraitInner}>
                  {char.portrait ? (
                    <img src={char.portrait} alt="" style={S.portraitImg} />
                  ) : (
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: accentColor,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    }}>
                      {(char.name || '?')[0]}
                    </span>
                  )}
                  {isDead && <div style={S.deadOverlay}>💀</div>}
                </div>
              </div>
              {/* Corner accents on portrait frame */}
              <span style={{ ...S.cornerNub, top: -1, left: -1, borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
              <span style={{ ...S.cornerNub, top: -1, right: -1, borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
              <span style={{ ...S.cornerNub, bottom: -1, left: -1, borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
              <span style={{ ...S.cornerNub, bottom: -1, right: -1, borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
            </div>

            {/* Info column: name + HP bar + conditions */}
            <div style={S.info}>
              {/* Character name */}
              <div style={{
                ...S.name,
                color: isMe ? '#4dd0e1' : '#d4c090',
              }}>
                {char.name?.length > 10 ? char.name.slice(0, 10) + '.' : char.name}
              </div>

              {/* Chiseled HP bar */}
              <div style={S.barOuter}>
                <div style={S.barTrack}>
                  <div style={{
                    ...S.barFill,
                    width: `${hpPct * 100}%`,
                    background: `linear-gradient(180deg, ${hpColor} 0%, ${adjustColor(hpColor, -30)} 100%)`,
                    boxShadow: `0 0 4px ${hpColor}40`,
                  }} />
                  {/* Notch marks every 25% */}
                  <span style={{ ...S.barNotch, left: '25%' }} />
                  <span style={{ ...S.barNotch, left: '50%' }} />
                  <span style={{ ...S.barNotch, left: '75%' }} />
                </div>
              </div>

              {/* HP text */}
              <div style={{ ...S.hpText, color: isDead ? '#e74c3c' : '#b8a070' }}>
                {isDead ? '☠ DEAD' : `${hp} / ${maxHp}`}
              </div>

              {/* Condition icons */}
              {conditions.length > 0 && (
                <div style={S.condRow}>
                  {conditions.slice(0, 4).map(c => (
                    <div key={c} title={c} style={{
                      ...S.condBadge,
                      background: conditionColor(c),
                      boxShadow: `0 0 3px ${conditionColor(c)}60`,
                    }}>
                      <span style={{ fontSize: '0.4rem' }}>{conditionIcon(c)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function conditionColor(c) {
  const map = {
    Poisoned: '#44cc44', Burning: '#ff6633', Stunned: '#ffdd44',
    Frightened: '#9b59b6', Paralyzed: '#666', Charmed: '#e91e9b',
    Blinded: '#333', Restrained: '#8B4513', Prone: '#a0522d',
  };
  return map[c] || '#e74c3c';
}

function conditionIcon(c) {
  const map = {
    Poisoned: '☠', Burning: '🔥', Stunned: '⚡', Frightened: '😱',
    Paralyzed: '⛓', Charmed: '💜', Blinded: '👁', Restrained: '🔗', Prone: '⬇',
  };
  return map[c] || '●';
}

const S = {
  container: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    zIndex: 90,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    pointerEvents: 'none',
  },
  member: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 10px 5px 5px',
    background: 'linear-gradient(135deg, rgba(18,14,8,0.92) 0%, rgba(10,8,5,0.95) 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    borderRadius: 4,
    minWidth: 130,
    transition: 'opacity 0.3s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.08)',
  },
  portraitFrame: {
    position: 'relative',
    flexShrink: 0,
  },
  portraitOuter: {
    width: 36,
    height: 36,
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #1a1408 0%, #0a0804 100%)',
  },
  portraitInner: {
    width: 30,
    height: 30,
    borderRadius: 3,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  portraitImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 3,
  },
  deadOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 3,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
  },
  cornerNub: {
    position: 'absolute',
    width: 6,
    height: 6,
    pointerEvents: 'none',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: "'Cinzel', 'Palatino', serif",
    fontSize: '0.6rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1,
    marginBottom: 3,
    letterSpacing: '0.03em',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  barOuter: {
    padding: 1,
    background: 'linear-gradient(180deg, rgba(201,168,76,0.15) 0%, rgba(0,0,0,0.3) 100%)',
    borderRadius: 3,
    border: '1px solid rgba(201,168,76,0.2)',
    marginBottom: 2,
  },
  barTrack: {
    height: 5,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(20,15,8,0.8) 100%)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.4s ease, background 0.3s ease',
  },
  barNotch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    background: 'rgba(0,0,0,0.35)',
  },
  hpText: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.5rem',
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '0.02em',
  },
  condRow: {
    display: 'flex',
    gap: 3,
    marginTop: 2,
  },
  condBadge: {
    width: 12,
    height: 12,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0,0,0,0.3)',
  },
};
