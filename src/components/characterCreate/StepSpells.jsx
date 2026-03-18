import { useState, useMemo } from 'react';
import { SPELLS } from '../../data/spells';
import { s } from './charCreateStyles';

// Per-class limits at level 1 (SRD rules)
const SPELL_CONFIG = {
  Wizard:   { cantripCount: 3, spellCount: 6, note: 'Choose 3 cantrips and 6 spells for your spellbook.' },
  Sorcerer: { cantripCount: 4, spellCount: 2, note: 'Choose 4 cantrips and 2 spells known.' },
  Warlock:  { cantripCount: 2, spellCount: 2, note: 'Choose 2 cantrips and 2 spells known.' },
  Bard:     { cantripCount: 2, spellCount: 4, note: 'Choose 2 cantrips and 4 spells known.' },
  Cleric:   { cantripCount: 3, spellCount: 0, note: 'Choose 3 cantrips. As a Cleric you prepare spells from the full Cleric list each day — pick starting spells to begin with.' },
  Druid:    { cantripCount: 2, spellCount: 0, note: 'Choose 2 cantrips. As a Druid you prepare spells from the full Druid list.' },
  Paladin:  { cantripCount: 0, spellCount: 0, note: 'Paladins prepare spells as they level; no spell selection at creation.' },
  Ranger:   { cantripCount: 0, spellCount: 2, note: 'Rangers know 2 spells at level 1.' },
};

const SCHOOL_COLORS = {
  abjuration: '#4e90cc', conjuration: '#c8a43e', divination: '#8ac4e0',
  enchantment: '#c84e8e', evocation: '#e05c3a', illusion: '#8e55cc',
  necromancy: '#6cc45a', transmutation: '#e09040',
};

export default function StepSpells({ cls, selectedSpells, setSelectedSpells }) {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [hoveredSpell, setHoveredSpell] = useState(null);

  const config = SPELL_CONFIG[cls];
  if (!config) return <p style={{ color: 'rgba(200,180,140,0.5)' }}>No spell selection for {cls}.</p>;

  const classSpells = useMemo(
    () => SPELLS.filter(sp => sp.classes?.includes(cls) && sp.level <= 1),
    [cls],
  );

  const cantrips = classSpells.filter(sp => sp.level === 0);
  const spells1  = classSpells.filter(sp => sp.level === 1);

  const selectedCantrips = selectedSpells.filter(n => cantrips.find(c => c.name === n));
  const selectedSpells1  = selectedSpells.filter(n => spells1.find(s => s.name === n));

  function filterList(list) {
    return list.filter(sp => {
      if (search && !sp.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }

  function toggleSpell(spell, isCantrip) {
    const name = spell.name;
    if (selectedSpells.includes(name)) {
      setSelectedSpells(prev => prev.filter(n => n !== name));
      return;
    }
    if (isCantrip && selectedCantrips.length >= config.cantripCount && config.cantripCount > 0) return;
    if (!isCantrip && config.spellCount > 0 && selectedSpells1.length >= config.spellCount) return;
    if (!isCantrip && config.spellCount === 0) return; // e.g. Cleric prepared caster
    setSelectedSpells(prev => [...prev, name]);
  }

  const cantripsDone = config.cantripCount === 0 || selectedCantrips.length >= config.cantripCount;
  const spellsDone   = config.spellCount === 0   || selectedSpells1.length >= config.spellCount;

  function SpellCard({ spell, isCantrip }) {
    const selected = selectedSpells.includes(spell.name);
    const atLimit = isCantrip
      ? (selectedCantrips.length >= config.cantripCount && !selected)
      : (config.spellCount > 0 && selectedSpells1.length >= config.spellCount && !selected);
    const unpickable = !isCantrip && config.spellCount === 0;
    const isHovered  = hoveredSpell === spell.spellId;

    return (
      <div
        style={{
          ...st.spellCard,
          ...(selected ? st.spellCardSelected : {}),
          ...(atLimit || unpickable ? { opacity: 0.45, cursor: 'default' } : {}),
          outline: isHovered ? '1px solid rgba(212,175,55,0.4)' : 'none',
        }}
        onClick={() => !atLimit && !unpickable && toggleSpell(spell, isCantrip)}
        onMouseEnter={() => setHoveredSpell(spell.spellId)}
        onMouseLeave={() => setHoveredSpell(null)}
      >
        <div style={st.spellTop}>
          <span style={{ ...st.schoolDot, background: SCHOOL_COLORS[spell.school] || '#888' }} />
          <span style={st.spellName}>{spell.name}</span>
          {selected && <span style={st.checkmark}>✓</span>}
        </div>
        <div style={st.spellMeta}>
          {spell.castingTime} · {spell.range > 0 ? `${spell.range}ft` : spell.range === 0 ? 'Self' : 'Touch'}
          {spell.concentration && ' · Conc.'}
          {spell.save && ` · ${spell.save} save`}
        </div>
        {isHovered && spell.description && (
          <div style={st.spellDesc}>{spell.description}</div>
        )}
      </div>
    );
  }

  return (
    <div style={st.wrap}>
      <div style={st.note}>{config.note}</div>

      {/* Search */}
      <input
        style={st.search}
        placeholder="Filter spells…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Cantrips section */}
      {config.cantripCount > 0 && (
        <div style={st.section}>
          <div style={st.sectionHeader}>
            <span style={st.sectionLabel}>Cantrips</span>
            <span style={{ ...st.counter, color: cantripsDone ? '#2ecc71' : '#d4af37' }}>
              {selectedCantrips.length} / {config.cantripCount}
            </span>
          </div>
          <div style={st.spellGrid}>
            {filterList(cantrips).map(sp => (
              <SpellCard key={sp.spellId} spell={sp} isCantrip={true} />
            ))}
          </div>
        </div>
      )}

      {/* Leveled spells section */}
      {(config.spellCount > 0 || (config.spellCount === 0 && cls !== 'Paladin')) && spells1.length > 0 && (
        <div style={st.section}>
          <div style={st.sectionHeader}>
            <span style={st.sectionLabel}>1st-Level Spells</span>
            {config.spellCount > 0 && (
              <span style={{ ...st.counter, color: spellsDone ? '#2ecc71' : '#d4af37' }}>
                {selectedSpells1.length} / {config.spellCount}
              </span>
            )}
            {config.spellCount === 0 && (
              <span style={st.counter}>Reference (auto-prepared)</span>
            )}
          </div>
          <div style={st.spellGrid}>
            {filterList(spells1).map(sp => (
              <SpellCard key={sp.spellId} spell={sp} isCantrip={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  note: {
    fontSize: '0.82rem', color: 'rgba(200,180,140,0.65)',
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: 7, padding: '8px 12px',
  },
  search: {
    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 6, padding: '7px 12px', color: '#e8dcc8', fontSize: '0.85rem',
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.68rem',
    color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase',
  },
  counter: { fontSize: '0.78rem', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700 },
  spellGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6,
    maxHeight: 300, overflowY: 'auto', paddingRight: 4,
  },
  spellCard: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 7, padding: '8px 10px', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  spellCardSelected: {
    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.45)',
  },
  spellTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },
  schoolDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  spellName: { fontSize: '0.82rem', color: '#e8dcc8', fontFamily: "'Cinzel', Georgia, serif", flex: 1, fontWeight: 600 },
  checkmark: { fontSize: '0.75rem', color: '#2ecc71', fontWeight: 700 },
  spellMeta: { fontSize: '0.68rem', color: 'rgba(200,180,140,0.45)' },
  spellDesc: {
    marginTop: 6, fontSize: '0.72rem', color: 'rgba(200,180,140,0.65)',
    lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 5,
  },
};
