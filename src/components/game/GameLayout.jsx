import './GameLayout.css';

/**
 * Main game layout shell - full viewport for the map.
 * The BottomBar (HUD) overlays the bottom with session log, actions, portraits.
 * No separate NarratorBar — chat is in the HUD's SessionLog.
 */
export default function GameLayout({ children }) {
  return (
    <div className="game-layout">
      <div className="scene-area">
        {children}
      </div>
    </div>
  );
}
