// TTS chain (best to worst voice quality):
//  1. TikTok TTS  — en_uk_001  (AWS Polly neural, CORS-open, free)
//  2. StreamElements — Brian   (AWS Polly neural, may have CORS issues)
//  3. Google Translate TTS     (natural voice, limited to ~200 chars)
//  4. Web Speech API           (browser-native, quality varies by OS)

let currentAudio     = null;
let currentUtterance = null;

export function isTTSSupported() { return true; }

// ── Main entry point ──────────────────────────────────────────────────────────
export async function speak(text, onEnd) {
  if (!text) return;
  stopSpeaking();

  // Try TikTok TTS first (best quality, CORS-enabled, no auth)
  const tiktokUrl = await tryTikTokTTS(text);
  if (tiktokUrl) {
    playAudioUrl(tiktokUrl, text, onEnd);
    return;
  }

  // Try StreamElements (AWS Polly Brian, may have CORS restrictions)
  const seUrl = await tryStreamElementsTTS(text);
  if (seUrl) {
    playAudioUrl(seUrl, text, onEnd);
    return;
  }

  // Try Google Translate TTS (natural voice, 200-char chunks)
  const gtUrl = await tryGoogleTTS(text);
  if (gtUrl) {
    playAudioUrl(gtUrl, text, onEnd);
    return;
  }

  // Last resort: browser Web Speech API
  speakWebSpeech(text, onEnd);
}

// ── TikTok TTS (UK male "en_uk_001", sounds like a storyteller) ──────────────
async function tryTikTokTTS(text) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://tiktok-tts.weilbyte.dev/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500), voice: 'en_uk_001' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const json = await response.json();
    if (!json?.data) return null;

    return `data:audio/mpeg;base64,${json.data}`;
  } catch {
    return null;
  }
}

// ── StreamElements TTS (AWS Polly Brian, UK male) ─────────────────────────────
async function tryStreamElementsTTS(text) {
  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text)}`;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ── Google Translate TTS (natural voice, ~200 char limit, no auth) ─────────────
async function tryGoogleTTS(text) {
  try {
    const chunk = text.slice(0, 200);
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en-gb&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const blob = await res.blob();
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
    // Prefer remote (cloud) voices first, then any English voice that isn't eSpeak
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
