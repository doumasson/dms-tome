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
                  <>
                    <span style={s.slotItem}>{item.name}</span>
                    {!readOnly && (
                      <button style={s.slotUnequipBtn} onClick={() => unequipItem(key)} title="Unequip">×</button>
                    )}
                  </>
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
