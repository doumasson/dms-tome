import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import useStore from '../../store/useStore';
import { getSlotType } from '../../data/equipment';
import { GridPacker, getItemSize } from '../../lib/inventoryGrid';
import {
  container, weightRow, weightLabel, weightNum,
  weightBarBg, weightBarFill,
  itemCard, itemIconStyle, itemNameStyle, itemQty,
  tinyBtn, overflowSection, overflowLabel, overflowItem,
  tooltip, tooltipTitle, tooltipLine,
} from './inventoryGridStyles';

const GRID_COLS = 10;
const GRID_ROWS = 7;
const CELL_PX   = 36;
const DRAG_THRESHOLD = 4; // px before drag activates (allows double-click)

function itemKey(i) { return i.instanceId || i.name; }

/** Convert pixel coords (relative to grid top-left) to a grid cell. */
function pxToCell(px, py, offsetX, offsetY, w, h) {
  const col = Math.max(0, Math.min(Math.floor((px - offsetX) / CELL_PX), GRID_COLS - w));
  const row = Math.max(0, Math.min(Math.floor((py - offsetY) / CELL_PX), GRID_ROWS - h));
  return { col, row };
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
  const packer   = new GridPacker(GRID_COLS, GRID_ROWS);
  const placed   = [];
  const overflow = [];

  const hasGridPos = i => i._gridCol != null && i._gridRow != null
    && Number.isFinite(i._gridCol) && Number.isFinite(i._gridRow);
  const preferred = items
    .filter(hasGridPos)
    .sort((a, b) => a._gridRow !== b._gridRow ? a._gridRow - b._gridRow : a._gridCol - b._gridCol);

  for (const item of preferred) {
    const [w, h] = getItemSize(item);
    const col    = Math.min(item._gridCol, GRID_COLS - w);
    const row    = Math.min(item._gridRow, GRID_ROWS - h);
    if (packer.canPlace(col, row, w, h)) {
      packer.place(itemKey(item), col, row, w, h);
      placed.push({ item, col, row, w, h });
    } else {
      const slot = packer.findSlot(w, h);
      if (slot) {
        packer.place(itemKey(item), slot.col, slot.row, w, h);
        placed.push({ item, col: slot.col, row: slot.row, w, h });
      } else {
        overflow.push(item);
      }
    }
  }

  for (const item of items.filter(i => !hasGridPos(i))) {
    const [w, h] = getItemSize(item);
    const slot   = packer.findSlot(w, h);
    if (slot) {
      packer.place(itemKey(item), slot.col, slot.row, w, h);
      placed.push({ item, col: slot.col, row: slot.row, w, h });
    } else {
      overflow.push(item);
    }
  }

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
  const inventory         = character.inventory || [];
  const stats             = character.stats || {};
  const strScore          = stats.str || 10;
  const carryCapacity     = strScore * 15;
  const totalWeight       = inventory.reduce((sum, i) => sum + ((i.weight || 0) * (i.quantity || 1)), 0);
  const weightPct         = Math.min(100, (totalWeight / carryCapacity) * 100);
  const encumbered        = totalWeight > strScore * 5;
  const heavilyEnc        = totalWeight > strScore * 10;
  const weightColor       = weightPct >= 66 ? '#c0392b' : weightPct >= 33 ? '#e67e22' : '#2ecc71';

  // Migrate items lacking instanceId
  useEffect(() => {
    if (!isOwn) return;
    if (inventory.some(i => !i.instanceId)) {
      updateMyCharacter({ inventory: inventory.map(i => i.instanceId ? i : { ...i, instanceId: crypto.randomUUID() }) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { placed, overflow } = useMemo(() => packItems(inventory), [inventory]);

  const [hoveredId, setHoveredId] = useState(null);
  const gridRef      = useRef(null);

  // Drag state — two phases:
  //   1. pendingDrag (ref): mouseDown captured, waiting for threshold
  //   2. drag (state): threshold exceeded, ghost visible, drop enabled
  const [drag, setDrag]         = useState(null);
  const [cursorPx, setCursorPx] = useState(null);   // { x, y } relative to grid
  const pendingDragRef = useRef(null);

  function handleMouseDown(e, item) {
    if (!isOwn || e.button !== 0) return;
    e.preventDefault();
    const [w, h]   = getItemSize(item);
    const placed_  = placed.find(p => itemKey(p.item) === itemKey(item));
    const origCol  = placed_?.col ?? 0;
    const origRow  = placed_?.row ?? 0;
    pendingDragRef.current = { item, w, h, origCol, origRow, startClientX: e.clientX, startClientY: e.clientY };
  }

  // commitDrop reads FRESH state from the store — no stale refs.
  const commitDrop = useCallback((pxInGrid, pyInGrid) => {
    const d = drag;
    if (!d) return;
    const { w, h, offsetX, offsetY, item } = d;

    const { col: targetCol, row: targetRow } = pxToCell(pxInGrid, pyInGrid, offsetX, offsetY, w, h);

    // Read LATEST inventory from the store (not a stale ref)
    const currentInventory = useStore.getState().myCharacter?.inventory || [];

    // Compute FRESH layout from current inventory
    const { placed: freshPlaced } = packItems(currentInventory);

    // Build a packer without the dragged item to check vacancy
    const packer = new GridPacker(GRID_COLS, GRID_ROWS);
    for (const p of freshPlaced) {
      if (itemKey(p.item) === itemKey(item)) continue;
      packer.place(itemKey(p.item), p.col, p.row, p.w, p.h);
    }

    if (packer.canPlace(targetCol, targetRow, w, h)) {
      // Persist ALL item positions (prevents any shifting)
      const posMap = new Map();
      for (const p of freshPlaced) {
        if (itemKey(p.item) === itemKey(item)) continue;
        posMap.set(itemKey(p.item), { col: p.col, row: p.row });
      }
      posMap.set(itemKey(item), { col: targetCol, row: targetRow });

      updateMyCharacter({
        inventory: currentInventory.map(i => {
          const pos = posMap.get(itemKey(i));
          if (pos) return { ...i, _gridCol: pos.col, _gridRow: pos.row };
          return i;
        }),
      });
    }
  }, [drag, updateMyCharacter]);

  // Global mouse listeners
  useEffect(() => {
    function onMove(e) {
      const pending = pendingDragRef.current;
      if (pending && !drag) {
        const dx = e.clientX - pending.startClientX;
        const dy = e.clientY - pending.startClientY;
        if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
          const gRect = gridRef.current?.getBoundingClientRect();
          if (!gRect) return;
          const offsetX = pending.startClientX - gRect.left - pending.origCol * CELL_PX;
          const offsetY = pending.startClientY - gRect.top  - pending.origRow * CELL_PX;
          setDrag({ item: pending.item, w: pending.w, h: pending.h, offsetX, offsetY, origCol: pending.origCol, origRow: pending.origRow });
          setCursorPx({ x: e.clientX - gRect.left, y: e.clientY - gRect.top });
          pendingDragRef.current = null;
        }
        return;
      }
      if (drag) {
        const gRect = gridRef.current?.getBoundingClientRect();
        if (gRect) setCursorPx({ x: e.clientX - gRect.left, y: e.clientY - gRect.top });
      }
    }
    function onUp(e) {
      if (drag) {
        const gRect = gridRef.current?.getBoundingClientRect();
        if (gRect) {
          commitDrop(e.clientX - gRect.left, e.clientY - gRect.top);
        }
        setDrag(null);
        setCursorPx(null);
      }
      pendingDragRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [drag, commitDrop]);

  // Ghost cell — uses same pxToCell as commitDrop for consistency
  const ghostCell = (drag && cursorPx)
    ? pxToCell(cursorPx.x, cursorPx.y, drag.offsetX, drag.offsetY, drag.w, drag.h)
    : null;

  const ghostValid = useMemo(() => {
    if (!ghostCell || !drag) return false;
    const packer = new GridPacker(GRID_COLS, GRID_ROWS);
    for (const p of placed) {
      if (itemKey(p.item) === itemKey(drag.item)) continue;
      packer.place(itemKey(p.item), p.col, p.row, p.w, p.h);
    }
    return packer.canPlace(ghostCell.col, ghostCell.row, drag.w, drag.h);
  }, [ghostCell, drag, placed]);

  function resetLayout() {
    updateMyCharacter({ inventory: inventory.map(({ _gridCol, _gridRow, ...rest }) => rest) });
  }

  const hoveredPlaced = hoveredId ? placed.find(p => itemKey(p.item) === hoveredId) : null;

  return (
    <div style={container}>
      {/* Weight bar */}
      <div style={weightRow}>
        <span style={weightLabel}>
          {encumbered ? (heavilyEnc ? '🐢 Heavily Encumbered' : '⚠ Encumbered') : '🎒 Carry Weight'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={weightNum}>{totalWeight.toFixed(1)} / {carryCapacity} lb</span>
          {isOwn && (
            <button onClick={resetLayout} title="Reset item layout"
              style={{ background: 'none', border: 'none', color: 'rgba(212,175,55,0.6)', fontSize: '0.8rem', cursor: 'pointer', padding: '2px 6px' }}>
              ⟳ Reset
            </button>
          )}
        </span>
      </div>
      <div style={weightBarBg}>
        <div style={{ ...weightBarFill, width: `${weightPct}%`, background: weightColor }} />
      </div>

      {/* 10×7 grid */}
      <div ref={gridRef} style={{ position: 'relative', width: GRID_COLS * CELL_PX, height: GRID_ROWS * CELL_PX, flexShrink: 0, userSelect: 'none' }}>

        {/* Background cells */}
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
          const col = i % GRID_COLS;
          const row = Math.floor(i / GRID_COLS);
          const inGhost = ghostCell && drag &&
            col >= ghostCell.col && col < ghostCell.col + drag.w &&
            row >= ghostCell.row && row < ghostCell.row + drag.h;
          const highlightColor = inGhost
            ? ghostValid ? 'rgba(212,175,55,0.18)' : 'rgba(192,57,43,0.18)'
            : 'rgba(255,255,255,0.02)';
          const borderColor = inGhost
            ? ghostValid ? 'rgba(212,175,55,0.6)' : 'rgba(192,57,43,0.5)'
            : 'rgba(255,255,255,0.05)';
          return (
            <div key={i} style={{
              position: 'absolute', left: col * CELL_PX, top: row * CELL_PX,
              width: CELL_PX - 1, height: CELL_PX - 1,
              background: highlightColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 2, boxSizing: 'border-box',
            }} />
          );
        })}

        {/* Placed items */}
        {placed.map(({ item, col, row, w, h }) => {
          const slot       = getSlotType(item);
          const canEquip   = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
          const canUse     = isOwn && item.type === 'consumable';
          const key        = itemKey(item);
          const isDragging = drag && itemKey(drag.item) === key;
          const isHov      = hoveredId === key && !drag;
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
                opacity:  isDragging ? 0.25 : 1,
                border:   isHov ? '1px solid rgba(212,175,55,0.55)' : '1px solid rgba(212,175,55,0.25)',
                cursor:   isOwn ? (isDragging ? 'grabbing' : 'grab') : 'default',
                zIndex:   isHov ? 10 : 1,
              }}
            >
              <div style={itemIconStyle}>{itemIcon(item)}</div>
              {w > 1 && h > 1 && <div style={itemNameStyle}>{item.name}</div>}
              {w === 1 && h >= 2 && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{item.name}</div>}
              {item.quantity > 1 && <div style={itemQty}>×{item.quantity}</div>}
            </div>
          );
        })}

        {/* Drag ghost — snapped to grid */}
        {drag && ghostCell && (
          <div style={{
            position: 'absolute',
            left: ghostCell.col * CELL_PX,
            top:  ghostCell.row * CELL_PX,
            width:  drag.w * CELL_PX - 2,
            height: drag.h * CELL_PX - 2,
            ...itemCard,
            overflow: 'hidden',
            opacity: 0.85,
            pointerEvents: 'none',
            zIndex: 500,
            boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
          }}>
            <div style={itemIconStyle}>{itemIcon(drag.item)}</div>
            {drag.w > 1 && drag.h > 1 && <div style={itemNameStyle}>{drag.item.name}</div>}
            {drag.w === 1 && drag.h >= 2 && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{drag.item.name}</div>}
          </div>
        )}

        {/* Tooltip */}
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
                  onMouseEnter={() => setHoveredId(`ov-${key}`)}
                  onMouseLeave={() => setHoveredId(null)}>
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
