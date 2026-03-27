import { useState } from 'react';

export default function ChapterCompleteModal({ campaign, onContinue, onEndSession }) {
  const [continuing, setContinuing] = useState(false);
  const chapter = campaign?.chapter || 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Corner filigree */}
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.4" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.4" />
        </svg>

        <div style={styles.icon}>&#x2694;</div>
        <h2 style={styles.title}>Chapter {chapter} Complete!</h2>
        <p style={styles.description}>
          {campaign?.chapterMilestone?.description || 'You have reached a major milestone in your adventure.'}
        </p>

        <div style={styles.buttons}>
          <button
            onClick={() => { setContinuing(true); onContinue(); }}
            disabled={continuing}
            style={continuing ? { ...styles.continueBtn, opacity: 0.7, cursor: 'wait' } : styles.continueBtn}
          >
            {continuing ? 'Forging next chapter...' : '\uD83D\uDD25 Continue the Story'}
          </button>
          <button onClick={onEndSession} style={styles.endBtn}>
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    position: 'relative',
    background: 'linear-gradient(135deg, #1a1207 0%, #2a1f0e 50%, #1a1207 100%)',
    border: '2px solid #d4af37',
    borderRadius: 12,
    padding: '40px 32px 32px',
    maxWidth: 480,
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
    filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.4))',
  },
  title: {
    fontFamily: 'Cinzel, serif',
    color: '#d4af37',
    fontSize: 26,
    margin: '0 0 12px',
    letterSpacing: 1,
    textShadow: '0 0 12px rgba(212, 175, 55, 0.3)',
  },
  description: {
    color: '#c4b899',
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 28px',
    fontFamily: 'Georgia, serif',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  continueBtn: {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941e 100%)',
    color: '#1a1207',
    border: 'none',
    borderRadius: 8,
    padding: '14px 32px',
    fontSize: 16,
    fontFamily: 'Cinzel, serif',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 1,
    width: '100%',
    maxWidth: 320,
    boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)',
  },
  endBtn: {
    background: 'transparent',
    color: '#8a7e6b',
    border: '1px solid rgba(138, 126, 107, 0.3)',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontFamily: 'Cinzel, serif',
    cursor: 'pointer',
    letterSpacing: 0.5,
    width: '100%',
    maxWidth: 320,
  },
};
