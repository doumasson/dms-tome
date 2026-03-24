import { useState, useCallback, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';
import { setMood, stopMusic, setMusicVolume, getMusicState } from '../../lib/ambientMusic';
import { TimeDisplay } from './DayNightOverlay';
import { xpForLevel } from '../LevelUpModal';
import './HUD.css';

const CLASS_GLOW = {
  Fighter: '#4499dd', Barbarian: '#cc5544', Paladin: '#eedd44',
  Ranger: '#44aa66', Rogue: '#cc7722', Monk: '#88bbcc',
  Wizard: '#6644cc', Sorcerer: '#aa55bb', Warlock: '#885599',
  Cleric: '#44aa66', Druid: '#558833', Bard: '#cc7799',
}

/**
 * HUD Component - Character Status Display
 * Positioned in top-left of map area
 * Shows: Name, class, HP bar, AC badge, spell slots, conditions
 * CSS styling only, no external images
 */
export default function HUD() {
  const myCharacter = useStore(s => s.myCharacter);
  const encounter = useStore(s => s.encounter);
  const rollDeathSave = useStore(s => s.rollDeathSave);
  const inCombat = encounter?.phase === 'combat';
  const [collapsed, setCollapsed] = useState(false);

  if (!myCharacter) return null;

  // In combat: find live HP from the combatants array
  const combatant = inCombat
    ? encounter.combatants?.find(c => c.id === myCharacter.id || c.name === myCharacter.name)
    : null;

  const hp = combatant?.currentHp ?? myCharacter.currentHp ?? myCharacter.hp ?? 0;
  const maxHp = combatant?.maxHp ?? myCharacter.maxHp ?? 10;
  const ac = myCharacter.ac ?? combatant?.ac ?? 10;
  const conditions = combatant?.conditions ?? myCharacter.conditions ?? [];

  // Spell slots: { 1: { available, max } } or { 1: 4 } (max only)
  const spellSlots = myCharacter.spellSlots ?? {};
  const usedSlots = myCharacter.spellSlotsUsed ?? {};
  const slotLevels = Object.entries(spellSlots)
    .map(([lv, v]) => {
      const max = typeof v === 'object' ? (v.max ?? v) : v;
      const used = usedSlots[lv] ?? 0;
      const available = typeof v === 'object' && v.available != null ? v.available : max - used;
      return { lv: parseInt(lv), max, available };
    })
    .filter(s => s.max > 0)
    .slice(0, 3);

  const hpPct = maxHp > 0 ? hp / maxHp : 1;
  const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
  const dying = hp <= 0;
  const deathSaves = combatant?.deathSaves || { successes: 0, failures: 0, stable: false };

  return (
    <div className={`hud-container ${collapsed ? 'hud-collapsed' : ''}`}>
      {/* Collapse toggle */}
      <button
        className="hud-collapse-btn"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand HUD' : 'Collapse HUD'}
      >
        {collapsed ? '▶' : '◀'}
      </button>

      {/* Character identity header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 4, padding: '0 2px',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 3,
          background: `linear-gradient(135deg, ${CLASS_GLOW[myCharacter.class] || '#4499dd'}33, transparent)`,
          border: `1px solid ${CLASS_GLOW[myCharacter.class] || '#4499dd'}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: 11, fontWeight: 700,
          color: CLASS_GLOW[myCharacter.class] || '#4499dd',
          textShadow: `0 0 6px ${CLASS_GLOW[myCharacter.class] || '#4499dd'}55`,
          flexShrink: 0,
        }}>
          {(myCharacter.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700,
            color: '#e8d5a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.1,
          }}>
            {myCharacter.name || 'Hero'}
          </div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: 8, color: '#8a7a5a',
            letterSpacing: '0.5px', lineHeight: 1.1,
          }}>
            Lv{myCharacter.level || 1} {myCharacter.class || 'Adventurer'}
          </div>
        </div>
      </div>

      {/* HP Bar — always visible */}
      <div className="hud-section hud-hp">
        <div className="hp-label">HP</div>
        <div className="hp-bar-wrapper">
          <div
            className="hp-bar"
            style={{
              width: `${Math.max(0, hpPct * 100)}%`,
              backgroundColor: hpColor,
            }}
          />
        </div>
        <div className={`hp-text ${dying ? 'dying' : ''}`}>
          {hp}/{maxHp}
        </div>
      </div>

      {/* AC Badge */}
      <div className="hud-section hud-ac">
        <div className="ac-badge">
          <div className="ac-label">AC</div>
          <div className="ac-value">{ac}</div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="hud-collapsible">
      {/* XP Progress Bar */}
      <XpBar character={myCharacter} />

      {/* Spell Slots */}
      {slotLevels.length > 0 && (
        <div className="hud-section hud-spells">
          <div className="spells-label">Spells</div>
          <div className="spell-slots-container">
            {slotLevels.map(slot => (
              <div key={`slot-${slot.lv}`} className="spell-slot-group">
                <div className="slot-level">{slot.lv}</div>
                <div className="slot-pips">
                  {Array.from({ length: slot.max }).map((_, i) => (
                    <div
                      key={`pip-${slot.lv}-${i}`}
                      className={`slot-pip ${i < slot.available ? 'available' : 'used'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      {conditions.length > 0 && (
        <div className="hud-section hud-conditions">
          <div className="conditions-label">Status</div>
          <div className="conditions-list">
            {conditions.slice(0, 4).map((cond, i) => (
              <div key={`cond-${i}`} className="condition-tag">
                {cond.length > 8 ? cond.slice(0, 8) + '.' : cond}
              </div>
            ))}
            {conditions.length > 4 && (
              <div className="condition-tag overflow">+{conditions.length - 4}</div>
            )}
          </div>
        </div>
      )}

      {/* Time, Session & Music */}
      <div className="hud-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TimeDisplay />
        <SessionTimer />
        <MusicToggle />
      </div>

      </div>{/* end hud-collapsible */}

      {/* Death Saves (when dying) */}
      {dying && (
        <div className="hud-section hud-death-saves">
          <div className="death-saves-label">Death Saves</div>
          <div className="death-saves-group">
            <div className="save-type success-saves">
              <span className="save-label">✓</span>
              <span className="save-count">{deathSaves.successes}/3</span>
            </div>
            <div className="save-type failure-saves">
              <span className="save-label">✗</span>
              <span className="save-count">{deathSaves.failures}/3</span>
            </div>
            {deathSaves.stable && (
              <div className="save-type stable-status">
                <span className="save-label">⊙</span>
                <span className="save-text">Stable</span>
              </div>
            )}
          </div>
          {!deathSaves.stable && inCombat && (
            <button
              className="death-save-button"
              onClick={() => rollDeathSave(combatant.id)}
              title="Roll a d20 death saving throw"
            >
              Roll Death Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div style={{
      fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)',
      fontFamily: 'monospace', letterSpacing: '0.5px',
    }} title="Session duration">
      {display}
    </div>
  );
}

/* PLACEHOLDER ART: needs real dark fantasy assets for production */
function XpBar({ character }) {
  if (!character) return null;
  const xp = character.xp ?? 0;
  const level = character.level ?? 1;
  const isMax = level >= 20;
  const currentLevelXp = isMax ? 0 : xpForLevel(level);
  const nextLevelXp = isMax ? 0 : xpForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const pct = isMax ? 1 : (xpNeeded > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpNeeded)) : 1);

  return (
    <div style={xpS.wrap}>
      {/* Ornate level badge */}
      <div style={xpS.badge}>
        <svg width="32" height="32" viewBox="0 0 32 32" style={xpS.badgeSvg}>
          {/* Shield shape */}
          <path d="M16,2 L28,8 L28,18 Q28,26 16,30 Q4,26 4,18 L4,8 Z"
            fill="rgba(16,12,6,0.95)" stroke="#d4af37" strokeWidth="1.2" />
          <path d="M16,4 L26,9 L26,17.5 Q26,24.5 16,28 Q6,24.5 6,17.5 L6,9 Z"
            fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.6" />
        </svg>
        <span style={xpS.badgeText}>{level}</span>
      </div>

      {/* Bar area */}
      <div style={xpS.barArea}>
        {/* XP text */}
        <div style={xpS.xpHeader}>
          <span style={xpS.xpLabelText}>Level {level}</span>
          <span style={xpS.xpAmount}>
            {isMax ? 'MAX' : `${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()}`}
          </span>
        </div>

        {/* Ornate bar track */}
        <div style={xpS.track}>
          {/* Fill */}
          <div style={{ ...xpS.fill, width: `${pct * 100}%` }}>
            {/* Shimmer effect */}
            <div style={xpS.shimmer} />
          </div>
          {/* Notch marks at 25%, 50%, 75% */}
          <div style={{ ...xpS.notch, left: '25%' }} />
          <div style={{ ...xpS.notch, left: '50%' }} />
          <div style={{ ...xpS.notch, left: '75%' }} />
          {/* End caps */}
          <div style={xpS.capLeft} />
          <div style={xpS.capRight} />
        </div>
      </div>

      <style>{`
        @keyframes xpShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

const xpS = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: 4, minWidth: 110,
  },
  badge: {
    position: 'relative', width: 32, height: 32, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.25))',
  },
  badgeSvg: { position: 'absolute', inset: 0 },
  badgeText: {
    position: 'relative', zIndex: 1,
    fontFamily: '"Cinzel", serif', fontSize: '0.7rem',
    fontWeight: 700, color: '#d4af37',
    textShadow: '0 0 5px rgba(212,175,55,0.4)',
    marginTop: 1,
  },
  barArea: { flex: 1, minWidth: 0 },
  xpHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 2, gap: 6,
  },
  xpLabelText: {
    fontFamily: '"Cinzel", serif', fontSize: '0.5rem',
    fontWeight: 700, color: '#d4af37', letterSpacing: '0.06em',
  },
  xpAmount: {
    fontFamily: '"Crimson Text", Georgia, serif', fontSize: '0.48rem',
    color: 'rgba(212,175,55,0.5)', fontWeight: 600,
  },
  track: {
    position: 'relative', height: 7,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(20,15,8,0.6))',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 3, overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
  },
  fill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    background: 'linear-gradient(180deg, #e8c44a 0%, #c9a84c 40%, #a08030 100%)',
    borderRadius: 2,
    transition: 'width 0.6s ease',
    boxShadow: '0 0 6px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
    animation: 'xpShimmer 2.5s ease-in-out infinite',
  },
  notch: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    background: 'rgba(0,0,0,0.3)', zIndex: 2,
  },
  capLeft: {
    position: 'absolute', top: -1, left: -1, bottom: -1, width: 3,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.3), rgba(160,128,48,0.2))',
    borderRadius: '3px 0 0 3px', zIndex: 3,
  },
  capRight: {
    position: 'absolute', top: -1, right: -1, bottom: -1, width: 3,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.3), rgba(160,128,48,0.2))',
    borderRadius: '0 3px 3px 0', zIndex: 3,
  },
};

function MusicToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('dm-music') !== 'off');
  const [showVolume, setShowVolume] = useState(false);
  const [vol, setVol] = useState(() => parseFloat(localStorage.getItem('dm-music-vol') || '0.15'));

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('dm-music', next ? 'on' : 'off');
    if (next) {
      setMood('exploration'); // restart
    } else {
      stopMusic(0.5);
    }
  }, [enabled]);

  const handleVol = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    setMusicVolume(v);
    localStorage.setItem('dm-music-vol', String(v));
  }, []);

  return (
    <div className="hud-section hud-music">
      <button
        className="music-toggle-btn"
        onClick={toggle}
        onContextMenu={(e) => { e.preventDefault(); setShowVolume(v => !v); }}
        title={enabled ? 'Music on (click to mute, right-click for volume)' : 'Music off (click to enable)'}
      >
        {enabled ? '♫' : '♫̸'}
      </button>
      {showVolume && (
        <input
          type="range" min="0" max="0.4" step="0.01" value={vol}
          onChange={handleVol}
          className="music-volume-slider"
        />
      )}
    </div>
  );
}
