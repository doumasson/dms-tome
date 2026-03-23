import { useState } from 'react';
import './BackgroundSelect.css';

/**
 * Background Selection Screen
 * Choose character background from SRD 5.1 options
 * Dark fantasy card layout with background abilities
 */

const BACKGROUNDS = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    description: 'Blessed by a deity to pursue holy deeds',
    skills: ['Insight', 'Religion'],
    languages: 1,
    equipment: 'Holy symbol, prayer book, robes'
  },
  {
    id: 'charlatan',
    name: 'Charlatan',
    description: 'Con artist and master of deception',
    skills: ['Deception', 'Sleight of Hand'],
    languages: 0,
    equipment: 'Disguise kit, forgery kit'
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: 'Seasoned member of the criminal underworld',
    skills: ['Deception', 'Stealth'],
    languages: 0,
    equipment: 'Thieves\' tools, dark clothes'
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    description: 'Performer who captivates audiences',
    skills: ['Acrobatics', 'Performance'],
    languages: 0,
    equipment: 'Musical instrument'
  },
  {
    id: 'folk_hero',
    name: 'Folk Hero',
    description: 'Champion of common folk against tyranny',
    skills: ['Animal Handling', 'Survival'],
    languages: 0,
    equipment: 'Carpenter\'s tools'
  },
  {
    id: 'guild_artisan',
    name: 'Guild Artisan',
    description: 'Master craftsperson in a skilled trade',
    skills: ['Insight', 'Persuasion'],
    languages: 1,
    equipment: 'Artisan\'s tools'
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description: 'Isolated mystic seeking truth in solitude',
    skills: ['Medicine', 'Religion'],
    languages: 1,
    equipment: 'Scholar\'s pack'
  },
  {
    id: 'noble',
    name: 'Noble',
    description: 'Member of nobility with lands and titles',
    skills: ['Insight', 'Persuasion'],
    languages: 1,
    equipment: 'Fine clothes, signet ring'
  },
  {
    id: 'outlander',
    name: 'Outlander',
    description: 'Hardy survivor of the wilderness',
    skills: ['Athletics', 'Survival'],
    languages: 1,
    equipment: 'Bedroll, rope, tinderbox'
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Scholar devoted to knowledge and learning',
    skills: ['Arcana', 'History'],
    languages: 2,
    equipment: 'Scholar\'s pack, ink, quill'
  },
  {
    id: 'sailor',
    name: 'Sailor',
    description: 'Seasoned seafarer and adventurous explorer',
    skills: ['Athletics', 'Perception'],
    languages: 0,
    equipment: 'Sailmaker\'s tools'
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'Battle-hardened veteran of organized warfare',
    skills: ['Athletics', 'Intimidation'],
    languages: 0,
    equipment: 'Insignia of rank, trophy'
  },
  {
    id: 'urchin',
    name: 'Urchin',
    description: 'Street orphan who survived by cunning',
    skills: ['Sleight of Hand', 'Stealth'],
    languages: 0,
    equipment: 'Thieves\' tools, small knife'
  }
];

export default function BackgroundSelect({
  selectedBackground = null,
  onSelect = () => {},
  onNext = () => {},
  onBack = () => {}
}) {
  const [selected, setSelected] = useState(selectedBackground);

  const handleSelect = (background) => {
    setSelected(background.id);
    onSelect(background);
  };

  const selectedBg = BACKGROUNDS.find(bg => bg.id === selected);

  return (
    <div className="background-select-container">
      {/* Header */}
      <div className="bg-header">
        <h1 className="bg-title">Choose Your Background</h1>
        <p className="bg-subtitle">Your background shapes your character's history and grants abilities</p>
      </div>

      {/* Main Content Grid */}
      <div className="bg-content">
        {/* Background Cards List */}
        <div className="bg-cards-panel">
          <div className="bg-cards-scroll">
            {BACKGROUNDS.map((background) => (
              <button
                key={background.id}
                className={`bg-card ${selected === background.id ? 'selected' : ''}`}
                onClick={() => handleSelect(background)}
              >
                <div className="bg-card-content">
                  <h3 className="bg-card-name">{background.name}</h3>
                  <p className="bg-card-desc">{background.description}</p>
                </div>
                {selected === background.id && <span className="bg-card-checkmark">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        {selectedBg && (
          <div className="bg-details-panel">
            <h2 className="details-title">{selectedBg.name}</h2>

            <div className="details-section">
              <h3 className="details-label">Skill Proficiencies</h3>
              <div className="skill-list">
                {selectedBg.skills.map((skill, idx) => (
                  <span key={idx} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>

            <div className="details-section">
              <h3 className="details-label">Languages</h3>
              <p className="details-text">
                {selectedBg.languages === 0
                  ? 'None'
                  : `${selectedBg.languages} additional language${selectedBg.languages > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="details-section">
              <h3 className="details-label">Equipment</h3>
              <p className="details-text">{selectedBg.equipment}</p>
            </div>

            <div className="details-section feature-section">
              <h3 className="details-label">Background Feature</h3>
              <p className="feature-text">
                {selectedBg.name === 'Acolyte' && 'You have shelter and succor from any temple dedicated to your god or goddess.'}
                {selectedBg.name === 'Charlatan' && 'You have an established identity in disguise. You can forge documents including official papers and personal correspondence.'}
                {selectedBg.name === 'Criminal' && 'You have contacts with other criminals who can provide safe houses and acquire items on the black market.'}
                {selectedBg.name === 'Entertainer' && 'You can always find a place to perform, usually in an inn or tavern but possibly elsewhere.'}
                {selectedBg.name === 'Folk Hero' && 'You are welcome in common folk\'s homes and shelters. They shield you from the law.'}
                {selectedBg.name === 'Guild Artisan' && 'You are welcome at the guildhall of your trade in any city. You can craft your tools at half the normal cost.'}
                {selectedBg.name === 'Hermit' && 'You've discovered a set of mystical rites, purely recreational in nature. It provides you with spiritual comfort.'}
                {selectedBg.name === 'Noble' && 'You are welcome in high society and have the ear of the nobility. You have official rank and authority.'}
                {selectedBg.name === 'Outlander' && 'You have an excellent memory for maps and geography. You can always recall the layout of terrain and settlements.'}
                {selectedBg.name === 'Sage' && 'You always have access to libraries, secure rooms for study, and scholars to converse with at institutions.'}
                {selectedBg.name === 'Sailor' && 'You can secure safe passage on any seagoing vessel for you and your companions.'}
                {selectedBg.name === 'Soldier' && 'You have contacts from your military past who can provide shelter and assistance when needed.'}
                {selectedBg.name === 'Urchin' && 'You know the secret ways to get in and out of your city, bypassing official gates and guards.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="bg-footer">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!selected}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
