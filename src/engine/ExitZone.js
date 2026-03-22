import * as PIXI from 'pixi.js'

/**
 * Render exit zones onto a PIXI.Container.
 * @param {PIXI.Container} container - The exits layer
 * @param {Array} exits - Array of { position: {x,y}, width, direction, targetZone, label }
 * @param {Function} onExitClick - callback when exit is clicked
 * @param {number} [tileSz] - tile size in pixels (default 200)
 */
export function renderExits(container, exits, onExitClick, tileSz) {
  container.removeChildren()
  const tileSize = tileSz || 200

  for (const exit of exits) {
    const group = new PIXI.Container()
    const ex = exit.position.x
    const ey = exit.position.y
    const ew = exit.width || 3 // Default to 3 tiles wide instead of 1
    const exitHeight = 2 // 2 tiles tall for visibility

    // Exit highlight rectangle — stronger fill for visibility
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, ew * tileSize, exitHeight * tileSize)
    bg.fill({ color: 0xc9a84c, alpha: 0.15 })
    bg.stroke({ width: 2, color: 0xc9a84c, alpha: 0.6 })
    group.addChild(bg)

    // Pulsing glow overlay (animated via ticker)
    const glow = new PIXI.Graphics()
    glow.rect(0, 0, ew * tileSize, exitHeight * tileSize)
    glow.fill({ color: 0xc9a84c, alpha: 0.06 })
    group.addChild(glow)

    // Archway / portal pillars on either side
    const pillarW = Math.max(8, tileSize * 0.08)
    const pillarH = exitHeight * tileSize
    const leftPillar = new PIXI.Graphics()
    leftPillar.rect(0, 0, pillarW, pillarH)
    leftPillar.fill({ color: 0xc9a84c, alpha: 0.35 })
    group.addChild(leftPillar)

    const rightPillar = new PIXI.Graphics()
    rightPillar.rect(ew * tileSize - pillarW, 0, pillarW, pillarH)
    rightPillar.fill({ color: 0xc9a84c, alpha: 0.35 })
    group.addChild(rightPillar)

    // Archway top bar
    const archBar = new PIXI.Graphics()
    archBar.rect(0, 0, ew * tileSize, Math.max(4, tileSize * 0.03))
    archBar.fill({ color: 0xc9a84c, alpha: 0.4 })
    group.addChild(archBar)

    // Destination label — larger and more prominent
    const label = new PIXI.Text({
      text: `\u27A4 ${exit.label || exit.targetZone}`,
      style: {
        fontSize: 14,
        fill: 0xf0d878,
        fontFamily: 'Cinzel, serif',
        fontWeight: '700',
        letterSpacing: 2,
        dropShadow: { color: 0x000000, blur: 4, distance: 1 },
      },
    })
    label.anchor.set(0.5, 0.5)
    label.x = (ew * tileSize) / 2
    label.y = (exitHeight * tileSize) / 2
    group.addChild(label)

    // Direction arrow — larger
    const arrow = new PIXI.Graphics()
    const cx = (ew * tileSize) / 2
    const arrowSz = 8
    if (exit.direction === 'south') {
      arrow.moveTo(cx - arrowSz, exitHeight * tileSize - 4).lineTo(cx, exitHeight * tileSize + 4).lineTo(cx + arrowSz, exitHeight * tileSize - 4)
    } else if (exit.direction === 'north') {
      arrow.moveTo(cx - arrowSz, 4).lineTo(cx, -4).lineTo(cx + arrowSz, 4)
    } else if (exit.direction === 'east') {
      arrow.moveTo(ew * tileSize - 4, exitHeight * tileSize / 2 - arrowSz).lineTo(ew * tileSize + 4, exitHeight * tileSize / 2).lineTo(ew * tileSize - 4, exitHeight * tileSize / 2 + arrowSz)
    } else if (exit.direction === 'west') {
      arrow.moveTo(4, exitHeight * tileSize / 2 - arrowSz).lineTo(-4, exitHeight * tileSize / 2).lineTo(4, exitHeight * tileSize / 2 + arrowSz)
    }
    arrow.fill({ color: 0xc9a84c, alpha: 0.7 })
    group.addChild(arrow)

    group.x = ex * tileSize
    group.y = ey * tileSize

    // Proximity indicator (shows when player is too far)
    const tooFarLabel = new PIXI.Text({
      text: '(move closer)',
      style: {
        fontSize: 10,
        fill: 0x999999,
        fontFamily: 'Cinzel, serif',
        fontStyle: 'italic',
        dropShadow: { color: 0x000000, blur: 3, distance: 1 },
      },
    })
    tooFarLabel.anchor.set(0.5, 0)
    tooFarLabel.x = (ew * tileSize) / 2
    tooFarLabel.y = exitHeight * tileSize + 4
    tooFarLabel.visible = false
    group.addChild(tooFarLabel)
    // Store refs for proximity update
    group._exitData = exit
    group._tooFarLabel = tooFarLabel
    group._bgGraphics = bg
    group._glowGraphics = glow
    group._exitWidth = ew
    group._exitHeight = exitHeight

    // Hover interaction
    group.eventMode = 'static'
    group.cursor = 'pointer'
    group.on('pointerdown', () => {
      onExitClick?.({
        targetZone: exit.targetZone,
        targetArea: exit.targetArea || exit.targetZone,
        entryPoint: exit.entryPoint || { x: 0, y: 0 },
        label: exit.label,
        x: ex, y: ey, width: ew,
      })
    })
    group.on('pointerover', () => {
      bg.clear()
      bg.rect(0, 0, ew * tileSize, exitHeight * tileSize)
      bg.fill({ color: 0xc9a84c, alpha: 0.25 })
      bg.stroke({ width: 3, color: 0xf0d878, alpha: 0.8 })
    })
    group.on('pointerout', () => {
      bg.clear()
      bg.rect(0, 0, ew * tileSize, exitHeight * tileSize)
      bg.fill({ color: 0xc9a84c, alpha: 0.15 })
      bg.stroke({ width: 2, color: 0xc9a84c, alpha: 0.6 })
    })

    container.addChild(group)
  }

  // Pulsing glow animation
  let elapsed = 0
  const ticker = (dt) => {
    elapsed += dt.deltaTime * 0.03
    const pulse = 0.03 + Math.sin(elapsed) * 0.03 // oscillates 0.00 to 0.06
    for (const child of container.children) {
      if (child._glowGraphics) {
        const g = child._glowGraphics
        const w = child._exitWidth
        const h = child._exitHeight
        const ts = tileSz || 200
        g.clear()
        g.rect(0, 0, w * ts, h * ts)
        g.fill({ color: 0xc9a84c, alpha: pulse })
      }
    }
  }
  // Store ticker ref for cleanup
  container._exitTicker = ticker
  const app = container.parent?.parent // Try to find the PIXI app
  // We'll use a simple interval fallback since app access may vary
  container._exitInterval = setInterval(() => {
    elapsed += 0.03
    const pulse = 0.03 + Math.sin(elapsed) * 0.03
    for (const child of container.children) {
      if (child._glowGraphics) {
        const g = child._glowGraphics
        const w = child._exitWidth
        const h = child._exitHeight
        const ts = tileSz || 200
        g.clear()
        g.rect(0, 0, w * ts, h * ts)
        g.fill({ color: 0xc9a84c, alpha: pulse })
      }
    }
  }, 50)
}

export function clearExits(container) {
  if (container._exitInterval) {
    clearInterval(container._exitInterval)
    container._exitInterval = null
  }
  container.removeChildren()
}
