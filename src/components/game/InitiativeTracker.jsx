import { useState } from 'react';
import './InitiativeTracker.css';

/**
 * InitiativeTracker - Combat turn order and initiative display
 * Shows combatants in initiative order with current turn highlight
 */
export default function InitiativeTracker({
  encounter = {},
  onClose = () => {},
}) {
  const [sortBy, setSortBy] = useState('initiative');

  const combatants = encounter.combatants || [];
  const currentTurn = encounter.currentTurn ?? 0;
  const round = encounter.round ?? 1;

  // Sort combatants by initiative (descending)
  const getSortedCombatants = () => {
    if (sortBy === 'initiative') {
      return [...combatants].sort((a, b) =>
        (b.initiative ?? 0) - (a.initiative ?? 0)
      );
    }

    // Sort by type (players first, then enemies)
    return [...combatants].sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === 'player' ? -1 : 1;
    });
  };

  const sortedCombatants = getSortedCombatants();
  const currentCombatant = combatants[currentTurn];

  const getTypeIcon = (type) => {
    return type === 'enemy' ? '👹' : '🧑';
  };

  const getHpColor = (current, max) => {
    const percent = max > 0 ? (current / max) * 100 : 0;
    if (percent > 50) return '#10b981'; // Green
    if (percent > 25) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getConditionStatus = (combatant) => {
    if (!combatant.conditions || combatant.conditions.length === 0) {
      return null;
    }
    const count = combatant.conditions.length;
    return count > 0 ? `${count} condition${count !== 1 ? 's' : ''}` : null;
  };

  return (
    <div className="initiative-overlay" onClick={onClose}>
      <div className="initiative-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="initiative-header">
          <h2 className="initiative-title">⚔️ Initiative</h2>
          <button className="initiative-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Round Info */}
        <div className="round-banner">
          <span className="round-text">Round <span className="round-num">{round}</span></span>
          {currentCombatant && (
            <span className="turn-text">
              {currentCombatant.name}'s Turn
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="initiative-controls">
          <label className="sort-label">Sort:</label>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'initiative' ? 'active' : ''}`}
              onClick={() => setSortBy('initiative')}
            >
              Initiative
            </button>
            <button
              className={`sort-btn ${sortBy === 'type' ? 'active' : ''}`}
              onClick={() => setSortBy('type')}
            >
              Type
            </button>
          </div>
        </div>

        {/* Initiative Order */}
        <div className="initiative-content">
          {combatants.length === 0 ? (
            <div className="empty-message">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No combatants</div>
            </div>
          ) : (
            <div className="combatants-list">
              {sortedCombatants.map((combatant, idx) => {
                const isCurrentTurn = currentCombatant && currentCombatant.id === combatant.id;
                const isDead = (combatant.currentHp ?? 0) <= 0;
                const conditionStatus = getConditionStatus(combatant);

                return (
                  <div
                    key={combatant.id || idx}
                    className={`combatant-row ${isCurrentTurn ? 'active-turn' : ''} ${isDead ? 'dead' : ''} ${combatant.type === 'enemy' ? 'enemy' : 'player'}`}
                  >
                    {/* Active turn indicator */}
                    {isCurrentTurn && (
                      <div className="active-indicator">⭐</div>
                    )}

                    {/* Type and Name */}
                    <div className="combatant-info">
                      <span className="type-icon">{getTypeIcon(combatant.type)}</span>
                      <div className="name-section">
                        <span className="combatant-name">{combatant.name}</span>
                        {combatant.class && (
                          <span className="combatant-class">{combatant.class}</span>
                        )}
                      </div>
                    </div>

                    {/* Initiative Score */}
                    <div className="initiative-score">
                      <span className="score-label">Init</span>
                      <span className="score-value">{combatant.initiative ?? '—'}</span>
                    </div>

                    {/* HP Bar */}
                    <div className="hp-display">
                      <div className="hp-bar-container">
                        <div
                          className="hp-bar-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((combatant.currentHp ?? 0) / (combatant.maxHp ?? 1)) * 100))}%`,
                            backgroundColor: getHpColor(combatant.currentHp ?? 0, combatant.maxHp ?? 1),
                          }}
                        />
                      </div>
                      <span className="hp-text">
                        {combatant.currentHp ?? 0}/{combatant.maxHp ?? 0}
                      </span>
                    </div>

                    {/* Conditions Badge */}
                    {conditionStatus && (
                      <div className="conditions-badge">
                        ⚠️ {conditionStatus}
                      </div>
                    )}

                    {/* Dead indicator */}
                    {isDead && (
                      <div className="dead-overlay">💀</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="initiative-footer">
          <button className="initiative-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
