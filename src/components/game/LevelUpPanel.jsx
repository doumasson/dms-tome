import { useState } from 'react';
import { CLASSES, getSpellSlots, getFeaturesUpToLevel } from '../../data/classes';
import './LevelUpPanel.css';

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

function getHitDieForClass(className) {
  const hitDice = {
    Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
    Rogue: 8, Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Warlock: 8,
    Sorcerer: 6, Wizard: 6,
  };
  return hitDice[className] || 8;
}

function getCantripGainCount(className, level) {
  if (className === 'Wizard') return 0;
  const cantrips = { Cleric: 4, Druid: 4, Sorcerer: 4, Wizard: 4, Bard: 4, Warlock: 2 };
  const gains = { Cleric: 4, Druid: 4, Sorcerer: [1, 1, 1, 1, 1], Wizard: 0, Bard: [0, 1, 0, 0, 0], Warlock: [0, 0, 0, 1, 0] };
  return cantrips[className] ? 0 : 0;
}

export default function LevelUpPanel({ character, onConfirm, onCancel }) {
  const oldLevel = character?.level || 1;
  const newLevel = Math.min(oldLevel + 1, 20);
  const className = character?.class || '';
  const classData = CLASSES[className];

  const [hpChoice, setHpChoice] = useState('average');
  const [rolledHp, setRolledHp] = useState(null);
  const [step, setStep] = useState('confirm'); // 'confirm' | 'spells' | 'complete'
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [abilityIncreases, setAbilityIncreases] = useState({});

  if (!classData) {
    return (
      <div className="level-up-panel-overlay">
        <div className="level-up-panel">
          <div className="lup-header">⚠ Error</div>
          <p className="lup-text">Character class not found.</p>
          <button className="lup-button primary" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  const hitDie = getHitDieForClass(className);
  const conMod = Math.floor((character?.stats?.con || 10 - 10) / 2);
  let hpGain = 1 + Math.max(0, conMod);

  if (hpChoice === 'roll' && !rolledHp) {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    hpGain = roll + Math.max(0, conMod);
    setRolledHp(roll);
  } else if (hpChoice === 'average') {
    hpGain = Math.ceil(hitDie / 2) + Math.max(0, conMod);
  }

  const handleRoll = () => {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setRolledHp(roll);
    setHpChoice('roll');
  };

  const handleConfirm = () => {
    const levelUpData = {
      newLevel,
      hpGain,
      selectedSpells,
      abilityIncreases,
      timestamp: Date.now(),
    };
    onConfirm?.(levelUpData);
  };

  return (
    <div className="level-up-panel-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="level-up-panel">
        {/* Header */}
        <div className="lup-header">
          <div className="lup-title">⭐ LEVEL UP!</div>
          <div className="lup-level">Level {oldLevel} → {newLevel}</div>
        </div>

        {/* Main Content */}
        <div className="lup-content">
          {step === 'confirm' && (
            <>
              {/* HP Selection */}
              <div className="lup-section">
                <h3 className="lup-section-title">Hit Points</h3>
                <p className="lup-text">d{hitDie} + CON mod ({conMod >= 0 ? '+' : ''}{conMod})</p>

                <div className="lup-hp-choices">
                  <button
                    className={`lup-hp-btn ${hpChoice === 'average' ? 'active' : ''}`}
                    onClick={() => { setHpChoice('average'); setRolledHp(null); }}
                  >
                    <div className="lup-hp-label">Average</div>
                    <div className="lup-hp-value">+{hpGain}</div>
                  </button>

                  <button
                    className={`lup-hp-btn ${hpChoice === 'roll' ? 'active' : ''}`}
                    onClick={handleRoll}
                  >
                    <div className="lup-hp-label">Roll</div>
                    <div className="lup-hp-value">{rolledHp ? '+' + (rolledHp + Math.max(0, conMod)) : '?'}</div>
                  </button>
                </div>
              </div>

              {/* Features/Abilities gained */}
              <div className="lup-section">
                <h3 className="lup-section-title">Class Features</h3>
                {classData.features && classData.features[newLevel] ? (
                  <ul className="lup-features-list">
                    {(classData.features[newLevel] || []).map((f, i) => (
                      <li key={i} className="lup-feature-item">{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="lup-text">No new features at this level.</p>
                )}
              </div>

              {/* Spell Slots info */}
              {classData.castingType && (
                <div className="lup-section">
                  <h3 className="lup-section-title">Spell Slots</h3>
                  <p className="lup-text">Check your character sheet for updated spell slots.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="lup-footer">
          <button className="lup-button secondary" onClick={onCancel}>Cancel</button>
          <button className="lup-button primary" onClick={handleConfirm}>Confirm Level Up</button>
        </div>
      </div>
    </div>
  );
}
