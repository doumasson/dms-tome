import { useState } from 'react';
import './SpellsPanel.css';

/**
 * SpellsPanel - Character spells and cantrips reference
 * Shows known spells, cantrips, spell slots remaining
 */
export default function SpellsPanel({
  character = {},
  onClose = () => {},
}) {
  const [selectedLevel, setSelectedLevel] = useState('cantrips');
  const [selectedSpell, setSelectedSpell] = useState(null);

  const stats = character.stats || { int: 10, wis: 10, cha: 10 };
  const spells = character.spells || [];
  const spellSlots = character.spellSlots || {};
  const spellSlotsUsed = character.spellSlotsUsed || {};
  const level = character.level || 1;
  const className = character.class || '';

  // Get spell save DC based on class
  const getSpellDC = () => {
    const abilityMap = {
      Wizard: 'int',
      Sorcerer: 'cha',
      Bard: 'cha',
      Cleric: 'wis',
      Druid: 'wis',
      Paladin: 'cha',
      Ranger: 'wis',
    };
    const ability = abilityMap[className] || 'int';
    const mod = Math.floor((stats[ability] - 10) / 2);
    const profBonus = Math.ceil(level / 4) + 1;
    return 8 + mod + profBonus;
  };

  const getCantripDamage = () => {
    if (level < 5) return '1d8';
    if (level < 11) return '2d8';
    if (level < 17) return '3d8';
    return '4d8';
  };

  const getSpellsByLevel = (lvl) => {
    if (lvl === 'cantrips') {
      return spells.filter(s => s.level === 0 || !s.level);
    }
    const levelNum = parseInt(lvl);
    return spells.filter(s => s.level === levelNum);
  };

  const getSlotStatus = (level) => {
    const slotData = spellSlots[level];
    if (!slotData) return null;
    const total = typeof slotData === 'object' ? slotData.total : slotData;
    const used = spellSlotsUsed[level] || 0;
    return { total, used, remaining: total - used };
  };

  const spellsByLevel = getSpellsByLevel(selectedLevel);
  const slotStatus = selectedLevel !== 'cantrips' ? getSlotStatus(selectedLevel) : null;

  const currentSpell = selectedSpell ? spellsByLevel.find(s => s.name === selectedSpell) : null;

  return (
    <div className="spells-panel-overlay" onClick={onClose}>
      <div className="spells-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="spells-header">
          <h2 className="spells-title">📖 Spellbook</h2>
          <button className="spells-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Main Content */}
        <div className="spells-main">
          {/* Level Selector */}
          <div className="spell-levels">
            <button
              className={`level-btn ${selectedLevel === 'cantrips' ? 'active' : ''}`}
              onClick={() => {
                setSelectedLevel('cantrips');
                setSelectedSpell(null);
              }}
            >
              Cantrips
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
              <button
                key={lvl}
                className={`level-btn ${selectedLevel === lvl.toString() ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLevel(lvl.toString());
                  setSelectedSpell(null);
                }}
                disabled={!spellSlots[lvl]}
              >
                <span className="level-name">Lvl {lvl}</span>
                {spellSlots[lvl] && slotStatus && selectedLevel === lvl.toString() && (
                  <span className="slot-count">{slotStatus.remaining}/{slotStatus.total}</span>
                )}
              </button>
            ))}
          </div>

          <div className="spells-content">
            {/* Spell List */}
            <div className="spell-list">
              {spellsByLevel.length === 0 ? (
                <div className="no-spells">No spells at this level</div>
              ) : (
                spellsByLevel.map((spell) => (
                  <button
                    key={spell.name}
                    className={`spell-item ${selectedSpell === spell.name ? 'selected' : ''}`}
                    onClick={() => setSelectedSpell(spell.name)}
                  >
                    <div className="spell-name">{spell.name}</div>
                    {spell.ritual && <span className="ritual-badge">Ritual</span>}
                  </button>
                ))
              )}
            </div>

            {/* Spell Details */}
            {currentSpell ? (
              <div className="spell-detail">
                <div className="detail-header">
                  <h3 className="spell-detail-name">{currentSpell.name}</h3>
                  {currentSpell.ritual && <span className="detail-ritual">Ritual Casting Available</span>}
                </div>

                <div className="detail-meta">
                  {currentSpell.school && (
                    <div className="meta-item">
                      <span className="meta-label">School:</span>
                      <span>{currentSpell.school}</span>
                    </div>
                  )}
                  {currentSpell.castingTime && (
                    <div className="meta-item">
                      <span className="meta-label">Casting Time:</span>
                      <span>{currentSpell.castingTime}</span>
                    </div>
                  )}
                  {currentSpell.range && (
                    <div className="meta-item">
                      <span className="meta-label">Range:</span>
                      <span>{currentSpell.range}</span>
                    </div>
                  )}
                  {currentSpell.components && (
                    <div className="meta-item">
                      <span className="meta-label">Components:</span>
                      <span>{currentSpell.components}</span>
                    </div>
                  )}
                  {currentSpell.duration && (
                    <div className="meta-item">
                      <span className="meta-label">Duration:</span>
                      <span>{currentSpell.duration}</span>
                    </div>
                  )}
                </div>

                {currentSpell.description && (
                  <div className="detail-description">
                    {currentSpell.description}
                  </div>
                )}

                {selectedLevel === 'cantrips' && (
                  <div className="cantrip-damage">
                    <span className="damage-label">Damage:</span>
                    <span className="damage-value">{getCantripDamage()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="spell-detail-empty">
                Select a spell to view details
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="spells-footer">
          <div className="footer-info">
            <span className="spell-dc">Spell DC: {getSpellDC()}</span>
          </div>
          <button className="spells-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
