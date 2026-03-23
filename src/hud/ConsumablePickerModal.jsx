import useStore from '../store/useStore'

/**
 * Quick-access consumable item picker during combat.
 * Shows only usable consumables from the active combatant's inventory.
 */
export default function ConsumablePickerModal({ character, onSelect, onClose }) {
  const myCharacter = useStore(s => s.myCharacter)
  const inventory = myCharacter?.inventory || []

  // Filter to consumables with effects
  const consumables = inventory.filter(item =>
    item.type === 'consumable' && item.effect && (item.quantity || 1) > 0
  )

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
      borderRadius: 8, padding: '16px 24px', minWidth: 280, maxWidth: 360, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 12 }}>🧪 Use Item</div>
      {consumables.length === 0 ? (
        <div style={{ color: '#8a7a52', fontSize: 12, padding: '12px 0' }}>
          No consumable items in your pack.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {consumables.map((item, i) => (
            <button key={item.instanceId || i} onClick={() => onSelect(item)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#1a1520', padding: '10px 14px', borderRadius: 4,
              border: '1px solid #332a1e', color: '#e8dcc8', cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 12, textAlign: 'left',
            }}>
              <span>
                <span style={{ marginRight: 6 }}>{item.icon || '🧪'}</span>
                <span style={{ color: '#d4af37' }}>{item.name}</span>
                {(item.quantity || 1) > 1 && (
                  <span style={{ color: '#8a7a52', fontSize: 10, marginLeft: 4 }}>×{item.quantity}</span>
                )}
              </span>
              <span style={{ color: '#8a7a52', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.description || ''}
              </span>
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 10, color: '#666' }}>
        Uses your action · Press Escape to cancel
      </div>
    </div>
  )
}
