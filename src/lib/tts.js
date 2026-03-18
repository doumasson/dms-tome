// TTS chain (best to worst voice quality):
//  1. OpenAI TTS       — tts-1 model, neural voices  (requires OpenAI key)
//  2. Pollinations TTS — same tts-1 voices, CORS-open (free, no key; 1 req/15s anonymous)
//  3. Web Speech API   — browser-native fallback
//
// Narrator voice: 'onyx'   (deep, authoritative storyteller)
// NPC voices: deterministic per-NPC from [echo, fable, alloy, nova, shimmer]

let currentAudio     = null;
let currentUtterance = null;

// OpenAI TTS voices assigned to NPCs deterministically from their name
const NPC_VOICES = ['echo', 'fable', 'alloy', 'nova', 'shimmer'];

export function getNpcVoice(npcName) {
  let hash = 5381;
  for (const c of (npcName || '')) hash = ((hash << 5) + hash + c.charCodeAt(0)) | 0;
  return NPC_VOICES[Math.abs(hash) % NPC_VOICES.length];
}

export function isTTSSupported() { return true; }

// ── Main entry point ──────────────────────────────────────────────────────────
// options: { openAiKey, voice }
//   voice defaults to 'onyx' (narrator). Pass getNpcVoice(name) for NPC speech.
export async function speak(text, onEnd, options = {}) {
  if (!text) return;
  stopSpeaking();

  const voice = options.voice || 'onyx';
  const openAiKey = options.openAiKey || null;

  // 1. OpenAI TTS (best quality — requires user's OpenAI key)
  if (openAiKey) {
    const url = await tryOpenAiTTS(text, openAiKey, voice);
    if (url) { playAudioUrl(url, text, onEnd); return; }
  }

  // 2. Pollinations TTS (same tts-1 quality, free, no key needed)
  const pollinationsUrl = await tryPollinationsTTS(text, voice);
  if (pollinationsUrl) { playAudioUrl(pollinationsUrl, text, onEnd); return; }

  // 3. Last resort: browser Web Speech API
  speakWebSpeech(text, onEnd);
}

// ── OpenAI TTS (tts-1, neural quality) ───────────────────────────────────────
async function tryOpenAiTTS(text, apiKey, voice = 'onyx') {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size < 1000) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ── Pollinations TTS (OpenAI tts-1 quality, free, CORS-open) ─────────────────
// No API key required — anonymous tier is rate-limited to 1 req/15s.
// Same voice names as OpenAI: onyx, nova, alloy, echo, fable, shimmer.
// NPC voices are deterministic per NPC name (via getNpcVoice hash), so each
// character always gets the same voice. Back-to-back calls (e.g. narrator
// auto-post + DM response) are spaced by a minimum interval to stay within
// the rate limit without blocking.
let _pollinationsLastCall = 0;
const POLLINATIONS_MIN_MS = 15500; // 15s + small buffer

async function tryPollinationsTTS(text, voice = 'onyx') {
  try {
    // Enforce minimum spacing between calls — wait out the remaining window
    const wait = POLLINATIONS_MIN_MS - (Date.now() - _pollinationsLastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _pollinationsLastCall = Date.now();

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://gen.pollinations.ai/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // 429 = rate limited despite spacing (server-side bucket); fall through
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size < 1000) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ── Shared audio player ───────────────────────────────────────────────────────
function playAudioUrl(url, text, onEnd) {
  const audio    = new Audio(url);
  currentAudio   = audio;
  const isBlob   = url.startsWith('blob:');

  audio.onended = () => {
    if (isBlob) URL.revokeObjectURL(url);
    currentAudio = null;
    if (onEnd) onEnd();
  };
  audio.onerror = () => {
    if (isBlob) URL.revokeObjectURL(url);
    currentAudio = null;
    speakWebSpeech(text, onEnd);
  };
  audio.play().catch(() => {
    // Auto-play blocked by browser policy — fall back to Web Speech
    if (isBlob) URL.revokeObjectURL(url);
    currentAudio = null;
    speakWebSpeech(text, onEnd);
  });
}

// ── Web Speech API fallback ───────────────────────────────────────────────────
function getWebVoices() {
  return new Promise(resolve => {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) {
      resolve(v);
    } else {
      speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    }
  });
}

async function speakWebSpeech(text, onEnd) {
  if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }

  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.85;
  utterance.pitch  = 0.75;
  utterance.volume = 1;

  // Prefer cloud voices (sound human) — aggressively avoid eSpeak/Festival (Linux)
  const voices   = await getWebVoices();
  const preferred = [
    'Google UK English Male',
    'Google UK English Female',
    'Microsoft George - English (United Kingdom)',
    'Microsoft David - English (United States)',
    'Microsoft Zira - English (United States)',
    'Daniel (Enhanced)',
    'Daniel',
    'Karen',
    'Moira',
    'Alex',
    'Google US English',
  ];
  const BAD_VOICE_PATTERNS = ['espeak', 'novice', 'festival', 'mbrola', 'flite'];
  let chosen = null;
  for (const name of preferred) {
    chosen = voices.find(v => v.name === name);
    if (chosen) break;
  }
  if (!chosen) {
    const cloudVoices = voices.filter(v =>
      v.lang?.startsWith('en') &&
      !v.localService &&
      !BAD_VOICE_PATTERNS.some(p => v.name.toLowerCase().includes(p))
    );
    chosen = cloudVoices[0] || voices.find(v =>
      v.lang?.startsWith('en') &&
      !BAD_VOICE_PATTERNS.some(p => v.name.toLowerCase().includes(p))
    ) || null;
  }
  if (chosen)  utterance.voice = chosen;
  if (onEnd)   utterance.onend = onEnd;

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

// ── Controls ──────────────────────────────────────────────────────────────────
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  if (currentAudio && !currentAudio.paused) return true;
  return 'speechSynthesis' in window && speechSynthesis.speaking;
}
