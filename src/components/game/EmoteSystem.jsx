import { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import { broadcastEncounterAction } from '../../lib/liveChannel';

/**
 * EmoteSystem — Quick emoji reactions for multiplayer.
 * Players press a hotkey or click to send emotes visible to all.
 * Emotes float up from the bottom and fade out.
 */

const EMOTES = [
  { emoji: '⚔️', label: 'Attack!', key: null },
  { emoji: '🛡️', label: 'Defend', key: null },
  { emoji: '😂', label: 'Haha', key: null },
  { emoji: '👍', label: 'Nice', key: null },
  { emoji: '😱', label: 'Scared', key: null },
  { emoji: '🎲', label: 'Roll!', key: null },
  { emoji: '💀', label: 'RIP', key: null },
  { emoji: '🔥', label: 'Fire', key: null },
  { emoji: '❤️', label: 'Love', key: null },
  { emoji: '🎉', label: 'GG', key: null },
];

const EMOTE_DURATION = 3000;

// Singleton for receiving broadcast emotes
let _addEmoteFn = null;

export function receiveEmote(playerName, emoji) {
  if (_addEmoteFn) _addEmoteFn(playerName, emoji);
}

export default function EmoteSystem() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState([]); // { id, playerName, emoji, y, opacity }
  const idRef = useRef(0);
  const myCharacter = useStore(s => s.myCharacter);

  const addEmote = useCallback((playerName, emoji) => {
    const id = ++idRef.current;
    // Random horizontal position
    const x = 20 + Math.random() * 60; // 20-80% of screen width
    setActiveEmotes(prev => [...prev, { id, playerName, emoji, x, created: Date.now() }]);
    setTimeout(() => {
      setActiveEmotes(prev => prev.filter(e => e.id !== id));
    }, EMOTE_DURATION);
  }, []);

  useEffect(() => {
    _addEmoteFn = addEmote;
    return () => { _addEmoteFn = null; };
  }, [addEmote]);

  // Broadcast emotes are received via App.jsx encounter-action handler
  // which calls receiveEmote() directly

  const sendEmote = useCallback((emoji) => {
    const name = myCharacter?.name || 'Player';
    addEmote(name, emoji);
    broadcastEncounterAction({ type: 'emote', emoji, playerName: name });
    setPickerOpen(false);
  }, [myCharacter, addEmote]);

  return (
    <>
      {/* Emote trigger button */}
      <button
        onClick={() => setPickerOpen(p => !p)}
        style={S.triggerBtn}
        title="Send emote (reactions)"
      >
        😀
      </button>

      {/* Emote picker */}
      {pickerOpen && (
        <div style={S.picker}>
          {EMOTES.map(e => (
            <button
              key={e.emoji}
              onClick={() => sendEmote(e.emoji)}
              style={S.emoteBtn}
              title={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Floating emotes */}
      <div style={S.emoteLayer}>
        {activeEmotes.map(emote => {
          const age = (Date.now() - emote.created) / EMOTE_DURATION;
          return (
            <div
              key={emote.id}
              style={{
                position: 'absolute',
                left: `${emote.x}%`,
                bottom: '15%',
                transform: 'translateX(-50%)',
                animation: `emoteFloat ${EMOTE_DURATION}ms ease-out forwards`,
                pointerEvents: 'none',
                textAlign: 'center',
              }}
            >
              <div style={S.emoteEmoji}>{emote.emoji}</div>
              <div style={S.emoteName}>{emote.playerName}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes emoteFloat {
          0% { transform: translateX(-50%) translateY(0) scale(0.5); opacity: 0; }
          10% { transform: translateX(-50%) translateY(-20px) scale(1.2); opacity: 1; }
          20% { transform: translateX(-50%) translateY(-40px) scale(1); opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateX(-50%) translateY(-120px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </>
  );
}

const S = {
  triggerBtn: {
    position: 'absolute',
    bottom: 58,
    right: 12,
    zIndex: 95,
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(10,8,6,0.85)',
    border: '1px solid rgba(212,175,55,0.3)',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    padding: 0,
  },
  picker: {
    position: 'absolute',
    bottom: 96,
    right: 12,
    zIndex: 96,
    background: 'rgba(10,8,6,0.95)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 8,
    padding: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 4,
    boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
    animation: 'tooltipFadeIn 0.15s ease-out',
  },
  emoteBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.15)',
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    padding: 0,
  },
  emoteLayer: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1300,
    overflow: 'hidden',
  },
  emoteEmoji: {
    fontSize: '2rem',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))',
  },
  emoteName: {
    fontSize: '0.55rem',
    color: 'rgba(212,175,55,0.7)',
    fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    marginTop: 2,
  },
};
