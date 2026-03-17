import { useState } from 'react';
import useStore from './store/useStore';
import DiceRoller from './components/DiceRoller';
import CombatTracker from './components/CombatTracker';
import CharacterSheet from './components/CharacterSheet';
import SceneViewer from './components/SceneViewer';
import CampaignImporter from './components/CampaignImporter';

const TABS = [
  { id: 'dice', label: 'Dice' },
  { id: 'combat', label: 'Combat' },
  { id: 'characters', label: 'Characters' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'import', label: 'Import' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dice');
  const dmMode = useStore((s) => s.dmMode);
  const toggleDmMode = useStore((s) => s.toggleDmMode);
  const campaign = useStore((s) => s.campaign);

  function renderTab() {
    switch (activeTab) {
      case 'dice':       return <DiceRoller />;
      case 'combat':     return <CombatTracker />;
      case 'characters': return <CharacterSheet />;
      case 'scenes':     return <SceneViewer />;
      case 'import':     return <CampaignImporter />;
      default:           return <DiceRoller />;
    }
  }

  return (
    <div style={styles.app}>
      {/* Top Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.appTitle}>DM's Tome</h1>
          {campaign.loaded && (
            <span style={styles.campaignBadge}>{campaign.title}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          {dmMode && (
            <span style={styles.dmBadge}>DM MODE</span>
          )}
          <button
            onClick={toggleDmMode}
            style={{
              ...styles.dmToggle,
              background: dmMode ? 'var(--gold)' : 'var(--bg-button-dark)',
              color: dmMode ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: dmMode ? 'none' : '1px solid var(--border-light)',
            }}
          >
            {dmMode ? '👁 DM Mode ON' : '🔒 DM Mode OFF'}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={styles.nav}>
        <div style={styles.tabList}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : styles.tabButtonInactive),
              }}
            >
              {tab.label}
              {tab.id === 'import' && campaign.loaded && (
                <span style={styles.loadedDot} title="Campaign loaded" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {renderTab()}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>DM's Tome — D&amp;D 5e Campaign Manager</span>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  appTitle: {
    fontSize: '1.5rem',
    color: 'var(--gold)',
    fontWeight: 'bold',
    letterSpacing: '0.02em',
    margin: 0,
  },
  campaignBadge: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    padding: '3px 10px',
    borderRadius: 12,
    fontStyle: 'italic',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dmBadge: {
    background: 'var(--gold)',
    color: 'var(--bg-primary)',
    fontWeight: 'bold',
    fontSize: '0.75rem',
    padding: '4px 10px',
    borderRadius: 4,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    animation: 'pulse 2s infinite',
  },
  dmToggle: {
    minHeight: 44,
    padding: '10px 18px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    transition: 'background 0.2s, color 0.2s',
    border: 'none',
  },
  nav: {
    background: 'var(--bg-secondary)',
    borderBottom: '2px solid var(--border-color)',
    padding: '0 16px',
    position: 'sticky',
    top: 69,
    zIndex: 99,
  },
  tabList: {
    display: 'flex',
    gap: 4,
    overflowX: 'auto',
    maxWidth: 900,
    margin: '0 auto',
  },
  tabButton: {
    minHeight: 48,
    padding: '10px 22px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabButtonActive: {
    background: 'var(--gold)',
    color: 'var(--bg-primary)',
    borderBottom: '2px solid var(--gold)',
  },
  tabButtonInactive: {
    background: 'transparent',
    color: 'var(--text-muted)',
  },
  loadedDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#2ecc71',
    display: 'inline-block',
  },
  main: {
    flex: 1,
    padding: '8px 0 32px',
    maxWidth: '100%',
    overflowX: 'hidden',
  },
  footer: {
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-color)',
    padding: '10px 24px',
    textAlign: 'center',
  },
  footerText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
};
