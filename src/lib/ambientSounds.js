/**
 * Ambient Sound Effects — procedural environmental audio using Web Audio API
 * Footsteps on movement, torch crackle loops, door sounds, and environment ambience.
 * No external audio files needed.
 */

let ctx = null;
let masterGain = null;
let loopNodes = {};  // { id: { source, gain, interval } }
let volume = 0.12;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ── One-shot sounds ──────────────────────────────────────────────────────

/** Footstep — short filtered noise burst */
export function playFootstep(surface = 'stone') {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    const dur = 0.06;

    // White noise burst
    const bufSize = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }

    const source = ac.createBufferSource();
    source.buffer = buf;

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    // Surface affects tone
    const freqs = { stone: 600, wood: 900, grass: 300, sand: 250 };
    filter.frequency.value = freqs[surface] || 600;
    filter.Q.value = 1;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);
    source.stop(now + dur);
  } catch (_) { /* audio not available */ }
}

/** Door creak — rising then falling frequency sweep */
export function playDoorCreak() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    const dur = 0.4;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(200 + Math.random() * 100, now + dur * 0.6);
    osc.frequency.linearRampToValueAtTime(60, now + dur);

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 150;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.12, now + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur);
  } catch (_) { /* audio not available */ }
}

/** Chest open — metallic click + creak */
export function playChestOpen() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;

    // Click
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = 'square';
    osc1.frequency.value = 2000;
    g1.gain.setValueAtTime(0.1, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc1.connect(g1);
    g1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.03);

    // Creak
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(120, now + 0.05);
    osc2.frequency.linearRampToValueAtTime(200, now + 0.25);
    const f2 = ac.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 180;
    f2.Q.value = 4;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.06, now + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(f2);
    f2.connect(g2);
    g2.connect(masterGain);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.3);
  } catch (_) { /* audio not available */ }
}

/** Coin jingle — for loot/shop */
export function playCoinSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    const notes = [4000, 5000, 6000];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq + Math.random() * 500;
      gain.gain.setValueAtTime(0.06, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.12);
    });
  } catch (_) { /* audio not available */ }
}

// ── Looping ambient sounds ───────────────────────────────────────────────

/** Start a looping torch crackle ambient sound */
export function startTorchCrackle(id = 'torch') {
  if (loopNodes[id]) return; // already playing
  try {
    const ac = getCtx();

    const crackle = () => {
      const now = ac.currentTime;
      const dur = 0.02 + Math.random() * 0.04;
      const bufSize = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000 + Math.random() * 2000;
      const gain = ac.createGain();
      gain.gain.value = 0.03 + Math.random() * 0.04;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      src.start(now);
    };

    // Random crackle interval
    const interval = setInterval(() => {
      if (Math.random() < 0.6) crackle();
    }, 80 + Math.random() * 120);

    loopNodes[id] = { interval };
  } catch (_) { /* audio not available */ }
}

/** Start wind ambient loop */
export function startWindLoop(id = 'wind') {
  if (loopNodes[id]) return;
  try {
    const ac = getCtx();
    const bufSize = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    // Brown noise (random walk)
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      last += (Math.random() * 2 - 1) * 0.02;
      last = Math.max(-1, Math.min(1, last));
      data[i] = last;
    }

    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.5;

    // LFO for volume swell
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);

    const gain = ac.createGain();
    gain.gain.value = 0.04;
    lfoGain.connect(gain.gain);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start();
    lfo.start();

    loopNodes[id] = { sources: [src, lfo], gain };
  } catch (_) { /* audio not available */ }
}

/** Stop a specific ambient loop */
export function stopAmbientLoop(id) {
  const node = loopNodes[id];
  if (!node) return;
  if (node.interval) clearInterval(node.interval);
  if (node.sources) {
    node.sources.forEach(s => { try { s.stop(); } catch (_) {} });
  }
  if (node.gain) {
    try { node.gain.disconnect(); } catch (_) {}
  }
  delete loopNodes[id];
}

/** Stop all ambient loops */
export function stopAllAmbientLoops() {
  Object.keys(loopNodes).forEach(stopAmbientLoop);
}

/** Set ambient sound volume */
export function setAmbientVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) {
    masterGain.gain.value = volume;
  }
}
