import { rollInitiative, getAbilityModifier, formatModifier } from '../../lib/dice';
import { btn } from './combatStyles';

export default function InitiativePhase({ combatants, onSetInitiative, onBeginCombat, onCancel }) {
  const allSet = combatants.every(c => c.initiative !== null);

  function rollAll() {
    combatants.forEach(c => {
      const r = rollInitiative(c.stats?.dex);
      onSetInitiative(c.id, r.total);
    });
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: "'Cinzel', Georgia, serif", color: 'var(--gold)' }}>
          ⚔ Roll Initiative
        </h3>
        <button onClick={rollAll} style={btn.gold}>🎲 Roll All</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {combatants.map(c => {
          const dexMod = getAbilityModifier(c.stats?.dex ?? 10);
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#1a1006', border: '1px solid #2a1e10', borderRadius: 6, padding: '8px 12px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: c.type === 'enemy' ? '#c0392b' : '#1a5276',
              }} />
              <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 60 }}>
                DEX {formatModifier(dexMod)}
              </span>
              <input
                type="number"
                value={c.initiative ?? ''}
                onChange={e => onSetInitiative(c.id, e.target.value)}
                placeholder="—"
                style={{ width: 56, textAlign: 'center', background: '#0f0a04', border: `1px solid ${c.initiative !== null ? 'var(--gold)' : 'var(--border-light)'}`, borderRadius: 4, color: 'var(--text-primary)', padding: '5px 6px', fontSize: '0.88rem' }}
              />
              <button
                onClick={() => { const r = rollInitiative(c.stats?.dex); onSetInitiative(c.id, r.total); }}
                style={btn.small}
                title={`Roll 1d20${formatModifier(dexMod)}`}
              >
                d20
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBeginCombat} disabled={!allSet} style={{ ...btn.gold, opacity: allSet ? 1 : 0.4 }}>
          ⚔ Begin Combat →
        </button>
        <button onClick={onCancel} style={btn.ghost}>Cancel</button>
      </div>
      {!allSet && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Set initiative for all combatants to continue.
        </div>
      )}
    </div>
  );
}
