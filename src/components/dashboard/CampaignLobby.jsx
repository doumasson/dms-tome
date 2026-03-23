import { useState, useEffect } from 'react';
import './CampaignLobby.css';

/**
 * Campaign Lobby Component
 * Waiting room before game starts
 * Shows invite code, player list, start game button
 */
export default function CampaignLobby({
  campaign = {},
  players = [],
  isHost = false,
  onStartGame = () => {},
  onLeave = () => {},
  onCopyInviteCode = () => {}
}) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = campaign.inviteCode
    ? `${window.location.origin}?invite=${campaign.inviteCode}`
    : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onCopyInviteCode?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const canStartGame = players.length > 0 && isHost;

  return (
    <div className="campaign-lobby">
      <div className="lobby-header">
        <h1>{campaign.title || 'Campaign Lobby'}</h1>
        <p>Waiting for players to join...</p>
      </div>

      <div className="lobby-container">
        {/* Invite code section */}
        <div className="lobby-section invite-section">
          <h2>Invite Players</h2>
          <div className="invite-code-box">
            <div className="code-display">
              <code>{campaign.inviteCode || '—'}</code>
            </div>
            <button
              className="btn-copy-code"
              onClick={handleCopyCode}
              title="Copy invite link"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="invite-help">
            Share the invite code with friends or send them the link above.
          </p>
        </div>

        {/* Player list section */}
        <div className="lobby-section players-section">
          <h2>Party Members</h2>
          <div className="players-list">
            {players.length === 0 ? (
              <div className="empty-state">
                <p>No players have joined yet</p>
              </div>
            ) : (
              players.map((player, i) => (
                <div key={i} className="player-item">
                  <div className="player-avatar">
                    {player.portrait ? (
                      <img src={player.portrait} alt={player.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {player.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name || 'Unknown'}</div>
                    <div className="player-class">
                      {player.class || 'No class selected'} •{' '}
                      {player.race || 'No race selected'}
                    </div>
                  </div>
                  {isHost && (
                    <div className="player-status">
                      {i === 0 ? '⚔️ Host' : '🛡️ Ready'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="players-count">
            {players.length} / 6 players
          </div>
        </div>

        {/* Campaign info section */}
        <div className="lobby-section info-section">
          <h2>Campaign Details</h2>
          <div className="info-item">
            <span className="info-label">Campaign Name:</span>
            <span className="info-value">{campaign.title || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Narrator:</span>
            <span className="info-value">The Narrator (AI)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Rules:</span>
            <span className="info-value">SRD 5.1</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value waiting">Waiting to start...</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="lobby-actions">
        <button className="btn-leave" onClick={onLeave}>
          Leave Campaign
        </button>
        {isHost && (
          <button
            className="btn-start"
            onClick={onStartGame}
            disabled={!canStartGame}
            title={!canStartGame ? 'Need at least one player to start' : 'Start the adventure!'}
          >
            {players.length === 0 ? 'Waiting for players...' : 'Begin Adventure →'}
          </button>
        )}
      </div>
    </div>
  );
}
