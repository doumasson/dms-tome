import { useState } from 'react';
import './Dashboard.css';

/**
 * Campaign Dashboard Component
 * List of campaigns, create new, join by code
 */

export default function Dashboard({
  campaigns = [],
  onSelectCampaign = () => {},
  onCreateCampaign = () => {},
  onJoinCampaign = () => {}
}) {
  const [joinCode, setJoinCode] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleJoinClick = () => {
    if (joinCode.trim()) {
      onJoinCampaign(joinCode);
      setJoinCode('');
      setShowJoinForm(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Your Campaigns</h1>
        <p>Enter the world. Your next adventure awaits.</p>
      </div>

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <div className="campaigns-section">
          <div className="section-title">Active Campaigns</div>
          <div className="campaigns-grid">
            {campaigns.map(campaign => (
              <button
                key={campaign.id}
                className="campaign-card"
                onClick={() => onSelectCampaign(campaign)}
              >
                <div className="campaign-card-inner">
                  <h3 className="campaign-name">{campaign.name}</h3>
                  <p className="campaign-desc">{campaign.description || 'A new adventure'}</p>
                  <div className="campaign-meta">
                    <span className="player-count">
                      👥 {campaign.playerCount || 1} player{campaign.playerCount !== 1 ? 's' : ''}
                    </span>
                    <span className="last-played">
                      Last: {campaign.lastPlayed || 'Never'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="empty-state">
          <p>No active campaigns</p>
          <p className="empty-desc">Create a new campaign or join an existing one to begin</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="dashboard-actions">
        <button className="action-btn create-btn" onClick={onCreateCampaign}>
          <span className="action-icon">+</span>
          <span>New Campaign</span>
        </button>

        <button
          className="action-btn join-btn"
          onClick={() => setShowJoinForm(!showJoinForm)}
        >
          <span className="action-icon">→</span>
          <span>Join Campaign</span>
        </button>
      </div>

      {/* Join campaign form */}
      {showJoinForm && (
        <div className="join-form-container">
          <div className="join-form">
            <label className="form-label">Campaign Invite Code</label>
            <input
              type="text"
              className="join-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinClick()}
              placeholder="Enter 6-character code"
              maxLength="6"
            />
            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowJoinForm(false);
                  setJoinCode('');
                }}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleJoinClick}
                disabled={!joinCode.trim()}
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
