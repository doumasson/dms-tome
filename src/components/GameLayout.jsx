import { useState } from 'react';
import useStore from '../store/useStore';
import PartySidebar from './PartySidebar';
import ScenePanel from './ScenePanel';
import EncounterView from './EncounterView';
import NarratorPanel from './NarratorPanel';
import DiceRoller from './DiceRoller';
import LootGenerator from './LootGenerator';
import NotesTab from './NotesTab';
import CampaignImporter from './CampaignImporter';

export default function GameLayout({ liveConnected, onLeave, onManage, onSettings }) {
  const encounter = useStore(s => s.encounter);
  const [toolPanel, setToolPanel] = useState(null); // null | 'dice' | 'loot' | 'notes' | 'import'
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile only

  const inCombat = encounter.phase !== 'idle';

  function closeTool() { setToolPanel(null); }

  return (
    <div style={styles.layout}>

      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="game-backdrop"
          style={styles.mobileBackdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        className="game-hamburger"
        style={styles.hamburger}
        onClick={() => setSidebarOpen(v => !v)}
        aria-label="Toggle party sidebar"
      >
        ☰
      </button>

      {/* Left Sidebar */}
      <div
        className={`game-sidebar-wrapper${sidebarOpen ? ' open' : ''}`}
        style={styles.sidebarWrapper}
      >
        <PartySidebar
          onTool={setToolPanel}
          onManage={onManage}
          onLeave={onLeave}
          onSettings={onSettings}
          liveConnected={liveConnected}
        />
      </div>

      {/* Main content area */}
      <div style={styles.mainArea}>
        {/* Combat or Scene */}
        <div style={styles.contentArea}>
          {inCombat ? <EncounterView /> : <ScenePanel />}
        </div>

        {/* Narrator always at bottom */}
        <NarratorPanel />
      </div>

      {/* Tool overlay modals */}
      {toolPanel && (
        <div style={styles.toolOverlay} onClick={e => e.target === e.currentTarget && closeTool()}>
          <div style={styles.toolModal}>
            <button style={styles.toolCloseBtn} onClick={closeTool}>✕</button>
            {toolPanel === 'dice'   && <DiceRoller />}
            {toolPanel === 'loot'   && <LootGenerator />}
            {toolPanel === 'notes'  && <NotesTab />}
            {toolPanel === 'import' && (
              <CampaignImporter onSuccess={closeTool} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SIDEBAR_WIDTH = 240;

const styles = {
  layout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
    position: 'relative',
  },
  sidebarWrapper: {
    // Desktop: always visible
    display: 'flex',
    flexShrink: 0,
    zIndex: 10,
    // Mobile: absolute, hidden off-screen
    '@media (max-width: 768px)': {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      transform: 'translateX(-100%)',
      transition: 'transform 0.25s ease',
    },
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    minWidth: 0,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  hamburger: {
    display: 'none', // hidden on desktop; shown via media query in CSS
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 20,
    background: 'rgba(20,12,5,0.9)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: 'var(--gold)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    minHeight: 38,
  },
  mobileBackdrop: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9,
  },
  toolOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.78)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px 20px',
    overflowY: 'auto',
  },
  toolModal: {
    background: 'linear-gradient(180deg, #1c1208 0%, #150d06 100%)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 800,
    maxHeight: '85vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 16px 60px rgba(0,0,0,0.9)',
  },
  toolCloseBtn: {
    position: 'sticky',
    top: 12,
    left: '100%',
    float: 'right',
    margin: '12px 12px 0 0',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    minHeight: 32,
    zIndex: 1,
  },
};
