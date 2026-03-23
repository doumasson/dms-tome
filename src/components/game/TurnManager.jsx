import { useState } from 'react';
import './TurnManager.css';

/**
 * TurnManager - Combat turn action management
 * Shows current combatant's available actions and action economy status
 */
export default function TurnManager({
  combatant = {},
  onClose = () => {},
}) {
  const [expandedSection, setExpandedSection] = useState('overview');

  // Action economy
  const hasAction = !combatant.actionUsed;
  const hasBonusAction = !combatant.bonusActionUsed;
  const hasReaction = !combatant.reactionUsed;
  const movementRemaining = (combatant.movementRemaining ?? combatant.speed ?? 30);
  const totalMovement = combatant.speed ?? 30;

  // Spellcasting
  const spellSlots = combatant.spellSlots || {};
  const cantrips = (combatant.spells || []).filter(s => s.level === 0);
  const leveledSpells = (combatant.spells || []).filter(s => s.level > 0);

  // Available actions
  const attacks = combatant.attacks || [];
  const abilities = combatant.classAbilities || [];

  const getSlotStatus = (level) => {
    const used = spellSlots[`level${level}`]?.used || 0;
    const max = spellSlots[`level${level}`]?.max || 0;
    return { used, max };
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="turn-manager-overlay" onClick={onClose}>
      <div className="turn-manager-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="turn-manager-header">
          <h2 className="turn-manager-title">⚔️ {combatant.name}'s Turn</h2>
          <button className="turn-manager-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className={`status-item ${hasAction ? 'available' : 'used'}`}>
            <span className="status-icon">🎯</span>
            <span className="status-label">Action</span>
          </div>
          <div className={`status-item ${hasBonusAction ? 'available' : 'used'}`}>
            <span className="status-icon">✨</span>
            <span className="status-label">Bonus</span>
          </div>
          <div className={`status-item ${hasReaction ? 'available' : 'used'}`}>
            <span className="status-icon">⚡</span>
            <span className="status-label">Reaction</span>
          </div>
        </div>

        {/* Movement */}
        <div className="movement-section">
          <div className="movement-header">
            <span className="movement-label">Movement</span>
            <span className="movement-value">{movementRemaining}/{totalMovement} ft</span>
          </div>
          <div className="movement-bar-container">
            <div
              className="movement-bar-fill"
              style={{ width: `${Math.min(100, (movementRemaining / totalMovement) * 100)}%` }}
            />
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="turn-manager-content">
          {/* Action Overview */}
          <div className="section">
            <button
              className={`section-header ${expandedSection === 'overview' ? 'expanded' : ''}`}
              onClick={() => toggleSection('overview')}
            >
              <span className="section-icon">📋</span>
              <span className="section-title">Action Overview</span>
              <span className="section-toggle">{expandedSection === 'overview' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'overview' && (
              <div className="section-content">
                <div className="action-item">
                  <span className="action-icon">🎯</span>
                  <div className="action-info">
                    <span className="action-name">Action</span>
                    <span className={`action-status ${hasAction ? 'available' : 'used'}`}>
                      {hasAction ? 'Available' : 'Used'}
                    </span>
                  </div>
                  <span className="action-desc">Attack, spell, or ability</span>
                </div>
                <div className="action-item">
                  <span className="action-icon">✨</span>
                  <div className="action-info">
                    <span className="action-name">Bonus Action</span>
                    <span className={`action-status ${hasBonusAction ? 'available' : 'used'}`}>
                      {hasBonusAction ? 'Available' : 'Used'}
                    </span>
                  </div>
                  <span className="action-desc">Class-specific action</span>
                </div>
                <div className="action-item">
                  <span className="action-icon">⚡</span>
                  <div className="action-info">
                    <span className="action-name">Reaction</span>
                    <span className={`action-status ${hasReaction ? 'available' : 'used'}`}>
                      {hasReaction ? 'Available' : 'Used'}
                    </span>
                  </div>
                  <span className="action-desc">Opportunity attack, spell, ability</span>
                </div>
              </div>
            )}
          </div>

          {/* Attacks */}
          {attacks.length > 0 && (
            <div className="section">
              <button
                className={`section-header ${expandedSection === 'attacks' ? 'expanded' : ''}`}
                onClick={() => toggleSection('attacks')}
              >
                <span className="section-icon">⚔️</span>
                <span className="section-title">Attacks ({attacks.length})</span>
                <span className="section-toggle">{expandedSection === 'attacks' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'attacks' && (
                <div className="section-content">
                  {attacks.map((attack, idx) => (
                    <div key={idx} className="attack-item">
                      <span className="attack-name">{attack.name}</span>
                      <div className="attack-details">
                        <span className="detail-badge">+{attack.bonus || 0}</span>
                        <span className="detail-badge">{attack.damage || '1d8'}</span>
                        {attack.damageType && <span className="detail-type">{attack.damageType}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cantrips */}
          {cantrips.length > 0 && (
            <div className="section">
              <button
                className={`section-header ${expandedSection === 'cantrips' ? 'expanded' : ''}`}
                onClick={() => toggleSection('cantrips')}
              >
                <span className="section-icon">✨</span>
                <span className="section-title">Cantrips ({cantrips.length})</span>
                <span className="section-toggle">{expandedSection === 'cantrips' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'cantrips' && (
                <div className="section-content">
                  {cantrips.map((spell, idx) => (
                    <div key={idx} className="spell-item">
                      <span className="spell-name">{spell.name}</span>
                      {spell.castingTime && <span className="spell-meta">{spell.castingTime}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spell Slots */}
          {leveledSpells.length > 0 && (
            <div className="section">
              <button
                className={`section-header ${expandedSection === 'spells' ? 'expanded' : ''}`}
                onClick={() => toggleSection('spells')}
              >
                <span className="section-icon">📖</span>
                <span className="section-title">Leveled Spells</span>
                <span className="section-toggle">{expandedSection === 'spells' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'spells' && (
                <div className="section-content">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                    const slots = getSlotStatus(level);
                    if (slots.max === 0) return null;
                    const spellsAtLevel = leveledSpells.filter(s => s.level === level);
                    if (spellsAtLevel.length === 0) return null;

                    return (
                      <div key={level} className="spell-level-group">
                        <div className="level-header">
                          <span className="level-title">Level {level}</span>
                          <span className={`slot-count ${slots.used >= slots.max ? 'depleted' : ''}`}>
                            {slots.max - slots.used}/{slots.max}
                          </span>
                        </div>
                        <div className="spells-in-level">
                          {spellsAtLevel.map((spell, idx) => (
                            <div key={idx} className="spell-item compact">
                              <span className="spell-name">{spell.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Abilities */}
          {abilities.length > 0 && (
            <div className="section">
              <button
                className={`section-header ${expandedSection === 'abilities' ? 'expanded' : ''}`}
                onClick={() => toggleSection('abilities')}
              >
                <span className="section-icon">💫</span>
                <span className="section-title">Class Abilities</span>
                <span className="section-toggle">{expandedSection === 'abilities' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'abilities' && (
                <div className="section-content">
                  {abilities.map((ability, idx) => (
                    <div key={idx} className="ability-item">
                      <span className="ability-name">{ability.name}</span>
                      {ability.description && (
                        <span className="ability-desc">{ability.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="turn-manager-footer">
          <button className="turn-manager-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
