import { useState } from 'react';
import './SkillsPanel.css';

const SKILLS = [
  { name: 'Acrobatics', ability: 'dex', category: 'Physical' },
  { name: 'Animal Handling', ability: 'wis', category: 'Survival' },
  { name: 'Arcana', ability: 'int', category: 'Knowledge' },
  { name: 'Athletics', ability: 'str', category: 'Physical' },
  { name: 'Deception', ability: 'cha', category: 'Social' },
  { name: 'History', ability: 'int', category: 'Knowledge' },
  { name: 'Insight', ability: 'wis', category: 'Social' },
  { name: 'Intimidation', ability: 'cha', category: 'Social' },
  { name: 'Investigation', ability: 'int', category: 'Knowledge' },
  { name: 'Medicine', ability: 'wis', category: 'Knowledge' },
  { name: 'Nature', ability: 'wis', category: 'Knowledge' },
  { name: 'Perception', ability: 'wis', category: 'Survival' },
  { name: 'Performance', ability: 'cha', category: 'Social' },
  { name: 'Persuasion', ability: 'cha', category: 'Social' },
  { name: 'Religion', ability: 'int', category: 'Knowledge' },
  { name: 'Sleight of Hand', ability: 'dex', category: 'Physical' },
  { name: 'Stealth', ability: 'dex', category: 'Physical' },
  { name: 'Survival', ability: 'wis', category: 'Survival' },
];

const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_SHORT = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

/**
 * SkillsPanel - Character skills and proficiencies display
 * Shows all skills, ability modifiers, proficiency status
 */
export default function SkillsPanel({
  character = {},
  onClose = () => {},
}) {
  const [activeTab, setActiveTab] = useState('skills');

  const stats = character.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const proficiencies = character.proficiencies || [];
  const expertise = character.expertise || [];
  const level = character.level || 1;
  const profBonus = Math.ceil(level / 4) + 1;

  const getAbilityMod = (ability) => Math.floor((stats[ability] - 10) / 2);

  const getSkillBonus = (skillName) => {
    const skill = SKILLS.find(s => s.name === skillName);
    if (!skill) return 0;

    const abilityMod = getAbilityMod(skill.ability);
    const isProficient = proficiencies.includes(skillName);
    const isExpertise = expertise.includes(skillName);

    let bonus = abilityMod;
    if (isProficient) bonus += profBonus;
    if (isExpertise) bonus += profBonus;

    return bonus;
  };

  const getSkillStatus = (skillName) => {
    if (expertise.includes(skillName)) return 'expertise';
    if (proficiencies.includes(skillName)) return 'proficient';
    return 'untrained';
  };

  const savingThrows = Object.entries(stats).map(([ability, value]) => ({
    ability,
    mod: getAbilityMod(ability),
    isProficient: proficiencies.includes(`${ABILITY_NAMES[ability]} save`),
  }));

  return (
    <div className="skills-panel-overlay" onClick={onClose}>
      <div className="skills-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="skills-header">
          <h2 className="skills-title">⚔️ Skills & Abilities</h2>
          <button className="skills-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="skills-tabs">
          <button
            className={`skills-tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button
            className={`skills-tab ${activeTab === 'saves' ? 'active' : ''}`}
            onClick={() => setActiveTab('saves')}
          >
            Saves
          </button>
          <button
            className={`skills-tab ${activeTab === 'abilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('abilities')}
          >
            Abilities
          </button>
        </div>

        {/* Content */}
        <div className="skills-content">
          {activeTab === 'skills' && (
            <div className="skills-list">
              {SKILLS.map((skill) => {
                const bonus = getSkillBonus(skill.name);
                const status = getSkillStatus(skill.name);
                const abilityMod = getAbilityMod(skill.ability);

                return (
                  <div key={skill.name} className={`skill-row ${status}`}>
                    <div className="skill-info">
                      <div className="skill-name">{skill.name}</div>
                      <div className="skill-ability">
                        {ABILITY_SHORT[skill.ability]} ({abilityMod >= 0 ? '+' : ''}{abilityMod})
                      </div>
                    </div>
                    <div className="skill-status">
                      {status === 'expertise' && <span className="expertise-badge">★</span>}
                      {status === 'proficient' && <span className="prof-badge">✓</span>}
                    </div>
                    <div className={`skill-bonus ${bonus >= 0 ? 'positive' : 'negative'}`}>
                      {bonus >= 0 ? '+' : ''}{bonus}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'saves' && (
            <div className="saves-list">
              <p className="saves-intro">Saving Throw Proficiencies</p>
              {savingThrows.map(({ ability, mod, isProficient }) => (
                <div key={ability} className={`save-row ${isProficient ? 'proficient' : ''}`}>
                  <div className="save-name">{ABILITY_NAMES[ability]}</div>
                  <div className={`save-bonus ${mod >= 0 ? 'positive' : 'negative'}`}>
                    {mod >= 0 ? '+' : ''}{mod}
                    {isProficient && <span className="save-prof-badge">+{profBonus}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'abilities' && (
            <div className="abilities-info">
              <div className="ability-group">
                <h3 className="ability-group-title">Core Stats</h3>
                <div className="ability-grid">
                  {Object.entries(stats).map(([ability, value]) => (
                    <div key={ability} className="ability-card">
                      <div className="ability-abbr">{ABILITY_SHORT[ability]}</div>
                      <div className="ability-score">{value}</div>
                      <div className="ability-mod">
                        ({getAbilityMod(ability) >= 0 ? '+' : ''}{getAbilityMod(ability)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ability-group">
                <h3 className="ability-group-title">Proficiency Bonus</h3>
                <div className="prof-bonus-display">
                  +{profBonus}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="skills-footer">
          <button className="skills-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
