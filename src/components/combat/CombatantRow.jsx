import { useState, useRef, useEffect } from 'react';
import { getTokenColor, CONDITIONS } from '../../lib/dice';
import { CONDITION_INFO } from '../../lib/conditionDescriptions';
import { miniBtn } from './combatStyles';

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

function DeathSaveTracker({ combatant, isActiveTurn, onRollSave, onStabilize }) {
  const { successes, failures, stable } = combatant.deathSaves || { successes: 0, failures: 0, stable: false };
  const isDead = failures >= 3;

  return (
    <div style={{ marginTop: 6, padding: '6px 8px', background: '#0f0804', border: `1px solid ${isDead ? '#922b21' : stable ? '#1e8449' : 'rgba(231,76,60,0.4)'}`, borderRadius: 5 }}>
      <div style={{ fontSize: '0.7rem', color: isDead ? '#e74c3c' : stable ? '#2ecc71' : '#f39c12', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>
        {isDead ? '💀 DEAD' : stable ? '💤 STABLE' : '⚠ DYING'}
      </div>
      {!isDead && !stable && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#2ecc71', marginBottom: 2 }}>Successes</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < successes ? '#2ecc71' : '#1a1006', border: '1px solid #2ecc71' }} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#e74c3c', marginBottom: 2 }}>Failures</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < failures ? '#e74c3c' : '#1a1006', border: '1px solid #e74c3c' }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onRollSave(combatant.id); }}
              disabled={!isActiveTurn}
              title={isActiveTurn ? 'Roll death saving throw' : "Only on this combatant's turn"}
              style={{ ...miniBtn, color: isActiveTurn ? '#f39c12' : 'var(--text-muted)', opacity: isActiveTurn ? 1 : 0.5, fontSize: '0.7rem' }}
            >
              🎲 Roll Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStabilize(combatant.id); }}
              style={{ ...miniBtn, color: '#2ecc71', fontSize: '0.7rem' }}
            >
              ✚ Stabilize
            </button>
          </div>
        </>
      )}
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
            <span key={c}
              title={CONDITION_INFO[c] || c}
              style={{ fontSize: '0.65rem', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#e88', borderRadius: 3, padding: '1px 4px' }}>
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
