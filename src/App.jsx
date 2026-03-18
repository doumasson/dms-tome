import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { setLiveChannel } from './lib/liveChannel';
import useStore from './store/useStore';
import LoginPage from './components/LoginPage';
import CampaignSelect from './components/CampaignSelect';
import CreateCampaign from './components/CreateCampaign';
import CharacterCreate from './components/CharacterCreate';
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

// Views: loading | login | select | create | character-create | game
export default function App() {
  const [appView, setAppView] = useState('loading');
  const [draftCampaign, setDraftCampaign] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const pendingInviteRef = useRef(null);
  const channelRef = useRef(null);
  const broadcastDebounce = useRef(null);

  const user            = useStore(s => s.user);
  const setUser         = useStore(s => s.setUser);
  const activeCampaign  = useStore(s => s.activeCampaign);
  const setActiveCampaign   = useStore(s => s.setActiveCampaign);
  const clearActiveCampaign = useStore(s => s.clearActiveCampaign);
  const loadCampaign        = useStore(s => s.loadCampaign);
  const loadCampaignSettings = useStore(s => s.loadCampaignSettings);
  const campaign        = useStore(s => s.campaign);
  const isDM            = useStore(s => s.isDM);
  const dmMode          = useStore(s => s.dmMode);
  const setCurrentScene   = useStore(s => s.setCurrentScene);
  const startEncounter    = useStore(s => s.startEncounter);
  const addNarratorMessage = useStore(s => s.addNarratorMessage);
  const encounter       = useStore(s => s.encounter);
  const syncEncounterDown = useStore(s => s.syncEncounterDown);
  const addSessionEntry = useStore(s => s.addSessionEntry);
  const setMyCharacter   = useStore(s => s.setMyCharacter);
  const setPartyMembers  = useStore(s => s.setPartyMembers);
  const saveSessionState = useStore(s => s.saveSessionStateToSupabase);

  const sessionPersistDebounce = useRef(null);
  const encounterHeartbeat = useRef(null);

  useEffect(() => {
    // Pick up invite code from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const urlInvite = params.get('invite');
    if (urlInvite) {
      pendingInviteRef.current = urlInvite;
      localStorage.setItem('pendingInvite', urlInvite);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      pendingInviteRef.current = localStorage.getItem('pendingInvite');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session);
      else setAppView('login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        clearActiveCampaign();
        setAppView('login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) handleSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (appView !== 'game' || !activeCampaign?.id) return;

    const ch = supabase.channel(`encounter:${activeCampaign.id}`, {
      config: { broadcast: { ack: false } },
    });

    // Encounter state sync (DM → players)
    ch.on('broadcast', { event: 'encounter-sync' }, ({ payload }) => {
      if (!isDM || !dmMode) syncEncounterDown(payload);
    });

    // Scene change sync (DM → players)
    ch.on('broadcast', { event: 'scene-sync' }, ({ payload }) => {
      if (!isDM || !dmMode) setCurrentScene(payload.sceneIndex);
    });

    // AI-triggered combat start (DM → players via NarratorPanel)
    ch.on('broadcast', { event: 'combat-start' }, ({ payload }) => {
      const store = useStore.getState();
      if (!store.isDM || !store.dmMode) {
        store.startEncounter(payload.enemies || [], payload.party || [], payload.autoRoll ?? true);
      }
    });

    // Player token movement (player → all others for immediate visual feedback, DM authoritative)
    ch.on('broadcast', { event: 'player-move' }, ({ payload }) => {
      if (payload.userId === user?.id) return; // skip own echo
      useStore.getState().moveToken(payload.tokenId, payload.x, payload.y, payload.cost || 0);
    });

    // Encounter actions from any player → apply to all clients immediately
    ch.on('broadcast', { event: 'encounter-action' }, ({ payload }) => {
      if (payload.userId === user?.id) return; // skip own echo
      const store = useStore.getState();
      switch (payload.type) {
        case 'next-turn':        store.nextEncounterTurn(); break;
        case 'damage':           store.applyEncounterDamage(payload.targetId, payload.amount); break;
        case 'heal':             store.applyEncounterHeal(payload.targetId, payload.amount); break;
        case 'log':              store.addEncounterLog(payload.entry); break;
        case 'death-save':       store.applyDeathSaveResult(payload.id, payload.roll); break;
        case 'stabilize':        store.stabilizeCombatant(payload.id); break;
        case 'end-encounter':    store.endEncounter(); break;
        case 'add-condition':    store.addEncounterCondition(payload.id, payload.condition); break;
        case 'remove-condition': store.removeEncounterCondition(payload.id, payload.condition); break;
        case 'long-rest':           store.longRest(); break;
        case 'set-concentration':   store.setConcentration(payload.id, payload.spell); break;
        case 'clear-concentration': store.clearConcentration(payload.id); break;
      }
    });

    // DM broadcasts their API key → all players cache it for AI narrator use
    ch.on('broadcast', { event: 'api-key-sync' }, ({ payload }) => {
      if (payload.apiKey) useStore.getState().setSessionApiKey(payload.apiKey);
    });

    // Dice roll broadcast (any player → all others)
    ch.on('broadcast', { event: 'dice-roll' }, ({ payload }) => {
      // Only add entries from OTHER users — we already logged our own roll
      if (payload.userId !== user?.id) {
        const mod = payload.modifier !== 0
          ? ` ${payload.modifier > 0 ? '+' : ''}${payload.modifier}`
          : '';
        const label = `${payload.count}d${payload.die}${mod}`;
        const isNat  = payload.die === 20 && payload.rolls?.[0] === 20;
        const isFail = payload.die === 20 && payload.rolls?.[0] === 1;
        addSessionEntry({
          type: 'roll',
          icon: isNat ? '⭐' : isFail ? '💀' : '🎲',
          title: `${payload.rolledBy ? `${payload.rolledBy}: ` : ''}${label} = ${payload.total}${isNat ? ' — NAT 20!' : isFail ? ' — NAT 1!' : ''}`,
          detail: null,
        });
      }
    });

    ch.subscribe(status => setLiveConnected(status === 'SUBSCRIBED'));

    setLiveChannel(ch);
    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      setLiveChannel(null);
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

  // DM persists session state (scene + encounter) to Supabase so players can refresh
  useEffect(() => {
    if (!isDM || !dmMode || !activeCampaign?.id) return;
    clearTimeout(sessionPersistDebounce.current);
    sessionPersistDebounce.current = setTimeout(() => {
      saveSessionState();
    }, 2000);
    return () => clearTimeout(sessionPersistDebounce.current);
  }, [campaign.currentSceneIndex, encounter, isDM, dmMode, activeCampaign?.id]);

  // DM heartbeat: broadcast full encounter state every 5s when in combat so late-joining
  // players sync within seconds of refreshing (can't rely on Supabase save timing)
  useEffect(() => {
    clearInterval(encounterHeartbeat.current);
    if (!isDM || !dmMode || !liveConnected || encounter.phase === 'idle') return;
    encounterHeartbeat.current = setInterval(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'encounter-sync', payload: useStore.getState().encounter });
    }, 5000);
    return () => clearInterval(encounterHeartbeat.current);
  }, [isDM, dmMode, liveConnected, encounter.phase]);

  async function handleSession(session) {
    const authUser = session.user;
    const currentUser = useStore.getState().user;
    if (currentUser?.id === authUser.id) return;

    const userData = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Adventurer',
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    await supabase.from('profiles').upsert(userData, { onConflict: 'id' });
    setUser(userData);

    // Restore last campaign on page refresh
    const savedId = sessionStorage.getItem('activeCampaignId');
    if (savedId) {
      const { data: member } = await supabase
        .from('campaign_members')
        .select('campaigns(*)')
        .eq('campaign_id', savedId)
        .eq('user_id', userData.id)
        .maybeSingle();
      if (member?.campaigns) {
        await handleSelectCampaign(member.campaigns);
        return;
      }
    }

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

  async function handleSelectCampaign(campaignRecord) {
    // Draft campaigns resume the wizard
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

    // Restore DM's saved scene position (loadCampaign always resets to 0)
    const savedSceneIndex = campaignRecord.settings?.currentSceneIndex;
    if (savedSceneIndex != null && savedSceneIndex > 0) {
      setCurrentScene(savedSceneIndex);
    }

    // Restore active encounter state (combat/initiative in progress)
    const savedEncounter = campaignRecord.settings?.encounterState;
    if (savedEncounter?.phase && savedEncounter.phase !== 'idle') {
      syncEncounterDown(savedEncounter);
    }

    // Cache DM's Claude API key for all players (so narrator works without their own key)
    const sharedApiKey = campaignRecord.settings?.claudeApiKey;
    if (sharedApiKey) {
      useStore.getState().setSessionApiKey(sharedApiKey);
    }

    // Save campaign ID so refresh restores to game view
    sessionStorage.setItem('activeCampaignId', campaignRecord.id);

    // ── Load real player characters (partyMembers) ─────────────────────────────
    const { data: allMembers } = await supabase
      .from('campaign_members')
      .select('user_id, role, character_data')
      .eq('campaign_id', campaignRecord.id);

    // Dedup: one character per user_id (take the first/only row per user)
    const seenUsers = new Set();
    const realPlayers = (allMembers || [])
      .filter(m => m.character_data?.name && !seenUsers.has(m.user_id) && seenUsers.add(m.user_id))
      .map(m => ({ ...m.character_data }));
    setPartyMembers(realPlayers);

    // ── Load saved narrator history (last 50 messages) ───────────────────────
    const savedLog = campaignRecord.settings?.narratorLog;
    if (savedLog?.length) {
      savedLog.forEach(msg => addNarratorMessage(msg));
    }

    // ── Character requirement check ──────────────────────────────────────────
    // Use getState() to avoid stale closure — setUser() above hasn't re-rendered yet
    const freshUserId = useStore.getState().user?.id;
    const isAiDm  = campaignRecord.settings?.isAiDm ?? false;
    const userIsDM = campaignRecord.dm_user_id === freshUserId;

    // Human DM doesn't need their own character
    if (!isAiDm && userIsDM) {
      setAppView('game');
      return;
    }

    // Everyone else must have a character
    const { data: memberData } = await supabase
      .from('campaign_members')
      .select('character_data')
      .eq('campaign_id', campaignRecord.id)
      .eq('user_id', freshUserId)
      .maybeSingle();

    if (memberData?.character_data?.name) {
      setMyCharacter(memberData.character_data);
      setAppView('game');
    } else {
      setAppView('character-create');
    }
  }

  function handleLeaveCampaign() {
    sessionStorage.removeItem('activeCampaignId');
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

  // ── Character Creation ───────────────────────────────────────────────────────
  if (appView === 'character-create') {
    return (
      <div style={styles.app}>
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
        <CharacterCreate
          user={user}
          campaignId={activeCampaign?.id}
          onDone={async (char) => {
            setMyCharacter(char);
            // Refresh partyMembers so the new character shows immediately in the sidebar
            if (activeCampaign?.id) {
              const { data: members } = await supabase
                .from('campaign_members')
                .select('user_id, role, character_data')
                .eq('campaign_id', activeCampaign.id);
              const seen = new Set();
              const players = (members || [])
                .filter(m => m.character_data?.name && !seen.has(m.user_id) && seen.add(m.user_id))
                .map(m => ({ ...m.character_data }));
              setPartyMembers(players);
            }
            setAppView('game');
          }}
        />
      </div>
    );
  }

  // ── Main Game UI ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.app}>
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
