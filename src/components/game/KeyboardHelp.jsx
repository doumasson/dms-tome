import { useEffect, useState } from 'react';

/**
 * KeyboardHelp — Press ? to see all available keyboard shortcuts.
 * Full-screen overlay with categorized shortcut list.
 */

const SHORTCUTS = [
  {
    category: 'Movement',
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
    keys: [
      { key: 'E', desc: 'Interact (NPC / exit)' },
      { key: 'Click NPC', desc: 'Talk to NPC' },
      { key: 'Click exit', desc: 'Change area' },
    ],
  },
  {
    category: 'UI',
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
      // ? key (with or without shift)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        // Don't trigger if typing in an input
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
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <span style={S.title}>Keyboard Shortcuts</span>
          <button style={S.closeBtn} onClick={() => setVisible(false)}>✕</button>
        </div>

        <div style={S.grid}>
          {SHORTCUTS.map(section => (
            <div key={section.category} style={S.section}>
              <div style={S.categoryLabel}>{section.category}</div>
              {section.keys.map((shortcut, i) => (
                <div key={i} style={S.row}>
                  <kbd style={S.kbd}>{shortcut.key}</kbd>
                  <span style={S.desc}>{shortcut.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={S.footer}>
          Press <kbd style={{ ...S.kbd, fontSize: '0.65rem' }}>?</kbd> to toggle this help
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1500,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    animation: 'kbHelpFade 0.15s ease-out',
  },
  panel: {
    background: 'linear-gradient(180deg, #1a1208 0%, #120e06 100%)',
    border: '2px solid rgba(212,175,55,0.5)',
    borderRadius: 10,
    padding: '20px 24px',
    maxWidth: 560,
    width: '95vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.1)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(212,175,55,0.3)',
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '2px',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#6a5a40',
    cursor: 'pointer', fontSize: 16, padding: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  section: {
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  categoryLabel: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.7rem', color: '#d4af37',
    fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '1px', marginBottom: 4,
    paddingBottom: 4,
    borderBottom: '1px solid rgba(212,175,55,0.15)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '3px 0',
  },
  kbd: {
    display: 'inline-block',
    minWidth: 50, textAlign: 'center',
    padding: '2px 8px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: '0.68rem',
    color: '#e8d5a3',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  desc: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,0.5)',
  },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTop: '1px solid rgba(212,175,55,0.15)',
    textAlign: 'center',
    fontSize: '0.6rem',
    color: 'rgba(255,255,255,0.25)',
  },
};
