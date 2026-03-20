/**
 * WeatherRenderer — PixiJS particle-based weather effects.
 * Supports: clear, rain, heavy_rain, snow, fog, storm
 * Call updateWeather() each ticker frame with deltaTime in ms.
 */
import * as PIXI from 'pixi.js'

const PARTICLE_POOL_MAX = 400

const WEATHER_CONFIG = {
  clear:      { spawnRate: 0, maxParticles: 0 },
  rain:       { spawnRate: 0.8,  maxParticles: 120, speed: 14,  spread: 2,  size: [1, 3],  color: 0x8899bb, alpha: 0.45 },
  heavy_rain: { spawnRate: 1.6,  maxParticles: 280, speed: 20,  spread: 3,  size: [1, 4],  color: 0x556688, alpha: 0.6  },
  snow:       { spawnRate: 0.4,  maxParticles: 100, speed: 2,   spread: 1,  size: [2, 4],  color: 0xddeeff, alpha: 0.7  },
  fog:        { spawnRate: 0,    maxParticles: 0,   speed: 0,   spread: 0,  size: [1, 1],  color: 0xffffff, alpha: 0.18 },
  storm:      { spawnRate: 2.0,  maxParticles: 350, speed: 26,  spread: 4,  size: [1, 4],  color: 0x445577, alpha: 0.65 },
}

// Shared particle pool across all calls to avoid GC churn
const _pool = []
function acquireParticle(container) {
  let p = _pool.pop()
  if (!p) {
    p = new PIXI.Graphics()
    p._weatherParticle = true
  }
  container.addChild(p)
  return p
}
function releaseParticle(container, p) {
  container.removeChild(p)
  p.clear()
  if (_pool.length < PARTICLE_POOL_MAX) _pool.push(p)
  else p.destroy()
}

// Per-container particle state
const _state = new WeakMap()

function getState(container) {
  if (!_state.has(container)) {
    _state.set(container, { particles: [], spawnAccum: 0, flashTimer: 0, fogOverlay: null })
  }
  return _state.get(container)
}

function spawnParticle(container, cfg, width, height) {
  const p = acquireParticle(container)
  const w = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0])
  const h = cfg.size[1] * 2
  p.clear()
  p.rect(0, 0, w, h)
  p.fill({ color: cfg.color, alpha: cfg.alpha })
  p.x = Math.random() * (width + 80) - 40
  p.y = -h - Math.random() * height * 0.5
  // Snow drifts, rain falls straight-ish
  const isSnow = cfg.speed <= 3
  p._vx = isSnow ? (Math.random() - 0.5) * cfg.spread * 0.3 : (Math.random() - 0.5) * cfg.spread
  p._vy = cfg.speed * (0.85 + Math.random() * 0.3)
  p._life = 1
  return p
}

/**
 * Update weather particles each frame.
 * @param {PIXI.Container} container — dedicated weather layer
 * @param {string} weatherType — 'clear' | 'rain' | 'heavy_rain' | 'snow' | 'fog' | 'storm'
 * @param {number} width — viewport width in pixels
 * @param {number} height — viewport height in pixels
 * @param {number} dt — deltaTime in milliseconds
 */
export function updateWeather(container, weatherType, width, height, dt) {
  const cfg = WEATHER_CONFIG[weatherType] || WEATHER_CONFIG.clear
  const state = getState(container)
  const dtSec = dt / 1000

  // --- Fog overlay (static semi-transparent rect) ---
  if (weatherType === 'fog') {
    if (!state.fogOverlay) {
      state.fogOverlay = new PIXI.Graphics()
      state.fogOverlay.rect(0, 0, width, height)
      state.fogOverlay.fill({ color: 0xffffff, alpha: WEATHER_CONFIG.fog.alpha })
      container.addChild(state.fogOverlay)
    } else {
      // Resize if viewport changed
      if (state.fogOverlay.width !== width || state.fogOverlay.height !== height) {
        state.fogOverlay.clear()
        state.fogOverlay.rect(0, 0, width, height)
        state.fogOverlay.fill({ color: 0xffffff, alpha: WEATHER_CONFIG.fog.alpha })
      }
    }
    return
  } else if (state.fogOverlay) {
    container.removeChild(state.fogOverlay)
    state.fogOverlay.destroy()
    state.fogOverlay = null
  }

  if (weatherType === 'clear') {
    // Remove all existing particles
    for (const p of state.particles) releaseParticle(container, p)
    state.particles = []
    return
  }

  // --- Storm: occasional lightning flash ---
  if (weatherType === 'storm') {
    state.flashTimer -= dt
    if (state.flashTimer <= 0) {
      container.alpha = 1.0
      // Brief white flash on parent container — just spike alpha
      const flashDur = 80 + Math.random() * 120
      container.alpha = 1.5  // PixiJS clamps to 1, but triggers a bright frame
      setTimeout(() => { if (container) container.alpha = 1 }, flashDur)
      // Schedule next flash
      state.flashTimer = 8000 + Math.random() * 14000
    }
  }

  // --- Spawn new particles ---
  const spawnCount = cfg.spawnRate * dtSec * 60 // normalize to 60fps
  state.spawnAccum += spawnCount
  const toSpawn = Math.floor(state.spawnAccum)
  state.spawnAccum -= toSpawn

  if (state.particles.length < cfg.maxParticles) {
    for (let i = 0; i < toSpawn && state.particles.length < cfg.maxParticles; i++) {
      const p = spawnParticle(container, cfg, width, height)
      state.particles.push(p)
    }
  }

  // --- Move + expire ---
  const toRemove = []
  for (const p of state.particles) {
    p.x += p._vx * dtSec * 60
    p.y += p._vy * dtSec * 60
    if (p.y > height + 20 || p.x < -60 || p.x > width + 60) {
      toRemove.push(p)
    }
  }
  for (const p of toRemove) {
    state.particles.splice(state.particles.indexOf(p), 1)
    releaseParticle(container, p)
  }
}

/**
 * Clear all weather particles and overlays from a container.
 */
export function clearWeather(container) {
  const state = _state.get(container)
  if (!state) return
  for (const p of state.particles) releaseParticle(container, p)
  state.particles = []
  if (state.fogOverlay) {
    container.removeChild(state.fogOverlay)
    state.fogOverlay.destroy()
    state.fogOverlay = null
  }
  _state.delete(container)
}
