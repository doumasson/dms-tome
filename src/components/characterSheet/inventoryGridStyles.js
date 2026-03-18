// Styles for InventoryGrid component

export const container = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '8px 0',
};

export const weightRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 2,
};

export const weightLabel = {
  fontSize: '0.7rem',
  color: 'rgba(200,180,140,0.6)',
  fontFamily: "'Cinzel', Georgia, serif",
};

export const weightNum = {
  fontSize: '0.68rem',
  color: 'rgba(212,175,55,0.8)',
};

export const weightBarBg = {
  height: 4,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 2,
  overflow: 'hidden',
  marginBottom: 8,
};

export const weightBarFill = {
  height: '100%',
  borderRadius: 2,
  transition: 'width 0.3s, background 0.3s',
};

export const itemCard = {
  background: 'linear-gradient(135deg, rgba(40,25,10,0.95), rgba(25,15,5,0.95))',
  border: '1px solid rgba(212,175,55,0.25)',
  borderRadius: 3,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'default',
  overflow: 'hidden',
  position: 'relative',
  boxSizing: 'border-box',
};

export const itemIconStyle = {
  fontSize: '1.1rem',
  lineHeight: 1,
};

export const itemNameStyle = {
  fontSize: '0.55rem',
  color: 'rgba(200,180,140,0.8)',
  fontFamily: "'Cinzel', Georgia, serif",
  textAlign: 'center',
  wordBreak: 'break-word',
  padding: '0 2px',
};

export const itemQty = {
  position: 'absolute',
  top: 1,
  right: 2,
  fontSize: '0.5rem',
  color: '#d4af37',
  fontWeight: 700,
};

export const itemBtns = {
  position: 'absolute',
  bottom: 1,
  right: 1,
  display: 'flex',
  gap: 1,
};

export const tinyBtn = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  borderRadius: 2,
  color: '#fff',
  fontSize: '0.55rem',
  padding: '1px 3px',
  cursor: 'pointer',
  lineHeight: 1.2,
};

export const overflowSection = {
  borderTop: '1px solid rgba(255,255,255,0.07)',
  paddingTop: 6,
};

export const overflowLabel = {
  fontSize: '0.65rem',
  color: 'rgba(200,180,140,0.4)',
  fontFamily: "'Cinzel', Georgia, serif",
  marginBottom: 4,
  textTransform: 'uppercase',
};

export const overflowItem = {
  fontSize: '0.72rem',
  color: 'rgba(200,180,140,0.7)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 4,
  padding: '3px 7px',
  display: 'flex',
  alignItems: 'center',
};

export const tooltipWrapper = {
  position: 'absolute',
  zIndex: 100,
  pointerEvents: 'none',
};

export const tooltip = {
  background: 'linear-gradient(180deg, #2a1a08 0%, #1a0e04 100%)',
  border: '1px solid rgba(212,175,55,0.45)',
  borderRadius: 6,
  padding: '8px 11px',
  minWidth: 160,
  maxWidth: 240,
  boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
  whiteSpace: 'normal',
};

export const tooltipTitle = {
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#d4af37',
  marginBottom: 5,
};

export const tooltipLine = {
  fontSize: '0.7rem',
  color: 'rgba(200,180,140,0.8)',
  lineHeight: 1.5,
};
