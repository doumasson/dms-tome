import * as PIXI from 'pixi.js'

// Condition visuals: color + icon symbol for each SRD 5.1 condition
const CONDITION_VISUALS = {
  Blinded:       { tint: 0x555555, icon: '👁' },
  Charmed:       { tint: 0xff69b4, icon: '♥' },
  Deafened:      { tint: 0x777777, icon: '🔇' },
  Frightened:    { tint: 0x9933cc, icon: '!' },
  Grappled:      { tint: 0xcc6633, icon: '✊' },
  Incapacitated: { tint: 0x666666, icon: '✕' },
  Invisible:     { tint: 0xaaddff, icon: '◌', alpha: 0.4 },
  Paralyzed:     { tint: 0x888888, icon: '⚡' },
  Petrified:     { tint: 0x999999, icon: '🪨' },
  Poisoned:      { tint: 0x44cc44, icon: '☠' },
  Prone:         { tint: 0xaa8844, icon: '⬇' },
  Restrained:    { tint: 0x8866aa, icon: '⛓' },
  Stunned:       { tint: 0xffff44, icon: '★' },
  Unconscious:   { tint: 0x444444, icon: '💤' },
  // Non-SRD but common in-game
  Burning:       { tint: 0xff6633, icon: '🔥' },
  Frozen:        { tint: 0x6688ff, icon: '❄' },
  Blessed:       { tint: 0xffd700, icon: '✦' },
  Hasted:        { tint: 0xffd700, icon: '»' },
  Hexed:         { tint: 0x9933cc, icon: '⬡' },
  Concentration: { ring: 0x4488ff },
}

const ICON_SIZE = 16
const ICON_GAP = 2
const BADGE_RADIUS = 10

export function updateStatusEffects(container, combatants, tileSize) {
  container.removeChildren()
  for (const c of combatants) {
    if (!c.position) continue
    const conditions = c.conditions || []
    if (conditions.length === 0 && !c.concentration) continue

    const cx = c.position.x * tileSize + tileSize / 2
    const cy = c.position.y * tileSize + tileSize / 2

    // Concentration ring around token
    if (c.concentration) {
      const ring = new PIXI.Graphics()
      ring.circle(cx, cy, tileSize * 0.45)
      ring.stroke({ color: 0x4488ff, width: 2.5, alpha: 0.7 })
      container.addChild(ring)
    }

    // Invisible token effect — make the whole token semi-transparent
    if (conditions.includes('Invisible')) {
      const overlay = new PIXI.Graphics()
      overlay.circle(cx, cy, tileSize * 0.35)
      overlay.fill({ color: 0xffffff, alpha: 0.15 })
      overlay.stroke({ color: 0xaaddff, width: 1.5, alpha: 0.4 })
      container.addChild(overlay)
    }

    // Prone indicator — flatten effect
    if (conditions.includes('Prone')) {
      const prone = new PIXI.Graphics()
      prone.ellipse(cx, cy + tileSize * 0.15, tileSize * 0.35, tileSize * 0.15)
      prone.stroke({ color: 0xaa8844, width: 2, alpha: 0.6 })
      container.addChild(prone)
    }

    // Condition badge icons — arranged in a row above the token
    const displayConditions = conditions.filter(cond => {
      const v = CONDITION_VISUALS[cond]
      return v && v.icon // skip ones without icons (handled separately like Prone/Invisible)
    })

    if (displayConditions.length === 0) continue

    const totalWidth = displayConditions.length * (BADGE_RADIUS * 2 + ICON_GAP) - ICON_GAP
    const startX = cx - totalWidth / 2 + BADGE_RADIUS

    for (let i = 0; i < displayConditions.length; i++) {
      const cond = displayConditions[i]
      const visual = CONDITION_VISUALS[cond]
      const bx = startX + i * (BADGE_RADIUS * 2 + ICON_GAP)
      const by = cy - tileSize * 0.45 - BADGE_RADIUS - 2

      // Badge background circle
      const badge = new PIXI.Graphics()
      badge.circle(bx, by, BADGE_RADIUS)
      badge.fill({ color: 0x111111, alpha: 0.85 })
      badge.circle(bx, by, BADGE_RADIUS)
      badge.stroke({ color: visual.tint, width: 1.5, alpha: 0.9 })
      container.addChild(badge)

      // Icon text
      const label = new PIXI.Text({
        text: visual.icon,
        style: {
          fontSize: ICON_SIZE - 4,
          fill: visual.tint,
          fontFamily: 'sans-serif',
          align: 'center',
        },
      })
      label.anchor.set(0.5, 0.5)
      label.position.set(bx, by)
      container.addChild(label)
    }
  }
}
