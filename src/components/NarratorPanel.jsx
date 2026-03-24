import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '../store/useStore';
import { styles } from './narratorStyles';
import { supabase } from '../lib/supabase';
import { buildSystemPrompt, callNarrator } from '../lib/narratorApi';
import { speak, stopSpeaking, getNpcVoice } from '../lib/tts';
import { getOpenAiKey } from '../lib/dalleApi';
import { ambient } from '../lib/ambientAudio';
import { getClaudeApiKey } from '../lib/claudeApi';
import { broadcastSceneChange, broadcastStartCombat } from '../lib/liveChannel';
import TypewriterText from './TypewriterText';

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
  const encounter         = useStore(s => s.encounter);

  const inCombat = encounter.phase !== 'idle';
  const currentSceneName = campaign?.scenes?.[campaign?.currentSceneIndex]?.title ?? null;
  const activeEnemyName = inCombat
    ? encounter.combatants?.[encounter.currentTurn]?.name
    : null;
  const isEnemyTurn = inCombat && encounter.combatants?.[encounter.currentTurn]?.type === 'enemy';

  const [minimized, setMinimized]   = useState(true);
  const [unread, setUnread]         = useState(0);
  const prevHistoryLenRef           = useRef(0);

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
  const activeNpcRef = useRef(null); // { name, voice } when player approached an NPC

  useEffect(() => { ttsEnabledRef.current  = ttsEnabled;  }, [ttsEnabled]);
  useEffect(() => { heyDmModeRef.current   = heyDmMode;   }, [heyDmMode]);
  useEffect(() => { floorHolderRef.current = floorHolder; }, [floorHolder]);

  // Track unread DM messages while minimized
  useEffect(() => {
    const newLen = narrator.history.length;
    const oldLen = prevHistoryLenRef.current;
    if (newLen > oldLen) {
      if (minimized) {
        const newDmMessages = narrator.history.slice(oldLen).filter(m => m.role === 'dm').length;
        if (newDmMessages > 0) setUnread(u => u + newDmMessages);
      }
      prevHistoryLenRef.current = newLen;
    }
  }, [narrator.history.length]); // eslint-disable-line

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
      speaker: 'The Narrator',
      text,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    addNarratorMessage(msg);
    // Broadcast to other players
    channelRef.current?.send({
      type: 'broadcast', event: 'narrator-msg',
      payload: { senderId: user?.id, message: msg },
    });
    if (ttsEnabledRef.current) speak(text, null, { openAiKey: getOpenAiKey(user?.id), voice: 'onyx' });
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
        speak(payload.message.text, null, {
          openAiKey: getOpenAiKey(user?.id),
          voice: payload.message.npcVoice || 'onyx',
        });
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
          if (t.includes('hey dm') || t.includes('hey the narrator')) {
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
        id: id || uuidv4(), role, speaker, text, rollRequest,
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
    // Parse NPC name from proximity trigger to set voice context
    const npcMatch = text.match(/^You (?:approach|near) (.+?)[\.,]/i);
    if (npcMatch) {
      const npcName = npcMatch[1].trim();
      activeNpcRef.current = { name: npcName, voice: getNpcVoice(npcName) };
    }
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
    broadcast({ ...playerMsg, id: uuidv4(), timestamp: Date.now() });

    setLoading(true);
    try {
      exchangeCountRef.current += 1;

      const systemPrompt = buildSystemPrompt(
        activeCampaign?.campaign_data,
        partyMembers,
        currentScene,
        exchangeCountRef.current,
        useStore.getState().gameTime,
      );
      const messages = [
        ...buildConversationMessages(),
        { role: 'user', content: `[${user?.name || 'Adventurer'}]: ${text}` },
      ];

      const result = await callNarrator({ messages, systemPrompt, apiKey });

      const npcVoice = activeNpcRef.current?.voice || null;
      activeNpcRef.current = null; // reset after each DM response
      const dmMsg = {
        role: 'dm',
        speaker: 'The Narrator',
        text: result.narrative,
        rollRequest: result.rollRequest || null,
        stateHint:   result.stateHint   || null,
        npcVoice,
      };
      addNarratorMessage(dmMsg);
      broadcast({ ...dmMsg, id: uuidv4(), timestamp: Date.now() });
      if (ttsEnabled) speak(result.narrative, null, { openAiKey: getOpenAiKey(user?.id), voice: npcVoice || 'onyx' });

      // Persist the updated log
      const updated = [...narrator.history, playerMsg, { ...dmMsg, id: uuidv4(), timestamp: Date.now() }];
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
        } else {
          // Last scene concluded — surface the end-of-campaign modal
          store.setCampaignComplete(true);
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

  // ── Minimized bar ─────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div style={styles.minimizedBar} onClick={() => { setMinimized(false); setUnread(0); }}>
        <span style={styles.headerIcon}>{loading ? '⏳' : isEnemyTurn ? '⚔' : '🎭'}</span>
        <span style={styles.minimizedTitle}>The Narrator</span>
        {currentSceneName && (
          <span style={styles.minimizedScene}>· {currentSceneName}</span>
        )}
        {loading && <span style={{ ...styles.thinkingLabel, marginLeft: 6 }}>narrating…</span>}
        {unread > 0 && (
          <span style={styles.unreadBadge}>{unread}</span>
        )}
        <span style={styles.expandBtn}>▲ Open</span>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>{loading ? '⏳' : isEnemyTurn ? '⚔' : '🎭'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.headerTitle}>
            The Narrator
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
        <button
          style={styles.minimizeBtn}
          onClick={() => setMinimized(true)}
          title="Minimize narrator"
        >▼</button>
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
        {narrator.history.map((msg, i) => {
          // Check if this is the last message and it's from the DM
          const isLastDmMessage = msg.role === 'dm' && i === narrator.history.length - 1;

          return (
          <div key={msg.id || i} style={msg.role === 'dm' ? styles.dmBubble : styles.playerBubble}>
            {msg.role === 'dm' ? (
              // Only show DM label when preceded by a player message (avoids repetition)
              (i === 0 || narrator.history[i - 1]?.role !== 'dm') && (
                <span style={styles.dmLabel}>The Narrator</span>
              )
            ) : (
              <span style={styles.playerLabel}>⚔ {msg.speaker}</span>
            )}
            <p style={styles.bubbleText}>
              {isLastDmMessage ? (
                <TypewriterText text={msg.text} speed={20} />
              ) : (
                msg.text
              )}
            </p>
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
          );
        })}
        {loading && (
          <div style={styles.dmBubble}>
            <p style={{ ...styles.bubbleText, opacity: 0.4, fontStyle: 'italic' }}>The Narrator stirs…</p>
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

// styles are imported from ./narratorStyles.js
