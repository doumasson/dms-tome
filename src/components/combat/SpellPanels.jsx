import { useState } from 'react';
import { rollDamage, rollDie, getAbilityModifier, formatModifier, SAVE_NAMES } from '../../lib/dice';
import { COMBAT_SPELLS } from '../../lib/combatSpells';
import { apStyle } from './combatStyles';

const DAMAGE_TYPES = ['Fire', 'Cold', 'Lightning', 'Thunder', 'Acid', 'Poison', 'Radiant', 'Necrotic', 'Force', 'Psychic', 'Bludgeoning', 'Piercing', 'Slashing'];

// ─── Saving Throw Panel ───────────────────────────────────────────────────────

export function SavingThrowPanel({ combatants, onLog, onNarrate, onCancel }) {
  const [ability, setAbility] = useState('dex');
  const [dc, setDc] = useState(14);
  const [selectedIds, setSelectedIds] = useState([]);
  const [results, setResults] = useState(null);

  function toggleId(id) {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  // Per 5e rules: Paralyzed/Stunned/Incapacitated auto-fail STR and DEX saves
  const AUTO_FAIL_CONDITIONS = new Set(['Paralyzed', 'Stunned', 'Incapacitated']);
  const AUTO_FAIL_ABILITIES = new Set(['str', 'dex']);

  function rollSaves() {
    const targets = combatants.filter(c => selectedIds.includes(c.id) && c.currentHp > 0);
    const res = targets.map(t => {
      const autoFail = AUTO_FAIL_ABILITIES.has(ability) &&
        (t.conditions || []).some(cond => AUTO_FAIL_CONDITIONS.has(cond));
      if (autoFail) {
        return { name: t.name, d20: 1, mod: 0, total: 1, pass: false, autoFail: true };
      }
      const mod = getAbilityModifier(t.stats?.[ability] ?? 10);
      const d20 = rollDie(20);
      const total = d20 + mod;
      return { name: t.name, d20, mod, total, pass: total >= dc };
    });
    onLog(`Save (${SAVE_NAMES[ability]} DC ${dc}): ` + res.map(r =>
      `${r.name} ${r.pass ? '✓' : '✗'}(${r.autoFail ? 'auto-fail' : r.total})`
    ).join(', '));

    if (onNarrate) {
      const passed = res.filter(r => r.pass).map(r => r.name);
      const failed = res.filter(r => !r.pass).map(r => r.name);
      const parts = [];
      if (passed.length) parts.push(`Passed: ${passed.join(', ')}`);
      if (failed.length) parts.push(`Failed: ${failed.join(', ')}`);
      onNarrate(`[${SAVE_NAMES[ability]} Save DC ${dc}] ${parts.join(' | ')}`);
    }

    setResults(res);
  }

  if (results) {
    return (
      <div style={apStyle.panel}>
        <div style={apStyle.label}>{SAVE_NAMES[ability]} Save DC {dc}</div>
        {results.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
            <span style={{ color: r.pass ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
              {r.pass ? '✓ Pass' : '✗ Fail'}{' '}
              {r.autoFail
                ? '(auto-fail)'
                : `(${r.d20}${formatModifier(r.mod)}=${r.total})`
              }
            </span>
          </div>
        ))}
        <button onClick={onCancel} style={{ ...apStyle.btn, marginTop: 8 }}>Done</button>
      </div>
    );
  }

  return (
    <div style={apStyle.panel}>
      <div style={apStyle.label}>Saving Throw</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {Object.entries(SAVE_NAMES).map(([key, label]) => (
          <button key={key} onClick={() => setAbility(key)} style={{
            padding: '3px 7px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
            background: ability === key ? 'rgba(212,175,55,0.2)' : 'transparent',
            border: ability === key ? '1px solid var(--gold)' : '1px solid var(--border-light)',
            color: ability === key ? 'var(--gold)' : 'var(--text-muted)',
          }}>{key.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>DC:</label>
        <input
          type="number" value={dc} onChange={e => setDc(Number(e.target.value))}
          style={{ width: 56, background: '#1a0f06', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '4px 6px', fontSize: '0.85rem' }}
        />
      </div>
      <div style={apStyle.label}>Targets:</div>
      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
        {combatants.filter(c => c.currentHp > 0).map(c => (
          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleId(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={rollSaves} disabled={selectedIds.length === 0} style={apStyle.btn}>Roll</button>
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── AoE Damage Panel ────────────────────────────────────────────────────────

export function AoEPanel({ combatants, onApply, onCancel }) {
  const alive = combatants.filter(c => c.currentHp > 0);
  const [expr, setExpr] = useState('8d6');
  const [dmgType, setDmgType] = useState('Fire');
  const [rolled, setRolled] = useState(null);
  const [targetModes, setTargetModes] = useState(() =>
    Object.fromEntries(alive.map(c => [c.id, 'full']))
  );

  const half = rolled ? Math.floor(rolled.total / 2) : 0;

  function doRoll() {
    const result = rollDamage(expr);
    setRolled(result);
    setTargetModes(Object.fromEntries(alive.map(c => [c.id, 'full'])));
  }

  function setMode(id, mode) {
    setTargetModes(m => ({ ...m, [id]: mode }));
  }

  function setAllMode(mode, filter) {
    setTargetModes(m => {
      const next = { ...m };
      alive.forEach(c => { if (!filter || filter(c)) next[c.id] = mode; });
      return next;
    });
  }

  function apply() {
    const applications = alive
      .filter(c => targetModes[c.id] !== 'none')
      .map(c => ({ id: c.id, amount: targetModes[c.id] === 'half' ? half : rolled.total }));
    onApply(applications, rolled.total, dmgType);
  }

  if (!rolled) {
    return (
      <div style={apStyle.panel}>
        <div style={apStyle.label}>💥 AoE Damage</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            value={expr}
            onChange={e => setExpr(e.target.value)}
            placeholder="e.g. 8d6"
            style={{ flex: 1, background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.88rem' }}
          />
          <button onClick={doRoll} style={apStyle.btn}>Roll</button>
        </div>
        <select
          value={dmgType}
          onChange={e => setDmgType(e.target.value)}
          style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', marginBottom: 8 }}
        >
          {DAMAGE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={apStyle.panel}>
      <div style={{ textAlign: 'center', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid #2a1a0a' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expr} · {dmgType}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e74c3c', lineHeight: 1.1 }}>{rolled.total}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rolled.display} · ½ = {half}</div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {[
          { label: 'All Full',     action: () => setAllMode('full') },
          { label: 'All Half',     action: () => setAllMode('half') },
          { label: 'All None',     action: () => setAllMode('none') },
          { label: 'Enemies Full', action: () => setAllMode('full', c => c.type === 'enemy') },
          { label: 'Party Half',   action: () => setAllMode('half', c => c.type === 'player') },
        ].map(({ label, action }) => (
          <button key={label} onClick={action} style={{
            padding: '2px 7px', borderRadius: 3, fontSize: '0.65rem', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-muted)',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
        {alive.map(c => {
          const mode = targetModes[c.id] || 'none';
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ flex: 1, fontSize: '0.78rem', color: mode === 'none' ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
              {[
                { m: 'full', label: rolled.total, color: '#e74c3c' },
                { m: 'half', label: half,         color: '#e67e22' },
                { m: 'none', label: '—',           color: 'var(--text-muted)' },
              ].map(({ m, label, color }) => (
                <button
                  key={m}
                  onClick={() => setMode(c.id, m)}
                  style={{
                    padding: '2px 6px', borderRadius: 3, fontSize: '0.72rem', cursor: 'pointer', minWidth: 28, textAlign: 'center',
                    background: mode === m ? `${color}22` : 'transparent',
                    border: `1px solid ${mode === m ? color : 'var(--border-light)'}`,
                    color: mode === m ? color : 'var(--text-muted)',
                    fontWeight: mode === m ? 700 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={apply} style={apStyle.btn}>Apply</button>
        <button onClick={() => setRolled(null)} style={apStyle.cancel}>Re-roll</button>
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Concentrate Panel ────────────────────────────────────────────────────────

export function ConcentratePanel({ combatant, onSet, onClear, onCancel, dmMode }) {
  const spells = combatant.spells || [];
  const hasSpells = spells.length > 0;
  const [spell, setSpell] = useState(combatant.concentration || (hasSpells ? spells[0] : ''));

  return (
    <div style={apStyle.panel}>
      <div style={apStyle.label}>🎯 Concentration</div>
      {combatant.concentration && (
        <div style={{ fontSize: '0.8rem', color: '#9b59b6', marginBottom: 6 }}>
          Currently: <strong>{combatant.concentration}</strong>
        </div>
      )}
      {hasSpells ? (
        <select
          value={spell}
          onChange={e => setSpell(e.target.value)}
          style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.85rem', marginBottom: 8 }}
        >
          {spells.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : dmMode ? (
        <input
          autoFocus
          placeholder="Spell name (e.g. Hold Person)"
          value={spell}
          onChange={e => setSpell(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && spell.trim()) onSet(spell.trim()); }}
          style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 8 }}
        />
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>No concentration spells available.</div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        {(hasSpells || dmMode) && (
          <button onClick={() => spell.trim() && onSet(spell.trim())} disabled={!spell.trim()} style={{ ...apStyle.btn, opacity: spell.trim() ? 1 : 0.4 }}>
            Set
          </button>
        )}
        {combatant.concentration && (
          <button onClick={onClear} style={{ ...apStyle.cancel, color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)' }}>
            Drop
          </button>
        )}
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Spell Select Panel ───────────────────────────────────────────────────────

export function SpellSelectPanel({ combatant, onPick, onCancel }) {
  const spells = combatant.spells || [];
  const [filter, setFilter] = useState('');

  const knownNames = spells.filter(s => COMBAT_SPELLS[s]);
  const catalogNames = Object.keys(COMBAT_SPELLS).filter(s => !knownNames.includes(s));
  const allSpells = [...knownNames, ...catalogNames];

  const filtered = filter
    ? allSpells.filter(s => s.toLowerCase().includes(filter.toLowerCase()))
    : allSpells;

  const LEVEL_COLORS = ['#aaa', '#5b8fff', '#3498db', '#e67e22', '#e74c3c', '#9b59b6', '#1abc9c', '#e91e63', '#ff9800', '#f1c40f'];
  const AREA_ICONS = { single: '🎯', cone: '▲', sphere: '💥', line: '—' };

  return (
    <div style={apStyle.panel}>
      <div style={apStyle.label}>✨ Cast a Spell</div>
      <input
        autoFocus
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search spells…"
        style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.82rem', marginBottom: 6, boxSizing: 'border-box' }}
      />
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px 0' }}>No spells found.</div>}
        {filtered.map(name => {
          const def = COMBAT_SPELLS[name];
          const isKnown = knownNames.includes(name);
          const lvlColor = LEVEL_COLORS[Math.min(def.level, 9)];
          return (
            <button
              key={name}
              onClick={() => onPick(name)}
              style={{
                background: isKnown ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isKnown ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 4, padding: '5px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.9em', minWidth: 16 }}>{AREA_ICONS[def.areaType] || '✨'}</span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: isKnown ? '#d4af37' : 'var(--text-secondary)', fontWeight: isKnown ? 700 : 400 }}>{name}</span>
              {def.damage && (
                <span style={{ fontSize: '0.65rem', color: '#e74c3c', minWidth: 40, textAlign: 'right' }}>{def.damage}</span>
              )}
              <span style={{ fontSize: '0.6rem', color: lvlColor, minWidth: 20, textAlign: 'right', fontWeight: 700 }}>
                {def.level === 0 ? 'C' : def.level}
              </span>
            </button>
          );
        })}
      </div>
      <button onClick={onCancel} style={{ ...apStyle.cancel, marginTop: 6 }}>Cancel</button>
    </div>
  );
}
