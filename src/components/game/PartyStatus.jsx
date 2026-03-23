import { useState } from 'react';
import './PartyStatus.css';

/**
 * PartyStatus - Party member status overview
 * Shows all party members' HP, conditions, and resource status
 */
export default function PartyStatus({
  partyMembers = [],
  myCharacter = {},
  onClose = () => {},
}) {
  const [sortBy, setSortBy] = useState('hp');
  const [showDetails, setShowDetails] = useState(null);

  // Combine party members with player character
  const allMembers = myCharacter && myCharacter.id
    ? [myCharacter, ...partyMembers.filter(m => m.id !== myCharacter.id)]
    : partyMembers;

  // Sort members
  const getSortedMembers = () => {
    const sorted = [...allMembers];

    if (sortBy === 'hp') {
      return sorted.sort((a, b) => {
        const hpPercentA = (a.currentHp ?? 0) / (a.maxHp ?? 1);
        const hpPercentB = (b.currentHp ?? 0) / (b.maxHp ?? 1);
        return hpPercentA - hpPercentB;
      });
    }

    if (sortBy === 'conditions') {
      return sorted.sort((a, b) => {
        const condA = (a.conditions || []).length;
        const condB = (b.conditions || []).length;
        return condB - condA;
      });
    }

    // Sort by name (default)
    return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const sortedMembers = getSortedMembers();

  const getHpColor = (current, max) => {
    const percent = max > 0 ? (current / max) * 100 : 0;
    if (percent > 50) return '#10b981';
    if (percent > 25) return '#f59e0b';
    return '#ef4444';
  };

  const getHpStatus = (current, max) => {
    const percent = max > 0 ? (current / max) * 100 : 0;
    if (current <= 0) return 'DEAD';
    if (percent > 50) return 'HEALTHY';
    if (percent > 25) return 'WOUNDED';
    return 'CRITICAL';
  };

  const getMemberIcon = (character) => {
    if (!character.currentHp || character.currentHp <= 0) return '💀';
    if (character.class === 'Barbarian') return '🗡️';
    if (character.class === 'Bard') return '🎵';
    if (character.class === 'Cleric') return '✨';
    if (character.class === 'Druid') return '🌿';
    if (character.class === 'Fighter') return '⚔️';
    if (character.class === 'Monk') return '🥋';
    if (character.class === 'Paladin') return '🛡️';
    if (character.class === 'Ranger') return '🏹';
    if (character.class === 'Rogue') return '🗡️';
    if (character.class === 'Sorcerer') return '✨';
    if (character.class === 'Warlock') return '🔮';
    if (character.class === 'Wizard') return '📖';
    return '🧑';
  };

  const getConditionInfo = (conditions) => {
    if (!conditions || conditions.length === 0) return null;
    return {
      count: conditions.length,
      list: conditions.slice(0, 3).map(c => c.name || c).join(', '),
    };
  };

  const toggleDetails = (memberId) => {
    setShowDetails(showDetails === memberId ? null : memberId);
  };

  const totalMembers = allMembers.length;
  const healthyCount = allMembers.filter(m => (m.currentHp ?? 0) > 0 && ((m.currentHp ?? 0) / (m.maxHp ?? 1)) > 0.5).length;
  const woundedCount = allMembers.filter(m => (m.currentHp ?? 0) > 0 && ((m.currentHp ?? 0) / (m.maxHp ?? 1)) <= 0.5).length;
  const deadCount = allMembers.filter(m => (m.currentHp ?? 0) <= 0).length;

  return (
    <div className="party-status-overlay" onClick={onClose}>
      <div className="party-status-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="party-status-header">
          <h2 className="party-status-title">👥 Party Status</h2>
          <button className="party-status-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Party Overview */}
        <div className="party-overview">
          <div className="overview-stat">
            <span className="stat-label">Members</span>
            <span className="stat-value">{totalMembers}</span>
          </div>
          <div className="overview-stat healthy">
            <span className="stat-icon">💚</span>
            <span className="stat-value">{healthyCount}</span>
          </div>
          <div className="overview-stat wounded">
            <span className="stat-icon">⚠️</span>
            <span className="stat-value">{woundedCount}</span>
          </div>
          <div className="overview-stat dead">
            <span className="stat-icon">💀</span>
            <span className="stat-value">{deadCount}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="party-controls">
          <label className="sort-label">Sort:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="name">By Name</option>
            <option value="hp">By HP %</option>
            <option value="conditions">By Conditions</option>
          </select>
        </div>

        {/* Party Members List */}
        <div className="party-content">
          {allMembers.length === 0 ? (
            <div className="empty-message">
              <div className="empty-icon">👥</div>
              <div className="empty-text">No party members</div>
            </div>
          ) : (
            <div className="members-list">
              {sortedMembers.map((member) => {
                const isDead = (member.currentHp ?? 0) <= 0;
                const hpPercent = (member.maxHp ?? 1) > 0 ? ((member.currentHp ?? 0) / (member.maxHp ?? 1)) * 100 : 0;
                const conditions = getConditionInfo(member.conditions);
                const isDetailsOpen = showDetails === member.id;

                return (
                  <div
                    key={member.id}
                    className={`member-card ${isDead ? 'dead' : ''}`}
                  >
                    {/* Member Header */}
                    <div
                      className="member-header"
                      onClick={() => toggleDetails(member.id)}
                    >
                      <div className="member-info">
                        <span className="member-icon">{getMemberIcon(member)}</span>
                        <div className="member-name-section">
                          <span className="member-name">{member.name}</span>
                          {member.class && (
                            <span className="member-class">Lvl {member.level || 1} {member.class}</span>
                          )}
                        </div>
                      </div>

                      {/* HP Status */}
                      <div className="member-hp-status">
                        <div className="hp-bar-mini">
                          <div
                            className="hp-bar-fill-mini"
                            style={{
                              width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                              backgroundColor: getHpColor(member.currentHp ?? 0, member.maxHp ?? 1),
                            }}
                          />
                        </div>
                        <span className={`hp-status-label ${getHpStatus(member.currentHp ?? 0, member.maxHp ?? 1).toLowerCase()}`}>
                          {getHpStatus(member.currentHp ?? 0, member.maxHp ?? 1)}
                        </span>
                      </div>

                      {/* Conditions Badge */}
                      {conditions && (
                        <div className="conditions-badge-compact">
                          ⚠️ {conditions.count}
                        </div>
                      )}

                      {/* Expand Icon */}
                      <span className="expand-icon">{isDetailsOpen ? '▼' : '▶'}</span>
                    </div>

                    {/* Member Details */}
                    {isDetailsOpen && (
                      <div className="member-details">
                        {/* HP Details */}
                        <div className="detail-group">
                          <div className="detail-title">Health</div>
                          <div className="detail-row">
                            <span className="detail-label">HP</span>
                            <div className="hp-bar-large">
                              <div
                                className="hp-bar-fill-large"
                                style={{
                                  width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                                  backgroundColor: getHpColor(member.currentHp ?? 0, member.maxHp ?? 1),
                                }}
                              />
                            </div>
                            <span className="detail-value">
                              {member.currentHp ?? 0}/{member.maxHp ?? 0}
                            </span>
                          </div>
                        </div>

                        {/* AC */}
                        {member.ac && (
                          <div className="detail-group">
                            <div className="detail-row">
                              <span className="detail-label">AC</span>
                              <span className="detail-value">{member.ac}</span>
                            </div>
                          </div>
                        )}

                        {/* Conditions */}
                        {conditions && (
                          <div className="detail-group">
                            <div className="detail-title">Conditions ({conditions.count})</div>
                            <div className="conditions-list-detail">
                              {member.conditions.map((cond, idx) => (
                                <span key={idx} className="condition-tag">
                                  {cond.name || cond}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {(member.spellSlots || member.ki || member.sorceryPoints) && (
                          <div className="detail-group">
                            <div className="detail-title">Resources</div>
                            {member.spellSlots && (
                              <div className="resource-row">
                                <span className="resource-label">Spell Slots</span>
                                <span className="resource-value">
                                  {Object.values(member.spellSlots).reduce((sum, slot) => sum + (slot.max - slot.used), 0)}/
                                  {Object.values(member.spellSlots).reduce((sum, slot) => sum + slot.max, 0)}
                                </span>
                              </div>
                            )}
                            {member.ki && (
                              <div className="resource-row">
                                <span className="resource-label">Ki Points</span>
                                <span className="resource-value">{member.ki.current}/{member.ki.max}</span>
                              </div>
                            )}
                            {member.sorceryPoints && (
                              <div className="resource-row">
                                <span className="resource-label">Sorcery Points</span>
                                <span className="resource-value">{member.sorceryPoints.current}/{member.sorceryPoints.max}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="party-status-footer">
          <button className="party-status-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
