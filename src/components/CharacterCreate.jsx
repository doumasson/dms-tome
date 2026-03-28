import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { CLASSES } from '../data/classes';
import { getRace, applyRacialBonuses } from '../data/races';
import {
  calcHp, calcAc, buildAttacks, buildSpellSlots, buildFeatures,
  avatarUrl, profBonus, getStarterSpells, BACKGROUNDS,
} from '../lib/charBuilder';
import { getStartingInventory, WEAPONS, ARMOR, getSlotType, computeAcFromEquipped } from '../data/equipment';
import { s } from './characterCreate/charCreateStyles';
import StepRace       from './characterCreate/StepRace';
import StepClass      from './characterCreate/StepClass';
import StepBackground from './characterCreate/StepBackground';
import StepAbilities  from './characterCreate/StepAbilities';
import StepIdentity   from './characterCreate/StepIdentity';
import StepSpells     from './characterCreate/StepSpells';
import StepGear       from './characterCreate/StepGear';
import SummaryPanel   from './characterCreate/SummaryPanel';

const SPELLCASTING_CLASSES = new Set(['Wizard','Sorcerer','Warlock','Bard','Cleric','Druid','Paladin','Ranger']);

const STEP_TITLES = {
  Race:       'Choose Your Race',
  Class:      'Choose Your Class',
  Background: 'Choose Your Background',
  Spells:     'Select Your Spells',
  Abilities:  'Set Your Abilities',
  Identity:   'Name Your Character',
  Gear:       'Starting Equipment',
};

const BASE_STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Identity', 'Gear'];

export default function CharacterCreate({ user, campaignId, onDone, onCancel }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const [race,        setRace]        = useState('');
  const [flexChoices, setFlexChoices] = useState([]);
  const [cls,         setCls]         = useState('');
  const [background,  setBackground]  = useState('');
  const [skills,      setSkills]      = useState([]);
  const [method,      setMethod]      = useState('rolled');
  const [baseStats,   setBaseStats]   = useState({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  const [name,        setName]        = useState('');
  const [alignment,   setAlignment]   = useState('');
  const [appearance,  setAppearance]  = useState('');
  const [backstory,   setBackstory]   = useState('');
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [gearChoices, setGearChoices] = useState({ method: 'equipment', selections: {}, gold: 0 });
  const [portrait,    setPortrait]    = useState('');

  const isSpellcaster = cls && SPELLCASTING_CLASSES.has(cls);

  const raceData   = getRace(race);
  const clsData    = cls ? CLASSES[cls] : null;
  const finalStats = useMemo(
    () => raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats,
    [baseStats, race, flexChoices, raceData],
  );

  const dynamicSteps = useMemo(() => {
    const base = [...BASE_STEPS];
    if (isSpellcaster) base.splice(3, 0, 'Spells');
    return base;
  }, [isSpellcaster]);

  function canAdvance() {
    const label = dynamicSteps[step];
    if (label === 'Race')       return !!race;
    if (label === 'Class')      return !!cls;
    if (label === 'Background') {
      if (!background) return false;
      // Validate skill selection
      const clsData = CLASSES[cls];
      const bg = BACKGROUNDS.find(b => b.name === background);
      if (!clsData || !bg) return false;

      const classSkillCount = clsData.skillCount || 2;
      const bgSkills = bg.skills || [];
      const selectedClassSkills = skills.filter(sk => !bgSkills.includes(sk));

      return selectedClassSkills.length === classSkillCount;
    }
    if (label === 'Spells')     return true;
    if (label === 'Abilities')  return true;
    if (label === 'Identity')   return !!name.trim();
    if (label === 'Gear')       return gearChoices.method === 'equipment' || gearChoices.gold > 0;
    return false;
  }

  async function handleConfirm() {
    if (!canAdvance()) return;
    setSaving(true);
    setError('');

    const hp       = calcHp(clsData, finalStats.con);
    const ac       = calcAc(clsData, finalStats.dex);
    const attacks  = buildAttacks(cls, finalStats);
    const spellSlots = buildSpellSlots(cls, 1);
    const features = buildFeatures(cls, 1);
    const pb       = profBonus(1);

    // Build starting inventory from gear step
    const starterItems = getStartingInventory();
    const gearItems = buildGearInventory(gearChoices, clsData);
    // Ensure every item has a stable instanceId for equip tracking
    const allItems = [...starterItems, ...gearItems].map(item =>
      item.instanceId ? item : { ...item, instanceId: uuidv4() }
    );

    // Auto-equip: first weapon → mainHand, armor → chest, shield → offHand
    const equippedItems = {};
    const equippedInstanceIds = new Set();
    for (const item of allItems) {
      const slot = getSlotType(item);
      if (slot === 'mainHand' && !equippedItems.mainHand) { equippedItems.mainHand = item; equippedInstanceIds.add(item.instanceId); }
      else if (slot === 'twoHanded' && !equippedItems.twoHanded && !equippedItems.mainHand) { equippedItems.twoHanded = item; equippedInstanceIds.add(item.instanceId); }
      else if (slot === 'chest' && !equippedItems.chest) { equippedItems.chest = item; equippedInstanceIds.add(item.instanceId); }
      else if (slot === 'offHand' && !equippedItems.offHand) { equippedItems.offHand = item; equippedInstanceIds.add(item.instanceId); }
    }
    // Remove equipped items from inventory so they don't show twice
    const unequippedItems = allItems.filter(i => !equippedInstanceIds.has(i.instanceId));
    const startingAc = Object.keys(equippedItems).length > 0
      ? computeAcFromEquipped(equippedItems, finalStats)
      : ac;

    const character = {
      id: uuidv4(),
      name: name.trim(),
      class: cls,
      race,
      background,
      alignment,
      appearance,
      backstory,
      level: 1,
      xp: 0,
      hp, maxHp: hp, currentHp: hp,
      ac: startingAc,
      speed: raceData?.speed || 30,
      darkvision: raceData?.darkvision || 0,
      stats: finalStats,
      skills,
      attacks,
      features,
      spellSlots,
      spells: selectedSpells.length > 0 ? selectedSpells : getStarterSpells(cls),
      equipment: clsData?.startingEquipment || [],
      inventory: unequippedItems,
      equippedItems,
      gold: gearChoices.method === 'gold' ? gearChoices.gold : 0,
      proficiencyBonus: pb,
      portrait: portrait || avatarUrl(name.trim(), race, cls),
      userId: user.id,
      userName: user.name,
    };

    const { error: dbErr } = await supabase
      .from('campaign_members')
      .update({ character_data: character })
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id);

    if (dbErr) { setSaving(false); setError('Failed to save. Please try again.'); return; }

    try {
      await supabase.from('characters').upsert({
        owner_user_id: user.id,
        name: character.name,
        class: character.class || '',
        race: character.race || '',
        background: character.background || '',
        appearance: character.appearance || '',
        backstory: character.backstory || '',
        portrait_url: character.portrait || '',
        character_data: character,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_user_id,name' });
    } catch { /* non-critical */ }

    setSaving(false);
    onDone(character);
  }

  const stepMap = {
    Race:       <StepRace       key="race"      race={race}             setRace={setRace} />,
    Class:      <StepClass      key="class"     cls={cls}               setCls={setCls} />,
    Background: <StepBackground key="bg"        background={background} setBackground={setBackground} skills={skills} setSkills={setSkills} cls={cls} />,
    Spells:     <StepSpells     key="spells"    cls={cls}               selectedSpells={selectedSpells} setSelectedSpells={setSelectedSpells} />,
    Abilities:  <StepAbilities  key="abilities" race={race} cls={cls}    baseStats={baseStats} setBaseStats={setBaseStats} method={method} setMethod={setMethod} flexChoices={flexChoices} setFlexChoices={setFlexChoices} />,
    Identity:   <StepIdentity   key="identity"  name={name}             setName={setName} alignment={alignment} setAlignment={setAlignment} appearance={appearance} setAppearance={setAppearance} backstory={backstory} setBackstory={setBackstory} race={race} cls={cls} portrait={portrait} setPortrait={setPortrait} />,
    Gear:       <StepGear       key="gear"      cls={cls}               background={background} gearChoices={gearChoices} setGearChoices={setGearChoices} />,
  };

  const totalSteps = dynamicSteps.length;
  const currentLabel = dynamicSteps[step];
  const isLast = step === totalSteps - 1;

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Corner filigree accents */}
        {['top:6px;left:6px', 'top:6px;right:6px;transform:scaleX(-1)', 'bottom:6px;left:6px;transform:scaleY(-1)', 'bottom:6px;right:6px;transform:scale(-1,-1)'].map((pos, i) => {
          const st = Object.fromEntries(pos.split(';').map(p => { const [k,v] = p.split(':'); return [k,v]; }));
          return (
            <svg key={i} width="22" height="22" viewBox="0 0 22 22" style={{ position: 'absolute', ...st, pointerEvents: 'none', zIndex: 1 }}>
              <path d="M0,0 Q11,1 20,20" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
              <circle cx="1.5" cy="1.5" r="1.3" fill="#d4af37" opacity="0.3" />
            </svg>
          );
        })}

        {/* Fixed top section */}
        <div style={s.cardTop}>
          <div style={s.topBar}>
            <span style={s.stepCounter}>Step {step + 1} of {totalSteps}</span>
            {onCancel && (
              <button style={s.cancelBtn} onClick={onCancel}>✕ Cancel</button>
            )}
          </div>

          <div style={s.titleRow}>
            <span style={s.headerGlyph}>⚔</span>
            <h1 style={s.title}>Create Your Character</h1>
          </div>

          <div style={s.dotsRow}>
            {dynamicSteps.map((_, i) => (
              <div
                key={i}
                style={{
                  ...s.dot,
                  ...(i === step ? s.dotActive : {}),
                  ...(i < step ? s.dotDone : {}),
                  cursor: i < step ? 'pointer' : 'default',
                }}
                onClick={() => i < step && setStep(i)}
                title={i < step ? `Back to ${dynamicSteps[i]}` : undefined}
              />
            ))}
          </div>

          <div style={s.stepHeading}>{STEP_TITLES[currentLabel]}</div>
          <div style={s.divider} />

          {(race || cls) && (dynamicSteps.indexOf('Abilities') < step) && (
            <SummaryPanel
              name={name}
              race={race}
              cls={cls}
              background={background}
              finalStats={finalStats}
              skills={skills}
            />
          )}
        </div>

        {/* Scrollable step content */}
        <div style={s.scrollArea}>
          <div>{stepMap[currentLabel]}</div>
          {error && <p style={s.errorMsg}>{error}</p>}
        </div>

        {/* Always-visible nav footer */}
        <div style={s.navRow}>
          {step > 0 && (
            <button style={s.backBtn} onClick={() => setStep(step - 1)}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast ? (
            <button
              style={{ ...s.nextBtn, ...(!canAdvance() ? s.nextBtnDisabled : {}) }}
              onClick={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
            >
              Next: {STEP_TITLES[dynamicSteps[step + 1]]} →
            </button>
          ) : (
            <button
              style={{ ...s.confirmBtn, ...(!canAdvance() || saving ? s.confirmBtnDisabled : {}) }}
              onClick={handleConfirm}
              disabled={!canAdvance() || saving}
            >
              {saving ? 'Saving…' : `Enter as ${name.trim() || '…'}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// Look up real item data from WEAPONS/ARMOR, or return a generic item
function resolveItem(name) {
  if (!name) return null;
  const clean = name.replace(/^(a |an |the |\d+× )/i, '').trim();
  const weapon = WEAPONS.find(w => w.name.toLowerCase() === clean.toLowerCase());
  if (weapon) return { ...weapon, quantity: 1, type: 'weapon' };
  const armorEntry = ARMOR.find(a => a.name.toLowerCase() === clean.toLowerCase());
  if (armorEntry) {
    // Map 'type' → 'armorType' so getSlotType + computeAcFromEquipped work correctly
    return { ...armorEntry, armorType: armorEntry.type, type: 'armor', quantity: 1 };
  }
  // Generic item
  const countMatch = name.match(/^(\d+)\s+/);
  return {
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
    type: 'equipment',
    quantity: countMatch ? parseInt(countMatch[1]) : 1,
    description: 'Starting equipment',
    weight: 0.5,
  };
}

// Convert gear choices to inventory items
function buildGearInventory(gearChoices, clsData) {
  if (!clsData) return [];
  if (gearChoices.method === 'gold') return [];

  const items = [];
  const equipLines = clsData.startingEquipment || [];
  const weaponPicks = gearChoices.weaponPicks || {};

  equipLines.forEach((line, idx) => {
    const abMatch = line.match(/^\(a\)\s*(.+?)\s+or\s+\(b\)\s*(.+)$/i);
    if (abMatch) {
      const choice = gearChoices.selections?.[idx];
      const chosenText = choice === 'b' ? abMatch[2] : abMatch[1];
      const opt = choice || 'a';
      items.push(...parseItemString(chosenText, idx, opt, weaponPicks));
    } else {
      items.push(...parseItemString(line, idx, 'fixed', weaponPicks));
    }
  });

  return items;
}

function parseItemString(str, lineIdx, opt, weaponPicks = {}) {
  const t = str.toLowerCase();
  const results = [];

  // Detect "two martial weapons" or "a martial weapon"
  if (/two martial weapons/.test(t)) {
    const w0 = weaponPicks[`${lineIdx}-${opt}-0`] || weaponPicks[`fixed-${lineIdx}-0`];
    const w1 = weaponPicks[`${lineIdx}-${opt}-1`] || weaponPicks[`fixed-${lineIdx}-1`];
    if (w0) results.push(resolveItem(w0));
    if (w1) results.push(resolveItem(w1));
    return results.filter(Boolean);
  }
  if (/a martial weapon and a shield/.test(t)) {
    const w0 = weaponPicks[`${lineIdx}-${opt}-0`] || weaponPicks[`fixed-${lineIdx}-0`];
    if (w0) results.push(resolveItem(w0));
    results.push(resolveItem('Shield'));
    return results.filter(Boolean);
  }
  if (/a martial weapon|any martial melee weapon|any martial weapon/.test(t)) {
    const w0 = weaponPicks[`${lineIdx}-${opt}-0`] || weaponPicks[`fixed-${lineIdx}-0`];
    if (w0) results.push(resolveItem(w0));
    return results.filter(Boolean);
  }
  if (/any simple melee weapon|any simple weapon/.test(t)) {
    const w0 = weaponPicks[`${lineIdx}-${opt}-0`] || weaponPicks[`fixed-${lineIdx}-0`];
    if (w0) results.push(resolveItem(w0));
    return results.filter(Boolean);
  }

  // Generic: split on commas/and
  const clean = str.replace(/^(a |an |the )/i, '').trim();
  const parts = clean.split(/,\s*and\s*|\s+and\s+|,\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 2);
  return parts.map(p => resolveItem(p)).filter(Boolean);
}
