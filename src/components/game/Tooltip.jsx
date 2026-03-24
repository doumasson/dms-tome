import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Tooltip — Reusable hover tooltip for items, spells, conditions, etc.
 * Wraps children and shows a positioned popup on hover/focus.
 *
 * Props:
 *   content: ReactNode | string — what to show in the tooltip
 *   position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 *   delay: ms before showing (default: 300)
 *   maxWidth: pixel width cap (default: 260)
 *   children: the trigger element
 */
export default function Tooltip({ content, position = 'top', delay = 300, maxWidth = 260, children }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords(getPosition(rect, position, maxWidth));
      }
      setVisible(true);
    }, delay);
  }, [delay, position, maxWidth]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!content) return children;

  return (
    <span
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div style={{
          position: 'fixed',
          left: coords.x,
          top: coords.y,
          zIndex: 2000,
          maxWidth,
          pointerEvents: 'none',
          animation: 'tooltipFadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1208 0%, #120e06 100%)',
            border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 6,
            padding: '8px 10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 8px rgba(212,175,55,0.1)',
            fontSize: '0.7rem',
            lineHeight: 1.4,
            color: '#d4c090',
          }}>
            {typeof content === 'string' ? content : content}
          </div>
        </div>
      )}
      {visible && <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>}
    </span>
  );
}

function getPosition(rect, position, maxWidth) {
  const gap = 8;
  switch (position) {
    case 'bottom':
      return { x: Math.max(4, rect.left + rect.width / 2 - maxWidth / 2), y: rect.bottom + gap };
    case 'left':
      return { x: rect.left - maxWidth - gap, y: rect.top + rect.height / 2 - 20 };
    case 'right':
      return { x: rect.right + gap, y: rect.top + rect.height / 2 - 20 };
    default: // top
      return { x: Math.max(4, rect.left + rect.width / 2 - maxWidth / 2), y: rect.top - gap - 40 };
  }
}

// ── Formatted tooltip content helpers ─────────────────────────────────

/** Item tooltip content */
export function ItemTooltip({ item }) {
  if (!item) return null;
  const rarity = item.rarity || 'common';
  const rarityColors = {
    common: '#c8c8c8', uncommon: '#2ecc71', rare: '#3498db',
    'very rare': '#9b59b6', legendary: '#f39c12',
  };
  const color = rarityColors[rarity] || '#d4af37';

  return (
    <div>
      <div style={{ fontWeight: 700, color, fontSize: '0.75rem', marginBottom: 3 }}>
        {item.name}
      </div>
      {item.type && (
        <div style={{ fontSize: '0.6rem', color: 'rgba(212,175,55,0.5)', textTransform: 'capitalize', marginBottom: 4 }}>
          {item.type}{rarity !== 'common' ? ` · ${rarity}` : ''}
        </div>
      )}
      {item.description && (
        <div style={{ fontSize: '0.62rem', color: '#9a8060', marginBottom: 3 }}>{item.description}</div>
      )}
      {item.damage && <div style={{ fontSize: '0.62rem', color: '#e74c3c' }}>Damage: {item.damage}</div>}
      {item.ac && <div style={{ fontSize: '0.62rem', color: '#3498db' }}>AC: {item.ac}</div>}
      {item.healing && <div style={{ fontSize: '0.62rem', color: '#2ecc71' }}>Healing: {item.healing}</div>}
      {item.price != null && (
        <div style={{ fontSize: '0.58rem', color: '#d4af37', marginTop: 3 }}>{item.price} gp</div>
      )}
      {item.requiresAttunement && (
        <div style={{ fontSize: '0.55rem', color: '#9b59b6', fontStyle: 'italic', marginTop: 2 }}>Requires Attunement</div>
      )}
    </div>
  );
}

/** Spell tooltip content */
export function SpellTooltip({ spell }) {
  if (!spell) return null;
  const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  return (
    <div>
      <div style={{ fontWeight: 700, color: '#5b8fff', fontSize: '0.75rem', marginBottom: 3 }}>
        {spell.name}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'rgba(91,143,255,0.6)', marginBottom: 4 }}>
        {levelText}{spell.school ? ` · ${spell.school}` : ''}
      </div>
      {spell.castingTime && <div style={{ fontSize: '0.6rem', color: '#9a8060' }}>Cast: {spell.castingTime}</div>}
      {spell.range && <div style={{ fontSize: '0.6rem', color: '#9a8060' }}>Range: {spell.range}</div>}
      {spell.duration && <div style={{ fontSize: '0.6rem', color: '#9a8060' }}>Duration: {spell.duration}</div>}
      {spell.components && <div style={{ fontSize: '0.6rem', color: '#9a8060' }}>Components: {spell.components}</div>}
      {spell.description && (
        <div style={{ fontSize: '0.62rem', color: '#d4c090', marginTop: 4, maxHeight: 100, overflow: 'hidden' }}>
          {spell.description.length > 200 ? spell.description.slice(0, 200) + '…' : spell.description}
        </div>
      )}
      {spell.concentration && (
        <div style={{ fontSize: '0.55rem', color: '#f39c12', fontStyle: 'italic', marginTop: 2 }}>Concentration</div>
      )}
    </div>
  );
}

/** Condition tooltip content */
export function ConditionTooltip({ name, description }) {
  return (
    <div>
      <div style={{ fontWeight: 700, color: '#e74c3c', fontSize: '0.75rem', marginBottom: 3 }}>
        {name}
      </div>
      {description && (
        <div style={{ fontSize: '0.62rem', color: '#d4c090' }}>{description}</div>
      )}
    </div>
  );
}
