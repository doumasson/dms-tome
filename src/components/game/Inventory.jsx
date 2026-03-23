import './Inventory.css';

/**
 * Inventory Component
 * Item grid, equipment slots, gold display
 */

export default function Inventory({
  items = [],
  equipment = {},
  gold = 0,
  onEquip = () => {},
  onUse = () => {},
  onDrop = () => {},
  onClose = () => {}
}) {
  const equipmentSlots = [
    { slot: 'head', name: 'Head', icon: '👑' },
    { slot: 'chest', name: 'Armor', icon: '🛡️' },
    { slot: 'hands', name: 'Hands', icon: '🧤' },
    { slot: 'legs', name: 'Legs', icon: '👖' },
    { slot: 'feet', name: 'Boots', icon: '👢' },
    { slot: 'mainHand', name: 'Main Hand', icon: '⚔️' },
    { slot: 'offHand', name: 'Off Hand', icon: '🛡️' },
    { slot: 'accessory', name: 'Accessory', icon: '💍' }
  ];

  return (
    <div className="inventory-overlay">
      <div className="inventory-panel">
        {/* Header */}
        <div className="inventory-header">
          <h2>Inventory</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="inventory-main">
          {/* Equipment slots */}
          <div className="equipment-section">
            <div className="section-title">Equipment</div>
            <div className="equipment-grid">
              {equipmentSlots.map(slot => {
                const equipped = equipment[slot.slot];
                return (
                  <div key={slot.slot} className="equipment-slot">
                    <div className="slot-icon">{slot.icon}</div>
                    <div className="slot-label">{slot.name}</div>
                    {equipped && (
                      <div className="equipped-item" title={equipped.name}>
                        {equipped.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items grid */}
          <div className="items-section">
            <div className="section-title">Items ({items.length})</div>
            {items.length === 0 ? (
              <div className="empty-inventory">
                <p>No items</p>
              </div>
            ) : (
              <div className="items-grid">
                {items.map((item, idx) => (
                  <div key={idx} className="item-slot">
                    <div className="item-icon">{item.icon || '📦'}</div>
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-qty">x{item.quantity || 1}</div>
                    </div>
                    <div className="item-actions">
                      {item.isEquippable && (
                        <button
                          className="action-btn equip"
                          onClick={() => onEquip(idx)}
                          title="Equip"
                        >
                          E
                        </button>
                      )}
                      {item.isUsable && (
                        <button
                          className="action-btn use"
                          onClick={() => onUse(idx)}
                          title="Use"
                        >
                          U
                        </button>
                      )}
                      <button
                        className="action-btn drop"
                        onClick={() => onDrop(idx)}
                        title="Drop"
                      >
                        D
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Gold display */}
        <div className="inventory-footer">
          <div className="gold-display">
            <span className="gold-icon">💰</span>
            <span className="gold-amount">{gold} gold</span>
          </div>
        </div>
      </div>
    </div>
  );
}
