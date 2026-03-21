import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

// Track token groups by ID for animation
const tokenGroupMap = new Map()
let activeAnimation = null

/**
 * Render tokens (players + NPCs) onto a PIXI.Container.
 * @param {PIXI.Container} container - The tokens layer
 * @param {Array} tokens - Array of { id, name, x, y, color, borderColor, isNpc, questRelevant }
 */
export function renderTokens(container, tokens, tileSizeOverride) {
  container.removeChildren()
  tokenGroupMap.clear()
  const tileSize = tileSizeOverride || getTileSize()

  for (const token of tokens) {
    const group = new PIXI.Container()
    group.x = token.x * tileSize + tileSize / 2
    group.y = token.y * tileSize + tileSize / 2
    group.label = token.id // store ID for lookup

    // Circle background
    const bg = new PIXI.Graphics()
    const radius = tileSize * 0.4
    bg.circle(0, 0, radius).fill(token.color || 0x08060c)
    bg.circle(0, 0, radius).stroke({
      width: token.isNpc ? 2 : 3,
      color: token.borderColor || 0xc9a84c,
    })
    group.addChild(bg)

    // Scale factor for text/indicators relative to tile size
    const scale = tileSize / 32

    // Quest indicator for relevant NPCs
    if (token.isNpc && token.questRelevant) {
      const quest = new PIXI.Graphics()
      quest.circle(radius * 0.7, -radius * 0.7, 5 * scale).fill(0xc9a84c)
      group.addChild(quest)

      const bang = new PIXI.Text({
        text: '!',
        style: { fontSize: 8 * scale, fontWeight: 'bold', fill: 0x08060c, fontFamily: 'Cinzel, serif' },
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
        fontSize: 9 * scale,
        fill: token.isNpc ? 0xbba878 : 0xffffff,
        fontFamily: 'Cinzel, serif',
        fontWeight: token.isNpc ? '400' : '700',
        letterSpacing: 1 * scale,
        dropShadow: { color: 0x000000, blur: 2 * scale, distance: 1 * scale },
      },
    })
    nameLabel.anchor.set(0.5, 0)
    nameLabel.y = radius + 4
    group.addChild(nameLabel)

    // HP bar for enemies/combatants in combat
    if (token.showHpBar && token.currentHp != null && token.maxHp != null) {
      const barWidth = radius * 1.6
      const barHeight = 4
      const hpPct = Math.max(0, token.currentHp / token.maxHp)
      const hpBar = new PIXI.Graphics()
      hpBar.rect(-barWidth / 2, -radius - 8, barWidth, barHeight).fill(0x3a0000)
      const hpColor = hpPct > 0.5 ? 0x44aa44 : hpPct > 0.25 ? 0xcc8800 : 0xcc2222
      hpBar.rect(-barWidth / 2, -radius - 8, barWidth * hpPct, barHeight).fill(hpColor)
      group.addChild(hpBar)

      // Dead token: fade to 25% opacity
      if (token.currentHp <= 0) {
        group.alpha = 0.25
      }
    }

    container.addChild(group)
    tokenGroupMap.set(token.id, group)
  }
}

/**
 * Smoothly animate a token along a path (tile-by-tile walking).
 * @param {string} tokenId - ID of token to move
 * @param {Array<{x:number,y:number}>} path - Grid positions to walk through
 * @param {Function} onStep - Called with {x, y} after each tile step completes
 * @param {Function} onComplete - Called when entire path is walked
 */
export function animateTokenAlongPath(tokenId, path, onStep, onComplete, tileSizeOverride) {
  const group = tokenGroupMap.get(tokenId)
  if (!group || path.length < 2) {
    onComplete?.()
    return
  }

  // Cancel any active animation
  if (activeAnimation) {
    activeAnimation.cancelled = true
  }

  const tileSize = tileSizeOverride || getTileSize()
  const anim = { cancelled: false }
  activeAnimation = anim
  let step = 1
  const speed = tileSize * 0.15 // ~5 tiles/second at 60fps regardless of tile size

  function tick() {
    if (anim.cancelled || step >= path.length) {
      if (!anim.cancelled) {
        activeAnimation = null
        onComplete?.()
      }
      return
    }

    const target = path[step]
    const tx = target.x * tileSize + tileSize / 2
    const ty = target.y * tileSize + tileSize / 2
    const dx = tx - group.x
    const dy = ty - group.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < speed) {
      group.x = tx
      group.y = ty
      onStep?.(target)
      step++
    } else {
      group.x += (dx / dist) * speed
      group.y += (dy / dist) * speed
    }

    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

/**
 * Check if a walking animation is currently playing.
 */
export function isAnimating() {
  return activeAnimation !== null && !activeAnimation.cancelled
}
