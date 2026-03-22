/* PLACEHOLDER: all sounds will be replaced with real audio assets */

/**
 * UI Sound Effects — placeholder procedural sounds.
 * Each sound is a short Web Audio synthesis approximating the target feel.
 * Modeled after Bioware RPG UI sounds (BG2, Icewind Dale).
 */

let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

// Master volume for UI sounds (0-1)
let uiVolume = 0.3
let uiMuted = false

export function setUiVolume(vol) { uiVolume = Math.max(0, Math.min(1, vol)) }
export function setUiMuted(muted) { uiMuted = muted }

function play(fn) {
  if (uiMuted || uiVolume <= 0) return
  try { fn(getCtx()) } catch(e) { /* ignore audio errors */ }
}

/**
 * Stone button click — short, muffled thud
 * Used for: action buttons, menu buttons, medallion buttons
 */
export function playStoneClick() {
  play(ctx => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(uiVolume * 0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  })
}

/**
 * Parchment rustle — soft noise burst
 * Used for: tooltip hover, opening panels, tab switches
 */
export function playParchmentRustle() {
  play(ctx => {
    const bufferSize = ctx.sampleRate * 0.06
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.5
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(uiVolume * 0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start(ctx.currentTime)
  })
}

/**
 * Metal clink — inventory/equipment interaction
 * Used for: equipping items, inventory open, loot pickup
 */
export function playMetalClink() {
  play(ctx => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(2800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(uiVolume * 0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  })
}

/**
 * Scroll unfurl — opening character sheet, spellbook
 * Used for: modal opens, full-screen panel transitions
 */
export function playScrollUnfurl() {
  play(ctx => {
    const bufferSize = ctx.sampleRate * 0.2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(4000, ctx.currentTime + 0.15)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(uiVolume * 0.2, ctx.currentTime + 0.05)
    gain.gain.linearRampToValueAtTime(uiVolume * 0.15, ctx.currentTime + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    source.connect(filter).connect(gain).connect(ctx.destination)
    source.start(ctx.currentTime)
  })
}

/**
 * Dice roll — short rattling sound
 * Used for: dice tray, skill checks, attack rolls
 */
export function playDiceRoll() {
  play(ctx => {
    const bufferSize = ctx.sampleRate * 0.15
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize
      data[i] = (Math.random() * 2 - 1) * (1 - t) * Math.sin(t * 800)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(uiVolume * 0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    source.connect(gain).connect(ctx.destination)
    source.start(ctx.currentTime)
  })
}

/**
 * Turn notification — soft bell/chime
 * Used for: "your turn" notification in combat
 */
export function playTurnChime() {
  play(ctx => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(uiVolume * 0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    // Second harmonic
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1320, ctx.currentTime)
    gain2.gain.setValueAtTime(uiVolume * 0.08, ctx.currentTime)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc2.connect(gain2).connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.05)
    osc2.stop(ctx.currentTime + 0.35)
  })
}
