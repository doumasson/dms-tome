let currentUtterance = null;

export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

function getVoices() {
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
  const voices = await getVoices();
  // Prefer deep, dramatic English voices in order
  const preferred = [
    'Google UK English Male',
    'Microsoft David - English (United States)',
    'Daniel',
    'Alex',
    'Google US English',
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  // Fallback: any English voice
  return voices.find((v) => v.lang.startsWith('en')) || null;
}

export async function speak(text, onEnd) {
  if (!isTTSSupported() || !text) return;
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 0.8;
  utterance.volume = 1;

  const voice = await getDMVoice();
  if (voice) utterance.voice = voice;
  if (onEnd) utterance.onend = onEnd;

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isTTSSupported()) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  return isTTSSupported() && speechSynthesis.speaking;
}
