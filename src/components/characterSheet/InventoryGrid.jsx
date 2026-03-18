import { useMemo, useState, useRef, useEffect } from 'react';
import useStore from '../../store/useStore';
import { getSlotType } from '../../data/equipment';
import {
  container, weightRow, weightLabel, weightNum,
  weightBarBg, weightBarFill,
  itemCard, itemIconStyle, itemNameStyle, itemQty, itemBtns, tinyBtn,
  overflowSection, overflowLabel, overflowItem,
  tooltipWrapper, tooltip, tooltipTitle, tooltipLine,
} from './inventoryGridStyles';

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

function ItemTooltip({ item }) {
  const lines = [item.name];
  if (item.damage)  lines.push(`Damage: ${item.damage} ${item.damageType}`);
  if (item.baseAC)  lines.push(`AC: ${item.baseAC}${item.addDex ? ' + DEX' : ''}${item.maxDex != null ? ` (max +${item.maxDex})` : ''}`);
  if (item.properties?.length) lines.push(`Properties: ${item.properties.join(', ')}`);
  if (item.weight)  lines.push(`Weight: ${item.weight} lb`);
  if (item.cost)    lines.push(`Value: ${item.cost}`);
  if (item.description) lines.push(item.description);

  return (
    <div style={tooltip}>
      {lines.map((l, i) => (
        <div key={i} style={i === 0 ? tooltipTitle : tooltipLine}>{l}</div>
      ))}
    </div>
  );
}

export default function InventoryGrid({ character, isOwn, onEquip, onDrop, onUse }) {
  const updateMyCharacter = useStore(s => s.updateMyCharacter);
  const inventory = character.inventory || [];
  const stats = character.stats || {};
  const strScore = stats.str || 10;
  const carryCapacity = strScore * 15;
  const totalWeight = inventory.reduce((sum, item) => sum + ((item.weight || 0) * (item.quantity || 1)), 0);
  const weightPct = Math.min(100, (totalWeight / carryCapacity) * 100);
  const encumbered = totalWeight > strScore * 5;
  const heavilyEnc = totalWeight > strScore * 10;

  // Migrate existing characters that lack instanceId on their inventory items
  useEffect(() => {
    if (!isOwn) return;
    const needsIds = inventory.some(i => !i.instanceId);
    if (needsIds) {
      updateMyCharacter({
        inventory: inventory.map(i => i.instanceId ? i : { ...i, instanceId: crypto.randomUUID() }),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { placed, overflow } = useMemo(() => packItems(inventory), [inventory]);

  const [hoveredId, setHoveredId] = useState(null);
  const dragItemRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  function handleDragStart(item) {
    dragItemRef.current = item;
  }
  function handleDragOver(e, item) {
    e.preventDefault();
    setDragOverId(item.instanceId || item.name);
  }
  function handleDrop(e, targetItem) {
    e.preventDefault();
    setDragOverId(null);
    const src = dragItemRef.current;
    dragItemRef.current = null;
    if (!src || (src.instanceId || src.name) === (targetItem.instanceId || targetItem.name)) return;
    // Reorder: move src before target
    const inv = [...inventory];
    const srcIdx = inv.findIndex(i => (i.instanceId || i.name) === (src.instanceId || src.name));
    const tgtIdx = inv.findIndex(i => (i.instanceId || i.name) === (targetItem.instanceId || targetItem.name));
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [removed] = inv.splice(srcIdx, 1);
    inv.splice(tgtIdx, 0, removed);
    updateMyCharacter({ inventory: inv });
  }

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
          const itemKey = item.instanceId || item.name;
          const isHov = hoveredId === itemKey;
          const isDragOver = dragOverId === itemKey;
          return (
            <div
              key={itemKey}
              draggable={isOwn}
              onDragStart={() => handleDragStart(item)}
              onDragOver={e => handleDragOver(e, item)}
              onDrop={e => handleDrop(e, item)}
              onDragLeave={() => setDragOverId(null)}
              onMouseEnter={() => setHoveredId(itemKey)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'absolute',
                left: col * CELL_PX + 1,
                top: row * CELL_PX + 1,
                width: w * CELL_PX - 2,
                height: h * CELL_PX - 2,
                ...itemCard,
                ...(isDragOver ? { border: '1px solid rgba(212,175,55,0.8)', background: 'rgba(212,175,55,0.12)' } : {}),
                cursor: isOwn ? 'grab' : 'default',
                zIndex: isHov ? 10 : 1,
              }}
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
              {/* Hover tooltip */}
              {isHov && (
                <div style={{
                  ...tooltipWrapper,
                  left: col >= GRID_COLS / 2 ? 'auto' : '100%',
                  right: col >= GRID_COLS / 2 ? '100%' : 'auto',
                  top: row >= GRID_ROWS / 2 ? 'auto' : 0,
                  bottom: row >= GRID_ROWS / 2 ? 0 : 'auto',
                }}>
                  <ItemTooltip item={item} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overflow items (didn't fit in grid) */}
      {overflow.length > 0 && (
        <div style={overflowSection}>
          <div style={overflowLabel}>Overflow — {overflow.length} items don't fit</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {overflow.map(item => (
              <div
                key={item.instanceId || item.name}
                style={{ ...overflowItem, position: 'relative' }}
                onMouseEnter={() => setHoveredId(`ov-${item.instanceId || item.name}`)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {itemIcon(item)} {item.name}
                {isOwn && (
                  <>
                    {getSlotType(item) && getSlotType(item) !== 'consumable' && getSlotType(item) !== 'misc' && (
                      <button style={{ ...tinyBtn, marginLeft: 4, background: 'rgba(212,175,55,0.3)' }} onClick={() => onEquip(item)}>E</button>
                    )}
                    {item.type === 'consumable' && (
                      <button style={{ ...tinyBtn, marginLeft: 2, background: 'rgba(46,204,113,0.3)' }} onClick={() => onUse(item)}>U</button>
                    )}
                    <button style={{ ...tinyBtn, marginLeft: 2 }} onClick={() => onDrop(item)}>✕</button>
                  </>
                )}
                {hoveredId === `ov-${item.instanceId || item.name}` && (
                  <div style={{ ...tooltipWrapper, top: 'auto', bottom: '100%', left: 0, right: 'auto' }}>
                    <ItemTooltip item={item} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// styles imported from inventoryGridStyles.js
