import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

/**
 * Render tokens (players + NPCs) onto a PIXI.Container.
 * @param {PIXI.Container} container - The tokens layer
 * @param {Array} tokens - Array of { id, name, x, y, color, borderColor, isNpc, questRelevant }
 */
export function renderTokens(container, tokens) {
  container.removeChildren()
  const tileSize = getTileSize()

  for (const token of tokens) {
    const group = new PIXI.Container()
    group.x = token.x * tileSize + tileSize / 2
    group.y = token.y * tileSize + tileSize / 2

    // Circle background
    const bg = new PIXI.Graphics()
    const radius = tileSize * 0.4
    bg.circle(0, 0, radius).fill(token.color || 0x08060c)
    bg.circle(0, 0, radius).stroke({
      width: token.isNpc ? 2 : 3,
      color: token.borderColor || 0xc9a84c,
    })
    group.addChild(bg)

    // Quest indicator for relevant NPCs
    if (token.isNpc && token.questRelevant) {
      const quest = new PIXI.Graphics()
      quest.circle(radius * 0.7, -radius * 0.7, 5).fill(0xc9a84c)
      group.addChild(quest)

      const bang = new PIXI.Text({
        text: '!',
        style: { fontSize: 8, fontWeight: 'bold', fill: 0x08060c, fontFamily: 'Cinzel, serif' },
      })
      bang.anchor.set(0.5)
      bang.x = radius * 0.7
      bang.y = -radius * 0.7
      group.addChild(bang)
    }

    // Name label below token
    const nameLabel = new PIXI.Text({
      text: token.name || '',
      style: {
        fontSize: 9,
        fill: token.isNpc ? 0xbba878 : 0xffffff,
        fontFamily: 'Cinzel, serif',
        fontWeight: token.isNpc ? '400' : '700',
        letterSpacing: 1,
        dropShadow: { color: 0x000000, blur: 2, distance: 1 },
      },
    })
    nameLabel.anchor.set(0.5, 0)
    nameLabel.y = radius + 4
    group.addChild(nameLabel)

    container.addChild(group)
  }
}

/**
 * Move a specific token to a new grid position with animation.
 * @param {PIXI.Container} container - Tokens layer
 * @param {string} tokenId - ID of token to move
 * @param {Array<{x:number,y:number}>} path - Array of grid positions to move through
 * @param {Function} onComplete - Called when movement finishes
 */
export function animateTokenAlongPath(container, tokenId, path, onComplete) {
  const tileSize = getTileSize()
  // Find the token group by checking children
  const tokenGroup = container.children.find((child, i) => i === 0) // simplified: use first player token
  // In practice, we'll match by a label or stored ID

  if (!tokenGroup || path.length < 2) {
    onComplete?.()
    return
  }

  let step = 1
  const speed = 4 // pixels per frame

  function tick() {
    if (step >= path.length) {
      onComplete?.()
      return
    }

    const target = path[step]
    const tx = target.x * tileSize + tileSize / 2
    const ty = target.y * tileSize + tileSize / 2
    const dx = tx - tokenGroup.x
    const dy = ty - tokenGroup.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < speed) {
      tokenGroup.x = tx
      tokenGroup.y = ty
      step++
    } else {
      tokenGroup.x += (dx / dist) * speed
      tokenGroup.y += (dy / dist) * speed
    }

    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
