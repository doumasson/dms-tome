import { useState, useRef, useCallback, useEffect } from 'react';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * Tooltip — Reusable hover tooltip for items, spells, conditions, etc.
 * Wraps children and shows a positioned popup on hover/focus.
 * Styled: ornate dark fantasy panel with gold filigree borders.
 *
 * Props:
 *   content: ReactNode | string — what to show in the tooltip
 *   position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 *   delay: ms before showing (default: 300)
 *   maxWidth: pixel width cap (default: 260)
 *   children: the trigger element
 */

const ARROW_SIZE = 6;

const tooltipPanelStyle = {
  background: 'linear-gradient(160deg, #1e150a 0%, #120c04 40%, #0d0804 100%)',
  border: '1.5px solid #c9a84c',
  borderRadius: 4,
  padding: '10px 12px',
  boxShadow: [
    '0 6px 24px rgba(0,0,0,0.9)',
    '0 0 12px rgba(201,168,76,0.15)',
    'inset 0 1px 0 rgba(201,168,76,0.12)',
    'inset 0 -1px 0 rgba(0,0,0,0.4)',
  ].join(', '),
  fontSize: '0.72rem',
  lineHeight: 1.45,
  color: '#d4c090',
  fontFamily: "'Crimson Text', 'Palatino', serif",
  outline: '1px solid rgba(201,168,76,0.15)',
  outlineOffset: 2,
};

function ArrowSvg({ position }) {
  const style = {
    position: 'absolute',
    width: ARROW_SIZE * 2,
    height: ARROW_SIZE,
    overflow: 'visible',
  };
  const posMap = {
    top: { bottom: -ARROW_SIZE, left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: -ARROW_SIZE, left: '50%', transform: 'translateX(-50%) rotate(180deg)' },
    left: { right: -ARROW_SIZE - 2, top: '50%', transform: 'translateY(-50%) rotate(-90deg)' },
    right: { left: -ARROW_SIZE - 2, top: '50%', transform: 'translateY(-50%) rotate(90deg)' },
  };
  return (
    <svg style={{ ...style, ...posMap[position] }} viewBox={`0 0 ${ARROW_SIZE * 2} ${ARROW_SIZE}`}>
      <polygon
        points={`0,${ARROW_SIZE} ${ARROW_SIZE},0 ${ARROW_SIZE * 2},${ARROW_SIZE}`}
        fill="#120c04"
        stroke="#c9a84c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="0" y1={ARROW_SIZE} x2={ARROW_SIZE * 2} y2={ARROW_SIZE} stroke="#120c04" strokeWidth="3" />
    </svg>
  );
}

/* Corner filigree — small decorative L-shaped gold accent */
function CornerAccent({ corner }) {
  const size = 8;
  const base = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const posMap = {
    tl: { top: -1, left: -1, borderTop: '2px solid #d4af37', borderLeft: '2px solid #d4af37' },
    tr: { top: -1, right: -1, borderTop: '2px solid #d4af37', borderRight: '2px solid #d4af37' },
    bl: { bottom: -1, left: -1, borderBottom: '2px solid #d4af37', borderLeft: '2px solid #d4af37' },
    br: { bottom: -1, right: -1, borderBottom: '2px solid #d4af37', borderRight: '2px solid #d4af37' },
  };
  return <span style={{ ...base, ...posMap[corner], borderRadius: 1 }} />;
}

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
          animation: 'tooltipFadeIn 0.18s ease-out',
        }}>
          <div style={{ ...tooltipPanelStyle, position: 'relative' }}>
            <CornerAccent corner="tl" />
            <CornerAccent corner="tr" />
            <CornerAccent corner="bl" />
            <CornerAccent corner="br" />
            {/* Top divider line — subtle gold separator */}
            <div style={{
              position: 'absolute', top: 3, left: 10, right: 10, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)',
            }} />
            {typeof content === 'string' ? (
              <span style={{ letterSpacing: '0.02em' }}>{content}</span>
            ) : content}
            {/* Bottom divider line */}
            <div style={{
              position: 'absolute', bottom: 3, left: 10, right: 10, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)',
            }} />
            <ArrowSvg position={position} />
          </div>
        </div>
      )}
      {visible && <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

const headerStyle = {
  fontFamily: "'Cinzel', 'Palatino', serif",
  fontWeight: 700,
  fontSize: '0.78rem',
  marginBottom: 4,
  letterSpacing: '0.04em',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
};

const subHeaderStyle = {
  fontSize: '0.6rem',
  color: 'rgba(201,168,76,0.55)',
  textTransform: 'capitalize',
  marginBottom: 5,
  letterSpacing: '0.03em',
  fontFamily: "'Crimson Text', serif",
};

const bodyTextStyle = {
  fontSize: '0.65rem',
  color: '#b8a070',
  fontFamily: "'Crimson Text', serif",
  lineHeight: 1.4,
};

const statLineStyle = {
  fontSize: '0.65rem',
  fontFamily: "'Crimson Text', serif",
  marginTop: 1,
};

const dividerStyle = {
  height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)',
  margin: '5px 0',
};

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
      <div style={{ ...headerStyle, color }}>
        {item.name}
      </div>
      {item.type && (
        <div style={subHeaderStyle}>
          {item.type}{rarity !== 'common' ? ` · ${rarity}` : ''}
        </div>
      )}
      {item.description && (
        <>
          <div style={dividerStyle} />
          <div style={{ ...bodyTextStyle, marginBottom: 3 }}>{item.description}</div>
        </>
      )}
      {(item.damage || item.ac || item.healing) && <div style={dividerStyle} />}
      {item.damage && <div style={{ ...statLineStyle, color: '#e74c3c' }}>⚔ Damage: {item.damage}</div>}
      {item.ac && <div style={{ ...statLineStyle, color: '#6ba4d8' }}>🛡 AC: {item.ac}</div>}
      {item.healing && <div style={{ ...statLineStyle, color: '#4ebd73' }}>✦ Healing: {item.healing}</div>}
      {item.price != null && (
        <div style={{ ...statLineStyle, color: '#d4af37', marginTop: 4 }}>⬡ {item.price} gp</div>
      )}
      {item.requiresAttunement && (
        <div style={{ fontSize: '0.58rem', color: '#9b59b6', fontStyle: 'italic', marginTop: 3 }}>✧ Requires Attunement</div>
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
      <div style={{ ...headerStyle, color: '#7ba4ff' }}>
        {spell.name}
      </div>
      <div style={{ ...subHeaderStyle, color: 'rgba(123,164,255,0.55)' }}>
        {levelText}{spell.school ? ` · ${spell.school}` : ''}
      </div>
      <div style={dividerStyle} />
      {spell.castingTime && <div style={{ ...statLineStyle, color: '#b8a070' }}>⏱ Cast: {spell.castingTime}</div>}
      {spell.range && <div style={{ ...statLineStyle, color: '#b8a070' }}>↗ Range: {spell.range}</div>}
      {spell.duration && <div style={{ ...statLineStyle, color: '#b8a070' }}>⧗ Duration: {spell.duration}</div>}
      {spell.components && <div style={{ ...statLineStyle, color: '#b8a070' }}>◈ Components: {spell.components}</div>}
      {spell.description && (
        <>
          <div style={dividerStyle} />
          <div style={{ ...bodyTextStyle, marginTop: 2, maxHeight: 100, overflow: 'hidden' }}>
            {spell.description.length > 200 ? spell.description.slice(0, 200) + '…' : spell.description}
          </div>
        </>
      )}
      {spell.concentration && (
        <div style={{ fontSize: '0.58rem', color: '#f39c12', fontStyle: 'italic', marginTop: 4 }}>✦ Concentration</div>
      )}
    </div>
  );
}

/** Condition tooltip content */
export function ConditionTooltip({ name, description }) {
  return (
    <div>
      <div style={{ ...headerStyle, color: '#e74c3c' }}>
        {name}
      </div>
      {description && (
        <>
          <div style={dividerStyle} />
          <div style={bodyTextStyle}>{description}</div>
        </>
      )}
    </div>
  );
}
