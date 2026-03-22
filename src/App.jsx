import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { setLiveChannel, broadcastApiKeySync } from './lib/liveChannel';
import useStore from './store/useStore';
import { animateTokenAlongPath } from './engine/TokenLayer';
import LoginPage from './components/LoginPage';
import CampaignSelect from './components/CampaignSelect';
import ApiKeySettings from './components/ApiKeySettings';
import GameV2 from './GameV2';

const CreateCampaign   = lazy(() => import('./components/CreateCampaign'));
const CharacterCreate  = lazy(() => import('./components/CharacterCreate'));
const CharacterSelect  = lazy(() => import('./components/CharacterSelect'));
const CharacterProfile = lazy(() => import('./components/CharacterProfile'));
const CampaignEndModal = lazy(() => import('./components/CampaignEndModal'));
const CampaignManager  = lazy(() => import('./components/CampaignManager'));
const GameLayout       = lazy(() => import('./components/GameLayout'));

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
  const appendScenes     = useStore(s => s.appendScenes);
  const campaignComplete = useStore(s => s.campaignComplete);
  const setCampaignComplete = useStore(s => s.setCampaignComplete);

  const sessionPersistDebounce = useRef(null);
  const encounterHeartbeat = useRef(null);

  useEffect(() => {
    // Pick up invite code from URL or localStorage
    const params = new URLSearchParams(window.location.search);

    // V2 mode detection — persist to localStorage since replaceState strips params
    const v2Param = params.get('v2')
    if (v2Param !== null) {
      localStorage.setItem('useV2', '1')
    }

    // Persist testarea flag before OAuth redirect strips URL params
    if (params.has('testarea')) {
      localStorage.setItem('pendingTestArea', '1')
    }

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

    // Encounter state sync (DM → players) — also includes fog state for late joiners
    ch.on('broadcast', { event: 'encounter-sync' }, ({ payload }) => {
      if (!useStore.getState().isDM) {
        syncEncounterDown(payload);
        if (payload._fogEnabled || payload._fogRevealed) {
          useStore.getState().applyFogSync(payload._fogEnabled, payload._fogRevealed);
        }
      }
    });

    // Scene change sync (host → players)
    ch.on('broadcast', { event: 'scene-sync' }, ({ payload }) => {
      if (!useStore.getState().isDM) setCurrentScene(payload.sceneIndex);
    });

    // Host appended AI-generated continuation scenes → all players
    ch.on('broadcast', { event: 'append-scenes' }, ({ payload }) => {
      if (!useStore.getState().isDM) {
        useStore.getState().appendScenes(payload.scenes || []);
        useStore.getState().setCurrentScene(payload.nextSceneIndex);
        useStore.getState().setCampaignComplete(false);
      }
    });

    // AI-triggered combat start (host → players via NarratorPanel)
    ch.on('broadcast', { event: 'combat-start' }, ({ payload }) => {
      if (!useStore.getState().isDM) {
        useStore.getState().startEncounter(payload.enemies || [], payload.party || [], payload.autoRoll ?? true);
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
        case 'add-effect':          store.applyEncounterEffect(payload.effect); break;
        case 'remove-effect':       store.applyRemoveEffect(payload.effectId); break;
        case 'move':                store.moveToken(payload.id, payload.x, payload.y, payload.cost || 0); break;
        case 'move-token':          store.moveToken(payload.id, payload.position.x, payload.position.y, payload.cost || 0); break;
        case 'time-advance':        if (payload.gameTime) useStore.setState({ gameTime: payload.gameTime }); break;
        case 'attack-result':
          store.addNarratorMessage({ role: 'dm', speaker: 'Combat', text: payload.log })
          if (payload.hit && payload.damage > 0) {
            store.applyEncounterDamage(payload.targetId, payload.damage)
          }
          break
        case 'aoe-resolve':
          store.addNarratorMessage({ role: 'dm', speaker: 'Combat', text: payload.log })
          for (const r of payload.results || []) {
            if (r.damage > 0) store.applyEncounterDamage(r.targetId, r.damage)
          }
          break
        case 'disengage':
          useStore.setState(state => ({
            encounter: {
              ...state.encounter,
              combatants: state.encounter.combatants.map(c =>
                c.id === payload.id ? { ...c, disengaged: true } : c
              ),
            },
          }))
          store.addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${payload.name || 'A combatant'} takes the Disengage action.` })
          break
        case 'opportunity-attack':
          store.addNarratorMessage({ role: 'dm', speaker: 'Combat', text: payload.log })
          if (payload.hit && payload.damage > 0) {
            store.applyEncounterDamage(payload.targetId, payload.damage)
          }
          break
        case 'encounter-zone-triggered':
          store.addNarratorMessage({ role: 'dm', speaker: 'DM', text: payload.log || 'Enemies spotted!' })
          break
        case 'skill-check-result':
          store.addNarratorMessage({ role: 'dm', speaker: 'Combat', text: payload.log })
          break
        case 'stealth-mode':
          if (payload.active) {
            store.setStealthMode({ active: true, stealthResult: payload.stealthResult, enemyPositions: [], zoneEnemies: [] })
          } else {
            store.clearStealthMode()
          }
          break
      }
    });

    // DM broadcasts their API key → all players cache it for AI narrator use
    ch.on('broadcast', { event: 'api-key-sync' }, ({ payload }) => {
      if (payload.apiKey) useStore.getState().setSessionApiKey(payload.apiKey);
    });

    // Non-DM player requests API key → DM re-broadcasts it
    ch.on('broadcast', { event: 'request-api-key' }, () => {
      const state = useStore.getState()
      if (state.isDM && state.sessionApiKey) {
        broadcastApiKeySync(state.sessionApiKey)
      }
    });

    // Fog of war sync
    ch.on('broadcast', { event: 'fog-reveal' }, ({ payload }) => {
      if (payload.sceneKey && payload.cells) {
        useStore.getState().revealFogCells(payload.sceneKey, payload.cells);
      }
    });

    ch.on('broadcast', { event: 'fog-toggle' }, ({ payload }) => {
      if (payload.sceneKey !== undefined) {
        useStore.getState().setFogEnabled(payload.sceneKey, payload.enabled);
      }
    });

    // Scene token position sync (free movement outside combat)
    ch.on('broadcast', { event: 'scene-token-move' }, ({ payload }) => {
      const { memberId, x, y, sceneKey } = payload;
      if (memberId && sceneKey) {
        useStore.getState().setSceneTokenPosition(sceneKey, memberId, { x, y });
      }
    });

    // AI DM narrator messages (enemy turns, auto-events) → all players
    ch.on('broadcast', { event: 'narrator-message' }, ({ payload }) => {
      if (payload?.text) useStore.getState().addNarratorMessage(payload);
    });

    // Area transition sync (host → players for V2 world map)
    ch.on('broadcast', { event: 'area-transition' }, ({ payload }) => {
      if (!useStore.getState().isDM) {
        const { areaId, entryPoint } = payload;
        const { activateArea } = useStore.getState();
        activateArea(areaId);
        // entryPoint will be picked up by GameV2 via store change
      }
    });

    // Token move sync (any player → all others for V2 area map)
    ch.on('broadcast', { event: 'token-move' }, ({ payload }) => {
      const { playerId, position, path } = payload;
      const currentAreaId = useStore.getState().currentAreaId;
      if (currentAreaId) {
        useStore.getState().setAreaTokenPosition(currentAreaId, playerId, position);
        // If path provided, animate the token movement instead of teleporting
        if (path && path.length > 1) {
          const area = useStore.getState().areas?.[currentAreaId];
          const tileSize = area?.tileSize || 200;
          animateTokenAlongPath(playerId, path, null, null, tileSize);
        }
      }
    });

    // Fog of war bitfield sync (host → players for V2 area map)
    ch.on('broadcast', { event: 'fog-update' }, ({ payload }) => {
      const { areaId, base64Bitfield } = payload;
      useStore.getState().updateFogBitfield(areaId, base64Bitfield);
    });

    // Roof reveal state sync (host → players for V2 area map)
    ch.on('broadcast', { event: 'roof-state' }, ({ payload }) => {
      const { areaId, buildingId, revealed } = payload;
      const resolvedAreaId = areaId || useStore.getState().currentAreaId;
      useStore.getState().setRoofState(resolvedAreaId, buildingId, revealed);
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

    // NPC dialog busy state
    ch.on('broadcast', { event: 'npc-dialog-start' }, ({ payload }) => {
      useStore.getState().setNpcBusy(payload)
    })
    ch.on('broadcast', { event: 'npc-dialog-end' }, () => {
      useStore.getState().clearNpcBusy()
    })

    // Story cutscene — freeze all players
    ch.on('broadcast', { event: 'story-cutscene-start' }, ({ payload }) => {
      useStore.getState().setActiveCutscene(payload)
    })
    ch.on('broadcast', { event: 'story-cutscene-end' }, ({ payload }) => {
      useStore.getState().clearActiveCutscene()
      if (payload.storyFlag) useStore.getState().addStoryFlag(payload.storyFlag)
    })

    // Story flag sync
    ch.on('broadcast', { event: 'story-flag' }, ({ payload }) => {
      useStore.getState().addStoryFlag(payload.flag)
    })

    // Journal entry sync
    ch.on('broadcast', { event: 'journal-entry' }, ({ payload }) => {
      useStore.getState().addJournalEntry(payload)
    })

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
    if (!isDM || !channelRef.current || !liveConnected) return;
    clearTimeout(broadcastDebounce.current);
    broadcastDebounce.current = setTimeout(() => {
      const s = useStore.getState();
      channelRef.current?.send({
        type: 'broadcast',
        event: 'encounter-sync',
        payload: {
          ...encounter,
          _fogEnabled: s.fogEnabled,
          _fogRevealed: s.fogRevealed,
        },
      });
    }, 400);
    return () => clearTimeout(broadcastDebounce.current);
  }, [encounter, isDM, liveConnected]);

  // DM persists session state (scene + encounter) to Supabase so players can refresh
  useEffect(() => {
    if (!isDM || !activeCampaign?.id) return;
    clearTimeout(sessionPersistDebounce.current);
    sessionPersistDebounce.current = setTimeout(() => {
      saveSessionState();
    }, 2000);
    return () => clearTimeout(sessionPersistDebounce.current);
  }, [campaign.currentSceneIndex, encounter, isDM, activeCampaign?.id]);

  // DM heartbeat: broadcast full encounter state every 5s when in combat so late-joining
  // players sync within seconds of refreshing (can't rely on Supabase save timing)
  useEffect(() => {
    clearInterval(encounterHeartbeat.current);
    if (!isDM || !liveConnected || encounter.phase === 'idle') return;
    encounterHeartbeat.current = setInterval(() => {
      const s = useStore.getState();
      channelRef.current?.send({
        type: 'broadcast', event: 'encounter-sync',
        payload: {
          ...s.encounter,
          _fogEnabled: s.fogEnabled,
          _fogRevealed: s.fogRevealed,
        },
      });
    }, 5000);
    return () => clearInterval(encounterHeartbeat.current);
  }, [isDM, liveConnected, encounter.phase]);

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

    // Restore last campaign on sign-in or page refresh
    const savedId = localStorage.getItem('activeCampaignId');
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

    // Save campaign ID so sign-in/refresh restores to game view
    localStorage.setItem('activeCampaignId', campaignRecord.id);

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
      setAppView('character-select');
    }
  }

  function handleLeaveCampaign() {
    localStorage.removeItem('activeCampaignId');
    useStore.getState().resetCampaign();
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
      <Suspense fallback={<div style={styles.loadingScreen}><D20Icon /><span style={styles.loadingText}>Loading...</span></div>}>
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
      </Suspense>
    );
  }

  // ── Character Select (portable characters) ───────────────────────────────────
  if (appView === 'character-select') {
    return (
      <Suspense fallback={<div style={styles.loadingScreen}><D20Icon /><span style={styles.loadingText}>Loading...</span></div>}>
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
        <CharacterSelect
          user={user}
          campaignId={activeCampaign?.id}
          onSelectExisting={async (char) => {
            setMyCharacter(char);
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
          onCreateNew={() => setAppView('character-create')}
        />
      </div>
      </Suspense>
    );
  }

  // ── Character Creation ───────────────────────────────────────────────────────
  if (appView === 'character-create') {
    return (
      <Suspense fallback={<div style={styles.loadingScreen}><D20Icon /><span style={styles.loadingText}>Loading...</span></div>}>
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
          onCancel={() => setAppView(myCharacter ? 'game' : 'character-select')}
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
      </Suspense>
    );
  }

  // ── Character Profile ─────────────────────────────────────────────────────────
  if (appView === 'character-profile') {
    return (
      <Suspense fallback={<div style={styles.loadingScreen}><D20Icon /><span style={styles.loadingText}>Loading...</span></div>}>
        <CharacterProfile onClose={() => setAppView('game')} campaignId={activeCampaign?.id} onCreateNew={() => setAppView('character-create')} />
      </Suspense>
    );
  }

  // ── Main Game UI ─────────────────────────────────────────────────────────────

  // V2: fullscreen game — no header, no V1 wrapper
  // Always use V2 — V1 rendering path has been removed
  return <GameV2 onLeave={handleLeaveCampaign} />;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setAppView('character-profile')}
            title="My Characters"
            style={styles.headerCharBtn}
          >
            ⚔ Characters
          </button>
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" style={styles.headerAvatar} referrerPolicy="no-referrer" />
          )}
        </div>
      </header>

      <div style={styles.headerRule} />

      <GameLayout
        liveConnected={liveConnected}
        onLeave={handleLeaveCampaign}
        onManage={() => setShowManager(true)}
        onSettings={() => setShowSettings(true)}
        onRemakeCharacter={() => setAppView('character-select')}
      />

      {showManager && <CampaignManager onClose={() => setShowManager(false)} />}
      {showSettings && <ApiKeySettings userId={user?.id} onClose={() => setShowSettings(false)} />}
      {campaignComplete && (
        <CampaignEndModal
          onWrapUp={() => { setCampaignComplete(false); handleLeaveCampaign(); }}
        />
      )}
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
  headerCharBtn: {
    background: 'transparent',
    border: '1px solid rgba(212,175,55,0.3)',
    color: 'rgba(212,175,55,0.7)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: '0.72rem',
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.04em',
    flexShrink: 0,
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
