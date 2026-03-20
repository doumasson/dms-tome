import { useState } from 'react';
import { s } from './charSheetStyles';
import useStore from '../../store/useStore';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
function mod(score) { return Math.floor((score - 10) / 2); }
function fmt(n) { return n >= 0 ? `+${n}` : `${n}`; }

const SLOT_DEFS = [
  { key: 'mainHand', icon: '⚔',  label: 'Main Hand' },
  { key: 'offHand',  icon: '🛡',  label: 'Off Hand'  },
  { key: 'chest',    icon: '🥋',  label: 'Chest'     },
  { key: 'head',     icon: '🪖',  label: 'Head'      },
  { key: 'hands',    icon: '🧤',  label: 'Hands'     },
  { key: 'feet',     icon: '👢',  label: 'Feet'      },
  { key: 'neck',     icon: '📿',  label: 'Neck'      },
  { key: 'ring1',    icon: '💍',  label: 'Ring 1'    },
  { key: 'ring2',    icon: '💍',  label: 'Ring 2'    },
];

export default function EquipmentPane({ character, readOnly, onDropOnSlot }) {
  const unequipItem = useStore(s => s.unequipItem);
  const [tab, setTab] = useState('features');

  const stats = character.stats || {};
  const hp = character.currentHp ?? character.maxHp ?? 0;
  const maxHp = character.maxHp ?? 0;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
  const equipped = character.equippedItems || {};
  const features = character.features || [];
  const spells = character.spells || [];
  const skills = character.skills || [];

  return (
    <div style={s.leftPane}>
      {/* HP */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Hit Points</div>
        <div style={s.hpRow}>
          <span style={{ ...s.hpText, color: hpColor }}>{hp}</span>
          <div style={s.hpTrack}>
            <div style={{ ...s.hpFill, width: `${hpPct * 100}%`, background: hpColor }} />
          </div>
          <span style={{ ...s.hpText, color: 'rgba(200,180,140,0.4)' }}>/ {maxHp}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Combat</div>
        <div style={s.quickRow}>
          <span style={s.quickBadge}>🛡 AC {character.ac ?? '?'}</span>
          <span style={s.quickBadge}>⚡ {character.speed ?? 30}ft</span>
          <span style={s.quickBadge}>📈 Init {fmt(mod(stats.dex ?? 10))}</span>
          <span style={s.quickBadge}>🎓 PB +{Math.ceil((character.level || 1) / 4) + 1}</span>
          {character.xp !== undefined && <span style={s.quickBadge}>✦ {character.xp} XP</span>}
          {character.gold !== undefined && <span style={s.quickBadge}>🪙 {character.gold} gp</span>}
        </div>
      </div>

      {/* Ability scores */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Ability Scores</div>
        <div style={s.statsGrid}>
          {STAT_KEYS.map(k => {
            const score = stats[k] ?? 10;
            return (
              <div key={k} style={s.statBox}>
                <div style={s.statLabel}>{STAT_LABELS[k]}</div>
                <div style={s.statScore}>{score}</div>
                <div style={s.statMod}>{fmt(mod(score))}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment slots */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Equipped</div>

        {/* Attunement slots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ color: '#d4af37', fontSize: 10, marginRight: 4 }}>Attunement:</span>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ fontSize: 14, color: i < (character.attunedItems?.length || 0) ? '#d4af37' : '#333' }}>
              ◆
            </span>
          ))}
        </div>

        <div
          style={s.slotGrid}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (readOnly) return;
            try {
              const item = JSON.parse(e.dataTransfer.getData('application/json'));
              const slotKey = e.currentTarget.dataset.slotKey;
              if (slotKey) onDropOnSlot?.(slotKey, item);
            } catch { /* ignore */ }
          }}
        >
          {SLOT_DEFS.map(({ key, icon, label }) => {
            const item = equipped[key];
            const attunedItems = character.attunedItems || [];
            const isAttuned = item && attunedItems.includes(item.instanceId);
            const requiresAttunement = item?.requiresAttunement;
            const isCursed = item?.cursed;
            const attuneSlotsFull = attunedItems.length >= 3;
            const hasCharges = item?.charges != null;

            return (
              <div
                key={key}
                data-slot-key={key}
                style={s.slotRow}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '';
                  if (readOnly) return;
                  try {
                    const dragged = JSON.parse(e.dataTransfer.getData('application/json'));
                    onDropOnSlot?.(key, dragged);
                  } catch { /* ignore */ }
                }}
              >
                <span style={s.slotIcon}>{icon}</span>
                <span style={s.slotLabel}>{label}</span>
                {item ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={s.slotItem}>{item.name}</span>
                      {isAttuned && isCursed && (
                        <span style={{ fontSize: 9, color: '#e74c3c', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', borderRadius: 3, padding: '1px 4px' }}>
                          Cursed 🔒
                        </span>
                      )}
                      {isAttuned && !isCursed && (
                        <span style={{ fontSize: 9, color: '#d4af37', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 3, padding: '1px 4px' }}>
                          Attuned ✓
                        </span>
                      )}
                      {!readOnly && (
                        <button style={s.slotUnequipBtn} onClick={() => unequipItem(key)} title="Unequip">×</button>
                      )}
                    </div>
                    {hasCharges && (
                      <div style={{ fontSize: 9, color: '#d4af37', marginTop: 2 }}>
                        ⚡ {item.charges.current}/{item.charges.max}
                      </div>
                    )}
                    {requiresAttunement && !isAttuned && !readOnly && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: 'rgba(200,180,140,0.6)', fontStyle: 'italic' }}>Requires Attunement</span>
                        <button
                          style={{ fontSize: 9, color: '#d4af37', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 3, padding: '1px 5px', cursor: attuneSlotsFull ? 'not-allowed' : 'pointer', opacity: attuneSlotsFull ? 0.4 : 1 }}
                          disabled={attuneSlotsFull}
                          onClick={() => useStore.getState().attuneItem(item.instanceId)}
                        >
                          Attune
                        </button>
                      </div>
                    )}
                    {isAttuned && !isCursed && !readOnly && (
                      <button
                        style={{ fontSize: 9, color: 'rgba(200,180,140,0.5)', background: 'transparent', border: '1px solid rgba(200,180,140,0.2)', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', marginTop: 2 }}
                        onClick={() => useStore.getState().unattuneItem(item.instanceId)}
                      >
                        Un-attune
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={s.slotEmpty}>— empty —</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Features / Spells / Skills tabs */}
      <div style={s.section}>
        <div style={s.tabRow}>
          {[['features', 'Features'], ['spells', 'Spells'], ['skills', 'Skills']].map(([key, lbl]) => (
            <button key={key} style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }} onClick={() => setTab(key)}>
              {lbl}
            </button>
          ))}
        </div>
        {tab === 'features' && (
          <div style={s.featureList}>
            {features.length === 0
              ? <span style={{ color: 'rgba(200,180,140,0.3)', fontSize: '0.78rem', fontStyle: 'italic' }}>No features listed.</span>
              : features.map((f, i) => <div key={i} style={s.featureItem}>{f}</div>)}
          </div>
        )}
        {tab === 'spells' && (
          <div style={{ flexWrap: 'wrap', display: 'flex', gap: 0 }}>
            {spells.length === 0
              ? <span style={{ color: 'rgba(200,180,140,0.3)', fontSize: '0.78rem', fontStyle: 'italic' }}>No spells.</span>
              : spells.map((sp, i) => <span key={i} style={s.spellTag}>{sp}</span>)}
          </div>
        )}
        {tab === 'skills' && (
          <div style={{ flexWrap: 'wrap', display: 'flex', gap: 6 }}>
            {skills.length === 0
              ? <span style={{ color: 'rgba(200,180,140,0.3)', fontSize: '0.78rem', fontStyle: 'italic' }}>No skills listed.</span>
              : skills.map((sk, i) => <span key={i} style={{ ...s.featureItem, borderRadius: 12 }}>{sk}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
