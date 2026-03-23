import { useState, useEffect } from 'react';
import './CombatLog.css';

/**
 * CombatLog - Turn-by-turn combat action history
 * Shows chronological record of all combat actions, rolls, and results
 */
export default function CombatLog({
  encounter = {},
  onClose = () => {},
}) {
  const [filter, setFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState('desc');

  const actions = encounter.actionHistory || [];
  const combatants = encounter.combatants || [];

  // Get unique combatant names for filtering
  const actorNames = ['all', ...new Set(actions.map(a => a.actor))];

  // Filter and sort actions
  const getFilteredActions = () => {
    let filtered = filter === 'all'
      ? actions
      : actions.filter(a => a.actor === filter);

    return sortDirection === 'desc'
      ? [...filtered].reverse()
      : filtered;
  };

  const filteredActions = getFilteredActions();

  // Get color for action type
  const getActionColor = (actionType) => {
    const colorMap = {
      'attack': '#ff6b6b',
      'spell': '#7c3aed',
      'ability': '#0891b2',
      'damage': '#ef4444',
      'heal': '#10b981',
      'condition': '#f59e0b',
      'death': '#7c2d12',
      'save': '#6366f1',
      'skill': '#06b6d4',
      'miss': '#9ca3af',
      'crit': '#fbbf24',
      'other': '#d4af37',
    };
    return colorMap[actionType?.toLowerCase()] || colorMap.other;
  };

  const getActionIcon = (actionType) => {
    const iconMap = {
      'attack': '⚔️',
      'spell': '✨',
      'ability': '💫',
      'damage': '💥',
      'heal': '💚',
      'condition': '⚠️',
      'death': '💀',
      'save': '🛡️',
      'skill': '📊',
      'miss': '❌',
      'crit': '⭐',
      'other': '📝',
    };
    return iconMap[actionType?.toLowerCase()] || iconMap.other;
  };

  // Get combatant for styling
  const getCombatantClass = (actor) => {
    const combatant = combatants.find(c => c.name === actor || c.id === actor);
    return combatant?.type === 'enemy' ? 'enemy' : 'player';
  };

  const roundNumber = Math.floor(actions.length / (combatants.length || 1)) + 1;

  return (
    <div className="combat-log-overlay" onClick={onClose}>
      <div className="combat-log-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="combat-log-header">
          <h2 className="combat-log-title">⚔️ Combat Log</h2>
          <button className="combat-log-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Round Info */}
        {actions.length > 0 && (
          <div className="round-info">
            <span className="round-label">Round {roundNumber}</span>
            <span className="action-count">{actions.length} action{actions.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Controls */}
        <div className="combat-log-controls">
          <div className="filter-group">
            <label>Actor:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              {actorNames.map(name => (
                <option key={name} value={name}>
                  {name === 'all' ? 'All' : name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="sort-button"
            onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}
            title="Toggle sort order"
          >
            {sortDirection === 'desc' ? '⬇️ Newest' : '⬆️ Oldest'}
          </button>
        </div>

        {/* Log Content */}
        <div className="combat-log-content">
          {actions.length === 0 ? (
            <div className="log-empty">
              <div className="empty-icon">📜</div>
              <div className="empty-text">No combat actions yet</div>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="log-empty">
              <div className="empty-text">No actions for {filter}</div>
            </div>
          ) : (
            <div className="log-entries">
              {filteredActions.map((action, idx) => (
                <div
                  key={idx}
                  className={`log-entry ${getCombatantClass(action.actor)}`}
                >
                  {/* Action icon and type */}
                  <div className="entry-icon-col">
                    <span
                      className="entry-icon"
                      style={{ color: getActionColor(action.type) }}
                      title={action.type}
                    >
                      {getActionIcon(action.type)}
                    </span>
                  </div>

                  {/* Main action content */}
                  <div className="entry-content">
                    <div className="entry-actor">
                      <span className={`actor-name ${getCombatantClass(action.actor)}`}>
                        {action.actor}
                      </span>
                      {action.target && (
                        <>
                          <span className="arrow">→</span>
                          <span className="target-name">{action.target}</span>
                        </>
                      )}
                    </div>

                    <div className="entry-action">
                      {action.description}
                    </div>

                    {/* Result details */}
                    {(action.roll || action.result || action.damage) && (
                      <div className="entry-details">
                        {action.roll && (
                          <span className="detail-roll">
                            🎲 {action.roll}
                          </span>
                        )}
                        {action.damage && (
                          <span className="detail-damage">
                            💥 {action.damage}
                          </span>
                        )}
                        {action.result && (
                          <span
                            className={`detail-result ${action.result.toLowerCase()}`}
                          >
                            {action.result}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp/turn info */}
                  {action.turn && (
                    <div className="entry-turn">
                      Turn {action.turn}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="combat-log-footer">
          <button className="combat-log-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
