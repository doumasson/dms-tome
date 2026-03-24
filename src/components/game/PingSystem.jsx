import { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import { broadcastEncounterAction } from '../../lib/liveChannel';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * PingSystem — Ctrl+Click on the game map to place a magical beacon marker
 * visible to all players. Beacons fade after a few seconds.
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

  useEffect(() => {
    function handleClick(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;

      const t = worldTransform;
      if (!t || !t.x) {
        const name = myCharacter?.name || 'Player';
        addPing(name, e.clientX, e.clientY, myColor);
        broadcastEncounterAction({
          type: 'ping', playerName: name,
          screenX: e.clientX, screenY: e.clientY,
          color: myColor, useScreen: true,
        });
        return;
      }

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
        <BeaconMarker key={ping.id} {...ping} />
      ))}
      <style>{beaconKeyframes}</style>
    </div>
  );
}

/** Magical beacon marker — vertical energy column with rune circle and particles */
function BeaconMarker({ playerName, worldX, worldY, color }) {
  const x = worldX;
  const y = worldY;

  // Derive a darker and lighter shade for gradients
  const glowColor = color + '66';
  const brightColor = color;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      animation: `beaconAppear ${PING_DURATION}ms ease-out forwards`,
    }}>
      {/* Vertical energy beam */}
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        transform: 'translateX(-50%)',
        width: 6,
        height: 80,
        background: `linear-gradient(to top, ${brightColor}, ${glowColor}, transparent)`,
        borderRadius: 3,
        animation: 'beaconPulse 1.2s ease-in-out infinite',
        boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}`,
      }} />

      {/* Wider glow shaft behind the beam */}
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        transform: 'translateX(-50%)',
        width: 20,
        height: 70,
        background: `linear-gradient(to top, ${color}33, ${color}11, transparent)`,
        borderRadius: 10,
        animation: 'beaconPulse 1.2s ease-in-out infinite 0.3s',
      }} />

      {/* Rune circle — SVG */}
      <svg
        width="56" height="56"
        viewBox="0 0 56 56"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'beaconSpin 3s linear infinite',
          filter: `drop-shadow(0 0 6px ${glowColor})`,
        }}
      >
        {/* Outer ring */}
        <circle cx="28" cy="28" r="26" fill="none" stroke={brightColor} strokeWidth="1.5" opacity="0.7" />
        {/* Inner ring */}
        <circle cx="28" cy="28" r="18" fill="none" stroke={brightColor} strokeWidth="1" opacity="0.5"
          strokeDasharray="4 3" />
        {/* Rune marks — 8 tick marks around the circle */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const x1 = 28 + Math.cos(angle) * 22;
          const y1 = 28 + Math.sin(angle) * 22;
          const x2 = 28 + Math.cos(angle) * 26;
          const y2 = 28 + Math.sin(angle) * 26;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={brightColor} strokeWidth="1.5" opacity="0.6" />
          );
        })}
        {/* Cardinal diamond accents */}
        {[0, 90, 180, 270].map(deg => (
          <polygon key={deg}
            points="28,2 30,6 28,10 26,6"
            fill={brightColor}
            opacity="0.5"
            transform={`rotate(${deg} 28 28)`}
          />
        ))}
      </svg>

      {/* Center gem */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, white, ${brightColor})`,
        boxShadow: `0 0 10px ${brightColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor}`,
        animation: 'beaconGemPulse 0.8s ease-in-out infinite alternate',
      }} />

      {/* Magical spark particles */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * 360;
        const dist = 16 + Math.random() * 12;
        const size = 2 + Math.random() * 2;
        const delay = i * 0.15;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size,
            height: size,
            borderRadius: '50%',
            background: brightColor,
            boxShadow: `0 0 ${size + 3}px ${brightColor}`,
            animation: `beaconSpark 1.5s ease-out ${delay}s infinite`,
            '--spark-x': `${Math.cos(angle * Math.PI / 180) * dist}px`,
            '--spark-y': `${Math.sin(angle * Math.PI / 180) * dist - 30}px`,
            opacity: 0,
          }} />
        );
      })}

      {/* Player name — gold fantasy tag */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 34,
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          fontSize: '0.6rem',
          fontFamily: '"Cinzel", serif',
          color: brightColor,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textShadow: `0 0 6px ${glowColor}, 0 1px 3px rgba(0,0,0,0.9)`,
          background: 'rgba(13,10,4,0.75)',
          padding: '1px 8px',
          borderRadius: 3,
          border: `1px solid ${color}44`,
        }}>
          {playerName}
        </span>
      </div>
    </div>
  );
}

const beaconKeyframes = `
  @keyframes beaconAppear {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
    8% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
    14% { transform: translate(-50%, -50%) scale(1); }
    78% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
  }
  @keyframes beaconPulse {
    0%, 100% { opacity: 0.7; transform: translateX(-50%) scaleY(1); }
    50% { opacity: 1; transform: translateX(-50%) scaleY(1.1); }
  }
  @keyframes beaconSpin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes beaconGemPulse {
    from { transform: translate(-50%, -50%) scale(1); }
    to { transform: translate(-50%, -50%) scale(1.3); }
  }
  @keyframes beaconSpark {
    0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.8; }
    60% { opacity: 0.5; }
    100% { transform: translate(-50%, -50%) translate(var(--spark-x), var(--spark-y)) scale(0); opacity: 0; }
  }
`;
