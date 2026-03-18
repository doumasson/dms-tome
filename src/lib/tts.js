// StreamElements TTS (AWS Polly neural, Brian = deep UK male) is the primary voice.
// Falls back to Web Speech API if StreamElements is unavailable.

let currentAudio    = null;  // HTMLAudioElement for StreamElements
let currentUtterance = null; // SpeechSynthesisUtterance for fallback

const SE_BASE = 'https://api.streamelements.com/kappa/v2/speech';
const SE_VOICE = 'Brian'; // Deep UK male — sounds like a storyteller

export function isTTSSupported() {
  return true; // StreamElements works everywhere; Web Speech is the fallback
}

export async function speak(text, onEnd) {
  if (!text) return;
  stopSpeaking();

  // ── StreamElements (primary) ──────────────────────────────────────────────
  try {
    const url = `${SE_BASE}?voice=${SE_VOICE}&text=${encodeURIComponent(text)}`;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const blob     = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio    = new Audio(audioUrl);

      currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        speakFallback(text, onEnd);
      };

      audio.play().catch(() => {
        // Auto-play blocked — fall through to Web Speech
        currentAudio = null;
        speakFallback(text, onEnd);
      });

      return;
    }
  } catch {
    // StreamElements unreachable — fall through
  }

  speakFallback(text, onEnd);
}

// ── Web Speech fallback ───────────────────────────────────────────────────────

function getWebVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    }
  });
}

async function getDMVoice() {
  const voices = await getWebVoices();
  // Prefer deep English male voices in order
  const preferred = [
    'Google UK English Male',
    'Microsoft David - English (United States)',
    'Daniel',
    'Alex',
    'Google US English',
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang?.startsWith('en')) || null;
}

async function speakFallback(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.88;
  utterance.pitch  = 0.8;
  utterance.volume = 1;

  const voice = await getDMVoice();
  if (voice) utterance.voice = voice;
  if (onEnd) utterance.onend = onEnd;

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

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
