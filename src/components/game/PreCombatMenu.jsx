import './PreCombatMenu.css';

/**
 * Pre-Combat Detection Zone Menu
 * Appears when party detects enemies nearby
 * Choice panel: Sneak / Talk / Pickpocket / Ambush / Charge
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
    <div className="pre-combat-overlay">
      <div className="pre-combat-menu">
        {/* Header */}
        <div className="menu-header">
          <h2>⚔️ Encounter Detected</h2>
          <p className="enemy-notice">
            {enemyCount === 1 ? 'A foe approaches' : `${enemyCount} enemies detected`}
          </p>
          {enemies.length <= 3 && (
            <p className="enemy-list">{enemyNames}</p>
          )}
        </div>

        {/* Action choices */}
        <div className="action-choices">
          {/* Sneak */}
          <button
            className="action-btn sneak-btn"
            onClick={onSneak}
            title="Attempt to avoid combat through stealth"
          >
            <div className="action-icon">🤐</div>
            <div className="action-name">Sneak</div>
            <div className="action-desc">Avoid combat</div>
          </button>

          {/* Talk */}
          <button
            className="action-btn talk-btn"
            onClick={onTalk}
            title="Attempt peaceful dialogue"
          >
            <div className="action-icon">💬</div>
            <div className="action-name">Talk</div>
            <div className="action-desc">Negotiate</div>
          </button>

          {/* Pickpocket */}
          <button
            className="action-btn pickpocket-btn"
            onClick={onPickpocket}
            title="Attempt to steal and flee"
          >
            <div className="action-icon">👐</div>
            <div className="action-name">Pickpocket</div>
            <div className="action-desc">Steal & flee</div>
          </button>

          {/* Ambush */}
          <button
            className="action-btn ambush-btn"
            onClick={onAmbush}
            title="Strike first with surprise"
          >
            <div className="action-icon">⚡</div>
            <div className="action-name">Ambush</div>
            <div className="action-desc">Surprise attack</div>
          </button>

          {/* Charge */}
          <button
            className="action-btn charge-btn"
            onClick={onCharge}
            title="Rush into direct combat"
          >
            <div className="action-icon">🏃</div>
            <div className="action-name">Charge</div>
            <div className="action-desc">Direct combat</div>
          </button>
        </div>

        {/* Info text */}
        <div className="menu-footer">
          <p className="footer-text">
            Choose your approach. The outcome will depend on your party's abilities and The Narrator's judgment.
          </p>
        </div>

        {/* Cancel button (if applicable) */}
        {onCancel && (
          <button className="btn-cancel" onClick={onCancel}>
            Retreat
          </button>
        )}
      </div>
    </div>
  );
}
