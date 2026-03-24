import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * LootAnimation — Shows items flying from a source position to a target
 * (typically the inventory icon) with sparkle trail effects.
 *
 * Usage: Call triggerLootAnimation(itemName, startPos) to show animation.
 * The component renders absolutely positioned over the game.
 */

// Singleton animation queue
let _triggerFn = null;

export function triggerLootAnimation(itemName, startX, startY) {
  if (_triggerFn) _triggerFn(itemName, startX, startY);
}

const RARITY_COLORS = {
  common: '#c8c8c8',
  uncommon: '#2ecc71',
  rare: '#3498db',
  'very rare': '#9b59b6',
  legendary: '#f39c12',
  default: '#d4af37',
};

function getItemColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('legendary')) return RARITY_COLORS.legendary;
  if (n.includes('rare')) return RARITY_COLORS.rare;
  if (n.includes('uncommon')) return RARITY_COLORS.uncommon;
  return RARITY_COLORS.default;
}

export default function LootAnimation() {
  const [animations, setAnimations] = useState([]);
  const idRef = useRef(0);

  const trigger = useCallback((itemName, startX, startY) => {
    const id = ++idRef.current;
    // Target: bottom-left area where inventory/backpack button is
    const targetX = 80;
    const targetY = window.innerHeight - 50;
    const color = getItemColor(itemName);

    setAnimations(prev => [...prev, {
      id, itemName, startX, startY, targetX, targetY, color, created: Date.now(),
    }]);

    // Auto-remove after animation completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 1200);
  }, []);

  useEffect(() => {
    _triggerFn = trigger;
    return () => { _triggerFn = null; };
  }, [trigger]);

  if (animations.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1200,
      overflow: 'hidden',
    }}>
      {animations.map(anim => (
        <FlyingItem key={anim.id} {...anim} />
      ))}
    </div>
  );
}

function FlyingItem({ itemName, startX, startY, targetX, targetY, color }) {
  return (
    <>
      {/* Main item icon */}
      <div style={{
        position: 'absolute',
        left: startX,
        top: startY,
        animation: 'lootFly 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
        '--tx': `${targetX - startX}px`,
        '--ty': `${targetY - startY}px`,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `radial-gradient(circle, ${color}44 0%, ${color}11 70%)`,
          border: `1.5px solid ${color}88`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', color,
          boxShadow: `0 0 12px ${color}66, 0 0 4px ${color}44`,
          fontWeight: 700,
        }}>
          {(itemName || '?')[0].toUpperCase()}
        </div>
      </div>

      {/* Sparkle trail particles */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: startX + 10,
          top: startY + 10,
          width: 4, height: 4,
          borderRadius: '50%',
          background: color,
          opacity: 0,
          animation: `lootSparkle 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) forwards`,
          animationDelay: `${i * 0.08}s`,
          '--tx': `${targetX - startX + (Math.random() - 0.5) * 40}px`,
          '--ty': `${targetY - startY + (Math.random() - 0.5) * 40}px`,
          boxShadow: `0 0 6px ${color}`,
        }} />
      ))}

      {/* Item name toast */}
      <div style={{
        position: 'absolute',
        left: startX - 40,
        top: startY - 24,
        animation: 'lootNameFade 1.2s ease-out forwards',
        fontSize: '0.65rem',
        fontWeight: 700,
        color,
        textShadow: `0 0 8px ${color}66, 0 1px 3px rgba(0,0,0,0.8)`,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        width: 120,
        fontFamily: "'Cinzel', Georgia, serif",
      }}>
        + {itemName}
      </div>

      <style>{`
        @keyframes lootFly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          60% { transform: translate(calc(var(--tx) * 0.6), calc(var(--ty) * 0.4 - 30px)) scale(1.1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; }
        }
        @keyframes lootSparkle {
          0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          50% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes lootNameFade {
          0% { transform: translateY(0); opacity: 1; }
          40% { opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>
    </>
  );
}
