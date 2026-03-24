import { useState, useEffect, useRef } from 'react';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * AutoSaveIndicator — Subtle HUD-matched save indicator.
 * Shows a magical rune/sigil that spins during save, morphs to checkmark on success.
 * Appears briefly in top-right, non-intrusive.
 */

let _triggerSave = null;

export function notifySaveStart() {
  _triggerSave?.('saving');
}

export function notifySaveComplete() {
  _triggerSave?.('saved');
}

export function notifySaveError() {
  _triggerSave?.('error');
}

export default function AutoSaveIndicator() {
  const [state, setState] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => {
    _triggerSave = (newState) => {
      setState(newState);
      clearTimeout(timerRef.current);
      if (newState === 'saved' || newState === 'error') {
        timerRef.current = setTimeout(() => setState('idle'), 2500);
      }
    };
    return () => {
      _triggerSave = null;
      clearTimeout(timerRef.current);
    };
  }, []);

  if (state === 'idle') return null;

  const cfg = {
    saving: { color: '#d4af37', glowColor: 'rgba(212,175,55,0.3)', text: 'Inscribing...' },
    saved:  { color: '#5dbd84', glowColor: 'rgba(46,204,113,0.3)', text: 'Saved' },
    error:  { color: '#e0645c', glowColor: 'rgba(231,76,60,0.3)', text: 'Failed' },
  }[state];

  return (
    <div style={{
      position: 'absolute',
      top: 48,
      right: 12,
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '4px 10px 4px 6px',
      background: 'linear-gradient(135deg, rgba(16,12,6,0.88), rgba(10,8,4,0.92))',
      border: `1px solid ${cfg.color}33`,
      borderRadius: 6,
      boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 8px ${cfg.glowColor}`,
      animation: state !== 'saving' ? 'saveIndicatorOut 2.5s ease forwards' : 'saveIndicatorIn 0.2s ease-out',
      pointerEvents: 'none',
    }}>
      {/* Rune sigil icon */}
      <div style={{
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {state === 'saving' ? (
          /* Spinning rune circle */
          <svg width="20" height="20" viewBox="0 0 20 20"
            style={{ animation: 'saveRuneSpin 1.5s linear infinite' }}
          >
            <circle cx="10" cy="10" r="8" fill="none"
              stroke={cfg.color} strokeWidth="1.2" opacity="0.3" />
            <circle cx="10" cy="10" r="8" fill="none"
              stroke={cfg.color} strokeWidth="1.2"
              strokeDasharray="16 34" strokeLinecap="round" opacity="0.8" />
            {/* Inner rune dot */}
            <circle cx="10" cy="10" r="2" fill={cfg.color} opacity="0.6" />
            {/* Cardinal ticks */}
            <line x1="10" y1="1" x2="10" y2="3" stroke={cfg.color} strokeWidth="1" opacity="0.4" />
            <line x1="19" y1="10" x2="17" y2="10" stroke={cfg.color} strokeWidth="1" opacity="0.4" />
          </svg>
        ) : state === 'saved' ? (
          /* Success checkmark with glow */
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="8" fill="none" stroke={cfg.color} strokeWidth="1" opacity="0.4" />
            <polyline points="5,9 8,12 13,6" fill="none"
              stroke={cfg.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 3px ${cfg.glowColor})` }} />
          </svg>
        ) : (
          /* Error X mark */
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="8" fill="none" stroke={cfg.color} strokeWidth="1" opacity="0.4" />
            <line x1="6" y1="6" x2="12" y2="12" stroke={cfg.color} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="6" x2="6" y2="12" stroke={cfg.color} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Status text */}
      <span style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '0.52rem',
        color: cfg.color,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 600,
        textShadow: `0 0 4px ${cfg.glowColor}`,
        opacity: 0.85,
      }}>
        {cfg.text}
      </span>

      <style>{`
        @keyframes saveRuneSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes saveIndicatorIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes saveIndicatorOut {
          0% { opacity: 1; }
          65% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
