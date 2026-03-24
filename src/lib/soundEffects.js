/**
 * Sound Effects — procedural audio generation using Web Audio API
 * No external audio files needed; all sounds are generated algorithmically
 */

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a hit/impact sound (descending tone)
 */
export function playHitSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.15;

    // Create oscillator for the "thud" sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + duration);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}

/**
 * Play a miss sound (higher pitch, quick)
 */
export function playMissSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.1;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}

/**
 * Play a spell cast sound (rising whoosh)
 */
export function playSpellSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.3;

    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + duration);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    // Noise layer for whoosh
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    noiseSource.start(now);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}

/**
 * Play a heal sound (gentle rising chime)
 */
export function playHealSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.4;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + duration * 0.6);
    osc.frequency.exponentialRampToValueAtTime(660, now + duration);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.25, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    // Harmonic shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + duration);
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}

/**
 * Play a combat start sound (dramatic war horn)
 */
export function playCombatStartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.6;

    // Low war horn drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(130, now + duration * 0.3);
    osc.frequency.linearRampToValueAtTime(110, now + duration);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.25, now + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);

    // Higher overtone for brightness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.linearRampToValueAtTime(260, now + duration * 0.3);
    osc2.frequency.linearRampToValueAtTime(220, now + duration);
    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}

/**
 * Play a death sound (low descending tone)
 */
export function playDeathSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.8;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.log('Sound not available:', e.message);
  }
}
