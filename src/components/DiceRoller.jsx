import { useState } from 'react';
import useStore from '../store/useStore';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRoller() {
  const addRoll = useStore((s) => s.addRoll);
  const rollHistory = useStore((s) => s.dice.rollHistory);
  const clearHistory = useStore((s) => s.clearHistory);

  const [selectedDie, setSelectedDie] = useState(20);
  const [advantage, setAdvantage] = useState('normal'); // 'normal' | 'advantage' | 'disadvantage'
  const [modifier, setModifier] = useState(0);
  const [count, setCount] = useState(1);
  const [lastResult, setLastResult] = useState(null);

  function handleRoll() {
    const rolls = [];
    for (let i = 0; i < Math.max(1, count); i++) {
      rolls.push(rollDie(selectedDie));
    }

    let displayRolls = [...rolls];
    let finalValue;
    let advantageRolls = null;

    if (advantage !== 'normal' && selectedDie === 20 && count === 1) {
      const roll2 = rollDie(20);
      advantageRolls = [rolls[0], roll2];
      if (advantage === 'advantage') {
        finalValue = Math.max(rolls[0], roll2) + Number(modifier);
      } else {
        finalValue = Math.min(rolls[0], roll2) + Number(modifier);
      }
    } else {
      finalValue = rolls.reduce((a, b) => a + b, 0) + Number(modifier);
    }

    const entry = {
      id: crypto.randomUUID(),
      die: selectedDie,
      count,
      rolls: displayRolls,
      advantageRolls,
      advantage,
      modifier: Number(modifier),
      total: finalValue,
      timestamp: new Date().toLocaleTimeString(),
    };

    setLastResult(entry);
    addRoll(entry);
  }

  function formatRollLabel(entry) {
    let base = `${entry.count}d${entry.die}`;
    if (entry.modifier !== 0) {
      base += entry.modifier > 0 ? ` +${entry.modifier}` : ` ${entry.modifier}`;
    }
    if (entry.advantage === 'advantage') base += ' (Adv)';
    if (entry.advantage === 'disadvantage') base += ' (Dis)';
    return base;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Dice Roller</h2>

      {/* Die selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Choose Die</h3>
        <div style={styles.diceGrid}>
          {DICE_TYPES.map((d) => (
            <button
              key={d}
              className={selectedDie === d ? 'btn-gold' : 'btn-dark'}
              style={styles.dieButton}
              onClick={() => setSelectedDie(d)}
            >
              d{d}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Number of Dice</h3>
        <div style={styles.row}>
          <button className="btn-dark btn-sm" onClick={() => setCount(Math.max(1, count - 1))}>−</button>
          <span style={styles.countDisplay}>{count}</span>
          <button className="btn-dark btn-sm" onClick={() => setCount(Math.min(20, count + 1))}>+</button>
        </div>
      </div>

      {/* Advantage / Disadvantage */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Roll Type</h3>
        <div style={styles.row}>
          {['normal', 'advantage', 'disadvantage'].map((type) => (
            <button
              key={type}
              className={advantage === type ? 'btn-gold' : 'btn-dark'}
              style={styles.advButton}
              onClick={() => setAdvantage(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Modifier */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Modifier</h3>
        <div style={styles.row}>
          <button className="btn-dark btn-sm" onClick={() => setModifier((m) => m - 1)}>−</button>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(Number(e.target.value))}
            style={styles.modInput}
          />
          <button className="btn-dark btn-sm" onClick={() => setModifier((m) => m + 1)}>+</button>
        </div>
      </div>

      {/* Roll Button */}
      <button className="btn-gold" style={styles.rollButton} onClick={handleRoll}>
        Roll {count > 1 ? `${count}d${selectedDie}` : `d${selectedDie}`}
        {modifier !== 0 ? (modifier > 0 ? ` +${modifier}` : ` ${modifier}`) : ''}
      </button>

      {/* Last Result */}
      {lastResult && (
        <div style={styles.resultCard} className="card">
          <div style={styles.resultLabel}>{formatRollLabel(lastResult)}</div>
          <div style={styles.resultTotal}>{lastResult.total}</div>
          {lastResult.advantageRolls && (
            <div style={styles.resultDetail}>
              Rolls: {lastResult.advantageRolls[0]} and {lastResult.advantageRolls[1]}
              {' — '}{lastResult.advantage === 'advantage' ? 'kept higher' : 'kept lower'}
            </div>
          )}
          {!lastResult.advantageRolls && lastResult.rolls.length > 1 && (
            <div style={styles.resultDetail}>
              Individual rolls: [{lastResult.rolls.join(', ')}]
            </div>
          )}
          {lastResult.modifier !== 0 && (
            <div style={styles.resultDetail}>
              Base: {lastResult.total - lastResult.modifier} + modifier: {lastResult.modifier > 0 ? `+${lastResult.modifier}` : lastResult.modifier}
            </div>
          )}
        </div>
      )}

      {/* Roll History */}
      {rollHistory.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>
            <h3 style={styles.sectionTitle}>Roll History</h3>
            <button className="btn-dark btn-sm" onClick={clearHistory}>Clear</button>
          </div>
          <div style={styles.historyList}>
            {rollHistory.map((entry) => (
              <div key={entry.id} style={styles.historyItem} className="card">
                <span style={styles.historyLabel}>{formatRollLabel(entry)}</span>
                <span style={styles.historyTime}>{entry.timestamp}</span>
                <span style={styles.historyTotal}>{entry.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  title: {
    marginBottom: 4,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    color: 'var(--parchment-dim)',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontWeight: 600,
  },
  diceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  dieButton: {
    fontSize: '1.1rem',
    letterSpacing: '0.02em',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  advButton: {
    flex: 1,
    minWidth: 100,
  },
  countDisplay: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--gold)',
    fontFamily: "'Cinzel', 'Georgia', serif",
    textShadow: '0 0 10px var(--gold-glow)',
  },
  modInput: {
    width: 80,
    textAlign: 'center',
    fontSize: '1.1rem',
  },
  rollButton: {
    fontSize: '1.2rem',
    padding: '18px 32px',
    minHeight: 60,
    width: '100%',
    letterSpacing: '0.06em',
  },
  resultCard: {
    textAlign: 'center',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    background: 'linear-gradient(160deg, #1e1308, #1a1005, #161002)',
    border: '1px solid var(--border-gold)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 20px var(--gold-glow)',
    animation: 'fadeIn 0.25s ease',
  },
  resultLabel: {
    color: 'var(--parchment-dim)',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  resultTotal: {
    fontSize: '6rem',
    fontWeight: 700,
    color: 'var(--gold)',
    lineHeight: 1,
    fontFamily: "'Cinzel', 'Georgia', serif",
    textShadow: '0 0 30px var(--gold-glow), 0 0 60px rgba(212,175,55,0.1)',
  },
  resultDetail: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    fontStyle: 'italic',
  },
  historySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    transition: 'border-color 0.15s',
  },
  historyLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    flex: 1,
    fontStyle: 'italic',
  },
  historyTime: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    flex: 1,
    textAlign: 'center',
  },
  historyTotal: {
    color: 'var(--gold)',
    fontWeight: 700,
    fontSize: '1.2rem',
    minWidth: 40,
    textAlign: 'right',
    fontFamily: "'Cinzel', 'Georgia', serif",
    textShadow: '0 0 8px var(--gold-glow)',
  },
};
