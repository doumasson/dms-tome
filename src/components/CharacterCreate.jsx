import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CLASSES, CLASS_NAMES, getSpellSlots, getFeaturesUpToLevel } from '../data/classes';
import { RACES, getRace, getBaseRaces, getSubraces, applyRacialBonuses } from '../data/races';

// ─── Constants ───────────────────────────────────────────────────────────────

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const STAT_FULL = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

const BACKGROUNDS = [
  { name: 'Acolyte',    skills: ['Insight', 'Religion'],      description: 'You have spent your life in service to a temple.' },
  { name: 'Criminal',   skills: ['Deception', 'Stealth'],     description: 'You have a history of breaking the law.' },
  { name: 'Folk Hero',  skills: ['Animal Handling', 'Survival'], description: 'You come from humble beginnings among common people.' },
  { name: 'Noble',      skills: ['History', 'Persuasion'],    description: 'You understand wealth, power, and privilege.' },
  { name: 'Outlander',  skills: ['Athletics', 'Survival'],    description: 'You grew up in the wilds, far from civilization.' },
  { name: 'Sage',       skills: ['Arcana', 'History'],        description: 'You spent years learning the lore of the multiverse.' },
  { name: 'Soldier',    skills: ['Athletics', 'Intimidation'], description: 'War has been your life for as long as you care to remember.' },
  { name: 'Charlatan',  skills: ['Deception', 'Sleight of Hand'], description: 'You have always had a way with people.' },
  { name: 'Entertainer', skills: ['Acrobatics', 'Performance'], description: 'You thrive in front of an audience.' },
  { name: 'Guild Artisan', skills: ['Insight', 'Persuasion'], description: 'You are a member of an artisan\'s guild.' },
  { name: 'Hermit',     skills: ['Medicine', 'Religion'],     description: 'You lived in seclusion — in a monastery or on your own.' },
  { name: 'Sailor',     skills: ['Athletics', 'Perception'],  description: 'You sailed on a seagoing vessel for years.' },
  { name: 'Urchin',     skills: ['Sleight of Hand', 'Stealth'], description: 'You grew up on the streets alone, orphaned, and poor.' },
];

const ALIGNMENT_OPTIONS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statMod(val) {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function modNum(val) {
  return Math.floor((val - 10) / 2);
}

function profBonus(level) {
  return Math.ceil(level / 4) + 1;
}

function calcHp(cls, conScore, level = 1) {
  const conMod = modNum(conScore);
  return cls.hitDie + conMod + (level - 1) * (Math.floor(cls.hitDie / 2) + 1 + conMod);
}

function calcAc(cls, dexScore, equipped = []) {
  const dexMod = modNum(dexScore);
  const hasHeavy = cls.armorProficiencies?.includes('Heavy');
  const hasMedium = cls.armorProficiencies?.includes('Medium');
  const hasLight = cls.armorProficiencies?.includes('Light');
  if (hasHeavy) return 16; // chain mail base
  if (hasMedium) return 13 + Math.min(dexMod, 2); // scale mail
  if (hasLight) return 11 + dexMod; // leather
  return 10 + dexMod; // unarmored
}

function buildSpellSlots(className, level) {
  const slots = getSpellSlots(className, level);
  if (!slots) return {};
  // warlock pact magic
  if (slots.slots !== undefined) {
    return { [slots.level]: { total: slots.slots, used: 0 } };
  }
  // array of per-spell-level counts
  const result = {};
  slots.forEach((count, idx) => {
    if (count > 0) result[idx + 1] = { total: count, used: 0 };
  });
  return result;
}

function buildAttacks(className, finalStats) {
  const cls = CLASSES[className];
  if (!cls) return [];
  const strMod = modNum(finalStats.str);
  const dexMod = modNum(finalStats.dex);
  const pb = profBonus(1);
  const isMartial = cls.weaponProficiencies?.includes('Martial');
  const isFinesseClass = ['Rogue', 'Monk', 'Bard'].includes(className);
  const spellAbility = cls.spellAbility;
  const spellMod = spellAbility ? modNum(finalStats[spellAbility.toLowerCase()]) : 0;

  if (className === 'Wizard' || className === 'Sorcerer') {
    return [{ name: 'Fire Bolt', bonus: `+${spellMod + pb}`, damage: '1d10 fire', type: 'cantrip' }];
  }
  if (className === 'Warlock') {
    return [{ name: 'Eldritch Blast', bonus: `+${spellMod + pb}`, damage: '1d10 force', type: 'cantrip' }];
  }
  if (className === 'Druid') {
    return [{ name: 'Shillelagh', bonus: `+${spellMod + pb}`, damage: '1d8 bludgeoning', type: 'cantrip' },
            { name: 'Quarterstaff', bonus: `+${strMod + pb}`, damage: '1d6+' + strMod }];
  }
  if (className === 'Cleric') {
    return [{ name: 'Sacred Flame', bonus: `+${spellMod + pb}`, damage: '1d8 radiant', type: 'cantrip' },
            { name: 'Mace', bonus: `+${strMod + pb}`, damage: '1d6+' + strMod }];
  }
  if (isFinesseClass) {
    const mod = Math.max(strMod, dexMod);
    return [{ name: className === 'Monk' ? 'Unarmed Strike' : 'Shortsword', bonus: `+${mod + pb}`, damage: className === 'Monk' ? '1d4+' + mod : '1d6+' + mod }];
  }
  if (isMartial) {
    return [{ name: 'Longsword', bonus: `+${strMod + pb}`, damage: '1d8+' + strMod }];
  }
  return [{ name: 'Shortsword', bonus: `+${Math.max(strMod, dexMod) + pb}`, damage: '1d6+' + Math.max(strMod, dexMod) }];
}

function buildFeatures(className, level = 1) {
  return getFeaturesUpToLevel(className, level);
}

function avatarUrl(name, race, cls) {
  const seed = encodeURIComponent(`${name} ${race} ${cls}`.trim());
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Identity'];

// ─── Step 1: Race ─────────────────────────────────────────────────────────────

function StepRace({ race, setRace }) {
  const bases = getBaseRaces();
  const [hoveredRace, setHoveredRace] = useState(null);
  const selected = getRace(race);
  const preview = hoveredRace ? getRace(hoveredRace) : selected;

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {bases.map(r => {
          const subraces = getSubraces(r.baseName);
          const isSelected = race === r.name || subraces.some(sr => sr.name === race);
          return (
            <div key={r.name}>
              <button
                style={{ ...s.optionBtn, ...(isSelected && !subraces.some(sr => sr.name === race) && race === r.name ? s.optionBtnActive : {}), ...(isSelected ? s.optionBtnGroupActive : {}) }}
                onClick={() => setRace(r.name)}
                onMouseEnter={() => setHoveredRace(r.name)}
                onMouseLeave={() => setHoveredRace(null)}
              >
                {r.name}
              </button>
              {subraces.length > 0 && (
                <div style={s.subraceList}>
                  {subraces.map(sr => (
                    <button
                      key={sr.name}
                      style={{ ...s.optionBtn, ...s.subraceBtn, ...(race === sr.name ? s.optionBtnActive : {}) }}
                      onClick={() => setRace(sr.name)}
                      onMouseEnter={() => setHoveredRace(sr.name)}
                      onMouseLeave={() => setHoveredRace(null)}
                    >
                      {sr.subrace}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <p style={s.detailDesc}>{preview.description}</p>
            <div style={s.statBonusRow}>
              {Object.entries(preview.statBonuses).map(([k, v]) => (
                <span key={k} style={s.statBonusBadge}>{STAT_LABELS[k]} +{v}</span>
              ))}
              {preview.flexibleBonusCount && (
                <span style={s.statBonusBadge}>Any +1 ×{preview.flexibleBonusCount}</span>
              )}
            </div>
            <div style={s.traitList}>
              <div style={s.traitHeader}>Speed {preview.speed}ft · {preview.size}</div>
              {preview.darkvision && <div style={s.traitHeader}>Darkvision {preview.darkvision}ft</div>}
              {preview.traits.map(t => (
                <div key={t.name} style={s.traitItem}>
                  <span style={s.traitName}>{t.name}.</span>{' '}
                  <span style={s.traitDesc}>{t.description}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a race to see its traits.</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Class ────────────────────────────────────────────────────────────

function StepClass({ cls, setCls }) {
  const [hovered, setHovered] = useState(null);
  const selected = cls ? CLASSES[cls] : null;
  const preview = hovered ? CLASSES[hovered] : selected;

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {CLASS_NAMES.map(name => (
          <button
            key={name}
            style={{ ...s.optionBtn, ...(cls === name ? s.optionBtnActive : {}) }}
            onClick={() => setCls(name)}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <div style={s.classMetaRow}>
              <span style={s.classMeta}>d{preview.hitDie} Hit Die</span>
              <span style={s.classMeta}>Primary: {preview.primaryAbility}</span>
              <span style={s.classMeta}>Saves: {preview.savingThrows.join(', ')}</span>
            </div>
            {preview.castingType && (
              <div style={s.castingBadge}>
                {preview.castingType === 'warlock' ? '✦ Pact Magic' : `✦ ${preview.castingType} caster`}
                {preview.spellAbility && ` (${preview.spellAbility})`}
              </div>
            )}
            <div style={s.traitHeader}>Level 1 Features</div>
            {(preview.features[1] || []).map(f => (
              <div key={f} style={s.traitItem}>
                <span style={s.traitName}>{f}</span>
              </div>
            ))}
            <div style={{ ...s.traitHeader, marginTop: 12 }}>Armor & Weapons</div>
            <div style={s.traitItem}>
              <span style={s.traitDesc}>
                Armor: {preview.armorProficiencies.join(', ') || 'None'} ·{' '}
                Weapons: {preview.weaponProficiencies.join(', ')}
              </span>
            </div>
            <div style={{ ...s.traitHeader, marginTop: 12 }}>Starting Equipment</div>
            {preview.startingEquipment.map((e, i) => (
              <div key={i} style={{ ...s.traitItem, fontSize: '0.72rem' }}>• {e}</div>
            ))}
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a class to see its features.</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Background ───────────────────────────────────────────────────────

function StepBackground({ background, setBackground, skills, setSkills, cls }) {
  const clsData = cls ? CLASSES[cls] : null;
  const [hovered, setHovered] = useState(null);
  const bg = BACKGROUNDS.find(b => b.name === background);
  const preview = hovered ? BACKGROUNDS.find(b => b.name === hovered) : bg;

  // Class skill choices (up to skillCount)
  const classSkillPool = clsData?.skillChoices || [];
  const classSkillCount = clsData?.skillCount || 2;
  const bgSkills = bg?.skills || [];

  function toggleSkill(skill) {
    if (bgSkills.includes(skill)) return; // bg skills are fixed
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      const classSkillsCount = skills.filter(s => !bgSkills.includes(s)).length;
      if (classSkillsCount < classSkillCount) setSkills([...skills, skill]);
    }
  }

  // Sync bg skills when background changes
  const allSkills = [...new Set([...bgSkills, ...skills.filter(s => !bgSkills.includes(s))])];

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {BACKGROUNDS.map(b => (
          <button
            key={b.name}
            style={{ ...s.optionBtn, ...(background === b.name ? s.optionBtnActive : {}) }}
            onClick={() => {
              setBackground(b.name);
              setSkills(b.skills);
            }}
            onMouseEnter={() => setHovered(b.name)}
            onMouseLeave={() => setHovered(null)}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <p style={s.detailDesc}>{preview.description}</p>
            <div style={s.traitHeader}>Background Skills</div>
            <div style={s.skillTagRow}>
              {preview.skills.map(sk => (
                <span key={sk} style={s.skillTagFixed}>{sk}</span>
              ))}
            </div>
            {background === preview.name && clsData && (
              <>
                <div style={{ ...s.traitHeader, marginTop: 12 }}>
                  Class Skills (choose {classSkillCount})
                </div>
                <div style={s.skillTagRow}>
                  {classSkillPool.map(sk => {
                    const isBg = bgSkills.includes(sk);
                    const isChosen = skills.includes(sk) && !isBg;
                    return (
                      <button
                        key={sk}
                        style={{ ...s.skillTagBtn, ...(isChosen ? s.skillTagChosen : {}) }}
                        onClick={() => toggleSkill(sk)}
                        disabled={isBg}
                      >
                        {sk}
                      </button>
                    );
                  })}
                </div>
                <p style={s.nameHint}>
                  {skills.filter(s => !bgSkills.includes(s)).length}/{classSkillCount} chosen
                </p>
              </>
            )}
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a background to see its details.</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Ability Scores ───────────────────────────────────────────────────

function StepAbilities({ race, baseStats, setBaseStats, method, setMethod, flexChoices, setFlexChoices }) {
  const raceData = getRace(race);
  const finalStats = raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats;
  const [assignTarget, setAssignTarget] = useState(null); // which stat is being assigned
  const [rolled, setRolled] = useState(null); // 4d6-drop-lowest results

  const standardUsed = STANDARD_ARRAY.map(v =>
    Object.values(baseStats).includes(v) &&
    Object.entries(baseStats).find(([, val]) => val === v)?.[0]
  );

  function assignStandard(val) {
    if (!assignTarget) return;
    setBaseStats({ ...baseStats, [assignTarget]: val });
    setAssignTarget(null);
  }

  function rollStats() {
    const results = STAT_KEYS.map(() => {
      const dice = [1,2,3,4].map(() => Math.ceil(Math.random() * 6));
      dice.sort((a, b) => b - a);
      return dice.slice(0, 3).reduce((a, b) => a + b, 0);
    });
    setRolled(results);
    const newStats = {};
    STAT_KEYS.forEach((k, i) => newStats[k] = results[i]);
    setBaseStats(newStats);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Method selector */}
      <div style={s.methodRow}>
        {['standard', 'rolled'].map(m => (
          <button
            key={m}
            style={{ ...s.methodBtn, ...(method === m ? s.methodBtnActive : {}) }}
            onClick={() => { setMethod(m); if (m === 'standard') setBaseStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }); }}
          >
            {m === 'standard' ? 'Standard Array' : '4d6 Drop Lowest'}
          </button>
        ))}
        {method === 'rolled' && (
          <button style={s.rollDiceBtn} onClick={rollStats}>🎲 Roll!</button>
        )}
      </div>

      {/* Standard array picker */}
      {method === 'standard' && (
        <div style={s.standardRow}>
          {STANDARD_ARRAY.map((val, i) => {
            const usedBy = Object.entries(baseStats).find(([, v]) => v === val)?.[0];
            return (
              <button
                key={i}
                style={{ ...s.arrayValBtn, ...(assignTarget && !usedBy ? s.arrayValBtnAvail : {}), ...(usedBy ? s.arrayValBtnUsed : {}) }}
                onClick={() => assignTarget && !usedBy ? assignStandard(val) : null}
              >
                {val}
                {usedBy && <div style={s.arrayValUsedLabel}>{STAT_LABELS[usedBy]}</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* Stat grid */}
      <div style={s.statGrid}>
        {STAT_KEYS.map(k => {
          const base = baseStats[k];
          const final = finalStats[k];
          const bonus = final - base;
          const isTarget = assignTarget === k;
          return (
            <button
              key={k}
              style={{ ...s.statBlock, ...(isTarget ? s.statBlockTarget : {}) }}
              onClick={() => method === 'standard' ? setAssignTarget(isTarget ? null : k) : null}
              title={STAT_FULL[k]}
            >
              <div style={s.statBlockLabel}>{STAT_LABELS[k]}</div>
              <div style={s.statBlockVal}>{final}</div>
              <div style={s.statBlockMod}>{statMod(final)}</div>
              {bonus !== 0 && <div style={s.statBlockBonus}>+{bonus} racial</div>}
              {isTarget && <div style={s.statBlockHint}>click a value</div>}
            </button>
          );
        })}
      </div>

      {/* Flexible racial bonus choices (Half-Elf) */}
      {raceData?.flexibleBonusCount && (
        <div>
          <div style={s.traitHeader}>
            Choose {raceData.flexibleBonusCount} stats for +1 racial bonus
          </div>
          <div style={s.skillTagRow}>
            {STAT_KEYS.map(k => {
              const chosen = flexChoices.includes(k);
              return (
                <button
                  key={k}
                  style={{ ...s.skillTagBtn, ...(chosen ? s.skillTagChosen : {}) }}
                  onClick={() => {
                    if (chosen) setFlexChoices(flexChoices.filter(x => x !== k));
                    else if (flexChoices.length < raceData.flexibleBonusCount) setFlexChoices([...flexChoices, k]);
                  }}
                >
                  {STAT_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {method === 'standard' && (
        <p style={s.nameHint}>Click a stat block, then click an array value to assign it.</p>
      )}
    </div>
  );
}

// ─── Step 5: Identity ─────────────────────────────────────────────────────────

function StepIdentity({ name, setName, alignment, setAlignment, appearance, setAppearance, backstory, setBackstory, race, cls }) {
  const seed = name.trim() || `${race} ${cls}`;
  const avatar = avatarUrl(seed, race, cls);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={s.identityRow}>
        <img src={avatar} alt="Avatar" style={s.avatarPreview} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.fieldLabel}>Character Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Thorin Stoneback"
              style={s.fieldInput}
            />
          </div>
          <div>
            <label style={s.fieldLabel}>Alignment</label>
            <div style={s.alignGrid}>
              {ALIGNMENT_OPTIONS.map(a => (
                <button
                  key={a}
                  style={{ ...s.alignBtn, ...(alignment === a ? s.alignBtnActive : {}) }}
                  onClick={() => setAlignment(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label style={s.fieldLabel}>Appearance <span style={{ opacity: 0.5 }}>(optional)</span></label>
        <textarea
          value={appearance}
          onChange={e => setAppearance(e.target.value)}
          placeholder="Describe how your character looks..."
          style={{ ...s.fieldInput, ...s.fieldTextarea }}
          rows={2}
        />
      </div>

      <div>
        <label style={s.fieldLabel}>Backstory <span style={{ opacity: 0.5 }}>(optional)</span></label>
        <textarea
          value={backstory}
          onChange={e => setBackstory(e.target.value)}
          placeholder="Brief history — where are you from, why are you adventuring?"
          style={{ ...s.fieldInput, ...s.fieldTextarea }}
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({ name, race, cls, background, finalStats, level = 1, skills }) {
  const clsData = cls ? CLASSES[cls] : null;
  const hp = clsData ? calcHp(clsData, finalStats.con) : 0;
  const ac = clsData ? calcAc(clsData, finalStats.dex) : 10;
  const raceData = getRace(race);

  return (
    <div style={s.summaryPanel}>
      <div style={s.summaryTitle}>{name || '—'}</div>
      <div style={s.summarySubtitle}>{[race, cls, background].filter(Boolean).join(' · ')}</div>

      <div style={s.summaryStatRow}>
        {STAT_KEYS.map(k => (
          <div key={k} style={s.summaryStatBlock}>
            <div style={s.summaryStatLabel}>{STAT_LABELS[k]}</div>
            <div style={s.summaryStatVal}>{finalStats[k]}</div>
            <div style={s.summaryStatMod}>{statMod(finalStats[k])}</div>
          </div>
        ))}
      </div>

      <div style={s.summaryInfoRow}>
        {clsData && (
          <>
            <span style={s.summaryInfoItem}>♥ {hp} HP</span>
            <span style={s.summaryInfoItem}>🛡 AC {ac}</span>
            <span style={s.summaryInfoItem}>⚡ {raceData?.speed || 30}ft</span>
            <span style={s.summaryInfoItem}>d{clsData.hitDie} HD</span>
          </>
        )}
      </div>

      {skills.length > 0 && (
        <div style={s.summarySkills}>
          {skills.map(sk => <span key={sk} style={s.summarySkillBadge}>{sk}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function CharacterCreate({ user, campaignId, onDone }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Race
  const [race, setRace] = useState('');
  const [flexChoices, setFlexChoices] = useState([]);

  // Step 2: Class
  const [cls, setCls] = useState('');

  // Step 3: Background + skills
  const [background, setBackground] = useState('');
  const [skills, setSkills] = useState([]);

  // Step 4: Abilities
  const [method, setMethod] = useState('standard');
  const [baseStats, setBaseStats] = useState({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });

  // Step 5: Identity
  const [name, setName] = useState('');
  const [alignment, setAlignment] = useState('');
  const [appearance, setAppearance] = useState('');
  const [backstory, setBackstory] = useState('');

  const raceData = getRace(race);
  const clsData = cls ? CLASSES[cls] : null;

  const finalStats = useMemo(() =>
    raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats,
    [baseStats, race, flexChoices, raceData]
  );

  function canAdvance() {
    switch (step) {
      case 0: return !!race;
      case 1: return !!cls;
      case 2: return !!background;
      case 3: return true;
      case 4: return !!name.trim();
      default: return false;
    }
  }

  async function handleConfirm() {
    if (!canAdvance()) return;
    setSaving(true);
    setError('');

    const hp = calcHp(clsData, finalStats.con);
    const ac = calcAc(clsData, finalStats.dex);
    const attacks = buildAttacks(cls, finalStats);
    const spellSlots = buildSpellSlots(cls, 1);
    const features = buildFeatures(cls, 1);
    const pb = profBonus(1);

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
      ac,
      speed: raceData?.speed || 30,
      stats: finalStats,
      skills,
      attacks,
      features,
      spellSlots,
      equipment: clsData?.startingEquipment || [],
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

  const stepContent = [
    <StepRace key="race" race={race} setRace={setRace} />,
    <StepClass key="class" cls={cls} setCls={setCls} />,
    <StepBackground key="bg" background={background} setBackground={setBackground} skills={skills} setSkills={setSkills} cls={cls} />,
    <StepAbilities key="abilities" race={race} baseStats={baseStats} setBaseStats={setBaseStats} method={method} setMethod={setMethod} flexChoices={flexChoices} setFlexChoices={setFlexChoices} />,
    <StepIdentity key="identity" name={name} setName={setName} alignment={alignment} setAlignment={setAlignment} appearance={appearance} setAppearance={setAppearance} backstory={backstory} setBackstory={setBackstory} race={race} cls={cls} />,
  ];

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerGlyph}>⚔</div>
          <h1 style={s.title}>Create Your Character</h1>
        </div>

        {/* Step nav */}
        <div style={s.stepNav}>
          {STEPS.map((label, i) => (
            <button
              key={label}
              style={{
                ...s.stepTab,
                ...(i === step ? s.stepTabActive : {}),
                ...(i < step ? s.stepTabDone : {}),
              }}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              {i < step ? '✓ ' : ''}{label}
            </button>
          ))}
        </div>

        {/* Summary always visible after step 0 */}
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

        {/* Step content */}
        <div style={s.stepContent}>
          {stepContent[step]}
        </div>

        {error && <p style={s.errorMsg}>{error}</p>}

        {/* Nav buttons */}
        <div style={s.navRow}>
          {step > 0 && (
            <button style={s.backBtn} onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button
              style={{ ...s.nextBtn, ...(!canAdvance() ? s.nextBtnDisabled : {}) }}
              onClick={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
            >
              Next: {STEPS[step + 1]} →
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px 60px',
  },
  card: {
    width: '100%',
    maxWidth: 860,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  headerGlyph: {
    fontSize: '2.5rem',
    filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.5))',
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#d4af37',
    margin: 0,
  },
  stepNav: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid rgba(212,175,55,0.15)',
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  stepTab: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(200,180,140,0.4)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
    padding: '6px 12px',
    cursor: 'default',
    borderRadius: 4,
    textTransform: 'uppercase',
    transition: 'all 0.15s',
  },
  stepTabActive: {
    background: 'rgba(212,175,55,0.12)',
    color: '#d4af37',
    cursor: 'default',
  },
  stepTabDone: {
    color: 'rgba(212,175,55,0.6)',
    cursor: 'pointer',
  },
  // Summary
  summaryPanel: {
    background: 'rgba(212,175,55,0.04)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: 10,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  summaryTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1rem',
    color: '#f0e6d0',
  },
  summarySubtitle: {
    fontSize: '0.72rem',
    color: 'rgba(200,180,140,0.55)',
    fontStyle: 'italic',
  },
  summaryStatRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  summaryStatBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 5,
    padding: '4px 8px',
    minWidth: 40,
  },
  summaryStatLabel: {
    fontSize: '0.55rem',
    color: 'rgba(200,180,140,0.5)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  summaryStatVal: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#f0e6d0',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  summaryStatMod: {
    fontSize: '0.65rem',
    color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  summaryInfoRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryInfoItem: {
    fontSize: '0.75rem',
    color: 'rgba(200,180,140,0.7)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  summarySkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  summarySkillBadge: {
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.2)',
    color: 'rgba(212,175,55,0.7)',
    fontSize: '0.62rem',
    padding: '2px 8px',
    borderRadius: 10,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  // Step layout
  stepContent: {
    minHeight: 300,
  },
  stepLayout: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 20,
    alignItems: 'start',
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxHeight: 400,
    overflowY: 'auto',
  },
  optionBtn: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6,
    color: 'rgba(200,180,140,0.7)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.78rem',
    padding: '8px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  optionBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
    fontWeight: 700,
  },
  optionBtnGroupActive: {
    borderColor: 'rgba(212,175,55,0.2)',
  },
  subraceList: {
    paddingLeft: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginTop: 2,
  },
  subraceBtn: {
    fontSize: '0.72rem',
    padding: '5px 10px',
    background: 'transparent',
    borderColor: 'rgba(255,255,255,0.04)',
  },
  // Detail panel
  detailPanel: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '16px 18px',
    minHeight: 200,
  },
  detailPlaceholder: {
    color: 'rgba(200,180,140,0.3)',
    fontSize: '0.82rem',
    fontStyle: 'italic',
  },
  detailTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#d4af37',
    marginBottom: 8,
  },
  detailDesc: {
    color: 'rgba(200,180,140,0.65)',
    fontSize: '0.78rem',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  statBonusRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statBonusBadge: {
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: '#d4af37',
    fontSize: '0.68rem',
    padding: '2px 8px',
    borderRadius: 6,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
  },
  traitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  traitHeader: {
    fontSize: '0.65rem',
    color: 'rgba(200,180,140,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    marginBottom: 2,
  },
  traitItem: {
    fontSize: '0.72rem',
    lineHeight: 1.5,
    color: 'rgba(200,180,140,0.7)',
  },
  traitName: {
    color: 'rgba(200,180,140,0.9)',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
  },
  traitDesc: {
    color: 'rgba(200,180,140,0.6)',
  },
  classMetaRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  classMeta: {
    fontSize: '0.7rem',
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  castingBadge: {
    background: 'rgba(100,160,240,0.1)',
    border: '1px solid rgba(100,160,240,0.25)',
    color: 'rgba(100,160,240,0.85)',
    fontSize: '0.68rem',
    padding: '3px 10px',
    borderRadius: 6,
    fontFamily: "'Cinzel', Georgia, serif",
    display: 'inline-block',
    marginBottom: 10,
  },
  // Skill tags
  skillTagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
  },
  skillTagFixed: {
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: '#d4af37',
    fontSize: '0.65rem',
    padding: '3px 9px',
    borderRadius: 10,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  skillTagBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,140,0.55)',
    fontSize: '0.65rem',
    padding: '3px 9px',
    borderRadius: 10,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  skillTagChosen: {
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: 'rgba(212,175,55,0.8)',
  },
  // Ability scores
  methodRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.72rem',
    padding: '7px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  methodBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.35)',
    color: '#d4af37',
  },
  rollDiceBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 7,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '7px 14px',
    cursor: 'pointer',
  },
  standardRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  arrayValBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrayValBtnAvail: {
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
    cursor: 'pointer',
    background: 'rgba(212,175,55,0.08)',
  },
  arrayValBtnUsed: {
    opacity: 0.35,
  },
  arrayValUsedLabel: {
    fontSize: '0.48rem',
    color: 'rgba(200,180,140,0.5)',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  },
  statBlock: {
    background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  statBlockTarget: {
    border: '2px solid rgba(212,175,55,0.6)',
    background: 'rgba(212,175,55,0.06)',
  },
  statBlockLabel: {
    fontSize: '0.58rem',
    color: 'rgba(200,180,140,0.45)',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  statBlockVal: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#f0e6d0',
    lineHeight: 1,
  },
  statBlockMod: {
    fontSize: '0.7rem',
    color: '#d4af37',
    fontWeight: 700,
  },
  statBlockBonus: {
    fontSize: '0.52rem',
    color: 'rgba(100,200,100,0.7)',
    letterSpacing: '0.02em',
  },
  statBlockHint: {
    fontSize: '0.5rem',
    color: 'rgba(212,175,55,0.5)',
  },
  // Identity
  identityRow: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(212,175,55,0.08)',
    border: '2px solid rgba(212,175,55,0.2)',
    flexShrink: 0,
  },
  fieldLabel: {
    display: 'block',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.68rem',
    color: 'rgba(200,180,140,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    marginBottom: 5,
  },
  fieldInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f0e6d0',
    fontSize: '0.95rem',
    fontFamily: "'Cinzel', Georgia, serif",
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  fieldTextarea: {
    fontSize: '0.82rem',
    fontFamily: 'Georgia, serif',
    lineHeight: 1.5,
  },
  alignGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 5,
    marginTop: 4,
  },
  alignBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 5,
    color: 'rgba(200,180,140,0.5)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.62rem',
    padding: '5px 4px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  alignBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
  },
  nameHint: {
    color: 'rgba(200,180,140,0.35)',
    fontSize: '0.7rem',
    margin: '4px 0 0',
  },
  errorMsg: {
    color: '#e74c3c',
    fontSize: '0.82rem',
    textAlign: 'center',
  },
  // Navigation
  navRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    paddingTop: 8,
    borderTop: '1px solid rgba(212,175,55,0.1)',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'rgba(200,180,140,0.55)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.78rem',
    padding: '10px 18px',
    cursor: 'pointer',
    minHeight: 42,
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 8,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '0.85rem',
    letterSpacing: '0.03em',
    padding: '10px 22px',
    cursor: 'pointer',
    minHeight: 42,
  },
  nextBtnDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(200,180,140,0.3)',
    cursor: 'not-allowed',
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 10,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '0.95rem',
    letterSpacing: '0.04em',
    padding: '12px 24px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212,175,55,0.25)',
    minHeight: 48,
  },
  confirmBtnDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(200,180,140,0.3)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
