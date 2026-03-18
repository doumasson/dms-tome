import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CLASSES } from '../data/classes';
import { getRace, applyRacialBonuses } from '../data/races';
import {
  calcHp, calcAc, buildAttacks, buildSpellSlots, buildFeatures,
  avatarUrl, profBonus, getStarterSpells,
} from '../lib/charBuilder';
import { getStartingInventory } from '../data/equipment';
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
    if (label === 'Background') return !!background;
    if (label === 'Spells')     return true;
    if (label === 'Abilities')  return true;
    if (label === 'Identity')   return !!name.trim();
    if (label === 'Gear')       return true;
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

    const character = {
      id: crypto.randomUUID(),
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
      ac,
      speed: raceData?.speed || 30,
      stats: finalStats,
      skills,
      attacks,
      features,
      spellSlots,
      spells: selectedSpells.length > 0 ? selectedSpells : getStarterSpells(cls),
      equipment: clsData?.startingEquipment || [],
      inventory: [...starterItems, ...gearItems],
      equippedItems: {},
      gold: gearChoices.method === 'gold' ? gearChoices.gold : 0,
      proficiencyBonus: pb,
      portrait: avatarUrl(name.trim(), race, cls),
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
    Abilities:  <StepAbilities  key="abilities" race={race}             baseStats={baseStats} setBaseStats={setBaseStats} method={method} setMethod={setMethod} flexChoices={flexChoices} setFlexChoices={setFlexChoices} />,
    Identity:   <StepIdentity   key="identity"  name={name}             setName={setName} alignment={alignment} setAlignment={setAlignment} appearance={appearance} setAppearance={setAppearance} backstory={backstory} setBackstory={setBackstory} race={race} cls={cls} />,
    Gear:       <StepGear       key="gear"      cls={cls}               background={background} gearChoices={gearChoices} setGearChoices={setGearChoices} />,
  };

  const totalSteps = dynamicSteps.length;
  const currentLabel = dynamicSteps[step];
  const isLast = step === totalSteps - 1;

  return (
    <div style={s.page}>
      <div style={s.card}>

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

          {(race || cls) && (
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

// Convert gear choices to inventory items
function buildGearInventory(gearChoices, clsData) {
  if (!clsData) return [];
  if (gearChoices.method === 'gold') return [];

  const items = [];
  const equipLines = clsData.startingEquipment || [];

  equipLines.forEach((line, idx) => {
    const abMatch = line.match(/^\(a\)\s*(.+?)\s+or\s+\(b\)\s*(.+)$/i);
    if (abMatch) {
      const choice = gearChoices.selections?.[idx];
      const chosen = choice === 'b' ? abMatch[2] : abMatch[1];
      items.push(...parseItemString(chosen));
    } else {
      items.push(...parseItemString(line));
    }
  });

  return items;
}

function parseItemString(str) {
  const clean = str.replace(/^(a |an |the )/i, '').trim();
  const parts = clean.split(/,\s*and\s*|\s+and\s+|,\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 2);
  return parts.map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    type: 'equipment',
    quantity: 1,
    description: 'Starting equipment',
  }));
}
