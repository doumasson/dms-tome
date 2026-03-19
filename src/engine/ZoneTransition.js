import * as PIXI from 'pixi.js'

/**
 * Fade-to-black zone transition overlay.
 * @param {PIXI.Application} app
 * @param {Function} onMidpoint - Called when screen is fully black (swap zone here)
 * @param {Function} onComplete - Called when fade-in finishes
 * @param {number} duration - Total time in ms (default 600)
 */
export function playZoneTransition(app, onMidpoint, onComplete, duration = 600) {
  const overlay = new PIXI.Graphics()
  overlay.rect(0, 0, app.screen.width, app.screen.height)
  overlay.fill({ color: 0x000000 })
  overlay.alpha = 0
  overlay.zIndex = 9999
  app.stage.addChild(overlay)

  const half = duration / 2
  const startTime = performance.now()
  let midpointFired = false

  function tick() {
    const elapsed = performance.now() - startTime
    if (elapsed < half) {
      overlay.alpha = elapsed / half
    } else if (!midpointFired) {
      overlay.alpha = 1
      midpointFired = true
      onMidpoint?.()
    } else if (elapsed < duration) {
      overlay.alpha = 1 - (elapsed - half) / half
    } else {
      overlay.alpha = 0
      app.stage.removeChild(overlay)
      overlay.destroy()
      onComplete?.()
      return
    }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
