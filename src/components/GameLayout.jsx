import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { ambient } from '../lib/ambientAudio';
import PartySidebar from './PartySidebar';
import ScenePanel from './ScenePanel';
import EncounterView from './EncounterView';
import NarratorPanel from './NarratorPanel';
import PlayerStatusBar from './PlayerStatusBar';
import HUD from './game/HUD';
import TurnAnnouncement from './TurnAnnouncement';
import DiceTray from './DiceTray';
import LootGenerator from './LootGenerator';
import NotesTab from './NotesTab';
import CampaignImporter from './CampaignImporter';
import ActivityLog from './ActivityLog';
import RestModal from './RestModal';
import LevelUpModal, { levelFromXp, xpForLevel } from './LevelUpModal';
import LootScreen from './LootScreen';
import CharacterSheetModal from './characterSheet/CharacterSheetModal';
import RulesAssistant from './RulesAssistant';

export default function GameLayout({ liveConnected, onLeave, onManage, onSettings, onRemakeCharacter }) {
  const encounter = useStore(s => s.encounter);
  const user = useStore(s => s.user);
  const isDM = useStore(s => s.isDM);
  const partyMembers = useStore(s => s.partyMembers);
  const myCharacter = useStore(s => s.myCharacter);
  const applyLevelUp = useStore(s => s.applyLevelUp);
  const pendingLoot = useStore(s => s.pendingLoot);
  const setPendingLoot = useStore(s => s.setPendingLoot);
  const [toolPanel, setToolPanel] = useState(null); // null | 'dice' | 'loot' | 'notes' | 'import'
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile only
  const [restProposal, setRestProposal] = useState(null); // { type: 'short'|'long', proposedBy }
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [sheetChar, setSheetChar] = useState(null); // character to show in CharacterSheetModal

  const campaign = useStore(s => s.campaign);

  // Must be declared before useEffects that depend on it (avoid TDZ in production bundle)
  const inCombat = encounter.phase !== 'idle';

  // ── Ambient audio: switch between scene/combat soundscapes ───────────────
  useEffect(() => {
    const scene = campaign?.scenes?.[campaign?.currentSceneIndex];
    if (inCombat) {
      ambient.combatMode(true, scene);
    } else {
      ambient.combatMode(false, scene);
    }
  }, [inCombat]); // eslint-disable-line

  useEffect(() => {
    if (inCombat) return; // combat mode handles its own audio
    const scene = campaign?.scenes?.[campaign?.currentSceneIndex];
    ambient.play(ambient.detect(scene));
  }, [campaign?.currentSceneIndex]); // eslint-disable-line

  // ── Watch for XP crossing a level threshold ──────────────────────────────
  useEffect(() => {
    if (!myCharacter) return;
    const xp = myCharacter.xp || 0;
    const currentLevel = myCharacter.level || 1;
    const earnedLevel = levelFromXp(xp);
    if (earnedLevel > currentLevel && currentLevel < 20) {
      setShowLevelUp(true);
    }
  }, [myCharacter?.xp]);

  // Turn announcement: fires when the active combatant changes
  const [turnAnnounceTrigger, setTurnAnnounceTrigger] = useState(0);
  const prevTurnRef = useRef(null);
  useEffect(() => {
    if (!inCombat) return;
    const key = `${encounter.currentTurn}-${encounter.round}`;
    if (prevTurnRef.current !== key) {
      prevTurnRef.current = key;
      setTurnAnnounceTrigger(t => t + 1);
    }
  }, [encounter.currentTurn, encounter.round, inCombat]);

  const activeCombatant = inCombat ? (encounter.combatants?.[encounter.currentTurn] ?? null) : null;
  const isMyTurn = !!(activeCombatant && myCharacter && (
    activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
  ));

  function proposeRest(type) {
    setRestProposal({ type, proposedBy: myCharacter?.name || user?.email || 'Someone' });
  }

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
          onRest={proposeRest}
          onOpenSheet={setSheetChar}
          onRemakeCharacter={onRemakeCharacter}
          liveConnected={liveConnected}
        />
      </div>

      {/* Main content area */}
      <div style={styles.mainArea}>
        {/* Combat or Scene — fills remaining space, narrator floats over it */}
        <div style={{ ...styles.contentArea, position: 'relative' }}>
          {inCombat ? <EncounterView /> : <ScenePanel />}
          {/* "Your Turn" / "[Name]'s Turn" announcement */}
          {inCombat && activeCombatant && (
            <TurnAnnouncement
              name={activeCombatant.name}
              isMyTurn={isMyTurn}
              trigger={turnAnnounceTrigger}
            />
          )}
          {/* HUD overlay - character status in top-left */}
          <HUD />
          {/* Floating narrator overlay */}
          <NarratorPanel />
        </div>

        {/* Always-visible character status strip */}
        <PlayerStatusBar />
      </div>

      {/* Right activity log */}
      <ActivityLog />

      {/* Dice pull-up tray (not a modal) */}
      <DiceTray open={toolPanel === 'dice'} onClose={closeTool} />

      {/* Tool overlay modals (non-dice tools) */}
      {toolPanel && toolPanel !== 'dice' && (
        <div style={styles.toolOverlay} onClick={e => e.target === e.currentTarget && closeTool()}>
          <div style={styles.toolModal}>
            <button style={styles.toolCloseBtn} onClick={closeTool}>✕</button>
            {toolPanel === 'loot'   && <LootGenerator />}
            {toolPanel === 'notes'  && <NotesTab />}
            {toolPanel === 'import' && (
              <CampaignImporter onSuccess={closeTool} />
            )}
          </div>
        </div>
      )}

      {/* Rest proposal modal */}
      {restProposal && (
        <RestModal
          type={restProposal.type}
          proposedBy={restProposal.proposedBy}
          partyMembers={partyMembers?.length ? partyMembers : [{ id: user?.id, name: myCharacter?.name || 'You' }]}
          isHost={isDM}
          onResolve={() => setRestProposal(null)}
          onCancel={() => setRestProposal(null)}
        />
      )}

      {/* Level Up modal */}
      {showLevelUp && myCharacter && (
        <LevelUpModal
          character={myCharacter}
          onConfirm={(updates) => {
            applyLevelUp(updates);
            setShowLevelUp(false);
          }}
          onCancel={() => setShowLevelUp(false)}
        />
      )}

      {/* Post-combat loot screen */}
      {pendingLoot && (
        <LootScreen
          enemies={pendingLoot.enemies}
          partySize={pendingLoot.partySize}
          onDone={() => setPendingLoot(null)}
        />
      )}

      {/* Character sheet modal (click portrait in party sidebar) */}
      {sheetChar && (
        <CharacterSheetModal
          character={sheetChar}
          onClose={() => setSheetChar(null)}
        />
      )}

      {/* Backpack button — own inventory shortcut */}
      {myCharacter && (
        <button
          style={styles.backpackBtn}
          onClick={() => setSheetChar(myCharacter)}
          title="Open your character sheet & inventory"
        >
          🎒
        </button>
      )}

      {/* Rules Assistant — floating */}
      <RulesAssistant />
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
    position: 'relative',
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
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
  backpackBtn: {
    position: 'fixed', bottom: 128, right: 18, zIndex: 500,
    width: 40, height: 40, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2a1a08, #1a0e04)',
    border: '1px solid rgba(212,175,55,0.45)',
    fontSize: '1.2rem', cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
