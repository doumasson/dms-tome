import * as PIXI from 'pixi.js'

const CONDITION_VISUALS = {
  Poisoned:      { tint: 0x44cc44 },
  Burning:       { tint: 0xff6633 },
  Frozen:        { tint: 0x6688ff },
  Restrained:    { tint: 0x6688ff },
  Stunned:       { tint: 0xffff44 },
  Paralyzed:     { tint: 0x888888 },
  Blessed:       { tint: 0xffd700 },
  Hasted:        { tint: 0xffd700 },
  Invisible:     { alpha: 0.3 },
  Prone:         { scale: 0.7 },
  Concentration: { ring: 0x4488ff },
}

export function updateStatusEffects(container, combatants, tileSize) {
  container.removeChildren()
  for (const c of combatants) {
    if (!c.position) continue
    const conditions = c.conditions || []
    if (conditions.length === 0 && !c.concentration) continue

    const x = c.position.x * tileSize + tileSize / 2
    const y = c.position.y * tileSize + tileSize / 2

    // Ring for concentration
    if (c.concentration) {
      const ring = new PIXI.Graphics()
      ring.circle(x, y, tileSize * 0.45)
      ring.stroke({ color: 0x4488ff, width: 2, alpha: 0.6 })
      container.addChild(ring)
    }

    // Condition indicators — small colored dots above token
    for (let i = 0; i < conditions.length; i++) {
      const visual = CONDITION_VISUALS[conditions[i]]
      if (!visual) continue
      if (visual.tint) {
        const dot = new PIXI.Graphics()
        dot.circle(x - 20 + i * 12, y - tileSize * 0.4, 4)
        dot.fill({ color: visual.tint, alpha: 0.8 })
        container.addChild(dot)
      }
    }
  }
}
