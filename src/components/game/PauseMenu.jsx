import { useState } from 'react';
import './PauseMenu.css';

/**
 * PauseMenu - In-game pause screen
 * Access from game, shows options: Resume, Settings, Help, Leave Campaign
 * Dimmed background, focused modal
 */
export default function PauseMenu({
  onResume = () => {},
  onSettings = () => {},
  onHelp = () => {},
  onLeave = () => {},
  playerCount = 1,
}) {
  const [activeTab, setActiveTab] = useState('main');

  const handleLeaveConfirm = () => {
    if (playerCount > 1) {
      if (confirm('You will leave the campaign and other players will continue without you. Proceed?')) {
        onLeave();
      }
    } else {
      if (confirm('Ending the campaign. Are you sure?')) {
        onLeave();
      }
    }
  };

  return (
    <div className="pause-menu-overlay" onClick={onResume}>
      <div className="pause-menu-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pause-header">
          <h1 className="pause-title">⏸ PAUSED</h1>
        </div>

        {/* Content */}
        <div className="pause-content">
          {activeTab === 'main' && (
            <div className="pause-main">
              <button
                className="pause-button primary"
                onClick={onResume}
              >
                <span className="button-icon">▶</span>
                <span className="button-text">Resume Game</span>
              </button>

              <button
                className="pause-button"
                onClick={() => setActiveTab('help')}
              >
                <span className="button-icon">❓</span>
                <span className="button-text">How to Play</span>
              </button>

              <button
                className="pause-button"
                onClick={() => setActiveTab('options')}
              >
                <span className="button-icon">⚙️</span>
                <span className="button-text">Options</span>
              </button>

              <button
                className="pause-button danger"
                onClick={handleLeaveConfirm}
              >
                <span className="button-icon">🚪</span>
                <span className="button-text">Leave Campaign</span>
              </button>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="pause-help">
              <h2 className="section-title">How to Play</h2>

              <div className="help-section">
                <h3>Movement</h3>
                <p>Click on the map to move your character. The Narrator responds to your actions.</p>
              </div>

              <div className="help-section">
                <h3>Combat</h3>
                <p>When combat starts, use action buttons to attack, cast spells, or use abilities. One action per turn.</p>
              </div>

              <div className="help-section">
                <h3>Character Sheet</h3>
                <p>Click your portrait to view your full character sheet, spells, and inventory.</p>
              </div>

              <div className="help-section">
                <h3>Narrator</h3>
                <p>The Narrator guides the story. Click the bar at the bottom to expand and see recent messages.</p>
              </div>

              <button className="close-help" onClick={() => setActiveTab('main')}>
                Back
              </button>
            </div>
          )}

          {activeTab === 'options' && (
            <div className="pause-options">
              <h2 className="section-title">Options</h2>

              <div className="option-group">
                <label className="option-label">
                  <input type="checkbox" defaultChecked className="option-input" />
                  <span>Sound Effects</span>
                </label>
              </div>

              <div className="option-group">
                <label className="option-label">
                  <input type="checkbox" defaultChecked className="option-input" />
                  <span>Narrator Voice</span>
                </label>
              </div>

              <div className="option-group">
                <label className="option-label">
                  <input type="checkbox" defaultChecked className="option-input" />
                  <span>Auto-scroll Messages</span>
                </label>
              </div>

              <div className="option-group">
                <label className="option-label">
                  <input type="checkbox" className="option-input" />
                  <span>Colorblind Mode</span>
                </label>
              </div>

              <div className="option-group">
                <label className="option-label">
                  <input type="checkbox" defaultChecked className="option-input" />
                  <span>Animations</span>
                </label>
              </div>

              <button className="close-options" onClick={() => setActiveTab('main')}>
                Back
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="pause-hint">
          Press ESC or click outside to resume
        </div>
      </div>
    </div>
  );
}
