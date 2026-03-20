export function advanceTime(current, hours) {
  const totalHours = current.hour + hours
  const day = current.day + Math.floor(totalHours / 24)
  const hour = ((totalHours % 24) + 24) % 24
  return { hour, day }
}

export function getTimeOfDay(hour) {
  if (hour >= 5 && hour <= 7) return 'dawn'
  if (hour >= 8 && hour <= 17) return 'day'
  if (hour >= 18 && hour <= 19) return 'dusk'
  return 'night'
}

export function formatTime({ hour, day }) {
  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:00 ${ampm}, Day ${day}`
}

export const TIME_COSTS = {
  shortRest: 1, longRest: 8, areaTransition: 1, combat: 0,
}
