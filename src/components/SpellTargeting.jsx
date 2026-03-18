import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_PX = 52;

// ─── Geometry Helpers ─────────────────────────────────────────────────────────

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

// Chebyshev distance in squares
function gridDist(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// True D&D-style range: use Manhattan distance in 5ft increments
function feetDist(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 5;
}

// Get tokens within a sphere (circle) of given radius in feet centered on cx,cy
function tokensInSphere(cx, cy, radiusFt, combatants) {
  return combatants.filter(c => {
    if (!c.position || c.currentHp <= 0) return false;
    return feetDist(cx, cy, c.position.x, c.position.y) <= radiusFt;
  });
}

// Get tokens within a cone from (ox,oy) in direction angle, of given length
function tokensInCone(ox, oy, angleDeg, lengthFt, halfWidthDeg, combatants) {
  return combatants.filter(c => {
    if (!c.position || c.currentHp <= 0) return false;
    const dx = c.position.x - ox;
    const dy = c.position.y - oy;
    const distFt = Math.sqrt(dx * dx + dy * dy) * 5;
    if (distFt > lengthFt) return false;
    if (distFt === 0) return true;
    const tokenAngle = toDeg(Math.atan2(dy, dx));
    let diff = ((tokenAngle - angleDeg + 360) % 360);
    if (diff > 180) diff -= 360;
    return Math.abs(diff) <= halfWidthDeg;
  });
}

// Get tokens along a line from (ox,oy) in direction, up to lengthFt
function tokensInLine(ox, oy, angleDeg, lengthFt, widthFt, combatants) {
  const lineHalfWidth = widthFt / 2 / 5; // in grid squares
  return combatants.filter(c => {
    if (!c.position || c.currentHp <= 0) return false;
    const dx = c.position.x - ox;
    const dy = c.position.y - oy;
    // Project onto line direction
    const rad = toRad(angleDeg);
    const along = dx * Math.cos(rad) + dy * Math.sin(rad);
    const across = Math.abs(-dx * Math.sin(rad) + dy * Math.cos(rad));
    const distFt = along * 5;
    return along >= 0 && distFt <= lengthFt && across <= lineHalfWidth + 0.5;
  });
}

// ─── SVG Overlay Components ───────────────────────────────────────────────────

function ConeOverlay({ casterX, casterY, angleDeg, lengthFt, halfWidthDeg, cellPx, mapW, mapH }) {
  const lengthPx = (lengthFt / 5) * cellPx;
  const cx = (casterX + 0.5) * cellPx;
  const cy = (casterY + 0.5) * cellPx;
  const r = toRad(angleDeg);
  const spread = toRad(halfWidthDeg);
  const x1 = cx + Math.cos(r - spread) * lengthPx;
  const y1 = cy + Math.sin(r - spread) * lengthPx;
  const x2 = cx + Math.cos(r + spread) * lengthPx;
  const y2 = cy + Math.sin(r + spread) * lengthPx;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      width={mapW * cellPx} height={mapH * cellPx}>
      <path
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${lengthPx} ${lengthPx} 0 0 1 ${x2} ${y2} Z`}
        fill="rgba(255,165,0,0.25)"
        stroke="rgba(255,165,0,0.8)"
        strokeWidth={2}
      />
    </svg>
  );
}

function SphereOverlay({ cx, cy, radiusFt, cellPx, mapW, mapH }) {
  const r = (radiusFt / 5) * cellPx;
  const px = (cx + 0.5) * cellPx;
  const py = (cy + 0.5) * cellPx;
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      width={mapW * cellPx} height={mapH * cellPx}>
      <circle cx={px} cy={py} r={r} fill="rgba(255,80,80,0.2)" stroke="rgba(255,80,80,0.8)" strokeWidth={2} strokeDasharray="6 3" />
    </svg>
  );
}

function LineOverlay({ ox, oy, angleDeg, lengthFt, widthFt, cellPx, mapW, mapH }) {
  const lengthPx = (lengthFt / 5) * cellPx;
  const widthPx = Math.max((widthFt / 5) * cellPx, 6);
  const cx = (ox + 0.5) * cellPx;
  const cy = (oy + 0.5) * cellPx;
  const r = toRad(angleDeg);
  const endX = cx + Math.cos(r) * lengthPx;
  const endY = cy + Math.sin(r) * lengthPx;
  // Perpendicular offset for line width
  const px = Math.sin(r) * widthPx / 2;
  const py = -Math.cos(r) * widthPx / 2;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      width={mapW * cellPx} height={mapH * cellPx}>
      <polygon
        points={`${cx - px},${cy - py} ${cx + px},${cy + py} ${endX + px},${endY + py} ${endX - px},${endY - py}`}
        fill="rgba(100,180,255,0.25)"
        stroke="rgba(100,180,255,0.8)"
        strokeWidth={2}
      />
    </svg>
  );
}

// Token highlight rings for hit tokens
function HitHighlight({ combatants, hitIds, cellPx }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 11 }}
      width="100%" height="100%">
      {hitIds.map(id => {
        const c = combatants.find(x => x.id === id);
        if (!c?.position) return null;
        const cx = (c.position.x + 0.5) * cellPx;
        const cy = (c.position.y + 0.5) * cellPx;
        return (
          <circle key={id} cx={cx} cy={cy} r={(cellPx / 2) - 2}
            fill="rgba(255,60,60,0.3)" stroke="rgba(255,60,60,0.9)" strokeWidth={3}
            style={{ animation: 'pulse 1s infinite' }}
          />
        );
      })}
    </svg>
  );
}

// ─── Main SpellTargeting Component ───────────────────────────────────────────

/**
 * SpellTargeting renders a targeting overlay on top of the battle grid.
 *
 * Props:
 *   spell: { name, areaType, areaSize, widthFt, save, damage, damageDice }
 *   caster: combatant object (has position)
 *   combatants: all combatants
 *   mapW, mapH: grid dimensions
 *   cellPx: pixels per cell
 *   onConfirm(hitCombatants, spell): called when player confirms targeting
 *   onCancel(): called to dismiss targeting mode
 */
export default function SpellTargeting({ spell, caster, combatants, mapW = 10, mapH = 8, cellPx = CELL_PX, onConfirm, onCancel }) {
  const [angle, setAngle] = useState(0);       // direction for cone/line
  const [targetCell, setTargetCell] = useState(null); // center for sphere, or picked single target
  const [hitTokens, setHitTokens] = useState([]);
  const containerRef = useRef();

  const areaType = spell?.areaType || 'single';
  const areaSize = spell?.areaSize || 20;
  const lineWidth = spell?.widthFt || 5;
  const halfCone = areaType === 'cone' ? 26.5 : 30; // ~53deg cone = standard 5e cone

  const casterPos = caster?.position;

  // Recompute hit tokens whenever aim changes
  useEffect(() => {
    if (!casterPos) return;

    let hits = [];
    if (areaType === 'cone') {
      hits = tokensInCone(casterPos.x, casterPos.y, angle, areaSize, halfCone, combatants)
        .filter(c => c.id !== caster.id);
    } else if (areaType === 'line') {
      hits = tokensInLine(casterPos.x, casterPos.y, angle, areaSize, lineWidth, combatants)
        .filter(c => c.id !== caster.id);
    } else if (areaType === 'sphere' && targetCell) {
      hits = tokensInSphere(targetCell.x, targetCell.y, areaSize, combatants)
        .filter(c => c.id !== caster.id);
    }
    setHitTokens(hits.map(c => c.id));
  }, [angle, targetCell, areaType, areaSize, casterPos, combatants]);

  // Mouse move → update angle for cone/line
  function handleMouseMove(e) {
    if (!containerRef.current || !casterPos) return;
    if (areaType !== 'cone' && areaType !== 'line') return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = (casterPos.x + 0.5) * cellPx;
    const cy = (casterPos.y + 0.5) * cellPx;
    setAngle(toDeg(Math.atan2(my - cy, mx - cx)));
  }

  // Cell click handler
  function handleCellClick(x, y) {
    if (areaType === 'single') {
      // Find if a token is at this cell
      const token = combatants.find(c => c.position?.x === x && c.position?.y === y && c.id !== caster?.id && c.currentHp > 0);
      if (token) {
        onConfirm([token], spell);
      }
    } else if (areaType === 'sphere') {
      setTargetCell({ x, y });
    } else if (areaType === 'cone' || areaType === 'line') {
      // Clicking confirms current aim
      const hits = combatants.filter(c => hitTokens.includes(c.id));
      onConfirm(hits, spell);
    }
  }

  function handleConfirm() {
    const hits = combatants.filter(c => hitTokens.includes(c.id));
    onConfirm(hits, spell);
  }

  const needsClick = areaType === 'sphere';
  const needsAim = areaType === 'cone' || areaType === 'line';
  const needsTarget = areaType === 'single';

  const instructions = needsTarget ? 'Click a target token' :
    needsAim ? 'Aim with mouse — click to fire' :
    needsClick ? (targetCell ? `${hitTokens.length} targets — click Confirm or reposition` : 'Click to place area center') :
    '';

  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: needsTarget ? 'crosshair' : 'none' }}>
      {/* Grid cells */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${mapW}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${mapH}, ${cellPx}px)`,
          border: '2px solid #3a2a14',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#130d06',
          cursor: needsTarget ? 'crosshair' : 'default',
          position: 'relative',
        }}
      >
        {Array.from({ length: mapW * mapH }).map((_, i) => {
          const x = i % mapW;
          const y = Math.floor(i / mapH);
          const isTarget = targetCell?.x === x && targetCell?.y === y;
          const hasToken = combatants.some(c => c.position?.x === x && c.position?.y === y);
          return (
            <div
              key={i}
              onClick={() => handleCellClick(x, y)}
              style={{
                position: 'relative',
                border: '1px solid #2a1a0a',
                background: isTarget
                  ? 'rgba(255,80,80,0.15)'
                  : (x + y) % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
                cursor: 'crosshair',
              }}
            />
          );
        })}

        {/* Tokens (non-interactive, just visual) */}
        {combatants.map(c => {
          if (!c.position) return null;
          const isHit = hitTokens.includes(c.id);
          const isCaster = c.id === caster?.id;
          return (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                left: c.position.x * cellPx + 3,
                top: c.position.y * cellPx + 3,
                width: cellPx - 6,
                height: cellPx - 6,
                borderRadius: '50%',
                background: isCaster ? '#1a5276' : c.type === 'enemy' ? '#c0392b' : '#1a5276',
                border: isHit ? '3px solid #ff4444' : isCaster ? '3px solid #f1c40f' : '3px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                boxShadow: isHit ? '0 0 12px rgba(255,60,60,0.8)' : 'none',
                transition: 'border 0.15s, box-shadow 0.15s',
                pointerEvents: needsTarget && !isCaster ? 'auto' : 'none',
                cursor: needsTarget && !isCaster ? 'crosshair' : 'default',
                zIndex: 5,
              }}
              onClick={needsTarget && !isCaster ? (e) => { e.stopPropagation(); handleCellClick(c.position.x, c.position.y); } : undefined}
            >
              {c.name.slice(0, 2).toUpperCase()}
            </div>
          );
        })}

        {/* Shape overlays */}
        {casterPos && areaType === 'cone' && (
          <ConeOverlay casterX={casterPos.x} casterY={casterPos.y} angleDeg={angle} lengthFt={areaSize} halfWidthDeg={halfCone} cellPx={cellPx} mapW={mapW} mapH={mapH} />
        )}
        {casterPos && areaType === 'line' && (
          <LineOverlay ox={casterPos.x} oy={casterPos.y} angleDeg={angle} lengthFt={areaSize} widthFt={lineWidth} cellPx={cellPx} mapW={mapW} mapH={mapH} />
        )}
        {targetCell && areaType === 'sphere' && (
          <SphereOverlay cx={targetCell.x} cy={targetCell.y} radiusFt={areaSize} cellPx={cellPx} mapW={mapW} mapH={mapH} />
        )}

        {/* Hit highlights */}
        {hitTokens.length > 0 && (
          <HitHighlight combatants={combatants} hitIds={hitTokens} cellPx={cellPx} />
        )}
      </div>

      {/* Controls overlay */}
      <div style={{
        marginTop: 6, padding: '6px 10px',
        background: '#1a0f06', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 6,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{spell?.name}</span>
          {' — '}{instructions}
          {hitTokens.length > 0 && (
            <span style={{ color: '#ff6b6b', marginLeft: 8, fontWeight: 700 }}>
              {hitTokens.length} target{hitTokens.length !== 1 ? 's' : ''} in area
            </span>
          )}
        </div>
        {(needsAim || (needsClick && targetCell)) && (
          <button
            onClick={handleConfirm}
            style={{ padding: '4px 12px', background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.6)', color: '#e74c3c', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          >
            🔥 Cast!
          </button>
        )}
        <button
          onClick={onCancel}
          style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
