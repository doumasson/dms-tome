import { getTokenColor } from '../../lib/dice';
import { MAP_W, MAP_H, CELL_PX } from './combatStyles';

// Per-type index map for coloring tokens consistently
export function buildTypeIndex(combatants) {
  const idx = {};
  combatants.forEach((c) => {
    if (!idx[c.type]) idx[c.type] = {};
    if (idx[c.type][c.id] === undefined) {
      idx[c.type][c.id] = Object.keys(idx[c.type]).length;
    }
  });
  return idx;
}

export function Token({ combatant, colorIndex, isSelected, isActive, onClick, cellPx = CELL_PX }) {
  const color = getTokenColor(combatant.type, colorIndex);
  const pct = combatant.maxHp > 0 ? combatant.currentHp / combatant.maxHp : 0;
  const ring = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  const dead = combatant.currentHp <= 0;
  const dying = dead && combatant.type === 'player' && !(combatant.deathSaves?.failures >= 3);
  const initials = combatant.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasPortrait = !!combatant.portrait;
  const borderColor = isSelected ? '#fff' : isActive ? '#f1c40f' : ring;
  const size = cellPx - 6;

  return (
    <div
      onClick={onClick}
      title={`${combatant.name} • HP ${combatant.currentHp}/${combatant.maxHp} • AC ${combatant.ac}`}
      style={{
        position: 'absolute', top: 3, left: 3,
        width: size, height: size,
        borderRadius: '50%',
        border: `3px solid ${borderColor}`,
        background: dead && !hasPortrait ? '#2a1a0a' : !hasPortrait ? color : 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: dead ? '#555' : '#fff',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5)' : isActive ? '0 0 10px rgba(241,196,15,0.6)' : '0 2px 6px rgba(0,0,0,0.6)',
        userSelect: 'none', zIndex: 2,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        opacity: dead && !dying ? 0.45 : 1,
      }}
    >
      {hasPortrait ? (
        <img
          src={combatant.portrait}
          alt={combatant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', filter: dead ? 'grayscale(1) brightness(0.5)' : 'none' }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <>
          {initials}
          {dead && <span style={{ fontSize: 9, lineHeight: 1 }}>☠</span>}
        </>
      )}
      {dead && hasPortrait && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>☠</div>
      )}
      {dying && (
        <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid #f39c12', animation: 'goldPulse 1.5s infinite', pointerEvents: 'none' }} />
      )}
    </div>
  );
}

export default function BattleMap({ combatants, selectedToken, activeCombatantId, onCellClick, onTokenClick, cellPx = CELL_PX }) {
  const posMap = {};
  const typeIdx = buildTypeIndex(combatants);

  combatants.forEach((c) => {
    if (c.position) posMap[`${c.position.x},${c.position.y}`] = c;
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${MAP_W}, ${cellPx}px)`,
      gridTemplateRows: `repeat(${MAP_H}, ${cellPx}px)`,
      border: '2px solid #3a2a14',
      borderRadius: 4,
      overflow: 'hidden',
      background: '#130d06',
      flexShrink: 0,
    }}>
      {Array.from({ length: MAP_W * MAP_H }).map((_, i) => {
        const x = i % MAP_W;
        const y = Math.floor(i / MAP_W);
        const c = posMap[`${x},${y}`];
        const isActive = c?.id === activeCombatantId;
        const isSelected = c?.id === selectedToken;
        const canDrop = !!selectedToken && !c;

        return (
          <div
            key={i}
            onClick={() => onCellClick(x, y)}
            style={{
              position: 'relative',
              border: '1px solid #2a1a0a',
              background: isActive && c
                ? 'rgba(241,196,15,0.08)'
                : canDrop
                  ? 'rgba(255,255,255,0.07)'
                  : (x + y) % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
              cursor: canDrop ? 'crosshair' : 'default',
            }}
          >
            {c && (
              <Token
                combatant={c}
                colorIndex={typeIdx[c.type]?.[c.id] || 0}
                isSelected={isSelected}
                isActive={isActive}
                onClick={(e) => { e.stopPropagation(); onTokenClick(c.id); }}
                cellPx={cellPx}
              />
            )}
            {isActive && c && (
              <div style={{
                position: 'absolute', inset: 0,
                border: '2px solid rgba(241,196,15,0.5)',
                borderRadius: 2, pointerEvents: 'none',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
