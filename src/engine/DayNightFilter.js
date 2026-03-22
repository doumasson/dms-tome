// src/engine/DayNightFilter.js
const TINTS = {
  dawn:  { r: 1.0, g: 1.0,  b: 1.0,  brightness: 1.0  }, // no tint — subtle warmth was annoying
  day:   { r: 1.0, g: 1.0,  b: 1.0,  brightness: 1.0  },
  dusk:  { r: 0.95, g: 0.85, b: 0.72, brightness: 0.85 }, // gentle amber
  night: { r: 0.35, g: 0.38, b: 0.65, brightness: 0.45 },  // dark blue moonlit, not grey wash
}

export function applyDayNightTint(worldContainer, timeOfDay) {
  if (!worldContainer) return
  const t = TINTS[timeOfDay] || TINTS.day
  worldContainer.tint = (
    (Math.round(t.r * t.brightness * 255) << 16) |
    (Math.round(t.g * t.brightness * 255) << 8) |
    Math.round(t.b * t.brightness * 255)
  )
}
