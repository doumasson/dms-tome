/**
 * Ambient Music — procedural background atmosphere using Web Audio API
 * Generates layered drone/pad sounds for exploration and combat moods.
 * No external audio files needed.
 */

let ctx = null;
let masterGain = null;
let currentMood = null;
let activeLayers = [];
let volume = 0.15;
let isPlaying = false;

// Mood definitions — each mood has harmonic layers that blend together
const MOODS = {
  exploration: {
    layers: [
      { type: 'sine', freq: 65.41, gain: 0.12, detune: 0 },      // C2 deep drone
      { type: 'sine', freq: 130.81, gain: 0.06, detune: -5 },     // C3 octave
      { type: 'triangle', freq: 196.0, gain: 0.04, detune: 3 },   // G3 fifth
      { type: 'sine', freq: 261.63, gain: 0.025, detune: -2 },    // C4 upper pad
    ],
    lfoRate: 0.08,   // slow wobble
    lfoDepth: 3,
    filterFreq: 400,
    filterQ: 1,
  },
  combat: {
    layers: [
      { type: 'sawtooth', freq: 55.0, gain: 0.08, detune: 0 },     // A1 aggressive drone
      { type: 'square', freq: 82.41, gain: 0.04, detune: 7 },      // E2 power fifth
      { type: 'sawtooth', freq: 110.0, gain: 0.05, detune: -3 },   // A2 octave
      { type: 'triangle', freq: 146.83, gain: 0.03, detune: 5 },   // D3 tension
    ],
    lfoRate: 0.3,    // faster pulse
    lfoDepth: 8,
    filterFreq: 600,
    filterQ: 2,
  },
  mystery: {
    layers: [
      { type: 'sine', freq: 73.42, gain: 0.1, detune: 0 },        // D2
      { type: 'triangle', freq: 110.0, gain: 0.05, detune: -7 },   // A2
      { type: 'sine', freq: 155.56, gain: 0.04, detune: 4 },       // Eb3 minor feel
      { type: 'sine', freq: 220.0, gain: 0.02, detune: -3 },       // A3
    ],
    lfoRate: 0.12,
    lfoDepth: 5,
    filterFreq: 350,
    filterQ: 1.5,
  },
  tavern: {
    layers: [
      { type: 'triangle', freq: 98.0, gain: 0.08, detune: 0 },     // G2
      { type: 'sine', freq: 146.83, gain: 0.06, detune: 2 },       // D3
      { type: 'triangle', freq: 196.0, gain: 0.04, detune: -2 },   // G3
      { type: 'sine', freq: 246.94, gain: 0.03, detune: 3 },       // B3 major
    ],
    lfoRate: 0.15,
    lfoDepth: 4,
    filterFreq: 500,
    filterQ: 0.8,
  },
  danger: {
    layers: [
      { type: 'sawtooth', freq: 49.0, gain: 0.07, detune: 0 },     // G1 very low
      { type: 'sine', freq: 73.42, gain: 0.06, detune: 8 },        // D2 dissonant
      { type: 'square', freq: 92.5, gain: 0.03, detune: -5 },      // Gb2 tritone
      { type: 'triangle', freq: 123.47, gain: 0.03, detune: 6 },   // B2
    ],
    lfoRate: 0.2,
    lfoDepth: 6,
    filterFreq: 300,
    filterQ: 3,
  },
};

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

/**
 * Start or transition to a mood.
 * Crossfades smoothly over ~2 seconds.
 */
export function setMood(mood) {
  if (mood === currentMood && isPlaying) return;
  if (!MOODS[mood]) return;

  const ac = getContext();
  if (ac.state === 'suspended') ac.resume();

  // Fade out old layers
  stopLayers(2);

  currentMood = mood;
  isPlaying = true;
  const def = MOODS[mood];
  const now = ac.currentTime;
  const newLayers = [];

  // Low-pass filter for warmth
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = def.filterFreq;
  filter.Q.value = def.filterQ;

  // LFO for subtle movement
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = def.lfoRate;
  lfoGain.gain.value = def.lfoDepth;
  lfo.connect(lfoGain);
  lfo.start(now);

  // Fade-in gain node
  const fadeGain = ac.createGain();
  fadeGain.gain.setValueAtTime(0, now);
  fadeGain.gain.linearRampToValueAtTime(1, now + 2);
  filter.connect(fadeGain);
  fadeGain.connect(masterGain);

  for (const layer of def.layers) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = layer.type;
    osc.frequency.value = layer.freq;
    osc.detune.value = layer.detune;
    gain.gain.value = layer.gain;

    // Connect LFO to frequency for subtle wavering
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    newLayers.push({ osc, gain });
  }

  activeLayers = [{ nodes: newLayers, fadeGain, filter, lfo, lfoGain }];
}

function stopLayers(fadeTime = 2) {
  if (activeLayers.length === 0) return;
  const ac = getContext();
  const now = ac.currentTime;

  for (const group of activeLayers) {
    // Fade out
    group.fadeGain.gain.setValueAtTime(group.fadeGain.gain.value, now);
    group.fadeGain.gain.linearRampToValueAtTime(0, now + fadeTime);

    // Schedule cleanup
    setTimeout(() => {
      try {
        group.lfo.stop();
        for (const l of group.nodes) l.osc.stop();
        group.fadeGain.disconnect();
        group.filter.disconnect();
      } catch (_) { /* already stopped */ }
    }, (fadeTime + 0.5) * 1000);
  }

  activeLayers = [];
}

/**
 * Stop all ambient music with fade out
 */
export function stopMusic(fadeTime = 2) {
  stopLayers(fadeTime);
  currentMood = null;
  isPlaying = false;
}

/**
 * Set master volume (0-1)
 */
export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) {
    const ac = getContext();
    masterGain.gain.setValueAtTime(masterGain.gain.value, ac.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.3);
  }
}

/**
 * Get available moods
 */
export function getMoods() {
  return Object.keys(MOODS);
}

/**
 * Get current state
 */
export function getMusicState() {
  return { mood: currentMood, volume, isPlaying };
}
