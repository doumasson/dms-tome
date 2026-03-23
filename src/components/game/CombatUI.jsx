import './CombatUI.css';

/**
 * Combat UI Component
 * Turn order, action buttons, movement indicator
 * End turn button
 */

export default function CombatUI({
  initiative = [],
  currentTurnIndex = 0,
  playerActions = [],
  movementRemaining = 30,
  onAction = () => {},
  onEndTurn = () => {},
  onMove = () => {}
}) {
  const currentCombatant = initiative[currentTurnIndex];
  const isPlayerTurn = currentCombatant?.isPlayer;

  const actions = [
    { id: 'attack', name: 'Attack', icon: '⚔️', cost: 'action' },
    { id: 'spell', name: 'Cast Spell', icon: '✨', cost: 'action' },
    { id: 'dodge', name: 'Dodge', icon: '🛡️', cost: 'action' },
    { id: 'dash', name: 'Dash', icon: '💨', cost: 'action' },
    { id: 'disengage', name: 'Disengage', icon: '👣', cost: 'action' },
    { id: 'help', name: 'Help', icon: '🤝', cost: 'action' }
  ];

  return (
    <div className="combat-ui">
      {/* Initiative order */}
      <div className="initiative-panel">
        <div className="panel-title">Initiative</div>
        <div className="initiative-list">
          {initiative.map((combatant, idx) => (
            <div
              key={idx}
              className={`initiative-entry ${idx === currentTurnIndex ? 'active' : ''} ${combatant.isPlayer ? 'player' : 'enemy'}`}
            >
              <div className="initiative-turn">{idx + 1}</div>
              <div className="combatant-info">
                <div className="combatant-name">{combatant.name}</div>
                <div className="combatant-hp">
                  <span className="hp-bar">
                    <span
                      className="hp-fill"
                      style={{
                        width: `${(combatant.currentHp / combatant.maxHp) * 100}%`
                      }}
                    />
                  </span>
                  <span className="hp-text">{combatant.currentHp}/{combatant.maxHp}</span>
                </div>
              </div>
              {idx === currentTurnIndex && <div className="turn-indicator">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Action panel (only on player turn) */}
      {isPlayerTurn && (
        <div className="action-panel">
          <div className="panel-title">Actions</div>

          {/* Movement indicator */}
          <div className="movement-indicator">
            <div className="movement-label">Movement: {movementRemaining} ft</div>
            <div className="movement-bar">
              <div
                className="movement-fill"
                style={{ width: `${(movementRemaining / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="action-buttons">
            {actions.map(action => (
              <button
                key={action.id}
                className="action-btn"
                onClick={() => onAction(action.id)}
                title={action.name}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.name}</span>
              </button>
            ))}
          </div>

          {/* End turn button */}
          <button className="end-turn-btn" onClick={onEndTurn}>
            End Turn →
          </button>
        </div>
      )}

      {/* Enemy turn indicator */}
      {!isPlayerTurn && (
        <div className="enemy-turn">
          <div className="enemy-name">{currentCombatant?.name} is acting...</div>
          <div className="loading-indicator">
            <span>•</span><span>•</span><span>•</span>
          </div>
        </div>
      )}
    </div>
  );
}
