import { useState } from 'react';
import './EquipmentPanel.css';

/**
 * EquipmentPanel - Character equipment and attunement reference
 * Shows equipped items, armor proficiencies, and magic item attunements
 */
export default function EquipmentPanel({
  character = {},
  onClose = () => {},
}) {
  const [selectedTab, setSelectedTab] = useState('equipped');

  const equipment = character.equipment || {};
  const armor = equipment.armor || {};
  const attunements = character.attunements || [];
  const maxAttunements = character.class === 'Artificer' ?
    Math.ceil(character.level / 6) + 2 :
    Math.ceil(character.level / 6);
  const activeAttunements = attunements.filter(a => a.attuned);
  const armorProf = character.armorProficiencies || [];

  // Calculate AC
  const calculateAC = () => {
    const stats = character.stats || { dex: 10, wis: 10 };
    const dexMod = Math.floor((stats.dex - 10) / 2);

    if (armor.type === 'Heavy') {
      return (armor.ac || 10) + (armor.modifier || 0);
    } else if (armor.type === 'Medium') {
      return (armor.ac || 11) + Math.min(dexMod, 2) + (armor.modifier || 0);
    } else if (armor.type === 'Light') {
      return (armor.ac || 11) + dexMod + (armor.modifier || 0);
    }
    return 10 + dexMod; // Unarmored
  };

  const getArmorType = (type) => {
    const typeMap = {
      'Light': '⚔️ Light',
      'Medium': '🛡️ Medium',
      'Heavy': '⛑️ Heavy',
      'None': '✨ Unarmored',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="equipment-panel-overlay" onClick={onClose}>
      <div className="equipment-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="equipment-header">
          <h2 className="equipment-title">⚙️ Equipment</h2>
          <button className="equipment-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="equipment-tabs">
          <button
            className={`equipment-tab ${selectedTab === 'equipped' ? 'active' : ''}`}
            onClick={() => setSelectedTab('equipped')}
          >
            Equipped
          </button>
          <button
            className={`equipment-tab ${selectedTab === 'attunements' ? 'active' : ''}`}
            onClick={() => setSelectedTab('attunements')}
          >
            Attunements
          </button>
          <button
            className={`equipment-tab ${selectedTab === 'proficiencies' ? 'active' : ''}`}
            onClick={() => setSelectedTab('proficiencies')}
          >
            Proficiencies
          </button>
        </div>

        {/* Content */}
        <div className="equipment-content">
          {selectedTab === 'equipped' && (
            <div className="equipped-section">
              {/* Armor Class */}
              <div className="ac-display">
                <div className="ac-label">Armor Class</div>
                <div className="ac-value">{calculateAC()}</div>
              </div>

              {/* Armor */}
              <div className="equipment-item-group">
                <h3 className="item-group-title">Armor</h3>
                {armor.name ? (
                  <div className="equipment-item">
                    <div className="item-icon">⚔️</div>
                    <div className="item-details">
                      <div className="item-name">{armor.name}</div>
                      <div className="item-type">{getArmorType(armor.type)}</div>
                      {armor.ac && <div className="item-stat">AC {armor.ac}</div>}
                      {armor.weight && <div className="item-stat">{armor.weight} lbs</div>}
                    </div>
                  </div>
                ) : (
                  <div className="equipment-empty">No armor equipped</div>
                )}
              </div>

              {/* Weapon */}
              <div className="equipment-item-group">
                <h3 className="item-group-title">Melee Weapon</h3>
                {equipment.weapon ? (
                  <div className="equipment-item">
                    <div className="item-icon">🗡️</div>
                    <div className="item-details">
                      <div className="item-name">{equipment.weapon.name}</div>
                      {equipment.weapon.damage && <div className="item-stat">{equipment.weapon.damage}</div>}
                      {equipment.weapon.damageType && <div className="item-type">{equipment.weapon.damageType}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="equipment-empty">No melee weapon equipped</div>
                )}
              </div>

              {/* Shield */}
              <div className="equipment-item-group">
                <h3 className="item-group-title">Shield</h3>
                {equipment.shield ? (
                  <div className="equipment-item">
                    <div className="item-icon">🛡️</div>
                    <div className="item-details">
                      <div className="item-name">{equipment.shield.name}</div>
                      {equipment.shield.ac && <div className="item-stat">+{equipment.shield.ac} AC</div>}
                    </div>
                  </div>
                ) : (
                  <div className="equipment-empty">No shield equipped</div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'attunements' && (
            <div className="attunements-section">
              <div className="attunement-header">
                <span className="attunement-label">Attuned: {activeAttunements.length} / {maxAttunements}</span>
              </div>
              {attunements.length === 0 ? (
                <div className="equipment-empty">No magic items</div>
              ) : (
                <div className="attunement-list">
                  {attunements.map((item, idx) => (
                    <div
                      key={idx}
                      className={`attunement-item ${item.attuned ? 'attuned' : 'not-attuned'}`}
                    >
                      <div className="attunement-indicator">
                        {item.attuned ? '✨' : '⭘'}
                      </div>
                      <div className="attunement-details">
                        <div className="attunement-name">{item.name}</div>
                        {item.rarity && <div className="attunement-rarity">{item.rarity}</div>}
                        {item.description && <div className="attunement-description">{item.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'proficiencies' && (
            <div className="proficiencies-section">
              <div className="proficiency-group">
                <h3 className="prof-group-title">Armor Proficiencies</h3>
                {armorProf.length === 0 ? (
                  <div className="equipment-empty">No armor proficiencies</div>
                ) : (
                  <div className="proficiency-list">
                    {armorProf.map((prof, idx) => (
                      <div key={idx} className="proficiency-item">
                        <span className="prof-icon">🛡️</span>
                        <span className="prof-name">{prof}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="proficiency-group">
                <h3 className="prof-group-title">Weapon Proficiencies</h3>
                {!character.weaponProficiencies || character.weaponProficiencies.length === 0 ? (
                  <div className="equipment-empty">No weapon proficiencies listed</div>
                ) : (
                  <div className="proficiency-list">
                    {character.weaponProficiencies.map((prof, idx) => (
                      <div key={idx} className="proficiency-item">
                        <span className="prof-icon">⚔️</span>
                        <span className="prof-name">{prof}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="equipment-footer">
          <button className="equipment-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
