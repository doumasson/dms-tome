// TTS — Web Speech API primary with NPC voice registry
//
// Voice priority:
//   Edge:   Microsoft Guy/Aria/Jenny Online (Natural) neural voices
//   Chrome: Google UK English Male/Female, Google US English
//
// NPC voices are deterministic per-name via hash → voice index + pitch/rate.
// Disposition adjusts voice: hostile → lower pitch, friendly → higher, old → slower.

// ── Voice catalog ───────────────────────────────────────────────────────────────
let _voices = [];
let _voicesReady = false;
let _narratorVoice = null;
let _englishVoices = [];

const BAD_PATTERNS = ['espeak', 'novice', 'festival', 'mbrola', 'flite'];

function isBadVoice(v) {
  const n = v.name.toLowerCase();
  return BAD_PATTERNS.some(p => n.includes(p));
}

function discoverVoices() {
  if (!('speechSynthesis' in window)) return;
  const raw = speechSynthesis.getVoices();
  if (!raw.length) return;

  _voices = raw;
  _englishVoices = raw.filter(v => v.lang?.startsWith('en') && !isBadVoice(v));

  // Narrator: pick best deep male voice by browser
  const edgeNarrator = [
    'Microsoft Guy Online (Natural)',
    'Microsoft George Online (Natural)',
    'Microsoft George - English (United Kingdom)',
    'Microsoft David - English (United States)',
  ];
  const chromeNarrator = [
    'Google UK English Male',
    'Google US English',
  ];
  const narratorPref = [...edgeNarrator, ...chromeNarrator];
  for (const name of narratorPref) {
    const v = raw.find(x => x.name === name);
    if (v) { _narratorVoice = v; break; }
  }
  // Fallback: best English cloud voice
  if (!_narratorVoice) {
    _narratorVoice = _englishVoices.find(v => !v.localService) || _englishVoices[0] || null;
  }
  _voicesReady = true;
}

// Init voice discovery — some browsers load async
if ('speechSynthesis' in window) {
  discoverVoices();
  speechSynthesis.onvoiceschanged = discoverVoices;
}

// ── NPC voice registry ──────────────────────────────────────────────────────────
function hashName(name) {
  let h = 5381;
  for (const c of (name || '')) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/**
 * Returns { voiceIndex, pitch, rate } based on NPC name hash.
 * Pass disposition to adjust: 'Hostile', 'Friendly', 'Neutral', etc.
 */
export function getNpcVoice(npcName, disposition) {
  const h = hashName(npcName);
  const voiceCount = Math.max(_englishVoices.length, 1);
  const voiceIndex = h % voiceCount;

  // Pitch 0.7–1.3, rate 0.8–1.2 derived from hash
  let pitch = 0.7 + ((h % 61) / 100);       // 0.70 – 1.30
  let rate  = 0.8 + (((h >> 8) % 41) / 100); // 0.80 – 1.20

  // Disposition adjustments
  const d = (disposition || '').toLowerCase();
  if (d === 'hostile' || d === 'aggressive' || d === 'evil') {
    pitch -= 0.15; rate -= 0.05;
  } else if (d === 'friendly' || d === 'kind' || d === 'cheerful') {
    pitch += 0.05; rate += 0.05;
  } else if (d === 'old' || d === 'ancient' || d === 'elderly') {
    rate -= 0.1;
  }

  // Clamp
  pitch = Math.max(0.5, Math.min(1.5, pitch));
  rate  = Math.max(0.6, Math.min(1.4, rate));

  return { voiceIndex, pitch: +pitch.toFixed(2), rate: +rate.toFixed(2) };
}

// ── Queue system ────────────────────────────────────────────────────────────────
const _queue = [];
let _currentUtterance = null;

function processQueue() {
  if (!('speechSynthesis' in window)) return;
  if (speechSynthesis.speaking || !_queue.length) return;

  const { text, voiceCfg, onEnd } = _queue.shift();
  _speakNow(text, voiceCfg, onEnd);
}

function _speakNow(text, voiceCfg, onEnd) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.volume = 1;

  if (voiceCfg) {
    // voiceCfg: { voice (SpeechSynthesisVoice), pitch, rate }
    if (voiceCfg.voice) utt.voice = voiceCfg.voice;
    utt.pitch = voiceCfg.pitch ?? 1;
    utt.rate  = voiceCfg.rate ?? 1;
  } else {
    // Narrator defaults
    if (_narratorVoice) utt.voice = _narratorVoice;
    utt.pitch = 0.85;
    utt.rate  = 0.9;
  }

  utt.onend = () => {
    _currentUtterance = null;
    if (onEnd) onEnd();
    processQueue();
  };
  utt.onerror = () => {
    _currentUtterance = null;
    if (onEnd) onEnd();
    processQueue();
  };

  _currentUtterance = utt;
  speechSynthesis.speak(utt);
}

// ── Resolve voice config from options ───────────────────────────────────────────
function resolveVoiceCfg(options) {
  const { voice, npcName, disposition } = options;

  // Explicit NPC name → registry lookup
  if (npcName) {
    const cfg = getNpcVoice(npcName, disposition);
    const v = _englishVoices[cfg.voiceIndex] || _narratorVoice || null;
    return { voice: v, pitch: cfg.pitch, rate: cfg.rate };
  }

  // voice is an object from getNpcVoice() — { voiceIndex, pitch, rate }
  if (voice && typeof voice === 'object' && 'voiceIndex' in voice) {
    const v = _englishVoices[voice.voiceIndex] || _narratorVoice || null;
    return { voice: v, pitch: voice.pitch, rate: voice.rate };
  }

  // Legacy string voice name (e.g. 'onyx') or 'narrator' — use narrator voice
  // Old OpenAI voice names are ignored; we always use Web Speech now.
  if (!voice || voice === 'narrator' || typeof voice === 'string') {
    return null; // null = narrator defaults in _speakNow
  }

  return null;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Speak text using Web Speech API.
 * @param {string} text
 * @param {Function} onEnd - callback when done
 * @param {object} options - { voice, npcName, disposition, openAiKey (ignored) }
 */
export async function speak(text, onEnd, options = {}) {
  if (!text || !text.trim()) return;
  if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }

  // Ensure voices loaded (some browsers need a tick)
  if (!_voicesReady) {
    discoverVoices();
    if (!_voicesReady) {
      await new Promise(r => {
        const cb = () => { discoverVoices(); r(); };
        speechSynthesis.onvoiceschanged = cb;
        setTimeout(cb, 500);
      });
    }
  }

  const voiceCfg = resolveVoiceCfg(options || {});

  // Queue if already speaking
  if (speechSynthesis.speaking) {
    _queue.push({ text, voiceCfg, onEnd });
    return;
  }

  _speakNow(text, voiceCfg, onEnd);
}

export function stopSpeaking() {
  _queue.length = 0;
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    _currentUtterance = null;
  }
}

export function isSpeaking() {
  return 'speechSynthesis' in window && speechSynthesis.speaking;
}

export function isTTSSupported() {
  return 'speechSynthesis' in window;
}
