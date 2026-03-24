import { useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

/**
 * LoadingTips — Shows random gameplay tips during area transitions.
 * Appears briefly when currentAreaId changes (area loading).
 * Also shows during initial game load.
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
    // Show tip on area change
    if (currentAreaId && currentAreaId !== prevAreaRef.current) {
      setTip(getRandomTip());
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    }
    prevAreaRef.current = currentAreaId;
    return () => clearTimeout(timerRef.current);
  }, [currentAreaId]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1400,
      maxWidth: 400,
      width: '90vw',
      pointerEvents: 'none',
      animation: 'tipFadeInOut 3s ease forwards',
    }}>
      <div style={{
        background: 'rgba(10,8,6,0.9)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 8,
        padding: '10px 16px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          fontSize: '0.55rem',
          color: 'rgba(212,175,55,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          fontWeight: 700,
          marginBottom: 4,
          fontFamily: "'Cinzel', Georgia, serif",
        }}>
          Tip
        </div>
        <div style={{
          fontSize: '0.72rem',
          color: '#d4c090',
          lineHeight: 1.4,
        }}>
          {tip}
        </div>
      </div>

      <style>{`
        @keyframes tipFadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
