import { useMemo } from 'react';
import useStore from '../../store/useStore';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * AreaMapOverview — Parchment-style world map with wax seal node markers.
 * Node graph showing connected areas, current area highlighted.
 */

export default function AreaMapOverview({ onClose }) {
  const areas = useStore(s => s.areas) || {};
  const areaBriefs = useStore(s => s.areaBriefs) || {};
  const currentAreaId = useStore(s => s.currentAreaId);

  const allAreas = useMemo(() => {
    const merged = {};
    for (const [id, area] of Object.entries(areas)) {
      merged[id] = {
        id, name: area.name || id, theme: area.theme || 'unknown', visited: true,
        connections: area.exits?.map(e => ({
          targetArea: e.targetAreaId || e.targetArea,
          label: e.label || e.name || 'passage',
        })).filter(c => c.targetArea) || [],
      };
    }
    for (const [id, brief] of Object.entries(areaBriefs)) {
      if (!merged[id]) {
        merged[id] = {
          id, name: brief.name || id, theme: brief.theme || 'unknown', visited: false,
          connections: (brief.connections || []).map(c => ({
            targetArea: c.targetArea || c.targetAreaId, label: c.label || 'passage',
          })).filter(c => c.targetArea),
        };
      }
    }
    return merged;
  }, [areas, areaBriefs]);

  const { nodes, edges } = useMemo(() => {
    const areaIds = Object.keys(allAreas);
    if (areaIds.length === 0) return { nodes: [], edges: [] };
    const positions = {};
    const visited = new Set();
    const queue = [{ id: currentAreaId || areaIds[0], x: 200, y: 150, depth: 0 }];
    while (queue.length > 0) {
      const { id, x, y, depth } = queue.shift();
      if (visited.has(id) || !allAreas[id]) continue;
      visited.add(id);
      positions[id] = { x, y };
      const area = allAreas[id];
      const unvisited = area.connections.filter(c => !visited.has(c.targetArea));
      const startOffset = -(unvisited.length - 1) / 2;
      unvisited.forEach((conn, i) => {
        if (!visited.has(conn.targetArea)) {
          const angle = (startOffset + i) * 0.8;
          queue.push({ id: conn.targetArea, x: x + 140 * Math.cos(angle + (depth % 2 ? 0.3 : -0.3)), y: y + 100, depth: depth + 1 });
        }
      });
    }
    let extraX = 50;
    for (const id of areaIds) {
      if (!positions[id]) { positions[id] = { x: extraX, y: 320 }; extraX += 120; }
    }
    const nodeList = areaIds.map(id => ({ ...allAreas[id], ...positions[id] }));
    const edgeSet = new Set();
    const edgeList = [];
    for (const area of Object.values(allAreas)) {
      for (const conn of area.connections) {
        const key = [area.id, conn.targetArea].sort().join('--');
        if (!edgeSet.has(key) && positions[area.id] && positions[conn.targetArea]) {
          edgeSet.add(key);
          edgeList.push({ from: positions[area.id], to: positions[conn.targetArea], label: conn.label });
        }
      }
    }
    return { nodes: nodeList, edges: edgeList };
  }, [allAreas, currentAreaId]);

  const THEME_COLORS = {
    village: '#2ecc71', town: '#2ecc71', tavern: '#f39c12',
    forest: '#27ae60', dungeon: '#e74c3c', cave: '#95a5a6',
    ruins: '#9b59b6', mountain: '#7f8c8d', desert: '#e67e22',
    swamp: '#1abc9c', graveyard: '#666', marketplace: '#f1c40f',
    coastal: '#3498db', unknown: '#d4af37',
  };

  const minX = nodes.length ? Math.min(...nodes.map(n => n.x)) - 60 : 0;
  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x)) + 60 : 400;
  const minY = nodes.length ? Math.min(...nodes.map(n => n.y)) - 40 : 0;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y)) + 40 : 300;
  const svgW = Math.max(400, maxX - minX + 120);
  const svgH = Math.max(300, maxY - minY + 80);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        {/* Corner filigree */}
        <Filigree pos="top-left" />
        <Filigree pos="top-right" />
        <Filigree pos="bottom-left" />
        <Filigree pos="bottom-right" />

        {/* Header */}
        <div style={S.header}>
          <div style={S.titleRow}>
            <span style={S.titleIcon}>🗺</span>
            <div>
              <div style={S.title}>World Map</div>
              <div style={S.subtitle}>{Object.keys(areas).length} areas explored</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.color = '#d4af37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6a5a40'; e.currentTarget.style.borderColor = 'rgba(100,80,50,0.3)'; }}
          >✕</button>
        </div>

        {/* Divider */}
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <div style={S.dividerGem}>✦</div>
          <div style={S.dividerLine} />
        </div>

        {nodes.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}>🧭</div>
            No areas discovered yet. Start exploring!
          </div>
        ) : (
          <div style={S.mapContainer}>
            <svg width={svgW} height={svgH} viewBox={`${minX - 30} ${minY - 20} ${svgW} ${svgH}`}>
              {/* Parchment background texture */}
              <defs>
                <radialGradient id="parchGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="rgba(60,45,18,0.3)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <rect x={minX - 30} y={minY - 20} width={svgW} height={svgH} fill="url(#parchGlow)" />

              {/* Edges — trail lines */}
              {edges.map((edge, i) => (
                <g key={i}>
                  <line x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
                    stroke="rgba(212,175,55,0.2)" strokeWidth={1.5} strokeDasharray="8 5" />
                  {/* Small dots along path */}
                  <circle cx={(edge.from.x + edge.to.x) / 2} cy={(edge.from.y + edge.to.y) / 2}
                    r="1.5" fill="rgba(212,175,55,0.3)" />
                  <text x={(edge.from.x + edge.to.x) / 2} y={(edge.from.y + edge.to.y) / 2 - 7}
                    textAnchor="middle" fill="rgba(212,175,55,0.3)" fontSize={7}
                    fontFamily="'Crimson Text', Georgia, serif" fontStyle="italic">
                    {edge.label}
                  </text>
                </g>
              ))}

              {/* Nodes — wax seal style */}
              {nodes.map(node => {
                const isCurrent = node.id === currentAreaId;
                const color = THEME_COLORS[node.theme] || THEME_COLORS.unknown;
                return (
                  <g key={node.id}>
                    {/* Current area pulse ring */}
                    {isCurrent && (
                      <circle cx={node.x} cy={node.y} r={28} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3}>
                        <animate attributeName="r" values="26;32;26" dur="2.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Wax seal — scalloped outer edge */}
                    <path d={sealPath(node.x, node.y, 22, 18, 10)}
                      fill={node.visited ? `${color}18` : 'rgba(30,24,12,0.6)'}
                      stroke={isCurrent ? color : node.visited ? `${color}55` : 'rgba(100,80,50,0.25)'}
                      strokeWidth={isCurrent ? 2 : 1} />

                    {/* Inner circle */}
                    <circle cx={node.x} cy={node.y} r={15}
                      fill="rgba(16,12,6,0.85)"
                      stroke={isCurrent ? color : node.visited ? `${color}44` : 'rgba(80,65,40,0.2)'}
                      strokeWidth={0.8} />

                    {/* Theme icon */}
                    <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize={13}>
                      {getThemeIcon(node.theme)}
                    </text>

                    {/* Area name — parchment label */}
                    <text x={node.x} y={node.y + 36} textAnchor="middle"
                      fill={isCurrent ? color : node.visited ? '#d4c090' : 'rgba(120,100,70,0.5)'}
                      fontSize={8.5} fontWeight={isCurrent ? 700 : 500}
                      fontFamily="'Cinzel', serif"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {node.name.length > 18 ? node.name.slice(0, 17) + '…' : node.name}
                    </text>

                    {/* Current indicator */}
                    {isCurrent && (
                      <g>
                        <text x={node.x} y={node.y - 28} textAnchor="middle"
                          fill={color} fontSize={7} fontWeight={700}
                          fontFamily="'Cinzel', serif" letterSpacing="1.5">
                          ▼ HERE
                        </text>
                      </g>
                    )}

                    {/* Unexplored fog */}
                    {!node.visited && (
                      <text x={node.x} y={node.y + 46} textAnchor="middle"
                        fill="rgba(120,100,70,0.35)" fontSize={6.5}
                        fontFamily="'Crimson Text', serif" fontStyle="italic">
                        unexplored
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Legend */}
        <div style={S.legend}>
          <span style={S.legendItem}><span style={{ color: '#2ecc71' }}>⬤</span> Visited</span>
          <span style={S.legendItem}><span style={{ color: '#666', fontSize: '0.6rem' }}>○</span> Unexplored</span>
          <span style={S.legendItem}><span style={{ color: '#d4af37' }}>◆</span> Current</span>
        </div>
      </div>

      <style>{`
        @keyframes mapUnfold {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function sealPath(cx, cy, outerR, innerR, scallops) {
  const points = [];
  for (let i = 0; i < scallops; i++) {
    const outerAngle = (i / scallops) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = ((i + 0.5) / scallops) * Math.PI * 2 - Math.PI / 2;
    points.push(`${cx + Math.cos(outerAngle) * outerR},${cy + Math.sin(outerAngle) * outerR}`);
    points.push(`${cx + Math.cos(innerAngle) * innerR},${cy + Math.sin(innerAngle) * innerR}`);
  }
  return `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')} Z`;
}

function getThemeIcon(theme) {
  const icons = {
    village: '🏘', town: '🏘', tavern: '🍺', forest: '🌲',
    dungeon: '⚔', cave: '🕳', ruins: '🏛', mountain: '⛰',
    desert: '🏜', swamp: '🌿', graveyard: '💀', marketplace: '🛒',
    coastal: '🌊', throne_room: '👑',
  };
  return icons[theme] || '📍';
}

function Filigree({ pos }) {
  const isTop = pos.includes('top');
  const isLeft = pos.includes('left');
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{
      position: 'absolute',
      [isTop ? 'top' : 'bottom']: 6,
      [isLeft ? 'left' : 'right']: 6,
      pointerEvents: 'none',
      transform: `scale(${isLeft ? 1 : -1}, ${isTop ? 1 : -1})`,
    }}>
      <path d="M0,0 Q11,1 20,20" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M0,0 Q5,0.5 9,9" stroke="#d4af37" strokeWidth="0.7" fill="none" opacity="0.2" />
      <circle cx="1.5" cy="1.5" r="1.5" fill="#d4af37" opacity="0.35" />
    </svg>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  panel: {
    position: 'relative',
    background: `
      radial-gradient(ellipse at 40% 30%, rgba(55,42,18,0.25) 0%, transparent 55%),
      radial-gradient(ellipse at 70% 70%, rgba(45,34,14,0.2) 0%, transparent 55%),
      linear-gradient(170deg, #241c0e 0%, #1a1208 40%, #14100a 100%)
    `,
    border: '2px solid rgba(212,175,55,0.35)',
    borderRadius: 10, padding: '20px 22px 14px',
    maxWidth: 640, width: '96vw', maxHeight: '86vh',
    boxShadow: `
      0 12px 48px rgba(0,0,0,0.9),
      0 0 24px rgba(212,175,55,0.04),
      inset 0 0 40px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(212,175,55,0.1),
      0 0 0 5px rgba(0,0,0,0.3),
      0 0 0 6px rgba(212,175,55,0.08)
    `,
    display: 'flex', flexDirection: 'column',
    animation: 'mapUnfold 0.25s ease-out',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10 },
  titleIcon: { fontSize: '1.3rem', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.3))' },
  title: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '1rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    textShadow: '0 0 8px rgba(212,175,55,0.2)',
  },
  subtitle: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.55rem', color: 'rgba(180,150,100,0.4)', fontStyle: 'italic', marginTop: 1,
  },
  closeBtn: {
    background: 'none', border: '1px solid rgba(100,80,50,0.3)',
    borderRadius: 6, color: '#6a5a40', cursor: 'pointer',
    fontSize: 14, width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' },
  dividerGem: { color: '#d4af37', fontSize: '0.5rem', opacity: 0.4 },
  mapContainer: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
    background: 'linear-gradient(170deg, rgba(26,20,10,0.5), rgba(14,11,6,0.6))',
    borderRadius: 6,
    border: '1px solid rgba(212,175,55,0.12)',
    minHeight: 250,
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
  },
  empty: {
    textAlign: 'center', padding: '40px 0',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.78rem', color: '#6a5a40', fontStyle: 'italic',
  },
  legend: {
    display: 'flex', gap: 16, justifyContent: 'center',
    marginTop: 10,
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.52rem', color: 'rgba(220,200,170,0.4)',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4 },
};
