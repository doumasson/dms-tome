// Procedural ambient audio system for DungeonMind.
// Generates scene-appropriate soundscapes using the Web Audio API — no external
// audio files, no API keys, no network requests. Falls back silently on
// browsers that block autoplay.
//
// Scene types: 'dungeon' | 'tavern' | 'outdoor' | 'town' | 'combat' | 'silence'
// Usage:
//   import { ambient } from './ambientAudio';
//   ambient.play('dungeon');            // start dungeon ambience
//   ambient.combatMode(true);           // switch to combat drums
//   ambient.combatMode(false, scene);   // revert to scene ambience
//   ambient.setMuted(true);             // silence everything
//   ambient.setVolume(0.4);             // 0..1

class AmbientSystem {
  constructor() {
    this.ctx        = null;
    this.master     = null;
    this.nodes      = [];        // { stop(), gain? }
    this.timers     = [];
    this.type       = null;
    this.volume     = 0.28;
    this.muted      = false;
    this._combatPrev = null;     // scene type before combat started
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  _init() {
    if (this.ctx) return true;
    try {
      this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
      this.master.connect(this.ctx.destination);
      // Resume on first user gesture if browser suspended the context
      if (this.ctx.state === 'suspended') {
        const resume = () => { this.ctx?.resume(); document.removeEventListener('click', resume); };
        document.addEventListener('click', resume, { once: true });
      }
      return true;
    } catch {
      return false;
    }
  }

  async _resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* blocked */ }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  async play(type) {
    if (!type || type === 'silence') { this.stop(); return; }
    if (!this._init()) return;
    await this._resume();
    if (type === this.type) return;

    this._fadeOut(1.2);
    const prev = this.type;
    this.type = type;
    setTimeout(() => {
      if (this.type !== type) return; // superseded
      this._clearNodes();
      this._build(type);
      this._fadeIn();
    }, prev ? 1300 : 0);
  }

  combatMode(active, scene = null) {
    if (active) {
      this._combatPrev = scene ? this._detect(scene) : (this.type || 'dungeon');
      this.play('combat');
    } else {
      this.play(this._combatPrev || 'dungeon');
      this._combatPrev = null;
    }
  }

  stop() {
    this._fadeOut(1.2);
    setTimeout(() => { this._clearNodes(); }, 1400);
    this.type = null;
  }

  setMuted(m) {
    this.muted = m;
    if (!this.master) return;
    const now = this.ctx?.currentTime ?? 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(m ? 0 : this.volume, now + 0.5);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.master || this.muted) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.volume, now + 0.3);
  }

  // Detect scene type from a scene object's title/text keywords
  detect(scene) {
    return this._detect(scene);
  }

  // ── Scene type detector ──────────────────────────────────────────────────
  _detect(scene) {
    if (!scene) return 'dungeon';
    const t = `${scene.title || ''} ${scene.text || ''}`.toLowerCase();
    if (/tavern|inn|bar|pub|alehouse|feast|banquet|hearth/.test(t)) return 'tavern';
    if (/town|city|market|village|square|street|shop|bazaar/.test(t)) return 'town';
    if (/forest|wood|grove|jungle|swamp|marsh|river|lake|beach|shore/.test(t)) return 'outdoor';
    if (/mountain|cliff|hill|peak|plain|field|road|path|moor/.test(t)) return 'outdoor';
    return 'dungeon'; // default for dungeons, caves, crypts, towers, etc.
  }

  // ── Fade helpers ─────────────────────────────────────────────────────────
  _fadeIn() {
    if (!this.master || this.muted) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this.volume, now + 2.5);
  }

  _fadeOut(dur = 1.2) {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    const cur = this.master.gain.value;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(cur, now);
    this.master.gain.linearRampToValueAtTime(0, now + dur);
  }

  // ── Node management ──────────────────────────────────────────────────────
  _clearNodes() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.nodes.forEach(n => { try { n.stop?.(); } catch { /* already stopped */ } });
    this.nodes = [];
  }

  _track(node) { this.nodes.push(node); }
  _timer(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  // ── Noise buffer (shared across builds) ─────────────────────────────────
  _noiseBuffer() {
    const sr  = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 2, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _loopNoise(filter, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this._track({ stop: () => src.stop() });
  }

  _osc(type, freq, gainVal) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    o.connect(g);
    g.connect(this.master);
    o.start();
    this._track({ stop: () => o.stop() });
    return { osc: o, gain: g };
  }

  // ── Scene builders ───────────────────────────────────────────────────────
  _build(type) {
    switch (type) {
      case 'dungeon':  this._dungeon();  break;
      case 'tavern':   this._tavern();   break;
      case 'outdoor':  this._outdoor();  break;
      case 'town':     this._town();     break;
      case 'combat':   this._combat();   break;
      default:         this._dungeon();
    }
  }

  _dungeon() {
    const ctx = this.ctx;
    // Deep drone
    this._osc('sine', 42, 0.07);
    this._osc('sine', 56, 0.04);   // slight fifth above

    // Low-pass filtered noise (cave rumble)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
    const g = ctx.createGain();         g.gain.value = 0.035;
    this._loopNoise(f, g);

    // Periodic drip
    const drip = () => {
      if (this.type !== 'dungeon') return;
      this._drip();
      this._timer(drip, 3500 + Math.random() * 9000);
    };
    this._timer(drip, 2000 + Math.random() * 4000);
  }

  _tavern() {
    const ctx = this.ctx;
    // Chatter: bandpass noise (simulates overlapping voices)
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 350; f1.Q.value = 0.6;
    const g1 = ctx.createGain();         g1.gain.value = 0.055;
    this._loopNoise(f1, g1);

    // Second voice layer at different freq
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 550; f2.Q.value = 0.4;
    const g2 = ctx.createGain();         g2.gain.value = 0.03;
    this._loopNoise(f2, g2);

    // Warm bass hum (hearth fire / low murmur)
    this._osc('sine', 75, 0.045);

    // Occasional lute note
    const note = () => {
      if (this.type !== 'tavern') return;
      this._luteNote();
      this._timer(note, 2500 + Math.random() * 6000);
    };
    this._timer(note, 1500);
  }

  _outdoor() {
    const ctx = this.ctx;
    // Wind: high-pass noise
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
    const g = ctx.createGain();         g.gain.value = 0.055;
    this._loopNoise(f, g);

    // Low wind rumble
    this._osc('sine', 38, 0.025);

    // Wind swell (slow LFO on the noise gain)
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain();      lfoG.gain.value = 0.018;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start();
    this._track({ stop: () => lfo.stop() });

    // Birds
    const bird = () => {
      if (this.type !== 'outdoor') return;
      this._birdChirp();
      this._timer(bird, 5000 + Math.random() * 14000);
    };
    this._timer(bird, 2000);
  }

  _town() {
    const ctx = this.ctx;
    // Distant crowd: multi-layer bandpass noise
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 450; f1.Q.value = 0.35;
    const g1 = ctx.createGain();         g1.gain.value = 0.045;
    this._loopNoise(f1, g1);

    // Cart/street sounds: low rumble
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 250;
    const g2 = ctx.createGain();         g2.gain.value = 0.025;
    this._loopNoise(f2, g2);

    this._osc('sine', 65, 0.03);

    // Occasional bell strike
    const bell = () => {
      if (this.type !== 'town') return;
      this._bellStrike();
      this._timer(bell, 12000 + Math.random() * 20000);
    };
    this._timer(bell, 8000);
  }

  _combat() {
    /* PLACEHOLDER — procedural combat ambience. Will replace with real audio assets. */
    const ctx = this.ctx;

    // Low sine drone (non-harsh, subtle tension)
    this._osc('sine', 45, 0.04);
    // Minor second interval for dissonance
    this._osc('sine', 48, 0.025);

    // Slow tremolo on a soft pad tone (sine, not sawtooth — avoids buzzing)
    const { osc, gain } = this._osc('sine', 90, 0);
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.8;
    const lfoG = ctx.createGain();      lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(gain.gain);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    lfo.start();
    this._track({ stop: () => lfo.stop() });

    // Very quiet filtered noise for atmosphere
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 100;
    const g = ctx.createGain();         g.gain.value = 0.015;
    this._loopNoise(f, g);

    // Sparse heartbeat thud (every ~2.5s instead of 0.6s, much less repetitive)
    const pulse = () => {
      if (this.type !== 'combat') return;
      this._thud();
      this._timer(pulse, 2200 + Math.random() * 1800);
    };
    this._timer(pulse, 3000);
  }

  // ── Sound effects ────────────────────────────────────────────────────────
  _drip() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1100 + Math.random() * 500, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + 0.32);
  }

  _birdChirp() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const freqs = [1400, 1650, 1900, 2200, 2600];
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * 0.11;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.22, t + 0.07);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.16);
    }
  }

  _luteNote() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // Pentatonic notes (Hz)
    const pentatonic = [261.6, 293.7, 329.6, 392, 440, 523.3];
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + 1.4);
  }

  _bellStrike() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // Church bell: fundamental + partials
    [523.3, 1047, 1568].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      const vol = [0.08, 0.04, 0.02][i];
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(ctx.currentTime + 3.8);
    });
  }

  _thud() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + 0.22);
  }
}

export const ambient = new AmbientSystem();
