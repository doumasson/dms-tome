import { useState } from 'react';
import { CLASSES } from '../../data/classes';
import { BACKGROUNDS } from '../../lib/charBuilder';
import { WEAPONS } from '../../data/equipment';
import { s } from './charCreateStyles';

// Detect vague weapon patterns and return picker config, or null
function detectWeaponPicker(text) {
  const t = text.toLowerCase();
  if (/two martial weapons/.test(t))            return { cat: ['martial_melee','martial_ranged'], count: 2 };
  if (/a martial weapon and a shield/.test(t))  return { cat: ['martial_melee','martial_ranged'], count: 1, withShield: true };
  if (/any martial melee weapon/.test(t))       return { cat: ['martial_melee'], count: 1 };
  if (/a martial weapon/.test(t))               return { cat: ['martial_melee','martial_ranged'], count: 1 };
  if (/any simple melee weapon/.test(t))        return { cat: ['simple_melee'], count: 1 };
  if (/any simple weapon/.test(t))              return { cat: ['simple_melee','simple_ranged'], count: 1 };
  return null;
}

function getWeaponsForPicker(cats) {
  return WEAPONS.filter(w => cats.includes(w.category));
}

// PHB starting gold by class (dice count × sides × multiplier)
const CLASS_GOLD = {
  Barbarian: { dice: 2, sides: 4, mult: 10, label: '2d4 × 10 gp' },
  Bard:      { dice: 5, sides: 4, mult: 10, label: '5d4 × 10 gp' },
  Cleric:    { dice: 5, sides: 4, mult: 10, label: '5d4 × 10 gp' },
  Druid:     { dice: 2, sides: 4, mult: 10, label: '2d4 × 10 gp' },
  Fighter:   { dice: 5, sides: 4, mult: 10, label: '5d4 × 10 gp' },
  Monk:      { dice: 5, sides: 4, mult:  1, label: '5d4 gp' },
  Paladin:   { dice: 5, sides: 4, mult: 10, label: '5d4 × 10 gp' },
  Ranger:    { dice: 5, sides: 4, mult: 10, label: '5d4 × 10 gp' },
  Rogue:     { dice: 4, sides: 4, mult: 10, label: '4d4 × 10 gp' },
  Sorcerer:  { dice: 3, sides: 4, mult: 10, label: '3d4 × 10 gp' },
  Warlock:   { dice: 4, sides: 4, mult: 10, label: '4d4 × 10 gp' },
  Wizard:    { dice: 4, sides: 4, mult: 10, label: '4d4 × 10 gp' },
};

const BG_EQUIPMENT = {
  Acolyte:     'A holy symbol, a prayer book, 5 sticks of incense, vestments, common clothes, 15 gp',
  Criminal:    'A crowbar, dark common clothes with hood, 15 gp',
  'Folk Hero': 'A set of artisan\'s tools, a shovel, an iron pot, common clothes, 10 gp',
  Noble:       'Fine clothes, a signet ring, a scroll of pedigree, 25 gp',
  Sage:        'A bottle of ink, quill, small knife, letter from colleague, common clothes, 10 gp',
  Soldier:     'An insignia of rank, trophy from fallen foe, common clothes, 10 gp',
  Outlander:   'A staff, a hunting trap, traveler\'s clothes, 10 gp',
  Charlatan:   'Fine clothes, a disguise kit, tools of the con, 15 gp',
  Entertainer: 'A musical instrument, costume, 15 gp',
  Guild:       'A set of artisan\'s tools, a letter of introduction, traveler\'s clothes, 15 gp',
};

function rollGold(goldTable) {
  let total = 0;
  for (let i = 0; i < goldTable.dice; i++) {
    total += Math.ceil(Math.random() * goldTable.sides);
  }
  return total * goldTable.mult;
}

// Parse "(a) X or (b) Y" style lines
function parseLine(line) {
  const match = line.match(/^\(a\)\s*(.+?)\s+or\s+\(b\)\s*(.+)$/i);
  if (match) return { type: 'choice', a: match[1].trim(), b: match[2].trim() };
  return { type: 'fixed', item: line };
}

export default function StepGear({ cls, background, gearChoices, setGearChoices }) {
  const clsData   = cls ? CLASSES[cls] : null;
  const goldTable = cls ? CLASS_GOLD[cls] : null;
  const bgEquip   = BG_EQUIPMENT[background] || null;

  const equipLines = (clsData?.startingEquipment || []).map(parseLine);

  function setMethod(m) {
    setGearChoices(prev => ({ ...prev, method: m }));
  }

  function setSelection(idx, val) {
    setGearChoices(prev => ({
      ...prev,
      selections: { ...prev.selections, [idx]: val },
    }));
  }

  function setWeaponPick(key, weaponName) {
    setGearChoices(prev => ({
      ...prev,
      weaponPicks: { ...(prev.weaponPicks || {}), [key]: weaponName },
    }));
  }

  function handleRollGold() {
    if (!goldTable) return;
    const amount = rollGold(goldTable);
    setGearChoices(prev => ({ ...prev, gold: amount, method: 'gold' }));
  }

  const isEquip = gearChoices.method === 'equipment';
  const isGold  = gearChoices.method === 'gold';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Method picker */}
      <div style={methodToggle}>
        <button
          style={{ ...methodBtn, ...(isEquip ? methodBtnActive : {}) }}
          onClick={() => setMethod('equipment')}
        >
          🎒 Class Starting Equipment
        </button>
        <button
          style={{ ...methodBtn, ...(isGold ? methodBtnActive : {}) }}
          onClick={() => setMethod('gold')}
        >
          💰 Roll for Gold
        </button>
      </div>

      {/* ── Starting Equipment ── */}
      {isEquip && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {equipLines.length === 0 && (
            <p style={{ color: 'rgba(200,180,140,0.35)', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Select a class to see starting equipment.
            </p>
          )}

          {equipLines.map((line, idx) => (
            <div key={idx} style={equipRow}>
              {line.type === 'fixed' ? (
                <FixedItemRow text={line.item} lineIdx={idx} gearChoices={gearChoices} setWeaponPick={setWeaponPick} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={choiceLabel}>Choose one:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[['a', line.a], ['b', line.b]].map(([opt, text]) => {
                      const sel = gearChoices.selections?.[idx] === opt ||
                                  (!gearChoices.selections?.[idx] && opt === 'a');
                      const picker = detectWeaponPicker(text);
                      return (
                        <div key={opt} style={{ flex: 1, minWidth: 140 }}>
                          <button
                            style={{ ...choiceBtn, ...(sel ? choiceBtnSel : {}), width: '100%' }}
                            onClick={() => setSelection(idx, opt)}
                          >
                            <span style={choiceOptLabel}>Option {opt.toUpperCase()}</span>
                            <span style={choiceText}>{text}</span>
                          </button>
                          {sel && picker && (
                            <WeaponPicker
                              picker={picker}
                              pickKey={`${idx}-${opt}`}
                              gearChoices={gearChoices}
                              setWeaponPick={setWeaponPick}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Background gear */}
          {bgEquip && (
            <div style={{ marginTop: 4 }}>
              <div style={{ ...s.traitHeader, marginTop: 0 }}>Background Equipment ({background})</div>
              <div style={fixedItem}>
                <span style={fixedIcon}>✓</span>
                <span style={fixedText}>{bgEquip}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Roll for Gold ── */}
      {isGold && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
          {goldTable && (
            <>
              <p style={goldDesc}>
                Instead of starting equipment, roll <strong style={{ color: '#d4af37' }}>{goldTable.label}</strong> and
                spend the gold on gear in town before your first adventure.
              </p>
              <button style={{ ...s.rollDiceBtn, ...(gearChoices.gold > 0 ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }} onClick={gearChoices.gold > 0 ? undefined : handleRollGold} disabled={gearChoices.gold > 0}>
                🎲 Roll {goldTable.label}
              </button>
              {gearChoices.gold > 0 && (
                <div style={goldResult}>
                  <div style={goldResultAmt}>{gearChoices.gold} gp</div>
                  <div style={goldResultLabel}>Starting Gold</div>
                </div>
              )}
              <p style={goldHint}>
                You can purchase weapons, armor, and adventuring gear from the shop at the start of your campaign.
              </p>
            </>
          )}
          {!goldTable && (
            <p style={{ color: 'rgba(200,180,140,0.35)', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Select a class first to roll for gold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── FixedItemRow: renders a fixed equipment line, with weapon picker if vague ──
function FixedItemRow({ text, lineIdx, gearChoices, setWeaponPick }) {
  const picker = detectWeaponPicker(text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={fixedItem}>
        <span style={fixedIcon}>✓</span>
        <span style={fixedText}>{text}</span>
      </div>
      {picker && (
        <WeaponPicker
          picker={picker}
          pickKey={`fixed-${lineIdx}`}
          gearChoices={gearChoices}
          setWeaponPick={setWeaponPick}
        />
      )}
    </div>
  );
}

// ── WeaponPicker: compact scrollable list of weapons ──────────────────────────
function WeaponPicker({ picker, pickKey, gearChoices, setWeaponPick }) {
  const weapons = getWeaponsForPicker(picker.cat);
  const picks = gearChoices.weaponPicks || {};

  if (picker.count === 1) {
    const chosen = picks[`${pickKey}-0`];
    return (
      <div style={wpContainer}>
        <div style={wpLabel}>
          {picker.withShield ? 'Pick martial weapon (+shield auto-included):' : 'Pick a weapon:'}
        </div>
        <div style={wpGrid}>
          {weapons.map(w => (
            <button
              key={w.name}
              style={{ ...wpBtn, ...(chosen === w.name ? wpBtnSel : {}) }}
              onClick={() => setWeaponPick(`${pickKey}-0`, w.name)}
              title={`${w.damage} ${w.damageType}`}
            >
              <span style={wpName}>{w.name}</span>
              <span style={wpDmg}>{w.damage}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // count === 2: pick two weapons (can be same or different)
  return (
    <div style={wpContainer}>
      <div style={wpLabel}>Pick two weapons:</div>
      {[0, 1].map(slot => {
        const chosen = picks[`${pickKey}-${slot}`];
        return (
          <div key={slot} style={{ marginBottom: slot === 0 ? 6 : 0 }}>
            <div style={{ ...wpLabel, opacity: 0.6, fontSize: '0.62rem' }}>Weapon {slot + 1}:</div>
            <div style={wpGrid}>
              {weapons.map(w => (
                <button
                  key={w.name}
                  style={{ ...wpBtn, ...(chosen === w.name ? wpBtnSel : {}) }}
                  onClick={() => setWeaponPick(`${pickKey}-${slot}`, w.name)}
                  title={`${w.damage} ${w.damageType}`}
                >
                  <span style={wpName}>{w.name}</span>
                  <span style={wpDmg}>{w.damage}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const wpContainer = {
  background: 'rgba(212,175,55,0.04)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 6, padding: '8px 10px', marginTop: 4,
};
const wpLabel = {
  fontSize: '0.65rem', color: 'rgba(200,180,140,0.5)',
  fontFamily: "'Cinzel', Georgia, serif",
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
};
const wpGrid = {
  display: 'flex', flexWrap: 'wrap', gap: 4,
};
const wpBtn = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 4, padding: '4px 8px',
  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1,
  transition: 'all 0.12s',
};
const wpBtnSel = {
  background: 'rgba(212,175,55,0.12)',
  border: '1px solid rgba(212,175,55,0.5)',
};
const wpName = {
  fontSize: '0.72rem', color: 'rgba(200,180,140,0.9)',
  fontFamily: "'Cinzel', Georgia, serif",
};
const wpDmg = {
  fontSize: '0.6rem', color: 'rgba(212,175,55,0.6)',
};

// ── Local styles ────────────────────────────────────────────────────────────
const methodToggle = {
  display: 'flex', gap: 10, justifyContent: 'center',
};
const methodBtn = {
  flex: 1, maxWidth: 260,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '12px 14px',
  color: 'rgba(200,180,140,0.55)',
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.78rem', fontWeight: 700,
  cursor: 'pointer', transition: 'all 0.15s',
  letterSpacing: '0.03em',
};
const methodBtnActive = {
  background: 'rgba(212,175,55,0.1)',
  border: '1px solid rgba(212,175,55,0.45)',
  color: '#d4af37',
};
const equipRow = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(212,175,55,0.1)',
  borderRadius: 8, padding: '12px 14px',
};
const fixedItem = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
};
const fixedIcon = {
  color: 'rgba(46,204,113,0.7)', fontSize: '0.85rem', flexShrink: 0, marginTop: 1,
};
const fixedText = {
  fontSize: '0.82rem', color: 'rgba(200,180,140,0.8)',
  fontFamily: "'Cinzel', Georgia, serif", lineHeight: 1.5,
};
const choiceLabel = {
  fontSize: '0.65rem', color: 'rgba(200,180,140,0.4)',
  fontFamily: "'Cinzel', Georgia, serif",
  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
};
const choiceBtn = {
  flex: 1, minWidth: 140,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: '10px 12px',
  cursor: 'pointer', textAlign: 'left',
  display: 'flex', flexDirection: 'column', gap: 4,
  transition: 'all 0.15s',
};
const choiceBtnSel = {
  background: 'rgba(212,175,55,0.1)',
  border: '1px solid rgba(212,175,55,0.45)',
};
const choiceOptLabel = {
  fontSize: '0.6rem', fontWeight: 700,
  color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif",
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block',
};
const choiceText = {
  fontSize: '0.75rem', color: 'rgba(200,180,140,0.8)',
  fontFamily: "'Cinzel', Georgia, serif", lineHeight: 1.4,
  display: 'block',
};
const goldDesc = {
  color: 'rgba(200,180,140,0.65)', fontSize: '0.82rem',
  lineHeight: 1.6, textAlign: 'center', maxWidth: 460, margin: 0,
};
const goldResult = {
  background: 'rgba(212,175,55,0.08)',
  border: '2px solid rgba(212,175,55,0.4)',
  borderRadius: 12, padding: '16px 32px',
  textAlign: 'center',
};
const goldResultAmt = {
  fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
  fontSize: '2.4rem', fontWeight: 700, color: '#d4af37',
  lineHeight: 1,
};
const goldResultLabel = {
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.72rem', color: 'rgba(200,180,140,0.5)',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  marginTop: 4,
};
const goldHint = {
  color: 'rgba(200,180,140,0.35)', fontSize: '0.75rem',
  textAlign: 'center', fontStyle: 'italic', margin: 0,
};
