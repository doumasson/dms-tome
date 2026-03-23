import { useState } from 'react';
import './AbilityScores.css';

/**
 * Ability Scores Component
 * Standard array, point buy, and roll options
 * Real SRD 5.1 ability score rules
 */

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_POINTS = 27;

export default function AbilityScores({
  onConfirm = () => {},
  initialScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
}) {
  const [method, setMethod] = useState('standard'); // standard | pointbuy | roll
  const [scores, setScores] = useState(initialScores);
  const [unassigned, setUnassigned] = useState([...STANDARD_ARRAY]);

  const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const abilityNames = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma'
  };

  // Standard Array: assign provided array values to abilities
  const handleStandardArrayChange = (ability, valueIndex) => {
    const newScores = { ...scores };
    const oldValue = newScores[ability];

    // Remove old value from unassigned
    const oldIndex = unassigned.indexOf(oldValue);
    if (oldIndex > -1) {
      setUnassigned(prev => [...prev.slice(0, oldIndex), ...prev.slice(oldIndex + 1)]);
    }

    // Set new value
    newScores[ability] = STANDARD_ARRAY[valueIndex];
    setUnassigned(prev => [...prev, ...STANDARD_ARRAY.filter(v => !Object.values(newScores).includes(v) || v === oldValue)]);
    setScores(newScores);
  };

  // Point Buy: spend points (27 total)
  const getPointBuyPoints = () => {
    const pointCosts = {
      8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
    };
    return Object.values(scores).reduce((sum, score) => sum + (pointCosts[score] || 0), 0);
  };

  const handlePointBuyChange = (ability, newValue) => {
    const score = Math.max(8, Math.min(15, newValue));
    setScores(prev => ({ ...prev, [ability]: score }));
  };

  // Roll: generate random scores
  const handleRoll = () => {
    const rolled = {};
    abilities.forEach(ability => {
      const dice = [];
      for (let i = 0; i < 4; i++) {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
      dice.sort((a, b) => b - a);
      rolled[ability] = dice.slice(0, 3).reduce((a, b) => a + b, 0);
    });
    setScores(rolled);
  };

  const handleConfirm = () => {
    onConfirm(scores);
  };

  const pointsUsed = method === 'pointbuy' ? getPointBuyPoints() : 0;
  const pointsRemaining = POINT_BUY_POINTS - pointsUsed;

  return (
    <div className="ability-scores-container">
      <div className="scores-header">
        <h1>Set Your Ability Scores</h1>
        <p>Choose your character's six core abilities</p>
      </div>

      {/* Method selector */}
      <div className="method-selector">
        <button
          className={`method-btn ${method === 'standard' ? 'active' : ''}`}
          onClick={() => setMethod('standard')}
        >
          <span className="method-name">Standard Array</span>
          <span className="method-desc">15, 14, 13, 12, 10, 8</span>
        </button>
        <button
          className={`method-btn ${method === 'pointbuy' ? 'active' : ''}`}
          onClick={() => setMethod('pointbuy')}
        >
          <span className="method-name">Point Buy</span>
          <span className="method-desc">27 points to distribute</span>
        </button>
        <button
          className={`method-btn ${method === 'roll' ? 'active' : ''}`}
          onClick={() => setMethod('roll')}
        >
          <span className="method-name">Roll 4d6</span>
          <span className="method-desc">4d6 drop lowest</span>
        </button>
      </div>

      {/* Scores display */}
      <div className="scores-grid">
        {abilities.map(ability => (
          <div key={ability} className="ability-input">
            <label className="ability-label">{abilityNames[ability]}</label>

            {method === 'pointbuy' && (
              <div className="pointbuy-control">
                <button
                  className="adjust-btn minus"
                  onClick={() => handlePointBuyChange(ability, scores[ability] - 1)}
                >
                  −
                </button>
                <span className="score-value">{scores[ability]}</span>
                <button
                  className="adjust-btn plus"
                  onClick={() => handlePointBuyChange(ability, scores[ability] + 1)}
                >
                  +
                </button>
              </div>
            )}

            {method === 'standard' && (
              <select
                className="score-select"
                value={scores[ability]}
                onChange={(e) => handleStandardArrayChange(ability, STANDARD_ARRAY.indexOf(parseInt(e.target.value)))}
              >
                <option value="">—</option>
                {STANDARD_ARRAY.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            )}

            {method === 'roll' && (
              <span className="score-display">{scores[ability]}</span>
            )}

            <span className="modifier">({scores[ability] >= 10 ? '+' : ''}{Math.floor((scores[ability] - 10) / 2)})</span>
          </div>
        ))}
      </div>

      {/* Point Buy info */}
      {method === 'pointbuy' && (
        <div className={`pointbuy-info ${pointsRemaining < 0 ? 'over-budget' : ''}`}>
          <span>Points used: {pointsUsed} / {POINT_BUY_POINTS}</span>
          <span>Remaining: {Math.max(0, pointsRemaining)}</span>
        </div>
      )}

      {/* Roll button */}
      {method === 'roll' && (
        <button className="roll-button" onClick={handleRoll}>
          🎲 Roll Again
        </button>
      )}

      {/* Confirm button */}
      <button
        className="confirm-button"
        onClick={handleConfirm}
        disabled={method === 'pointbuy' && pointsRemaining < 0}
      >
        Confirm Scores
      </button>
    </div>
  );
}
