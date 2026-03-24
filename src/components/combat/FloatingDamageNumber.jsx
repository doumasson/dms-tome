import { useState, useEffect } from 'react';

/**
 * FloatingDamageNumber — renders a number that floats up and fades out
 * Used for combat feedback (damage/healing numbers above tokens)
 */
export default function FloatingDamageNumber({ x, y, value, type = 'damage', duration = 1000 }) {
  const [opacity, setOpacity] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Float up and fade out
      setOffsetY(-progress * 40); // Float up 40px
      setOpacity(1 - progress);

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration]);

  // Damage type colors for 5e damage types
  const DAMAGE_COLORS = {
    fire: '#ff6633', cold: '#44bbee', lightning: '#ffee44',
    necrotic: '#9944cc', radiant: '#ffffaa', poison: '#66cc44',
    psychic: '#cc44aa', thunder: '#6688cc', acid: '#88cc22',
    force: '#bb88ff',
  }
  const isCrit = type === 'crit'
  const baseType = isCrit ? 'damage' : type
  const color = baseType === 'heal' ? '#2ecc71'
    : baseType === 'miss' ? '#95a5a6'
    : DAMAGE_COLORS[baseType] || '#e74c3c'
  const sign = baseType === 'heal' ? '+' : ''
  const fontSize = isCrit ? 26 : (baseType === 'miss' ? 16 : 20)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y + offsetY}px`,
        opacity,
        color,
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        pointerEvents: 'none',
        fontFamily: "'Cinzel', serif",
        textShadow: `0 0 8px rgba(0,0,0,0.8)${isCrit ? ', 0 0 12px ' + color + '88' : ''}`,
        transition: 'opacity 0.1s linear',
        transform: `translate(-50%, -50%)${isCrit ? ' scale(1.2)' : ''}`,
        whiteSpace: 'nowrap',
        letterSpacing: isCrit ? '2px' : '0',
      }}
    >
      {baseType === 'miss' ? 'MISS' : `${isCrit ? '💥 ' : ''}${sign}${value}`}
    </div>
  );
}
