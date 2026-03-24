import * as PIXI from 'pixi.js'

/**
 * Fade-to-black zone transition overlay with area name display.
 * @param {PIXI.Application} app
 * @param {Function} onMidpoint - Called when screen is fully black (swap zone here)
 * @param {Function} onComplete - Called when fade-in finishes
 * @param {number} duration - Total time in ms (default 800)
 * @param {string} [areaName] - Optional area name to display during transition
 */
export function playZoneTransition(app, onMidpoint, onComplete, duration = 800, areaName) {
  const overlay = new PIXI.Graphics()
  overlay.rect(0, 0, app.screen.width, app.screen.height)
  overlay.fill({ color: 0x000000 })
  overlay.alpha = 0
  overlay.zIndex = 9999
  app.stage.addChild(overlay)

  // Area name text displayed during the black screen
  let nameText = null
  if (areaName) {
    nameText = new PIXI.Text({
      text: areaName,
      style: {
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 28,
        fill: 0xc9a84c,
        align: 'center',
        letterSpacing: 3,
      },
    })
    nameText.anchor.set(0.5)
    nameText.x = app.screen.width / 2
    nameText.y = app.screen.height / 2
    nameText.alpha = 0
    nameText.zIndex = 10000
    app.stage.addChild(nameText)
  }

  const half = duration / 2
  const startTime = performance.now()
  let midpointFired = false

  function tick() {
    const elapsed = performance.now() - startTime
    if (elapsed < half) {
      overlay.alpha = elapsed / half
      // Fade in text during the first half
      if (nameText) nameText.alpha = Math.min(1, (elapsed / half) * 1.5)
    } else if (!midpointFired) {
      overlay.alpha = 1
      midpointFired = true
      if (nameText) nameText.alpha = 1
      onMidpoint?.()
    } else if (elapsed < duration) {
      const fadeOut = 1 - (elapsed - half) / half
      overlay.alpha = fadeOut
      if (nameText) nameText.alpha = fadeOut
    } else {
      overlay.alpha = 0
      app.stage.removeChild(overlay)
      overlay.destroy()
      if (nameText) {
        app.stage.removeChild(nameText)
        nameText.destroy()
      }
      onComplete?.()
      return
    }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
