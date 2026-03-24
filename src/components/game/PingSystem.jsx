import { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import { broadcastEncounterAction } from '../../lib/liveChannel';

/**
 * PingSystem — Ctrl+Click on the game map to place a waypoint marker
 * visible to all players. Pings fade out after a few seconds.
 * Broadcast via encounter-action channel.
 */

const PING_DURATION = 4000;
const PING_COLORS = ['#4dd0e1', '#ffd700', '#e74c3c', '#2ecc71', '#9b59b6', '#ff6b6b'];

// Singleton for receiving pings from other players
let _addPingFn = null;

export function receivePing(playerName, worldX, worldY, color) {
  _addPingFn?.(playerName, worldX, worldY, color);
}

export default function PingSystem({ worldTransform }) {
  const [pings, setPings] = useState([]);
  const idRef = useRef(0);
  const myCharacter = useStore(s => s.myCharacter);
  const user = useStore(s => s.user);

  // Stable color per player based on user id hash
  const myColor = PING_COLORS[(user?.id || '').charCodeAt(0) % PING_COLORS.length] || PING_COLORS[0];

  const addPing = useCallback((playerName, worldX, worldY, color) => {
    const id = ++idRef.current;
    setPings(prev => [...prev, { id, playerName, worldX, worldY, color, created: Date.now() }]);
    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== id));
    }, PING_DURATION);
  }, []);

  useEffect(() => {
    _addPingFn = addPing;
    return () => { _addPingFn = null; };
  }, [addPing]);

  // Handle Ctrl+Click on game area to place a ping
  useEffect(() => {
    function handleClick(e) {
      if (!e.ctrlKey && !e.metaKey) return;

      // Only trigger on game canvas/map area
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;

      // Convert screen position to world position
      const t = worldTransform;
      if (!t || !t.x) {
        // Fallback: just use screen coordinates
        const name = myCharacter?.name || 'Player';
        addPing(name, e.clientX, e.clientY, myColor);
        broadcastEncounterAction({
          type: 'ping', playerName: name,
          screenX: e.clientX, screenY: e.clientY,
          color: myColor, useScreen: true,
        });
        return;
      }

      // World coordinates from screen via inverse transform
      const worldX = (e.clientX - t.x) / t.scale;
      const worldY = (e.clientY - t.y) / t.scale;
      const name = myCharacter?.name || 'Player';

      addPing(name, e.clientX, e.clientY, myColor);
      broadcastEncounterAction({
        type: 'ping', playerName: name,
        screenX: e.clientX, screenY: e.clientY,
        worldX, worldY, color: myColor,
      });
    }

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [worldTransform, myCharacter, myColor, addPing]);

  if (pings.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1100 }}>
      {pings.map(ping => (
        <PingMarker key={ping.id} {...ping} />
      ))}
    </div>
  );
}

function PingMarker({ playerName, worldX, worldY, color, created }) {
  // Use screen coordinates directly (worldX/worldY are screen pos for local pings)
  const x = worldX;
  const y = worldY;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      animation: `pingAppear ${PING_DURATION}ms ease-out forwards`,
    }}>
      {/* Expanding ring */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 40, height: 40,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        animation: 'pingRing 1s ease-out infinite',
        opacity: 0.6,
      }} />

      {/* Center dot */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 10, height: 10,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}88, 0 0 16px ${color}44`,
      }} />

      {/* Arrow pointing down */}
      <div style={{
        position: 'absolute',
        left: '50%', top: -18,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `10px solid ${color}`,
        animation: 'pingBounce 0.6s ease-in-out infinite alternate',
      }} />

      {/* Player name */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 22,
        transform: 'translateX(-50%)',
        fontSize: '0.55rem',
        color,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        fontFamily: "'Cinzel', Georgia, serif",
      }}>
        {playerName}
      </div>

      <style>{`
        @keyframes pingAppear {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          15% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        @keyframes pingRing {
          0% { width: 10px; height: 10px; opacity: 0.8; }
          100% { width: 50px; height: 50px; opacity: 0; }
        }
        @keyframes pingBounce {
          from { transform: translateX(-50%) translateY(0); }
          to { transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
