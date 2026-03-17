import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import LoginPage from './components/LoginPage';
import CampaignSelect from './components/CampaignSelect';
import CreateCampaign from './components/CreateCampaign';
import DiceRoller from './components/DiceRoller';
import CombatTracker from './components/CombatTracker';
import CharacterSheet from './components/CharacterSheet';
import SceneViewer from './components/SceneViewer';
import CampaignImporter from './components/CampaignImporter';

function D20Icon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.35))' }} aria-hidden="true">
      <polygon points="18,2 34,13 28,31 8,31 2,13" stroke="#d4af37" strokeWidth="1.8" fill="rgba(212,175,55,0.07)" />
      <polygon points="18,7 30,27 6,27" stroke="#d4af37" strokeWidth="1.2" fill="rgba(212,175,55,0.04)" opacity="0.7" />
      <text x="18" y="22" textAnchor="middle" fontSize="9" fontFamily="'Cinzel', Georgia, serif"
        fontWeight="700" fill="#d4af37" letterSpacing="0.5">20</text>
    </svg>
  );
}

const ALL_TABS = [
  { id: 'dice',       label: '⚔ Dice' },
  { id: 'combat',     label: '🛡 Combat' },
  { id: 'characters', label: '📜 Characters' },
  { id: 'scenes',     label: '🗺 Scenes' },
  { id: 'import',     label: '📥 Import', dmOnly: true },
];

// Views: loading | login | select | create | game
export default function App() {
  const [appView, setAppView] = useState('loading');
  const [activeTab, setActiveTab] = useState('dice');
  const [draftCampaign, setDraftCampaign] = useState(null);
  const pendingInviteRef = useRef(null);

  const user = useStore(s => s.user);
  const setUser = useStore(s => s.setUser);
  const activeCampaign = useStore(s => s.activeCampaign);
  const setActiveCampaign = useStore(s => s.setActiveCampaign);
  const clearActiveCampaign = useStore(s => s.clearActiveCampaign);
  const loadCampaign = useStore(s => s.loadCampaign);
  const campaign = useStore(s => s.campaign);
  const dmMode = useStore(s => s.dmMode);
  const toggleDmMode = useStore(s => s.toggleDmMode);

  useEffect(() => {
    // Pick up invite code from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const urlInvite = params.get('invite');
    if (urlInvite) {
      pendingInviteRef.current = urlInvite;
      localStorage.setItem('pendingInvite', urlInvite);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      pendingInviteRef.current = localStorage.getItem('pendingInvite');
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        setAppView('login');
      }
    });

    // Listen for auth state changes (OAuth redirect callback fires here)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSession(session);
      } else {
        setUser(null);
        clearActiveCampaign();
        setAppView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSession(session) {
    const authUser = session.user;
    const userData = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Adventurer',
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    // Sync user to profiles table
    await supabase.from('profiles').upsert(userData, { onConflict: 'id' });

    setUser(userData);
    // Only navigate to 'select' from loading/login — don't stomp over 'create' or 'game'
    // (onAuthStateChange fires on tab-back token refreshes too)
    setAppView(prev => (prev === 'loading' || prev === 'login') ? 'select' : prev);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    clearActiveCampaign();
    localStorage.removeItem('pendingInvite');
    pendingInviteRef.current = null;
    setAppView('login');
  }

  function handleSelectCampaign(campaignRecord) {
    // If this is a draft campaign, resume the wizard instead
    if (campaignRecord?.campaign_data?.__draft) {
      setDraftCampaign(campaignRecord);
      setAppView('create');
      return;
    }
    setActiveCampaign(campaignRecord);
    if (campaignRecord.campaign_data && Object.keys(campaignRecord.campaign_data).length > 0) {
      loadCampaign(campaignRecord.campaign_data);
    }
    setAppView('game');
  }

  function handleLeaveCampaign() {
    clearActiveCampaign();
    setAppView('select');
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (appView === 'loading') {
    return (
      <div style={styles.loadingScreen}>
        <D20Icon />
        <span style={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  if (appView === 'login') {
    return <LoginPage inviteCode={pendingInviteRef.current} />;
  }

  // ── Campaign Select ──────────────────────────────────────────────────────────
  if (appView === 'select') {
    return (
      <CampaignSelect
        user={user}
        pendingInvite={pendingInviteRef.current}
        onSelectCampaign={handleSelectCampaign}
        onCreateCampaign={() => setAppView('create')}
        onSignOut={handleSignOut}
      />
    );
  }

  // ── Create Campaign ──────────────────────────────────────────────────────────
  if (appView === 'create') {
    return (
      <CreateCampaign
        user={user}
        draftCampaign={draftCampaign}
        onDone={(campaign) => {
          setDraftCampaign(null);
          handleSelectCampaign(campaign);
        }}
        onBack={() => {
          setDraftCampaign(null);
          setAppView('select');
        }}
      />
    );
  }

  // ── Main Game UI ─────────────────────────────────────────────────────────────
  const isDM = activeCampaign?.dm_user_id === user?.id;
  const tabs = ALL_TABS.filter(t => !t.dmOnly || (dmMode && isDM));
  const visibleTabIds = tabs.map(t => t.id);
  const effectiveTab = visibleTabIds.includes(activeTab) ? activeTab : 'dice';

  function renderTab() {
    switch (effectiveTab) {
      case 'dice':       return <DiceRoller />;
      case 'combat':     return <CombatTracker />;
      case 'characters': return <CharacterSheet />;
      case 'scenes':     return <SceneViewer />;
      case 'import':     return <CampaignImporter onSuccess={() => setActiveTab('scenes')} />;
      default:           return <DiceRoller />;
    }
  }

  return (
    <div style={styles.app}>
      {/* Top Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <D20Icon />
          <h1 style={styles.appTitle}>DM's Tome</h1>
          {activeCampaign && (
            <span style={styles.campaignBadge}>{activeCampaign.name || campaign.title}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          {/* User avatar + leave */}
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" style={styles.headerAvatar} referrerPolicy="no-referrer" />
          )}
          <button onClick={handleLeaveCampaign} style={styles.leaveBtn} title="Back to campaign list">
            ⬅ Campaigns
          </button>
          {isDM && (
            <>
              {dmMode && <span style={styles.dmBadge}>DM Mode</span>}
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
            </>
          )}
        </div>
      </header>

      <div style={styles.headerRule} />

      {/* Tab Navigation */}
      <nav style={styles.nav}>
        <div style={styles.tabList}>
          {tabs.map(tab => {
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
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    gap: 16,
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
  },
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
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
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid var(--border-gold)',
    objectFit: 'cover',
  },
  leaveBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    minHeight: 36,
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
