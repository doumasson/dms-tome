import { useState } from 'react';
import './RulesReference.css';

/**
 * RulesReference - D&D 5e rules quick reference
 * Common rules, DCs, mechanics, and action economy
 */
export default function RulesReference({
  onClose = () => {},
}) {
  const [selectedTopic, setSelectedTopic] = useState('checks');

  const topics = {
    checks: {
      title: '🎲 Ability Checks',
      icon: '🎲',
      content: [
        { name: 'Easy (DC 10)', desc: 'A task that any reasonably competent person could accomplish' },
        { name: 'Medium (DC 15)', desc: 'A task that requires some training or aptitude to accomplish' },
        { name: 'Hard (DC 20)', desc: 'A task that requires significant skill or lucky rolls' },
        { name: 'Very Hard (DC 25)', desc: 'A task that nearly impossible without expert knowledge' },
        { name: 'Nearly Impossible (DC 30)', desc: 'A task that is almost impossible' },
      ],
    },
    advantage: {
      title: '👯 Advantage & Disadvantage',
      icon: '👯',
      content: [
        { name: 'Advantage', desc: 'Roll twice, use the higher result' },
        { name: 'Disadvantage', desc: 'Roll twice, use the lower result' },
        { name: 'Stacking', desc: 'Advantage/disadvantage do not stack; only one applies' },
        { name: 'Canceling', desc: 'One advantage and one disadvantage cancel each other out' },
      ],
    },
    attacks: {
      title: '⚔️ Attack Rolls',
      icon: '⚔️',
      content: [
        { name: 'Roll d20 + modifier', desc: 'Add ability modifier and proficiency bonus if applicable' },
        { name: 'Hit if ≥ AC', desc: 'Your result must be greater than or equal to the target\'s AC' },
        { name: 'Natural 20', desc: 'Roll of 20 is always a hit and deals critical damage' },
        { name: 'Critical Hit', desc: 'Double the number of damage dice (not the modifiers)' },
        { name: 'Natural 1', desc: 'Roll of 1 is always a miss' },
      ],
    },
    saving: {
      title: '🛡️ Saving Throws',
      icon: '🛡️',
      content: [
        { name: 'Roll d20 + ability modifier', desc: 'Add the specified ability modifier and proficiency if trained' },
        { name: 'Success if ≥ DC', desc: 'Your result must be ≥ the spell or effect\'s saving throw DC' },
        { name: 'Partial damage', desc: 'Many effects deal half damage on a successful save' },
        { name: 'No effect on success', desc: 'Some effects have no effect if you make the save' },
      ],
    },
    actions: {
      title: '⏱️ Action Economy',
      icon: '⏱️',
      content: [
        { name: 'Action', desc: 'Attack, cast a leveled spell, Dash, Disengage, Dodge, Help, Hide, Ready' },
        { name: 'Bonus Action', desc: 'Class-specific abilities, interact with an object, second wind' },
        { name: 'Movement', desc: 'Your speed in feet per turn (usually 30 ft)' },
        { name: 'Reaction', desc: 'Can be taken once per round, usually triggered by an event' },
        { name: 'Interact with object', desc: 'Free interaction with one object (draw weapon, open door)' },
      ],
    },
    damage: {
      title: '💥 Damage & Healing',
      icon: '💥',
      content: [
        { name: 'Rolling damage', desc: 'Roll damage dice from weapon or spell plus ability modifier' },
        { name: 'Modifiers apply once', desc: 'Never add ability modifier twice (even with multiple attacks)' },
        { name: 'Minimum damage', desc: 'Damage is always at least 1 unless the effect says otherwise' },
        { name: 'Healing restores HP', desc: 'You cannot exceed your maximum hit points' },
        { name: 'Resistance halves', desc: 'Damage is halved against resistant targets (round down)' },
        { name: 'Immunity prevents', desc: 'Immune creatures take no damage of that type' },
      ],
    },
    dc: {
      title: '📊 Skill Check DCs',
      icon: '📊',
      content: [
        { name: 'Very Easy (5)', desc: 'A task a common laborer could accomplish' },
        { name: 'Easy (10)', desc: 'A task requiring some aptitude to accomplish' },
        { name: 'Medium (15)', desc: 'A task requiring training or aptitude' },
        { name: 'Hard (20)', desc: 'A task requiring significant skill' },
        { name: 'Very Hard (25)', desc: 'A task nearly impossible without expert knowledge' },
      ],
    },
    movement: {
      title: '🚶 Movement',
      icon: '🚶',
      content: [
        { name: 'Difficult Terrain', desc: 'Moving 1 foot costs 2 feet of movement' },
        { name: 'Being Knocked Down', desc: 'You stop moving if knocked down (unless you have flight)' },
        { name: 'Flying Movement', desc: 'You can move upward at half your speed' },
        { name: 'Creature Size Movement', desc: 'Large: 25 ft, Huge: 35 ft, Gargantuan: 50 ft' },
      ],
    },
    rests: {
      title: '😴 Rests & Recovery',
      icon: '😴',
      content: [
        { name: 'Short Rest (1 hour)', desc: 'Recover some hit points (expend Hit Dice)' },
        { name: 'Long Rest (8 hours)', desc: 'Recover all hit points and spell slots, reduce exhaustion' },
        { name: 'Hit Dice', desc: 'Roll during short rest (d6-d12 depending on class) + CON modifier' },
        { name: 'Exhaustion', desc: 'Each level gives -1 to checks. At level 6, you die' },
      ],
    },
  };

  const topicList = Object.entries(topics);
  const currentTopic = topics[selectedTopic];

  return (
    <div className="rules-reference-overlay" onClick={onClose}>
      <div className="rules-reference-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rules-reference-header">
          <h2 className="rules-reference-title">📖 SRD 5.1 Rules</h2>
          <button className="rules-reference-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Two-Column Layout */}
        <div className="rules-layout">
          {/* Left: Topic List */}
          <div className="topic-list">
            {topicList.map(([key, topic]) => (
              <button
                key={key}
                className={`topic-button ${selectedTopic === key ? 'active' : ''}`}
                onClick={() => setSelectedTopic(key)}
              >
                <span className="topic-icon">{topic.icon}</span>
                <span className="topic-name">{topic.title.replace(/^[^\s]+ /, '')}</span>
              </button>
            ))}
          </div>

          {/* Right: Content */}
          <div className="rules-content">
            {currentTopic && (
              <>
                <div className="content-header">
                  <h3 className="content-title">{currentTopic.title}</h3>
                </div>
                <div className="rules-entries">
                  {currentTopic.content.map((entry, idx) => (
                    <div key={idx} className="rule-entry">
                      <div className="rule-name">{entry.name}</div>
                      <div className="rule-desc">{entry.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="rules-reference-footer">
          <div className="rules-note">SRD 5.1 Quick Reference • Not exhaustive</div>
          <button className="rules-reference-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
