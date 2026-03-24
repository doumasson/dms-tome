import { useState } from 'react';
import DifficultyBadge from './DifficultyBadge';
import './DefeatScreen.css';

/**
 * DefeatScreen - Party defeat display with options
 * Shows defeat summary and retry/continue options
 */
export default function DefeatScreen({
  encounter = {},
  defeats = [],
  onRetry = () => {},
  onContinue = () => {},
}) {
  const [showDetails, setShowDetails] = useState(false);

  const enemies = encounter.enemies || [];
  const encounterDifficulty = encounter.difficulty || 'Medium';

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      'Easy': '#fbbf24',
      'Medium': '#f97316',
      'Hard': '#ef4444',
      'Deadly': '#7c2d12',
    };
    return colorMap[difficulty] || '#dc2626';
  };

  return (
    <div className="defeat-overlay">
      <div className="defeat-panel">
        {/* Defeat Banner */}
        <div className="defeat-banner">
          <div className="defeat-icon">💀</div>
          <h1 className="defeat-title">Defeated</h1>
          <div className="defeat-subtitle">The Party Falls</div>
        </div>

        {/* Encounter Summary */}
        <div className="summary-section">
          <div className="summary-stat">
            <span className="stat-label">Enemies</span>
            <span className="stat-value">{enemies.length}</span>
          </div>
          <div className="summary-stat" style={{ alignItems: 'center' }}>
            <span className="stat-label">Difficulty</span>
            <DifficultyBadge difficulty={encounterDifficulty} size="small" />
          </div>
          <div className="summary-stat">
            <span className="stat-label">Defeated</span>
            <span className="stat-value">{defeats.length}</span>
          </div>
        </div>

        {/* Enemies That Defeated The Party */}
        {enemies.length > 0 && (
          <div className="enemies-section">
            <h3 className="section-title">Enemies</h3>
            <div className="enemies-list">
              {enemies.map((enemy, idx) => (
                <div key={idx} className="enemy-entry">
                  <span className="enemy-icon">👹</span>
                  <span className="enemy-name">{enemy.name}</span>
                  {enemy.ac && (
                    <span className="enemy-stat">AC {enemy.ac}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Defeated Party Members */}
        {defeats.length > 0 && (
          <div className="defeats-section">
            <div className="defeats-header" onClick={() => setShowDetails(!showDetails)}>
              <h3 className="section-title">Party Defeated ({defeats.length})</h3>
              <span className="defeats-toggle">{showDetails ? '▼' : '▶'}</span>
            </div>
            {showDetails && (
              <div className="defeats-list">
                {defeats.map((member, idx) => (
                  <div key={idx} className="defeat-member">
                    <span className="member-icon">💀</span>
                    <div className="member-info">
                      <span className="member-name">{member.name}</span>
                      {member.class && (
                        <span className="member-class">{member.class}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div className="defeat-message">
          <p>
            The party has been defeated. You may attempt to retry the encounter
            or continue with an alternative resolution.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="defeat-actions">
          <button className="action-button retry" onClick={onRetry}>
            <span className="button-icon">🔄</span>
            <span>Retry</span>
          </button>
          <button className="action-button continue" onClick={onContinue}>
            <span className="button-icon">⏭️</span>
            <span>Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
