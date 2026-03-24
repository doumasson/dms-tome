import { useRef, useEffect, useMemo, useState } from 'react';
import useStore from '../../store/useStore';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * Minimap — Ornate corner map with parchment background, gold frame, compass rose.
 * Shows player position, NPCs, exits, and terrain.
 * Collapsible with click toggle.
 */

const MAP_SIZE = 140;

const COLORS = {
  floor: '#2a2218',
  wall: '#4a3a28',
  blocked: '#3a2a1a',
  player: '#4dd0e1',
  npc: '#ffd700',
  enemy: '#e74c3c',
  exit: '#2ecc71',
  fog: '#0a0806',
  party: '#3498db',
};

export default function Minimap({ playerPos, zone, inCombat }) {
  const canvasRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const areas = useStore(s => s.areas);
  const currentAreaId = useStore(s => s.currentAreaId);
  const encounter = useStore(s => s.encounter);

  const area = areas?.[currentAreaId] || zone;
  const width = area?.width || 40;
  const height = area?.height || 30;
  const cellBlocked = area?.cellBlocked || area?.wallEdges;

  const scale = useMemo(() => MAP_SIZE / Math.max(width, height), [width, height]);
  const canvasW = Math.ceil(width * scale);
  const canvasH = Math.ceil(height * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || collapsed || !area) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Parchment-tinted base
    ctx.fillStyle = '#1e1a10';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Blocked cells / walls
    if (cellBlocked) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (cellBlocked[y * width + x]) {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
          }
        }
      }
    }

    // Exits
    for (const exit of (area.exits || [])) {
      if (!exit.position) continue;
      const ex = exit.position.x ?? exit.x;
      const ey = exit.position.y ?? exit.y;
      if (ex != null && ey != null) {
        ctx.fillStyle = COLORS.exit;
        ctx.fillRect(Math.floor(ex * scale) - 1, Math.floor(ey * scale) - 1, Math.ceil(scale * 2) + 2, Math.ceil(scale * 2) + 2);
      }
    }

    // NPCs
    for (const npc of (area.npcs || [])) {
      const nx = npc.position?.x ?? npc.x;
      const ny = npc.position?.y ?? npc.y;
      if (nx == null || ny == null) continue;
      ctx.fillStyle = COLORS.npc;
      ctx.beginPath();
      ctx.arc(nx * scale, ny * scale, Math.max(2, scale * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies in combat
    if (inCombat && encounter?.combatants) {
      for (const c of encounter.combatants) {
        if (c.type !== 'enemy' || !c.position) continue;
        if ((c.currentHp ?? c.hp) <= 0) continue;
        ctx.fillStyle = COLORS.enemy;
        ctx.beginPath();
        ctx.arc(c.position.x * scale, c.position.y * scale, Math.max(2, scale * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player
    if (playerPos) {
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(playerPos.x * scale, playerPos.y * scale, Math.max(3, scale * 1.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(playerPos.x * scale, playerPos.y * scale, Math.max(3, scale * 1.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [playerPos, area, cellBlocked, width, height, scale, canvasW, canvasH, collapsed, inCombat, encounter?.combatants]);

  if (!area) return null;

  return (
    <div
      className="hud-minimap-wrapper"
      style={S.wrapper}
      onClick={() => setCollapsed(c => !c)}
      title={collapsed ? 'Show minimap' : 'Hide minimap'}
    >
      {collapsed ? (
        <div style={S.collapsedBtn}>🗺</div>
      ) : (
        <div style={S.frame}>
          {/* Ornate double border via box-shadow + border */}

          {/* Corner filigree accents */}
          <Filigree pos="top-left" />
          <Filigree pos="top-right" />
          <Filigree pos="bottom-left" />
          <Filigree pos="bottom-right" />

          {/* Header — area name */}
          <div style={S.header}>
            {area.name || currentAreaId || 'Map'}
          </div>

          {/* Map canvas */}
          <div style={S.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              style={{ width: canvasW, height: canvasH, imageRendering: 'pixelated', borderRadius: 2 }}
            />

            {/* Compass rose overlay — top-right of canvas */}
            <svg width="24" height="24" viewBox="0 0 24 24" style={S.compass}>
              {/* N-S axis */}
              <polygon points="12,1 13.5,9 12,7 10.5,9" fill="#d4af37" opacity="0.7" />
              <polygon points="12,23 13.5,15 12,17 10.5,15" fill="rgba(180,140,60,0.35)" />
              {/* E-W axis */}
              <polygon points="23,12 15,13.5 17,12 15,10.5" fill="rgba(180,140,60,0.35)" />
              <polygon points="1,12 9,13.5 7,12 9,10.5" fill="rgba(180,140,60,0.35)" />
              {/* Center circle */}
              <circle cx="12" cy="12" r="2" fill="none" stroke="#d4af37" strokeWidth="0.6" opacity="0.5" />
              <circle cx="12" cy="12" r="0.8" fill="#d4af37" opacity="0.5" />
              {/* N label */}
              <text x="12" y="6" textAnchor="middle" fill="#d4af37" fontSize="4" fontFamily="Cinzel, serif" fontWeight="700" opacity="0.7">N</text>
            </svg>
          </div>

          {/* Legend */}
          <div style={S.legend}>
            <span style={S.legendItem}><span style={{ color: COLORS.player }}>●</span> You</span>
            <span style={S.legendItem}><span style={{ color: COLORS.npc }}>●</span> NPC</span>
            <span style={S.legendItem}><span style={{ color: COLORS.exit }}>■</span> Exit</span>
            {inCombat && <span style={S.legendItem}><span style={{ color: COLORS.enemy }}>●</span> Foe</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Filigree({ pos }) {
  const isTop = pos.includes('top');
  const isLeft = pos.includes('left');
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{
      position: 'absolute',
      [isTop ? 'top' : 'bottom']: 2,
      [isLeft ? 'left' : 'right']: 2,
      pointerEvents: 'none',
      transform: `scale(${isLeft ? 1 : -1}, ${isTop ? 1 : -1})`,
    }}>
      <path d="M0,0 Q8,0.5 14,14" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.35" />
      <circle cx="1" cy="1" r="1.2" fill="#d4af37" opacity="0.4" />
    </svg>
  );
}

const S = {
  wrapper: {
    position: 'absolute',
    top: 12, right: 12, zIndex: 90,
    cursor: 'pointer',
  },
  collapsedBtn: {
    width: 44, height: 44, borderRadius: 8,
    background: 'linear-gradient(145deg, rgba(26,16,6,0.92), rgba(13,10,4,0.95))',
    border: '2px solid rgba(212,175,55,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.1)',
  },
  frame: {
    position: 'relative',
    background: `
      radial-gradient(ellipse at 40% 30%, rgba(50,38,18,0.25) 0%, transparent 60%),
      linear-gradient(170deg, rgba(26,20,10,0.95) 0%, rgba(14,11,6,0.97) 100%)
    `,
    border: '2px solid rgba(212,175,55,0.45)',
    borderRadius: 8,
    padding: '8px 8px 6px',
    boxShadow: `
      0 6px 24px rgba(0,0,0,0.7),
      0 0 16px rgba(212,175,55,0.06),
      inset 0 0 20px rgba(0,0,0,0.3),
      inset 0 1px 0 rgba(212,175,55,0.12),
      0 0 0 4px rgba(0,0,0,0.3),
      0 0 0 5px rgba(212,175,55,0.12)
    `,
  },
  header: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.5rem',
    color: 'rgba(212,175,55,0.6)',
    textAlign: 'center',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 4,
    textShadow: '0 0 4px rgba(212,175,55,0.15)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: MAP_SIZE,
  },
  canvasWrap: {
    position: 'relative',
    borderRadius: 3,
    border: '1px solid rgba(212,175,55,0.15)',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
  },
  compass: {
    position: 'absolute',
    top: 3, right: 3,
    opacity: 0.8,
    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))',
  },
  legend: {
    display: 'flex', gap: 6, justifyContent: 'center',
    marginTop: 4,
    fontSize: '0.42rem',
    color: 'rgba(220,200,170,0.4)',
    fontFamily: '"Crimson Text", Georgia, serif',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 2,
  },
};
