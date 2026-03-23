import './PreCombatMenu.css';

/**
 * Pre-Combat Menu Component
 * Choice panel for encountering enemies
 * Options: Sneak, Talk, Pickpocket, Ambush, Charge
 */

export default function PreCombatMenu({
  enemies = [],
  onSneak = () => {},
  onTalk = () => {},
  onPickpocket = () => {},
  onAmbush = () => {},
  onCharge = () => {},
  onCancel = () => {}
}) {
  const enemyCount = enemies.length;
  const enemyNames = enemies.map(e => e.name).join(', ');

  return (
    <div className="precombat-menu-overlay">
      <div className="precombat-menu">
        <div className="menu-header">
          <h2>Encounter!</h2>
          <p className="encounter-desc">
            You have spotted {enemyCount} {enemyCount === 1 ? 'enemy' : 'enemies'}
          </p>
          <p className="enemy-names">{enemyNames}</p>
        </div>

        <div className="menu-options">
          <button
            className="menu-option sneak-btn"
            onClick={onSneak}
            title="Attempt to sneak past or hide"
          >
            <span className="option-icon">🥷</span>
            <span className="option-name">Sneak</span>
            <span className="option-desc">Stealth Check (DC 13)</span>
          </button>

          <button
            className="menu-option talk-btn"
            onClick={onTalk}
            title="Attempt to talk to the enemies"
          >
            <span className="option-icon">💬</span>
            <span className="option-name">Talk</span>
            <span className="option-desc">Persuasion Check (DC 14)</span>
          </button>

          <button
            className="menu-option pickpocket-btn"
            onClick={onPickpocket}
            title="Attempt to pickpocket while undetected"
          >
            <span className="option-icon">💰</span>
            <span className="option-name">Pickpocket</span>
            <span className="option-desc">Sleight of Hand (DC 15)</span>
          </button>

          <button
            className="menu-option ambush-btn"
            onClick={onAmbush}
            title="Prepare an ambush attack"
          >
            <span className="option-icon">⚔️</span>
            <span className="option-name">Ambush</span>
            <span className="option-desc">Initiative Advantage</span>
          </button>

          <button
            className="menu-option charge-btn"
            onClick={onCharge}
            title="Charge directly at the enemies"
          >
            <span className="option-icon">💥</span>
            <span className="option-name">Charge</span>
            <span className="option-desc">Direct Combat</span>
          </button>
        </div>

        <div className="menu-footer">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
