import { useRef, useEffect, useMemo } from 'react';
import { calculateEncounterDifficulty } from '../../lib/encounterDifficulty';

const CONDITION_ICONS = {
  Blinded: '👁', Charmed: '♥', Deafened: '🔇', Frightened: '!',
  Grappled: '✊', Incapacitated: '✕', Invisible: '◌', Paralyzed: '⚡',
  Petrified: '🪨', Poisoned: '☠', Prone: '⬇', Restrained: '⛓',
  Stunned: '★', Unconscious: '💤', Burning: '🔥', Frozen: '❄',
  Blessed: '✦', Hasted: '»', Hexed: '⬡', Concentrating: '◎',
};

const CONDITION_COLORS = {
  Blinded: '#888', Charmed: '#ff69b4', Deafened: '#777', Frightened: '#9933cc',
  Grappled: '#cc6633', Incapacitated: '#666', Invisible: '#aaddff', Paralyzed: '#888',
  Petrified: '#999', Poisoned: '#44cc44', Prone: '#aa8844', Restrained: '#8866aa',
  Stunned: '#ffff44', Unconscious: '#666', Burning: '#ff6633', Frozen: '#6688ff',
  Blessed: '#ffd700', Hasted: '#ffd700', Hexed: '#9933cc', Concentrating: '#4488ff',
};

/**
 * TurnOrderBar — Horizontal combat initiative strip
 * Shows combatants as portrait circles in turn order with active highlight
 */
export default function TurnOrderBar({ combatants = [], currentTurn = 0, round = 1, onTokenClick }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll to active combatant
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentTurn]);

  // Calculate encounter difficulty
  const difficulty = useMemo(() => {
    const players = combatants.filter(c => c.type === 'player');
    const enemies = combatants.filter(c => c.type === 'enemy' && (c.currentHp ?? c.hp ?? 0) > 0);
    return calculateEncounterDifficulty(players, enemies);
  }, [combatants]);

  if (combatants.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(20,12,4,0.95) 0%, rgba(30,18,8,0.9) 100%)',
      borderBottom: '2px solid rgba(212,175,55,0.4)',
      padding: '6px 10px 8px',
    }}>
      {/* Round indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6, padding: '0 2px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '0.65rem', color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Round {round}
          </span>
          <div style={{
            width: 4, height: 4, borderRadius: '50%', background: '#d4af37', opacity: 0.5,
          }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {combatants[currentTurn]?.name}'s turn
          </span>
        </div>
        {/* Difficulty badge */}
        {difficulty.rating !== 'Unknown' && (
          <span style={{
            fontSize: '0.55rem', fontWeight: 700,
            color: difficulty.color,
            background: `${difficulty.color}15`,
            border: `1px solid ${difficulty.color}44`,
            borderRadius: 3, padding: '1px 6px',
          }}>
            {difficulty.rating}
          </span>
        )}
        <span style={{
          fontSize: '0.6rem', color: 'var(--text-muted)',
        }}>
          {currentTurn + 1}/{combatants.length}
        </span>
      </div>

      {/* Scrollable turn order strip */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 4, overflowX: 'auto', overflowY: 'hidden',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          padding: '2px 0',
        }}
      >
        {combatants.map((c, i) => {
          const isActive = i === currentTurn;
          const isDead = (c.currentHp ?? c.hp ?? 0) <= 0;
          const hpPct = Math.max(0, Math.min(1, (c.currentHp ?? c.hp ?? 0) / (c.maxHp ?? c.hp ?? 1)));
          const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
          const isEnemy = c.type === 'enemy';
          const conditions = c.conditions || [];
          const isPast = i < currentTurn;

          return (
            <div
              key={c.id || i}
              ref={isActive ? activeRef : null}
              onClick={() => onTokenClick?.(c.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 56, maxWidth: 64, cursor: 'pointer',
                opacity: isDead ? 0.35 : isPast ? 0.6 : 1,
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              {/* Active turn arrow */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderTop: '5px solid #ffd700',
                  animation: 'turnArrowBounce 1s ease-in-out infinite',
                }} />
              )}

              {/* Portrait circle */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', position: 'relative',
                background: isEnemy
                  ? 'linear-gradient(135deg, #3d1111 0%, #1a0808 100%)'
                  : 'linear-gradient(135deg, #0f2940 0%, #081520 100%)',
                border: `2px solid ${isActive ? '#ffd700' : isEnemy ? 'rgba(192,57,43,0.6)' : 'rgba(52,152,219,0.6)'}`,
                boxShadow: isActive
                  ? '0 0 12px rgba(255,215,0,0.5), 0 0 4px rgba(255,215,0,0.3)'
                  : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}>
                {/* Portrait image or fallback initial */}
                {c.portrait ? (
                  <img src={c.portrait} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%',
                  }} />
                ) : (
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 700,
                    color: isEnemy ? '#e74c3c' : '#4dd0e1',
                  }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </span>
                )}

                {/* Dead overlay */}
                {isDead && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>💀</div>
                )}

                {/* HP ring (arc around portrait) */}
                {!isDead && (
                  <svg style={{
                    position: 'absolute', inset: -2, width: 42, height: 42,
                    transform: 'rotate(-90deg)', pointerEvents: 'none',
                  }}>
                    <circle cx="21" cy="21" r="19" fill="none"
                      stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" />
                    <circle cx="21" cy="21" r="19" fill="none"
                      stroke={hpColor} strokeWidth="2.5"
                      strokeDasharray={`${hpPct * 119.4} 119.4`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.3s ease' }}
                    />
                  </svg>
                )}
              </div>

              {/* Initiative badge */}
              <div style={{
                position: 'absolute', top: 0, right: 2,
                background: isActive ? '#ffd700' : 'rgba(0,0,0,0.8)',
                color: isActive ? '#000' : '#d4af37',
                fontSize: '0.55rem', fontWeight: 700,
                padding: '1px 3px', borderRadius: 3, lineHeight: 1,
                border: `1px solid ${isActive ? '#ffd700' : 'rgba(212,175,55,0.3)'}`,
                minWidth: 14, textAlign: 'center',
              }}>
                {c.initiative ?? '—'}
              </div>

              {/* Name */}
              <div style={{
                fontSize: '0.6rem', marginTop: 3,
                color: isActive ? '#ffd700' : isEnemy ? '#ff8888' : '#88ccdd',
                fontWeight: isActive ? 700 : 400,
                textAlign: 'center', lineHeight: 1.1,
                maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {c.name}
              </div>

              {/* HP text */}
              <div style={{
                fontSize: '0.5rem', color: hpColor,
                fontWeight: 600, lineHeight: 1,
              }}>
                {isDead ? 'DEAD' : `${c.currentHp ?? c.hp}/${c.maxHp ?? c.hp}`}
              </div>

              {/* Condition icons row */}
              {conditions.length > 0 && (
                <div style={{
                  display: 'flex', gap: 1, marginTop: 1,
                  justifyContent: 'center', flexWrap: 'wrap', maxWidth: 60,
                }}>
                  {conditions.slice(0, 3).map(cond => (
                    <span key={cond} title={cond} style={{
                      fontSize: '0.5rem',
                      background: `${CONDITION_COLORS[cond] || '#888'}22`,
                      color: CONDITION_COLORS[cond] || '#888',
                      borderRadius: 2, padding: '0px 2px', lineHeight: 1.2,
                      border: `1px solid ${CONDITION_COLORS[cond] || '#888'}44`,
                    }}>
                      {CONDITION_ICONS[cond] || cond[0]}
                    </span>
                  ))}
                  {conditions.length > 3 && (
                    <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)' }}>
                      +{conditions.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSS for arrow animation */}
      <style>{`
        @keyframes turnArrowBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
