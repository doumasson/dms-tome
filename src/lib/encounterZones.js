/**
 * Check if playerPos is within any untriggered encounter zone.
 * @param {{ x: number, y: number }} playerPos
 * @param {Array<{ id, center: {x,y}, triggerRadius, triggered, storyFlag? }>} zones
 * @param {Set} storyFlags — story flags the party has unlocked
 * @returns {object|null} The triggered zone, or null
 */
export function checkEncounterProximity(playerPos, zones, storyFlags = new Set()) {
  for (const zone of zones) {
    if (zone.triggered) continue
    if (zone.storyFlag && !storyFlags.has(zone.storyFlag)) continue
    // Guard: skip zones with no valid center
    if (!zone.center || zone.center.x == null || zone.center.y == null) continue
    const dx = playerPos.x - zone.center.x
    const dy = playerPos.y - zone.center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Default triggerRadius to 5 tiles if not set (standard encounter range)
    const radius = zone.triggerRadius ?? 5
    if (dist <= radius) return zone
  }
  return null
}

/**
 * Build the DM prompt for an encounter zone trigger.
 */
export function buildEncounterPrompt(zone, partyDescription) {
  return `ENCOUNTER ZONE TRIGGERED: ${zone.dmPrompt || 'The party approaches a dangerous area.'}

The party is nearby. ${partyDescription}

Decide how to proceed:
- Do the enemies notice the party? Is there an opportunity for stealth or roleplay?
- If combat should begin immediately, set startCombat to true.
- If you want the party to roll a skill check first (e.g., Stealth), use the rollRequest field.
- You may narrate the scene and let the party decide how to approach.`
}
