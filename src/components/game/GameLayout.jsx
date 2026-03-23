import { useState } from 'react';
import './GameLayout.css';

/**
 * Main game layout shell - 80/20 split
 * Top 80%: Scene map with grid overlay and tokens
 * Bottom 20%: Narrator bar (collapses/expands)
 *
 * Dark fantasy theme, gold accents, landscape-locked, mobile touch-friendly.
 */
export default function GameLayout({ children }) {
  const [narratorExpanded, setNarratorExpanded] = useState(false);

  return (
    <div className="game-layout">
      {/* Scene area - top 80% (or more if narrator collapsed) */}
      <div className={`scene-area ${narratorExpanded ? 'narrator-expanded' : ''}`}>
        {/* Placeholder for scene map, tokens, grid overlay */}
        {children?.sceneContent}
      </div>

      {/* Narrator bar - bottom 20%, collapses to minimal when not expanded */}
      <div className={`narrator-bar ${narratorExpanded ? 'expanded' : 'collapsed'}`}>
        <button
          className="narrator-toggle"
          onClick={() => setNarratorExpanded(!narratorExpanded)}
          aria-label="Toggle narrator panel"
        >
          {narratorExpanded ? '▼' : '▲'} The Narrator
        </button>

        {/* Narrator content - only visible when expanded */}
        {narratorExpanded && (
          <div className="narrator-content">
            <div className="narrator-messages">
              {/* Message history placeholder */}
              <p className="placeholder-text">Awaiting The Narrator...</p>
            </div>
            <div className="narrator-input">
              <input
                type="text"
                placeholder="Describe your action..."
                className="action-input"
              />
              <button className="send-button">Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons - above narrator bar, thumb-reachable */}
      <div className="action-buttons-hud">
        {/* Placeholder for action buttons */}
      </div>
    </div>
  );
}
