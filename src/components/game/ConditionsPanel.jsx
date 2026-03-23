import { useState } from 'react';
import './ConditionsPanel.css';

const CONDITIONS = [
  {
    name: 'Blinded',
    description: 'A blinded creature can\'t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.',
  },
  {
    name: 'Charmed',
    description: 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.',
  },
  {
    name: 'Deafened',
    description: 'A deafened creature can\'t hear and automatically fails any ability check that requires hearing.',
  },
  {
    name: 'Exhaustion',
    description: 'Some special abilities and environmental hazards can cause exhaustion. Exhaustion is measured in six levels. An effect can give a creature one or more levels of exhaustion, as specified in the effect\'s description.',
  },
  {
    name: 'Frightened',
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can\'t willingly move closer to the source of its fear.',
  },
  {
    name: 'Grappled',
    description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler.',
  },
  {
    name: 'Incapacitated',
    description: 'An incapacitated creature can\'t take actions or reactions.',
  },
  {
    name: 'Invisible',
    description: 'An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature\'s location can be detected by any noise it makes or any tracks it leaves.',
  },
  {
    name: 'Paralyzed',
    description: 'A paralyzed creature is incapacitated and can\'t move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
  },
  {
    name: 'Petrified',
    description: 'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
  },
  {
    name: 'Poisoned',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
  },
  {
    name: 'Prone',
    description: 'A prone creature\'s only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature.',
  },
  {
    name: 'Restrained',
    description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.',
  },
  {
    name: 'Stunned',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage.',
  },
  {
    name: 'Unconscious',
    description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings. The creature drops whatever it\'s holding and falls prone. The creature automatically fails Strength and Dexterity saving throws.',
  },
];

/**
 * ConditionsPanel - SRD 5.1 conditions reference
 * Shows all conditions with descriptions and effects
 */
export default function ConditionsPanel({
  activeConditions = [],
  onClose = () => {},
}) {
  const [selectedCondition, setSelectedCondition] = useState(null);

  const currentCondition = selectedCondition
    ? CONDITIONS.find(c => c.name === selectedCondition)
    : null;

  const isActive = (conditionName) => activeConditions.includes(conditionName);

  return (
    <div className="conditions-panel-overlay" onClick={onClose}>
      <div className="conditions-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="conditions-header">
          <h2 className="conditions-title">📋 Conditions</h2>
          <button className="conditions-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Main Content */}
        <div className="conditions-main">
          {/* Conditions List */}
          <div className="condition-list">
            {CONDITIONS.map((condition) => (
              <button
                key={condition.name}
                className={`condition-item ${selectedCondition === condition.name ? 'selected' : ''} ${isActive(condition.name) ? 'active' : ''}`}
                onClick={() => setSelectedCondition(condition.name)}
              >
                <span className="condition-name">{condition.name}</span>
                {isActive(condition.name) && <span className="active-badge">●</span>}
              </button>
            ))}
          </div>

          {/* Condition Details */}
          {currentCondition ? (
            <div className="condition-detail">
              <div className="detail-header">
                <h3 className="condition-detail-name">{currentCondition.name}</h3>
                {isActive(currentCondition.name) && (
                  <span className="active-indicator">Active</span>
                )}
              </div>
              <div className="condition-description">
                {currentCondition.description}
              </div>
            </div>
          ) : (
            <div className="condition-detail-empty">
              Select a condition to view details
            </div>
          )}
        </div>

        {/* Legend */}
        {activeConditions.length > 0 && (
          <div className="conditions-legend">
            <div className="legend-item">
              <span className="legend-dot active">●</span>
              <span className="legend-text">{activeConditions.length} active condition{activeConditions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="conditions-footer">
          <button className="conditions-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
