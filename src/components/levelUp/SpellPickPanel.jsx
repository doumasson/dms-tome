import { useState, useMemo } from 'react';
import { SPELLS } from '../../data/spells';

// Known-spell casters: number of new spells gained per level-up
export const LEVEL_UP_SPELL_GAINS = {
  Wizard: 2,
  Sorcerer: 1,
  Warlock: 1,
  Bard: 1,
  Ranger: 1,
};

// Cantrip gains: class → levels at which +1 cantrip is gained
const CANTRIP_GAIN_LEVELS = {
  Wizard:   [4, 10],
  Sorcerer: [4, 10],
  Warlock:  [4, 10],
  Bard:     [4, 10],
  Cleric:   [4, 10],
  Druid:    [4, 10],
};

// Prepared casters don't pick leveled spells — they prepare from the full class list daily
const PREPARED_CASTERS = new Set(['Cleric', 'Druid', 'Paladin']);

export function getSpellGainCount(cls) {
  return LEVEL_UP_SPELL_GAINS[cls] || 0;
}

export function getCantripGainCount(cls, newLevel) {
  return (CANTRIP_GAIN_LEVELS[cls] || []).includes(newLevel) ? 1 : 0;
}

export function isPreparedCaster(cls) {
  return PREPARED_CASTERS.has(cls);
}

const SCHOOL_COLORS = {
  abjuration: '#4e90cc', conjuration: '#27ae60', divination: '#f39c12',
  enchantment: '#e91e8c', evocation: '#e05c3a', illusion: '#9b59b6',
  necromancy: '#2c3e50', transmutation: '#16a085',
};

export default function SpellPickPanel({ cls, newSlots, knownSpells, onChange, cantripGain = 0 }) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectedCantrips, setSelectedCantrips] = useState([]);

  const spellsToGain = getSpellGainCount(cls);

  // Max spell level = highest slot level available
  const maxSpellLevel = useMemo(() => {
    if (!newSlots || Object.keys(newSlots).length === 0) return 0;
    return Math.max(...Object.keys(newSlots).map(Number));
  }, [newSlots]);

  // Known spell names set for deduplication
  const knownNames = useMemo(() => {
    const names = new Set();
    (knownSpells || []).forEach(sp => names.add(typeof sp === 'string' ? sp : sp.name));
    return names;
  }, [knownSpells]);

  const available = useMemo(() => {
    return (SPELLS || [])
      .filter(sp =>
        sp.level >= 1 &&
        sp.level <= maxSpellLevel &&
        sp.classes?.includes(cls) &&
        !knownNames.has(sp.name)
      )
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [cls, maxSpellLevel, knownNames]);

  const availableCantrips = useMemo(() => {
    return (SPELLS || [])
      .filter(sp => sp.level === 0 && sp.classes?.includes(cls) && !knownNames.has(sp.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cls, knownNames]);

  const filtered = filter
    ? available.filter(sp => sp.name.toLowerCase().includes(filter.toLowerCase()))
    : available;

  function toggle(spell) {
    setSelected(prev => {
      let next;
      if (prev.find(s => s.name === spell.name)) {
        next = prev.filter(s => s.name !== spell.name);
      } else if (prev.length < spellsToGain) {
        next = [...prev, spell];
      } else {
        return prev;
      }
      onChange([...next, ...selectedCantrips]);
      return next;
    });
  }

  function toggleCantrip(spell) {
    setSelectedCantrips(prev => {
      let next;
      if (prev.find(s => s.name === spell.name)) {
        next = prev.filter(s => s.name !== spell.name);
      } else if (prev.length < cantripGain) {
        next = [...prev, spell];
      } else {
        return prev;
      }
      onChange([...selected, ...next]);
      return next;
    });
  }

  if (isPreparedCaster(cls) && cantripGain === 0) {
    return (
      <div style={sp.preparedNote}>
        <div style={sp.preparedIcon}>📖</div>
        <div style={sp.preparedText}>
          As a {cls}, you prepare spells from your full class list each day — no selection needed.
          Your new spell slots are available immediately.
        </div>
      </div>
    );
  }

  if (spellsToGain === 0 && cantripGain === 0) return null;
  if (spellsToGain > 0 && maxSpellLevel === 0 && cantripGain === 0) return null;

  return (
    <div>
      <div style={sp.counter}>
        <span style={{ color: selected.length >= spellsToGain ? '#2ecc71' : '#d4af37' }}>
          {selected.length}
        </span>
        <span style={{ color: 'rgba(200,180,140,0.4)' }}>/{spellsToGain} spells selected</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(200,180,140,0.35)' }}>
          up to level {maxSpellLevel} spells
        </span>
      </div>

      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search spells…"
        style={sp.searchInput}
      />

      <div style={sp.spellList}>
        {filtered.length === 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center', fontStyle: 'italic' }}>
            No available spells.
          </div>
        )}
        {filtered.map(spell => {
          const isSelected = !!selected.find(s => s.name === spell.name);
          const isDisabled = !isSelected && selected.length >= spellsToGain;
          const schoolColor = SCHOOL_COLORS[spell.school] || '#888';
          return (
            <button
              key={spell.name}
              onClick={() => !isDisabled && toggle(spell)}
              style={{
                ...sp.spellBtn,
                ...(isSelected ? sp.spellBtnSelected : {}),
                ...(isDisabled ? sp.spellBtnDisabled : {}),
              }}
            >
              <span style={{ ...sp.schoolDot, background: schoolColor }} />
              <span style={sp.spellName}>{spell.name}</span>
              <span style={{ ...sp.levelBadge, color: schoolColor, borderColor: `${schoolColor}44` }}>
                {spell.level === 0 ? 'C' : `L${spell.level}`}
              </span>
              {isSelected && <span style={sp.checkmark}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Cantrip gain section */}
      {cantripGain > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={sp.counter}>
            <span style={{ color: selectedCantrips.length >= cantripGain ? '#2ecc71' : '#5b8fff' }}>
              {selectedCantrips.length}
            </span>
            <span style={{ color: 'rgba(200,180,140,0.4)' }}>/{cantripGain} cantrip selected</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(200,180,140,0.35)' }}>
              NEW CANTRIP
            </span>
          </div>
          <div style={{ ...sp.spellList, maxHeight: 160 }}>
            {availableCantrips.length === 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center', fontStyle: 'italic' }}>
                No available cantrips.
              </div>
            )}
            {availableCantrips.map(spell => {
              const isSelected = !!selectedCantrips.find(s => s.name === spell.name);
              const isDisabled = !isSelected && selectedCantrips.length >= cantripGain;
              const schoolColor = SCHOOL_COLORS[spell.school] || '#888';
              return (
                <button
                  key={spell.name}
                  onClick={() => !isDisabled && toggleCantrip(spell)}
                  style={{
                    ...sp.spellBtn,
                    ...(isSelected ? { background: 'rgba(91,143,255,0.12)', border: '1px solid rgba(91,143,255,0.4)' } : {}),
                    ...(isDisabled ? sp.spellBtnDisabled : {}),
                  }}
                >
                  <span style={{ ...sp.schoolDot, background: schoolColor }} />
                  <span style={sp.spellName}>{spell.name}</span>
                  <span style={{ ...sp.levelBadge, color: '#5b8fff', borderColor: 'rgba(91,143,255,0.3)' }}>C</span>
                  {isSelected && <span style={{ ...sp.checkmark, color: '#5b8fff' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const sp = {
  preparedNote: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 8, padding: '12px 14px',
  },
  preparedIcon: { fontSize: '1.4rem', flexShrink: 0 },
  preparedText: {
    fontSize: '0.78rem', color: 'rgba(200,180,140,0.7)', lineHeight: 1.5,
    fontStyle: 'italic',
  },
  counter: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.75rem', fontWeight: 700, marginBottom: 10,
  },
  searchInput: {
    width: '100%', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
    color: 'var(--text-primary)', padding: '6px 10px',
    fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: 8,
    outline: 'none',
  },
  spellList: {
    maxHeight: 240, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  spellBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 5, padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.12s',
  },
  spellBtnSelected: {
    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)',
  },
  spellBtnDisabled: {
    opacity: 0.35, cursor: 'not-allowed',
  },
  schoolDot: {
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
  },
  spellName: {
    flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)',
  },
  levelBadge: {
    fontSize: '0.6rem', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif",
    border: '1px solid', borderRadius: 3, padding: '1px 5px', flexShrink: 0,
  },
  checkmark: {
    color: '#d4af37', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
  },
};
