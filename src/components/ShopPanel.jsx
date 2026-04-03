/**
 * ShopPanel.jsx — RPG shop UI with categories, rarity indicators, and better visual hierarchy
 * Props: { npc, shopType, onClose }
 */
import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import { buyItem, sellItem, canBuy, calculateSellPrice } from '../lib/shopSystem'
import shopInventories from '../data/shopInventories.json'
import { getDisposition } from '../lib/factionSystem'
import { playCoinSound } from '../lib/ambientSounds'
import { broadcastEncounterAction } from '../lib/liveChannel'

// Categorize items by type
function categorizeItems(items) {
  const categories = {
    'Weapons': [],
    'Armor & Shields': [],
    'Potions & Elixirs': [],
    'Wands & Staffs': [],
    'Accessories': [],
    'Other': [],
  };

  items.forEach(item => {
    if (item.type?.includes('weapon')) categories['Weapons'].push(item);
    else if (item.type?.includes('armor') || item.type?.includes('shield')) categories['Armor & Shields'].push(item);
    else if (item.type?.includes('potion')) categories['Potions & Elixirs'].push(item);
    else if (item.type?.includes('wand') || item.type?.includes('staff')) categories['Wands & Staffs'].push(item);
    else if (item.type?.includes('ring') || item.type?.includes('cloak') || item.type?.includes('boots') || item.type?.includes('amulet')) categories['Accessories'].push(item);
    else categories['Other'].push(item);
  });

  return Object.entries(categories).filter(([_, items]) => items.length > 0);
}

// Determine rarity color from price (higher price = rarer)
function getRarityColor(price) {
  if (price >= 500) return '#ff6b9d'; // Legendary - pink
  if (price >= 200) return '#d4af37'; // Epic - gold
  if (price >= 100) return '#5aaa70'; // Rare - green
  if (price >= 50) return '#6ba3d9'; // Uncommon - blue
  return '#a89070'; // Common - brown
}

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
    background: '#0e0b14', border: '2px solid #8b7355',
    width: '900px', maxWidth: '96vw', maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.1)',
  },
  header: {
    padding: '16px 20px', borderBottom: '2px solid #8b7355',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'linear-gradient(180deg, #1a1208 0%, #0e0b14 100%)',
  },
  shopName: { color: '#d4af37', fontSize: 22, fontWeight: 700, textShadow: '0 0 8px rgba(212,175,55,0.3)' },
  npcName: { color: '#a89070', fontSize: 13, marginTop: 4 },
  goldBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1208', border: '1px solid #d4af37',
    borderRadius: 4, padding: '8px 16px',
    color: '#d4af37', fontSize: 16, fontWeight: 700,
  },
  closeBtn: {
    background: 'none', border: '1px solid #4a3e2a', color: '#a89070',
    cursor: 'pointer', fontSize: 18, padding: '6px 12px', borderRadius: 2,
    fontFamily: "'Cinzel', serif", transition: 'all 0.2s',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  pane: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', borderRight: '1px solid #3a2e20',
  },
  paneRight: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  paneTitle: {
    padding: '12px 16px', color: '#d4af37', fontSize: 12, letterSpacing: 2,
    textTransform: 'uppercase', borderBottom: '1px solid #3a2e20', background: '#130f1c',
    fontWeight: 700,
  },
  list: { overflowY: 'auto', flex: 1, padding: '12px 0' },
  featuredSection: {
    padding: '16px 12px', borderBottom: '1px solid #3a2e20',
    background: 'linear-gradient(180deg, rgba(212,175,55,0.05) 0%, rgba(0,0,0,0) 100%)',
  },
  featuredTitle: {
    color: '#ff9d5a', fontSize: 11, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10, textShadow: '0 0 4px rgba(255,157,90,0.4)',
  },
  featuredCard: {
    background: 'linear-gradient(135deg, rgba(255,157,90,0.1) 0%, rgba(212,175,55,0.05) 100%)',
    border: '1px solid rgba(255,157,90,0.3)',
    borderRadius: 4, padding: '12px', marginBottom: 10,
    display: 'flex', gap: 12, alignItems: 'flex-start',
    transition: 'all 0.2s',
  },
  featuredCardHover: {
    background: 'linear-gradient(135deg, rgba(255,157,90,0.15) 0%, rgba(212,175,55,0.1) 100%)',
    borderColor: 'rgba(255,157,90,0.5)',
    boxShadow: '0 0 12px rgba(255,157,90,0.15)',
  },
  featuredIcon: { fontSize: 28, width: 40, textAlign: 'center', flexShrink: 0 },
  featuredName: { color: '#ff9d5a', fontSize: 13, fontWeight: 700 },
  featuredPrice: { color: '#ff9d5a', fontSize: 14, fontWeight: 700, marginLeft: 'auto', minWidth: 60, textAlign: 'right' },
  featuredBtn: {
    background: 'linear-gradient(135deg, #d4af37 0%, #c99a2e 100%)',
    border: 'none', color: '#0e0b14', padding: '6px 14px',
    borderRadius: 2, cursor: 'pointer', fontSize: 11, fontFamily: "'Cinzel', serif",
    fontWeight: 700, transition: 'all 0.2s', flexShrink: 0,
  },
  category: {
    marginBottom: 12,
  },
  categoryHeader: {
    padding: '8px 16px', color: '#d4af37', fontSize: 12, letterSpacing: 1,
    textTransform: 'uppercase', background: 'rgba(212,175,55,0.05)',
    borderLeft: '3px solid #d4af37', cursor: 'pointer', userSelect: 'none',
    fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  categoryCount: { color: '#a89070', fontSize: 11, fontWeight: 400, marginLeft: 'auto' },
  categoryItems: {
    padding: '0 8px',
  },
  row: (rarityColor) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', margin: '4px 8px',
    background: `linear-gradient(90deg, rgba(212,175,55,0.02) 0%, transparent 100%)`,
    borderRadius: 3, borderLeft: `3px solid ${rarityColor || 'transparent'}`,
    transition: 'all 0.2s', cursor: 'pointer',
  }),
  rowHover: (rarityColor) => ({
    background: `linear-gradient(90deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)`,
    boxShadow: `0 0 8px ${rarityColor}22`,
  }),
  icon: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  itemName: { color: '#e0d0b0', fontSize: 13, flex: 1, fontWeight: 500 },
  itemSub: { color: '#7a6a50', fontSize: 10, marginTop: 2 },
  price: { fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: 'right' },
  buyBtn: (disabled) => ({
    background: disabled ? '#1e1829' : '#2a1f0e',
    border: `1px solid ${disabled ? '#3a2e20' : '#d4af37'}`,
    color: disabled ? '#4a3e2a' : '#d4af37',
    padding: '6px 14px', borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 11, fontFamily: "'Cinzel', serif", flexShrink: 0, fontWeight: 600,
    transition: 'all 0.2s',
  }),
  sellBtn: {
    background: '#0e1a10', border: '1px solid #3a6040',
    color: '#5aaa70', padding: '6px 14px', borderRadius: 2,
    cursor: 'pointer', fontSize: 11, fontFamily: "'Cinzel', serif", flexShrink: 0,
    fontWeight: 600, transition: 'all 0.2s',
  },
  emptyMsg: { color: '#4a3e2a', padding: '30px 16px', textAlign: 'center', fontSize: 13, fontStyle: 'italic' },
  warning: {
    margin: '4px 8px 0', padding: '6px 12px',
    background: 'rgba(180,80,40,0.15)', border: '1px solid rgba(200,80,80,0.4)',
    color: '#e07050', fontSize: 11, borderRadius: 2,
  },
  toast: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: '#1a1520', border: '1px solid #d4af37', color: '#d4af37',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, whiteSpace: 'nowrap',
    pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
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
  const [expandedCategories, setExpandedCategories] = useState({})

  // Inject hover styles for rarity-based item rows
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .shop-item-row:hover {
        background: linear-gradient(90deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%);
        box-shadow: 0 0 8px rgba(212,175,55,0.3);
      }
      .shop-featured-card:hover {
        background: linear-gradient(135deg, rgba(255,157,90,0.15) 0%, rgba(212,175,55,0.1) 100%);
        border-color: rgba(255,157,90,0.5);
        box-shadow: 0 0 12px rgba(255,157,90,0.15);
        transform: translateY(-2px);
      }
      .shop-featured-card:hover button {
        transform: scale(1.05);
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  function toggleCategory(name) {
    setExpandedCategories(prev => ({ ...prev, [name]: !prev[name] }))
  }

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
    // Normalize shop item format to match the game's consumable/equipment schema
    const gameItem = { ...item }
    if (item.type === 'potion' && item.stats?.healDice) {
      // Convert potion shop format to consumable effect format that useItem expects
      const match = item.stats.healDice.match(/(\d+)d(\d+)(?:\+(\d+))?/)
      if (match) {
        gameItem.type = 'consumable'
        gameItem.effect = { type: 'heal', dice: `${match[1]}d${match[2]}`, bonus: parseInt(match[3] || '0') }
        gameItem.description = `Heals ${item.stats.healDice} HP`
      }
    }
    // Copy weapon stats to top-level so equip system recognizes them
    if (item.stats?.damage && !gameItem.damage) {
      gameItem.damage = item.stats.damage
      gameItem.damageType = item.stats.damageType
    }
    if (item.stats?.ac && !gameItem.baseAC) {
      gameItem.baseAC = item.stats.ac
    }
    addItemToInventory(gameItem)
    addGold(-item.price)
    playCoinSound()
    showToast(`Purchased ${item.name} for ${item.price} gp`)
    const { myCharacter, user } = useStore.getState()
    broadcastEncounterAction({ type: 'gold-update', charId: myCharacter?.id, charName: myCharacter?.name, gold: (myCharacter?.gold || 0) - item.price, userId: user?.id })
  }

  function handleSell(invItem) {
    const basePrice = invItem.price || 1
    const result = sellItem({ ...invItem, price: basePrice })
    removeItemFromInventory(invItem.instanceId)
    addGold(result.goldGained)
    showToast(`Sold ${invItem.name} for ${result.goldGained} gp`)
    const { myCharacter, user } = useStore.getState()
    broadcastEncounterAction({ type: 'gold-update', charId: myCharacter?.id, charName: myCharacter?.name, gold: (myCharacter?.gold || 0) + result.goldGained, userId: user?.id })
  }

  const sellableItems = inventory.filter(i => i.price && i.price > 0)

  // Featured items: top 3-4 most expensive items
  const featuredItems = [...shopItems]
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, 3)

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
          {/* Left — Shop inventory with categories */}
          <div style={S.pane}>
            <div style={S.paneTitle}>⚔ Shop Stock</div>
            <div style={S.list}>
              {/* Featured Items Section */}
              {featuredItems.length > 0 && (
                <div style={S.featuredSection}>
                  <div style={S.featuredTitle}>✦ Finest Wares ✦</div>
                  {featuredItems.map(item => {
                    const affordable = canBuy(gold, item.price)
                    const itemWeight = item.weight || 0
                    const wouldExceed = (totalWeight + itemWeight) > carryCapacity
                    return (
                      <div key={`featured-${item.id}`}>
                        <div style={S.featuredCard} className="shop-featured-card">
                          <span style={S.featuredIcon}>{itemIcon(item.type)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={S.featuredName}>{item.name}</div>
                            <div style={{ color: '#a89070', fontSize: 10, marginTop: 4 }}>
                              {itemStatSummary(item)} · {item.weight} lb
                            </div>
                          </div>
                          <span style={S.featuredPrice}>{item.price} gp</span>
                          <button
                            style={{ ...S.featuredBtn, opacity: affordable ? 1 : 0.5 }}
                            disabled={!affordable}
                            onClick={() => handleBuy(item)}
                            title={!affordable ? `Need ${item.price} gp` : `Buy for ${item.price} gp`}
                          >
                            {affordable ? 'Buy' : 'Cannot Afford'}
                          </button>
                        </div>
                        {wouldExceed && affordable && (
                          <div style={S.warning}>
                            ⚠ Would exceed capacity ({totalWeight.toFixed(1)}/{carryCapacity} lb)
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Categorized Items */}
              {categorizeItems(shopItems).map(([categoryName, items]) => (
                <div key={categoryName} style={S.category}>
                  <div
                    style={S.categoryHeader}
                    onClick={() => toggleCategory(categoryName)}
                  >
                    <span>{expandedCategories[categoryName] !== false ? '▼' : '▶'} {categoryName}</span>
                    <span style={S.categoryCount}>{items.length}</span>
                  </div>
                  {expandedCategories[categoryName] !== false && (
                    <div style={S.categoryItems}>
                      {items.map(item => {
                        const affordable = canBuy(gold, item.price)
                        const itemWeight = item.weight || 0
                        const wouldExceed = (totalWeight + itemWeight) > carryCapacity
                        const rarityColor = getRarityColor(item.price)
                        return (
                          <div key={item.id}>
                            <div style={S.row(rarityColor)} className="shop-item-row">
                              <span style={S.icon}>{itemIcon(item.type)}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ ...S.itemName, color: rarityColor }}>
                                  {item.name}
                                </div>
                                <div style={S.itemSub}>{itemStatSummary(item)} · {item.weight} lb</div>
                              </div>
                              <span style={{ ...S.price, color: rarityColor }}>{item.price} gp</span>
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
                                ⚠ Would exceed capacity ({totalWeight.toFixed(1)}/{carryCapacity} lb)
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Player inventory with categories */}
          <div style={S.paneRight}>
            <div style={S.paneTitle}>
              🎒 Your Inventory · {totalWeight.toFixed(1)}/{carryCapacity} lb
            </div>
            <div style={S.list}>
              {sellableItems.length === 0 && (
                <div style={S.emptyMsg}>You have nothing to sell</div>
              )}
              {categorizeItems(sellableItems).map(([categoryName, items]) => (
                <div key={categoryName} style={S.category}>
                  <div
                    style={S.categoryHeader}
                    onClick={() => toggleCategory(`inv-${categoryName}`)}
                  >
                    <span>{expandedCategories[`inv-${categoryName}`] !== false ? '▼' : '▶'} {categoryName}</span>
                    <span style={S.categoryCount}>{items.length}</span>
                  </div>
                  {expandedCategories[`inv-${categoryName}`] !== false && (
                    <div style={S.categoryItems}>
                      {items.map(invItem => {
                        const sellPrice = calculateSellPrice(invItem.price || 1)
                        const rarityColor = getRarityColor(invItem.price || 1)
                        return (
                          <div key={invItem.instanceId} style={S.row(rarityColor)} className="shop-item-row">
                            <span style={S.icon}>{itemIcon(invItem.type)}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ ...S.itemName, color: rarityColor }}>
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
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {toast && <div style={S.toast}>{toast}</div>}
      </div>
    </div>
  )
}
