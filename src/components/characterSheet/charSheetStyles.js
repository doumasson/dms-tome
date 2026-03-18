export const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 900,
    maxHeight: '92vh',
    background: 'linear-gradient(180deg, #1a0f05 0%, #130b03 100%)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 60px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px',
    borderBottom: '1px solid rgba(212,175,55,0.2)',
    background: 'linear-gradient(180deg, #231408 0%, #1a0f05 100%)',
    flexShrink: 0,
  },
  portrait: {
    width: 52, height: 52, borderRadius: '50%',
    border: '2px solid rgba(212,175,55,0.5)',
    objectFit: 'cover', flexShrink: 0,
    background: 'rgba(212,175,55,0.06)',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  charName: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1.15rem', fontWeight: 700,
    color: '#e8dcc8', letterSpacing: '0.04em',
  },
  charSub: {
    fontSize: '0.78rem', color: 'rgba(200,180,140,0.6)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'transparent', border: '1px solid rgba(212,175,55,0.25)',
    color: 'rgba(200,180,140,0.6)', borderRadius: 6,
    padding: '6px 12px', cursor: 'pointer', fontSize: '1rem',
    flexShrink: 0,
  },
  body: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },

  // ── Left pane ──
  leftPane: {
    width: 340, flexShrink: 0,
    borderRight: '1px solid rgba(212,175,55,0.15)',
    overflowY: 'auto', padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.65rem', fontWeight: 700,
    color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em',
    textTransform: 'uppercase', borderBottom: '1px solid rgba(212,175,55,0.1)',
    paddingBottom: 4,
  },

  // HP bar
  hpRow: { display: 'flex', alignItems: 'center', gap: 8 },
  hpText: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.88rem', color: '#e8dcc8', flexShrink: 0 },
  hpTrack: { flex: 1, height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' },
  hpFill: { height: '100%', borderRadius: 4, transition: 'width 0.35s, background 0.35s' },

  // Stats grid
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  statBox: {
    background: 'linear-gradient(180deg, #231408 0%, #180e04 100%)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 8, padding: '10px 6px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    textAlign: 'center',
  },
  statLabel: { fontSize: '0.58rem', color: 'rgba(200,180,140,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Cinzel', Georgia, serif" },
  statScore: { fontSize: '1.3rem', fontWeight: 700, color: '#e8dcc8', fontFamily: "'Cinzel', Georgia, serif", lineHeight: 1 },
  statMod: { fontSize: '0.8rem', fontWeight: 700, color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif" },

  // Quick stats row
  quickRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  quickBadge: {
    background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem',
    color: 'rgba(200,180,140,0.8)', fontFamily: "'Cinzel', Georgia, serif",
  },

  // Equipment slots
  slotGrid: { display: 'flex', flexDirection: 'column', gap: 4 },
  slotRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 6, padding: '6px 10px', minHeight: 38,
    cursor: 'default',
  },
  slotIcon: { fontSize: '1rem', flexShrink: 0, width: 22, textAlign: 'center' },
  slotLabel: { fontSize: '0.68rem', color: 'rgba(200,180,140,0.45)', minWidth: 64, fontFamily: "'Cinzel', Georgia, serif" },
  slotItem: { flex: 1, fontSize: '0.82rem', color: '#e8dcc8', fontFamily: "'Cinzel', Georgia, serif" },
  slotEmpty: { flex: 1, fontSize: '0.75rem', color: 'rgba(200,180,140,0.25)', fontStyle: 'italic' },
  slotUnequipBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(200,80,80,0.6)', cursor: 'pointer', fontSize: '0.9rem',
    padding: '0 2px', minHeight: 'unset', lineHeight: 1,
  },

  // Features / spells / skills tabs
  tabRow: { display: 'flex', gap: 4, marginBottom: 4 },
  tab: {
    background: 'transparent', border: '1px solid rgba(212,175,55,0.15)',
    color: 'rgba(200,180,140,0.5)', borderRadius: 6, padding: '4px 10px',
    fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif",
  },
  tabActive: {
    background: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.4)',
    color: '#d4af37',
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 4 },
  featureItem: { fontSize: '0.78rem', color: 'rgba(200,180,140,0.7)', padding: '4px 8px', background: 'rgba(212,175,55,0.04)', borderRadius: 4 },
  spellTag: { display: 'inline-block', background: 'rgba(74,158,200,0.1)', border: '1px solid rgba(74,158,200,0.3)', color: '#7ab8d4', borderRadius: 12, padding: '2px 10px', fontSize: '0.75rem', margin: '2px' },

  // ── Right pane ──
  rightPane: {
    flex: 1, overflowY: 'auto', padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  invHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  goldBadge: {
    background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 20, padding: '4px 14px', fontSize: '0.82rem',
    color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700,
  },
  invList: { display: 'flex', flexDirection: 'column', gap: 6 },
  invItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 7, padding: '8px 12px',
    cursor: 'grab', transition: 'border-color 0.15s',
  },
  invItemDragging: { borderColor: 'rgba(212,175,55,0.5)', background: 'rgba(212,175,55,0.06)' },
  invItemIcon: { fontSize: '1.1rem', flexShrink: 0 },
  invItemName: { flex: 1, fontSize: '0.84rem', color: '#e8dcc8', fontFamily: "'Cinzel', Georgia, serif" },
  invItemQty: { fontSize: '0.72rem', color: 'rgba(200,180,140,0.5)' },
  invItemDesc: { fontSize: '0.72rem', color: 'rgba(200,180,140,0.45)', marginTop: 2 },
  invActions: { display: 'flex', gap: 4 },
  equipBtn: {
    background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
    color: '#d4af37', borderRadius: 4, padding: '3px 8px',
    fontSize: '0.68rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif",
  },
  useBtn: {
    background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)',
    color: '#2ecc71', borderRadius: 4, padding: '3px 8px',
    fontSize: '0.68rem', cursor: 'pointer',
  },
  dropBtn: {
    background: 'transparent', border: '1px solid rgba(200,80,80,0.2)',
    color: 'rgba(200,80,80,0.5)', borderRadius: 4, padding: '3px 8px',
    fontSize: '0.68rem', cursor: 'pointer',
  },
  emptyInv: {
    textAlign: 'center', padding: '32px 0',
    color: 'rgba(200,180,140,0.3)', fontSize: '0.85rem', fontStyle: 'italic',
  },
  dropZoneHint: {
    border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8,
    padding: '10px', textAlign: 'center',
    fontSize: '0.72rem', color: 'rgba(200,180,140,0.3)',
    marginTop: 8,
  },
};
