import './NPCDialogue.css';

/**
 * NPC Dialogue Component
 * Portrait area, dialogue text, skill check prompts
 */

export default function NPCDialogue({
  npc = {},
  dialogue = '',
  skillChecks = [],
  choices = [],
  onChoice = () => {},
  onSkillCheck = () => {},
  onClose = () => {}
}) {
  const {
    name = 'Unknown NPC',
    portrait = '👤',
    faction = 'Neutral',
    disposition = 'Neutral'
  } = npc;

  return (
    <div className="npc-dialogue-overlay">
      <div className="npc-dialogue-panel">
        {/* NPC Info Header */}
        <div className="npc-header">
          <div className="npc-portrait-frame">
            <div className="npc-portrait">{portrait}</div>
          </div>
          <div className="npc-info">
            <h2 className="npc-name">{name}</h2>
            <div className="npc-meta">
              <span className="faction">{faction}</span>
              <span className="disposition">{disposition}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Dialogue Text */}
        <div className="dialogue-content">
          <div className="dialogue-text">{dialogue}</div>
        </div>

        {/* Skill Checks */}
        {skillChecks.length > 0 && (
          <div className="skill-checks">
            <div className="checks-label">Available Checks</div>
            <div className="checks-grid">
              {skillChecks.map((check, idx) => (
                <button
                  key={idx}
                  className="skill-check-btn"
                  onClick={() => onSkillCheck(check)}
                >
                  <span className="check-name">{check.skill}</span>
                  <span className="check-dc">DC {check.dc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dialogue Choices */}
        {choices.length > 0 && (
          <div className="dialogue-choices">
            <div className="choices-label">Response</div>
            <div className="choices-grid">
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  className="choice-btn"
                  onClick={() => onChoice(choice)}
                >
                  <span className="choice-text">{choice.text}</span>
                  {choice.skill && (
                    <span className="choice-check">{choice.skill}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions if no choices */}
        {choices.length === 0 && skillChecks.length === 0 && (
          <div className="dialogue-actions">
            <button className="continue-btn" onClick={onClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
