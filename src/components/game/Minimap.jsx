import { useRef, useEffect, useMemo, useState } from 'react';
import useStore from '../../store/useStore';

/**
 * Minimap — Small corner map showing player position, NPCs, exits, and terrain.
 * Renders a low-res version of the current area using Canvas2D.
 * Collapsible with click toggle.
 */

const MAP_SIZE = 140; // pixels for the minimap display
const BORDER = 2;

// Colors for different tile/entity types
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
  const fogBitfields = useStore(s => s.fogBitfields);

  const area = areas?.[currentAreaId] || zone;
  const width = area?.width || 40;
  const height = area?.height || 30;
  const cellBlocked = area?.cellBlocked || area?.wallEdges;

  // Scale factor: map pixels per tile
  const scale = useMemo(() => {
    const maxDim = Math.max(width, height);
    return MAP_SIZE / maxDim;
  }, [width, height]);

  const canvasW = Math.ceil(width * scale);
  const canvasH = Math.ceil(height * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || collapsed || !area) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw terrain base
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw blocked cells / walls
    if (cellBlocked) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (cellBlocked[idx]) {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(
              Math.floor(x * scale),
              Math.floor(y * scale),
              Math.ceil(scale) + 1,
              Math.ceil(scale) + 1
            );
          }
        }
      }
    }

    // Draw exits
    const exits = area.exits || [];
    for (const exit of exits) {
      if (!exit.position) continue;
      ctx.fillStyle = COLORS.exit;
      const ex = exit.position.x ?? exit.x;
      const ey = exit.position.y ?? exit.y;
      if (ex != null && ey != null) {
        ctx.fillRect(
          Math.floor(ex * scale) - 1,
          Math.floor(ey * scale) - 1,
          Math.ceil(scale * 2) + 2,
          Math.ceil(scale * 2) + 2
        );
      }
    }

    // Draw NPCs
    const npcs = area.npcs || [];
    for (const npc of npcs) {
      const nx = npc.position?.x ?? npc.x;
      const ny = npc.position?.y ?? npc.y;
      if (nx == null || ny == null) continue;
      ctx.fillStyle = COLORS.npc;
      ctx.beginPath();
      ctx.arc(nx * scale, ny * scale, Math.max(2, scale * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw enemies in combat
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

    // Draw player position
    if (playerPos) {
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(playerPos.x * scale, playerPos.y * scale, Math.max(3, scale * 1.2), 0, Math.PI * 2);
      ctx.fill();

      // White outline for visibility
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
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 90,
        cursor: 'pointer',
      }}
      onClick={() => setCollapsed(c => !c)}
      title={collapsed ? 'Show minimap' : 'Hide minimap'}
    >
      {collapsed ? (
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(212,175,55,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', color: '#d4af37',
        }}>
          🗺
        </div>
      ) : (
        <div style={{
          background: 'rgba(10, 8, 6, 0.85)',
          border: `${BORDER}px solid rgba(212,175,55,0.5)`,
          borderRadius: 6,
          padding: 3,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            fontSize: '0.5rem', color: 'rgba(212,175,55,0.6)',
            textAlign: 'center', marginBottom: 2,
            fontFamily: "'Cinzel', Georgia, serif",
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {area.name || currentAreaId || 'Map'}
          </div>
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            style={{
              width: canvasW,
              height: canvasH,
              imageRendering: 'pixelated',
              borderRadius: 3,
            }}
          />
          {/* Legend */}
          <div style={{
            display: 'flex', gap: 6, justifyContent: 'center',
            marginTop: 3, fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)',
          }}>
            <span><span style={{ color: COLORS.player }}>●</span> You</span>
            <span><span style={{ color: COLORS.npc }}>●</span> NPC</span>
            <span><span style={{ color: COLORS.exit }}>■</span> Exit</span>
          </div>
        </div>
      )}
    </div>
  );
}
