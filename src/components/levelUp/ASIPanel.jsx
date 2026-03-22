import { useState } from 'react';

// ─── ASI levels by class (5e SRD) ──────────────────────────────────────────────
const ASI_LEVELS = {
  default: [4, 8, 12, 16, 19],
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19],
};

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

export function grantsASI(className, level) {
  const levels = ASI_LEVELS[className] || ASI_LEVELS.default;
  return levels.includes(level);
}

export default function ASIPanel({ stats, onChange }) {
  const [mode, setMode] = useState('plus2'); // 'plus2' | 'plus1x2'
  const [single, setSingle] = useState('');   // ability key for +2
  const [first, setFirst] = useState('');      // first ability for +1/+1
  const [second, setSecond] = useState('');     // second ability for +1/+1

  function emitChanges(newMode, newSingle, newFirst, newSecond) {
    const increases = {};
    if (newMode === 'plus2' && newSingle) {
      if ((stats[newSingle] || 10) + 2 <= 20) {
        increases[newSingle] = 2;
      } else if ((stats[newSingle] || 10) + 1 <= 20) {
        increases[newSingle] = 1; // cap at 20
      }
    } else if (newMode === 'plus1x2') {
      if (newFirst && (stats[newFirst] || 10) + 1 <= 20) increases[newFirst] = 1;
      if (newSecond && newSecond !== newFirst && (stats[newSecond] || 10) + 1 <= 20) increases[newSecond] = 1;
    }
    onChange(increases);
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    setSingle('');
    setFirst('');
    setSecond('');
    onChange({});
  }

  function handleSingleChange(ability) {
    setSingle(ability);
    emitChanges('plus2', ability, first, second);
  }

  function handleFirstChange(ability) {
    const newSecond = ability === second ? '' : second;
    setFirst(ability);
    setSecond(newSecond);
    emitChanges('plus1x2', single, ability, newSecond);
  }

  function handleSecondChange(ability) {
    setSecond(ability);
    emitChanges('plus1x2', single, first, ability);
  }

  return (
    <div style={s.wrapper}>
      {/* Current scores display */}
      <div style={s.scoresRow}>
        {ABILITIES.map(ab => {
          const base = stats[ab] || 10;
          const mod = Math.floor((base - 10) / 2);
          const isSelected = mode === 'plus2' ? ab === single : ab === first || ab === second;
          const increase = mode === 'plus2'
            ? (ab === single ? Math.min(2, 20 - base) : 0)
            : ((ab === first || ab === second) ? Math.min(1, 20 - base) : 0);
          return (
            <div key={ab} style={{ ...s.scoreBadge, ...(isSelected ? s.scoreBadgeActive : {}) }}>
              <span style={s.scoreLabel}>{ABILITY_LABELS[ab]}</span>
              <span style={s.scoreVal}>{base}</span>
              <span style={s.scoreMod}>{mod >= 0 ? `+${mod}` : mod}</span>
              {increase > 0 && <span style={s.increaseTag}>+{increase}</span>}
              {base >= 20 && <span style={s.maxTag}>MAX</span>}
            </div>
          );
        })}
      </div>

      {/* Mode selection */}
      <div style={s.modeRow}>
        <button
          style={{ ...s.modeBtn, ...(mode === 'plus2' ? s.modeBtnActive : {}) }}
          onClick={() => handleModeChange('plus2')}
        >
          +2 to one ability
        </button>
        <button
          style={{ ...s.modeBtn, ...(mode === 'plus1x2' ? s.modeBtnActive : {}) }}
          onClick={() => handleModeChange('plus1x2')}
        >
          +1 to two abilities
        </button>
      </div>

      {/* Ability selection */}
      {mode === 'plus2' && (
        <div style={s.pickRow}>
          <span style={s.pickLabel}>Increase by +2:</span>
          <select style={s.select} value={single} onChange={e => handleSingleChange(e.target.value)}>
            <option value="">— Choose —</option>
            {ABILITIES.filter(ab => (stats[ab] || 10) < 20).map(ab => (
              <option key={ab} value={ab}>{ABILITY_LABELS[ab]} ({stats[ab] || 10} → {Math.min(20, (stats[ab] || 10) + 2)})</option>
            ))}
          </select>
        </div>
      )}

      {mode === 'plus1x2' && (
        <div style={s.pickCol}>
          <div style={s.pickRow}>
            <span style={s.pickLabel}>First +1:</span>
            <select style={s.select} value={first} onChange={e => handleFirstChange(e.target.value)}>
              <option value="">— Choose —</option>
              {ABILITIES.filter(ab => (stats[ab] || 10) < 20).map(ab => (
                <option key={ab} value={ab}>{ABILITY_LABELS[ab]} ({stats[ab] || 10} → {(stats[ab] || 10) + 1})</option>
              ))}
            </select>
          </div>
          <div style={s.pickRow}>
            <span style={s.pickLabel}>Second +1:</span>
            <select style={s.select} value={second} onChange={e => handleSecondChange(e.target.value)}>
              <option value="">— Choose —</option>
              {ABILITIES.filter(ab => (stats[ab] || 10) < 20 && ab !== first).map(ab => (
                <option key={ab} value={ab}>{ABILITY_LABELS[ab]} ({stats[ab] || 10} → {(stats[ab] || 10) + 1})</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  scoresRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '6px 8px',
    minWidth: 48,
    position: 'relative',
  },
  scoreBadgeActive: {
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid rgba(212,175,55,0.4)',
  },
  scoreLabel: {
    fontSize: '0.55rem',
    color: 'rgba(200,180,140,0.5)',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  scoreVal: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#e8dcc8',
    lineHeight: 1.2,
  },
  scoreMod: {
    fontSize: '0.6rem',
    color: 'rgba(200,180,140,0.4)',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  increaseTag: {
    position: 'absolute',
    top: -5,
    right: -5,
    background: '#2ecc71',
    color: '#0a1a0a',
    fontSize: '0.5rem',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: 4,
  },
  maxTag: {
    position: 'absolute',
    top: -5,
    right: -5,
    background: 'rgba(200,80,80,0.8)',
    color: '#fff',
    fontSize: '0.45rem',
    fontWeight: 700,
    padding: '1px 3px',
    borderRadius: 3,
  },
  modeRow: {
    display: 'flex',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.72rem',
    padding: '6px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modeBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
  },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pickCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  pickLabel: {
    fontSize: '0.72rem',
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
    whiteSpace: 'nowrap',
    minWidth: 70,
  },
  select: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 6,
    color: '#e8dcc8',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.72rem',
    padding: '6px 8px',
    cursor: 'pointer',
    outline: 'none',
  },
};
