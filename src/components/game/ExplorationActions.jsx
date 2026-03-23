import { useState } from 'react';
import './ExplorationActions.css';

/**
 * ExplorationActions - Overlay for room exploration actions
 * Search for items, lockpick doors, detect/disarm traps
 * Appears during exploration mode, not in combat
 */
export default function ExplorationActions({
  onSearch,
  onLockpick,
  onDetectTrap,
  onDisarmTrap,
  onClose,
  character = {},
  roomData = {}
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setActiveAction('search');
    try {
      const searchResult = await onSearch?.();
      setResult(searchResult);
    } catch (err) {
      setResult({ success: false, message: 'Search failed.' });
    }
    setIsLoading(false);
  };

  const handleLockpick = async () => {
    setIsLoading(true);
    setActiveAction('lockpick');
    try {
      const lockpickResult = await onLockpick?.();
      setResult(lockpickResult);
    } catch (err) {
      setResult({ success: false, message: 'Lockpick attempt failed.' });
    }
    setIsLoading(false);
  };

  const handleDetectTrap = async () => {
    setIsLoading(true);
    setActiveAction('detect');
    try {
      const detectResult = await onDetectTrap?.();
      setResult(detectResult);
    } catch (err) {
      setResult({ success: false, message: 'Trap detection failed.' });
    }
    setIsLoading(false);
  };

  const handleDisarmTrap = async () => {
    setIsLoading(true);
    setActiveAction('disarm');
    try {
      const disarmResult = await onDisarmTrap?.();
      setResult(disarmResult);
    } catch (err) {
      setResult({ success: false, message: 'Trap disarm failed.' });
    }
    setIsLoading(false);
  };

  const handleClearResult = () => {
    setResult(null);
    setActiveAction(null);
  };

  return (
    <div className="exploration-overlay" onClick={onClose}>
      <div className="exploration-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="exp-header">
          <h2 className="exp-title">Actions</h2>
          <button className="exp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Action Buttons or Result Display */}
        {!result ? (
          <div className="exp-actions">
            <button
              className="exp-action-btn search"
              onClick={handleSearch}
              disabled={isLoading}
              title="Search the room for hidden items and secrets"
            >
              <span className="exp-action-icon">🔍</span>
              <span className="exp-action-label">Search Room</span>
            </button>

            <button
              className="exp-action-btn lockpick"
              onClick={handleLockpick}
              disabled={isLoading}
              title="Attempt to open a locked door or container"
            >
              <span className="exp-action-icon">🔓</span>
              <span className="exp-action-label">Lockpick</span>
            </button>

            <button
              className="exp-action-btn detect"
              onClick={handleDetectTrap}
              disabled={isLoading}
              title="Search for hidden traps and hazards"
            >
              <span className="exp-action-icon">⚠️</span>
              <span className="exp-action-label">Detect Trap</span>
            </button>

            <button
              className="exp-action-btn disarm"
              onClick={handleDisarmTrap}
              disabled={isLoading}
              title="Disarm a detected trap"
            >
              <span className="exp-action-icon">🛠️</span>
              <span className="exp-action-label">Disarm Trap</span>
            </button>
          </div>
        ) : (
          <div className="exp-result">
            <div className={`exp-result-header ${result.success ? 'success' : 'failure'}`}>
              {result.success ? '✓ Success' : '✗ Failed'}
            </div>

            <div className="exp-result-message">
              {result.message}
            </div>

            {result.details && (
              <div className="exp-result-details">
                {Array.isArray(result.details) ? (
                  <ul className="exp-details-list">
                    {result.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{result.details}</p>
                )}
              </div>
            )}

            {result.roll && (
              <div className="exp-result-roll">
                <span className="exp-roll-label">Roll:</span>
                <span className="exp-roll-value">{result.roll}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="exp-footer">
          {result ? (
            <button className="exp-btn primary" onClick={handleClearResult}>
              Continue
            </button>
          ) : (
            <button className="exp-btn secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
