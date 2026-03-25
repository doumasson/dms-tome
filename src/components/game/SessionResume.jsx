import { useState, useEffect } from 'react';
import './SessionResume.css';

/**
 * Session Resume Screen
 * Shows campaign recap, character status, and allows resuming the game
 * Auto-dismisses after 5 seconds if user doesn't interact
 */

export default function SessionResume({
  sessionData = {},
  characters = [],
  recap = '',
  onResume = () => {}
}) {
  const [isResuming, setIsResuming] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]?.id);

  // Auto-dismiss after 5 seconds so game always loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isResuming) onResume();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleResume = () => {
    setIsResuming(true);
    onResume();
  };

  const lastSession = sessionData.lastSessionDate
    ? new Date(sessionData.lastSessionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  const selectedChar = characters.find(c => c.id === selectedCharacter);

  return (
    <div className="session-resume-container">
      {/* Header */}
      <div className="resume-header">
        <h1>Welcome Back, Adventurer</h1>
        <p className="resume-subtitle">Continue your journey in {sessionData.campaignName || 'your campaign'}</p>
        <div className="session-info">
          <span className="info-label">Last Session:</span>
          <span className="info-value">{lastSession}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="resume-content">
        {/* Recap Section */}
        <div className="recap-panel">
          <h2 className="panel-title">Session Recap</h2>
          <div className="recap-text">
            {recap || (
              <p className="placeholder-text">
                Your last adventure took you through treacherous dungeons and encounters with legendary foes.
                The party stands ready to continue the quest.
              </p>
            )}
          </div>

          {/* Location Info */}
          <div className="location-info">
            <h3 className="location-title">Current Location</h3>
            <p className="location-name">{sessionData.currentLocation || 'The Tavern'}</p>
            <p className="location-desc">
              {sessionData.locationDescription || 'A mysterious place full of adventure awaits.'}
            </p>
          </div>
        </div>

        {/* Character Status Section */}
        <div className="character-status-panel">
          <h2 className="panel-title">Party Status</h2>

          {/* Character Selection */}
          <div className="character-selector">
            {characters.map(char => (
              <button
                key={char.id}
                className={`char-select-btn ${selectedCharacter === char.id ? 'selected' : ''}`}
                onClick={() => setSelectedCharacter(char.id)}
              >
                <span className="char-name">{char.name}</span>
                <span className="char-level">{char.level}</span>
              </button>
            ))}
          </div>

          {/* Selected Character Details */}
          {selectedChar && (
            <div className="character-details">
              <div className="detail-row">
                <span className="detail-label">Class</span>
                <span className="detail-value">{selectedChar.class}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Race</span>
                <span className="detail-value">{selectedChar.race}</span>
              </div>
              <div className="detail-row hp-row">
                <span className="detail-label">HP</span>
                <div className="hp-value">
                  <span className="hp-current">{selectedChar.currentHp || selectedChar.maxHp}</span>
                  <span className="hp-sep">/</span>
                  <span className="hp-max">{selectedChar.maxHp}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Experience</span>
                <span className="detail-value">{selectedChar.experience || 0} XP</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Gold</span>
                <span className="detail-value gold-text">⚜ {selectedChar.gold || 0} gp</span>
              </div>
            </div>
          )}

          {/* Conditions/Status */}
          {selectedChar?.conditions && selectedChar.conditions.length > 0 && (
            <div className="conditions">
              <h4 className="conditions-label">Conditions</h4>
              <div className="condition-list">
                {selectedChar.conditions.map((cond, idx) => (
                  <span key={idx} className="condition-tag">{cond}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Button */}
      <div className="resume-footer">
        <button
          className="resume-button"
          onClick={handleResume}
          disabled={isResuming}
        >
          {isResuming ? 'Resuming...' : 'Resume Your Journey'}
        </button>
        <p className="resume-hint">The adventure awaits!</p>
      </div>
    </div>
  );
}
