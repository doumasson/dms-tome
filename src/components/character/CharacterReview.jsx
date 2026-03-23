import './CharacterReview.css';

/**
 * Character Review Component
 * Full character summary before confirming
 * Shows race, class, abilities, and derived stats
 */

export default function CharacterReview({
  character = {},
  onConfirm = () => {},
  onEdit = () => {}
}) {
  const {
    name = 'Unnamed Hero',
    race = 'Human',
    class: charClass = 'Fighter',
    background = 'Soldier',
    abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    alignment = 'Neutral',
    appearance = ''
  } = character;

  // Calculate derived stats
  const getModifier = (score) => Math.floor((score - 10) / 2);
  const getProfBonus = (level = 1) => Math.ceil(level / 4) + 1;
  const getAC = () => 10 + getModifier(abilities.dex);
  const getHP = () => {
    const conMod = getModifier(abilities.con);
    const baseHP = { Barbarian: 12, Fighter: 10, Cleric: 8, Rogue: 8, Wizard: 6, Warlock: 8, Ranger: 10, Sorcerer: 6, Druid: 8, Bard: 8, Monk: 8, Paladin: 10 };
    const hit = baseHP[charClass] || 10;
    return Math.max(1, hit + conMod);
  };

  return (
    <div className="character-review-container">
      <div className="review-header">
        <h1>Confirm Your Character</h1>
        <p>Review your choices before entering the game</p>
      </div>

      <div className="review-grid">
        {/* Character Identity */}
        <section className="review-section identity-section">
          <h2>Character</h2>
          <div className="stat-row">
            <span className="stat-label">Name</span>
            <span className="stat-value">{name}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Race</span>
            <span className="stat-value">{race}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Class</span>
            <span className="stat-value">{charClass}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Background</span>
            <span className="stat-value">{background}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Alignment</span>
            <span className="stat-value">{alignment}</span>
          </div>
          {appearance && (
            <div className="appearance-note">
              <strong>Appearance:</strong> {appearance}
            </div>
          )}
        </section>

        {/* Ability Scores */}
        <section className="review-section abilities-section">
          <h2>Abilities</h2>
          <div className="abilities-grid">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => {
              const score = abilities[ability];
              const mod = getModifier(score);
              const names = {
                str: 'STR', dex: 'DEX', con: 'CON',
                int: 'INT', wis: 'WIS', cha: 'CHA'
              };
              return (
                <div key={ability} className="ability-box">
                  <div className="ability-abbr">{names[ability]}</div>
                  <div className="ability-score">{score}</div>
                  <div className="ability-mod">({mod > 0 ? '+' : ''}{mod})</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Combat Stats */}
        <section className="review-section combat-section">
          <h2>Combat</h2>
          <div className="stat-row">
            <span className="stat-label">Hit Points</span>
            <span className="stat-value hp">{getHP()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Armor Class</span>
            <span className="stat-value ac">{getAC()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Prof. Bonus</span>
            <span className="stat-value">+{getProfBonus()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Speed</span>
            <span className="stat-value">30 ft.</span>
          </div>
        </section>
      </div>

      {/* Action buttons */}
      <div className="review-actions">
        <button className="edit-button" onClick={onEdit}>
          ← Edit Character
        </button>
        <button className="confirm-button" onClick={onConfirm}>
          Create Character →
        </button>
      </div>
    </div>
  );
}
