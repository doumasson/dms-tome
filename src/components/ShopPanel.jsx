/**
 * ShopPanel.jsx — Split-panel buy/sell modal for NPC shop interactions.
 * Props: { npc, shopType, onClose }
 */
import { useState } from 'react'
import useStore from '../store/useStore'
import { buyItem, sellItem, canBuy, calculateSellPrice } from '../lib/shopSystem'
import shopInventories from '../data/shopInventories.json'
import { getDisposition } from '../lib/factionSystem'

const ITEM_TYPE_ICON = {
  weapon_light:     '🗡️',
  weapon_one_handed:'⚔️',
  weapon_two_handed:'🪓',
  weapon_ranged:    '🏹',
  armor_light:      '🥋',
  armor_medium:     '🛡️',
  armor_heavy:      '🛡️',
  shield:           '🛡️',
  potion:           '🧪',
  wand:             '🪄',
  cloak:            '🧥',
  ring:             '💍',
  boots:            '👢',
  amulet:           '📿',
  staff:            '🔱',
  default:          '📦',
}

function itemIcon(type) {
  return ITEM_TYPE_ICON[type] || ITEM_TYPE_ICON.default
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9000, fontFamily: "'Cinzel', serif",
  },
  modal: {
    background: '#0e0b14', border: '1px solid #3a2e20',
    width: '900px', maxWidth: '96vw', maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  },
  header: {
    padding: '14px 20px', borderBottom: '1px solid #3a2e20',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#130f1c',
  },
  shopName: { color: '#d4af37', fontSize: 20, fontWeight: 700 },
  npcName: { color: '#a89070', fontSize: 13, marginTop: 2 },
  goldBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1520', border: '1px solid #d4af37',
    borderRadius: 2, padding: '6px 14px',
    color: '#d4af37', fontSize: 16, fontWeight: 700,
  },
  closeBtn: {
    background: 'none', border: '1px solid #4a3e2a', color: '#a89070',
    cursor: 'pointer', fontSize: 18, padding: '4px 10px', borderRadius: 2,
    fontFamily: "'Cinzel', serif",
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  pane: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', borderRight: '1px solid #3a2e20',
  },
  paneRight: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  paneTitle: {
    padding: '10px 16px', color: '#a89070', fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', borderBottom: '1px solid #2a2030', background: '#110d1a',
  },
  list: { overflowY: 'auto', flex: 1, padding: '4px 0' },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 16px', borderBottom: '1px solid #1a1520',
    background: '#1a1520', margin: '2px 8px', borderRadius: 2,
  },
  icon: { fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 },
  itemName: { color: '#e0d0b0', fontSize: 14, flex: 1 },
  itemSub: { color: '#7a6a50', fontSize: 11, marginTop: 1 },
  price: { color: '#d4af37', fontSize: 14, fontWeight: 700, minWidth: 52, textAlign: 'right' },
  buyBtn: (disabled) => ({
    background: disabled ? '#1e1829' : '#2a1f0e',
    border: `1px solid ${disabled ? '#3a2e20' : '#d4af37'}`,
    color: disabled ? '#4a3e2a' : '#d4af37',
    padding: '4px 12px', borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12, fontFamily: "'Cinzel', serif", flexShrink: 0,
  }),
  sellBtn: {
    background: '#0e1a10', border: '1px solid #3a6040',
    color: '#5aaa70', padding: '4px 12px', borderRadius: 2,
    cursor: 'pointer', fontSize: 12, fontFamily: "'Cinzel', serif", flexShrink: 0,
  },
  emptyMsg: { color: '#4a3e2a', padding: '20px 16px', textAlign: 'center', fontSize: 13 },
  warning: {
    margin: '4px 8px 0', padding: '6px 12px',
    background: 'rgba(180,80,40,0.15)', border: '1px solid rgba(200,80,80,0.4)',
    color: '#e07050', fontSize: 12, borderRadius: 2,
  },
  toast: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: '#1a1520', border: '1px solid #d4af37', color: '#d4af37',
    padding: '8px 18px', borderRadius: 2, fontSize: 13, whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
}

function itemStatSummary(item) {
  const s = item.stats || {}
  if (s.damage) return `${s.damage} ${s.damageType || ''}`
  if (s.ac) return `AC ${s.ac}${s.stealthDis ? ' (dis. stealth)' : ''}`
  if (s.acBonus) return `+${s.acBonus} AC / saving throws`
  if (s.healDice) return `Heals ${s.healDice}`
  if (s.effect) return s.effect.length > 50 ? s.effect.slice(0, 47) + '…' : s.effect
  if (s.charges) return `${s.charges} charges`
  return ''
}

export default function ShopPanel({ npc, shopType, onClose }) {
  const myCharacter       = useStore(s => s.myCharacter)
  const addItemToInventory = useStore(s => s.addItemToInventory)
  const removeItemFromInventory = useStore(s => s.removeItemFromInventory)
  const addGold           = useStore(s => s.addGold)
  const factionReputation = useStore(s => s.factionReputation)
  const [toast, setToast] = useState(null)
  const [toastTimer, setToastTimer] = useState(null)

  const shopData   = shopInventories[shopType] || shopInventories['general_store']
  let shopItems    = shopData?.items || []
  const shopName   = shopData?.name || 'Shop'
  const gold       = myCharacter?.gold || 0
  const inventory  = myCharacter?.inventory || []
  const strScore   = myCharacter?.stats?.str || 10
  const carryCapacity = strScore * 15
  const totalWeight   = inventory.reduce((sum, i) => sum + ((i.weight || 0) * (i.quantity || 1)), 0)

  // Add faction-exclusive items if player has good reputation with NPC's faction
  if (npc?.faction && shopData?.factionItems) {
    const rep = factionReputation?.[npc.faction] ?? 0
    const disposition = getDisposition(rep)
    // Show faction items if player is at least Friendly (rep > 25)
    if (rep > 25) {
      shopItems = [...shopItems, ...shopData.factionItems.map(item => ({
        ...item,
        name: `✦ ${item.name}`, // Mark as exclusive with sparkle
        factionExclusive: true,
      }))]
    }
  }

  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer)
    setToast(msg)
    const t = setTimeout(() => setToast(null), 2200)
    setToastTimer(t)
  }

  function handleBuy(item) {
    const result = buyItem(item, gold)
    if (!result.success) {
      showToast(result.reason)
      return
    }
    addItemToInventory(item)
    addGold(-item.price)
    showToast(`Purchased ${item.name} for ${item.price} gp`)
  }

  function handleSell(invItem) {
    const basePrice = invItem.price || 1
    const result = sellItem({ ...invItem, price: basePrice })
    removeItemFromInventory(invItem.instanceId)
    addGold(result.goldGained)
    showToast(`Sold ${invItem.name} for ${result.goldGained} gp`)
  }

  const sellableItems = inventory.filter(i => i.price && i.price > 0)

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...S.modal, position: 'relative' }}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.shopName}>{shopName}</div>
            {npc?.name && <div style={S.npcName}>Proprietor: {npc.name}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={S.goldBadge}>
              🪙 {gold} gp
            </div>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Split body */}
        <div style={S.body}>
          {/* Left — Shop inventory */}
          <div style={S.pane}>
            <div style={S.paneTitle}>Shop Stock</div>
            <div style={S.list}>
              {shopItems.map(item => {
                const affordable = canBuy(gold, item.price)
                const itemWeight = item.weight || 0
                const wouldExceed = (totalWeight + itemWeight) > carryCapacity
                return (
                  <div key={item.id}>
                    <div style={S.row}>
                      <span style={S.icon}>{itemIcon(item.type)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={S.itemName}>{item.name}</div>
                        <div style={S.itemSub}>{itemStatSummary(item)} · {item.weight} lb</div>
                      </div>
                      <span style={S.price}>{item.price} gp</span>
                      <button
                        style={S.buyBtn(!affordable)}
                        disabled={!affordable}
                        onClick={() => handleBuy(item)}
                        title={!affordable ? `Need ${item.price} gp` : `Buy for ${item.price} gp`}
                      >
                        Buy
                      </button>
                    </div>
                    {wouldExceed && affordable && (
                      <div style={S.warning}>
                        ⚠ Buying this would exceed carry capacity ({totalWeight.toFixed(1)}/{carryCapacity} lb)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — Player inventory */}
          <div style={S.paneRight}>
            <div style={S.paneTitle}>
              Your Inventory · {totalWeight.toFixed(1)}/{carryCapacity} lb
            </div>
            <div style={S.list}>
              {sellableItems.length === 0 && (
                <div style={S.emptyMsg}>Nothing to sell</div>
              )}
              {sellableItems.map(invItem => {
                const sellPrice = calculateSellPrice(invItem.price || 1)
                return (
                  <div key={invItem.instanceId} style={S.row}>
                    <span style={S.icon}>{itemIcon(invItem.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={S.itemName}>
                        {invItem.name}
                        {(invItem.quantity || 1) > 1 && (
                          <span style={{ color: '#a89070', marginLeft: 6 }}>×{invItem.quantity}</span>
                        )}
                      </div>
                      <div style={S.itemSub}>
                        {itemStatSummary(invItem)} · {invItem.weight || 0} lb
                      </div>
                    </div>
                    <span style={{ ...S.price, color: '#5aaa70' }}>{sellPrice} gp</span>
                    <button style={S.sellBtn} onClick={() => handleSell(invItem)}>
                      Sell
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {toast && <div style={S.toast}>{toast}</div>}
      </div>
    </div>
  )
}
