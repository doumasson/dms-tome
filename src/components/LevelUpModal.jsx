import { useState } from 'react';
import { CLASSES, getSpellSlots, getFeaturesUpToLevel } from '../data/classes';

// ─── D&D 5e XP thresholds ─────────────────────────────────────────────────────
const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export function xpForLevel(level) {
  return XP_THRESHOLDS[Math.min(level - 1, 19)] ?? 355000;
}

export function levelFromXp(xp) {
  let level = 1;
  for (let l = 1; l <= 20; l++) {
    if (xp >= XP_THRESHOLDS[l - 1]) level = l;
    else break;
  }
  return Math.min(level, 20);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statMod(val) {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function buildNewSpellSlots(className, newLevel, oldSlots) {
  const newSlotData = getSpellSlots(className, newLevel);
  if (!newSlotData) return oldSlots;

  // warlock pact magic
  if (newSlotData.slots !== undefined) {
    const oldPactSlots = Object.values(oldSlots || {})[0]?.total || 0;
    const slotLevel = newSlotData.level;
    return { [slotLevel]: { total: newSlotData.slots, used: Math.min(oldPactSlots > 0 ? Object.values(oldSlots)[0]?.used || 0 : 0, newSlotData.slots) } };
  }

  // full/half casters — array of per-spell-level counts
  const result = {};
  newSlotData.forEach((count, idx) => {
    if (count > 0) {
      const lvl = idx + 1;
      const prev = oldSlots?.[lvl];
      result[lvl] = { total: count, used: prev?.used || 0 };
    }
  });
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LevelUpModal({ character, onConfirm, onCancel }) {
  const cls = character?.class || '';
  const oldLevel = character?.level || 1;
  const newLevel = Math.min(oldLevel + 1, 20);
  const clsData = CLASSES[cls];

  const [hpChoice, setHpChoice] = useState('average'); // 'average' | 'roll'
  const [rolledHp, setRolledHp] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!clsData) {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <div style={s.header}>Level Up!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unknown class "{cls}" — cannot auto-calculate level up.</p>
          <button style={s.confirmBtn} onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  const hitDie = clsData.hitDie;
  const conMod = Math.floor(((character.stats?.con ?? 10) - 10) / 2);
  const avgHp = Math.floor(hitDie / 2) + 1 + conMod;
  const hpGain = hpChoice === 'roll' && rolledHp !== null ? (rolledHp + conMod) : avgHp;
  const finalHp = (character.maxHp || 0) + Math.max(1, hpGain);

  const newFeatures = clsData.features[newLevel] || [];
  const allFeaturesNew = getFeaturesUpToLevel(cls, newLevel);
  const newSlots = buildNewSpellSlots(cls, newLevel, character.spellSlots || {});

  function doRoll() {
    const r = rollDie(hitDie);
    setRolledHp(r);
  }

  function handleConfirm() {
    setConfirmed(true);
    onConfirm({
      level: newLevel,
      maxHp: finalHp,
      hp: finalHp, // fully heal on level up (optional — can change)
      spellSlots: Object.keys(newSlots).length > 0 ? newSlots : character.spellSlots,
      features: allFeaturesNew,
    });
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerGlyph}>✦</div>
          <div style={s.headerTitle}>Level Up!</div>
          <div style={s.headerSub}>
            {character.name} · {cls} · Level {oldLevel} → {newLevel}
          </div>
        </div>

        {/* HP gain */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Hit Points</div>
          <div style={s.hpRow}>
            <div style={s.hpGainBox}>
              <span style={s.hpGainNum}>+{Math.max(1, hpGain)}</span>
              <span style={s.hpGainLabel}>HP gained</span>
            </div>
            <div style={s.hpDetail}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                d{hitDie} + CON ({statMod(character.stats?.con ?? 10)})
              </div>
              <div style={s.hpChoiceRow}>
                <button
                  style={{ ...s.choiceBtn, ...(hpChoice === 'average' ? s.choiceBtnActive : {}) }}
                  onClick={() => setHpChoice('average')}
                >
                  Average ({avgHp})
                </button>
                <button
                  style={{ ...s.choiceBtn, ...(hpChoice === 'roll' ? s.choiceBtnActive : {}) }}
                  onClick={() => setHpChoice('roll')}
                >
                  Roll d{hitDie}
                </button>
              </div>
              {hpChoice === 'roll' && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button style={s.rollBtn} onClick={doRoll}>
                    🎲 Roll!
                  </button>
                  {rolledHp !== null && (
                    <span style={{ color: '#d4af37', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif" }}>
                      {rolledHp} + {conMod >= 0 ? '+' : ''}{conMod} = {Math.max(1, rolledHp + conMod)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={s.hpTotalRow}>
            <span style={s.hpTotalLabel}>New Max HP</span>
            <span style={s.hpTotalVal}>{finalHp}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>
              (was {character.maxHp})
            </span>
          </div>
        </div>

        {/* New features */}
        {newFeatures.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>New Features at Level {newLevel}</div>
            <div style={s.featureList}>
              {newFeatures.map(f => (
                <div key={f} style={s.featureBadge}>{f}</div>
              ))}
            </div>
          </div>
        )}

        {/* Spell slots if changed */}
        {clsData.castingType && Object.keys(newSlots).length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Spell Slots at Level {newLevel}</div>
            <div style={s.slotRow}>
              {Object.entries(newSlots).map(([lvl, sl]) => {
                const prevTotal = character.spellSlots?.[lvl]?.total || 0;
                const gained = sl.total - prevTotal;
                return (
                  <div key={lvl} style={{ ...s.slotBadge, ...(gained > 0 ? s.slotBadgeNew : {}) }}>
                    <span style={s.slotLvlLabel}>
                      {lvl === '1' ? '1st' : lvl === '2' ? '2nd' : lvl === '3' ? '3rd' : `${lvl}th`}
                    </span>
                    <span style={s.slotCount}>{sl.total}</span>
                    {gained > 0 && <span style={s.slotGainedTag}>+{gained}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* XP next level */}
        {newLevel < 20 && (
          <div style={s.xpNote}>
            Next level at {xpForLevel(newLevel + 1).toLocaleString()} XP
          </div>
        )}

        {/* Buttons */}
        <div style={s.btnRow}>
          <button style={s.cancelBtn} onClick={onCancel} disabled={confirmed}>
            Not Yet
          </button>
          <button
            style={{ ...s.confirmBtn, ...(hpChoice === 'roll' && rolledHp === null ? s.confirmBtnDisabled : {}) }}
            onClick={handleConfirm}
            disabled={confirmed || (hpChoice === 'roll' && rolledHp === null)}
          >
            {confirmed ? 'Leveling up…' : `✦ Level Up to ${newLevel}!`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: 'linear-gradient(180deg, #1c1208 0%, #150d06 100%)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 14,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    boxShadow: '0 20px 80px rgba(0,0,0,0.9), 0 0 40px rgba(212,175,55,0.08)',
  },
  header: {
    textAlign: 'center',
    padding: '28px 24px 20px',
    borderBottom: '1px solid rgba(212,175,55,0.12)',
  },
  headerGlyph: {
    fontSize: '2.4rem',
    color: '#d4af37',
    filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.6))',
    lineHeight: 1,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#d4af37',
    letterSpacing: '0.04em',
  },
  headerSub: {
    fontSize: '0.78rem',
    color: 'rgba(200,180,140,0.6)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(212,175,55,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.68rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(200,180,140,0.4)',
    fontWeight: 700,
  },
  hpRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  hpGainBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(231,76,60,0.12)',
    border: '1px solid rgba(231,76,60,0.3)',
    borderRadius: 10,
    padding: '10px 16px',
    minWidth: 70,
    flexShrink: 0,
  },
  hpGainNum: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#e74c3c',
    lineHeight: 1,
  },
  hpGainLabel: {
    fontSize: '0.6rem',
    color: 'rgba(200,180,140,0.4)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  hpDetail: {
    flex: 1,
  },
  hpChoiceRow: {
    display: 'flex',
    gap: 6,
  },
  choiceBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.72rem',
    padding: '5px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  choiceBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
  },
  rollBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 6,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.78rem',
    fontWeight: 700,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  hpTotalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    padding: '6px 10px',
  },
  hpTotalLabel: {
    fontSize: '0.72rem',
    color: 'rgba(200,180,140,0.5)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  hpTotalVal: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#e74c3c',
    marginLeft: 8,
  },
  featureList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureBadge: {
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: '#d4af37',
    fontSize: '0.72rem',
    padding: '4px 10px',
    borderRadius: 8,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  slotRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(91,143,255,0.08)',
    border: '1px solid rgba(91,143,255,0.2)',
    borderRadius: 6,
    padding: '5px 10px',
    position: 'relative',
  },
  slotBadgeNew: {
    background: 'rgba(91,143,255,0.15)',
    border: '1px solid rgba(91,143,255,0.5)',
  },
  slotLvlLabel: {
    fontSize: '0.58rem',
    color: 'rgba(91,143,255,0.6)',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.04em',
  },
  slotCount: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1rem',
    color: '#5b8fff',
    lineHeight: 1.1,
  },
  slotGainedTag: {
    position: 'absolute',
    top: -6,
    right: -6,
    background: '#2ecc71',
    color: '#0a1a0a',
    fontSize: '0.55rem',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: 4,
  },
  xpNote: {
    fontSize: '0.72rem',
    color: 'rgba(200,180,140,0.35)',
    textAlign: 'center',
    padding: '10px 24px',
    fontStyle: 'italic',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    padding: '16px 24px 20px',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'rgba(200,180,140,0.4)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.78rem',
    padding: '10px 16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  confirmBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 8,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '0.95rem',
    letterSpacing: '0.03em',
    padding: '12px 20px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
    minHeight: 46,
  },
  confirmBtnDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(200,180,140,0.3)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
