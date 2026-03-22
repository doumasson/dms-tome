export function advanceTime(current, hours) {
  const totalHours = current.hour + hours
  const day = current.day + Math.floor(totalHours / 24)
  // Round to avoid floating point accumulation (e.g., 4.049999...)
  const hour = Math.round(((totalHours % 24) + 24) % 24 * 100) / 100
  return { hour, day }
}

export function getTimeOfDay(hour) {
  const h = Math.floor(hour)
  if (h >= 5 && h <= 7) return 'dawn'
  if (h >= 8 && h <= 17) return 'day'
  if (h >= 18 && h <= 19) return 'dusk'
  return 'night'
}

export function formatTime({ hour, day }) {
  const h = Math.floor(hour) % 12 || 12
  const mins = Math.round((hour % 1) * 60)
  const ampm = Math.floor(hour) < 12 ? 'AM' : 'PM'
  return `${h}:${String(mins).padStart(2, '0')} ${ampm}, Day ${day}`
}

export const TIME_COSTS = {
  shortRest: 1, longRest: 8, areaTransition: 1, combat: 0,
}
