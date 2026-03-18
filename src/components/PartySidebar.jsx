import { useState } from 'react';
import useStore from '../store/useStore';

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const color =
    pct > 0.6 ? '#27ae60' :
    pct > 0.3 ? '#e67e22' :
    pct > 0   ? '#e74c3c' : '#555';

  return (
    <div style={hpBarStyles.track}>
      <div style={{ ...hpBarStyles.fill, width: `${pct * 100}%`, background: color }} />
      <span style={hpBarStyles.label}>{current}/{max}</span>
    </div>
  );
}

const hpBarStyles = {
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

const CONDITION_COLORS = {
  Blinded: '#888', Charmed: '#e91e8c', Deafened: '#888',
  Frightened: '#9c27b0', Grappled: '#795548', Incapacitated: '#f44336',
  Invisible: '#90caf9', Paralyzed: '#f44336', Petrified: '#9e9e9e',
  Poisoned: '#4caf50', Prone: '#ff9800', Restrained: '#795548',
  Stunned: '#ff5722', Unconscious: '#424242', Concentrating: '#2196f3',
  Exhausted: '#ff9800',
};

export default function PartySidebar({ onTool, onManage, onLeave, onSettings, onRest, onOpenSheet, onRemakeCharacter, liveConnected }) {
  const encounter    = useStore(s => s.encounter);
  const isDM         = useStore(s => s.isDM);
  const dmMode       = useStore(s => s.dmMode);
  const toggleDmMode = useStore(s => s.toggleDmMode);
  const partyMembers = useStore(s => s.partyMembers);
  const myCharacter  = useStore(s => s.myCharacter);
  const [expandedId, setExpandedId] = useState(null);

  // Show real players from campaign_members, not NPC characters from JSON
  const characters = partyMembers;

  // During combat, prefer encounter HP for matching combatants
  function getCharHp(char) {
    if (encounter.phase !== 'idle') {
      const combatant = encounter.combatants.find(c => c.id === char.id && c.type === 'player');
      if (combatant) return { current: combatant.currentHp, max: combatant.maxHp };
    }
    return { current: char.currentHp ?? char.maxHp, max: char.maxHp };
  }

  function getConditions(char) {
    if (encounter.phase !== 'idle') {
      const combatant = encounter.combatants.find(c => c.id === char.id);
      return combatant?.conditions || [];
    }
    return [];
  }

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.sidebarHeader}>
        <span style={styles.sidebarTitle}>Party</span>
        <div style={styles.liveIndicator} title={liveConnected ? 'Connected' : 'Connecting…'}>
          <span style={{ color: liveConnected ? '#2ecc71' : '#888', fontSize: '0.6rem' }}>
            {liveConnected ? '●' : '○'}
          </span>
          <span style={{ color: liveConnected ? '#2ecc71' : '#666', fontSize: '0.65rem' }}>
            {liveConnected ? 'Live' : '…'}
          </span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Character Cards */}
      <div style={styles.charList}>
        {characters.length === 0 && (
          <p style={styles.emptyParty}>No characters loaded.</p>
        )}
        {characters.map(char => {
          const { current, max } = getCharHp(char);
          const conditions = getConditions(char);
          const isExpanded = expandedId === char.id;
          const isDowned = current === 0;
          const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(char.name)}&backgroundColor=transparent`;

          return (
            <div
              key={char.id}
              style={{ ...styles.charCard, ...(isDowned ? styles.charCardDowned : {}) }}
              onClick={() => setExpandedId(isExpanded ? null : char.id)}
            >
              <div style={styles.charRow}>
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ ...styles.charAvatar, cursor: onOpenSheet ? 'pointer' : 'default' }}
                  onClick={e => { if (onOpenSheet) { e.stopPropagation(); onOpenSheet(char); } }}
                  title={onOpenSheet ? `View ${char.name}'s character sheet` : undefined}
                />
                <div style={styles.charInfo}>
                  <span style={styles.charName}>{char.name}</span>
                  <span style={styles.charSubtitle}>
                    Lv{char.level || 1} {char.race} {char.class}
                  </span>
                  <HpBar current={current} max={max} />
                </div>
                {isDowned && <span style={styles.downedBadge}>💀</span>}
              </div>

              {/* Condition badges */}
              {conditions.length > 0 && (
                <div style={styles.conditionRow}>
                  {conditions.map(c => (
                    <span
                      key={c}
                      style={{
                        ...styles.conditionBadge,
                        background: `${CONDITION_COLORS[c] || '#888'}22`,
                        border: `1px solid ${CONDITION_COLORS[c] || '#888'}55`,
                        color: CONDITION_COLORS[c] || '#aaa',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div style={styles.expandedDetails}>
                  <div style={styles.statRow}>
                    <span style={styles.statItem}>🛡 AC {char.ac || '?'}</span>
                    <span style={styles.statItem}>⚡ Spd {char.speed || 30}ft</span>
                    {char.xp !== undefined && (
                      <span style={styles.statItem}>✦ {char.xp} XP</span>
                    )}
                  </div>
                  {char.spellSlots && (
                    <div style={styles.spellSlots}>
                      {Object.entries(char.spellSlots).map(([lvl, s]) =>
                        s.total > 0 ? (
                          <span key={lvl} style={styles.slotBadge}>
                            {lvl}: {s.total - (s.used || 0)}/{s.total}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      <div style={styles.divider} />

      {/* Tool Buttons */}
      <div style={styles.toolSection}>
        {myCharacter && onOpenSheet && (
          <button style={{ ...styles.toolBtn, color: '#d4af37' }} onClick={() => onOpenSheet(myCharacter)}>
            🎒 Inventory
          </button>
        )}
        <button style={styles.toolBtn} onClick={() => onTool('dice')}>
          🎲 Dice
        </button>
        <button style={styles.toolBtn} onClick={() => onTool('notes')}>
          📝 Notes
        </button>
        {isDM && dmMode && (
          <>
            <button style={styles.toolBtn} onClick={() => onTool('loot')}>
              💰 Loot
            </button>
            <button style={styles.toolBtn} onClick={() => onTool('import')}>
              📥 Import
            </button>
            <button style={styles.toolBtn} onClick={onManage}>
              👥 Campaign
            </button>
          </>
        )}
        <button style={styles.toolBtn} onClick={onSettings}>
          ⚙ Settings
        </button>
        {onRemakeCharacter && (
          <button style={{ ...styles.toolBtn, color: 'rgba(212,175,55,0.7)' }} onClick={onRemakeCharacter}>
            ✦ New Character
          </button>
        )}
        {/* Rest buttons — available to all players */}
        {onRest && (
          <>
            <button style={{ ...styles.toolBtn, color: '#aac4ff' }} onClick={() => onRest('short')}>
              🌙 Short Rest
            </button>
            <button style={{ ...styles.toolBtn, color: '#d4af37' }} onClick={() => onRest('long')}>
              ☀️ Long Rest
            </button>
          </>
        )}
      </div>

      <div style={styles.divider} />

      {/* DM Toggle + Leave */}
      <div style={styles.bottomControls}>
        {isDM && (
          <button
            onClick={toggleDmMode}
            style={{
              ...styles.dmToggleBtn,
              background: dmMode
                ? 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)'
                : 'rgba(255,255,255,0.04)',
              color: dmMode ? '#1a0e00' : 'var(--text-muted)',
              border: dmMode ? 'none' : '1px solid var(--border-light)',
              boxShadow: dmMode ? '0 0 12px rgba(212,175,55,0.25)' : 'none',
            }}
          >
            {dmMode ? '👑 Host Controls' : '🔒 Host Off'}
          </button>
        )}
        <button style={styles.leaveBtn} onClick={onLeave}>
          ⬅ Leave
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 240,
    minWidth: 240,
    background: 'linear-gradient(180deg, #180f08 0%, #110b05 100%)',
    borderRight: '1px solid rgba(212,175,55,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
  },
  sidebarTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--parchment-dim)',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'default',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
    flexShrink: 0,
  },
  charList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    padding: '6px 0',
  },
  emptyParty: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    textAlign: 'center',
    padding: '20px 16px',
    margin: 0,
    fontStyle: 'italic',
  },
  charCard: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderLeft: '2px solid transparent',
    transition: 'all 0.15s ease',
    background: 'transparent',
  },
  charCardDowned: {
    opacity: 0.55,
    borderLeft: '2px solid rgba(231,76,60,0.4)',
  },
  charRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  charAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.2)',
    flexShrink: 0,
  },
  charInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  charName: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '0.02em',
  },
  charSubtitle: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  downedBadge: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  conditionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
    paddingLeft: 46,
  },
  conditionBadge: {
    fontSize: '0.6rem',
    padding: '1px 6px',
    borderRadius: 3,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.04em',
    fontWeight: 600,
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 8,
    paddingLeft: 46,
    borderTop: '1px solid rgba(212,175,55,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.02em',
  },
  spellSlots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  slotBadge: {
    fontSize: '0.62rem',
    color: 'rgba(100,160,240,0.85)',
    background: 'rgba(100,160,240,0.1)',
    border: '1px solid rgba(100,160,240,0.2)',
    borderRadius: 3,
    padding: '1px 6px',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  toolSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '8px 10px',
  },
  toolBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    padding: '7px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 4,
    minHeight: 34,
    letterSpacing: '0.02em',
    transition: 'all 0.15s',
  },
  bottomControls: {
    display: 'flex',
    gap: 6,
    padding: '10px 10px 14px',
  },
  dmToggleBtn: {
    flex: 1,
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', Georgia, serif",
    minHeight: 38,
    letterSpacing: '0.02em',
    transition: 'all 0.2s ease',
  },
  leaveBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', Georgia, serif",
    minHeight: 38,
    flexShrink: 0,
  },
};
