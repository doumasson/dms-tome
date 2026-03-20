import { useMemo, useState, useRef, useEffect } from 'react';
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
const DRAG_THRESHOLD = 4;

function itemKey(i) { return i.instanceId || i.name; }

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

/** Cursor pixel position (relative to grid) → grid cell for an item of size w×h */
function cursorToCell(px, py, w, h) {
  return {
    col: Math.max(0, Math.min(Math.floor(px / CELL_PX), GRID_COLS - w)),
    row: Math.max(0, Math.min(Math.floor(py / CELL_PX), GRID_ROWS - h)),
  };
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
      } else overflow.push(item);
    }
  }

  for (const item of items.filter(i => !hasGridPos(i))) {
    const [w, h] = getItemSize(item);
    const slot   = packer.findSlot(w, h);
    if (slot) {
      packer.place(itemKey(item), slot.col, slot.row, w, h);
      placed.push({ item, col: slot.col, row: slot.row, w, h });
    } else overflow.push(item);
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

  // Persist positions for items that lack them (runs once, guard prevents loops)
  const didSaveRef = useRef(false);
  useEffect(() => {
    if (!isOwn || !placed.length || didSaveRef.current) return;
    const needsSave = inventory.some(i => i._gridCol == null || i._gridRow == null);
    if (!needsSave) return;
    didSaveRef.current = true;
    const posMap = new Map();
    for (const p of placed) posMap.set(itemKey(p.item), { col: p.col, row: p.row });
    updateMyCharacter({
      inventory: inventory.map(i => {
        const pos = posMap.get(itemKey(i));
        return pos ? { ...i, _gridCol: pos.col, _gridRow: pos.row } : i;
      }),
    });
  }, [placed]); // eslint-disable-line react-hooks/exhaustive-deps

  const [hoveredId, setHoveredId] = useState(null);
  const gridRef = useRef(null);

  // Drag: { item, w, h, key } — NO offset. Cursor = item top-left.
  const [drag, setDrag]         = useState(null);
  const [ghostCell, setGhostCell] = useState(null); // { col, row } for rendering
  const [debugInfo, setDebugInfo] = useState(null); // TEMPORARY diagnostic
  const ghostCellRef = useRef(null);  // always-current ghost cell (no stale closures)
  const dragRef = useRef(null);       // always-current drag state
  const pendingRef = useRef(null);

  function handleMouseDown(e, item) {
    if (!isOwn || e.button !== 0) return;
    e.preventDefault();
    const [w, h] = getItemSize(item);
    pendingRef.current = { item, w, h, startX: e.clientX, startY: e.clientY };
  }

  // Single stable effect — listeners never churn. Refs ensure latest values.
  useEffect(() => {
    function getGridPx(e) {
      const r = gridRef.current?.getBoundingClientRect();
      return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
    }

    function onMove(e) {
      const p = pendingRef.current;
      const d = dragRef.current;
      if (p && !d) {
        if (Math.abs(e.clientX - p.startX) + Math.abs(e.clientY - p.startY) > DRAG_THRESHOLD) {
          const newDrag = { item: p.item, w: p.w, h: p.h, key: itemKey(p.item) };
          dragRef.current = newDrag;
          setDrag(newDrag);
          const gp = getGridPx(e);
          if (gp) {
            const cell = cursorToCell(gp.x, gp.y, p.w, p.h);
            ghostCellRef.current = cell;
            setGhostCell(cell);
          }
          pendingRef.current = null;
        }
        return;
      }
      if (d) {
        const gp = getGridPx(e);
        if (gp) {
          const cell = cursorToCell(gp.x, gp.y, d.w, d.h);
          ghostCellRef.current = cell;
          setGhostCell(prev =>
            prev && prev.col === cell.col && prev.row === cell.row ? prev : cell
          );
          // DIAGNOSTIC — will remove after debugging
          const r = gridRef.current?.getBoundingClientRect();
          setDebugInfo({
            clientY: Math.round(e.clientY),
            gridTop: Math.round(r?.top || 0),
            gridPxY: Math.round(gp.y),
            cellRow: cell.row,
            cellPx: CELL_PX,
            ghostTopPx: cell.row * CELL_PX,
          });
        }
      }
    }

    function onUp() {
      const d = dragRef.current;
      const gc = ghostCellRef.current;
      if (d && gc) {
        // Read FRESH inventory from store
        const inv = useStore.getState().myCharacter?.inventory || [];
        const { placed: fresh } = packItems(inv);

        // Check vacancy (exclude dragged item)
        const packer = new GridPacker(GRID_COLS, GRID_ROWS);
        for (const p of fresh) {
          if (itemKey(p.item) === d.key) continue;
          packer.place(itemKey(p.item), p.col, p.row, p.w, p.h);
        }

        if (packer.canPlace(gc.col, gc.row, d.w, d.h)) {
          const posMap = new Map();
          for (const p of fresh) {
            if (itemKey(p.item) === d.key) continue;
            posMap.set(itemKey(p.item), { col: p.col, row: p.row });
          }
          posMap.set(d.key, { col: gc.col, row: gc.row });

          updateMyCharacter({
            inventory: inv.map(i => {
              const pos = posMap.get(itemKey(i));
              return pos ? { ...i, _gridCol: pos.col, _gridRow: pos.row } : i;
            }),
          });
        }
      }
      dragRef.current = null;
      ghostCellRef.current = null;
      setDrag(null);
      setGhostCell(null);
      pendingRef.current = null;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updateMyCharacter]);  // stable deps — NO drag/ghostCell, uses refs

  // Ghost validity
  const ghostValid = useMemo(() => {
    if (!ghostCell || !drag) return false;
    const packer = new GridPacker(GRID_COLS, GRID_ROWS);
    for (const p of placed) {
      if (itemKey(p.item) === drag.key) continue;
      packer.place(itemKey(p.item), p.col, p.row, p.w, p.h);
    }
    return packer.canPlace(ghostCell.col, ghostCell.row, drag.w, drag.h);
  }, [ghostCell, drag, placed]);

  function resetLayout() {
    didSaveRef.current = false;
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
          {isOwn && (
            <button onClick={resetLayout} title="Reset item layout"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 8px', borderRadius: 3 }}>
              Reset
            </button>
          )}
        </span>
      </div>
      <div style={weightBarBg}>
        <div style={{ ...weightBarFill, width: `${weightPct}%`, background: weightColor }} />
      </div>

      <div ref={gridRef} style={{ position: 'relative', width: GRID_COLS * CELL_PX, height: GRID_ROWS * CELL_PX, flexShrink: 0, userSelect: 'none' }}>

        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
          const col = i % GRID_COLS;
          const row = Math.floor(i / GRID_COLS);
          const inGhost = ghostCell && drag &&
            col >= ghostCell.col && col < ghostCell.col + drag.w &&
            row >= ghostCell.row && row < ghostCell.row + drag.h;
          const hl = inGhost
            ? ghostValid ? 'rgba(212,175,55,0.18)' : 'rgba(192,57,43,0.18)'
            : 'rgba(255,255,255,0.02)';
          const bc = inGhost
            ? ghostValid ? 'rgba(212,175,55,0.6)' : 'rgba(192,57,43,0.5)'
            : 'rgba(255,255,255,0.05)';
          return (
            <div key={i} style={{
              position: 'absolute', left: col * CELL_PX, top: row * CELL_PX,
              width: CELL_PX - 1, height: CELL_PX - 1,
              background: hl, border: `1px solid ${bc}`,
              borderRadius: 2, boxSizing: 'border-box',
            }} />
          );
        })}

        {placed.map(({ item, col, row, w, h }) => {
          const slot       = getSlotType(item);
          const canEquip   = isOwn && slot && slot !== 'consumable' && slot !== 'misc';
          const canUse     = isOwn && item.type === 'consumable';
          const key        = itemKey(item);
          const isDragging = drag && drag.key === key;
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
                ...itemCard, overflow: 'hidden',
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

        {/* Ghost — snapped to grid, same position as drop target */}
        {drag && ghostCell && (
          <div style={{
            position: 'absolute',
            left: ghostCell.col * CELL_PX,
            top:  ghostCell.row * CELL_PX,
            width:  drag.w * CELL_PX - 2,
            height: drag.h * CELL_PX - 2,
            ...itemCard, overflow: 'hidden',
            opacity: 0.7, pointerEvents: 'none', zIndex: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            border: ghostValid ? '2px solid rgba(212,175,55,0.8)' : '2px solid rgba(192,57,43,0.8)',
          }}>
            <div style={itemIconStyle}>{itemIcon(drag.item)}</div>
            {drag.w > 1 && drag.h > 1 && <div style={itemNameStyle}>{drag.item.name}</div>}
            {drag.w === 1 && drag.h >= 2 && <div style={{ ...itemNameStyle, fontSize: '0.52rem', lineHeight: 1.1 }}>{drag.item.name}</div>}
          </div>
        )}

        {hoveredPlaced && !drag && (() => {
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

      {/* DIAGNOSTIC — remove after debugging */}
      {debugInfo && (
        <div style={{ fontSize: 11, color: '#ff0', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', fontFamily: 'monospace', whiteSpace: 'pre' }}>
          {`clientY=${debugInfo.clientY} gridTop=${debugInfo.gridTop} gridPxY=${debugInfo.gridPxY} → row=${debugInfo.cellRow} (ghostTop=${debugInfo.ghostTopPx}px)`}
        </div>
      )}

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
