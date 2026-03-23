import './CombatUI.css';

/**
 * Combat UI Component
 * Turn order display, action buttons, movement indicator
 * Shows current combatant and available actions
 */
export default function CombatUI({
  combatants = [],
  currentTurnIndex = 0,
  currentRound = 1,
  remainingMovement = 30,
  remainingActions = 1,
  remainingBonus = 1,
  onAttack = () => {},
  onCastSpell = () => {},
  onMove = () => {},
  onDodge = () => {},
  onEndTurn = () => {},
  isMyTurn = false
}) {
  const activeCombatant = combatants[currentTurnIndex];
  const isEnemy = activeCombatant?.type === 'enemy';

  return (
    <div className="combat-ui">
      {/* Header with round and turn info */}
      <div className="combat-header">
        <div className="round-info">
          <span className="round-label">Round</span>
          <span className="round-number">{currentRound}</span>
        </div>
        <div className="turn-info">
          <span className="turn-label">Turn:</span>
          <span className="turn-name">{activeCombatant?.name || '—'}</span>
        </div>
        {isMyTurn && !isEnemy && (
          <div className="your-turn-badge">🎯 Your Turn</div>
        )}
      </div>

      {/* Initiative/Turn order */}
      <div className="initiative-list">
        <div className="initiative-title">Initiative Order</div>
        <div className="combatants-list">
          {combatants.map((combatant, index) => (
            <div
              key={index}
              className={`combatant-row ${index === currentTurnIndex ? 'active' : ''} ${combatant.type}`}
            >
              <div className="combatant-number">{index + 1}</div>
              <div className="combatant-info">
                <div className="combatant-name">{combatant.name}</div>
                <div className="combatant-hp">
                  <span className="hp-label">HP:</span>
                  <span className="hp-value">
                    {combatant.currentHp}/{combatant.maxHp}
                  </span>
                </div>
              </div>
              {index === currentTurnIndex && (
                <div className="active-indicator">►</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action panel - only show if it's the player's turn */}
      {isMyTurn && !isEnemy && (
        <div className="action-panel">
          <div className="action-resources">
            <div className="resource">
              <span className="resource-label">Actions:</span>
              <span className="resource-value">{remainingActions}</span>
            </div>
            <div className="resource">
              <span className="resource-label">Movement:</span>
              <span className="resource-value">{remainingMovement} ft</span>
            </div>
            <div className="resource">
              <span className="resource-label">Bonus:</span>
              <span className="resource-value">{remainingBonus}</span>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="action-button attack-btn"
              onClick={onAttack}
              disabled={remainingActions <= 0}
              title="Use an action to attack"
            >
              ⚔️ Attack
            </button>
            <button
              className="action-button spell-btn"
              onClick={onCastSpell}
              disabled={remainingActions <= 0}
              title="Use an action to cast a spell"
            >
              🔮 Cast Spell
            </button>
            <button
              className="action-button move-btn"
              onClick={onMove}
              disabled={remainingMovement <= 0}
              title="Move up to your speed"
            >
              🚶 Move
            </button>
            <button
              className="action-button dodge-btn"
              onClick={onDodge}
              disabled={remainingActions <= 0}
              title="Take the Dodge action"
            >
              🛡️ Dodge
            </button>
          </div>

          <button
            className="end-turn-button"
            onClick={onEndTurn}
            title="End your turn and pass to the next combatant"
          >
            End Turn →
          </button>
        </div>
      )}

      {/* Waiting indicator if not your turn */}
      {!isMyTurn && (
        <div className="waiting-panel">
          <p>Waiting for {activeCombatant?.name || 'current combatant'}...</p>
        </div>
      )}
    </div>
  );
}
