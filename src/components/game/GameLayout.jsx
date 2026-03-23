import useStore from '../../store/useStore';
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
  const narratorMessages = useStore(s => s.narrator?.history || []);
  const addNarratorMessage = useStore(s => s.addNarratorMessage);

  const handleSendMessage = (text) => {
    // Add player message to store
    addNarratorMessage({ role: 'player', text });
  };

  return (
    <div className="game-layout">
      {/* Scene area - top 80% */}
      <div className="scene-area">
        {children}
      </div>

      {/* Narrator bar - bottom 20%, expands to 40% */}
      <NarratorBar
        messages={narratorMessages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
