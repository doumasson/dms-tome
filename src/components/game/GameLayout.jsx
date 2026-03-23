import { useState } from 'react';
import NarratorBar from './NarratorBar';
import './GameLayout.css';

/**
 * Main game layout shell - 80/20 split
 * Top 80%: Scene map with grid overlay and tokens
 * Bottom 20%: Narrator bar (collapses/expands)
 *
 * Dark fantasy theme, gold accents, landscape-locked, mobile touch-friendly.
 */
export default function GameLayout({ children }) {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const handleSendMessage = (text) => {
    // Add player message
    setMessages(prev => [...prev, { role: 'player', text }]);
    // Simulate narrator response (in real app, would call AI API)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'narrator',
        text: 'You describe your action. The world responds...'
      }]);
    }, 500);
  };

  return (
    <div className="game-layout">
      {/* Scene area - top 80% */}
      <div className="scene-area">
        {/* Placeholder for scene map, tokens, grid overlay */}
        {children?.sceneContent}
      </div>

      {/* Narrator bar - bottom 20%, expands to 40% */}
      <NarratorBar
        messages={messages}
        onSendMessage={handleSendMessage}
        isListening={isListening}
      />

      {/* Action buttons - above narrator bar, thumb-reachable */}
      <div className="action-buttons-hud">
        {/* Placeholder for action buttons */}
      </div>
    </div>
  );
}
