import { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import { broadcastEncounterAction } from '../../lib/liveChannel';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * EmoteSystem — Quick emoji reactions for multiplayer.
 * Players press a hotkey or click to send emotes visible to all.
 * Emotes float up with magical particle glow and fade out.
 */

const EMOTES = [
  { emoji: '⚔️', label: 'Attack!', color: '#e84040' },
  { emoji: '🛡️', label: 'Defend', color: '#4a90d9' },
  { emoji: '😂', label: 'Haha', color: '#d4af37' },
  { emoji: '👍', label: 'Nice', color: '#5cb85c' },
  { emoji: '😱', label: 'Scared', color: '#9b59b6' },
  { emoji: '🎲', label: 'Roll!', color: '#d4af37' },
  { emoji: '💀', label: 'RIP', color: '#888' },
  { emoji: '🔥', label: 'Fire', color: '#e67e22' },
  { emoji: '❤️', label: 'Love', color: '#e84040' },
  { emoji: '🎉', label: 'GG', color: '#d4af37' },
];

const EMOTE_DURATION = 3500;
const PARTICLE_COUNT = 6;

// Singleton for receiving broadcast emotes
let _addEmoteFn = null;

export function receiveEmote(playerName, emoji) {
  if (_addEmoteFn) _addEmoteFn(playerName, emoji);
}

export default function EmoteSystem() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState([]);
  const idRef = useRef(0);
  const myCharacter = useStore(s => s.myCharacter);

  const addEmote = useCallback((playerName, emoji) => {
    const id = ++idRef.current;
    const x = 20 + Math.random() * 60;
    const emoteData = EMOTES.find(e => e.emoji === emoji);
    const color = emoteData?.color || '#d4af37';
    // Generate random particle offsets
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (i / PARTICLE_COUNT) * 360 + Math.random() * 30,
      dist: 20 + Math.random() * 30,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.4,
    }));
    setActiveEmotes(prev => [...prev, { id, playerName, emoji, x, color, particles, created: Date.now() }]);
    setTimeout(() => {
      setActiveEmotes(prev => prev.filter(e => e.id !== id));
    }, EMOTE_DURATION);
  }, []);

  useEffect(() => {
    _addEmoteFn = addEmote;
    return () => { _addEmoteFn = null; };
  }, [addEmote]);

  const sendEmote = useCallback((emoji) => {
    const name = myCharacter?.name || 'Player';
    addEmote(name, emoji);
    broadcastEncounterAction({ type: 'emote', emoji, playerName: name });
    setPickerOpen(false);
  }, [myCharacter, addEmote]);

  return (
    <>
      {/* Emote trigger button — ornate gold circle */}
      <button
        onClick={() => setPickerOpen(p => !p)}
        style={{
          ...S.triggerBtn,
          ...(pickerOpen ? S.triggerBtnActive : {}),
        }}
        title="Send emote (reactions)"
      >
        <span style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 3px rgba(212,175,55,0.6))' }}>😀</span>
      </button>

      {/* Emote picker — ornate dark fantasy panel */}
      {pickerOpen && (
        <>
          {/* Backdrop to close */}
          <div
            style={S.backdrop}
            onClick={() => setPickerOpen(false)}
          />
          <div style={S.picker}>
            {/* Corner filigree accents */}
            <svg style={S.filigreeTopLeft} width="20" height="20" viewBox="0 0 20 20">
              <path d="M0,0 Q10,2 18,18" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <circle cx="2" cy="2" r="2" fill="#d4af37" opacity="0.5"/>
            </svg>
            <svg style={S.filigreeTopRight} width="20" height="20" viewBox="0 0 20 20">
              <path d="M20,0 Q10,2 2,18" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <circle cx="18" cy="2" r="2" fill="#d4af37" opacity="0.5"/>
            </svg>
            <svg style={S.filigreeBotLeft} width="20" height="20" viewBox="0 0 20 20">
              <path d="M0,20 Q10,18 18,2" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <circle cx="2" cy="18" r="2" fill="#d4af37" opacity="0.5"/>
            </svg>
            <svg style={S.filigreeBotRight} width="20" height="20" viewBox="0 0 20 20">
              <path d="M20,20 Q10,18 2,2" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <circle cx="18" cy="18" r="2" fill="#d4af37" opacity="0.5"/>
            </svg>

            {/* Header */}
            <div style={S.pickerHeader}>Emotes</div>

            {/* Gold divider */}
            <div style={S.divider} />

            {/* Emote grid */}
            <div style={S.emoteGrid}>
              {EMOTES.map(e => (
                <button
                  key={e.emoji}
                  onClick={() => sendEmote(e.emoji)}
                  style={S.emoteBtn}
                  title={e.label}
                  onMouseEnter={ev => {
                    ev.currentTarget.style.background = 'rgba(212,175,55,0.15)';
                    ev.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)';
                    ev.currentTarget.style.boxShadow = `0 0 12px ${e.color}44, inset 0 0 8px ${e.color}22`;
                  }}
                  onMouseLeave={ev => {
                    ev.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    ev.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)';
                    ev.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{e.emoji}</span>
                  <span style={S.emoteBtnLabel}>{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Floating emotes with magical particles */}
      <div style={S.emoteLayer}>
        {activeEmotes.map(emote => (
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
            {/* Magical glow backdrop */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 60,
              height: 60,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${emote.color}33 0%, transparent 70%)`,
              animation: `emoteGlow ${EMOTE_DURATION}ms ease-out forwards`,
            }} />

            {/* Particle trails */}
            {emote.particles.map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: emote.color,
                  boxShadow: `0 0 ${p.size + 2}px ${emote.color}`,
                  animation: `emoteParticle ${EMOTE_DURATION * 0.6}ms ease-out ${p.delay}s forwards`,
                  '--px': `${Math.cos(p.angle * Math.PI / 180) * p.dist}px`,
                  '--py': `${Math.sin(p.angle * Math.PI / 180) * p.dist}px`,
                  opacity: 0,
                }}
              />
            ))}

            {/* Emoji */}
            <div style={{
              ...S.emoteEmoji,
              filter: `drop-shadow(0 0 8px ${emote.color}88)`,
            }}>
              {emote.emoji}
            </div>

            {/* Player name tag */}
            <div style={S.emoteName}>
              <span style={S.emoteNameInner}>{emote.playerName}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes emoteFloat {
          0% { transform: translateX(-50%) translateY(0) scale(0.3); opacity: 0; }
          8% { transform: translateX(-50%) translateY(-15px) scale(1.3); opacity: 1; }
          15% { transform: translateX(-50%) translateY(-30px) scale(1); opacity: 1; }
          75% { opacity: 0.9; }
          100% { transform: translateX(-50%) translateY(-140px) scale(0.7); opacity: 0; }
        }
        @keyframes emoteGlow {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          10% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
          30% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        @keyframes emoteParticle {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.9; }
          50% { opacity: 0.7; }
          100% { transform: translate(-50%, -50%) translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes emotePickerIn {
          0% { transform: translateY(10px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
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
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, rgba(26,16,6,0.95), rgba(13,10,4,0.95))',
    border: '2px solid rgba(212,175,55,0.4)',
    boxShadow: '0 0 8px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.1)',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
    padding: 0,
  },
  triggerBtnActive: {
    borderColor: 'rgba(212,175,55,0.7)',
    boxShadow: '0 0 16px rgba(212,175,55,0.3), inset 0 0 8px rgba(212,175,55,0.15)',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 95,
  },
  picker: {
    position: 'absolute',
    bottom: 106,
    right: 12,
    zIndex: 96,
    width: 240,
    background: 'linear-gradient(170deg, rgba(26,16,6,0.97) 0%, rgba(13,10,4,0.98) 100%)',
    border: '2px solid rgba(212,175,55,0.45)',
    borderRadius: 10,
    padding: '14px 12px 10px',
    boxShadow: `
      0 8px 32px rgba(0,0,0,0.8),
      0 0 20px rgba(212,175,55,0.1),
      inset 0 1px 0 rgba(212,175,55,0.15),
      inset 0 -1px 0 rgba(0,0,0,0.3)
    `,
    animation: 'emotePickerIn 0.2s ease-out',
  },
  pickerHeader: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '0.75rem',
    color: '#d4af37',
    textAlign: 'center',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    textShadow: '0 0 8px rgba(212,175,55,0.4)',
    marginBottom: 6,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
    marginBottom: 8,
  },
  emoteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 4,
  },
  emoteBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(212,175,55,0.2)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    transition: 'all 0.2s ease',
    padding: '4px 2px',
  },
  emoteBtnLabel: {
    fontSize: '0.5rem',
    color: 'rgba(212,175,55,0.5)',
    fontFamily: '"Cinzel", serif',
    letterSpacing: '0.05em',
    lineHeight: 1,
  },
  // Filigree SVG positions
  filigreeTopLeft: { position: 'absolute', top: 4, left: 4, pointerEvents: 'none' },
  filigreeTopRight: { position: 'absolute', top: 4, right: 4, pointerEvents: 'none' },
  filigreeBotLeft: { position: 'absolute', bottom: 4, left: 4, pointerEvents: 'none' },
  filigreeBotRight: { position: 'absolute', bottom: 4, right: 4, pointerEvents: 'none' },
  emoteLayer: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1300,
    overflow: 'hidden',
  },
  emoteEmoji: {
    fontSize: '2.2rem',
    position: 'relative',
    zIndex: 2,
    textShadow: '0 2px 10px rgba(0,0,0,0.6)',
  },
  emoteName: {
    position: 'relative',
    zIndex: 2,
    marginTop: 3,
  },
  emoteNameInner: {
    fontSize: '0.55rem',
    fontFamily: '"Cinzel", serif',
    color: '#d4af37',
    fontWeight: 600,
    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
    background: 'rgba(13,10,4,0.7)',
    padding: '1px 6px',
    borderRadius: 3,
    border: '1px solid rgba(212,175,55,0.2)',
    letterSpacing: '0.05em',
  },
};
