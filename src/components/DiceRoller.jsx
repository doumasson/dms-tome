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
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  diceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  dieButton: {
    fontSize: '1.1rem',
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
    minWidth: 40,
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: 'var(--gold)',
  },
  modInput: {
    width: 80,
    textAlign: 'center',
    fontSize: '1.1rem',
  },
  rollButton: {
    fontSize: '1.3rem',
    padding: '16px 32px',
    minHeight: 56,
    width: '100%',
  },
  resultCard: {
    textAlign: 'center',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  resultLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  resultTotal: {
    fontSize: '5rem',
    fontWeight: 'bold',
    color: 'var(--gold)',
    lineHeight: 1,
  },
  resultDetail: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
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
    gap: 8,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
  },
  historyLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    flex: 1,
  },
  historyTime: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    flex: 1,
    textAlign: 'center',
  },
  historyTotal: {
    color: 'var(--gold)',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    minWidth: 40,
    textAlign: 'right',
  },
};
