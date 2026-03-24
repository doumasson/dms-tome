import { useState } from 'react';
import CombatRecap from './CombatRecap';
import DifficultyBadge from './DifficultyBadge';
import './VictoryScreen.css';

/**
 * VictoryScreen - Encounter victory display with loot and rewards
 * Shows defeat summary, loot, XP, and level up notifications
 */
export default function VictoryScreen({
  encounter = {},
  loot = {},
  rewards = {},
  onContinue = () => {},
}) {
  const [showLoot, setShowLoot] = useState(true);

  const defeats = encounter.defeatedEnemies || [];
  const xpEarned = rewards.xp || 0;
  const goldEarned = rewards.gold || 0;
  const levelUps = rewards.levelUps || [];
  const items = loot.items || [];

  const totalEnemies = defeats.length;
  const encounterDifficulty = encounter.difficulty || 'Medium';

  // Calculate difficulty color
  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      'Easy': '#10b981',
      'Medium': '#f59e0b',
      'Hard': '#ef4444',
      'Deadly': '#7c2d12',
    };
    return colorMap[difficulty] || '#d4af37';
  };

  return (
    <div className="victory-overlay">
      <div className="victory-panel">
        {/* Victory Banner */}
        <div className="victory-banner">
          <div className="victory-icon">⭐</div>
          <h1 className="victory-title">Victory!</h1>
          <div className="victory-subtitle">Enemies Defeated</div>
        </div>

        {/* Encounter Summary */}
        <div className="summary-section">
          <div className="summary-stat">
            <span className="stat-label">Enemies Defeated</span>
            <span className="stat-value">{totalEnemies}</span>
          </div>
          <div className="summary-stat" style={{ alignItems: 'center' }}>
            <span className="stat-label">Difficulty</span>
            <DifficultyBadge difficulty={encounterDifficulty} size="small" />
          </div>
          <div className="summary-stat">
            <span className="stat-label">XP Earned</span>
            <span className="stat-value">{xpEarned}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Gold Earned</span>
            <span className="stat-value">{goldEarned}</span>
          </div>
        </div>

        {/* Defeated Enemies */}
        {defeats.length > 0 && (
          <div className="enemies-section">
            <h3 className="section-title">Enemies Defeated</h3>
            <div className="enemies-list">
              {defeats.map((enemy, idx) => (
                <div key={idx} className="enemy-entry">
                  <span className="enemy-icon">💀</span>
                  <span className="enemy-name">{enemy.name}</span>
                  {enemy.xpReward && (
                    <span className="enemy-xp">{enemy.xpReward} XP</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loot Section */}
        {items.length > 0 && (
          <div className="loot-section">
            <div className="loot-header" onClick={() => setShowLoot(!showLoot)}>
              <h3 className="section-title">💰 Loot ({items.length})</h3>
              <span className="loot-toggle">{showLoot ? '▼' : '▶'}</span>
            </div>
            {showLoot && (
              <div className="loot-list">
                {items.map((item, idx) => (
                  <div key={idx} className="loot-item">
                    <span className="item-icon">
                      {item.rarity === 'Legendary' ? '⭐' :
                       item.rarity === 'Very Rare' ? '✨' :
                       item.rarity === 'Rare' ? '💎' :
                       item.rarity === 'Uncommon' ? '🔷' : '📦'}
                    </span>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      {item.rarity && (
                        <span className="item-rarity">{item.rarity}</span>
                      )}
                    </div>
                    {item.quantity && item.quantity > 1 && (
                      <span className="item-qty">x{item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Level Ups */}
        {levelUps.length > 0 && (
          <div className="level-ups-section">
            <h3 className="section-title">⬆️ Level Up!</h3>
            <div className="level-ups-list">
              {levelUps.map((levelUp, idx) => (
                <div key={idx} className="level-up-item">
                  <span className="level-icon">🎉</span>
                  <div className="level-info">
                    <span className="level-name">{levelUp.characterName}</span>
                    <span className="level-value">
                      Level {levelUp.oldLevel} → Level {levelUp.newLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reward Summary */}
        <div className="rewards-summary">
          <div className="reward-box">
            <span className="reward-icon">⭐</span>
            <div className="reward-info">
              <span className="reward-label">Total XP</span>
              <span className="reward-value">{xpEarned}</span>
            </div>
          </div>
          <div className="reward-box">
            <span className="reward-icon">🪙</span>
            <div className="reward-info">
              <span className="reward-label">Gold</span>
              <span className="reward-value">{goldEarned} gp</span>
            </div>
          </div>
        </div>

        {/* Combat Recap */}
        <div style={{ padding: '0 8px', marginBottom: 12 }}>
          <CombatRecap encounter={encounter} rounds={encounter.round || 1} />
        </div>

        {/* Footer */}
        <div className="victory-footer">
          <button className="victory-button" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
