import { useMemo } from 'react';
import useStore from '../../store/useStore';

/**
 * AreaMapOverview — Node graph showing connected areas in the campaign world.
 * Current area highlighted, visited areas marked, connections shown as lines.
 * Opens as a modal overlay.
 */

export default function AreaMapOverview({ onClose }) {
  const areas = useStore(s => s.areas) || {};
  const areaBriefs = useStore(s => s.areaBriefs) || {};
  const currentAreaId = useStore(s => s.currentAreaId);

  // Merge areas and briefs to get all known area info
  const allAreas = useMemo(() => {
    const merged = {};
    for (const [id, area] of Object.entries(areas)) {
      merged[id] = {
        id,
        name: area.name || id,
        theme: area.theme || 'unknown',
        visited: true,
        connections: area.exits?.map(e => ({
          targetArea: e.targetAreaId || e.targetArea,
          label: e.label || e.name || 'passage',
        })).filter(c => c.targetArea) || [],
      };
    }
    for (const [id, brief] of Object.entries(areaBriefs)) {
      if (!merged[id]) {
        merged[id] = {
          id,
          name: brief.name || id,
          theme: brief.theme || 'unknown',
          visited: false,
          connections: (brief.connections || []).map(c => ({
            targetArea: c.targetArea || c.targetAreaId,
            label: c.label || 'passage',
          })).filter(c => c.targetArea),
        };
      }
    }
    return merged;
  }, [areas, areaBriefs]);

  // Layout nodes in a simple grid/force layout
  const { nodes, edges } = useMemo(() => {
    const areaIds = Object.keys(allAreas);
    if (areaIds.length === 0) return { nodes: [], edges: [] };

    // Simple BFS layout from current area
    const positions = {};
    const visited = new Set();
    const queue = [{ id: currentAreaId || areaIds[0], x: 200, y: 150, depth: 0 }];
    const SPACING_X = 140;
    const SPACING_Y = 100;
    let childOffsets = {};

    while (queue.length > 0) {
      const { id, x, y, depth } = queue.shift();
      if (visited.has(id) || !allAreas[id]) continue;
      visited.add(id);
      positions[id] = { x, y };

      const area = allAreas[id];
      const unvisitedConns = area.connections.filter(c => !visited.has(c.targetArea));
      const count = unvisitedConns.length;
      const startOffset = -(count - 1) / 2;

      unvisitedConns.forEach((conn, i) => {
        if (!visited.has(conn.targetArea)) {
          // Spread children around parent
          const angle = (startOffset + i) * 0.8;
          const nx = x + SPACING_X * Math.cos(angle + (depth % 2 ? 0.3 : -0.3));
          const ny = y + SPACING_Y;
          queue.push({ id: conn.targetArea, x: nx, y: ny, depth: depth + 1 });
        }
      });
    }

    // Place any unvisited disconnected areas
    let extraX = 50;
    for (const id of areaIds) {
      if (!positions[id]) {
        positions[id] = { x: extraX, y: 320 };
        extraX += 120;
      }
    }

    const nodes = areaIds.map(id => ({
      ...allAreas[id],
      ...positions[id],
    }));

    // Build edges
    const edgeSet = new Set();
    const edges = [];
    for (const area of Object.values(allAreas)) {
      for (const conn of area.connections) {
        const key = [area.id, conn.targetArea].sort().join('--');
        if (!edgeSet.has(key) && positions[area.id] && positions[conn.targetArea]) {
          edgeSet.add(key);
          edges.push({
            from: positions[area.id],
            to: positions[conn.targetArea],
            label: conn.label,
          });
        }
      }
    }

    return { nodes, edges };
  }, [allAreas, currentAreaId]);

  const THEME_COLORS = {
    village: '#2ecc71', town: '#2ecc71', tavern: '#f39c12',
    forest: '#27ae60', dungeon: '#e74c3c', cave: '#95a5a6',
    ruins: '#9b59b6', mountain: '#7f8c8d', desert: '#e67e22',
    swamp: '#1abc9c', graveyard: '#666', marketplace: '#f1c40f',
    coastal: '#3498db', unknown: '#d4af37',
  };

  // Calculate canvas bounds
  const minX = Math.min(...nodes.map(n => n.x)) - 60;
  const maxX = Math.max(...nodes.map(n => n.x)) + 60;
  const minY = Math.min(...nodes.map(n => n.y)) - 40;
  const maxY = Math.max(...nodes.map(n => n.y)) + 40;
  const svgW = Math.max(400, maxX - minX + 120);
  const svgH = Math.max(300, maxY - minY + 80);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <span style={S.title}>World Map</span>
          <span style={S.subtitle}>{Object.keys(areas).length} areas explored</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {nodes.length === 0 ? (
          <div style={S.empty}>No areas discovered yet. Start exploring!</div>
        ) : (
          <div style={S.mapContainer}>
            <svg width={svgW} height={svgH} viewBox={`${minX - 30} ${minY - 20} ${svgW} ${svgH}`}>
              {/* Edges */}
              {edges.map((edge, i) => (
                <g key={i}>
                  <line
                    x1={edge.from.x} y1={edge.from.y}
                    x2={edge.to.x} y2={edge.to.y}
                    stroke="rgba(212,175,55,0.25)" strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={(edge.from.x + edge.to.x) / 2}
                    y={(edge.from.y + edge.to.y) / 2 - 6}
                    textAnchor="middle"
                    fill="rgba(212,175,55,0.35)"
                    fontSize={8}
                    fontFamily="'Cinzel', serif"
                  >
                    {edge.label}
                  </text>
                </g>
              ))}

              {/* Nodes */}
              {nodes.map(node => {
                const isCurrent = node.id === currentAreaId;
                const color = THEME_COLORS[node.theme] || THEME_COLORS.unknown;
                return (
                  <g key={node.id}>
                    {/* Glow for current area */}
                    {isCurrent && (
                      <circle cx={node.x} cy={node.y} r={28}
                        fill="none" stroke={color} strokeWidth={2}
                        opacity={0.4}
                      >
                        <animate attributeName="r" values="26;30;26" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Node circle */}
                    <circle cx={node.x} cy={node.y} r={20}
                      fill={node.visited ? `${color}22` : '#11111188'}
                      stroke={isCurrent ? color : node.visited ? `${color}88` : '#44444488'}
                      strokeWidth={isCurrent ? 2.5 : 1.5}
                    />

                    {/* Theme icon */}
                    <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={14}>
                      {getThemeIcon(node.theme)}
                    </text>

                    {/* Area name */}
                    <text x={node.x} y={node.y + 34} textAnchor="middle"
                      fill={isCurrent ? color : node.visited ? '#d4c090' : '#666'}
                      fontSize={9} fontWeight={isCurrent ? 700 : 400}
                      fontFamily="'Cinzel', serif"
                    >
                      {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
                    </text>

                    {/* Current indicator */}
                    {isCurrent && (
                      <text x={node.x} y={node.y - 26} textAnchor="middle"
                        fill={color} fontSize={8} fontWeight={700}
                        fontFamily="'Cinzel', serif"
                      >
                        ▼ YOU ARE HERE
                      </text>
                    )}

                    {/* Unvisited marker */}
                    {!node.visited && (
                      <text x={node.x} y={node.y + 44} textAnchor="middle"
                        fill="#666" fontSize={7} fontStyle="italic"
                      >
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
          <span style={S.legendItem}><span style={{ color: '#2ecc71' }}>●</span> Visited</span>
          <span style={S.legendItem}><span style={{ color: '#666' }}>○</span> Unexplored</span>
          <span style={S.legendItem}><span style={{ color: '#d4af37' }}>◆</span> Current</span>
        </div>
      </div>
    </div>
  );
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

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  panel: {
    background: 'linear-gradient(180deg, #1a1208 0%, #120e06 100%)',
    border: '2px solid rgba(212,175,55,0.5)',
    borderRadius: 10, padding: '18px 20px',
    maxWidth: 600, width: '95vw', maxHeight: '85vh',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 12, paddingBottom: 10,
    borderBottom: '1px solid rgba(212,175,55,0.3)',
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '0.6rem', color: 'rgba(212,175,55,0.4)', flex: 1,
  },
  closeBtn: { background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 16 },
  mapContainer: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 6, border: '1px solid rgba(212,175,55,0.1)',
    minHeight: 250,
  },
  empty: {
    textAlign: 'center', color: '#6a5a40', fontSize: '0.8rem',
    padding: '40px 0', fontStyle: 'italic',
  },
  legend: {
    display: 'flex', gap: 16, justifyContent: 'center',
    marginTop: 10, fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4 },
};
