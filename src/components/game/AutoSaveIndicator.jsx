import { useState, useEffect, useRef } from 'react';

/**
 * AutoSaveIndicator — Shows a small spinning/checkmark icon when the game
 * auto-saves to Supabase. Appears briefly in the top-right area.
 *
 * Uses a global trigger function so any save call can notify it.
 */

let _triggerSave = null;

/** Call this when a save starts */
export function notifySaveStart() {
  _triggerSave?.('saving');
}

/** Call this when a save completes */
export function notifySaveComplete() {
  _triggerSave?.('saved');
}

/** Call this on save error */
export function notifySaveError() {
  _triggerSave?.('error');
}

export default function AutoSaveIndicator() {
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  const timerRef = useRef(null);

  useEffect(() => {
    _triggerSave = (newState) => {
      setState(newState);
      clearTimeout(timerRef.current);
      if (newState === 'saved' || newState === 'error') {
        timerRef.current = setTimeout(() => setState('idle'), 2000);
      }
    };
    return () => {
      _triggerSave = null;
      clearTimeout(timerRef.current);
    };
  }, []);

  if (state === 'idle') return null;

  const config = {
    saving: { icon: '◌', color: 'rgba(212,175,55,0.6)', text: 'Saving...', spin: true },
    saved:  { icon: '✓', color: 'rgba(46,204,113,0.7)', text: 'Saved', spin: false },
    error:  { icon: '✗', color: 'rgba(231,76,60,0.7)', text: 'Save failed', spin: false },
  }[state];

  return (
    <div style={{
      position: 'absolute',
      top: 48,
      right: 12,
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      background: 'rgba(10,8,6,0.75)',
      border: `1px solid ${config.color}44`,
      borderRadius: 4,
      animation: state === 'saved' || state === 'error' ? 'saveFadeOut 2s ease forwards' : 'none',
      pointerEvents: 'none',
    }}>
      <span style={{
        fontSize: '0.7rem',
        color: config.color,
        display: 'inline-block',
        animation: config.spin ? 'saveSpin 1s linear infinite' : 'none',
      }}>
        {config.icon}
      </span>
      <span style={{
        fontSize: '0.5rem',
        color: config.color,
        fontFamily: "'Cinzel', Georgia, serif",
        letterSpacing: '0.5px',
      }}>
        {config.text}
      </span>

      <style>{`
        @keyframes saveSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes saveFadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
