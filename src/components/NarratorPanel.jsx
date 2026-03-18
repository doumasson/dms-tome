import { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { buildSystemPrompt, callNarrator } from '../lib/narratorApi';
import { speak, stopSpeaking } from '../lib/tts';
import { ambient } from '../lib/ambientAudio';
import { getClaudeApiKey } from '../lib/claudeApi';
import { broadcastSceneChange, broadcastStartCombat } from '../lib/liveChannel';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SPEECH_SUPPORTED = !!SpeechRecognition;

// ── Skill → ability mapping for auto-roll ────────────────────────────────────
const SKILL_ABILITY = {
  strength: 'str', athletics: 'str', grapple: 'str',
  dexterity: 'dex', acrobatics: 'dex', stealth: 'dex', 'sleight of hand': 'dex',
  constitution: 'con',
  intelligence: 'int', arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
  wisdom: 'wis', perception: 'wis', insight: 'wis', 'animal handling': 'wis', medicine: 'wis', survival: 'wis',
  charisma: 'cha', deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
};

export default function NarratorPanel() {
  const user             = useStore(s => s.user);
  const activeCampaign   = useStore(s => s.activeCampaign);
  const campaign         = useStore(s => s.campaign);
  const isDM             = useStore(s => s.isDM);
  const myCharacter      = useStore(s => s.myCharacter);
  const partyMembers     = useStore(s => s.partyMembers);
  const narrator         = useStore(s => s.narrator);
  const sessionApiKey    = useStore(s => s.sessionApiKey);
  const setSessionApiKey = useStore(s => s.setSessionApiKey);
  const addNarratorMessage    = useStore(s => s.addNarratorMessage);
  const clearNarratorHistory  = useStore(s => s.clearNarratorHistory);
  const setCurrentScene       = useStore(s => s.setCurrentScene);
  const pendingDmTrigger      = useStore(s => s.pendingDmTrigger);
  const clearPendingDmTrigger = useStore(s => s.clearPendingDmTrigger);
  const campaign          = useStore(s => s.campaign);
  const encounter         = useStore(s => s.encounter);

  const inCombat = encounter.phase !== 'idle';
  const currentSceneName = campaign?.scenes?.[campaign?.currentSceneIndex]?.title ?? null;
  const activeEnemyName = inCombat
    ? encounter.combatants?.[encounter.currentTurn]?.name
    : null;
  const isEnemyTurn = inCombat && encounter.combatants?.[encounter.currentTurn]?.type === 'enemy';

  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [ttsEnabled, setTtsEnabled]       = useState(true);
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [heyDmMode, setHeyDmMode]         = useState(false);
  const [isRecording, setIsRecording]     = useState(false);
  // ID of the message whose roll button is currently animating
  const [rollingId, setRollingId]         = useState(null);

  // ── Floor system — one speaker at a time ─────────────────────────────────
  const [floorHolder, setFloorHolder] = useState(null);
  const iHoldFloor = floorHolder?.userId === user?.id;
  const canSpeak   = !floorHolder || iHoldFloor || isDM;

  // ── Exchange counter — used to decide when advanceScene is allowed ────────
  const exchangeCountRef = useRef(0);

  const historyRef    = useRef(null);
  const channelRef    = useRef(null);
  const saveLogRef    = useRef(null);
  const pttRecogRef   = useRef(null);
  const heyDmRecogRef = useRef(null);
  const ttsEnabledRef   = useRef(ttsEnabled);
  const heyDmModeRef    = useRef(heyDmMode);
  const floorHolderRef  = useRef(floorHolder);
  const lastAutoPostedRef = useRef(-1);
  const autoPostFirstRunRef = useRef(true);

  useEffect(() => { ttsEnabledRef.current  = ttsEnabled;  }, [ttsEnabled]);
  useEffect(() => { heyDmModeRef.current   = heyDmMode;   }, [heyDmMode]);
  useEffect(() => { floorHolderRef.current = floorHolder; }, [floorHolder]);

  // Auto-scroll when history changes
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [narrator.history]);

  // ── Auto-post scene description to narrator chat on scene change ──────────
  const idx          = campaign.currentSceneIndex || 0;
  const scenes       = campaign.scenes || [];
  const currentScene = scenes[idx] || null;

  useEffect(() => {
    if (!currentScene || !campaign.loaded) return;
    const sceneKey = `${activeCampaign?.id}:${idx}`;
    if (lastAutoPostedRef.current === sceneKey) return;
    // Skip auto-post if this scene's content is already in history (resumed session)
    const sceneText = [currentScene.title, currentScene.text].filter(Boolean).join('\n\n');
    if (narrator.history.some(m => m.text === sceneText)) {
      lastAutoPostedRef.current = sceneKey;
      return;
    }
    // On first mount with any existing history, skip to avoid re-narrating mid-campaign
    if (autoPostFirstRunRef.current) {
      autoPostFirstRunRef.current = false;
      if (narrator.history.length > 0) {
        lastAutoPostedRef.current = sceneKey;
        return;
      }
    }
    autoPostFirstRunRef.current = false;
    lastAutoPostedRef.current = sceneKey;

    const text = [currentScene.title, currentScene.text].filter(Boolean).join('\n\n');
    const msg = {
      role: 'dm',
      speaker: 'Dungeon Master',
      text,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    addNarratorMessage(msg);
    // Broadcast to other players
    channelRef.current?.send({
      type: 'broadcast', event: 'narrator-msg',
      payload: { senderId: user?.id, message: msg },
    });
    if (ttsEnabledRef.current) speak(text);
  }, [idx, activeCampaign?.id, campaign.loaded]);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCampaign?.id) return;

    const ch = supabase.channel(`narrator:${activeCampaign.id}`, {
      config: { broadcast: { ack: false } },
    });

    // Receive narrator messages from other players
    ch.on('broadcast', { event: 'narrator-msg' }, ({ payload }) => {
      if (payload.senderId === user?.id) return;
      addNarratorMessage(payload.message);
      if (ttsEnabledRef.current && payload.message.role === 'dm') {
        speak(payload.message.text);
      }
    });

    // Floor system — who has the mic
    ch.on('broadcast', { event: 'narrator-floor' }, ({ payload }) => {
      setFloorHolder(payload.holder ?? null);
    });

    ch.subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); channelRef.current = null; };
  }, [activeCampaign?.id, user?.id]);

  // ── Load historical log when joining ─────────────────────────────────────
  useEffect(() => {
    const log = activeCampaign?.settings?.narratorLog;
    if (log?.length && narrator.history.length === 0) {
      log.forEach(msg => addNarratorMessage(msg));
    }
    // Reset exchange counter on campaign join
    exchangeCountRef.current = 0;
  }, [activeCampaign?.id]);

  // ── "Hey DM" wake word ────────────────────────────────────────────────────
  useEffect(() => {
    if (!heyDmMode || !SPEECH_SUPPORTED) return;
    function startWakeWord() {
      const r = new SpeechRecognition();
      r.continuous = true; r.interimResults = true; r.lang = 'en-US';
      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.toLowerCase();
          if (t.includes('hey dm') || t.includes('hey dungeon master')) {
            r.stop();
            setTimeout(() => startPTT(), 400);
            return;
          }
        }
      };
      r.onend  = () => { if (heyDmModeRef.current) setTimeout(startWakeWord, 600); };
      r.onerror = () => { if (heyDmModeRef.current) setTimeout(startWakeWord, 1500); };
      r.start();
      heyDmRecogRef.current = r;
    }
    startWakeWord();
    return () => { heyDmRecogRef.current?.stop(); heyDmRecogRef.current = null; };
  }, [heyDmMode]);

  // ── Push-to-talk ──────────────────────────────────────────────────────────
  function startPTT() {
    if (!SPEECH_SUPPORTED || isRecording) return;
    const r = new SpeechRecognition();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { setInput(e.results[0][0].transcript); };
    r.onerror  = () => setIsRecording(false);
    r.onend    = () => setIsRecording(false);
    r.start();
    pttRecogRef.current = r;
    setIsRecording(true);
  }
  function stopPTT() {
    pttRecogRef.current?.stop();
    pttRecogRef.current = null;
    setIsRecording(false);
  }

  // ── Floor claim / release ─────────────────────────────────────────────────
  function claimFloor() {
    const holder = { userId: user?.id, userName: user?.name || 'Player' };
    setFloorHolder(holder);
    channelRef.current?.send({
      type: 'broadcast', event: 'narrator-floor',
      payload: { holder },
    });
  }
  function releaseFloor() {
    setFloorHolder(null);
    channelRef.current?.send({
      type: 'broadcast', event: 'narrator-floor',
      payload: { holder: null },
    });
  }

  // ── Broadcast helper ──────────────────────────────────────────────────────
  function broadcast(message) {
    channelRef.current?.send({
      type: 'broadcast', event: 'narrator-msg',
      payload: { senderId: user?.id, message },
    });
  }

  // ── Persist log to Supabase (debounced 3 s) ───────────────────────────────
  function scheduleLogSave(newHistory) {
    clearTimeout(saveLogRef.current);
    saveLogRef.current = setTimeout(async () => {
      if (!activeCampaign?.id) return;
      const log = newHistory.slice(-50).map(({ id, role, speaker, text, rollRequest, timestamp }) => ({
        id: id || crypto.randomUUID(), role, speaker, text, rollRequest,
        timestamp: timestamp || Date.now(),
      }));
      try {
        const { data: cur } = await supabase
          .from('campaigns').select('settings').eq('id', activeCampaign.id).single();
        await supabase
          .from('campaigns')
          .update({ settings: { ...(cur?.settings || {}), narratorLog: log } })
          .eq('id', activeCampaign.id);
      } catch { /* non-critical */ }
    }, 3000);
  }

  // ── Conversation messages ─────────────────────────────────────────────────
  function buildConversationMessages() {
    return narrator.history.slice(-14).map((msg) => ({
      role: msg.role === 'dm' ? 'assistant' : 'user',
      content: msg.role === 'player' ? `[${msg.speaker}]: ${msg.text}` : msg.text,
    }));
  }

  // ── Consume proximity interaction triggers from the scene map ────────────
  useEffect(() => {
    if (!pendingDmTrigger) return;
    const text = pendingDmTrigger;
    clearPendingDmTrigger();
    // Small delay so any in-progress state settles first
    const t = setTimeout(() => handleSend(text, true), 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDmTrigger]);

  // ── Main send ─────────────────────────────────────────────────────────────
  // worldTrigger=true bypasses the floor system (used for scene proximity interactions)
  async function handleSend(overrideText, worldTrigger = false) {
    const text = (overrideText ?? input).trim();
    if (!text || loading || (!worldTrigger && !canSpeak)) return;

    // Key priority: local key → session broadcast key → Supabase fetch
    let apiKey = getClaudeApiKey(user?.id) || sessionApiKey;
    if (!apiKey && activeCampaign?.id) {
      try {
        const { data } = await supabase
          .from('campaigns').select('settings').eq('id', activeCampaign.id).single();
        apiKey = data?.settings?.claudeApiKey || null;
        // Cache so next request is instant
        if (apiKey) setSessionApiKey(apiKey);
      } catch { /* ignore */ }
    }
    if (!apiKey) {
      setError('No API key — the DM must add a Claude key in ⚙ Settings.');
      return;
    }

    setInput('');
    setError(null);

    const playerMsg = { role: 'player', speaker: myCharacter?.name || user?.name || 'Adventurer', text };
    addNarratorMessage(playerMsg);
    broadcast({ ...playerMsg, id: crypto.randomUUID(), timestamp: Date.now() });

    setLoading(true);
    try {
      exchangeCountRef.current += 1;

      const systemPrompt = buildSystemPrompt(
        activeCampaign?.campaign_data,
        partyMembers,
        currentScene,
        exchangeCountRef.current,
      );
      const messages = [
        ...buildConversationMessages(),
        { role: 'user', content: `[${user?.name || 'Adventurer'}]: ${text}` },
      ];

      const result = await callNarrator({ messages, systemPrompt, apiKey });

      const dmMsg = {
        role: 'dm',
        speaker: 'Dungeon Master',
        text: result.narrative,
        rollRequest: result.rollRequest || null,
        stateHint:   result.stateHint   || null,
      };
      addNarratorMessage(dmMsg);
      broadcast({ ...dmMsg, id: crypto.randomUUID(), timestamp: Date.now() });
      if (ttsEnabled) speak(result.narrative);

      // Persist the updated log
      const updated = [...narrator.history, playerMsg, { ...dmMsg, id: crypto.randomUUID(), timestamp: Date.now() }];
      scheduleLogSave(updated);

      // AI-triggered combat start → opens battle map and auto-rolls initiative
      if (result.startCombat) {
        const store    = useStore.getState();
        const curScene = store.campaign.scenes?.[store.campaign.currentSceneIndex];
        // Use enemies from AI response first, then fall back to scene data
        const enemies  = (result.enemies?.length > 0)
          ? result.enemies
          : curScene?.enemies || curScene?.encounters?.[0]?.enemies || [];
        const party    = store.partyMembers || [];
        store.startEncounter(enemies, party, true); // true = auto-roll initiative
        broadcastStartCombat({ enemies, party, autoRoll: true });
      }

      // Auto-advance scene when AI says the scene has concluded
      if (result.advanceScene && !result.startCombat) {
        const store     = useStore.getState();
        const curIdx    = store.campaign.currentSceneIndex || 0;
        const sceneList = store.campaign.scenes || [];
        const nextIdx   = curIdx + 1;
        if (nextIdx < sceneList.length) {
          store.setCurrentScene(nextIdx);
          broadcastSceneChange(nextIdx);
          exchangeCountRef.current = 0; // reset for next scene
        }
      }

      // Release floor after sending
      if (iHoldFloor) releaseFloor();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Auto-roll handler for DM roll requests ───────────────────────────────
  function handleRollRequest(rr) {
    const skillLower = (rr.skill || '').toLowerCase();
    let abilityKey = 'str';
    for (const [k, v] of Object.entries(SKILL_ABILITY)) {
      if (skillLower.includes(k)) { abilityKey = v; break; }
    }
    const charName  = (rr.character || '').toLowerCase();
    const character = partyMembers.find(p => p.name.toLowerCase().includes(charName) || charName.includes(p.name.toLowerCase()))
                   || partyMembers[0];

    const abilityScore = character?.stats?.[abilityKey] ?? 10;
    const mod  = Math.floor((abilityScore - 10) / 2);
    const d20  = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    const dc   = rr.dc || 10;
    const success = total >= dc;

    const modStr  = mod >= 0 ? `+${mod}` : `${mod}`;
    const charDisplay = character?.name || rr.character || 'Player';
    const resultText = `${charDisplay} rolls ${rr.skill} — d20(${d20})${modStr} = ${total} vs DC ${dc}: ${success ? 'SUCCESS!' : 'FAILURE.'}`;

    handleSend(resultText);
  }

  // ── Floor status label ────────────────────────────────────────────────────
  function floorLabel() {
    if (!floorHolder) return null;
    if (iHoldFloor) return 'You have the floor';
    return `${floorHolder.userName} is speaking…`;
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>{loading ? '⏳' : isEnemyTurn ? '⚔' : '🎭'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.headerTitle}>
            Dungeon Master
            {isEnemyTurn && !loading && (
              <span style={{ fontSize: '0.65rem', color: '#e74c3c', marginLeft: 8, fontFamily: 'inherit', letterSpacing: 0, animation: 'goldPulse 2s infinite' }}>
                {activeEnemyName}'s turn
              </span>
            )}
          </div>
          {currentSceneName && (
            <div style={styles.headerScene}>📍 {currentSceneName}</div>
          )}
        </div>
        {heyDmMode && (
          <span style={styles.heyDmPill}>
            <span style={styles.heyDmDot} />
            Hey DM
          </span>
        )}
        {loading && <span style={styles.thinkingLabel}>narrating…</span>}
        {floorHolder && !loading && (
          <span style={{ ...styles.thinkingLabel, color: iHoldFloor ? '#2ecc71' : '#e67e22' }}>
            {floorLabel()}
          </span>
        )}
      </div>

      {/* Message history */}
      <div ref={historyRef} style={styles.history}>
        {narrator.history.length === 0 && (
          <p style={styles.emptyHint}>
            {canSpeak
              ? 'Describe your action or speak to an NPC.'
              : `${floorHolder?.userName} has the floor. Wait for your turn.`}
            {SPEECH_SUPPORTED && canSpeak ? ' Hold 🎤 to speak, or enable Hey DM mode.' : ''}
          </p>
        )}
        {narrator.history.map((msg, i) => (
          <div key={msg.id || i} style={msg.role === 'dm' ? styles.dmBubble : styles.playerBubble}>
            {msg.role === 'dm' ? (
              // Only show DM label when preceded by a player message (avoids repetition)
              (i === 0 || narrator.history[i - 1]?.role !== 'dm') && (
                <span style={styles.dmLabel}>The Dungeon Master</span>
              )
            ) : (
              <span style={styles.playerLabel}>⚔ {msg.speaker}</span>
            )}
            <p style={styles.bubbleText}>{msg.text}</p>
            {msg.rollRequest && (
              <button
                style={{
                  ...styles.rollBtn,
                  opacity: rollingId === msg.id ? 0.8 : 1,
                  cursor: rollingId === msg.id ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (rollingId) return; // already rolling something
                  setRollingId(msg.id);
                  setTimeout(() => {
                    handleRollRequest(msg.rollRequest);
                    setRollingId(null);
                  }, 1100);
                }}
              >
                {rollingId === msg.id ? (
                  // Spinning d20 animation while rolling
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                    <div style={{
                      fontSize: '2rem',
                      animation: 'spin360 0.4s linear infinite',
                      display: 'inline-block',
                    }}>🎲</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif" }}>
                        Rolling {msg.rollRequest.skill}…
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#e8dcc8', marginTop: 2 }}>
                        May the dice be ever in your favour
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={styles.rollBtnIcon}>🎲</span>
                    <div style={styles.rollBtnText}>
                      <div style={{ fontSize: '0.75rem', color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 2 }}>
                        {msg.rollRequest.skill} Check — DC {msg.rollRequest.dc}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#e8dcc8' }}>
                        {msg.rollRequest.character || 'Your character'} must roll
                      </div>
                    </div>
                    <div style={styles.rollBtnCta}>
                      <div style={{ fontSize: '1.4rem' }}>🎲</div>
                      <div style={{ fontSize: '0.7rem' }}>Roll</div>
                    </div>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={styles.dmBubble}>
            <p style={{ ...styles.bubbleText, opacity: 0.4, fontStyle: 'italic' }}>The Dungeon Master stirs…</p>
          </div>
        )}
      </div>

      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Floor status banner */}
      {floorHolder && !iHoldFloor && !isDM && (
        <div style={styles.floorBanner}>
          🎤 <strong>{floorHolder.userName}</strong> has the floor — wait for your turn
        </div>
      )}

      {/* Input row */}
      <div style={styles.inputRow}>
        {SPEECH_SUPPORTED && (
          <button
            onClick={() => setHeyDmMode(v => !v)}
            style={{ ...styles.iconBtn, ...(heyDmMode ? styles.iconBtnOn : {}) }}
            title={heyDmMode ? 'Disable "Hey DM"' : 'Enable "Hey DM" wake word'}
          >🎙</button>
        )}

        {!iHoldFloor && !isDM && (
          <button
            onClick={claimFloor}
            disabled={!!floorHolder}
            style={{ ...styles.floorBtn, ...(floorHolder ? styles.floorBtnDisabled : {}) }}
            title={floorHolder ? `${floorHolder.userName} is speaking` : 'Claim floor to speak'}
          >
            {floorHolder ? '⏳' : '✋ Floor'}
          </button>
        )}
        {iHoldFloor && (
          <button onClick={releaseFloor} style={{ ...styles.releaseBtn, fontSize: '0.75rem', padding: '6px 10px', minWidth: 'unset' }} title="Release floor">
            ✋ Done
          </button>
        )}

        <input
          style={{ ...styles.input, opacity: canSpeak ? 1 : 0.4 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={
            canSpeak
              ? 'Describe your action or speak to an NPC…'
              : `${floorHolder?.userName} is speaking — wait your turn`
          }
          disabled={loading || !canSpeak}
          autoFocus
        />

        {SPEECH_SUPPORTED && canSpeak && (
          <button
            style={{ ...styles.iconBtn, ...(isRecording ? styles.iconBtnRecording : {}) }}
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onTouchStart={e => { e.preventDefault(); startPTT(); }}
            onTouchEnd={e => { e.preventDefault(); stopPTT(); }}
            title="Hold to speak"
          >{isRecording ? '🔴' : '🎤'}</button>
        )}

        <button
          onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeaking(); }}
          style={{ ...styles.iconBtn, ...(ttsEnabled ? styles.iconBtnOn : {}) }}
          title={ttsEnabled ? 'Mute DM voice' : 'Unmute DM voice'}
        >{ttsEnabled ? '🔊' : '🔇'}</button>

        <button
          onClick={() => {
            const next = !ambientEnabled;
            setAmbientEnabled(next);
            ambient.setMuted(!next);
          }}
          style={{ ...styles.iconBtn, ...(ambientEnabled ? styles.iconBtnOn : {}) }}
          title={ambientEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
        >{ambientEnabled ? '🎵' : '🎵'}</button>

        <button onClick={clearNarratorHistory} style={styles.iconBtn} title="Clear history">🗑</button>

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim() || !canSpeak}
          style={{ ...styles.sendBtn, opacity: (loading || !input.trim() || !canSpeak) ? 0.45 : 1 }}
        >Send</button>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'linear-gradient(180deg, #1a1008 0%, #110b05 100%)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 14px', minHeight: 42, flexShrink: 0,
    borderBottom: '1px solid rgba(212,175,55,0.12)',
    paddingTop: 5, paddingBottom: 5,
  },
  headerIcon: { fontSize: '1rem', flexShrink: 0 },
  headerTitle: {
    fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700,
    fontSize: '0.82rem', color: '#d4af37', letterSpacing: '0.06em',
    lineHeight: 1.2,
  },
  headerScene: {
    fontSize: '0.6rem', color: 'rgba(200,180,140,0.45)',
    letterSpacing: '0.04em', marginTop: 1,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  heyDmPill: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 12, padding: '2px 9px', fontSize: '0.7rem',
    color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif", flexShrink: 0,
  },
  heyDmDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#2ecc71',
    boxShadow: '0 0 6px rgba(46,204,113,0.8)', animation: 'pulse 1.5s infinite',
  },
  thinkingLabel: {
    color: 'rgba(212,175,55,0.5)', fontSize: '0.75rem', fontStyle: 'italic', flexShrink: 0,
  },
  history: {
    flex: 1, overflowY: 'auto', padding: '10px 16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  emptyHint: {
    color: 'rgba(200,180,140,0.35)', fontSize: '0.82rem',
    fontStyle: 'italic', textAlign: 'center', margin: 'auto 0', lineHeight: 1.7,
  },
  // DM messages: narrative text block with left accent, no chat bubble
  dmBubble: {
    borderLeft: '3px solid rgba(212,175,55,0.35)',
    background: 'rgba(212,175,55,0.03)',
    padding: '8px 14px',
    alignSelf: 'stretch',
  },
  // Player messages: compact right-aligned bubble
  playerBubble: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '10px 2px 10px 10px', padding: '7px 12px',
    maxWidth: '70%', alignSelf: 'flex-end',
  },
  dmLabel: {
    display: 'block', color: 'rgba(212,175,55,0.55)', fontSize: '0.62rem',
    fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700,
    letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase',
  },
  playerLabel: {
    display: 'block', color: 'rgba(200,180,140,0.5)', fontSize: '0.65rem',
    fontFamily: "'Cinzel', Georgia, serif", fontWeight: 600,
    letterSpacing: '0.05em', marginBottom: 4, textAlign: 'right',
  },
  bubbleText: { margin: 0, color: '#e8dcc8', fontSize: '0.9rem', lineHeight: 1.65 },
  // Roll request: large, obvious game button
  rollBtn: {
    display: 'flex', alignItems: 'center', gap: 14,
    marginTop: 12, padding: '12px 16px', width: '100%',
    background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
    border: '1px solid rgba(212,175,55,0.5)', borderRadius: 6,
    cursor: 'pointer', textAlign: 'left', animation: 'goldPulse 2.2s infinite',
  },
  rollBtnIcon: { display: 'none' }, // replaced inline
  rollBtnText: { flex: 1, lineHeight: 1.4 },
  rollBtnCta: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    color: '#d4af37', fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700, fontSize: '0.72rem', flexShrink: 0, letterSpacing: '0.04em',
    gap: 2,
  },
  floorBanner: {
    background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)',
    color: 'rgba(230,150,50,0.9)', fontSize: '0.8rem', padding: '6px 16px', flexShrink: 0,
    textAlign: 'center',
  },
  errorBar: {
    background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)',
    color: '#e74c3c', padding: '7px 16px', fontSize: '0.8rem', flexShrink: 0,
  },
  inputRow: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
    borderTop: '1px solid rgba(212,175,55,0.15)', flexShrink: 0,
  },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6,
    color: '#e8dcc8', padding: '8px 12px', fontSize: '0.88rem',
    fontFamily: 'inherit', outline: 'none', minHeight: 38,
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: 'rgba(200,180,140,0.6)', fontSize: '1rem',
    cursor: 'pointer', padding: '6px 9px', minHeight: 36, minWidth: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconBtnOn: { background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#d4af37' },
  iconBtnRecording: { background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.5)', animation: 'pulse 0.8s infinite' },
  floorBtn: {
    background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)',
    borderRadius: 6, color: '#2ecc71', fontSize: '0.8rem', cursor: 'pointer',
    padding: '6px 9px', minHeight: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  floorBtnDisabled: {
    background: 'rgba(150,150,150,0.07)', border: '1px solid rgba(150,150,150,0.2)',
    color: 'rgba(150,150,150,0.4)', cursor: 'not-allowed',
  },
  releaseBtn: {
    background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.35)',
    borderRadius: 6, color: '#e74c3c', fontSize: '1rem', cursor: 'pointer',
    padding: '6px 9px', minHeight: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)', border: 'none',
    borderRadius: 6, color: '#1a0e00', fontWeight: 700, fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif", padding: '7px 14px',
    cursor: 'pointer', minHeight: 36, flexShrink: 0,
  },
};
