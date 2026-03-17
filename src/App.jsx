import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import LoginPage from './components/LoginPage';
import CampaignSelect from './components/CampaignSelect';
import CreateCampaign from './components/CreateCampaign';
import ApiKeySettings from './components/ApiKeySettings';
import CampaignManager from './components/CampaignManager';
import GameLayout from './components/GameLayout';

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

// Views: loading | login | select | create | game
export default function App() {
  const [appView, setAppView] = useState('loading');
  const [draftCampaign, setDraftCampaign] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const pendingInviteRef = useRef(null);
  const channelRef = useRef(null);
  const broadcastDebounce = useRef(null);

  const user = useStore(s => s.user);
  const setUser = useStore(s => s.setUser);
  const activeCampaign = useStore(s => s.activeCampaign);
  const setActiveCampaign = useStore(s => s.setActiveCampaign);
  const clearActiveCampaign = useStore(s => s.clearActiveCampaign);
  const loadCampaign = useStore(s => s.loadCampaign);
  const loadCampaignSettings = useStore(s => s.loadCampaignSettings);
  const campaign = useStore(s => s.campaign);
  const isDM = useStore(s => s.isDM);
  const dmMode = useStore(s => s.dmMode);
  const encounter = useStore(s => s.encounter);
  const syncEncounterDown = useStore(s => s.syncEncounterDown);

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
    // TOKEN_REFRESHED fires on tab-focus — ignore it to avoid resetting app state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        clearActiveCampaign();
        setAppView('login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) handleSession(session);
      }
      // TOKEN_REFRESHED: token silently refreshed on tab-focus, nothing to do
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (appView !== 'game' || !activeCampaign?.id) return;

    const ch = supabase.channel(`encounter:${activeCampaign.id}`, {
      config: { broadcast: { ack: false } },
    });

    ch.on('broadcast', { event: 'encounter-sync' }, ({ payload }) => {
      // Only non-DMs apply incoming state
      if (!isDM || !dmMode) {
        syncEncounterDown(payload);
      }
    });

    ch.subscribe(status => {
      setLiveConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
      setLiveConnected(false);
    };
  }, [appView, activeCampaign?.id]);

  // DM broadcasts encounter state changes (debounced 400ms)
  useEffect(() => {
    if (!isDM || !dmMode || !channelRef.current || !liveConnected) return;
    clearTimeout(broadcastDebounce.current);
    broadcastDebounce.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'encounter-sync',
        payload: encounter,
      });
    }, 400);
    return () => clearTimeout(broadcastDebounce.current);
  }, [encounter, isDM, dmMode, liveConnected]);

  async function handleSession(session) {
    const authUser = session.user;

    // If the same user is already logged in, don't re-process (avoids re-renders on tab focus)
    const currentUser = useStore.getState().user;
    if (currentUser?.id === authUser.id) return;

    const userData = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Adventurer',
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    // Sync user to profiles table
    await supabase.from('profiles').upsert(userData, { onConflict: 'id' });

    setUser(userData);
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
    if (campaignRecord.settings) {
      loadCampaignSettings(campaignRecord.settings);
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
      <>
        <CampaignSelect
          user={user}
          pendingInvite={pendingInviteRef.current}
          onSelectCampaign={handleSelectCampaign}
          onCreateCampaign={() => {
            setDraftCampaign(null);
            localStorage.removeItem('dm-tome-wizard-draft');
            setAppView('create');
          }}
          onSignOut={handleSignOut}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && (
          <ApiKeySettings userId={user?.id} onClose={() => setShowSettings(false)} />
        )}
      </>
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
  return (
    <div style={styles.app}>
      {/* Slim top bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <D20Icon />
          <h1 style={styles.appTitle}>DM's Tome</h1>
          {activeCampaign && (
            <span style={styles.campaignBadge}>{activeCampaign.name || campaign.title}</span>
          )}
        </div>
        {user?.avatar_url && (
          <img src={user.avatar_url} alt="" style={styles.headerAvatar} referrerPolicy="no-referrer" />
        )}
      </header>

      <div style={styles.headerRule} />

      {/* Game Layout — sidebar + scene/combat + narrator */}
      <GameLayout
        liveConnected={liveConnected}
        onLeave={handleLeaveCampaign}
        onManage={() => setShowManager(true)}
        onSettings={() => setShowSettings(true)}
      />

      {showManager && <CampaignManager onClose={() => setShowManager(false)} />}
      {showSettings && <ApiKeySettings userId={user?.id} onClose={() => setShowSettings(false)} />}
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
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexShrink: 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
    zIndex: 100,
  },
  headerRule: {
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--gold-dark), var(--gold), var(--gold-dark), transparent)',
    opacity: 0.5,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  appTitle: {
    fontSize: '1.3rem',
    margin: 0,
    fontFamily: "'Cinzel Decorative', 'Cinzel', 'Georgia', serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  campaignBadge: {
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid var(--border-gold)',
    color: 'var(--parchment)',
    fontSize: '0.75rem',
    padding: '3px 12px',
    borderRadius: 20,
    fontStyle: 'italic',
    letterSpacing: '0.02em',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '2px solid var(--border-gold)',
    objectFit: 'cover',
    flexShrink: 0,
  },
};
