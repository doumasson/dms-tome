import { useState, useCallback } from 'react';
import useStore from '../../store/useStore';
import { setMood, stopMusic, setMusicVolume, getMusicState } from '../../lib/ambientMusic';
import { TimeDisplay } from './DayNightOverlay';
import { xpForLevel } from '../LevelUpModal';
import './HUD.css';

/**
 * HUD Component - Character Status Display
 * Positioned in top-left of map area
 * Shows: HP bar, AC badge, spell slots, conditions
 * CSS styling only, no external images
 */
export default function HUD() {
  const myCharacter = useStore(s => s.myCharacter);
  const encounter = useStore(s => s.encounter);
  const rollDeathSave = useStore(s => s.rollDeathSave);
  const inCombat = encounter?.phase === 'combat';

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
    <div className="hud-container">
      {/* HP Bar */}
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

      {/* Time & Music */}
      <div className="hud-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TimeDisplay />
        <MusicToggle />
      </div>

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

function XpBar({ character }) {
  if (!character) return null;
  const xp = character.xp ?? 0;
  const level = character.level ?? 1;
  if (level >= 20) {
    return (
      <div className="hud-section hud-xp">
        <div className="xp-label">Lv {level}</div>
        <div className="xp-text" style={{ color: '#ffd700' }}>MAX</div>
      </div>
    );
  }
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const pct = xpNeeded > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpNeeded)) : 1;

  return (
    <div className="hud-section hud-xp">
      <div className="xp-header">
        <span className="xp-label">Lv {level}</span>
        <span className="xp-text">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

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
