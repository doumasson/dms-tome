import { useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * LoadingTips — Shows random gameplay tips during area transitions.
 * Styled with dark vignette background and ornate text framing.
 */

const TIPS = [
  'Press WASD or click a tile to move your character.',
  'Ctrl+Click the map to ping a location for your party.',
  'Press E near an NPC to start a conversation.',
  'Back-line party members get advantage on trap saving throws.',
  'Short rests let you spend hit dice to recover HP.',
  'Long rests restore all HP, spell slots, and class resources.',
  'The Narrator rolls for enemies — you roll for yourself.',
  'Concentration spells end if you fail a CON save when damaged.',
  'Press ? at any time to see all keyboard shortcuts.',
  'Explore thoroughly — NPCs may have side quests for you.',
  'Weather changes automatically as time passes in the world.',
  'Each class has unique actions available during combat.',
  'Prone creatures have disadvantage on attack rolls.',
  'Use the formation panel to set who leads the march.',
  'Invisible creatures can still be heard — advantage on attacks.',
  'Healing potions can be used as a bonus action in combat.',
  'Some enemies resist certain damage types. Adapt your strategy!',
  "The Narrator adapts to your choices — there's no wrong answer.",
  'Resting in dangerous areas may trigger random encounters.',
  'Check the minimap to spot exits and NPCs at a glance.',
  'Your XP bar shows progress toward the next level.',
  'Faction reputation affects NPC prices and dialogue.',
  'Spell slots recover on long rests (except Warlock pact slots).',
  'Click enemy tokens during combat to see their stats.',
  'Send emotes to communicate with your party during gameplay.',
];

function getRandomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

export default function LoadingTips() {
  const currentAreaId = useStore(s => s.currentAreaId);
  const [visible, setVisible] = useState(false);
  const [tip, setTip] = useState(getRandomTip);
  const prevAreaRef = useRef(currentAreaId);
  const timerRef = useRef(null);

  useEffect(() => {
    if (currentAreaId && currentAreaId !== prevAreaRef.current) {
      setTip(getRandomTip());
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3500);
    }
    prevAreaRef.current = currentAreaId;
    return () => clearTimeout(timerRef.current);
  }, [currentAreaId]);

  if (!visible) return null;

  return (
    <div style={S.wrapper}>
      {/* Dark vignette backdrop */}
      <div style={S.vignette} />

      {/* Ornate tip card */}
      <div style={S.card}>
        {/* Top ornamental bar */}
        <svg width="100%" height="8" viewBox="0 0 300 8" preserveAspectRatio="none" style={S.ornamentBar}>
          <line x1="0" y1="4" x2="120" y2="4" stroke="#d4af37" strokeWidth="0.5" opacity="0.35" />
          <polygon points="140,0 150,4 140,8 130,4" fill="#d4af37" opacity="0.4" />
          <polygon points="160,0 170,4 160,8 150,4" fill="#d4af37" opacity="0.4" />
          <line x1="180" y1="4" x2="300" y2="4" stroke="#d4af37" strokeWidth="0.5" opacity="0.35" />
        </svg>

        {/* Label */}
        <div style={S.label}>
          <span style={S.labelDash}>—</span>
          <span style={S.labelText}>Adventurer's Wisdom</span>
          <span style={S.labelDash}>—</span>
        </div>

        {/* Tip text */}
        <div style={S.tipText}>{tip}</div>

        {/* Bottom ornamental bar */}
        <svg width="100%" height="8" viewBox="0 0 300 8" preserveAspectRatio="none" style={S.ornamentBar}>
          <line x1="0" y1="4" x2="130" y2="4" stroke="#d4af37" strokeWidth="0.5" opacity="0.3" />
          <circle cx="150" cy="4" r="2.5" fill="none" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
          <circle cx="150" cy="4" r="1" fill="#d4af37" opacity="0.35" />
          <line x1="170" y1="4" x2="300" y2="4" stroke="#d4af37" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>

      <style>{`
        @keyframes tipSlideIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.95); }
          12% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          82% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
        }
        @keyframes vignetteIn {
          0% { opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const S = {
  wrapper: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1400,
    maxWidth: 420,
    width: '92vw',
    pointerEvents: 'none',
    animation: 'tipSlideIn 3.5s ease forwards',
  },
  vignette: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
    pointerEvents: 'none',
    animation: 'vignetteIn 3.5s ease forwards',
    zIndex: -1,
  },
  card: {
    position: 'relative',
    background: `
      radial-gradient(ellipse at 50% 30%, rgba(40,30,12,0.4) 0%, transparent 60%),
      linear-gradient(180deg, rgba(16,12,6,0.95) 0%, rgba(10,8,4,0.97) 100%)
    `,
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 8,
    padding: '16px 22px 14px',
    textAlign: 'center',
    boxShadow: `
      0 8px 32px rgba(0,0,0,0.7),
      0 0 20px rgba(212,175,55,0.05),
      inset 0 1px 0 rgba(212,175,55,0.1),
      inset 0 -1px 0 rgba(0,0,0,0.2)
    `,
  },
  ornamentBar: {
    display: 'block',
    margin: '0 auto',
    width: '80%',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: '6px 0 8px',
  },
  labelDash: {
    color: 'rgba(212,175,55,0.25)',
    fontSize: '0.7rem',
  },
  labelText: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '0.58rem',
    color: 'rgba(212,175,55,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontWeight: 700,
    textShadow: '0 0 6px rgba(212,175,55,0.15)',
  },
  tipText: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.82rem',
    color: '#d4c090',
    lineHeight: 1.5,
    margin: '4px 0 10px',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
};
