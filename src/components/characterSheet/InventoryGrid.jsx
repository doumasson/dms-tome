import { useMemo } from 'react';
import { getSlotType } from '../../data/equipment';

// ── Item grid sizes (columns × rows) ────────────────────────────────────────
const ITEM_SIZES = {
  // Tiny (1×1)
  'Dagger': [1, 1], 'Dart': [1, 1], 'Sling': [1, 1],
  // Small (1×2)
  'Shortsword': [1, 2], 'Handaxe': [1, 2], 'Mace': [1, 2],
  'Scimitar': [1, 2], 'Sickle': [1, 2], 'Club': [1, 2],
  'Hand Crossbow': [1, 2], 'Light Hammer': [1, 2], 'Whip': [1, 2],
  // Medium (1×3)
  'Longsword': [1, 3], 'Rapier': [1, 3], 'Longsword (versatile)': [1, 3],
  'Battleaxe': [1, 3], 'Flail': [1, 3], 'Warhammer': [1, 3],
  'Morningstar': [1, 3], 'Quarterstaff': [1, 3], 'Spear': [1, 3],
  'War Pick': [1, 3], 'Short Bow': [1, 3], 'Light Crossbow': [1, 3],
  'Trident': [1, 3], 'Javelin': [1, 3],
  // Large (2×3)
  'Greataxe': [2, 3], 'Greatsword': [2, 3], 'Maul': [2, 3],
  'Glaive': [2, 3], 'Halberd': [2, 3], 'Pike': [2, 3],
  'Longbow': [2, 3], 'Heavy Crossbow': [2, 3], 'Greatclub': [2, 3],
  'Lance': [2, 3], 'Whip': [2, 3],
  // Armor (2×3)
  'Padded': [2, 3], 'Leather Armor': [2, 3], 'Studded Leather': [2, 3],
  'Hide': [2, 3], 'Chain Shirt': [2, 3], 'Scale Mail': [2, 3],
  'Breastplate': [2, 3], 'Half Plate': [2, 3],
  'Ring Mail': [2, 3], 'Chain Mail': [2, 3], 'Splint': [2, 3], 'Plate': [2, 3],
  // Shield (2×2)
  'Shield': [2, 2],
};

const GRID_COLS = 10;
const GRID_ROWS = 7;
const CELL_PX   = 36;

function getItemSize(item) {
  const sz = ITEM_SIZES[item.name];
  if (sz) return sz;
  if (item.type === 'armor' || item.baseAC !== undefined) return [2, 3];
  if (item.armorType === 'shield') return [2, 2];
  if (item.type === 'weapon' || item.damage !== undefined) return [1, 2];
  if (item.type === 'consumable') return [1, 1];
  return [1, 1];
}

function itemIcon(item) {
  if (item.icon) return item.icon;
  if (item.type === 'consumable') return '🧪';
  if (item.armorType === 'shield') return '🛡';
  if (item.baseAC !== undefined) return '🥋';
  if (item.category?.includes('ranged')) return '🏹';
  if (item.damage !== undefined || item.type === 'weapon') return '⚔';
  if (item.type === 'gear') return '🔧';
  return '📦';
}

// Place items into grid, returns array of { item, col, row, w, h }
function packItems(items) {
  const grid = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(false));
  const placed = [];
  const overflow = [];

  function fits(col, row, w, h) {
    if (col + w > GRID_COLS || row + h > GRID_ROWS) return false;
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        if (grid[r][c]) return false;
    return true;
  }

  function place(col, row, w, h) {
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        grid[r][c] = true;
  }

  // Sort: largest items first for better packing
  const sorted = [...items].sort((a, b) => {
    const [aw, ah] = getItemSize(a);
    const [bw, bh] = getItemSize(b);
    return (bw * bh) - (aw * ah);
  });

  for (const item of sorted) {
    const [w, h] = getItemSize(item);
    let found = false;
    outer: for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (fits(col, row, w, h)) {
          place(col, row, w, h);
          placed.push({ item, col, row, w, h });
          found = true;
          break outer;
        }
      }
    }
    if (!found) overflow.push(item);
  }

  return { placed, overflow };
}

export default function InventoryGrid({ character, isOwn, onEquip, onDrop, onUse }) {
  const inventory = character.inventory || [];
  const stats = character.stats || {};
  const strScore = stats.str || 10;
  const carryCapacity = strScore * 15; // PHB carry capacity
  const totalWeight = inventory.reduce((sum, item) => sum + ((item.weight || 0) * (item.quantity || 1)), 0);
  const weightPct = Math.min(100, (totalWeight / carryCapacity) * 100);
  const encumbered = totalWeight > strScore * 5;
  const heavilyEnc = totalWeight > strScore * 10;

  const { placed, overflow } = useMemo(() => packItems(inventory), [inventory]);

  return (
    <div style={container}>
      {/* Weight bar */}
      <div style={weightRow}>
        <span style={weightLabel}>
          {encumbered
            ? heavilyEnc ? '🐢 Heavily Encumbered' : '⚠ Encumbered'
            : '🎒 Carry Weight'}
        </span>
        <span style={weightNum}>{totalWeight.toFixed(1)} / {carryCapacity} lb</span>
      </div>
      <div style={weightBarBg}>
        <div style={{ ...weightBarFill, width: `${weightPct}%`, background: heavilyEnc ? '#c0392b' : encumbered ? '#e67e22' : '#2ecc71' }} />
      </div>

      {/* Grid */}
      <div style={{ position: 'relative', width: GRID_COLS * CELL_PX, height: GRID_ROWS * CELL_PX, flexShrink: 0 }}>
        {/* Background cells */}
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (i % GRID_COLS) * CELL_PX,
              top: Math.floor(i / GRID_COLS) * CELL_PX,
              width: CELL_PX - 1,
              height: CELL_PX - 1,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 2,
            }}
          />
        ))}

        {/* Placed items */}
        {placed.map(({ item, col, row, w, h }) => {
          const slot = getSlotType(item);
          const canEquipItem = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
          const canUseItem = isOwn && item.type === 'consumable';
          return (
            <div
              key={item.instanceId || item.name}
              style={{
                position: 'absolute',
                left: col * CELL_PX + 1,
                top: row * CELL_PX + 1,
                width: w * CELL_PX - 2,
                height: h * CELL_PX - 2,
                ...itemCard,
              }}
              title={`${item.name}${item.damage ? ` — ${item.damage} ${item.damageType}` : ''}${item.baseAC ? ` — AC ${item.baseAC}` : ''}\n${item.weight ? `Weight: ${item.weight} lb` : ''}`}
            >
              <div style={itemIconStyle}>{itemIcon(item)}</div>
              {w > 1 && h > 1 && <div style={itemNameStyle}>{item.name}</div>}
              {(w === 1 && h >= 2) && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{item.name}</div>}
              {item.quantity > 1 && <div style={itemQty}>×{item.quantity}</div>}
              {isOwn && (
                <div style={itemBtns}>
                  {canEquipItem && (
                    <button style={tinyBtn} onClick={() => onEquip(item)} title="Equip">E</button>
                  )}
                  {canUseItem && (
                    <button style={{ ...tinyBtn, background: 'rgba(46,204,113,0.3)' }} onClick={() => onUse(item)} title="Use">U</button>
                  )}
                  <button style={{ ...tinyBtn, background: 'rgba(192,57,43,0.3)' }} onClick={() => onDrop(item)} title="Drop">✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overflow items (didn't fit in grid) */}
      {overflow.length > 0 && (
        <div style={overflowSection}>
          <div style={overflowLabel}>Overflow ({overflow.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {overflow.map(item => (
              <div key={item.instanceId || item.name} style={overflowItem}>
                {itemIcon(item)} {item.name}
                {isOwn && (
                  <button style={{ ...tinyBtn, marginLeft: 4 }} onClick={() => onDrop(item)}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const container = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '8px 0',
};

const weightRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 2,
};

const weightLabel = {
  fontSize: '0.7rem',
  color: 'rgba(200,180,140,0.6)',
  fontFamily: "'Cinzel', Georgia, serif",
};

const weightNum = {
  fontSize: '0.68rem',
  color: 'rgba(212,175,55,0.8)',
};

const weightBarBg = {
  height: 4,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 2,
  overflow: 'hidden',
  marginBottom: 8,
};

const weightBarFill = {
  height: '100%',
  borderRadius: 2,
  transition: 'width 0.3s, background 0.3s',
};

const itemCard = {
  background: 'linear-gradient(135deg, rgba(40,25,10,0.95), rgba(25,15,5,0.95))',
  border: '1px solid rgba(212,175,55,0.25)',
  borderRadius: 3,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'default',
  overflow: 'hidden',
  position: 'relative',
  boxSizing: 'border-box',
};

const itemIconStyle = {
  fontSize: '1.1rem',
  lineHeight: 1,
};

const itemNameStyle = {
  fontSize: '0.55rem',
  color: 'rgba(200,180,140,0.8)',
  fontFamily: "'Cinzel', Georgia, serif",
  textAlign: 'center',
  wordBreak: 'break-word',
  padding: '0 2px',
};

const itemQty = {
  position: 'absolute',
  top: 1,
  right: 2,
  fontSize: '0.5rem',
  color: '#d4af37',
  fontWeight: 700,
};

const itemBtns = {
  position: 'absolute',
  bottom: 1,
  right: 1,
  display: 'flex',
  gap: 1,
};

const tinyBtn = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  borderRadius: 2,
  color: '#fff',
  fontSize: '0.55rem',
  padding: '1px 3px',
  cursor: 'pointer',
  lineHeight: 1.2,
};

const overflowSection = {
  borderTop: '1px solid rgba(255,255,255,0.07)',
  paddingTop: 6,
};

const overflowLabel = {
  fontSize: '0.65rem',
  color: 'rgba(200,180,140,0.4)',
  fontFamily: "'Cinzel', Georgia, serif",
  marginBottom: 4,
  textTransform: 'uppercase',
};

const overflowItem = {
  fontSize: '0.72rem',
  color: 'rgba(200,180,140,0.7)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 4,
  padding: '3px 7px',
  display: 'flex',
  alignItems: 'center',
};
