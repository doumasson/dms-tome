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
  // Prefer cloud/neural voices — partial name matching for robustness
  const narratorKeywords = [
    'Guy Online',      // Edge neural male
    'Guy -',           // Edge local male (newer)
    'George Online',   // Edge neural male UK
    'Andrew Online',   // Edge neural male
    'Google UK English Male',
    'Google US English',
  ];
  // Try keyword matching first (handles name format variations across Edge versions)
  for (const keyword of narratorKeywords) {
    const v = _englishVoices.find(x => x.name.includes(keyword));
    if (v) { _narratorVoice = v; break; }
  }
  // Fallback: best English cloud/neural voice, then any English voice
  if (!_narratorVoice) {
    _narratorVoice = _englishVoices.find(v => !v.localService && /male|guy|george|andrew|david/i.test(v.name))
      || _englishVoices.find(v => !v.localService)
      || _englishVoices[0] || null;
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

// Gender detection from NPC personality/description text
const FEMALE_HINTS = /\b(woman|female|she |her |lady|queen|princess|priestess|witch|barmaid|maiden|wife|mother|daughter|sister|aunt|grandmother|girl)\b/i;
const MALE_HINTS = /\b(man |male|he |his |lord|king|prince|priest|guard|soldier|husband|father|son|brother|uncle|grandfather|boy |scarred man|grizzled)\b/i;

function detectGender(npcName, disposition) {
  const text = `${npcName} ${disposition || ''}`;
  if (FEMALE_HINTS.test(text)) return 'female';
  if (MALE_HINTS.test(text)) return 'male';
  return null; // unknown — use hash
}

function isVoiceMale(v) {
  const n = (v.name || '').toLowerCase();
  return /\b(guy|david|george|andrew|mark|james|daniel|male|man)\b/.test(n);
}

function isVoiceFemale(v) {
  const n = (v.name || '').toLowerCase();
  return /\b(zira|aria|jenny|linda|susan|female|woman|nova|shimmer|fable|alloy)\b/.test(n);
}

/**
 * Returns { voiceIndex, pitch, rate } based on NPC name hash.
 * Pass disposition/personality to adjust voice and detect gender.
 * Explicit gender ('male'/'female') overrides text detection.
 */
export function getNpcVoice(npcName, disposition, explicitGender) {
  const h = hashName(npcName);
  const gender = explicitGender || detectGender(npcName, disposition);

  // Try to match voice gender
  let voiceIndex;
  if (gender && _englishVoices.length > 0) {
    const genderVoices = _englishVoices
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => gender === 'male' ? !isVoiceFemale(v) : !isVoiceMale(v));
    if (genderVoices.length > 0) {
      voiceIndex = genderVoices[h % genderVoices.length].i;
    } else {
      voiceIndex = h % Math.max(_englishVoices.length, 1);
    }
  } else {
    voiceIndex = h % Math.max(_englishVoices.length, 1);
  }

  // Pitch: male 0.65–0.95, female 0.95–1.25, unknown 0.7–1.3
  let pitch, rate;
  if (gender === 'male') {
    pitch = 0.65 + ((h % 31) / 100);
    rate  = 0.9 + (((h >> 8) % 21) / 100);
  } else if (gender === 'female') {
    pitch = 0.95 + ((h % 31) / 100);
    rate  = 0.9 + (((h >> 8) % 21) / 100);
  } else {
    pitch = 0.7 + ((h % 61) / 100);
    rate  = 0.85 + (((h >> 8) % 31) / 100);
  }

  // Disposition adjustments
  const d = (disposition || '').toLowerCase();
  if (d.includes('hostile') || d.includes('aggressive') || d.includes('evil')) {
    pitch -= 0.12; rate -= 0.05;
  } else if (d.includes('friendly') || d.includes('kind') || d.includes('cheerful')) {
    pitch += 0.05; rate += 0.05;
  } else if (d.includes('old') || d.includes('ancient') || d.includes('elderly')) {
    rate -= 0.1; pitch -= 0.08;
  }

  pitch = Math.max(0.5, Math.min(1.5, pitch));
  rate  = Math.max(0.7, Math.min(1.3, rate));

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
    // Narrator defaults — deep storytelling voice, slightly faster
    if (_narratorVoice) utt.voice = _narratorVoice;
    utt.pitch = 0.75;
    utt.rate  = 1.05;
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
