import { useState } from 'react';
import useStore from '../store/useStore';
import { getClassResources } from '../lib/classResources';
import { getAbilityModifier, formatModifier } from '../lib/dice';
import { isCaster, SLOT_COLORS } from '../lib/spellSlots';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

// ── Resource Tracker ──────────────────────────────────────────────────────────

function ResourceTracker({ char }) {
  const spendResource = useStore(s => s.spendResource);
  const gainResource  = useStore(s => s.gainResource);

  const defs = getClassResources(char.class, char.level, char.stats);
  if (defs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {defs.map(def => {
        if (def.max === Infinity) return null;
        const used = char.resourcesUsed?.[def.name] ?? 0;
        const available = Math.max(0, def.max - used);

        // Pool resource (e.g. Lay on Hands HP)
        if (def.type === 'pool') {
          return (
            <div key={def.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={s.resLabel}>{def.icon} {def.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({def.resetOn} rest)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => spendResource(char.id, def.name)} disabled={available <= 0}
                  style={{ ...s.pip, width: 24, height: 24, fontSize: '0.8rem', opacity: available > 0 ? 1 : 0.3 }}>−</button>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: available > 0 ? 'var(--text-primary)' : 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                  {available} / {def.max} HP
                </span>
                <button onClick={() => gainResource(char.id, def.name)} disabled={used <= 0}
                  style={{ ...s.pip, width: 24, height: 24, fontSize: '0.8rem', opacity: used > 0 ? 1 : 0.3 }}>+</button>
              </div>
            </div>
          );
        }

        // Pip resource
        const maxPips = Math.min(def.max, 20);
        return (
          <div key={def.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={s.resLabel}>{def.icon} {def.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {available}/{def.max} · {def.resetOn} rest
                </span>
                <button onClick={() => gainResource(char.id, def.name)} disabled={used <= 0}
                  style={{ ...s.pipBtn, opacity: used > 0 ? 1 : 0.3 }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Array.from({ length: maxPips }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i < available) spendResource(char.id, def.name);
                    else gainResource(char.id, def.name);
                  }}
                  title={i < available ? `Spend ${def.name}` : `Recover ${def.name}`}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', padding: 0, border: 'none',
                    background: i < available ? '#9b59b6' : '#2a1a0a',
                    boxShadow: i < available ? '0 0 4px rgba(155,89,182,0.5)' : 'none',
                    transition: 'background 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Spell Slot Tracker ───────────────────────────────────────────────────────

function SpellSlotTracker({ char }) {
  const castSpell       = useStore(s => s.castSpell);
  const recoverSpellSlot = useStore(s => s.recoverSpellSlot);

  const slots = char.spellSlots;
  if (!slots || Object.keys(slots).length === 0) return null;

  const levels = Object.keys(slots).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {levels.map(lvl => {
        const { total, used } = slots[lvl];
        const available = total - used;
        const color = SLOT_COLORS[lvl - 1] || '#aaa';
        const ordinals = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
        return (
          <div key={lvl}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color }}>{ordinals[lvl - 1]} Level</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{available}/{total}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  onClick={() => i < available ? castSpell(char.id, lvl) : recoverSpellSlot(char.id, lvl)}
                  title={i < available ? `Cast ${ordinals[lvl-1]}-level spell` : 'Recover slot'}
                  style={{
                    width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                    border: `2px solid ${color}`,
                    background: i < available ? color : 'transparent',
                    opacity: i < available ? 0.9 : 0.35,
                    padding: 0, transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function CharDetailPanel({ character, combatant, compact = false }) {
  const [showAbilities, setShowAbilities] = useState(false);

  if (!character && !combatant) return null;

  const char = character || {};
  const c = combatant || {};
  const name = char.name || c.name || '—';
  const stats = char.stats || c.stats || {};
  const hp = combatant ? c.currentHp : (char.currentHp ?? char.maxHp ?? 0);
  const maxHp = combatant ? c.maxHp : (char.maxHp ?? 0);
  const ac = char.ac || c.ac || '—';
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';

  const attacks = char.weapons?.map(w =>
    typeof w === 'string' ? { name: w, attackBonus: '+0', damage: '1d6' } : w
  ) || c.attacks || [];

  const abilities = char.abilities || char.features || [];
  const spells = char.spells || [];

  return (
    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        {char.portrait && (
          <img src={char.portrait} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-gold)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: '0.88rem', color: 'var(--gold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          {(char.race || char.class) && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {[char.race, char.class && `${char.class} ${char.level ? `(Lv ${char.level})` : ''}`].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, height: 5, background: '#2a1a0a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hpPct * 100}%`, background: hpColor, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{hp}/{maxHp} HP</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>AC {ac}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {Object.keys(stats).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 10 }}>
          {STAT_KEYS.map(k => {
            const val = stats[k] || 10;
            const mod = getAbilityModifier(val);
            return (
              <div key={k} style={{ background: '#0f0a04', borderRadius: 4, padding: '4px 2px', textAlign: 'center', border: '1px solid #2a1a0a' }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{STAT_LABELS[k]}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.1 }}>{val}</div>
                <div style={{ fontSize: '0.62rem', color: mod >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatModifier(mod)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resources */}
      {char.class && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 6 }}>RESOURCES</div>
          <ResourceTracker char={char} />
          {getClassResources(char.class, char.level, char.stats).length === 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tracked resources for {char.class}</div>
          )}
        </div>
      )}

      {/* Spell Slots */}
      {char.spellSlots && Object.keys(char.spellSlots).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 6 }}>SPELL SLOTS</div>
          <SpellSlotTracker char={char} />
        </div>
      )}

      {/* Attacks */}
      {attacks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 5 }}>ATTACKS</div>
          {attacks.map((atk, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #1a1006' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{atk.name || atk}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {atk.attackBonus || atk.bonus || ''} · {atk.damage || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Abilities / Spells (collapsible) */}
      {!compact && (abilities.length > 0 || spells.length > 0) && (
        <div>
          <button
            onClick={() => setShowAbilities(v => !v)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem', padding: '4px 0', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {showAbilities ? '▾' : '▸'} ABILITIES & SPELLS ({abilities.length + spells.length})
          </button>
          {showAbilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {[...abilities, ...spells].map((item, i) => (
                <div key={i} style={{ background: '#0f0a04', borderRadius: 4, padding: '5px 8px', border: '1px solid #2a1a0a' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {typeof item === 'string' ? item : (item.name || item.spell_name || '—')}
                  </div>
                  {typeof item !== 'string' && item.description && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  resLabel: {
    fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
  },
  pip: {
    background: '#2a1a0a', border: '1px solid #3a2a1a',
    color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pipBtn: {
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 4,
    fontSize: '0.7rem', padding: '1px 5px',
  },
};
