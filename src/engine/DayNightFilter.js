// src/engine/DayNightFilter.js
const TINTS = {
  dawn:  { r: 1.0, g: 1.0,  b: 1.0,  brightness: 1.0  }, // no tint — subtle warmth was annoying
  day:   { r: 1.0, g: 1.0,  b: 1.0,  brightness: 1.0  },
  dusk:  { r: 0.95, g: 0.85, b: 0.72, brightness: 0.85 }, // gentle amber
  night: { r: 0.5, g: 0.55, b: 0.75, brightness: 0.55 },  // moonlit, not pitch black
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
