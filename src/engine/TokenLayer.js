import * as PIXI from 'pixi.js'
import { getTileSize } from './tileAtlas'

// Track token groups by ID for animation
const tokenGroupMap = new Map()
// Per-token animations — allows multiple players to move simultaneously
const activeAnimations = new Map() // tokenId → { cancelled: boolean }

/**
 * Get the BG2/IWD-style selection circle color for a token.
 */
function getSelectionCircleColor(token) {
  if (token.isEnemy || token.type === 'enemy') return 0xcc2222  // Red - hostile
  if (token.isNpc) return 0x44cccc  // Cyan - neutral NPC
  if (token.type === 'ally') return 0x4488dd  // Blue - allied
  return 0x00cc44  // Green - party member
}

/**
 * Render tokens (players + NPCs) onto a PIXI.Container.
 * @param {PIXI.Container} container - The tokens layer
 * @param {Array} tokens - Array of { id, name, x, y, color, borderColor, isNpc, questRelevant, isEnemy, isActive }
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

    // Selection circle — BG2/IWD style ellipse under token feet, stroke only
    const selectionCircle = new PIXI.Graphics()
    const circleRadius = tileSize * 0.22
    const circleColor = getSelectionCircleColor(token)
    selectionCircle.ellipse(0, tileSize * 0.06, circleRadius, circleRadius * 0.4)
    selectionCircle.stroke({ width: token.isActive ? 2 : 1, color: circleColor, alpha: token.isActive ? 0.8 : 0.3 })
    group.addChild(selectionCircle)

    // Circle background — token avatar circle
    const bg = new PIXI.Graphics()
    const radius = tileSize * 0.2
    bg.circle(0, 0, radius).fill(token.color || 0x08060c)
    bg.circle(0, 0, radius).stroke({
      width: token.isNpc ? 2 : 3,
      color: token.borderColor || 0xc9a84c,
    })
    group.addChild(bg)

    // Scale factor for text/indicators — cap at 1x so labels stay small
    const scale = Math.min(tileSize / 64, 1)

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

    // Faction disposition indicator for NPCs
    if (token.isNpc && token.disposition) {
      const dispColors = { Hostile: 0xcc2222, Unfriendly: 0xcc6622, Neutral: 0x888844, Friendly: 0x44aa66, Revered: 0xd4af37 }
      const dispColor = dispColors[token.disposition] || 0x888844
      const indicator = new PIXI.Graphics()
      indicator.circle(-radius * 0.7, -radius * 0.7, 4 * scale)
      indicator.fill({ color: dispColor })
      indicator.circle(-radius * 0.7, -radius * 0.7, 4 * scale)
      indicator.stroke({ width: 1, color: 0x000000, alpha: 0.5 })
      group.addChild(indicator)
    }

    // Name label below token
    const nameLabel = new PIXI.Text({
      text: token.name || '',
      style: {
        fontSize: 9,
        fill: token.isNpc ? 0xbba878 : 0xffffff,
        fontFamily: 'Cinzel, serif',
        fontWeight: token.isNpc ? '400' : '700',
        letterSpacing: 0.5,
        dropShadow: { color: 0x000000, blur: 2, distance: 1 },
      },
    })
    nameLabel.anchor.set(0.5, 0)
    nameLabel.y = radius + 2
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

      // Dead token: flash red briefly then fade to 25% opacity
      if (token.currentHp <= 0) {
        // Check if this is a fresh kill (token was alive last frame)
        if (!group._deathFlashed) {
          group._deathFlashed = true
          group.tint = 0xff2222
          group.alpha = 1.0
          // Animate: red flash → fade out over 400ms
          const startTime = performance.now()
          const flashDuration = 400
          function flashTick() {
            const elapsed = performance.now() - startTime
            const progress = Math.min(1, elapsed / flashDuration)
            group.alpha = 1.0 - progress * 0.75 // 1.0 → 0.25
            group.tint = progress > 0.3 ? 0xffffff : 0xff2222 // red flash for first 30%
            if (progress < 1) requestAnimationFrame(flashTick)
          }
          requestAnimationFrame(flashTick)
        } else {
          group.alpha = 0.25
        }
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

  // Cancel any active animation for THIS token only
  const prevAnim = activeAnimations.get(tokenId)
  if (prevAnim) {
    prevAnim.cancelled = true
  }

  const tileSize = tileSizeOverride || getTileSize()
  const anim = { cancelled: false }
  activeAnimations.set(tokenId, anim)
  let step = 1
  const speed = tileSize * 0.15 // ~5 tiles/second at 60fps regardless of tile size

  function tick() {
    if (anim.cancelled || step >= path.length) {
      if (!anim.cancelled) {
        activeAnimations.delete(tokenId)
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
 * Check if the local player's walking animation is currently playing.
 * Only blocks the 'player' token — other players can move freely.
 */
export function isAnimating(tokenId = 'player') {
  const anim = activeAnimations.get(tokenId)
  return anim !== null && anim !== undefined && !anim.cancelled
}

/**
 * Check if ANY animation is playing (for render skip purposes).
 */
export function isAnyAnimating() {
  for (const anim of activeAnimations.values()) {
    if (!anim.cancelled) return true
  }
  return false
}
