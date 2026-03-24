import { useEffect, useState } from 'react';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * KeyboardHelp — Press ? to see all available keyboard shortcuts.
 * Styled as a parchment scroll overlay with organized columns.
 */

const SHORTCUTS = [
  {
    category: 'Movement',
    icon: '🧭',
    keys: [
      { key: 'W / ↑', desc: 'Move north' },
      { key: 'S / ↓', desc: 'Move south' },
      { key: 'A / ←', desc: 'Move west' },
      { key: 'D / →', desc: 'Move east' },
      { key: 'Click tile', desc: 'Pathfind to tile' },
      { key: 'Space', desc: 'Recenter camera' },
      { key: 'Scroll', desc: 'Zoom in/out' },
    ],
  },
  {
    category: 'Combat',
    icon: '⚔️',
    keys: [
      { key: 'A', desc: 'Attack' },
      { key: 'S', desc: 'Cast spell' },
      { key: 'E', desc: 'End turn' },
      { key: 'Esc', desc: 'Cancel action' },
      { key: '1–9', desc: 'Select combatant' },
    ],
  },
  {
    category: 'Interaction',
    icon: '💬',
    keys: [
      { key: 'E', desc: 'Interact (NPC / exit)' },
      { key: 'Click NPC', desc: 'Talk to NPC' },
      { key: 'Click exit', desc: 'Change area' },
    ],
  },
  {
    category: 'Interface',
    icon: '📋',
    keys: [
      { key: '?', desc: 'Show this help' },
      { key: 'I', desc: 'Inventory' },
      { key: 'C', desc: 'Character sheet' },
      { key: 'J', desc: 'Journal' },
      { key: 'M', desc: 'Toggle minimap' },
      { key: 'Esc', desc: 'Close panel / cancel' },
    ],
  },
];

export default function KeyboardHelp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        e.preventDefault();
        setVisible(v => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={S.overlay} onClick={() => setVisible(false)}>
      <div style={S.scroll} onClick={e => e.stopPropagation()}>
        {/* Scroll top curl */}
        <div style={S.scrollCurl}>
          <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none">
            <path d="M0,18 C20,4 40,0 60,2 L340,2 C360,0 380,4 400,18" fill="#2a1f0e" stroke="#d4af37" strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>

        {/* Corner filigree */}
        <Filigree pos="top-left" />
        <Filigree pos="top-right" />
        <Filigree pos="bottom-left" />
        <Filigree pos="bottom-right" />

        {/* Header */}
        <div style={S.header}>
          <div style={S.titleRow}>
            <span style={S.titleIcon}>📜</span>
            <div style={S.title}>Arcane Shortcuts</div>
          </div>
          <button
            style={S.closeBtn}
            onClick={() => setVisible(false)}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#d4af37';
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6a5a40';
              e.currentTarget.style.borderColor = 'rgba(100,80,50,0.3)';
            }}
          >✕</button>
        </div>

        {/* Ornate divider */}
        <div style={S.dividerWrap}>
          <div style={S.dividerLine} />
          <div style={S.dividerGlyph}>❖</div>
          <div style={S.dividerLine} />
        </div>

        {/* Shortcut grid — organized columns */}
        <div style={S.grid}>
          {SHORTCUTS.map(section => (
            <div key={section.category} style={S.section}>
              {/* Section header */}
              <div style={S.categoryHeader}>
                <span style={S.categoryIcon}>{section.icon}</span>
                <span style={S.categoryLabel}>{section.category}</span>
              </div>
              <div style={S.categoryDivider} />

              {/* Key rows */}
              {section.keys.map((shortcut, i) => (
                <div key={i} style={S.row}>
                  <kbd style={S.kbd}>{shortcut.key}</kbd>
                  <span style={S.desc}>{shortcut.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={S.dividerWrap}>
          <div style={S.dividerLine} />
          <div style={S.dividerGlyph}>◆</div>
          <div style={S.dividerLine} />
        </div>
        <div style={S.footer}>
          Press <kbd style={S.kbdSmall}>?</kbd> to toggle this scroll
        </div>

        {/* Scroll bottom curl */}
        <div style={S.scrollCurlBottom}>
          <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none">
            <path d="M0,0 C20,14 40,18 60,16 L340,16 C360,18 380,14 400,0" fill="#2a1f0e" stroke="#d4af37" strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes scrollUnfurl {
          0% { transform: scaleY(0.3) translateY(-30px); opacity: 0; }
          60% { transform: scaleY(1.03); opacity: 1; }
          100% { transform: scaleY(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** SVG corner filigree for parchment corners */
function Filigree({ pos }) {
  const isTop = pos.includes('top');
  const isLeft = pos.includes('left');
  const style = {
    position: 'absolute',
    [isTop ? 'top' : 'bottom']: 8,
    [isLeft ? 'left' : 'right']: 8,
    pointerEvents: 'none',
    transform: `scale(${isLeft ? 1 : -1}, ${isTop ? 1 : -1})`,
  };
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={style}>
      <path d="M0,0 Q14,1 26,26" stroke="#d4af37" strokeWidth="1.2" fill="none" opacity="0.35" />
      <path d="M0,0 Q7,1 12,12" stroke="#d4af37" strokeWidth="0.8" fill="none" opacity="0.25" />
      <circle cx="2" cy="2" r="2" fill="#d4af37" opacity="0.35" />
      <circle cx="8" cy="8" r="1" fill="#d4af37" opacity="0.2" />
    </svg>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1500,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(3px)',
  },
  scroll: {
    position: 'relative',
    /* Parchment texture via layered gradients */
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(60,45,20,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(50,38,15,0.2) 0%, transparent 50%),
      linear-gradient(170deg, #2a1f0e 0%, #221a0a 30%, #1e1508 60%, #1a1006 100%)
    `,
    border: '2px solid rgba(212,175,55,0.35)',
    borderRadius: 6,
    padding: '28px 28px 22px',
    maxWidth: 600, width: '95vw', maxHeight: '82vh', overflowY: 'auto',
    boxShadow: `
      0 12px 48px rgba(0,0,0,0.9),
      0 0 40px rgba(212,175,55,0.05),
      inset 0 0 60px rgba(0,0,0,0.3),
      inset 0 1px 0 rgba(212,175,55,0.1)
    `,
    animation: 'scrollUnfurl 0.3s ease-out',
  },
  scrollCurl: {
    position: 'absolute', top: -8, left: 10, right: 10,
    pointerEvents: 'none',
  },
  scrollCurlBottom: {
    position: 'absolute', bottom: -8, left: 10, right: 10,
    pointerEvents: 'none',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  titleIcon: {
    fontSize: '1.3rem',
    filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.3))',
  },
  title: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '1.1rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(212,175,55,0.25)',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid rgba(100,80,50,0.3)',
    borderRadius: 6,
    color: '#6a5a40', cursor: 'pointer',
    fontSize: 14, width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  dividerWrap: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 14px',
  },
  dividerLine: {
    flex: 1, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
  },
  dividerGlyph: {
    color: '#d4af37', fontSize: '0.55rem', opacity: 0.45,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 18,
  },
  section: {
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  categoryHeader: {
    display: 'flex', alignItems: 'center', gap: 7,
    marginBottom: 2,
  },
  categoryIcon: { fontSize: '0.85rem' },
  categoryLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.72rem', color: '#d4af37',
    fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textShadow: '0 0 6px rgba(212,175,55,0.15)',
  },
  categoryDivider: {
    height: 1, marginBottom: 4,
    background: 'linear-gradient(90deg, rgba(212,175,55,0.25), transparent 80%)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '4px 0',
  },
  kbd: {
    display: 'inline-block',
    minWidth: 60, textAlign: 'center',
    padding: '3px 10px',
    background: 'linear-gradient(180deg, rgba(50,38,18,0.8), rgba(30,22,10,0.9))',
    border: '1px solid rgba(212,175,55,0.22)',
    borderRadius: 4,
    fontFamily: '"Cinzel", serif',
    fontSize: '0.65rem',
    color: '#e8d5a3',
    fontWeight: 600,
    boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)',
    letterSpacing: '0.04em',
  },
  kbdSmall: {
    display: 'inline-block',
    padding: '1px 8px',
    background: 'linear-gradient(180deg, rgba(50,38,18,0.8), rgba(30,22,10,0.9))',
    border: '1px solid rgba(212,175,55,0.22)',
    borderRadius: 3,
    fontFamily: '"Cinzel", serif',
    fontSize: '0.6rem',
    color: '#e8d5a3',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
    margin: '0 3px',
  },
  desc: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.7rem',
    color: 'rgba(220,200,170,0.55)',
  },
  footer: {
    textAlign: 'center',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.62rem',
    color: 'rgba(180,150,100,0.35)',
    fontStyle: 'italic',
    paddingTop: 4,
  },
};
