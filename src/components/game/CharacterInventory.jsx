import { useState } from 'react';
import './CharacterInventory.css';

/**
 * CharacterInventory - Character backpack and item management
 * Shows inventory items, weight tracking, and carrying capacity
 */
export default function CharacterInventory({
  character = {},
  onClose = () => {},
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortBy, setSortBy] = useState('type');

  const inventory = character.inventory || [];
  const stats = character.stats || {};
  const strength = stats.str || 10;
  const strMod = Math.floor((strength - 10) / 2);
  const maxCapacity = (15 + strMod * 5) * 10; // in lbs

  // Calculate total weight
  const totalWeight = inventory.reduce((sum, item) => {
    const weight = item.weight || 0;
    const quantity = item.quantity || 1;
    return sum + (weight * quantity);
  }, 0);

  const capacityPercent = Math.min((totalWeight / maxCapacity) * 100, 100);
  const isEncumbered = totalWeight > maxCapacity;
  const isHeavilyEncumbered = totalWeight > (maxCapacity * 1.5);

  // Group and sort items
  const getGroupedInventory = () => {
    if (sortBy === 'type') {
      const groups = {
        'Weapons': [],
        'Armor': [],
        'Potions': [],
        'Consumables': [],
        'Valuables': [],
        'Other': [],
      };

      inventory.forEach(item => {
        const itemType = item.type || 'Other';
        if (groups[itemType]) {
          groups[itemType].push(item);
        } else {
          groups.Other.push(item);
        }
      });

      return Object.entries(groups).filter(([_, items]) => items.length > 0);
    }

    // Sort by weight
    const sorted = [...inventory].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    return [['All Items', sorted]];
  };

  const groupedItems = getGroupedInventory();

  const getItemIcon = (item) => {
    const iconMap = {
      'Weapons': '⚔️',
      'Armor': '🛡️',
      'Potions': '🧪',
      'Consumables': '🍞',
      'Valuables': '💎',
      'Magical Item': '✨',
      'Gold': '🪙',
      'Rope': '🧵',
      'Torch': '🔦',
      'Other': '📦',
    };
    return iconMap[item.type] || iconMap[item.category] || '📦';
  };

  const getQualityColor = (rarity) => {
    const colorMap = {
      'Common': '#e8d5a3',
      'Uncommon': '#4dd0e1',
      'Rare': '#9c27b0',
      'Very Rare': '#ffd700',
      'Legendary': '#ff6f00',
      'Artifact': '#ff1744',
    };
    return colorMap[rarity] || '#e8d5a3';
  };

  const encumbranceStatus = () => {
    if (isHeavilyEncumbered) return 'HEAVILY ENCUMBERED';
    if (isEncumbered) return 'ENCUMBERED';
    return 'NORMAL';
  };

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inventory-header">
          <h2 className="inventory-title">🎒 Inventory</h2>
          <button className="inventory-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Capacity Display */}
        <div className={`capacity-display ${isHeavilyEncumbered ? 'heavily-encumbered' : isEncumbered ? 'encumbered' : 'normal'}`}>
          <div className="capacity-bar-container">
            <div className="capacity-bar-track">
              <div
                className={`capacity-bar-fill ${isHeavilyEncumbered ? 'over-heavy' : isEncumbered ? 'over-normal' : 'normal'}`}
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              />
            </div>
            <div className="capacity-info">
              <span className="capacity-weight">{totalWeight}/{maxCapacity} lbs</span>
              <span className={`capacity-status ${encumbranceStatus().toLowerCase().replace(' ', '-')}`}>
                {encumbranceStatus()}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="inventory-controls">
          <div className="sort-controls">
            <label>Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="type">By Type</option>
              <option value="weight">By Weight</option>
            </select>
          </div>
          <div className="item-count">
            {inventory.length} item{inventory.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Inventory Content */}
        <div className="inventory-content">
          {inventory.length === 0 ? (
            <div className="inventory-empty">
              <div className="empty-icon">📭</div>
              <div className="empty-text">Inventory is empty</div>
            </div>
          ) : (
            <div className="inventory-groups">
              {groupedItems.map(([groupName, items]) => (
                <div key={groupName} className="inventory-group">
                  <h3 className="group-title">{groupName} ({items.length})</h3>
                  <div className="items-list">
                    {items.map((item, idx) => (
                      <div
                        key={`${groupName}-${idx}`}
                        className={`inventory-item ${selectedItem === `${groupName}-${idx}` ? 'selected' : ''}`}
                        onClick={() => setSelectedItem(`${groupName}-${idx}`)}
                      >
                        <div className="item-header">
                          <span className="item-icon">{getItemIcon(item)}</span>
                          <span className="item-name" style={{ color: getQualityColor(item.rarity) }}>
                            {item.name}
                          </span>
                          {item.quantity && item.quantity > 1 && (
                            <span className="item-qty">x{item.quantity}</span>
                          )}
                        </div>
                        <div className="item-info">
                          {item.weight && (
                            <span className="info-weight">
                              {item.weight * (item.quantity || 1)} lbs
                            </span>
                          )}
                          {item.rarity && (
                            <span className="info-rarity">{item.rarity}</span>
                          )}
                          {item.cost && (
                            <span className="info-cost">{item.cost}</span>
                          )}
                        </div>
                        {item.description && selectedItem === `${groupName}-${idx}` && (
                          <div className="item-description">{item.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="inventory-footer">
          <button className="inventory-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
