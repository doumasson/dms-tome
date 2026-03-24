/**
 * AmbientParticles — theme-based ambient particles on the PixiJS canvas.
 * Fireflies in forests, dust motes in dungeons, embers near fire areas.
 * Lightweight: max 30 particles, recycled, no external assets.
 */
import * as PIXI from 'pixi.js'

const MAX_PARTICLES = 30

const THEME_CONFIG = {
  forest:    { color: 0xccdd44, alpha: 0.6, size: [2, 4], speed: 0.3, drift: 0.8, glow: true,  label: 'firefly' },
  clearing:  { color: 0xccdd44, alpha: 0.5, size: [2, 3], speed: 0.25, drift: 0.6, glow: true,  label: 'firefly' },
  swamp:     { color: 0x66cc88, alpha: 0.4, size: [2, 4], speed: 0.2, drift: 0.5, glow: true,  label: 'wisp' },
  dungeon:   { color: 0x887766, alpha: 0.3, size: [1, 3], speed: 0.15, drift: 0.3, glow: false, label: 'dust' },
  cave:      { color: 0x998877, alpha: 0.25, size: [1, 2], speed: 0.1, drift: 0.4, glow: false, label: 'dust' },
  crypt:     { color: 0x8888aa, alpha: 0.3, size: [1, 3], speed: 0.12, drift: 0.3, glow: false, label: 'mist' },
  sewer:     { color: 0x669966, alpha: 0.2, size: [1, 2], speed: 0.1, drift: 0.3, glow: false, label: 'miasma' },
  town:      { color: 0xddaa44, alpha: 0.3, size: [1, 2], speed: 0.2, drift: 0.5, glow: false, label: 'ember' },
  village:   { color: 0xddaa44, alpha: 0.25, size: [1, 2], speed: 0.15, drift: 0.4, glow: false, label: 'ember' },
  desert:    { color: 0xccbb88, alpha: 0.2, size: [1, 2], speed: 0.3, drift: 1.0, glow: false, label: 'sand' },
  mountain:  { color: 0xbbbbcc, alpha: 0.15, size: [1, 2], speed: 0.2, drift: 0.6, glow: false, label: 'snow' },
  graveyard: { color: 0x8888aa, alpha: 0.35, size: [2, 4], speed: 0.1, drift: 0.2, glow: true,  label: 'wisp' },
  coastal:   { color: 0xaaccdd, alpha: 0.2, size: [1, 2], speed: 0.25, drift: 0.8, glow: false, label: 'spray' },
}

// State per container
const _state = new WeakMap()

function getState(container, screenW, screenH) {
  let s = _state.get(container)
  if (!s) {
    s = { particles: [], time: 0 }
    _state.set(container, s)
  }
  s.screenW = screenW
  s.screenH = screenH
  return s
}

function spawnParticle(state, cfg) {
  return {
    x: Math.random() * state.screenW,
    y: Math.random() * state.screenH,
    size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
    phase: Math.random() * Math.PI * 2,
    speed: cfg.speed * (0.5 + Math.random()),
    driftX: (Math.random() - 0.5) * cfg.drift,
    driftY: -cfg.speed * (0.5 + Math.random() * 0.5),
    life: 0,
    maxLife: 3000 + Math.random() * 5000,
  }
}

/**
 * Update ambient particles for the current theme.
 * Call once per ticker frame.
 * @param {PIXI.Container} container - dedicated particle container
 * @param {string} theme - area theme (forest, dungeon, town, etc.)
 * @param {number} dt - delta time in ms
 * @param {number} screenW - viewport width
 * @param {number} screenH - viewport height
 */
export function updateAmbientParticles(container, theme, dt, screenW, screenH) {
  const cfg = THEME_CONFIG[theme]
  if (!cfg) {
    // No config for this theme — hide all
    container.removeChildren()
    _state.delete(container)
    return
  }

  const state = getState(container, screenW, screenH)
  state.time += dt

  // Spawn particles up to max
  while (state.particles.length < MAX_PARTICLES) {
    state.particles.push(spawnParticle(state, cfg))
  }

  // Rebuild graphics each frame (cheap at 30 particles)
  container.removeChildren()

  const g = new PIXI.Graphics()
  const dtSec = dt / 1000

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]
    p.life += dt
    p.x += p.driftX * dtSec * 60
    p.y += p.driftY * dtSec * 60
    p.phase += dtSec * 2

    // Fade in/out over lifetime
    const lifePct = p.life / p.maxLife
    const fade = lifePct < 0.1 ? lifePct / 0.1
      : lifePct > 0.8 ? (1 - lifePct) / 0.2
      : 1

    // Pulse for glow particles
    const pulse = cfg.glow ? 0.5 + 0.5 * Math.sin(p.phase) : 1
    const alpha = cfg.alpha * fade * pulse

    if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > screenW + 20) {
      // Respawn
      state.particles[i] = spawnParticle(state, cfg)
      continue
    }

    g.circle(p.x, p.y, p.size)
    g.fill({ color: cfg.color, alpha })
  }

  container.addChild(g)
}

/**
 * Clean up ambient particle state for a container.
 */
export function destroyAmbientParticles(container) {
  container.removeChildren()
  _state.delete(container)
}
