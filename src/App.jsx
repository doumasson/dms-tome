import { useState } from 'react';
import useStore from './store/useStore';
import DiceRoller from './components/DiceRoller';
import CombatTracker from './components/CombatTracker';
import CharacterSheet from './components/CharacterSheet';
import SceneViewer from './components/SceneViewer';
import CampaignImporter from './components/CampaignImporter';

const ALL_TABS = [
  { id: 'dice',       label: '⚔ Dice' },
  { id: 'combat',     label: '🛡 Combat' },
  { id: 'characters', label: '📜 Characters' },
  { id: 'scenes',     label: '🗺 Scenes' },
  { id: 'import',     label: '📥 Import', dmOnly: true },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dice');
  const dmMode = useStore((s) => s.dmMode);
  const toggleDmMode = useStore((s) => s.toggleDmMode);
  const campaign = useStore((s) => s.campaign);

  // Import tab only visible in DM mode
  const tabs = ALL_TABS.filter((t) => !t.dmOnly || dmMode);

  // If current tab becomes hidden, redirect to dice
  const visibleTabIds = tabs.map((t) => t.id);
  const effectiveTab = visibleTabIds.includes(activeTab) ? activeTab : 'dice';

  function renderTab() {
    switch (effectiveTab) {
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
            <span style={styles.dmBadge}>DM Mode</span>
          )}
          <button
            onClick={toggleDmMode}
            style={{
              ...styles.dmToggle,
              background: dmMode
                ? 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)'
                : 'linear-gradient(160deg, #3a2412, #2e1e0e)',
              color: dmMode ? '#1a0e00' : 'var(--text-secondary)',
              border: dmMode ? 'none' : '1px solid var(--border-light)',
              boxShadow: dmMode ? '0 0 14px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {dmMode ? '👁 DM Mode ON' : '🔒 DM Mode OFF'}
          </button>
        </div>
      </header>

      {/* Decorative border */}
      <div style={styles.headerRule} />

      {/* Tab Navigation */}
      <nav style={styles.nav}>
        <div style={styles.tabList}>
          {tabs.map((tab) => {
            const isActive = tab.id === effectiveTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tabButton,
                  ...(isActive ? styles.tabButtonActive : styles.tabButtonInactive),
                }}
              >
                {tab.label}
                {tab.id === 'import' && campaign.loaded && (
                  <span style={styles.loadedDot} title="Campaign loaded" />
                )}
              </button>
            );
          })}
        </div>
        <div style={styles.tabUnderline} />
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {renderTab()}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerRule} />
        <span style={styles.footerText}>DM's Tome &mdash; D&amp;D 5e Campaign Manager</span>
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
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    borderBottom: 'none',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
  },
  headerRule: {
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--gold-dark), var(--gold), var(--gold-dark), transparent)',
    opacity: 0.6,
    position: 'sticky',
    top: 69,
    zIndex: 99,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  appTitle: {
    fontSize: '1.6rem',
    margin: 0,
    fontFamily: "'Cinzel Decorative', 'Cinzel', 'Georgia', serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  campaignBadge: {
    background: 'rgba(212, 175, 55, 0.1)',
    border: '1px solid var(--border-gold)',
    color: 'var(--parchment)',
    fontSize: '0.78rem',
    padding: '3px 12px',
    borderRadius: 20,
    fontStyle: 'italic',
    letterSpacing: '0.02em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dmBadge: {
    background: 'rgba(212, 175, 55, 0.15)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    fontWeight: 700,
    fontSize: '0.7rem',
    padding: '4px 12px',
    borderRadius: 4,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: "'Cinzel', 'Georgia', serif",
    animation: 'goldPulse 2.5s infinite',
  },
  dmToggle: {
    minHeight: 44,
    padding: '10px 18px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
    transition: 'all 0.22s ease',
    letterSpacing: '0.03em',
  },
  nav: {
    background: 'linear-gradient(180deg, #1a1008 0%, #150d06 100%)',
    padding: '0 16px',
    position: 'sticky',
    top: 71,
    zIndex: 98,
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },
  tabList: {
    display: 'flex',
    gap: 2,
    overflowX: 'auto',
    maxWidth: 900,
    margin: '0 auto',
    paddingBottom: 0,
  },
  tabUnderline: {
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
    maxWidth: 900,
    margin: '0 auto',
  },
  tabButton: {
    minHeight: 48,
    padding: '10px 22px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.04em',
    transition: 'all 0.18s ease',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabButtonActive: {
    background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
    color: 'var(--gold)',
    borderTop: '2px solid var(--gold)',
    borderLeft: '1px solid var(--border-gold)',
    borderRight: '1px solid var(--border-gold)',
    borderBottom: '2px solid var(--bg-primary)',
    marginBottom: -2,
    textShadow: '0 0 10px var(--gold-glow)',
  },
  tabButtonInactive: {
    background: 'transparent',
    color: 'var(--text-muted)',
  },
  loadedDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success-light)',
    display: 'inline-block',
    boxShadow: '0 0 6px rgba(46, 204, 113, 0.6)',
  },
  main: {
    flex: 1,
    padding: '12px 0 40px',
    maxWidth: '100%',
    overflowX: 'hidden',
  },
  footer: {
    background: 'linear-gradient(180deg, #150d06, #0e0b07)',
    padding: '16px 24px 12px',
    textAlign: 'center',
  },
  footerRule: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
    marginBottom: 12,
    opacity: 0.5,
  },
  footerText: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.06em',
  },
};
