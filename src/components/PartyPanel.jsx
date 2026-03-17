import { useState, useRef, useEffect } from 'react';
import { getClassResources } from '../lib/classResources';
import CharDetailPanel from './CharDetailPanel';

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const color = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  return (
    <div style={{ height: 5, background: '#2a1a0a', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function ResourcePips({ char }) {
  const defs = getClassResources(char.class, char.level, char.stats);
  if (defs.length === 0) return null;
  // Show first resource only (primary class resource) in the compact view
  const def = defs[0];
  const used = char.resourcesUsed?.[def.name] ?? 0;
  const available = Math.max(0, def.max - used);
  const max = Math.min(def.max, 10); // cap pip display at 10
  if (def.max === Infinity) return null;
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }} title={def.name}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < available ? '#9b59b6' : '#2a1a0a',
          border: `1px solid ${i < available ? '#9b59b6' : '#3a2a1a'}`,
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function PartyRow({ combatant, character, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const [popPos, setPopPos] = useState({ top: 0 });
  const rowRef = useRef();
  const hideTimer = useRef();

  function handleMouseEnter() {
    clearTimeout(hideTimer.current);
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      setPopPos({ top: rect.top });
    }
    setHovered(true);
  }

  function handleMouseLeave() {
    hideTimer.current = setTimeout(() => setHovered(false), 120);
  }

  const hp = combatant ? combatant.currentHp : (character?.currentHp ?? 0);
  const maxHp = combatant ? combatant.maxHp : (character?.maxHp ?? 1);
  const conditions = combatant?.conditions || [];
  const isDying = combatant && combatant.currentHp <= 0 && combatant.type === 'player';
  const initials = (character?.name || combatant?.name || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      ref={rowRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{
        padding: '7px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isActive ? 'rgba(212,175,55,0.1)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${isActive ? 'var(--border-gold)' : 'transparent'}`,
        marginBottom: 3,
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {/* Portrait / initials */}
        {character?.portrait ? (
          <img
            src={character.portrait}
            alt=""
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${isActive ? 'var(--gold)' : '#3a2a1a'}` }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: isDying ? '#7b1b1b' : isActive ? 'rgba(212,175,55,0.2)' : '#2a1a0a',
          border: `2px solid ${isDying ? '#e74c3c' : isActive ? 'var(--gold)' : '#3a2a1a'}`,
          display: character?.portrait ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
        }}>
          {isDying ? '💀' : initials}
        </div>

        {/* Name + HP */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 600,
            color: isDying ? '#e74c3c' : isActive ? 'var(--gold)' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {character?.name || combatant?.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <HpBar current={hp} max={maxHp} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {hp}/{maxHp}
            </span>
          </div>
          <ResourcePips char={character || {}} />
        </div>
      </div>

      {/* Condition badges */}
      {conditions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 4 }}>
          {conditions.slice(0, 3).map(c => (
            <span key={c} style={{ fontSize: '0.58rem', background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.5)', color: '#e74c3c', borderRadius: 3, padding: '0 4px' }}>
              {c}
            </span>
          ))}
          {conditions.length > 3 && (
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>+{conditions.length - 3}</span>
          )}
        </div>
      )}

      {/* Hover popover — character sheet */}
      {hovered && character && (
        <CharPopover character={character} combatant={combatant} pos={popPos} onMouseEnter={() => clearTimeout(hideTimer.current)} onMouseLeave={handleMouseLeave} />
      )}
    </div>
  );
}

function CharPopover({ character, combatant, pos, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: Math.max(8, pos.top),
        left: 210,
        zIndex: 500,
        width: 260,
        background: '#1a1006',
        border: '1px solid var(--border-gold)',
        borderRadius: 8,
        padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
        pointerEvents: 'auto',
      }}
    >
      <CharDetailPanel character={character} combatant={combatant} compact />
    </div>
  );
}

export default function PartyPanel({ combatants, characters, activeCombatantId, onSelectCombatant }) {
  const players = combatants.filter(c => c.type === 'player');
  const enemies = combatants.filter(c => c.type === 'enemy');
  const deadEnemies = enemies.filter(c => c.currentHp <= 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Party header */}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 6 }}>
        PARTY
      </div>

      {players.map(c => {
        const char = characters.find(ch => ch.id === c.id || ch.name === c.name) || null;
        return (
          <PartyRow
            key={c.id}
            combatant={c}
            character={char}
            isActive={c.id === activeCombatantId}
            onSelect={() => onSelectCombatant(c.id)}
          />
        );
      })}

      {players.length === 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '8px 0', fontStyle: 'italic' }}>
          No party members
        </div>
      )}

      {/* Enemies summary */}
      {enemies.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #2a1a0a' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 6 }}>
            ENEMIES
          </div>
          {enemies.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
              borderRadius: 4, marginBottom: 2,
              opacity: c.currentHp <= 0 ? 0.4 : 1,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: c.currentHp <= 0 ? '#555' : '#e74c3c',
              }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {c.currentHp <= 0 ? '✕' : `${c.currentHp}hp`}
              </span>
            </div>
          ))}
          {deadEnemies > 0 && (
            <div style={{ fontSize: '0.65rem', color: '#e74c3c', padding: '2px 6px' }}>
              {deadEnemies}/{enemies.length} defeated
            </div>
          )}
        </div>
      )}
    </div>
  );
}
