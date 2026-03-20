// NPC Scheduler — time-based position resolution for living-world NPCs.
//
// Time-of-day ordering used for fallback resolution (nearest earlier slot).
const TIME_ORDER = ['dawn', 'day', 'dusk', 'night']

/**
 * Resolve which schedule entry applies for a given time of day.
 * Returns the exact match if found; otherwise the entry whose time comes
 * nearest before the requested time in the canonical day cycle.
 *
 * @param {Array<{time: string, position: string}>} schedule
 * @param {string} timeOfDay — one of: 'dawn', 'day', 'dusk', 'night'
 * @returns {{time: string, position: string} | undefined}
 */
export function resolveSchedulePosition(schedule, timeOfDay) {
  if (!schedule || schedule.length === 0) return undefined

  // Exact match first.
  const exact = schedule.find(entry => entry.time === timeOfDay)
  if (exact) return exact

  // Find the entry whose time is the nearest earlier slot in the day cycle.
  const requestedIndex = TIME_ORDER.indexOf(timeOfDay)

  // Walk backwards through TIME_ORDER from the requested time, wrapping if needed.
  for (let offset = 1; offset < TIME_ORDER.length; offset++) {
    const idx = (requestedIndex - offset + TIME_ORDER.length) % TIME_ORDER.length
    const candidate = TIME_ORDER[idx]
    const match = schedule.find(entry => entry.time === candidate)
    if (match) return match
  }

  return undefined
}

/**
 * Determine which NPCs need to move given the current time of day.
 * Returns one movement descriptor per NPC that is not already at its target.
 *
 * @param {Array<{name: string, schedule: Array, position: {x:number, y:number}}>} npcs
 * @param {string} timeOfDay
 * @param {Record<string, {x:number, y:number}>} poiPositions — map of position-key → world coords
 * @returns {Array<{npc: object, targetPosition: {x:number, y:number}, activity: string}>}
 */
export function getNpcMovements(npcs, timeOfDay, poiPositions) {
  const movements = []

  for (const npc of npcs) {
    const entry = resolveSchedulePosition(npc.schedule, timeOfDay)
    if (!entry) continue

    const target = poiPositions[entry.position]
    if (!target) continue

    // Skip if the NPC is already at the target position.
    if (npc.position && npc.position.x === target.x && npc.position.y === target.y) continue

    movements.push({
      npc,
      targetPosition: target,
      activity: entry.position,
    })
  }

  return movements
}
