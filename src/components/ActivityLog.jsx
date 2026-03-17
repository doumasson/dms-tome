import { useRef, useEffect } from 'react';
import useStore from '../store/useStore';

const TYPE_COLORS = {
  roll:        { bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.2)',  text: '#d4af37' },
  'roll-request': { bg: 'rgba(100,160,240,0.08)', border: 'rgba(100,160,240,0.2)', text: '#6eb4f7' },
  combat:      { bg: 'rgba(200,60,60,0.08)',   border: 'rgba(200,60,60,0.2)',   text: '#e88' },
  narrator:    { bg: 'rgba(180,140,255,0.08)', border: 'rgba(180,140,255,0.18)', text: '#c4a0ff' },
  scene:       { bg: 'rgba(46,204,113,0.08)',  border: 'rgba(46,204,113,0.2)',  text: '#2ecc71' },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function ActivityLog() {
  const sessionLog     = useStore(s => s.sessionLog);
  const clearSessionLog = useStore(s => s.clearSessionLog);
  const topRef = useRef(null);

  // Scroll to top when new entry arrives
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionLog.length]);

  return (
    <aside className="activity-log-panel" style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Session Log</span>
        {sessionLog.length > 0 && (
          <button style={styles.clearBtn} onClick={clearSessionLog} title="Clear log">
            ✕
          </button>
        )}
      </div>

      <div style={styles.divider} />

      <div style={styles.list}>
        <div ref={topRef} />

        {sessionLog.length === 0 && (
          <p style={styles.empty}>
            Roll dice, speak to the narrator, or start combat — actions appear here.
          </p>
        )}

        {sessionLog.map((entry) => {
          const colors = TYPE_COLORS[entry.type] || TYPE_COLORS.combat;
          const isNat20 = entry.type === 'roll' && entry.title?.includes('NAT 20');
          const isNat1  = entry.type === 'roll' && entry.title?.includes('NAT 1');

          return (
            <div
              key={entry.id}
              style={{
                ...styles.entry,
                background: isNat20
                  ? 'rgba(212,175,55,0.15)'
                  : isNat1
                    ? 'rgba(200,50,50,0.15)'
                    : colors.bg,
                borderLeft: `3px solid ${isNat20 ? '#d4af37' : isNat1 ? '#e74c3c' : colors.border.replace('0.2', '0.5')}`,
              }}
            >
              <div style={styles.entryTop}>
                <span style={styles.entryIcon}>{entry.icon}</span>
                <span style={{ ...styles.entryTitle, color: isNat20 ? '#f0c868' : isNat1 ? '#e74c3c' : colors.text }}>
                  {entry.title}
                </span>
                <span style={styles.entryTime}>{timeAgo(entry.timestamp)}</span>
              </div>
              {entry.detail && (
                <p style={styles.entryDetail}>{entry.detail}</p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

const styles = {
  panel: {
    width: 210,
    minWidth: 210,
    // hidden on small screens via CSS class (see index.css)

    background: 'linear-gradient(180deg, #130c05 0%, #0e0a04 100%)',
    borderLeft: '1px solid rgba(212,175,55,0.14)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 10px',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.72rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--parchment-dim)',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.7rem',
    padding: '2px 6px',
    minHeight: 24,
    borderRadius: 4,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
    flexShrink: 0,
  },
  list: {
    overflowY: 'auto',
    flex: 1,
    padding: '8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  empty: {
    color: 'rgba(200,180,140,0.25)',
    fontSize: '0.72rem',
    fontStyle: 'italic',
    lineHeight: 1.6,
    textAlign: 'center',
    padding: '20px 8px',
    margin: 0,
  },
  entry: {
    borderRadius: '0 5px 5px 0',
    padding: '7px 9px',
    flexShrink: 0,
    animation: 'fadeIn 0.2s ease',
  },
  entryTop: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
  },
  entryIcon: {
    fontSize: '0.75rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  entryTitle: {
    fontSize: '0.76rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.02em',
    flex: 1,
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  entryTime: {
    fontSize: '0.58rem',
    color: 'rgba(200,180,140,0.3)',
    flexShrink: 0,
    fontFamily: 'monospace',
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  entryDetail: {
    margin: '3px 0 0 20px',
    fontSize: '0.68rem',
    color: 'rgba(200,180,140,0.5)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
};
