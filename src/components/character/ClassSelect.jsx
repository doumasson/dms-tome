import { useState } from 'react';
import { CLASSES } from '../../data/classes';
import './ClassSelect.css';

/**
 * Class Selection Screen
 * All SRD 5.1 classes with descriptions and abilities
 * Dark fantasy card layout, mobile-friendly grid
 */
export default function ClassSelect({ onSelect, onBack }) {
  const [selectedClass, setSelectedClass] = useState(null);

  const classNames = Object.keys(CLASSES);

  const handleSelect = (className) => {
    setSelectedClass(className);
  };

  const handleConfirm = () => {
    if (selectedClass && onSelect) {
      onSelect({
        name: selectedClass,
        ...CLASSES[selectedClass]
      });
    }
  };

  const getClassEmoji = (className) => {
    const emojis = {
      Barbarian: '⚔️',
      Bard: '🎵',
      Cleric: '✨',
      Druid: '🌿',
      Fighter: '🛡️',
      Monk: '🥋',
      Paladin: '⚡',
      Ranger: '🏹',
      Rogue: '🗡️',
      Sorcerer: '🔥',
      Warlock: '📖',
      Wizard: '📚'
    };
    return emojis[className] || '⚔️';
  };

  const getClassDescription = (className) => {
    const descriptions = {
      Barbarian: 'Channel raw primal rage into devastating combat. Unmatched fury and resilience in battle.',
      Bard: 'Master of words and magic. Use charm, deception, and inspiration to sway the world.',
      Cleric: 'Channel divine power to heal, smite, and support. Servant of your deity\'s will.',
      Druid: 'Harness nature\'s power and transform into beasts. Protector of the wild.',
      Fighter: 'Master of weapons and tactics. Unparalleled combat skill and endurance.',
      Monk: 'Perfect your body and spirit through discipline. Strike with precision and move with grace.',
      Paladin: 'Holy warrior bound by oath and conviction. Smite evil and protect the innocent.',
      Ranger: 'Skilled tracker and hunter. Master the wilderness and strike from shadows.',
      Rogue: 'Expert in stealth and precision. Exploit weakness and strike where it counts.',
      Sorcerer: 'Innate magical power flowing through your veins. Raw sorcerous might.',
      Warlock: 'Bargain with otherworldly powers for eldritch knowledge and magic.',
      Wizard: 'Master of studied arcane magic. Adapt to any situation with the right spell.'
    };
    return descriptions[className] || '';
  };

  const selectedClassData = selectedClass ? CLASSES[selectedClass] : null;

  return (
    <div className="class-select-screen">
      <div className="class-select-header">
        <h1>Choose Your Class</h1>
        <p>Select a class to define your abilities and role in the world</p>
      </div>

      <div className="class-select-container">
        {/* Class cards grid */}
        <div className="class-cards-grid">
          {classNames.map((className) => {
            const classData = CLASSES[className];
            return (
              <button
                key={className}
                className={`class-card ${selectedClass === className ? 'selected' : ''}`}
                onClick={() => handleSelect(className)}
              >
                <div className="class-card-icon">{getClassEmoji(className)}</div>

                <h3 className="class-name">{className}</h3>

                <div className="class-meta">
                  <span className="meta-item">
                    <span className="meta-label">Hit Die:</span>
                    <span className="meta-value">d{classData.hitDie}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Primary:</span>
                    <span className="meta-value">{classData.primaryAbility}</span>
                  </span>
                </div>

                <p className="class-description">{getClassDescription(className)}</p>

                {/* Selection indicator */}
                {selectedClass === className && (
                  <div className="class-card-indicator">✓</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected class details panel */}
        {selectedClassData && (
          <div className="class-details-panel">
            <h2>{selectedClass}</h2>

            <div className="details-section">
              <h3>Class Features</h3>
              <ul className="features-list">
                {selectedClassData.features?.[1]?.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>

            {selectedClassData.skillChoices && (
              <div className="details-section">
                <h3>Skill Proficiencies</h3>
                <p className="skill-count">Choose {selectedClassData.skillCount} skills:</p>
                <div className="skills-preview">
                  {selectedClassData.skillChoices.slice(0, 4).map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                  {selectedClassData.skillChoices.length > 4 && (
                    <span className="skill-tag">+{selectedClassData.skillChoices.length - 4} more</span>
                  )}
                </div>
              </div>
            )}

            {selectedClassData.castingType && (
              <div className="details-section">
                <h3>Spellcasting</h3>
                <p className="spell-type">{selectedClassData.castingType} Caster</p>
                <p className="spell-ability">Ability: {selectedClassData.spellAbility}</p>
              </div>
            )}

            <div className="details-actions">
              {onBack && (
                <button className="btn-back" onClick={onBack}>
                  ← Back
                </button>
              )}
              <button className="btn-confirm" onClick={handleConfirm}>
                Confirm Class
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
