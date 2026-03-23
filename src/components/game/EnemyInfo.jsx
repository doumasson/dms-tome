import { useState } from 'react';
import './EnemyInfo.css';

/**
 * EnemyInfo - Enemy details and statistics display
 * Shows enemy stats, abilities, resistances, and combat info
 */
export default function EnemyInfo({
  enemy = {},
  onClose = () => {},
}) {
  const [expandedTab, setExpandedTab] = useState('stats');

  const stats = enemy.stats || {};
  const abilities = enemy.abilities || [];
  const attacks = enemy.attacks || [];
  const resistances = enemy.resistances || {};
  const senses = enemy.senses || {};
  const languages = enemy.languages || [];

  // Calculate modifiers
  const getModifier = (stat) => Math.floor((stat - 10) / 2);
  const strMod = getModifier(stats.str || 10);
  const dexMod = getModifier(stats.dex || 10);
  const conMod = getModifier(stats.con || 10);
  const intMod = getModifier(stats.int || 10);
  const wisMod = getModifier(stats.wis || 10);
  const chaMod = getModifier(stats.cha || 10);

  const hpPercent = enemy.maxHp ? (enemy.currentHp / enemy.maxHp) * 100 : 0;
  const isDead = (enemy.currentHp ?? 0) <= 0;

  const getHpColor = () => {
    if (hpPercent > 50) return '#10b981';
    if (hpPercent > 25) return '#f59e0b';
    return '#ef4444';
  };

  const modifierDisplay = (mod) => {
    if (mod > 0) return `+${mod}`;
    return mod.toString();
  };

  const getResistanceColor = (type) => {
    const typeMap = {
      'immunity': '#fbbf24',
      'resistance': '#10b981',
      'vulnerability': '#ef4444',
    };
    return typeMap[type] || '#d4af37';
  };

  return (
    <div className="enemy-info-overlay" onClick={onClose}>
      <div className="enemy-info-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="enemy-info-header">
          <div className="enemy-title-section">
            <h2 className="enemy-info-title">👹 {enemy.name || 'Unknown'}</h2>
            {enemy.type && <span className="enemy-type">{enemy.type}</span>}
          </div>
          <button className="enemy-info-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Health Bar */}
        <div className="enemy-health-section">
          <div className="health-display">
            <div className="hp-bar-container">
              <div
                className="hp-bar-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                  backgroundColor: getHpColor(),
                }}
              />
            </div>
            <span className="hp-text">
              {enemy.currentHp ?? 0} / {enemy.maxHp ?? 0} HP
            </span>
          </div>
          {enemy.ac && (
            <div className="ac-display">
              <span className="ac-label">AC</span>
              <span className="ac-value">{enemy.ac}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="enemy-info-tabs">
          <button
            className={`info-tab ${expandedTab === 'stats' ? 'active' : ''}`}
            onClick={() => setExpandedTab('stats')}
          >
            Stats
          </button>
          <button
            className={`info-tab ${expandedTab === 'attacks' ? 'active' : ''}`}
            onClick={() => setExpandedTab('attacks')}
          >
            Attacks
          </button>
          <button
            className={`info-tab ${expandedTab === 'abilities' ? 'active' : ''}`}
            onClick={() => setExpandedTab('abilities')}
          >
            Abilities
          </button>
          <button
            className={`info-tab ${expandedTab === 'details' ? 'active' : ''}`}
            onClick={() => setExpandedTab('details')}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className="enemy-info-content">
          {/* Stats Tab */}
          {expandedTab === 'stats' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-name">STR</div>
                <div className="stat-score">{stats.str || 10}</div>
                <div className="stat-mod">{modifierDisplay(strMod)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-name">DEX</div>
                <div className="stat-score">{stats.dex || 10}</div>
                <div className="stat-mod">{modifierDisplay(dexMod)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-name">CON</div>
                <div className="stat-score">{stats.con || 10}</div>
                <div className="stat-mod">{modifierDisplay(conMod)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-name">INT</div>
                <div className="stat-score">{stats.int || 10}</div>
                <div className="stat-mod">{modifierDisplay(intMod)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-name">WIS</div>
                <div className="stat-score">{stats.wis || 10}</div>
                <div className="stat-mod">{modifierDisplay(wisMod)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-name">CHA</div>
                <div className="stat-score">{stats.cha || 10}</div>
                <div className="stat-mod">{modifierDisplay(chaMod)}</div>
              </div>
            </div>
          )}

          {/* Attacks Tab */}
          {expandedTab === 'attacks' && (
            <div className="attacks-list">
              {attacks.length === 0 ? (
                <div className="empty-state">No attacks</div>
              ) : (
                attacks.map((attack, idx) => (
                  <div key={idx} className="attack-entry">
                    <div className="attack-name-section">
                      <span className="attack-icon">⚔️</span>
                      <span className="attack-name">{attack.name}</span>
                    </div>
                    <div className="attack-details">
                      {attack.bonus && (
                        <span className="attack-bonus">+{attack.bonus}</span>
                      )}
                      {attack.damage && (
                        <span className="attack-damage">{attack.damage}</span>
                      )}
                      {attack.damageType && (
                        <span className="damage-type">{attack.damageType}</span>
                      )}
                    </div>
                    {attack.description && (
                      <div className="attack-description">{attack.description}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Abilities Tab */}
          {expandedTab === 'abilities' && (
            <div className="abilities-list">
              {abilities.length === 0 ? (
                <div className="empty-state">No abilities</div>
              ) : (
                abilities.map((ability, idx) => (
                  <div key={idx} className="ability-entry">
                    <div className="ability-name">
                      <span className="ability-icon">✨</span>
                      {ability.name}
                    </div>
                    {ability.description && (
                      <div className="ability-description">{ability.description}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Details Tab */}
          {expandedTab === 'details' && (
            <div className="details-section">
              {/* Resistances */}
              {Object.keys(resistances).length > 0 && (
                <div className="detail-group">
                  <h4 className="detail-group-title">Damage</h4>
                  <div className="resistances-list">
                    {Object.entries(resistances).map(([type, values]) => (
                      <div key={type} className="resistance-item">
                        <span className="resistance-type" style={{ color: getResistanceColor(type) }}>
                          {type.toUpperCase()}
                        </span>
                        <span className="resistance-values">
                          {Array.isArray(values) ? values.join(', ') : values}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Senses */}
              {Object.keys(senses).length > 0 && (
                <div className="detail-group">
                  <h4 className="detail-group-title">Senses</h4>
                  <div className="senses-list">
                    {Object.entries(senses).map(([sense, value]) => (
                      <div key={sense} className="sense-item">
                        <span className="sense-name">{sense}</span>
                        <span className="sense-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {languages.length > 0 && (
                <div className="detail-group">
                  <h4 className="detail-group-title">Languages</h4>
                  <div className="languages-list">
                    {languages.map((lang, idx) => (
                      <span key={idx} className="language-tag">{lang}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenge & XP */}
              {(enemy.challenge || enemy.xpReward) && (
                <div className="detail-group">
                  <h4 className="detail-group-title">Combat</h4>
                  <div className="combat-info">
                    {enemy.challenge && (
                      <div className="info-row">
                        <span className="info-label">Challenge</span>
                        <span className="info-value">CR {enemy.challenge}</span>
                      </div>
                    )}
                    {enemy.xpReward && (
                      <div className="info-row">
                        <span className="info-label">XP Reward</span>
                        <span className="info-value">{enemy.xpReward}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Speed */}
              {enemy.speed && (
                <div className="detail-group">
                  <h4 className="detail-group-title">Movement</h4>
                  <div className="speed-info">
                    <span className="speed-value">{enemy.speed} ft/turn</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="enemy-info-footer">
          <button className="enemy-info-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
