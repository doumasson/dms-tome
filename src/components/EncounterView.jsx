import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import useStore from '../store/useStore';
import {
  rollDie, rollDamage, rollInitiative, parseAttackBonus,
  getAbilityModifier, formatModifier, CONDITIONS, SAVE_NAMES, getTokenColor,
} from '../lib/dice';
import LootGenerator from './LootGenerator';
import PartyPanel from './PartyPanel';
import CharDetailPanel from './CharDetailPanel';
import { crToXp } from '../lib/xpTable';
import { CONDITION_INFO } from '../lib/conditionDescriptions';
import { broadcastPlayerMove, broadcastEncounterAction } from '../lib/liveChannel';

const MAP_W = 10;
const MAP_H = 8;
const CELL_PX = 52; // desktop default

function useWindowWidth() {
  return useSyncExternalStore(
    cb => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerWidth,
  );
}

function getCellPx(width) {
  if (width < 480)  return 32;
  if (width < 768)  return 40;
  return CELL_PX;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  const color = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#e67e22' : '#c0392b';
  return (
    <div style={{ height: 5, background: '#2a1a0a', borderRadius: 3, overflow: 'hidden', flex: 1, minWidth: 40 }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

// Per-type index map for coloring tokens consistently
function buildTypeIndex(combatants) {
  const idx = {};
  combatants.forEach((c) => {
    if (!idx[c.type]) idx[c.type] = {};
    if (idx[c.type][c.id] === undefined) {
      idx[c.type][c.id] = Object.keys(idx[c.type]).length;
    }
  });
  return idx;
}

// ─── Token ────────────────────────────────────────────────────────────────────

function Token({ combatant, colorIndex, isSelected, isActive, onClick, cellPx = CELL_PX }) {
  const color = getTokenColor(combatant.type, colorIndex);
  const pct = combatant.maxHp > 0 ? combatant.currentHp / combatant.maxHp : 0;
  const ring = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  const dead = combatant.currentHp <= 0;
  const dying = dead && combatant.type === 'player' && !(combatant.deathSaves?.failures >= 3);
  const initials = combatant.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasPortrait = !!combatant.portrait;
  const borderColor = isSelected ? '#fff' : isActive ? '#f1c40f' : ring;
  const size = cellPx - 6;

  return (
    <div
      onClick={onClick}
      title={`${combatant.name} • HP ${combatant.currentHp}/${combatant.maxHp} • AC ${combatant.ac}`}
      style={{
        position: 'absolute', top: 3, left: 3,
        width: size, height: size,
        borderRadius: '50%',
        border: `3px solid ${borderColor}`,
        background: dead && !hasPortrait ? '#2a1a0a' : !hasPortrait ? color : 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: dead ? '#555' : '#fff',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5)' : isActive ? '0 0 10px rgba(241,196,15,0.6)' : '0 2px 6px rgba(0,0,0,0.6)',
        userSelect: 'none', zIndex: 2,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        opacity: dead && !dying ? 0.45 : 1,
      }}
    >
      {hasPortrait ? (
        <img
          src={combatant.portrait}
          alt={combatant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', filter: dead ? 'grayscale(1) brightness(0.5)' : 'none' }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <>
          {initials}
          {dead && <span style={{ fontSize: 9, lineHeight: 1 }}>☠</span>}
        </>
      )}
      {/* Overlay skull for dead portrait tokens */}
      {dead && hasPortrait && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>☠</div>
      )}
      {/* Dying pulse ring */}
      {dying && (
        <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid #f39c12', animation: 'goldPulse 1.5s infinite', pointerEvents: 'none' }} />
      )}
    </div>
  );
}

// ─── Battle Map ───────────────────────────────────────────────────────────────

function BattleMap({ combatants, selectedToken, activeCombatantId, onCellClick, onTokenClick, cellPx = CELL_PX }) {
  const posMap = {};
  const typeIdx = buildTypeIndex(combatants);

  combatants.forEach((c) => {
    if (c.position) posMap[`${c.position.x},${c.position.y}`] = c;
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${MAP_W}, ${cellPx}px)`,
      gridTemplateRows: `repeat(${MAP_H}, ${cellPx}px)`,
      border: '2px solid #3a2a14',
      borderRadius: 4,
      overflow: 'hidden',
      background: '#130d06',
      flexShrink: 0,
    }}>
      {Array.from({ length: MAP_W * MAP_H }).map((_, i) => {
        const x = i % MAP_W;
        const y = Math.floor(i / MAP_W);
        const c = posMap[`${x},${y}`];
        const isActive = c?.id === activeCombatantId;
        const isSelected = c?.id === selectedToken;
        const canDrop = !!selectedToken && !c;

        return (
          <div
            key={i}
            onClick={() => onCellClick(x, y)}
            style={{
              position: 'relative',
              border: '1px solid #2a1a0a',
              background: isActive && c
                ? 'rgba(241,196,15,0.08)'
                : canDrop
                  ? 'rgba(255,255,255,0.07)'
                  : (x + y) % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
              cursor: canDrop ? 'crosshair' : 'default',
            }}
          >
            {c && (
              <Token
                combatant={c}
                colorIndex={typeIdx[c.type]?.[c.id] || 0}
                isSelected={isSelected}
                isActive={isActive}
                onClick={(e) => { e.stopPropagation(); onTokenClick(c.id); }}
                cellPx={cellPx}
              />
            )}
            {isActive && c && (
              <div style={{
                position: 'absolute', inset: 0,
                border: '2px solid rgba(241,196,15,0.5)',
                borderRadius: 2, pointerEvents: 'none',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Attack Panel ─────────────────────────────────────────────────────────────

const ADV_MODES = ['normal', 'advantage', 'disadvantage'];
const ADV_LABELS = { normal: 'Normal', advantage: 'Advantage', disadvantage: 'Disadvantage' };
const ADV_COLORS = { normal: 'var(--text-muted)', advantage: '#2ecc71', disadvantage: '#e74c3c' };

function rollWithAdvantage(mode) {
  const a = rollDie(20);
  const b = rollDie(20);
  if (mode === 'advantage') return { d20: Math.max(a, b), alt: Math.min(a, b) };
  if (mode === 'disadvantage') return { d20: Math.min(a, b), alt: Math.max(a, b) };
  return { d20: a, alt: null };
}

function AttackPanel({ attacker, combatants, onResolve, onCancel }) {
  const hasWeapons = attacker.attacks && attacker.attacks.length > 0;
  const [weapon, setWeapon] = useState(hasWeapons && attacker.attacks.length === 1 ? attacker.attacks[0] : null);
  const [advMode, setAdvMode] = useState('normal');
  const [result, setResult] = useState(null);

  const targets = combatants.filter(c => c.id !== attacker.id && c.currentHp > 0);

  function doAttack(target) {
    const w = weapon || { name: 'Unarmed Strike', bonus: '+0', damage: '1' };
    const bonus = parseAttackBonus(w.bonus);
    const { d20, alt } = rollWithAdvantage(advMode);
    const total = d20 + bonus;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1 && advMode !== 'advantage';
    const hit = !isFumble && (isCrit || total >= (target.ac || 10));
    let damage = 0;
    let dmgDisplay = '';
    if (hit) {
      const rolled = rollDamage(w.damage);
      damage = isCrit ? rolled.total * 2 : rolled.total;
      dmgDisplay = isCrit ? `CRIT ×2 = ${damage}` : rolled.display;
    }
    const advSuffix = advMode !== 'normal' ? ` (${advMode}, dropped ${alt})` : '';
    const entry = hit
      ? `${attacker.name} → ${target.name}: HIT! d20(${d20})${bonus >= 0 ? '+' : ''}${bonus}=${total} vs AC ${target.ac}${advSuffix}. Dmg: ${damage} (${w.name})`
      : `${attacker.name} → ${target.name}: MISS. d20(${d20})${bonus >= 0 ? '+' : ''}${bonus}=${total} vs AC ${target.ac}${advSuffix} (${w.name})`;
    onResolve(hit ? target.id : null, damage, entry);
    setResult({ hit, isCrit, isFumble, d20, alt, bonus, total, ac: target.ac, damage, dmgDisplay, targetName: target.name });
  }

  function autoAttack() {
    if (targets.length === 0) return;
    doAttack(targets[Math.floor(Math.random() * targets.length)]);
  }

  if (result) {
    return (
      <div style={apStyle.panel}>
        {result.isCrit && <div style={{ color: '#f1c40f', fontWeight: 700, textAlign: 'center' }}>⚡ CRITICAL HIT!</div>}
        {result.isFumble && <div style={{ color: '#e74c3c', fontWeight: 700, textAlign: 'center' }}>💀 CRITICAL MISS!</div>}
        <div style={{ color: result.hit ? '#2ecc71' : '#e74c3c', fontWeight: 700, textAlign: 'center', fontSize: '1rem' }}>
          {result.hit ? '✔ HIT' : '✘ MISS'}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center' }}>
          {attacker.name} → {result.targetName}<br />
          d20(<strong>{result.d20}</strong>){result.alt !== null && <span style={{ color: 'var(--text-muted)' }}> / {result.alt}</span>}
          {' '}{result.bonus >= 0 ? '+' : ''}{result.bonus} = <strong>{result.total}</strong> vs AC {result.ac}
          {result.hit && <><br />Damage: <strong>{result.damage}</strong> ({result.dmgDisplay})</>}
        </div>
        <button onClick={onCancel} style={apStyle.btn}>Done</button>
      </div>
    );
  }

  if (!weapon) {
    return (
      <div style={apStyle.panel}>
        <div style={apStyle.label}>Choose weapon</div>
        {hasWeapons ? attacker.attacks.map((w, i) => (
          <button key={i} onClick={() => setWeapon(w)} style={apStyle.targetBtn}>
            {w.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({w.bonus}, {w.damage})</span>
          </button>
        )) : (
          <button onClick={() => setWeapon({ name: 'Unarmed Strike', bonus: '+0', damage: '1' })} style={apStyle.targetBtn}>
            Unarmed Strike
          </button>
        )}
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={apStyle.panel}>
      {/* Adv / Dis toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {ADV_MODES.map(m => (
          <button key={m} onClick={() => setAdvMode(m)} style={{
            flex: 1, padding: '4px 6px', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', fontWeight: advMode === m ? 700 : 400,
            background: advMode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: `1px solid ${advMode === m ? ADV_COLORS[m] : 'var(--border-light)'}`,
            color: ADV_COLORS[m],
          }}>
            {ADV_LABELS[m]}
          </button>
        ))}
      </div>
      <div style={apStyle.label}>
        {weapon.name} — pick target
        <button onClick={autoAttack} style={apStyle.auto}>🎲 Auto</button>
      </div>
      {targets.length === 0
        ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No valid targets.</div>
        : targets.map(t => (
          <button key={t.id} onClick={() => doAttack(t)} style={apStyle.targetBtn}>
            {t.name}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> AC {t.ac} · {t.currentHp}/{t.maxHp}HP</span>
          </button>
        ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {attacker.attacks.length > 1 && (
          <button onClick={() => setWeapon(null)} style={apStyle.cancel}>← Back</button>
        )}
        <button onClick={onCancel} style={apStyle.cancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Saving Throw Panel ───────────────────────────────────────────────────────

function SavingThrowPanel({ combatants, onLog, onCancel }) {
  const [ability, setAbility] = useState('dex');
  const [dc, setDc] = useState(14);
  const [selectedIds, setSelectedIds] = useState([]);
  const [results, setResults] = useState(null);

  function toggleId(id) {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  function rollSaves() {
    const targets = combatants.filter(c => selectedIds.includes(c.id) && c.currentHp > 0);
    const res = targets.map(t => {
      const mod = getAbilityModifier(t.stats?.[ability] ?? 10);
      const d20 = rollDie(20);
      const total = d20 + mod;
      return { name: t.name, d20, mod, total, pass: total >= dc };
    });
    onLog(`Save (${SAVE_NAMES[ability]} DC ${dc}): ` + res.map(r => `${r.name} ${r.pass ? '✓' : '✗'}(${r.total})`).join(', '));
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
              {r.pass ? '✓ Pass' : '✗ Fail'} ({r.d20}{formatModifier(r.mod)}={r.total})
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

const DAMAGE_TYPES = ['Fire', 'Cold', 'Lightning', 'Thunder', 'Acid', 'Poison', 'Radiant', 'Necrotic', 'Force', 'Psychic', 'Bludgeoning', 'Piercing', 'Slashing'];

function AoEPanel({ combatants, onApply, onCancel }) {
  const alive = combatants.filter(c => c.currentHp > 0);
  const [expr, setExpr] = useState('8d6');
  const [dmgType, setDmgType] = useState('Fire');
  const [rolled, setRolled] = useState(null);
  // targetModes: { [id]: 'full' | 'half' | 'none' }
  const [targetModes, setTargetModes] = useState(() =>
    Object.fromEntries(alive.map(c => [c.id, 'full']))
  );

  const half = rolled ? Math.floor(rolled.total / 2) : 0;

  function doRoll() {
    const result = rollDamage(expr);
    setRolled(result);
    // Reset modes to full for all alive targets on each roll
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

  // ── Pre-roll ──
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

  // ── Post-roll: assign per-target ──
  return (
    <div style={apStyle.panel}>
      {/* Result header */}
      <div style={{ textAlign: 'center', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid #2a1a0a' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expr} · {dmgType}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e74c3c', lineHeight: 1.1 }}>{rolled.total}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rolled.display} · ½ = {half}</div>
      </div>

      {/* Quick-select row */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {[
          { label: 'All Full',    action: () => setAllMode('full') },
          { label: 'All Half',    action: () => setAllMode('half') },
          { label: 'All None',    action: () => setAllMode('none') },
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

      {/* Per-target mode */}
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

function ConcentratePanel({ combatant, onSet, onClear, onCancel, dmMode }) {
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

// ─── Condition Picker ─────────────────────────────────────────────────────────

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

// ─── Death Save Tracker ───────────────────────────────────────────────────────

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
              title={isActiveTurn ? 'Roll death saving throw' : 'Only on this combatant\'s turn'}
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

// ─── Combatant Row (sidebar) ──────────────────────────────────────────────────

function CombatantRow({ combatant, isActive, isSelected, colorIndex, dmMode, onSelectToken, onHpChange, onAddCondition, onRemoveCondition, onRollDeathSave, onStabilize }) {
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
        {/* Quick ±5 hp — hide damage button while dying (hitting 0 hp players via UI applies PHB hit rule) */}
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

      {/* Conditions */}
      {dmMode && (
        <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
          <ConditionPicker
            combatantId={combatant.id}
            conditions={combatant.conditions}
            onAdd={onAddCondition}
            onRemove={onRemoveCondition}
          />
        </div>
      )}
    </div>
  );
}

// ─── Initiative Phase ─────────────────────────────────────────────────────────

function InitiativePhase({ combatants, onSetInitiative, onBeginCombat, onCancel }) {
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

// ─── Combat Phase ─────────────────────────────────────────────────────────────

function CombatPhase({ encounter, dmMode, myCharacter, characters, onNextTurn, onEndEncounter, onDamage, onHeal, onLog, onAddCondition, onRemoveCondition, onMoveToken, onRollDeathSave, onStabilize, onSetConcentration, onClearConcentration, onShortRest, onLongRest }) {
  const currentUser = useStore(s => s.user);
  const { combatants, currentTurn, round, log } = encounter;
  const [selectedToken, setSelectedToken] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'attack' | 'aoe' | 'save' | 'concentrate'
  const [showLoot, setShowLoot] = useState(false);
  const [mobileTab, setMobileTab] = useState('battle'); // 'party' | 'battle' | 'actions'
  const logRef = useRef();
  const winWidth = useWindowWidth();
  const isMobile = winWidth < 640;
  const isTablet = winWidth >= 640 && winWidth < 900;
  const cellPx = getCellPx(winWidth);

  const activeCombatant = combatants[currentTurn] || null;

  // Turn & action authorization
  const isMyTurn = !!(activeCombatant && myCharacter && (
    activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
  ));
  const canAct = dmMode || isMyTurn;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log.length]);

  function handleTokenClick(id) {
    setSelectedToken(prev => prev === id ? null : id);
    setPanel(null);
  }

  function handleCellClick(x, y) {
    if (!selectedToken) return;

    const token = combatants.find(c => c.id === selectedToken);
    if (!token) { setSelectedToken(null); return; }

    if (!dmMode) {
      // Players can only move their own token
      const isMyToken = myCharacter && (
        token.id === myCharacter.id || token.name === myCharacter.name
      );
      if (!isMyToken) { setSelectedToken(null); return; }

      // During combat: only on your turn
      if (encounter.phase === 'combat') {
        const isMyTurn = activeCombatant && myCharacter && (
          activeCombatant.id === myCharacter.id ||
          activeCombatant.name === myCharacter.name
        );
        if (!isMyTurn) { setSelectedToken(null); return; }
        // No movement remaining
        if ((token.remainingMove ?? 0) <= 0) { setSelectedToken(null); return; }
      }
    }

    // Calculate movement cost (Chebyshev distance — diagonal = 1 cell like 5e)
    const from = token.position;
    let cost = 1;
    if (from) {
      const dx = Math.abs(x - from.x);
      const dy = Math.abs(y - from.y);
      cost = Math.max(dx, dy);
    }

    onMoveToken(selectedToken, x, y, cost);

    // Players broadcast their movement so DM and others see it immediately
    if (!dmMode) {
      broadcastPlayerMove(selectedToken, x, y, cost, currentUser?.id);
    }

    setSelectedToken(null);
  }

  function handleHpChange(id, delta) {
    if (delta < 0) onDamage(id, -delta);
    else onHeal(id, delta);
  }

  function handleAttackResolve(targetId, damage, logEntry) {
    if (targetId) onDamage(targetId, damage);
    onLog(logEntry);
  }

  function handleAoEApply(applications, total, dmgType) {
    applications.forEach(({ id, amount }) => onDamage(id, amount));
    const summary = applications
      .map(({ id, amount }) => {
        const c = combatants.find(x => x.id === id);
        return `${c?.name ?? id} (${amount})`;
      })
      .join(', ');
    onLog(`💥 ${dmgType} ${total} dmg → ${summary}`);
    setPanel(null);
  }

  function handleLogOnly(entry) {
    onLog(entry);
  }

  const awardXp = useStore(s => s.awardXp);
  const [xpAwarded, setXpAwarded] = useState(false);

  const enemies = combatants.filter(c => c.type === 'enemy');
  const allEnemiesDead = enemies.length > 0 && enemies.every(c => c.currentHp <= 0);
  const partyDead = combatants.filter(c => c.type === 'player').every(c => c.currentHp <= 0);
  const totalXp = enemies.filter(c => c.currentHp <= 0).reduce((sum, c) => sum + crToXp(c.cr), 0);
  const avgCr = enemies.length > 0
    ? (enemies.map(c => parseFloat(c.cr) || 0).reduce((a, b) => a + b, 0) / enemies.length).toFixed(1)
    : 1;

  const activeChar = characters?.find(c => c.id === activeCombatant?.id || c.name === activeCombatant?.name) || null;

  // ── Mobile: tab bar + single-panel view ──────────────────────────────────
  if (isMobile) {
    const partyContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
        <PartyPanel combatants={combatants} characters={characters || []} activeCombatantId={activeCombatant?.id} onSelectCombatant={handleTokenClick} />
        {(activeChar || activeCombatant) && <CharDetailPanel character={activeChar} combatant={activeCombatant} compact />}
        {dmMode && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onShortRest} style={{ ...btn.ghost, flex: 1, fontSize: '0.72rem' }}>🌙 Short Rest</button>
            <button onClick={onLongRest}  style={{ ...btn.ghost, flex: 1, fontSize: '0.72rem', color: '#d4af37', borderColor: 'rgba(212,175,55,0.4)' }}>☀️ Long Rest</button>
          </div>
        )}
      </div>
    );

    const battleContent = (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif" }}>Round {round}</span>
          {activeCombatant && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Turn: <strong>{activeCombatant.name}</strong></span>}
          {(allEnemiesDead || partyDead) && (
            <span style={{ fontSize: '0.78rem', color: allEnemiesDead ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
              {allEnemiesDead ? '🏆 Victory!' : '💀 Defeated!'}
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <BattleMap combatants={combatants} selectedToken={selectedToken} activeCombatantId={activeCombatant?.id} onCellClick={handleCellClick} onTokenClick={handleTokenClick} cellPx={cellPx} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>
          {activeCombatant ? (
            <>
              {activeCombatant.name} — Move: <span style={{ color: (activeCombatant.remainingMove ?? 0) > 0 ? '#2ecc71' : '#e74c3c' }}>{activeCombatant.remainingMove ?? Math.floor((activeCombatant.speed || 30) / 5)} cells</span>
              {!dmMode && myCharacter && (activeCombatant.name === myCharacter?.name || activeCombatant.id === myCharacter?.id)
                ? ' · Tap your token then a cell'
                : !dmMode ? ' · Waiting for your turn' : ' · Tap token · tap cell'}
            </>
          ) : 'Tap token · tap cell to move'}
        </div>
        <div ref={logRef} style={{ background: '#0f0a04', border: '1px solid #2a1a0a', borderRadius: 6, padding: '6px 8px', maxHeight: 100, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', marginTop: 8 }}>
          {log.map((entry, i) => <div key={i} style={{ color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', padding: '1px 0' }}>{entry}</div>)}
        </div>
        {showLoot && <div style={{ marginTop: 8 }}><LootGenerator defaultCr={avgCr} onClose={() => setShowLoot(false)} /></div>}
      </div>
    );

    const actionsContent = (
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Action panel */}
        {panel === null && activeCombatant && (() => {
          const isDying = activeCombatant.currentHp <= 0 && activeCombatant.type === 'player' && !(activeCombatant.deathSaves?.failures >= 3);
          const isMyDying = isDying && isMyTurn;
          if (!canAct && !isDying) return (
            <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif" }}>
                Turn: <strong style={{ color: 'var(--gold)' }}>{activeCombatant.name}</strong> — waiting…
              </div>
            </div>
          );
          return (
            <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>
                {isDying ? `⚠ ${activeCombatant.name} DYING` : `ACTIONS — ${activeCombatant.name}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isDying ? (
                  <>
                    {(isMyDying || dmMode) && <button onClick={() => onRollDeathSave(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.5)', color: '#f39c12' }}>🎲 Death Save</button>}
                    {dmMode && <button onClick={() => onStabilize(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>✚ Stabilize</button>}
                  </>
                ) : (
                  <>
                    <button onClick={() => setPanel('attack')} style={{ ...btn.action, background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', color: '#e74c3c' }}>⚔ Attack</button>
                    {dmMode && <button onClick={() => setPanel('aoe')} style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)', color: '#9b59b6' }}>💥 AoE</button>}
                    {(dmMode || activeCombatant.spells?.length > 0) && <button onClick={() => setPanel('concentrate')} style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: `1px solid ${activeCombatant.concentration ? 'rgba(155,89,182,0.7)' : 'rgba(155,89,182,0.3)'}`, color: '#9b59b6' }}>🎯 {activeCombatant.concentration ? `Conc: ${activeCombatant.concentration}` : 'Concentrate'}</button>}
                    {dmMode && <button onClick={() => setPanel('save')} style={{ ...btn.action, background: 'rgba(41,128,185,0.15)', border: '1px solid rgba(41,128,185,0.4)', color: '#3498db' }}>🎲 Save</button>}
                  </>
                )}
                {canAct && <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>➜ Next Turn</button>}
              </div>
            </div>
          );
        })()}
        {panel === 'attack'     && activeCombatant && <AttackPanel attacker={activeCombatant} combatants={combatants} onResolve={handleAttackResolve} onCancel={() => setPanel(null)} />}
        {panel === 'aoe'        && <AoEPanel combatants={combatants} onApply={handleAoEApply} onCancel={() => setPanel(null)} />}
        {panel === 'save'       && <SavingThrowPanel combatants={combatants} onLog={handleLogOnly} onCancel={() => setPanel(null)} />}
        {panel === 'concentrate' && activeCombatant && <ConcentratePanel combatant={activeCombatant} dmMode={dmMode} onSet={spell => { onSetConcentration(activeCombatant.id, spell); setPanel(null); }} onClear={() => { onClearConcentration(activeCombatant.id); setPanel(null); }} onCancel={() => setPanel(null)} />}
        {/* Turn order */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Cinzel', Georgia, serif" }}>TURN ORDER</div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {combatants.map((c, i) => (
              <CombatantRow key={c.id} combatant={c} isActive={i === currentTurn} isSelected={c.id === selectedToken} colorIndex={buildTypeIndex(combatants)[c.type]?.[c.id] || 0} dmMode={dmMode} onSelectToken={handleTokenClick} onHpChange={handleHpChange} onAddCondition={onAddCondition} onRemoveCondition={onRemoveCondition} onRollDeathSave={onRollDeathSave} onStabilize={onStabilize} />
            ))}
          </div>
        </div>
        {dmMode && <button onClick={onEndEncounter} style={{ ...btn.ghost, fontSize: '0.78rem', color: '#c0392b', borderColor: 'rgba(192,57,43,0.4)' }}>✕ End Combat</button>}
      </div>
    );

    const MOBILE_TABS = [
      { id: 'party',   label: '👥 Party' },
      { id: 'battle',  label: '🗺 Battle' },
      { id: 'actions', label: '⚔ Actions' },
    ];

    return (
      <div style={{ padding: '0 8px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a1a0a', marginBottom: 4 }}>
          {MOBILE_TABS.map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)} style={{
              flex: 1, padding: '9px 4px', background: 'transparent', border: 'none',
              borderBottom: mobileTab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: mobileTab === t.id ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '0.78rem', fontFamily: "'Cinzel', Georgia, serif", cursor: 'pointer', fontWeight: mobileTab === t.id ? 700 : 400,
            }}>
              {t.label}
            </button>
          ))}
        </div>
        {mobileTab === 'party'   && partyContent}
        {mobileTab === 'battle'  && battleContent}
        {mobileTab === 'actions' && actionsContent}
      </div>
    );
  }

  // ── Desktop / Tablet layout ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, padding: '0 8px', alignItems: 'flex-start' }}>

      {/* Party Column — hidden on tablet to give map more room */}
      <div style={{ width: isTablet ? 0 : 192, overflow: isTablet ? 'hidden' : 'visible', flexShrink: 0, marginRight: isTablet ? 0 : 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: '10px 8px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <PartyPanel
            combatants={combatants}
            characters={characters || []}
            activeCombatantId={activeCombatant?.id}
            onSelectCombatant={handleTokenClick}
          />
        </div>

        {/* Active combatant / own character detail */}
        {(activeChar || activeCombatant) && (
          <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: '10px 10px', overflowY: 'auto', maxHeight: 420 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 8 }}>
              {activeCombatant?.type === 'enemy' ? 'ACTIVE ENEMY' : 'ACTIVE COMBATANT'}
            </div>
            <CharDetailPanel character={activeChar} combatant={activeCombatant} compact />
          </div>
        )}

        {/* Rest buttons */}
        {dmMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <button onClick={onShortRest} style={{ ...btn.ghost, fontSize: '0.72rem', padding: '5px 8px' }}>
              🌙 Short Rest
            </button>
            <button onClick={onLongRest} style={{ ...btn.ghost, fontSize: '0.72rem', padding: '5px 8px', color: '#d4af37', borderColor: 'rgba(212,175,55,0.4)' }}>
              ☀️ Long Rest
            </button>
          </div>
        )}
      </div>

      {/* Right: Map + Sidebar */}
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* Center: Map */}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif" }}>
            Round {round}
          </div>
          {activeCombatant && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Turn: <strong style={{ color: 'var(--text-primary)' }}>{activeCombatant.name}</strong>
            </div>
          )}
          {selectedToken && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Token selected — click a cell to move
            </div>
          )}
          {(allEnemiesDead || partyDead) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: allEnemiesDead ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                {allEnemiesDead ? '🏆 Victory!' : '💀 Party defeated!'}
              </span>
              {allEnemiesDead && totalXp > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#f1c40f' }}>
                  {totalXp.toLocaleString()} XP
                </span>
              )}
              {allEnemiesDead && dmMode && totalXp > 0 && !xpAwarded && (
                <button onClick={() => { awardXp(totalXp); setXpAwarded(true); }} style={{ ...btn.small, color: '#f1c40f', borderColor: 'rgba(241,196,15,0.4)', fontSize: '0.72rem' }}>
                  ✦ Award XP
                </button>
              )}
              {xpAwarded && <span style={{ fontSize: '0.68rem', color: '#2ecc71' }}>XP awarded!</span>}
              {allEnemiesDead && dmMode && (
                <button onClick={() => setShowLoot(l => !l)} style={{ ...btn.small, color: '#d4af37', borderColor: 'var(--border-gold)', fontSize: '0.72rem' }}>
                  🎁 Loot
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <BattleMap
            combatants={combatants}
            selectedToken={selectedToken}
            activeCombatantId={activeCombatant?.id}
            onCellClick={handleCellClick}
            onTokenClick={handleTokenClick}
            cellPx={cellPx}
          />
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {activeCombatant && (
            <span>
              Move: <span style={{ color: (activeCombatant.remainingMove ?? 0) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                {activeCombatant.remainingMove ?? Math.floor((activeCombatant.speed || 30) / 5)} cells remaining
              </span>
              {!dmMode && myCharacter && (activeCombatant.name === myCharacter?.name || activeCombatant.id === myCharacter?.id)
                ? ' · Your turn — click your token then a cell'
                : !dmMode ? ' · Waiting for your turn…' : ' · Click token then cell to move'}
            </span>
          )}
        </div>

        {/* Combat Log */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em' }}>
            COMBAT LOG
          </div>
          <div ref={logRef} style={{
            background: '#0f0a04', border: '1px solid #2a1a0a', borderRadius: 6,
            padding: '8px 10px', maxHeight: 120, overflowY: 'auto',
            fontFamily: 'monospace', fontSize: '0.75rem',
          }}>
            {log.map((entry, i) => (
              <div key={i} style={{ color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', padding: '1px 0', borderBottom: i < log.length - 1 ? '1px solid #1a1006' : 'none' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>

        {showLoot && (
          <div style={{ marginTop: 10 }}>
            <LootGenerator defaultCr={avgCr} onClose={() => setShowLoot(false)} />
          </div>
        )}
      </div>

      {/* Right: Sidebar */}
      <div style={{ width: 260, flexShrink: 0 }}>
        {/* Action buttons */}
        {panel === null && activeCombatant && (() => {
          const isDying = activeCombatant.currentHp <= 0 && activeCombatant.type === 'player' && !(activeCombatant.deathSaves?.failures >= 3);
          const isMyDying = isDying && isMyTurn;
          // Non-DM players only see full actions on their turn
          if (!canAct && !isDying) return (
            <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif" }}>
                Turn: <strong style={{ color: 'var(--gold)' }}>{activeCombatant.name}</strong> — waiting…
              </div>
            </div>
          );
          return (
            <div style={{ background: '#1a1006', border: `1px solid ${isDying ? 'rgba(243,156,18,0.5)' : '#2a1a0a'}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: '0.75rem', color: isDying ? '#f39c12' : 'var(--text-muted)', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>
                {isDying ? `⚠ ${activeCombatant.name} is DYING` : `ACTIONS — ${activeCombatant.name}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isDying ? (
                  <>
                    {(isMyDying || dmMode) && (
                      <button
                        onClick={() => onRollDeathSave(activeCombatant.id)}
                        style={{ ...btn.action, background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.5)', color: '#f39c12' }}
                      >
                        🎲 Roll Death Save
                      </button>
                    )}
                    {dmMode && (
                      <button
                        onClick={() => onStabilize(activeCombatant.id)}
                        style={{ ...btn.action, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}
                      >
                        ✚ Stabilize (Medicine)
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setPanel('attack')}
                      style={{ ...btn.action, background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', color: '#e74c3c' }}
                    >
                      ⚔ Attack
                    </button>
                    {dmMode && (
                      <button
                        onClick={() => setPanel('aoe')}
                        style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)', color: '#9b59b6' }}
                      >
                        💥 AoE Damage
                      </button>
                    )}
                    {(dmMode || (activeCombatant.spells?.length > 0)) && (
                      <button
                        onClick={() => setPanel('concentrate')}
                        style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: `1px solid ${activeCombatant.concentration ? 'rgba(155,89,182,0.7)' : 'rgba(155,89,182,0.3)'}`, color: '#9b59b6' }}
                      >
                        🎯 {activeCombatant.concentration ? `Conc: ${activeCombatant.concentration}` : 'Concentrate'}
                      </button>
                    )}
                    {dmMode && (
                      <button
                        onClick={() => setPanel('save')}
                        style={{ ...btn.action, background: 'rgba(41,128,185,0.15)', border: '1px solid rgba(41,128,185,0.4)', color: '#3498db' }}
                      >
                        🎲 Saving Throw
                      </button>
                    )}
                  </>
                )}
                {canAct && (
                  <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>
                    ➜ Next Turn
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {panel === 'attack' && activeCombatant && (
          <AttackPanel
            attacker={activeCombatant}
            combatants={combatants}
            onResolve={handleAttackResolve}
            onCancel={() => setPanel(null)}
          />
        )}

        {panel === 'aoe' && (
          <AoEPanel
            combatants={combatants}
            onApply={handleAoEApply}
            onCancel={() => setPanel(null)}
          />
        )}

        {panel === 'save' && (
          <SavingThrowPanel
            combatants={combatants}
            onLog={handleLogOnly}
            onCancel={() => setPanel(null)}
          />
        )}

        {panel === 'concentrate' && activeCombatant && (
          <ConcentratePanel
            combatant={activeCombatant}
            dmMode={dmMode}
            onSet={spell => { onSetConcentration(activeCombatant.id, spell); setPanel(null); }}
            onClear={() => { onClearConcentration(activeCombatant.id); setPanel(null); }}
            onCancel={() => setPanel(null)}
          />
        )}

        {/* Turn order */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Cinzel', Georgia, serif" }}>
          TURN ORDER
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {combatants.map((c, i) => (
            <CombatantRow
              key={c.id}
              combatant={c}
              isActive={i === currentTurn}
              isSelected={c.id === selectedToken}
              colorIndex={buildTypeIndex(combatants)[c.type]?.[c.id] || 0}
              dmMode={dmMode}
              onSelectToken={handleTokenClick}
              onHpChange={handleHpChange}
              onAddCondition={onAddCondition}
              onRemoveCondition={onRemoveCondition}
              onRollDeathSave={onRollDeathSave}
              onStabilize={onStabilize}
            />
          ))}
        </div>

        {dmMode && (
          <button onClick={onEndEncounter} style={{ ...btn.ghost, marginTop: 10, width: '100%', fontSize: '0.78rem', color: '#c0392b', borderColor: 'rgba(192,57,43,0.4)' }}>
            ✕ End Combat
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Idle Phase (Scene viewer) ────────────────────────────────────────────────

function IdlePhase({ campaign, dmMode, encounter, onStartEncounter, onStartCustom }) {
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const { scenes, currentSceneIndex, loaded } = campaign;
  const scene = scenes[currentSceneIndex] || null;

  if (!loaded || scenes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📜</div>
        <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1rem', marginBottom: 8 }}>No Campaign Loaded</div>
        <div style={{ fontSize: '0.82rem' }}>Import a campaign JSON in the Import tab to begin.</div>
        {dmMode && (
          <button onClick={onStartCustom} style={{ ...btn.gold, marginTop: 20 }}>
            ⚔ Start Custom Combat
          </button>
        )}
      </div>
    );
  }

  const enemies = scene?.encounter?.enemies || [];
  const hasEncounter = enemies.length > 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
      {/* Scene Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setCurrentScene(Math.max(0, currentSceneIndex - 1))}
          disabled={currentSceneIndex === 0}
          style={{ ...btn.small, opacity: currentSceneIndex === 0 ? 0.3 : 1 }}
        >
          ← Prev
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Scene {currentSceneIndex + 1} / {scenes.length}
        </span>
        <button
          onClick={() => setCurrentScene(Math.min(scenes.length - 1, currentSceneIndex + 1))}
          disabled={currentSceneIndex === scenes.length - 1}
          style={{ ...btn.small, opacity: currentSceneIndex === scenes.length - 1 ? 0.3 : 1 }}
        >
          Next →
        </button>
      </div>

      {scene && (
        <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 18, marginBottom: 12 }}>
          <h2 style={{ margin: '0 0 10px', fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.2rem', color: 'var(--gold)' }}>
            {scene.title || `Scene ${currentSceneIndex + 1}`}
          </h2>

          {scene.description && (
            <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {scene.description}
            </p>
          )}

          {/* DM-only notes */}
          {dmMode && scene.dm_notes && (
            <div style={{ border: '1px dashed rgba(192,57,43,0.5)', borderRadius: 6, padding: '10px 14px', marginTop: 10 }}>
              <div style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em' }}>DM NOTES</div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{scene.dm_notes}</p>
            </div>
          )}

          {/* Encounter info */}
          {hasEncounter && (
            <div style={{ marginTop: 14, borderTop: '1px solid #2a1a0a', paddingTop: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>
                ENCOUNTER — {enemies.length} enemy group{enemies.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {enemies.map((e, i) => (
                  <span key={i} style={{ fontSize: '0.78rem', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c', borderRadius: 4, padding: '3px 10px' }}>
                    {e.count > 1 ? `${e.count}× ` : ''}{e.name}
                  </span>
                ))}
              </div>
              {dmMode && (
                <button onClick={() => onStartEncounter(enemies)} style={btn.gold}>
                  ⚔ Start Encounter
                </button>
              )}
            </div>
          )}

          {/* Scene choices */}
          {scene.choices?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>CHOICES</div>
              {scene.choices.map((choice, i) => (
                <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < scene.choices.length - 1 ? '1px solid #1a1006' : 'none' }}>
                  {typeof choice === 'string' ? choice : choice.text || choice.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dmMode && !hasEncounter && (
        <button onClick={onStartCustom} style={{ ...btn.ghost, width: '100%' }}>
          ⚔ Start Custom Combat
        </button>
      )}
    </div>
  );
}

// ─── Monster Search Row ───────────────────────────────────────────────────────

function parseMonster(m) {
  const attacks = (m.actions || [])
    .filter(a => a.attack_bonus != null)
    .map(a => ({
      name: a.name,
      bonus: `+${a.attack_bonus}`,
      damage: a.damage_dice
        ? (a.damage_bonus ? `${a.damage_dice}+${a.damage_bonus}` : a.damage_dice)
        : '1d4',
    }));

  return {
    name: m.name,
    hp: m.hit_points || 10,
    ac: typeof m.armor_class === 'number' ? m.armor_class : (m.armor_class?.[0]?.value ?? 10),
    speed: parseInt(m.speed?.walk) || 30,
    stats: {
      str: m.strength || 10, dex: m.dexterity || 10, con: m.constitution || 10,
      int: m.intelligence || 10, wis: m.wisdom || 10, cha: m.charisma || 10,
    },
    attacks,
    cr: m.challenge_rating ?? '—',
    type: m.type || '',
    _fromSrd: true,
  };
}

function MonsterNameInput({ value, onChangeName, onSelectMonster }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef();
  const wrapRef = useRef();

  useEffect(() => {
    function close(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function handleChange(val) {
    onChangeName(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.open5e.com/v1/monsters/?search=${encodeURIComponent(val.trim())}&limit=8`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <input
          placeholder="Name or search SRD…"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ width: '100%', background: '#0f0a04', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 28px 5px 7px', fontSize: '0.82rem', boxSizing: 'border-box' }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>⟳</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#1e1208', border: '1px solid var(--border-gold)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)', overflow: 'hidden', marginTop: 2,
        }}>
          {results.map(m => (
            <button
              key={m.slug}
              onMouseDown={e => { e.preventDefault(); onSelectMonster(parseMonster(m)); setOpen(false); }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '7px 12px', background: 'transparent',
                border: 'none', borderBottom: '1px solid #2a1a0a', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>{m.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {m.type} · CR {m.challenge_rating} · HP {m.hit_points} · AC {typeof m.armor_class === 'number' ? m.armor_class : '?'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Custom Combat Setup ──────────────────────────────────────────────────────

const BLANK_ROW = () => ({ name: '', count: 1, hp: 10, ac: 12, speed: 30, stats: null, attacks: [], _fromSrd: false });

function CustomCombatSetup({ partyMembers, onStart, onCancel }) {
  const savedEncounters    = useStore(s => s.campaign.savedEncounters);
  const saveEncounterGroup = useStore(s => s.saveEncounterGroup);
  const deleteEncounterGroup = useStore(s => s.deleteEncounterGroup);

  const [rows, setRows] = useState([BLANK_ROW()]);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  function addRow() { setRows(r => [...r, BLANK_ROW()]); }
  function removeRow(i) { setRows(r => r.filter((_, j) => j !== i)); }

  function updateField(i, field, value) {
    setRows(r => r.map((row, j) => j === i ? { ...row, [field]: value, _fromSrd: false } : row));
  }

  function applyMonster(i, monster) {
    setRows(r => r.map((row, j) => j === i ? { ...row, ...monster, count: row.count } : row));
  }

  function buildEnemies() {
    return rows
      .filter(r => r.name.trim())
      .map(r => ({
        name: r.name.trim(),
        count: Number(r.count) || 1,
        hp: Number(r.hp) || 10,
        ac: Number(r.ac) || 10,
        speed: Number(r.speed) || 30,
        stats: r.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        attacks: r.attacks || [],
        cr: r.cr,
      }));
  }

  function start() {
    const enemies = buildEnemies();
    if (enemies.length === 0) return;
    onStart(enemies);
  }

  function handleSave() {
    const enemies = buildEnemies();
    if (!saveName.trim() || enemies.length === 0) return;
    saveEncounterGroup(saveName.trim(), enemies);
    setSaveName('');
    setShowSave(false);
  }

  function loadGroup(group) {
    setRows(group.enemies.map(e => ({ ...e, _fromSrd: false })));
  }

  const numStyle = { width: '100%', background: '#0f0a04', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 7px', fontSize: '0.82rem' };
  const hasRows = rows.some(r => r.name.trim());

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.1rem', color: 'var(--gold)' }}>Add Enemies</h3>
        <button onClick={addRow} style={btn.small}>+ Row</button>
      </div>

      {/* Saved encounter groups */}
      {savedEncounters.length > 0 && (
        <div style={{ marginBottom: 12, background: '#0f0a04', border: '1px solid #2a1a0a', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>SAVED GROUPS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {savedEncounters.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button onClick={() => loadGroup(g)} style={{ ...btn.small, fontSize: '0.72rem', padding: '3px 8px' }}>
                  📂 {g.name}
                </button>
                <button onClick={() => deleteEncounterGroup(g.id)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 4px' }} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
        Type any name, or search the SRD — selecting a monster fills stats & attacks automatically.
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 58px 52px 58px 28px', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0 2px', marginBottom: 4 }}>
        <span>Name / Search</span><span>#</span><span>HP</span><span>AC</span><span>Speed</span><span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
        {rows.map((row, i) => (
          <div key={i}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 58px 52px 58px 28px', gap: 5, alignItems: 'center' }}>
              <MonsterNameInput
                value={row.name}
                onChangeName={val => updateField(i, 'name', val)}
                onSelectMonster={m => applyMonster(i, m)}
              />
              <input type="number" placeholder="#" value={row.count} onChange={e => updateField(i, 'count', e.target.value)} style={numStyle} min={1} />
              <input type="number" placeholder="HP" value={row.hp} onChange={e => updateField(i, 'hp', e.target.value)} style={numStyle} />
              <input type="number" placeholder="AC" value={row.ac} onChange={e => updateField(i, 'ac', e.target.value)} style={numStyle} />
              <input type="number" placeholder="ft" value={row.speed} onChange={e => updateField(i, 'speed', e.target.value)} style={numStyle} />
              <button onClick={() => removeRow(i)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>✕</button>
            </div>
            {/* SRD badge + attack preview */}
            {row._fromSrd && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '2px 2px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#2ecc71' }}>✓ SRD</span>
                {row.attacks.length > 0 && (
                  <span>Attacks: {row.attacks.map(a => `${a.name} (${a.bonus}, ${a.damage})`).join(' · ')}</span>
                )}
                {row.attacks.length === 0 && <span>No weapon attacks</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {partyMembers.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Party ({partyMembers.length}): {partyMembers.map(p => p.name).join(', ')} — added automatically.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={start} disabled={!hasRows} style={{ ...btn.gold, opacity: hasRows ? 1 : 0.4 }}>
          ⚔ Begin →
        </button>
        {hasRows && !showSave && (
          <button onClick={() => setShowSave(true)} style={{ ...btn.ghost, fontSize: '0.78rem' }}>
            💾 Save Group
          </button>
        )}
        {showSave && (
          <>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSave(false); }}
              placeholder="Group name…"
              style={{ background: '#0f0a04', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.82rem', width: 140 }}
            />
            <button onClick={handleSave} style={{ ...btn.small }}>Save</button>
            <button onClick={() => setShowSave(false)} style={{ ...btn.ghost, fontSize: '0.78rem' }}>✕</button>
          </>
        )}
        <button onClick={onCancel} style={btn.ghost}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main EncounterView ───────────────────────────────────────────────────────

export default function EncounterView() {
  const [customSetup, setCustomSetup] = useState(false);

  const campaign = useStore(s => s.campaign);
  const encounter = useStore(s => s.encounter);
  const dmMode = useStore(s => s.dmMode);
  const myCharacter = useStore(s => s.myCharacter);

  const user = useStore(s => s.user);

  const startEncounter = useStore(s => s.startEncounter);
  const setEncounterInitiative = useStore(s => s.setEncounterInitiative);
  const beginCombat = useStore(s => s.beginCombat);
  const nextEncounterTurn = useStore(s => s.nextEncounterTurn);
  const applyEncounterDamage = useStore(s => s.applyEncounterDamage);
  const applyEncounterHeal = useStore(s => s.applyEncounterHeal);
  const addEncounterLog = useStore(s => s.addEncounterLog);
  const addEncounterCondition = useStore(s => s.addEncounterCondition);
  const removeEncounterCondition = useStore(s => s.removeEncounterCondition);
  const moveToken = useStore(s => s.moveToken);
  const endEncounter = useStore(s => s.endEncounter);
  const applyDeathSaveResult = useStore(s => s.applyDeathSaveResult);
  const stabilizeCombatant = useStore(s => s.stabilizeCombatant);
  const setConcentration = useStore(s => s.setConcentration);
  const clearConcentration = useStore(s => s.clearConcentration);
  const shortRest = useStore(s => s.shortRest);
  const longRest = useStore(s => s.longRest);
  const partyMembers = useStore(s => s.partyMembers);

  // ── Broadcast wrappers — call store action + broadcast to all clients ──────
  const uid = user?.id;
  function wrappedNextTurn() { nextEncounterTurn(); broadcastEncounterAction({ type: 'next-turn', userId: uid }); }
  function wrappedDamage(id, amount) { applyEncounterDamage(id, amount); broadcastEncounterAction({ type: 'damage', targetId: id, amount, userId: uid }); }
  function wrappedHeal(id, amount) { applyEncounterHeal(id, amount); broadcastEncounterAction({ type: 'heal', targetId: id, amount, userId: uid }); }
  function wrappedLog(entry) { addEncounterLog(entry); broadcastEncounterAction({ type: 'log', entry, userId: uid }); }
  function wrappedRollDeathSave(id) {
    const roll = Math.floor(Math.random() * 20) + 1;
    applyDeathSaveResult(id, roll);
    broadcastEncounterAction({ type: 'death-save', id, roll, userId: uid });
  }
  function wrappedStabilize(id) { stabilizeCombatant(id); broadcastEncounterAction({ type: 'stabilize', id, userId: uid }); }
  function wrappedEndEncounter() { endEncounter(); broadcastEncounterAction({ type: 'end-encounter', userId: uid }); }
  function wrappedAddCondition(id, condition) { addEncounterCondition(id, condition); broadcastEncounterAction({ type: 'add-condition', id, condition, userId: uid }); }
  function wrappedRemoveCondition(id, condition) { removeEncounterCondition(id, condition); broadcastEncounterAction({ type: 'remove-condition', id, condition, userId: uid }); }
  function wrappedLongRest() { longRest(); broadcastEncounterAction({ type: 'long-rest', userId: uid }); }
  function wrappedSetConcentration(id, spell) { setConcentration(id, spell); broadcastEncounterAction({ type: 'set-concentration', id, spell, userId: uid }); }
  function wrappedClearConcentration(id) { clearConcentration(id); broadcastEncounterAction({ type: 'clear-concentration', id, userId: uid }); }

  function handleStartEncounter(enemies) {
    setCustomSetup(false);
    // Use real party members (from campaign_members) not NPC list from campaign JSON
    const party = partyMembers.length > 0 ? partyMembers : campaign.characters;
    startEncounter(enemies, party);
  }

  if (customSetup) {
    return (
      <div style={{ padding: '16px 0' }}>
        <CustomCombatSetup
          partyMembers={partyMembers.length > 0 ? partyMembers : campaign.characters}
          onStart={handleStartEncounter}
          onCancel={() => setCustomSetup(false)}
        />
      </div>
    );
  }

  if (encounter.phase === 'initiative') {
    if (!dmMode) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--text-muted)', padding: 40 }}>
          <div style={{ fontSize: '3rem' }}>⚔</div>
          <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.1rem', color: 'var(--parchment)' }}>Combat is beginning…</div>
          <div style={{ fontSize: '0.85rem' }}>The DM is rolling initiative.</div>
        </div>
      );
    }
    return (
      <div style={{ padding: '16px 0' }}>
        <InitiativePhase
          combatants={encounter.combatants}
          onSetInitiative={setEncounterInitiative}
          onBeginCombat={beginCombat}
          onCancel={endEncounter}
        />
      </div>
    );
  }

  if (encounter.phase === 'combat') {
    return (
      <div style={{ padding: '16px 0' }}>
        <CombatPhase
          encounter={encounter}
          dmMode={dmMode}
          myCharacter={myCharacter}
          onNextTurn={wrappedNextTurn}
          onEndEncounter={wrappedEndEncounter}
          onDamage={wrappedDamage}
          onHeal={wrappedHeal}
          onLog={wrappedLog}
          onAddCondition={wrappedAddCondition}
          onRemoveCondition={wrappedRemoveCondition}
          onMoveToken={moveToken}
          onRollDeathSave={wrappedRollDeathSave}
          onStabilize={wrappedStabilize}
          onSetConcentration={wrappedSetConcentration}
          onClearConcentration={wrappedClearConcentration}
          characters={campaign.characters}
          onShortRest={shortRest}
          onLongRest={wrappedLongRest}
        />
      </div>
    );
  }

  // idle
  return (
    <div style={{ padding: '16px 0' }}>
      <IdlePhase
        campaign={campaign}
        dmMode={dmMode}
        encounter={encounter}
        onStartEncounter={handleStartEncounter}
        onStartCustom={() => setCustomSetup(true)}
      />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btn = {
  gold: {
    minHeight: 38, padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', fontWeight: 700, fontSize: '0.88rem', border: 'none',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  ghost: {
    minHeight: 36, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.82rem',
  },
  small: {
    minHeight: 30, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)', fontSize: '0.78rem',
  },
  action: {
    minHeight: 36, padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem', textAlign: 'left',
  },
};

const miniBtn = {
  minHeight: 22, padding: '1px 6px', borderRadius: 3, cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)',
  color: '#e74c3c', fontSize: '0.7rem', flexShrink: 0,
};

const apStyle = {
  panel: {
    background: '#1a1006', border: '1px solid #3a2a14', borderRadius: 8,
    padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  targetBtn: {
    minHeight: 34, padding: '6px 10px', borderRadius: 5, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)',
    color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'left',
  },
  btn: {
    minHeight: 34, padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', fontWeight: 700, fontSize: '0.82rem', border: 'none',
  },
  cancel: {
    minHeight: 30, padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.78rem',
  },
  auto: {
    minHeight: 24, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)', fontSize: '0.72rem',
  },
};
