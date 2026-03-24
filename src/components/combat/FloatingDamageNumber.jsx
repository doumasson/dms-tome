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

  const color = type === 'heal' ? '#2ecc71' : type === 'miss' ? '#95a5a6' : '#e74c3c';
  const sign = type === 'heal' ? '+' : '';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y + offsetY}px`,
        opacity,
        color,
        fontSize: '20px',
        fontWeight: 'bold',
        pointerEvents: 'none',
        fontFamily: 'Cinzel, serif',
        textShadow: '0 0 8px rgba(0,0,0,0.8)',
        transition: 'opacity 0.1s linear',
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'miss' ? 'MISS' : `${sign}${value}`}
    </div>
  );
}
