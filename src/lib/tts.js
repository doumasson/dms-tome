// TTS chain (best to worst voice quality):
//  1. OpenAI TTS   — tts-1 model, neural voices  (requires OpenAI key)
//  2. TikTok TTS   — en_uk_001                   (CORS-open proxy, free)
//  3. StreamElements — Brian                      (AWS Polly, may have CORS)
//  4. Google Translate TTS                        (natural, ~200 char limit)
//  5. Web Speech API                              (browser-native fallback)
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

  // 2. TikTok TTS (UK male, AWS Polly neural, CORS-open, free)
  const tiktokUrl = await tryTikTokTTS(text);
  if (tiktokUrl) { playAudioUrl(tiktokUrl, text, onEnd); return; }

  // 3. StreamElements (AWS Polly Brian, UK male)
  const seUrl = await tryStreamElementsTTS(text);
  if (seUrl) { playAudioUrl(seUrl, text, onEnd); return; }

  // 4. Google Translate TTS (natural, 200-char chunks)
  const gtUrl = await tryGoogleTTS(text);
  if (gtUrl) { playAudioUrl(gtUrl, text, onEnd); return; }

  // 5. Last resort: browser Web Speech API
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
