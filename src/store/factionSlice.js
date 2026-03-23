/**
 * Zustand slice for faction and reputation management.
 */
import { initializeFactionReputation, adjustReputation as adjustRep } from '../lib/factionSystem.js'

export function createFactionSlice(set, get) {
  return {
  factions: [], // Array of faction objects: { id, name, description, alignment }
  factionReputation: {}, // Map: { factionId: reputationValue (-100 to +100) }

  /**
   * Initialize factions for a campaign
   * @param {object[]} factions - Campaign factions
   */
  initializeFactions: (factions) => set((s) => ({
    factions: factions || [],
    factionReputation: initializeFactionReputation(factions || []),
  })),

  /**
   * Adjust player's reputation with a faction
   * @param {string} factionId - Faction ID
   * @param {number} delta - Amount to change (-50 to +50 typical)
   */
  adjustFactionReputation: (factionId, delta) => set((s) => ({
    factionReputation: adjustRep(s.factionReputation, factionId, delta),
  })),

  /**
   * Set reputation for a faction (useful for loading campaign state)
   * @param {string} factionId - Faction ID
   * @param {number} value - Reputation value (-100 to +100)
   */
  setFactionReputation: (factionId, value) => set((s) => ({
    factionReputation: {
      ...s.factionReputation,
      [factionId]: Math.max(-100, Math.min(100, value)),
    },
  })),

  /**
   * Get current reputation with a faction
   * @param {string} factionId - Faction ID
   * @returns {number} reputation value
   */
  getFactionReputation: (factionId) => {
    const state = get()
    return state.factionReputation[factionId] ?? 0
  },

  /**
   * Get faction by ID
   * @param {string} factionId - Faction ID
   * @returns {object|null} faction object
   */
  getFaction: (factionId) => {
    const state = get()
    return state.factions.find(f => f.id === factionId) || null
  },

  /**
   * Reset faction reputation (for testing or full campaign reset)
   */
  resetFactionReputation: () => set((s) => ({
    factionReputation: initializeFactionReputation(s.factions),
  })),
  }
}
