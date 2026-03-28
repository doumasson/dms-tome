/**
 * SpellEffects — PixiJS particle-based spell cast animations.
 *
 * Renders directly on the tilemap canvas for seamless integration.
 * Each spell type has a unique visual: projectiles, explosions, sparkles, etc.
 */

import * as PIXI from 'pixi.js'

// Active effect animations
const _effects = []
let _container = null
let _ticker = null

export function initSpellEffects(container, ticker) {
  _container = container
  _ticker = ticker
  if (_ticker) {
    _ticker.add(updateEffects)
  }
}

export function cleanupSpellEffects() {
  if (_ticker) _ticker.remove(updateEffects)
  _effects.forEach(e => { try { e.gfx.destroy() } catch {} })
  _effects.length = 0
}

function updateEffects() {
  const dt = 1 / 60 // ~16ms per frame
  for (let i = _effects.length - 1; i >= 0; i--) {
    const fx = _effects[i]
    fx.elapsed += dt
    const progress = Math.min(fx.elapsed / fx.duration, 1)
    fx.update(fx, progress)
    if (progress >= 1) {
      try { _container?.removeChild(fx.gfx) } catch {}
      try { fx.gfx.destroy() } catch {}
      _effects.splice(i, 1)
    }
  }
}

/**
 * Play a spell animation.
 * @param {string} spellName — spell name to match animation type
 * @param {{x:number,y:number}} casterPos — grid position of caster
 * @param {{x:number,y:number}} targetPos — grid position of target/center
 * @param {number} tileSize — pixels per tile
 * @param {object} [opts] — { areaType, areaSize, damageType }
 */
export function playSpellEffect(spellName, casterPos, targetPos, tileSize, opts = {}) {
  if (!_container) { console.warn('[SpellEffects] No container — initSpellEffects not called'); return }
  console.log('[SpellEffects] Playing:', spellName, 'from', casterPos, 'to', targetPos)

  const name = spellName.toLowerCase()
  const cx = casterPos.x * tileSize + tileSize / 2
  const cy = casterPos.y * tileSize + tileSize / 2
  const tx = targetPos.x * tileSize + tileSize / 2
  const ty = targetPos.y * tileSize + tileSize / 2

  if (name.includes('magic missile')) {
    spawnMagicMissiles(cx, cy, tx, ty, tileSize)
  } else if (name.includes('burning hands') || name.includes('fire bolt')) {
    spawnFireEffect(cx, cy, tx, ty, tileSize, opts.areaType === 'cone')
  } else if (name.includes('sleep')) {
    spawnSleepSparkles(tx, ty, tileSize, opts.areaSize || 20)
  } else if (name.includes('thunderwave') || name.includes('shatter')) {
    spawnShockwave(cx, cy, tileSize, opts.areaSize || 15)
  } else if (name.includes('cure') || name.includes('heal')) {
    spawnHealingGlow(tx, ty, tileSize)
  } else if (name.includes('eldritch blast')) {
    spawnEldritchBlast(cx, cy, tx, ty, tileSize)
  } else if (name.includes('ray of frost') || name.includes('ice knife') || name.includes('cone of cold')) {
    spawnFrostEffect(cx, cy, tx, ty, tileSize, opts.areaType === 'cone')
  } else if (name.includes('lightning') || name.includes('witch bolt') || name.includes('chromatic orb')) {
    spawnLightningBolt(cx, cy, tx, ty, tileSize)
  } else if (name.includes('sacred flame') || name.includes('guiding bolt')) {
    spawnRadiantBurst(tx, ty, tileSize)
  } else if (name.includes('poison spray') || name.includes('acid')) {
    spawnPoisonCloud(tx, ty, tileSize)
  } else if (name.includes('hex') || name.includes('chill touch') || name.includes('toll the dead')) {
    spawnNecroticWisp(cx, cy, tx, ty, tileSize)
  } else {
    // Generic arcane burst at target
    spawnArcaneBurst(tx, ty, tileSize)
  }
}

// ─── Magic Missile: 3 glowing darts with trails ─────────────────────

function spawnMagicMissiles(cx, cy, tx, ty, ts) {
  for (let i = 0; i < 3; i++) {
    const gfx = new PIXI.Graphics()
    _container.addChild(gfx)
    const delay = i * 0.08
    const offsetY = (i - 1) * ts * 0.3 // spread vertically
    const trail = []

    _effects.push({
      gfx, elapsed: 0, duration: 0.5 + delay,
      update(fx, p) {
        const t = Math.max(0, (p - delay / fx.duration) / (1 - delay / fx.duration))
        if (t <= 0) return
        const eased = easeOutQuad(Math.min(t, 1))
        // Dart position with arc
        const midY = (cy + ty) / 2 + offsetY
        const x = cx + (tx - cx) * eased
        const y = quadBezier(cy, midY, ty, eased)

        trail.push({ x, y, alpha: 1 })
        if (trail.length > 8) trail.shift()

        gfx.clear()
        // Trail
        for (let j = 0; j < trail.length; j++) {
          const tp = trail[j]
          const a = (j / trail.length) * 0.6
          gfx.circle(tp.x, tp.y, 3 + j * 0.5)
          gfx.fill({ color: 0x8888ff, alpha: a })
        }
        // Dart head
        if (t < 1) {
          gfx.circle(x, y, 5)
          gfx.fill({ color: 0xaaccff, alpha: 0.9 })
          gfx.circle(x, y, 10)
          gfx.fill({ color: 0x6666ff, alpha: 0.3 })
        }
        // Impact flash
        if (t >= 0.95) {
          const flash = 1 - (t - 0.95) / 0.05
          gfx.circle(tx, ty + offsetY * 0.3, 15 * flash)
          gfx.fill({ color: 0xccddff, alpha: flash * 0.5 })
        }
      },
    })
  }
}

// ─── Fire: cone or bolt of flames ────────────────────────────────────

function spawnFireEffect(cx, cy, tx, ty, ts, isCone) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const particles = []
  const angle = Math.atan2(ty - cy, tx - cx)

  for (let i = 0; i < (isCone ? 30 : 12); i++) {
    const spread = isCone ? (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 0.3
    const dist = isCone ? ts * (1 + Math.random() * 2) : Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2)
    const speed = 0.5 + Math.random() * 0.5
    particles.push({
      angle: angle + spread,
      dist: dist * speed,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.2,
    })
  }

  _effects.push({
    gfx, elapsed: 0, duration: 0.6,
    update(fx, p) {
      gfx.clear()
      for (const pt of particles) {
        const t = Math.max(0, (p - pt.delay) / (1 - pt.delay))
        if (t <= 0 || t > 1) continue
        const eased = easeOutQuad(t)
        const x = cx + Math.cos(pt.angle) * pt.dist * eased
        const y = cy + Math.sin(pt.angle) * pt.dist * eased
        const alpha = (1 - t) * 0.8
        const size = pt.size * (0.5 + eased * 0.5)
        // Inner bright
        gfx.circle(x, y, size * 0.5)
        gfx.fill({ color: 0xffcc00, alpha })
        // Outer glow
        gfx.circle(x, y, size)
        gfx.fill({ color: 0xff4400, alpha: alpha * 0.4 })
      }
    },
  })
}

// ─── Sleep: gentle sparkles falling in area ──────────────────────────

function spawnSleepSparkles(tx, ty, ts, areaSize) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const radius = (areaSize / 5) * ts / 2
  const sparkles = []
  for (let i = 0; i < 25; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * radius
    sparkles.push({
      x: tx + Math.cos(a) * r,
      y: ty + Math.sin(a) * r - ts,
      fallSpeed: 30 + Math.random() * 50,
      size: 2 + Math.random() * 4,
      twinkle: Math.random() * Math.PI * 2,
      delay: Math.random() * 0.4,
    })
  }

  _effects.push({
    gfx, elapsed: 0, duration: 1.5,
    update(fx, p) {
      gfx.clear()
      for (const s of sparkles) {
        const t = Math.max(0, (p - s.delay) / (1 - s.delay))
        if (t <= 0 || t > 1) continue
        const y = s.y + s.fallSpeed * t
        const alpha = Math.sin(t * Math.PI) * 0.8 * (0.5 + 0.5 * Math.sin(s.twinkle + t * 10))
        gfx.star(s.x, y, 4, s.size, s.size * 0.4)
        gfx.fill({ color: 0xccaaff, alpha })
        gfx.circle(s.x, y, s.size * 2)
        gfx.fill({ color: 0x8866dd, alpha: alpha * 0.2 })
      }
    },
  })
}

// ─── Thunderwave / Shatter: expanding shockwave ring ─────────────────

function spawnShockwave(cx, cy, ts, areaSize) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const maxRadius = (areaSize / 5) * ts

  _effects.push({
    gfx, elapsed: 0, duration: 0.5,
    update(fx, p) {
      gfx.clear()
      const eased = easeOutQuad(p)
      const r = maxRadius * eased
      const alpha = (1 - p) * 0.7
      // Outer ring
      gfx.circle(cx, cy, r)
      gfx.stroke({ width: 4, color: 0x6688cc, alpha })
      // Inner ring
      gfx.circle(cx, cy, r * 0.7)
      gfx.stroke({ width: 2, color: 0xaabbff, alpha: alpha * 0.5 })
      // Flash at center
      if (p < 0.2) {
        gfx.circle(cx, cy, r * 0.3)
        gfx.fill({ color: 0xffffff, alpha: (1 - p / 0.2) * 0.4 })
      }
    },
  })
}

// ─── Healing: golden/green rising sparkles with warm glow ─────────────

function spawnHealingGlow(tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const particles = []
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: tx + (Math.random() - 0.5) * ts,
      startY: ty + (Math.random() - 0.5) * ts * 0.5,
      rise: 20 + Math.random() * 40,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.3,
      isGold: Math.random() > 0.4,
    })
  }

  _effects.push({
    gfx, elapsed: 0, duration: 1.0,
    update(fx, p) {
      gfx.clear()
      // Warm glow at base
      const glowAlpha = Math.sin(p * Math.PI) * 0.2
      gfx.circle(tx, ty, ts * 0.6)
      gfx.fill({ color: 0x44ff66, alpha: glowAlpha })

      for (const pt of particles) {
        const t = Math.max(0, (p - pt.delay) / (1 - pt.delay))
        if (t <= 0 || t > 1) continue
        const y = pt.startY - pt.rise * easeOutQuad(t)
        const alpha = Math.sin(t * Math.PI) * 0.9
        const color = pt.isGold ? 0xffd700 : 0x66ff88
        gfx.circle(pt.x, y, pt.size)
        gfx.fill({ color, alpha })
      }
    },
  })
}

// ─── Eldritch Blast: crackling green beam ─────────────────────────────

function spawnEldritchBlast(cx, cy, tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)

  _effects.push({
    gfx, elapsed: 0, duration: 0.4,
    update(fx, p) {
      gfx.clear()
      const eased = easeOutQuad(Math.min(p * 2, 1))
      const endX = cx + (tx - cx) * eased
      const endY = cy + (ty - cy) * eased

      // Beam with jitter
      for (let i = 0; i < 3; i++) {
        const jx = (Math.random() - 0.5) * 4
        const jy = (Math.random() - 0.5) * 4
        gfx.moveTo(cx + jx, cy + jy)
        gfx.lineTo(endX + jx, endY + jy)
        gfx.stroke({ width: 3 - i, color: i === 0 ? 0x44ff44 : 0x22cc22, alpha: (1 - p) * (0.8 - i * 0.2) })
      }

      // Impact
      if (p > 0.4) {
        const impactP = (p - 0.4) / 0.6
        gfx.circle(tx, ty, 12 * (1 - impactP))
        gfx.fill({ color: 0x66ff66, alpha: (1 - impactP) * 0.5 })
      }
    },
  })
}

// ─── Frost: icy blue particles or beam ─────────────────────────────────

function spawnFrostEffect(cx, cy, tx, ty, ts, isCone) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const angle = Math.atan2(ty - cy, tx - cx)
  const particles = []
  const count = isCone ? 25 : 10

  for (let i = 0; i < count; i++) {
    const spread = isCone ? (Math.random() - 0.5) * 1.0 : (Math.random() - 0.5) * 0.2
    const dist = isCone ? ts * (1 + Math.random() * 2) : Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2)
    particles.push({
      angle: angle + spread,
      dist: dist * (0.5 + Math.random() * 0.5),
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.15,
    })
  }

  _effects.push({
    gfx, elapsed: 0, duration: 0.5,
    update(fx, p) {
      gfx.clear()
      for (const pt of particles) {
        const t = Math.max(0, (p - pt.delay) / (1 - pt.delay))
        if (t <= 0 || t > 1) continue
        const eased = easeOutQuad(t)
        const x = cx + Math.cos(pt.angle) * pt.dist * eased
        const y = cy + Math.sin(pt.angle) * pt.dist * eased
        const alpha = (1 - t) * 0.7
        gfx.circle(x, y, pt.size)
        gfx.fill({ color: 0x88ddff, alpha })
        gfx.circle(x, y, pt.size * 0.4)
        gfx.fill({ color: 0xffffff, alpha: alpha * 0.8 })
      }
    },
  })
}

// ─── Lightning Bolt: zigzag electric bolt ──────────────────────────────

function spawnLightningBolt(cx, cy, tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  // Generate zigzag points
  const segments = 8
  const points = [{ x: cx, y: cy }]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const mx = cx + (tx - cx) * t + (Math.random() - 0.5) * ts * 0.4
    const my = cy + (ty - cy) * t + (Math.random() - 0.5) * ts * 0.4
    points.push({ x: mx, y: my })
  }
  points.push({ x: tx, y: ty })

  _effects.push({
    gfx, elapsed: 0, duration: 0.35,
    update(fx, p) {
      gfx.clear()
      const alpha = p < 0.15 ? 1 : (1 - (p - 0.15) / 0.85) * 0.8
      // Main bolt
      for (let i = 0; i < points.length - 1; i++) {
        const jx = (Math.random() - 0.5) * 3
        const jy = (Math.random() - 0.5) * 3
        gfx.moveTo(points[i].x + jx, points[i].y + jy)
        gfx.lineTo(points[i + 1].x + jx, points[i + 1].y + jy)
      }
      gfx.stroke({ width: 4, color: 0xffff44, alpha })
      // Glow
      for (let i = 0; i < points.length - 1; i++) {
        gfx.moveTo(points[i].x, points[i].y)
        gfx.lineTo(points[i + 1].x, points[i + 1].y)
      }
      gfx.stroke({ width: 10, color: 0x4488ff, alpha: alpha * 0.3 })
      // Flash
      if (p < 0.1) {
        gfx.circle(tx, ty, 20)
        gfx.fill({ color: 0xffffff, alpha: 0.4 })
      }
    },
  })
}

// ─── Radiant Burst: golden pillar of light ──────────────────────────────

function spawnRadiantBurst(tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)

  _effects.push({
    gfx, elapsed: 0, duration: 0.7,
    update(fx, p) {
      gfx.clear()
      const alpha = Math.sin(p * Math.PI) * 0.7
      // Pillar of light
      const width = ts * 0.4 * (1 - p * 0.3)
      gfx.rect(tx - width / 2, ty - ts * 2 * (1 - p * 0.5), width, ts * 2)
      gfx.fill({ color: 0xffffaa, alpha: alpha * 0.3 })
      // Core
      gfx.rect(tx - width / 4, ty - ts * 2 * (1 - p * 0.5), width / 2, ts * 2)
      gfx.fill({ color: 0xffffff, alpha: alpha * 0.5 })
      // Ground ring
      gfx.circle(tx, ty, ts * 0.5 * (0.5 + p * 0.5))
      gfx.fill({ color: 0xffd700, alpha: alpha * 0.3 })
    },
  })
}

// ─── Poison Cloud: green miasma ──────────────────────────────────────

function spawnPoisonCloud(tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)
  const blobs = []
  for (let i = 0; i < 8; i++) {
    blobs.push({
      x: tx + (Math.random() - 0.5) * ts,
      y: ty + (Math.random() - 0.5) * ts,
      size: 10 + Math.random() * 20,
      drift: (Math.random() - 0.5) * 30,
    })
  }

  _effects.push({
    gfx, elapsed: 0, duration: 1.0,
    update(fx, p) {
      gfx.clear()
      for (const b of blobs) {
        const alpha = Math.sin(p * Math.PI) * 0.4
        const x = b.x + b.drift * p
        const y = b.y - 10 * p
        gfx.circle(x, y, b.size * (0.5 + p * 0.5))
        gfx.fill({ color: 0x44cc22, alpha })
      }
    },
  })
}

// ─── Necrotic Wisp: dark tendrils from caster to target ──────────────

function spawnNecroticWisp(cx, cy, tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)

  _effects.push({
    gfx, elapsed: 0, duration: 0.6,
    update(fx, p) {
      gfx.clear()
      const eased = easeOutQuad(Math.min(p * 1.5, 1))
      // Dark tendrils
      for (let i = 0; i < 3; i++) {
        const wobble = Math.sin(p * 8 + i * 2) * 15
        const midX = (cx + tx) / 2 + wobble
        const midY = (cy + ty) / 2 + wobble * 0.5
        const endX = cx + (tx - cx) * eased
        const endY = cy + (ty - cy) * eased
        gfx.moveTo(cx, cy)
        gfx.quadraticCurveTo(midX, midY, endX, endY)
        gfx.stroke({ width: 3 - i, color: 0x662288, alpha: (1 - p) * 0.6 })
      }
      // Impact skull flash
      if (p > 0.5) {
        const ip = (p - 0.5) / 0.5
        gfx.circle(tx, ty, 15 * (1 - ip))
        gfx.fill({ color: 0x9944cc, alpha: (1 - ip) * 0.5 })
      }
    },
  })
}

// ─── Generic Arcane Burst: purple/blue flash ──────────────────────────

function spawnArcaneBurst(tx, ty, ts) {
  const gfx = new PIXI.Graphics()
  _container.addChild(gfx)

  _effects.push({
    gfx, elapsed: 0, duration: 0.5,
    update(fx, p) {
      gfx.clear()
      const alpha = (1 - p) * 0.6
      // Expanding rings
      gfx.circle(tx, ty, ts * 0.3 * (0.5 + p))
      gfx.fill({ color: 0x8844cc, alpha: alpha * 0.4 })
      gfx.circle(tx, ty, ts * 0.2 * (0.3 + p * 0.7))
      gfx.fill({ color: 0xbb88ff, alpha })
      // Sparkle particles
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p * 3
        const r = ts * 0.4 * p
        gfx.circle(tx + Math.cos(a) * r, ty + Math.sin(a) * r, 3 * (1 - p))
        gfx.fill({ color: 0xddbbff, alpha })
      }
    },
  })
}

// ─── Utilities ──────────────────────────────────────────────────────

function easeOutQuad(t) { return 1 - (1 - t) * (1 - t) }

function quadBezier(a, b, c, t) {
  const inv = 1 - t
  return inv * inv * a + 2 * inv * t * b + t * t * c
}
