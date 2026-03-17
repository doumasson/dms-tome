import { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { buildSystemPrompt, callNarrator } from '../lib/narratorApi';
import { speak, stopSpeaking } from '../lib/tts';
import { getClaudeApiKey } from '../lib/claudeApi';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SPEECH_SUPPORTED = !!SpeechRecognition;

export default function NarratorPanel() {
  const user        = useStore(s => s.user);
  const activeCampaign = useStore(s => s.activeCampaign);
  const campaign    = useStore(s => s.campaign);
  const narrator    = useStore(s => s.narrator);
  const addNarratorMessage = useStore(s => s.addNarratorMessage);
  const setNarratorOpen    = useStore(s => s.setNarratorOpen);
  const clearNarratorHistory = useStore(s => s.clearNarratorHistory);

  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [heyDmMode, setHeyDmMode]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const historyRef       = useRef(null);
  const channelRef       = useRef(null);
  const pttRecogRef      = useRef(null);
  const heyDmRecogRef    = useRef(null);
  const ttsEnabledRef    = useRef(ttsEnabled);
  const heyDmModeRef     = useRef(heyDmMode);

  // Keep refs in sync
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { heyDmModeRef.current = heyDmMode; }, [heyDmMode]);

  // Auto-scroll history to bottom on new messages
  useEffect(() => {
    if (historyRef.current && narrator.open) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [narrator.history, narrator.open]);

  // Supabase Realtime — receive narrator messages from other players
  useEffect(() => {
    if (!activeCampaign?.id) return;

    const ch = supabase.channel(`narrator:${activeCampaign.id}`, {
      config: { broadcast: { ack: false } },
    });

    ch.on('broadcast', { event: 'narrator-msg' }, ({ payload }) => {
      if (payload.senderId === user?.id) return; // skip own echoes
      addNarratorMessage(payload.message);
      if (ttsEnabledRef.current && payload.message.role === 'dm') {
        speak(payload.message.text);
      }
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [activeCampaign?.id, user?.id]);

  // "Hey DM" always-listening wake word
  useEffect(() => {
    if (!heyDmMode || !SPEECH_SUPPORTED) return;

    function startWakeWord() {
      const r = new SpeechRecognition();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';

      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.toLowerCase();
          if (t.includes('hey dm') || t.includes('hey dungeon master')) {
            r.stop();
            setNarratorOpen(true);
            setTimeout(() => startPTT(), 400);
            return;
          }
        }
      };

      r.onend = () => {
        if (heyDmModeRef.current) setTimeout(startWakeWord, 600);
      };

      r.onerror = () => {
        if (heyDmModeRef.current) setTimeout(startWakeWord, 1500);
      };

      r.start();
      heyDmRecogRef.current = r;
    }

    startWakeWord();

    return () => {
      heyDmRecogRef.current?.stop();
      heyDmRecogRef.current = null;
    };
  }, [heyDmMode]);

  function startPTT() {
    if (!SPEECH_SUPPORTED || isRecording) return;
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
    };
    r.onerror = () => setIsRecording(false);
    r.onend = () => setIsRecording(false);

    r.start();
    pttRecogRef.current = r;
    setIsRecording(true);
  }

  function stopPTT() {
    pttRecogRef.current?.stop();
    pttRecogRef.current = null;
    setIsRecording(false);
  }

  function broadcast(message) {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'narrator-msg',
      payload: { senderId: user?.id, message },
    });
  }

  function buildConversationMessages() {
    // Last 14 exchanges as the rolling context window
    return narrator.history.slice(-14).map((msg) => ({
      role: msg.role === 'dm' ? 'assistant' : 'user',
      content: msg.role === 'player' ? `[${msg.speaker}]: ${msg.text}` : msg.text,
    }));
  }

  async function handleSend(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const apiKey = getClaudeApiKey(user?.id);
    if (!apiKey) {
      setError('No API key set — add your Claude key in Settings (⚙ icon on campaign select screen).');
      return;
    }

    setInput('');
    setError(null);

    const playerMsg = {
      role: 'player',
      speaker: user?.name || 'Adventurer',
      text,
    };

    addNarratorMessage(playerMsg);
    const fullPlayerMsg = { ...playerMsg, id: crypto.randomUUID(), timestamp: Date.now() };
    broadcast(fullPlayerMsg);

    setLoading(true);
    try {
      const currentScene = campaign.scenes?.[campaign.currentSceneIndex] || null;
      const systemPrompt = buildSystemPrompt(
        activeCampaign?.campaign_data,
        campaign.characters,
        currentScene
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
        stateHint: result.stateHint || null,
      };

      addNarratorMessage(dmMsg);
      const fullDmMsg = { ...dmMsg, id: crypto.randomUUID(), timestamp: Date.now() };
      broadcast(fullDmMsg);

      if (ttsEnabled) speak(result.narrative);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const panelHeight = narrator.open ? 400 : 52;

  return (
    <div style={{ ...styles.panel, height: panelHeight }}>

      {/* Handle bar — always visible */}
      <div style={styles.handle} onClick={() => setNarratorOpen(!narrator.open)}>
        <span style={styles.handleIcon}>{loading ? '⏳' : '🎭'}</span>
        <span style={styles.handleTitle}>AI Narrator</span>
        {heyDmMode && (
          <span style={styles.heyDmPill}>
            <span style={styles.heyDmDot} />
            Hey DM
          </span>
        )}
        {loading && <span style={styles.thinkingLabel}>thinking...</span>}
        <span style={styles.chevron}>{narrator.open ? '▼' : '▲'}</span>
      </div>

      {narrator.open && (
        <>
          {/* Message history */}
          <div ref={historyRef} style={styles.history}>
            {narrator.history.length === 0 && (
              <p style={styles.emptyHint}>
                Describe your action, speak to an NPC, or ask the DM anything.
                {SPEECH_SUPPORTED
                  ? ' Hold 🎤 to speak, or enable Hey DM mode for hands-free.'
                  : ' Type your action below.'}
              </p>
            )}

            {narrator.history.map((msg, i) => (
              <div
                key={msg.id || i}
                style={msg.role === 'dm' ? styles.dmBubble : styles.playerBubble}
              >
                <span style={msg.role === 'dm' ? styles.dmLabel : styles.playerLabel}>
                  {msg.role === 'dm' ? '🎲 Dungeon Master' : `⚔ ${msg.speaker}`}
                </span>
                <p style={styles.bubbleText}>{msg.text}</p>
                {msg.rollRequest && (
                  <div style={styles.rollCard}>
                    🎲 <strong>{msg.rollRequest.character || 'You'}</strong> — Roll{' '}
                    <strong>{msg.rollRequest.skill}</strong> vs DC{' '}
                    <strong>{msg.rollRequest.dc}</strong>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={styles.dmBubble}>
                <span style={styles.dmLabel}>🎲 Dungeon Master</span>
                <p style={{ ...styles.bubbleText, opacity: 0.45 }}>• • •</p>
              </div>
            )}
          </div>

          {error && <div style={styles.errorBar}>{error}</div>}

          {/* Input row */}
          <div style={styles.inputRow}>
            {/* Hey DM toggle */}
            {SPEECH_SUPPORTED && (
              <button
                onClick={() => setHeyDmMode(v => !v)}
                style={{ ...styles.iconBtn, ...(heyDmMode ? styles.iconBtnOn : {}) }}
                title={heyDmMode ? 'Disable "Hey DM" wake word' : 'Enable "Hey DM" wake word'}
              >
                🎙
              </button>
            )}

            {/* Text input */}
            <input
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Describe your action or speak to an NPC…"
              disabled={loading}
            />

            {/* Push-to-talk */}
            {SPEECH_SUPPORTED && (
              <button
                style={{
                  ...styles.iconBtn,
                  ...(isRecording ? styles.iconBtnRecording : {}),
                }}
                onMouseDown={startPTT}
                onMouseUp={stopPTT}
                onTouchStart={e => { e.preventDefault(); startPTT(); }}
                onTouchEnd={e => { e.preventDefault(); stopPTT(); }}
                title="Hold to speak"
              >
                {isRecording ? '🔴' : '🎤'}
              </button>
            )}

            {/* TTS toggle */}
            <button
              onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeaking(); }}
              style={{ ...styles.iconBtn, ...(ttsEnabled ? styles.iconBtnOn : {}) }}
              title={ttsEnabled ? 'Mute DM voice' : 'Unmute DM voice'}
            >
              {ttsEnabled ? '🔊' : '🔇'}
            </button>

            {/* Clear */}
            <button
              onClick={clearNarratorHistory}
              style={styles.iconBtn}
              title="Clear history"
            >
              🗑
            </button>

            {/* Send */}
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                ...styles.sendBtn,
                opacity: loading || !input.trim() ? 0.45 : 1,
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: {
    position: 'sticky',
    bottom: 0,
    zIndex: 95,
    background: 'linear-gradient(180deg, #1a1008 0%, #110b05 100%)',
    borderTop: '2px solid',
    borderImage: 'linear-gradient(90deg, transparent, #d4af37, #a8841f, #d4af37, transparent) 1',
    overflow: 'hidden',
    transition: 'height 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  handle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px',
    height: 52,
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  handleIcon: {
    fontSize: '1.1rem',
  },
  handleTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#d4af37',
    letterSpacing: '0.06em',
    flex: 1,
  },
  heyDmPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 12,
    padding: '2px 10px',
    fontSize: '0.72rem',
    color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  heyDmDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#2ecc71',
    boxShadow: '0 0 6px rgba(46,204,113,0.8)',
    animation: 'pulse 1.5s infinite',
  },
  thinkingLabel: {
    color: 'rgba(212,175,55,0.5)',
    fontSize: '0.75rem',
    fontStyle: 'italic',
  },
  chevron: {
    color: 'rgba(212,175,55,0.5)',
    fontSize: '0.7rem',
  },
  history: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  emptyHint: {
    color: 'rgba(200,180,140,0.4)',
    fontSize: '0.82rem',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: 'auto 0',
    lineHeight: 1.6,
  },
  dmBubble: {
    background: 'rgba(212,175,55,0.06)',
    border: '1px solid rgba(212,175,55,0.18)',
    borderRadius: '4px 12px 12px 12px',
    padding: '10px 14px',
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  playerBubble: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px 4px 12px 12px',
    padding: '8px 14px',
    maxWidth: '75%',
    alignSelf: 'flex-end',
  },
  dmLabel: {
    display: 'block',
    color: '#d4af37',
    fontSize: '0.7rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: 5,
  },
  playerLabel: {
    display: 'block',
    color: 'rgba(200,180,140,0.6)',
    fontSize: '0.7rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.05em',
    marginBottom: 4,
    textAlign: 'right',
  },
  bubbleText: {
    margin: 0,
    color: '#e8dcc8',
    fontSize: '0.88rem',
    lineHeight: 1.55,
  },
  rollCard: {
    marginTop: 8,
    padding: '6px 12px',
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#d4af37',
    fontSize: '0.82rem',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  errorBar: {
    background: 'rgba(231,76,60,0.15)',
    border: '1px solid rgba(231,76,60,0.4)',
    color: '#e74c3c',
    padding: '7px 16px',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderTop: '1px solid rgba(212,175,55,0.15)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 6,
    color: '#e8dcc8',
    padding: '8px 12px',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
    minHeight: 38,
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: 'rgba(200,180,140,0.6)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '6px 9px',
    minHeight: 38,
    minWidth: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnOn: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.35)',
    color: '#d4af37',
  },
  iconBtnRecording: {
    background: 'rgba(231,76,60,0.2)',
    border: '1px solid rgba(231,76,60,0.5)',
    animation: 'pulse 0.8s infinite',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 6,
    color: '#1a0e00',
    fontWeight: 700,
    fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif",
    padding: '8px 16px',
    cursor: 'pointer',
    minHeight: 38,
    flexShrink: 0,
  },
};
