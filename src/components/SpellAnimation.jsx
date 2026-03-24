import { useState, useEffect } from 'react';

/**
 * SpellAnimation — renders visual particle effects for spell casts
 * Shows contextual animations based on spell type and area
 */
export default function SpellAnimation({ spell, targetX, targetY, cellPx, duration = 800 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [duration]);

  // Convert grid coords to pixels
  const px = targetX * cellPx + cellPx / 2;
  const py = targetY * cellPx + cellPx / 2;

  const spellName = (spell?.name || '').toLowerCase();

  // Determine effect type by spell name
  let effectType = 'generic';
  if (spellName.includes('fireball') || spellName.includes('fire')) effectType = 'fireball';
  else if (spellName.includes('heal') || spellName.includes('cure')) effectType = 'healing';
  else if (spellName.includes('lightning') || spellName.includes('bolt')) effectType = 'lightning';
  else if (spellName.includes('ice') || spellName.includes('frost') || spellName.includes('cold')) effectType = 'ice';
  else if (spellName.includes('magic missile') || spellName.includes('missile')) effectType = 'missile';
  else if (spellName.includes('acid')) effectType = 'acid';

  return (
    <div
      style={{
        position: 'absolute',
        left: px,
        top: py,
        pointerEvents: 'none',
        width: cellPx,
        height: cellPx,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {effectType === 'fireball' && (
        <FireballEffect progress={progress} cellPx={cellPx} />
      )}
      {effectType === 'healing' && (
        <HealingEffect progress={progress} cellPx={cellPx} />
      )}
      {effectType === 'lightning' && (
        <LightningEffect progress={progress} cellPx={cellPx} />
      )}
      {effectType === 'ice' && (
        <IceEffect progress={progress} cellPx={cellPx} />
      )}
      {effectType === 'missile' && (
        <MissileEffect progress={progress} cellPx={cellPx} />
      )}
      {effectType === 'acid' && (
        <AcidEffect progress={progress} cellPx={cellPx} />
      )}
    </div>
  );
}

// Fireball: Expanding red/orange explosion
function FireballEffect({ progress, cellPx }) {
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const radius = progress * cellPx * 1.5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const opacity = Math.max(0, 1 - progress);
    const size = cellPx * 0.3 * (1 - progress);
    return { x, y, opacity, size };
  });

  return (
    <>
      {/* Expanding circle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid rgba(255, 100, 50, ${Math.max(0, 1 - progress)})`,
          boxShadow: `0 0 ${20 * (1 - progress)}px rgba(255, 150, 50, ${(1 - progress) * 0.8})`,
          transform: `scale(${0.5 + progress * 1.5})`,
        }}
      />
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size,
            height: p.size,
            background: `rgba(${255 - Math.floor(progress * 100)}, ${100 - Math.floor(progress * 50)}, 50, ${p.opacity})`,
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 0.5}px rgba(255, 150, 50, ${p.opacity})`,
            transform: 'translate(-50%, -50%)',
            filter: `blur(${progress * 2}px)`,
          }}
        />
      ))}
    </>
  );
}

// Healing: Golden/green upward sparkles
function HealingEffect({ progress, cellPx }) {
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const radius = progress * cellPx * 0.8;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - progress * cellPx * 0.5;
    const opacity = progress < 0.5 ? 1 : Math.max(0, 1 - progress);
    return { x, y, opacity };
  });

  return (
    <>
      {/* Central glow */}
      <div
        style={{
          position: 'absolute',
          inset: '25%',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(212, 175, 55, ${0.8 * (1 - progress)}), rgba(90, 170, 112, ${0.4 * (1 - progress)}))`,
          filter: `blur(${5 + progress * 5}px)`,
        }}
      />
      {/* Sparkles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: cellPx * 0.2,
            height: cellPx * 0.2,
            background: i % 2 === 0 ? '#d4af37' : '#5aaa70',
            borderRadius: '50%',
            opacity: p.opacity,
            boxShadow: `0 0 ${cellPx * 0.3}px currentColor`,
            transform: `translate(-50%, -50%) scale(${1 - progress})`,
          }}
        />
      ))}
    </>
  );
}

// Lightning: Zigzag bolt
function LightningEffect({ progress, cellPx }) {
  const segments = 6;
  const points = [{ x: 0, y: -cellPx }];
  for (let i = 1; i < segments; i++) {
    const x = (Math.random() - 0.5) * cellPx * 0.6;
    const y = -cellPx + (i / segments) * cellPx * 1.5;
    points.push({ x, y });
  }
  points.push({ x: 0, y: cellPx * 0.5 });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const opacity = progress < 0.2 ? 1 : Math.max(0, 1 - progress);

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          width: cellPx * 2,
          height: cellPx * 2,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity,
          filter: `blur(${progress * 1}px)`,
        }}
      >
        <path
          d={pathData}
          stroke="#6ba3d9"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 ${8 * opacity}px #6ba3d9)` }}
        />
      </svg>
      {/* Glow effect */}
      <div
        style={{
          position: 'absolute',
          inset: -cellPx * 0.3,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(107, 163, 217, ${0.3 * opacity}), transparent)`,
          filter: `blur(${10}px)`,
        }}
      />
    </>
  );
}

// Ice Storm: Blue/white falling ice particles
function IceEffect({ progress, cellPx }) {
  const particles = Array.from({ length: 10 }).map((_, i) => {
    const x = (Math.random() - 0.5) * cellPx * 1.4;
    const y = -cellPx + progress * cellPx * 1.8;
    const rotation = Math.random() * 360;
    const opacity = progress < 0.5 ? 1 : Math.max(0, 1 - progress);
    return { x, y, rotation, opacity };
  });

  return (
    <>
      {/* Icy glow */}
      <div
        style={{
          position: 'absolute',
          inset: '20%',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(107, 163, 217, ${0.6 * (1 - progress)}), rgba(200, 220, 255, ${0.2 * (1 - progress)}))`,
          filter: `blur(${8 + progress * 4}px)`,
        }}
      />
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: cellPx * 0.25,
            height: cellPx * 0.25,
            background: i % 3 === 0 ? '#c8dcff' : '#6ba3d9',
            borderRadius: '2px',
            opacity: p.opacity,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scaleY(${0.8 + Math.sin(progress * Math.PI) * 0.2})`,
            boxShadow: `0 0 ${cellPx * 0.2}px rgba(107, 163, 217, ${p.opacity * 0.8})`,
          }}
        />
      ))}
    </>
  );
}

// Magic Missile: Small projectiles
function MissileEffect({ progress, cellPx }) {
  const count = 3;
  const missiles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = progress * cellPx * 0.7;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const scale = 1 - progress * 0.3;
    return { x, y, scale };
  });

  return (
    <>
      {missiles.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${m.x}px)`,
            top: `calc(50% + ${m.y}px)`,
            width: cellPx * 0.15,
            height: cellPx * 0.15,
            background: '#d4af37',
            borderRadius: '50%',
            transform: `translate(-50%, -50%) scale(${m.scale})`,
            boxShadow: `0 0 ${cellPx * 0.2}px #d4af37, inset 0 0 ${cellPx * 0.1}px rgba(255,255,255,0.5)`,
          }}
        />
      ))}
    </>
  );
}

// Acid: Green splatter effect
function AcidEffect({ progress, cellPx }) {
  const particles = Array.from({ length: 15 }).map((_, i) => {
    const angle = (i / 15) * Math.PI * 2;
    const radius = progress * cellPx * 1.2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const opacity = Math.max(0, 1 - progress * 1.5);
    return { x, y, opacity };
  });

  return (
    <>
      {/* Splat circle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px dashed rgba(100, 200, 100, ${Math.max(0, 1 - progress)})`,
          boxShadow: `0 0 ${15 * (1 - progress)}px rgba(100, 200, 100, ${(1 - progress) * 0.6})`,
          transform: `scale(${0.3 + progress * 1.3})`,
        }}
      />
      {/* Acid droplets */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: cellPx * 0.2,
            height: cellPx * 0.2,
            background: `rgba(100, 200, 100, ${p.opacity * 0.7})`,
            borderRadius: '50%',
            boxShadow: `0 0 ${cellPx * 0.15}px rgba(100, 200, 100, ${p.opacity})`,
            transform: 'translate(-50%, -50%)',
            filter: `blur(${progress * 1.5}px)`,
          }}
        />
      ))}
    </>
  );
}
