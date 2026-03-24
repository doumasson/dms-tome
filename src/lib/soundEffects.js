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
