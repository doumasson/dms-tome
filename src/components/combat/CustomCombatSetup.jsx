import { useState, useRef, useEffect } from 'react';
import useStore from '../../store/useStore';
import { btn } from './combatStyles';

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

const BLANK_ROW = () => ({ name: '', count: 1, hp: 10, ac: 12, speed: 30, stats: null, attacks: [], _fromSrd: false });

export default function CustomCombatSetup({ partyMembers, onStart, onCancel }) {
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
