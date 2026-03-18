import { useRef } from 'react';
import useStore from '../store/useStore';

// 5e condition mechanics — shown as tooltip on hover
const CONDITION_TIPS = {
  'Blinded':       'Attacks: disadvantage. Attacks vs you: advantage.',
  'Charmed':       'Cannot attack the charmer. Charmer has adv on social checks.',
  'Deafened':      'Cannot hear. Fails checks requiring hearing.',
  'Exhaustion':    'Stacks 1–6. Each level applies increasing penalties.',
  'Frightened':    'Attacks: disadvantage while source of fear is visible.',
  'Grappled':      'Speed = 0.',
  'Incapacitated': 'Cannot take actions or reactions.',
  'Invisible':     'Attacks: advantage. Attacks vs you: disadvantage.',
  'Paralyzed':     'Incapacitated. Auto-fail STR/DEX saves. Melee attacks: auto-crit.',
  'Petrified':     'Incapacitated. Resistant to all damage. Auto-fail STR/DEX saves.',
  'Poisoned':      'Attack rolls and ability checks: disadvantage.',
  'Prone':         'Attacks: disadvantage. Melee attacks vs you: advantage.',
  'Restrained':    'Speed = 0. Attacks: disadvantage. Attacks vs you: advantage.',
  'Stunned':       'Incapacitated. Auto-fail STR/DEX saves. Attacks vs you: advantage.',
  'Unconscious':   'Incapacitated. Drops items. Auto-fail STR/DEX. Melee: auto-crit.',
  'Concentration': 'Maintaining concentration on a spell. Taking damage requires CON save.',
};

// Ordinal label for spell slot levels
function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

// Always-visible strip showing the current player's vital stats.
// HP, AC, movement (in combat), spell slots, active conditions.
export default function PlayerStatusBar() {
  const myCharacter = useStore(s => s.myCharacter);
  const encounter   = useStore(s => s.encounter);
  const inCombat    = encounter.phase !== 'idle';

  if (!myCharacter) return null;

  const cd = myCharacter.character_data || {};

  // In combat: find live HP + movement from the combatants array
  const combatant = inCombat
    ? encounter.combatants?.find(c => c.id === myCharacter.id || c.name === myCharacter.name)
    : null;

  const activeTurn = inCombat ? encounter.combatants?.[encounter.currentTurn] : null;
  const isMyTurn   = !!(combatant && activeTurn && (activeTurn.id === combatant.id));

  const hp    = combatant?.currentHp ?? cd.currentHp ?? cd.hp ?? null;
  const maxHp = combatant?.maxHp    ?? cd.maxHp    ?? null;
  const ac    = cd.ac    ?? combatant?.ac ?? '—';
  const speed = cd.speed ?? 30;
  const conditions = combatant?.conditions ?? cd.conditions ?? [];

  // Spell slots: { 1: { available, max } } or { 1: 4 } (max only)
  const spellSlots = cd.spellSlots ?? {};
  const usedSlots  = cd.spellSlotsUsed ?? {};
  const slotLevels = Object.entries(spellSlots)
    .map(([lv, v]) => {
      const max = typeof v === 'object' ? (v.max ?? v) : v;
      const used = usedSlots[lv] ?? 0;
      const available = typeof v === 'object' && v.available != null ? v.available : max - used;
      return { lv: parseInt(lv), max, available };
    })
    .filter(s => s.max > 0)
    .slice(0, 3);

  const hpPct   = (typeof hp === 'number' && typeof maxHp === 'number' && maxHp > 0) ? hp / maxHp : 1;
  const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
  const dying   = typeof hp === 'number' && hp <= 0;

  const remainingMove = combatant?.remainingMove ?? null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 14px', height: 32, flexShrink: 0, overflowX: 'auto', overflowY: 'hidden',
      background: isMyTurn
        ? 'linear-gradient(90deg, rgba(212,175,55,0.12) 0%, #130b03 30%)'
        : '#130b03',
      borderTop: `1px solid ${isMyTurn ? 'rgba(212,175,55,0.45)' : 'rgba(212,175,55,0.14)'}`,
      borderBottom: `1px solid ${isMyTurn ? 'rgba(212,175,55,0.45)' : 'rgba(212,175,55,0.14)'}`,
      transition: 'background 0.4s ease, border-color 0.3s ease',
    }}>

      {/* Your-turn glow dot */}
      {inCombat && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginRight: 10,
          background: isMyTurn ? '#d4af37' : 'transparent',
          border: `1.5px solid ${isMyTurn ? '#d4af37' : 'rgba(212,175,55,0.25)'}`,
          boxShadow: isMyTurn ? '0 0 8px rgba(212,175,55,0.9)' : 'none',
          transition: 'all 0.3s ease',
        }} />
      )}

      {/* Name / class */}
      <div style={{ flexShrink: 0, marginRight: 12 }}>
        <span style={{
          fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.7rem',
          color: isMyTurn ? '#d4af37' : '#b8a888', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {myCharacter.name ?? '—'}
        </span>
        <span style={{ fontSize: '0.58rem', color: 'rgba(200,180,140,0.38)', marginLeft: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {(myCharacter.class || cd.class || '')} {myCharacter.level ?? cd.level ?? ''}
        </span>
      </div>

      <Divider />

      {/* HP */}
      <div style={{ flexShrink: 0, marginRight: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: '0.57rem', color: 'rgba(200,180,140,0.4)', marginRight: 3 }}>HP</span>
          <span style={{
            fontSize: '0.82rem', fontWeight: 700, color: dying ? '#e74c3c' : hpColor,
            fontFamily: 'monospace', animation: dying ? 'goldPulse 1.5s infinite' : 'none',
          }}>
            {hp ?? '—'}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(200,180,140,0.3)' }}>/{maxHp ?? '—'}</span>
        </div>
        {typeof hp === 'number' && maxHp > 0 && (
          <div style={{ width: 40, height: 2, background: '#1a0a04', borderRadius: 2, marginTop: 2 }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, hpPct) * 100)}%`, height: '100%',
              background: hpColor, borderRadius: 2, transition: 'width 0.4s ease',
            }} />
          </div>
        )}
      </div>

      <Divider />

      {/* AC */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 3, marginRight: 10 }}>
        <span style={{ fontSize: '0.57rem', color: 'rgba(200,180,140,0.4)' }}>AC</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c8b89a', fontFamily: 'monospace' }}>{ac}</span>
      </div>

      {/* Movement (combat) */}
      {combatant && typeof remainingMove === 'number' && (
        <>
          <Divider />
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 3, marginRight: 10 }}>
            <span style={{ fontSize: '0.57rem', color: 'rgba(200,180,140,0.4)' }}>MOVE</span>
            <span style={{
              fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace',
              color: remainingMove > 0 ? '#2ecc71' : 'rgba(200,180,140,0.3)',
            }}>
              {remainingMove * 5}ft
            </span>
          </div>
        </>
      )}

      {/* Spell slot pips */}
      {slotLevels.length > 0 && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0, marginRight: 4 }}>
            {slotLevels.map(({ lv, max, available }) => (
              <div key={lv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: '0.5rem', color: 'rgba(200,180,140,0.35)', lineHeight: 1 }}>{ordinal(lv)}</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(max, 5) }).map((_, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: i < available ? '#9b59b6' : 'transparent',
                      border: `1px solid ${i < available ? '#9b59b6' : 'rgba(155,89,182,0.22)'}`,
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active conditions — hover for 5e mechanic description */}
      {conditions.length > 0 && (
        <>
          <Divider />
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {conditions.slice(0, 5).map(c => (
              <span
                key={c}
                title={CONDITION_TIPS[c] || c}
                style={{
                  fontSize: '0.58rem', padding: '2px 6px',
                  background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)',
                  borderRadius: 10, color: '#e74c3c', whiteSpace: 'nowrap',
                  cursor: 'help',
                }}
              >
                {c}
              </span>
            ))}
            {conditions.length > 5 && (
              <span style={{
                fontSize: '0.58rem', padding: '2px 5px',
                color: 'rgba(231,76,60,0.6)',
              }}>+{conditions.length - 5}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ width: 1, height: 18, background: 'rgba(212,175,55,0.1)', flexShrink: 0, marginRight: 10 }} />
  );
}
