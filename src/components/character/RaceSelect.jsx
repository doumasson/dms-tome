import { useState } from 'react';
import './RaceSelect.css';

/**
 * Race Selection Component
 * All SRD 5.1 races with descriptions
 * Dark fantasy card layout, mobile friendly grid
 */

const RACES = [
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description: 'Proud descendants of dragons with draconic heritage. Natural-born leaders with a fierce reputation.',
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    abilityBonus: '+2 Str, +1 Cha'
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Stout and sturdy mountain-dwellers. Master craftspeople with a tradition of honor and valor.',
    traits: ['Darkvision', 'Dwarven Toughness', 'Weapon Training'],
    abilityBonus: '+2 Con, +2 Wis'
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Graceful and long-lived. Keen senses and artistic temperament. Choose a subrace: High, Wood, or Dark.',
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry'],
    abilityBonus: '+2 Dex, +1 per subrace'
  },
  {
    id: 'gnome',
    name: 'Gnome',
    description: 'Small and clever tinkers with a love of tinkering and pranks. Natural inventors and alchemists.',
    traits: ['Darkvision', 'Gnome Cunning', 'Natural Alchemist'],
    abilityBonus: '+2 Int'
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    description: 'Born of two worlds, seeking a place to belong. Charismatic and versatile wanderers.',
    traits: ['Darkvision', 'Fey Ancestry', 'Versatile'],
    abilityBonus: '+2 Cha, +1 to two abilities'
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    description: 'Inheriting orcish strength and human heritage. Often misunderstood but noble-hearted warriors.',
    traits: ['Darkvision', 'Menacing', 'Relentless Endurance'],
    abilityBonus: '+2 Str, +1 Con'
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small folk with great hearts. Known for their luck, friendliness, and surprising bravery.',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    abilityBonus: '+2 Dex'
  },
  {
    id: 'human',
    name: 'Human',
    description: 'Versatile and ambitious. Humans adapt quickly and excel in diverse pursuits.',
    traits: ['Versatility', 'Extra Feat', 'Extra Ability'],
    abilityBonus: '+1 to all abilities'
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Touched by infernal blood. Despite their appearance, many are good-hearted heroes.',
    traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
    abilityBonus: '+2 Cha, +1 Int'
  }
];

export default function RaceSelect({ onSelectRace = () => {} }) {
  const [selectedRace, setSelectedRace] = useState(null);

  const handleSelectRace = (race) => {
    setSelectedRace(race.id);
    onSelectRace(race);
  };

  return (
    <div className="race-select-container">
      <div className="race-header">
        <h1>Choose Your Race</h1>
        <p className="race-subtitle">Select the race that calls to you. Your heritage shapes your destiny.</p>
      </div>

      <div className="race-grid">
        {RACES.map(race => (
          <button
            key={race.id}
            className={`race-card ${selectedRace === race.id ? 'selected' : ''}`}
            onClick={() => handleSelectRace(race)}
          >
            <div className="race-card-inner">
              <h2 className="race-name">{race.name}</h2>

              <p className="race-description">{race.description}</p>

              <div className="race-traits">
                <span className="traits-label">Traits:</span>
                <div className="trait-list">
                  {race.traits.map((trait, idx) => (
                    <span key={idx} className="trait-tag">{trait}</span>
                  ))}
                </div>
              </div>

              <div className="ability-bonus">
                <span className="bonus-label">Ability Bonus:</span>
                <span className="bonus-text">{race.abilityBonus}</span>
              </div>
            </div>

            {selectedRace === race.id && (
              <div className="selection-indicator">✓</div>
            )}
          </button>
        ))}
      </div>

      {selectedRace && (
        <div className="race-confirmation">
          <p>You selected <strong>{RACES.find(r => r.id === selectedRace)?.name}</strong></p>
        </div>
      )}
    </div>
  );
}
