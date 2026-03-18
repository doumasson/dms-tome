// ─── Shared combat layout constants ──────────────────────────────────────────
export const MAP_W = 10;
export const MAP_H = 8;
export const CELL_PX = 52; // desktop default

// ─── Button styles ─────────────────────────────────────────────────────────
export const btn = {
  gold: {
    minHeight: 38, padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', fontWeight: 700, fontSize: '0.88rem', border: 'none',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  ghost: {
    minHeight: 36, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.82rem',
  },
  small: {
    minHeight: 30, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)', fontSize: '0.78rem',
  },
  action: {
    minHeight: 36, padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem', textAlign: 'left',
  },
};

export const miniBtn = {
  minHeight: 22, padding: '1px 6px', borderRadius: 3, cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)',
  color: '#e74c3c', fontSize: '0.7rem', flexShrink: 0,
};

// Panel/form styles used by AttackPanel, SpellPanels, etc.
export const apStyle = {
  panel: {
    background: '#1a1006', border: '1px solid #3a2a14', borderRadius: 8,
    padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  targetBtn: {
    minHeight: 34, padding: '6px 10px', borderRadius: 5, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)',
    color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'left',
  },
  btn: {
    minHeight: 34, padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', fontWeight: 700, fontSize: '0.82rem', border: 'none',
  },
  cancel: {
    minHeight: 30, padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.78rem',
  },
  auto: {
    minHeight: 24, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)', fontSize: '0.72rem',
  },
};
