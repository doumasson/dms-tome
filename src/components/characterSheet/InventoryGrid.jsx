import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import useStore from '../../store/useStore';
import { getSlotType } from '../../data/equipment';
import {
  container, weightRow, weightLabel, weightNum,
  weightBarBg, weightBarFill,
  itemCard, itemIconStyle, itemNameStyle, itemQty,
  tinyBtn, overflowSection, overflowLabel, overflowItem,
  tooltip, tooltipTitle, tooltipLine,
} from './inventoryGridStyles';

const ITEM_SIZES = {
  'Dagger': [1, 1], 'Dart': [1, 1], 'Sling': [1, 1],
  'Shortsword': [1, 2], 'Handaxe': [1, 2], 'Mace': [1, 2],
  'Scimitar': [1, 2], 'Sickle': [1, 2], 'Club': [1, 2],
  'Hand Crossbow': [1, 2], 'Light Hammer': [1, 2], 'Whip': [1, 2],
  'Longsword': [1, 3], 'Rapier': [1, 3], 'Longsword (versatile)': [1, 3],
  'Battleaxe': [1, 3], 'Flail': [1, 3], 'Warhammer': [1, 3],
  'Morningstar': [1, 3], 'Quarterstaff': [1, 3], 'Spear': [1, 3],
  'War Pick': [1, 3], 'Short Bow': [1, 3], 'Light Crossbow': [1, 3],
  'Trident': [1, 3], 'Javelin': [1, 3],
  'Greataxe': [2, 3], 'Greatsword': [2, 3], 'Maul': [2, 3],
  'Glaive': [2, 3], 'Halberd': [2, 3], 'Pike': [2, 3],
  'Longbow': [2, 3], 'Heavy Crossbow': [2, 3], 'Greatclub': [2, 3],
  'Lance': [2, 3], 'Lance (two-handed)': [2, 3],
  'Padded': [2, 3], 'Leather Armor': [2, 3], 'Studded Leather': [2, 3],
  'Hide': [2, 3], 'Chain Shirt': [2, 3], 'Scale Mail': [2, 3],
  'Breastplate': [2, 3], 'Half Plate': [2, 3],
  'Ring Mail': [2, 3], 'Chain Mail': [2, 3], 'Splint': [2, 3], 'Plate': [2, 3],
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
  function mark(col, row, w, h) {
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        grid[r][c] = true;
  }
  function firstFit(item) {
    const [w, h] = getItemSize(item);
    for (let row = 0; row < GRID_ROWS; row++)
      for (let col = 0; col < GRID_COLS; col++)
        if (fits(col, row, w, h)) { mark(col, row, w, h); placed.push({ item, col, row, w, h }); return; }
    overflow.push(item);
  }

  // Preferred positions first (top-left → bottom-right)
  const preferred = items
    .filter(i => i._gridCol !== undefined)
    .sort((a, b) => a._gridRow !== b._gridRow ? a._gridRow - b._gridRow : a._gridCol - b._gridCol);

  for (const item of preferred) {
    const [w, h] = getItemSize(item);
    const pc = Math.min(item._gridCol, GRID_COLS - w);
    const pr = Math.min(item._gridRow, GRID_ROWS - h);
    if (fits(pc, pr, w, h)) { mark(pc, pr, w, h); placed.push({ item, col: pc, row: pr, w, h }); }
    else firstFit(item);
  }

  for (const item of items.filter(i => i._gridCol === undefined)) firstFit(item);
  return { placed, overflow };
}

function ItemTooltip({ item, canEquip, canUse, isOwn }) {
  const lines = [];
  if (item.damage)             lines.push(`Damage: ${item.damage} ${item.damageType || ''}`);
  if (item.baseAC)             lines.push(`AC: ${item.baseAC}${item.addDex ? ' + DEX' : ''}${item.maxDex != null ? ` (max +${item.maxDex})` : ''}`);
  if (item.properties?.length) lines.push(`Properties: ${item.properties.join(', ')}`);
  if (item.weight)             lines.push(`Weight: ${item.weight} lb`);
  if (item.cost)               lines.push(`Value: ${item.cost}`);
  if (item.description)        lines.push(item.description);
  return (
    <div style={tooltip}>
      <div style={tooltipTitle}>{item.name}</div>
      {lines.map((l, i) => <div key={i} style={tooltipLine}>{l}</div>)}
      {isOwn && (
        <div style={{ ...tooltipLine, marginTop: 6, borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: 5, color: 'rgba(212,175,55,0.6)' }}>
          {canEquip && <div>Double-click to equip</div>}
          {canUse   && <div>Double-click to use</div>}
          <div>Drag to move · Shift+click to drop</div>
        </div>
      )}
    </div>
  );
}

export default function InventoryGrid({ character, isOwn, onEquip, onDrop, onUse }) {
  const updateMyCharacter = useStore(s => s.updateMyCharacter);
  const inventory = character.inventory || [];
  const stats     = character.stats || {};
  const strScore  = stats.str || 10;
  const carryCapacity = strScore * 15;
  const totalWeight   = inventory.reduce((sum, i) => sum + ((i.weight || 0) * (i.quantity || 1)), 0);
  const weightPct     = Math.min(100, (totalWeight / carryCapacity) * 100);
  const encumbered    = totalWeight > strScore * 5;
  const heavilyEnc    = totalWeight > strScore * 10;

  // Migrate existing characters that lack instanceId
  useEffect(() => {
    if (!isOwn) return;
    if (inventory.some(i => !i.instanceId)) {
      updateMyCharacter({ inventory: inventory.map(i => i.instanceId ? i : { ...i, instanceId: crypto.randomUUID() }) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { placed, overflow } = useMemo(() => packItems(inventory), [inventory]);

  const [hoveredId, setHoveredId] = useState(null);
  const gridRef   = useRef(null);

  // ── Mouse-based drag state ────────────────────────────────────────────────
  const [drag, setDrag]         = useState(null);  // { item, w, h, offsetX, offsetY }
  const [cursorPx, setCursorPx] = useState(null);  // { x, y } relative to grid
  const inventoryRef = useRef(inventory);
  const placedRef    = useRef(placed);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { placedRef.current    = placed; },    [placed]);

  function itemKey(i) { return i.instanceId || i.name; }

  function handleMouseDown(e, item) {
    if (!isOwn || e.button !== 0) return;
    e.preventDefault();
    const rect   = e.currentTarget.getBoundingClientRect();
    const [w, h] = getItemSize(item);
    setDrag({ item, w, h, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    const gRect = gridRef.current?.getBoundingClientRect();
    if (gRect) setCursorPx({ x: e.clientX - gRect.left, y: e.clientY - gRect.top });
  }

  const commitDrop = useCallback((clientX, clientY) => {
    const gRect = gridRef.current?.getBoundingClientRect();
    const d     = drag;
    if (!gRect || !d) return;
    const { w, h, offsetX, offsetY, item } = d;

    const col = Math.max(0, Math.min(Math.round((clientX - gRect.left - offsetX) / CELL_PX), GRID_COLS - w));
    const row = Math.max(0, Math.min(Math.round((clientY - gRect.top  - offsetY) / CELL_PX), GRID_ROWS - h));

    // Find any item whose placed rect overlaps the target footprint
    const target = placedRef.current.find(p =>
      itemKey(p.item) !== itemKey(item) &&
      col < p.col + p.w && col + w > p.col &&
      row < p.row + p.h && row + h > p.row
    );

    if (target) {
      // Swap array order
      const inv = [...inventoryRef.current];
      const si  = inv.findIndex(i => itemKey(i) === itemKey(item));
      const ti  = inv.findIndex(i => itemKey(i) === itemKey(target.item));
      if (si !== -1 && ti !== -1) {
        const [removed] = inv.splice(si, 1);
        inv.splice(ti, 0, removed);
        updateMyCharacter({ inventory: inv });
      }
    } else {
      // Save preferred position
      updateMyCharacter({
        inventory: inventoryRef.current.map(i =>
          itemKey(i) === itemKey(item) ? { ...i, _gridCol: col, _gridRow: row } : i
        ),
      });
    }
  }, [drag, updateMyCharacter]);

  useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      const gRect = gridRef.current?.getBoundingClientRect();
      if (gRect) setCursorPx({ x: e.clientX - gRect.left, y: e.clientY - gRect.top });
    }
    function onUp(e) {
      commitDrop(e.clientX, e.clientY);
      setDrag(null);
      setCursorPx(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, commitDrop]);

  // Target footprint highlight
  const targetCell = (drag && cursorPx) ? {
    col: Math.max(0, Math.min(Math.round((cursorPx.x - drag.offsetX) / CELL_PX), GRID_COLS - drag.w)),
    row: Math.max(0, Math.min(Math.round((cursorPx.y - drag.offsetY) / CELL_PX), GRID_ROWS - drag.h)),
  } : null;

  function resetLayout() {
    updateMyCharacter({ inventory: inventory.map(({ _gridCol, _gridRow, ...rest }) => rest) });
  }

  const hoveredPlaced = hoveredId ? placed.find(p => itemKey(p.item) === hoveredId) : null;

  return (
    <div style={container}>
      <div style={weightRow}>
        <span style={weightLabel}>
          {encumbered ? (heavilyEnc ? '🐢 Heavily Encumbered' : '⚠ Encumbered') : '🎒 Carry Weight'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={weightNum}>{totalWeight.toFixed(1)} / {carryCapacity} lb</span>
          {isOwn && <button onClick={resetLayout} title="Reset item layout" style={{ background: 'none', border: 'none', color: 'rgba(212,175,55,0.4)', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}>⟳ Reset</button>}
        </span>
      </div>
      <div style={weightBarBg}>
        <div style={{ ...weightBarFill, width: `${weightPct}%`, background: heavilyEnc ? '#c0392b' : encumbered ? '#e67e22' : '#2ecc71' }} />
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{ position: 'relative', width: GRID_COLS * CELL_PX, height: GRID_ROWS * CELL_PX, flexShrink: 0, userSelect: 'none' }}>
        {/* Background cells */}
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
          const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
          const inTarget = targetCell && drag &&
            col >= targetCell.col && col < targetCell.col + drag.w &&
            row >= targetCell.row && row < targetCell.row + drag.h;
          return (
            <div key={i} style={{
              position: 'absolute', left: col * CELL_PX, top: row * CELL_PX,
              width: CELL_PX - 1, height: CELL_PX - 1,
              background: inTarget ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.02)',
              border: inTarget ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: 2, boxSizing: 'border-box',
            }} />
          );
        })}

        {/* Placed items */}
        {placed.map(({ item, col, row, w, h }) => {
          const slot     = getSlotType(item);
          const canEquip = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
          const canUse   = isOwn && item.type === 'consumable';
          const key      = itemKey(item);
          const isDragging = drag && itemKey(drag.item) === key;
          const isHov    = hoveredId === key && !drag;
          return (
            <div
              key={key}
              onMouseDown={isOwn ? e => handleMouseDown(e, item) : undefined}
              onMouseEnter={() => { if (!drag) setHoveredId(key); }}
              onMouseLeave={() => setHoveredId(null)}
              onDoubleClick={isOwn ? () => { if (canUse) onUse(item); else if (canEquip) onEquip(item); } : undefined}
              onClick={isOwn ? e => { if (e.shiftKey) onDrop(item); } : undefined}
              style={{
                position: 'absolute',
                left: col * CELL_PX + 1, top: row * CELL_PX + 1,
                width: w * CELL_PX - 2, height: h * CELL_PX - 2,
                ...itemCard,
                overflow: 'hidden',
                opacity: isDragging ? 0.25 : 1,
                border: isHov ? '1px solid rgba(212,175,55,0.55)' : '1px solid rgba(212,175,55,0.25)',
                cursor: isOwn ? (isDragging ? 'grabbing' : 'grab') : 'default',
                zIndex: isHov ? 10 : 1,
              }}
            >
              <div style={itemIconStyle}>{itemIcon(item)}</div>
              {w > 1 && h > 1 && <div style={itemNameStyle}>{item.name}</div>}
              {w === 1 && h >= 2 && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{item.name}</div>}
              {item.quantity > 1 && <div style={itemQty}>×{item.quantity}</div>}
            </div>
          );
        })}

        {/* Dragging ghost */}
        {drag && cursorPx && (
          <div style={{
            position: 'absolute',
            left: cursorPx.x - drag.offsetX,
            top:  cursorPx.y - drag.offsetY,
            width:  drag.w * CELL_PX - 2,
            height: drag.h * CELL_PX - 2,
            ...itemCard,
            overflow: 'hidden',
            opacity: 0.85,
            pointerEvents: 'none',
            zIndex: 500,
            boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
            transform: 'scale(1.06)',
          }}>
            <div style={itemIconStyle}>{itemIcon(drag.item)}</div>
            {drag.w > 1 && drag.h > 1 && <div style={itemNameStyle}>{drag.item.name}</div>}
            {drag.w === 1 && drag.h >= 2 && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{drag.item.name}</div>}
          </div>
        )}

        {/* Tooltip at grid level (not clipped by item overflow:hidden) */}
        {hoveredPlaced && (() => {
          const { item, col, row, w, h } = hoveredPlaced;
          const slot     = getSlotType(item);
          const canEquip = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
          const canUse   = isOwn && item.type === 'consumable';
          return (
            <div style={{
              position: 'absolute',
              left:   col < GRID_COLS / 2 ? (col + w) * CELL_PX + 4 : undefined,
              right:  col >= GRID_COLS / 2 ? (GRID_COLS - col) * CELL_PX + 4 : undefined,
              top:    row < GRID_ROWS / 2 ? row * CELL_PX : undefined,
              bottom: row >= GRID_ROWS / 2 ? (GRID_ROWS - row - h) * CELL_PX : undefined,
              zIndex: 200, pointerEvents: 'none',
            }}>
              <ItemTooltip item={item} canEquip={canEquip} canUse={canUse} isOwn={isOwn} />
            </div>
          );
        })()}
      </div>

      {/* Overflow */}
      {overflow.length > 0 && (
        <div style={overflowSection}>
          <div style={overflowLabel}>Overflow — {overflow.length} items don't fit</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {overflow.map(item => {
              const slot     = getSlotType(item);
              const canEquip = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
              const canUse   = isOwn && item.type === 'consumable';
              const key      = itemKey(item);
              return (
                <div key={key} style={{ ...overflowItem, position: 'relative' }}
                  onMouseEnter={() => setHoveredId(`ov-${key}`)} onMouseLeave={() => setHoveredId(null)}>
                  {itemIcon(item)} {item.name}
                  {isOwn && <>
                    {canEquip && <button style={{ ...tinyBtn, marginLeft: 4, background: 'rgba(212,175,55,0.3)' }} onClick={() => onEquip(item)}>E</button>}
                    {canUse   && <button style={{ ...tinyBtn, marginLeft: 2, background: 'rgba(46,204,113,0.3)'  }} onClick={() => onUse(item)}>U</button>}
                    <button style={{ ...tinyBtn, marginLeft: 2 }} onClick={() => onDrop(item)}>✕</button>
                  </>}
                  {hoveredId === `ov-${key}` && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 200, pointerEvents: 'none' }}>
                      <ItemTooltip item={item} canEquip={canEquip} canUse={canUse} isOwn={isOwn} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
