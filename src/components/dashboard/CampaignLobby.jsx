import { useState } from 'react';
import './CampaignLobby.css';

/**
 * Campaign Lobby Component
 * Waiting room, invite code display, player list
 */

export default function CampaignLobby({
  campaign = {},
  inviteCode = 'LOADING',
  players = [],
  isHost = false,
  onStart = () => {},
  onLeave = () => {}
}) {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const canStart = players.length > 0 && isHost;

  return (
    <div className="campaign-lobby-container">
      {/* Header */}
      <div className="lobby-header">
        <h1>{campaign.name || 'Campaign Lobby'}</h1>
        <p>Gather your party. Adventure awaits.</p>
      </div>

      {/* Invite code section */}
      <div className="invite-section">
        <div className="invite-card">
          <div className="invite-label">Invite Code</div>
          <div className="invite-code-display">
            <span className="code-text">{inviteCode}</span>
            <button
              className="copy-btn"
              onClick={handleCopyCode}
              title="Copy invite code"
            >
              {copiedCode ? '✓' : '📋'}
            </button>
          </div>
          <p className="invite-desc">Share this code with other players to join</p>
        </div>
      </div>

      {/* Players section */}
      <div className="players-section">
        <div className="section-title">
          Party Members ({players.length})
        </div>

        <div className="players-list">
          {players.length === 0 ? (
            <div className="no-players">
              <p>No players yet</p>
              <p className="empty-desc">Waiting for others to join...</p>
            </div>
          ) : (
            players.map((player, idx) => (
              <div key={idx} className="player-card">
                <div className="player-avatar">
                  {player.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.name || 'Unknown'}</div>
                  <div className="player-class">
                    {player.class || 'Adventurer'}
                  </div>
                </div>
                {player.isHost && (
                  <div className="host-badge">Host</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campaign info */}
      {campaign.description && (
        <div className="campaign-info">
          <div className="section-title">Campaign</div>
          <p className="info-text">{campaign.description}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="lobby-actions">
        <button
          className="leave-btn"
          onClick={onLeave}
        >
          Leave Campaign
        </button>

        {isHost && (
          <button
            className="start-btn"
            onClick={onStart}
            disabled={!canStart}
            title={canStart ? 'Start the campaign' : 'Waiting for players...'}
          >
            Start Campaign
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="lobby-status">
        {isHost ? (
          <p>✓ You are the Host</p>
        ) : (
          <p>Waiting for host to start...</p>
        )}
      </div>
    </div>
  );
}
