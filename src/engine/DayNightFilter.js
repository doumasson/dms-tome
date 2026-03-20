// src/engine/DayNightFilter.js
const TINTS = {
  dawn:  { r: 1.0, g: 0.85, b: 0.7,  brightness: 0.85 },
  day:   { r: 1.0, g: 1.0,  b: 1.0,  brightness: 1.0  },
  dusk:  { r: 1.0, g: 0.75, b: 0.55, brightness: 0.75 },
  night: { r: 0.35, g: 0.45, b: 0.7, brightness: 0.4  },
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
