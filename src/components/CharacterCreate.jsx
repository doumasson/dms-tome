import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CLASSES } from '../data/classes';
import { getRace, applyRacialBonuses } from '../data/races';
import {
  STEPS, calcHp, calcAc, buildAttacks, buildSpellSlots, buildFeatures,
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
import SummaryPanel   from './characterCreate/SummaryPanel';

const SPELLCASTING_CLASSES = new Set(['Wizard','Sorcerer','Warlock','Bard','Cleric','Druid','Paladin','Ranger']);

export default function CharacterCreate({ user, campaignId, onDone }) {
  const [step, setSte] = useState(0);
  const setStep = setSte;
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const [race,        setRace]        = useState('');
  const [flexChoices, setFlexChoices] = useState([]);
  const [cls,         setCls]         = useState('');
  const [background,  setBackground]  = useState('');
  const [skills,      setSkills]      = useState([]);
  const [method,      setMethod]      = useState('standard');
  const [baseStats,   setBaseStats]   = useState({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
  const [name,        setName]        = useState('');
  const [alignment,   setAlignment]   = useState('');
  const [appearance,  setAppearance]  = useState('');
  const [backstory,   setBackstory]   = useState('');
  const [selectedSpells, setSelectedSpells] = useState([]);

  const isSpellcaster = cls && SPELLCASTING_CLASSES.has(cls);

  const raceData   = getRace(race);
  const clsData    = cls ? CLASSES[cls] : null;
  const finalStats = useMemo(
    () => raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats,
    [baseStats, race, flexChoices, raceData],
  );

  // Dynamic steps: insert 'Spells' between Background and Abilities for spellcasters
  const dynamicSteps = useMemo(() => {
    const base = [...STEPS]; // ['Race','Class','Background','Abilities','Identity']
    if (isSpellcaster) {
      base.splice(3, 0, 'Spells'); // insert before Abilities
    }
    return base;
  }, [isSpellcaster]);

  function canAdvance() {
    const label = dynamicSteps[step];
    if (label === 'Race') return !!race;
    if (label === 'Class') return !!cls;
    if (label === 'Background') return !!background;
    if (label === 'Spells') return true; // optional selections
    if (label === 'Abilities') return true;
    if (label === 'Identity') return !!name.trim();
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
      hp,
      maxHp: hp,
      currentHp: hp,
      ac,
      speed: raceData?.speed || 30,
      stats: finalStats,
      skills,
      attacks,
      features,
      spellSlots,
      spells: selectedSpells.length > 0 ? selectedSpells : getStarterSpells(cls),
      equipment: clsData?.startingEquipment || [],
      inventory: getStartingInventory(),
      equippedItems: {},
      gold: 0,
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

    setSaving(false);
    if (dbErr) {
      setError('Failed to save character. Please try again.');
      return;
    }
    onDone(character);
  }

  const stepMap = {
    Race:       <StepRace       key="race"      race={race}             setRace={setRace} />,
    Class:      <StepClass      key="class"     cls={cls}               setCls={setCls} />,
    Background: <StepBackground key="bg"        background={background} setBackground={setBackground} skills={skills} setSkills={setSkills} cls={cls} />,
    Spells:     <StepSpells     key="spells"    cls={cls}               selectedSpells={selectedSpells} setSelectedSpells={setSelectedSpells} />,
    Abilities:  <StepAbilities  key="abilities" race={race}             baseStats={baseStats} setBaseStats={setBaseStats} method={method} setMethod={setMethod} flexChoices={flexChoices} setFlexChoices={setFlexChoices} />,
    Identity:   <StepIdentity   key="identity"  name={name}             setName={setName} alignment={alignment} setAlignment={setAlignment} appearance={appearance} setAppearance={setAppearance} backstory={backstory} setBackstory={setBackstory} race={race} cls={cls} />,
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerGlyph}>⚔</div>
          <h1 style={s.title}>Create Your Character</h1>
        </div>

        <div style={s.stepNav}>
          {dynamicSteps.map((label, i) => (
            <button
              key={label}
              style={{ ...s.stepTab, ...(i === step ? s.stepTabActive : {}), ...(i < step ? s.stepTabDone : {}) }}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              {i < step ? '✓ ' : ''}{label}
            </button>
          ))}
        </div>

        {(race || cls) && (
          <SummaryPanel name={name} race={race} cls={cls} background={background} finalStats={finalStats} skills={skills} />
        )}

        <div style={s.stepContent}>
          {stepMap[dynamicSteps[step]]}
        </div>

        {error && <p style={s.errorMsg}>{error}</p>}

        <div style={s.navRow}>
          {step > 0 && (
            <button style={s.backBtn} onClick={() => setStep(step - 1)}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < dynamicSteps.length - 1 ? (
            <button
              style={{ ...s.nextBtn, ...(!canAdvance() ? s.nextBtnDisabled : {}) }}
              onClick={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
            >
              Next: {dynamicSteps[step + 1]} →
            </button>
          ) : (
            <button
              style={{ ...s.confirmBtn, ...(!canAdvance() || saving ? s.confirmBtnDisabled : {}) }}
              onClick={handleConfirm}
              disabled={!canAdvance() || saving}
            >
              {saving ? 'Saving…' : `Enter the Campaign as ${name.trim() || '…'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
