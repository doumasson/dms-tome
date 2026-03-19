import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

/**
 * Render exit zones onto a PIXI.Container.
 * @param {PIXI.Container} container - The exits layer
 * @param {Array} exits - Array of { position: {x,y}, width, direction, targetZone, label }
 */
export function renderExits(container, exits) {
  container.removeChildren()
  const tileSize = getTileSize()

  for (const exit of exits) {
    const group = new PIXI.Container()
    const ex = exit.position.x
    const ey = exit.position.y
    const ew = exit.width || 1

    // Exit highlight rectangle
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, ew * tileSize, tileSize)
    bg.fill({ color: 0xc9a84c, alpha: 0.08 })
    bg.stroke({ width: 1.5, color: 0xc9a84c, alpha: 0.4 })
    group.addChild(bg)

    // Destination label
    const label = new PIXI.Text({
      text: `→ ${exit.label || exit.targetZone}`,
      style: {
        fontSize: 10,
        fill: 0xc9a84c,
        fontFamily: 'Cinzel, serif',
        fontWeight: '700',
        letterSpacing: 1,
        dropShadow: { color: 0x000000, blur: 3, distance: 1 },
      },
    })
    label.anchor.set(0.5, 0)
    label.x = (ew * tileSize) / 2
    label.y = tileSize + 4
    group.addChild(label)

    // Direction arrow
    const arrow = new PIXI.Graphics()
    const cx = (ew * tileSize) / 2
    if (exit.direction === 'south') {
      arrow.moveTo(cx - 5, tileSize - 2).lineTo(cx, tileSize + 2).lineTo(cx + 5, tileSize - 2)
    } else if (exit.direction === 'north') {
      arrow.moveTo(cx - 5, 2).lineTo(cx, -2).lineTo(cx + 5, 2)
    } else if (exit.direction === 'east') {
      arrow.moveTo(ew * tileSize - 2, tileSize / 2 - 5).lineTo(ew * tileSize + 2, tileSize / 2).lineTo(ew * tileSize - 2, tileSize / 2 + 5)
    } else if (exit.direction === 'west') {
      arrow.moveTo(2, tileSize / 2 - 5).lineTo(-2, tileSize / 2).lineTo(2, tileSize / 2 + 5)
    }
    arrow.fill({ color: 0xc9a84c, alpha: 0.6 })
    group.addChild(arrow)

    group.x = ex * tileSize
    group.y = ey * tileSize

    // Hover interaction
    group.eventMode = 'static'
    group.cursor = 'pointer'
    group.on('pointerover', () => {
      bg.clear()
      bg.rect(0, 0, ew * tileSize, tileSize)
      bg.fill({ color: 0xc9a84c, alpha: 0.18 })
      bg.stroke({ width: 2, color: 0xc9a84c, alpha: 0.7 })
    })
    group.on('pointerout', () => {
      bg.clear()
      bg.rect(0, 0, ew * tileSize, tileSize)
      bg.fill({ color: 0xc9a84c, alpha: 0.08 })
      bg.stroke({ width: 1.5, color: 0xc9a84c, alpha: 0.4 })
    })

    container.addChild(group)
  }
}

export function clearExits(container) {
  container.removeChildren()
}
