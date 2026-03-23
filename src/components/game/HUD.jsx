import useStore from '../../store/useStore';
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
  const inCombat = encounter.phase !== 'idle';

  if (!myCharacter) return null;

  const cd = myCharacter.character_data || {};

  // In combat: find live HP from the combatants array
  const combatant = inCombat
    ? encounter.combatants?.find(c => c.id === myCharacter.id || c.name === myCharacter.name)
    : null;

  const hp = combatant?.currentHp ?? cd.currentHp ?? cd.hp ?? 0;
  const maxHp = combatant?.maxHp ?? cd.maxHp ?? 10;
  const ac = cd.ac ?? combatant?.ac ?? 10;
  const conditions = combatant?.conditions ?? cd.conditions ?? [];

  // Spell slots: { 1: { available, max } } or { 1: 4 } (max only)
  const spellSlots = cd.spellSlots ?? {};
  const usedSlots = cd.spellSlotsUsed ?? {};
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
        </div>
      )}
    </div>
  );
}
