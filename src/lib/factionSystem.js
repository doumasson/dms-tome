/**
 * Faction system for D&D campaign.
 * Tracks player reputation with various factions and adjusts NPC interaction based on reputation.
 */

/**
 * Create a new faction object.
 * @param {string} name - Faction name
 * @param {string} description - Short description
 * @param {string} alignment - Faction moral alignment (Lawful Good, Neutral Evil, etc.)
 * @returns {object} faction
 */
export function createFaction(name, description = '', alignment = 'Neutral') {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    description,
    alignment,
    createdAt: Date.now(),
  }
}

/**
 * Initialize faction reputation for a character.
 * Reputation ranges from -100 (hostile) to +100 (revered).
 * 0 = neutral, unknown.
 * @param {object[]} factions - Array of faction objects
 * @returns {object} reputation map { factionId: reputationValue }
 */
export function initializeFactionReputation(factions = []) {
  const reputation = {}
  factions.forEach(f => {
    reputation[f.id] = 0
  })
  return reputation
}

/**
 * Get NPC disposition toward player based on faction reputation.
 * @param {number} reputation - Reputation value (-100 to +100)
 * @returns {string} disposition (Hostile, Unfriendly, Neutral, Friendly, Revered)
 */
export function getDisposition(reputation) {
  if (reputation <= -75) return 'Hostile'
  if (reputation <= -25) return 'Unfriendly'
  if (reputation <= 25) return 'Neutral'
  if (reputation <= 75) return 'Friendly'
  return 'Revered'
}

/**
 * Adjust faction reputation for the player (global).
 * Clamped to [-100, 100]. When multiple NPCs of same faction
 * are in a party, reputation changes apply globally.
 * @param {object} reputationMap - Current reputation map
 * @param {string} factionId - Faction to adjust
 * @param {number} delta - Amount to change (-50 to +50 typical)
 * @returns {object} updated reputation map
 */
export function adjustReputation(reputationMap, factionId, delta) {
  const current = reputationMap[factionId] ?? 0
  const clamped = Math.max(-100, Math.min(100, current + delta))
  return { ...reputationMap, [factionId]: clamped }
}

/**
 * Get NPC dialogue modifier based on player faction reputation.
 * Affects how NPCs of that faction greet, respond to requests, prices, etc.
 * @param {number} reputation - Reputation value
 * @returns {object} dialogue context { disposition, modifier, greeting }
 */
export function getDialogueContext(reputation) {
  const disposition = getDisposition(reputation)
  let modifier = ''
  let greeting = ''

  if (reputation <= -75) {
    modifier = 'Hostile. Refuses service. May attack.'
    greeting = 'Get out of here!'
  } else if (reputation <= -25) {
    modifier = 'Unfriendly. Reluctant to help. Higher prices.'
    greeting = 'What do you want?'
  } else if (reputation <= 25) {
    modifier = 'Neutral. Standard service. Normal prices.'
    greeting = 'How can I help you?'
  } else if (reputation <= 75) {
    modifier = 'Friendly. Eager to help. Discounted prices (10% off).'
    greeting = 'Welcome, friend!'
  } else {
    modifier = 'Revered. Will go out of their way. Discounted prices (25% off). May grant favors.'
    greeting = "It's an honor to meet you!"
  }

  return { disposition, modifier, greeting }
}

/**
 * Check if an NPC will interact with the player based on faction reputation.
 * Very hostile NPCs (reputation < -75) may refuse to talk or warn of guards.
 * @param {number} reputation - Reputation value
 * @returns {boolean} true if NPC will engage in dialogue
 */
export function willNpcInteract(reputation) {
  // Even at -100, NPC *can* talk (to attack or warn, not to help)
  // Dialogue system handles whether they'll help or harm
  return true
}

/**
 * Apply reputation context to an NPC dialogue prompt.
 * This function returns a system prompt injection for Claude to use
 * when roleplaying the NPC.
 * @param {string} npcName - NPC name
 * @param {string} factionName - Faction name
 * @param {number} reputation - Player reputation with faction
 * @returns {string} dialogue prompt injection
 */
export function buildFactionContext(npcName, factionName, reputation) {
  const { disposition, modifier, greeting } = getDialogueContext(reputation)
  return `
The NPC (${npcName}) belongs to the faction: "${factionName}".
Player's reputation with ${factionName}: ${disposition} (${reputation}/100)
${modifier}

When the player approaches, the NPC's greeting should reflect this reputation:
- Start with: "${greeting}"
- Adjust your tone and willingness to help based on the disposition above.
- Offer discounts if Friendly or higher.
- Refuse service or be hostile if Unfriendly or lower.
- At Revered reputation, the NPC might offer special favors or information.
`
}

/**
 * Determine quest reward adjustment based on faction affiliation.
 * Friendly factions offer better rewards; hostile factions offer no rewards or retaliation.
 * @param {number} reputation - Reputation value
 * @param {number} baseReward - Base gold/XP reward
 * @returns {object} { goldMultiplier, xpMultiplier, additionalText }
 */
export function getQuestRewardModifier(reputation) {
  if (reputation <= -75) {
    return { goldMultiplier: 0, xpMultiplier: 0.5, additionalText: '(Faction refuses full payment)' }
  } else if (reputation <= -25) {
    return { goldMultiplier: 0.75, xpMultiplier: 0.75, additionalText: '(Faction pays reluctantly)' }
  } else if (reputation <= 25) {
    return { goldMultiplier: 1, xpMultiplier: 1, additionalText: '' }
  } else if (reputation <= 75) {
    return { goldMultiplier: 1.25, xpMultiplier: 1.1, additionalText: '(Faction bonus!)' }
  } else {
    return { goldMultiplier: 1.5, xpMultiplier: 1.25, additionalText: '(Revered faction bonus!)' }
  }
}
