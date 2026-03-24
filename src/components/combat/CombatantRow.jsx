import { useState, useRef, useEffect } from 'react';
import { getTokenColor, CONDITIONS } from '../../lib/dice';
import { CONDITION_INFO } from '../../lib/conditionDescriptions';
import { miniBtn } from './combatStyles';
import Tooltip, { ConditionTooltip } from '../game/Tooltip';

export function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  const color = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#e67e22' : '#c0392b';
  return (
    <div style={{ height: 5, background: '#2a1a0a', borderRadius: 3, overflow: 'hidden', flex: 1, minWidth: 40 }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function ConditionPicker({ combatantId, conditions, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      {conditions.map(c => (
        <span key={c} onClick={() => onRemove(combatantId, c)}
          title={CONDITION_INFO[c] ? `${c}: ${CONDITION_INFO[c]}\n(Click to remove)` : 'Click to remove'}
          style={{ fontSize: '0.65rem', background: 'rgba(231,76,60,0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: 3, padding: '1px 5px', marginRight: 2, cursor: 'pointer' }}>
          {c}
        </span>
      ))}
      <button onClick={() => setOpen(o => !o)} title="Add condition"
        style={{ fontSize: '0.65rem', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>
        +
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, zIndex: 50,
          background: '#1e1208', border: '1px solid var(--border-gold)', borderRadius: 6,
          padding: 6, display: 'flex', flexWrap: 'wrap', gap: 4, width: 220,
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        }}>
          {CONDITIONS.filter(c => !conditions.includes(c)).map(c => (
            <button key={c} onClick={() => { onAdd(combatantId, c); setOpen(false); }}
              style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* PLACEHOLDER ART: needs real dark fantasy assets for production */
function DeathSaveTracker({ combatant, isActiveTurn, onRollSave, onStabilize }) {
  const { successes, failures, stable } = combatant.deathSaves || { successes: 0, failures: 0, stable: false };
  const isDead = failures >= 3;

  const borderColor = isDead ? '#922b21' : stable ? '#1e8449' : 'rgba(231,76,60,0.5)';
  const glowColor = isDead ? 'rgba(231,76,60,0.15)' : stable ? 'rgba(46,204,113,0.1)' : 'rgba(243,156,18,0.1)';

  return (
    <div style={{
      marginTop: 6, padding: '8px 10px',
      background: `linear-gradient(180deg, rgba(15,8,4,0.95), rgba(10,6,2,0.98))`,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      boxShadow: `0 2px 8px rgba(0,0,0,0.4), inset 0 0 12px ${glowColor}`,
    }}>
      {/* Status header with icon */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: isDead || stable ? 0 : 6,
      }}>
        <span style={{ fontSize: '1rem' }}>{isDead ? '💀' : stable ? '💤' : '⚠️'}</span>
        <span style={{
          fontFamily: '"Cinzel", serif',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isDead ? '#e74c3c' : stable ? '#2ecc71' : '#f39c12',
          textShadow: `0 0 6px ${isDead ? 'rgba(231,76,60,0.3)' : stable ? 'rgba(46,204,113,0.3)' : 'rgba(243,156,18,0.3)'}`,
        }}>
          {isDead ? 'Dead' : stable ? 'Stable' : 'Dying'}
        </span>
        {/* Pulse indicator for dying */}
        {!isDead && !stable && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#f39c12',
            boxShadow: '0 0 6px rgba(243,156,18,0.6)',
            animation: 'deathPulse 1.2s ease-in-out infinite',
          }} />
        )}
      </div>

      {!isDead && !stable && (
        <>
          {/* Save pips — ornate circles */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{
                fontFamily: '"Cinzel", serif',
                fontSize: '0.55rem', color: 'rgba(46,204,113,0.6)',
                marginBottom: 3, letterSpacing: '0.08em', fontWeight: 600,
              }}>Saves</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill={i < successes ? '#2ecc71' : 'rgba(16,10,4,0.8)'}
                      stroke={i < successes ? '#2ecc71' : 'rgba(46,204,113,0.3)'}
                      strokeWidth="1.2" />
                    {i < successes && (
                      <polyline points="5,8 7,10.5 11,5.5" fill="none" stroke="#0a0604" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                ))}
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: '"Cinzel", serif',
                fontSize: '0.55rem', color: 'rgba(231,76,60,0.6)',
                marginBottom: 3, letterSpacing: '0.08em', fontWeight: 600,
              }}>Fails</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill={i < failures ? '#e74c3c' : 'rgba(16,10,4,0.8)'}
                      stroke={i < failures ? '#e74c3c' : 'rgba(231,76,60,0.3)'}
                      strokeWidth="1.2" />
                    {i < failures && (
                      <g stroke="#0a0604" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" />
                        <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" />
                      </g>
                    )}
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onRollSave(combatant.id); }}
              disabled={!isActiveTurn}
              title={isActiveTurn ? 'Roll death saving throw' : "Only on this combatant's turn"}
              style={{
                ...miniBtn,
                fontFamily: '"Cinzel", serif',
                fontSize: '0.65rem', fontWeight: 700,
                color: isActiveTurn ? '#f39c12' : 'rgba(180,150,100,0.3)',
                background: isActiveTurn ? 'rgba(243,156,18,0.1)' : 'transparent',
                border: `1px solid ${isActiveTurn ? 'rgba(243,156,18,0.4)' : 'rgba(100,80,50,0.2)'}`,
                borderRadius: 5, padding: '6px 12px',
                opacity: isActiveTurn ? 1 : 0.5,
                cursor: isActiveTurn ? 'pointer' : 'not-allowed',
                minHeight: 32,
              }}
            >
              🎲 Roll Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStabilize(combatant.id); }}
              style={{
                ...miniBtn,
                fontFamily: '"Cinzel", serif',
                fontSize: '0.65rem', fontWeight: 700,
                color: '#5dbd84',
                background: 'rgba(46,204,113,0.08)',
                border: '1px solid rgba(46,204,113,0.3)',
                borderRadius: 5, padding: '6px 12px',
                minHeight: 32,
              }}
            >
              ✚ Stabilize
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes deathPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

export default function CombatantRow({ combatant, isActive, isSelected, colorIndex, dmMode, onSelectToken, onHpChange, onAddCondition, onRemoveCondition, onRollDeathSave, onStabilize }) {
  const [editing, setEditing] = useState(false);
  const [hpInput, setHpInput] = useState('');
  const dying = combatant.currentHp <= 0 && combatant.type === 'player' && !(combatant.deathSaves?.failures >= 3);
  const dead = combatant.currentHp <= 0 && (combatant.type === 'enemy' || combatant.deathSaves?.failures >= 3);

  function commitHp() {
    const val = parseInt(hpInput);
    if (!isNaN(val)) onHpChange(combatant.id, val - combatant.currentHp);
    setEditing(false);
  }

  const tokenColor = getTokenColor(combatant.type, colorIndex);

  return (
    <div
      onClick={() => onSelectToken(combatant.id)}
      style={{
        padding: '7px 10px',
        borderRadius: 6,
        border: isActive ? '1px solid rgba(241,196,15,0.6)' : isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
        background: isActive ? 'rgba(241,196,15,0.07)' : isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
        cursor: 'pointer',
        opacity: dead ? 0.5 : 1,
        transition: 'background 0.15s',
        marginBottom: 3,
      }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: (dead || dying) ? (dying ? '#f39c12' : '#444') : tokenColor, flexShrink: 0 }} />
        <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', color: isActive ? 'var(--gold)' : dying ? '#f39c12' : 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isActive && '▶ '}{combatant.name}{dead && ' ☠'}{dying && ' ⚠'}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          AC {combatant.ac}
        </span>
      </div>

      {/* HP row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <HpBar current={combatant.currentHp} max={combatant.maxHp} />
        {editing ? (
          <input
            autoFocus
            type="number"
            value={hpInput}
            onChange={e => setHpInput(e.target.value)}
            onBlur={commitHp}
            onKeyDown={e => { if (e.key === 'Enter') commitHp(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            style={{ width: 52, fontSize: '0.8rem', background: '#1a0f06', border: '1px solid var(--gold)', borderRadius: 4, color: 'var(--text-primary)', padding: '2px 4px', textAlign: 'center' }}
          />
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); setHpInput(String(combatant.currentHp)); setEditing(true); }}
            title="Click to set HP"
            style={{ fontSize: '0.75rem', color: (dead || dying) ? '#e74c3c' : 'var(--text-secondary)', flexShrink: 0, cursor: 'text', minWidth: 48, textAlign: 'right' }}
          >
            {combatant.currentHp}/{combatant.maxHp}
          </span>
        )}
        {!dying && <button onClick={(e) => { e.stopPropagation(); onHpChange(combatant.id, -5); }} style={miniBtn}>-5</button>}
        <button onClick={(e) => { e.stopPropagation(); onHpChange(combatant.id, 5); }} style={{ ...miniBtn, color: '#2ecc71' }}>+5</button>
      </div>

      {/* Concentration badge */}
      {combatant.concentration && !dying && !dead && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: '0.65rem', background: 'rgba(155,89,182,0.2)', border: '1px solid rgba(155,89,182,0.5)', color: '#9b59b6', borderRadius: 3, padding: '1px 6px' }}>
            🎯 {combatant.concentration}
          </span>
        </div>
      )}

      {/* Death saves (player at 0 HP) */}
      {dying && (
        <div onClick={e => e.stopPropagation()}>
          <DeathSaveTracker
            combatant={combatant}
            isActiveTurn={isActive}
            onRollSave={onRollDeathSave}
            onStabilize={onStabilize}
          />
        </div>
      )}

      {/* Conditions — DM can add/remove; players see them read-only */}
      {dmMode ? (
        <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
          <ConditionPicker
            combatantId={combatant.id}
            conditions={combatant.conditions}
            onAdd={onAddCondition}
            onRemove={onRemoveCondition}
          />
        </div>
      ) : combatant.conditions?.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {combatant.conditions.map(c => (
            <Tooltip key={c} content={<ConditionTooltip name={c} description={CONDITION_INFO[c]} />} position="bottom">
              <span
                style={{ fontSize: '0.65rem', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#e88', borderRadius: 3, padding: '1px 4px', cursor: 'help' }}>
                {c}
              </span>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
