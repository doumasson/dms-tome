/**
 * Story progression state — flags, journal, NPC busy locks, quests.
 * Merged into the main Zustand store.
 */
import { completeObjective, maybeCompleteQuest } from '../lib/questSystem.js'

export function createStorySlice(set, get) {
  return {
    storyFlags: new Set(),
    addStoryFlag: (flag) => {
      const flags = new Set(get().storyFlags)
      if (flags.has(flag)) return
      flags.add(flag)
      set({ storyFlags: flags })
    },
    hasStoryFlag: (flag) => get().storyFlags.has(flag),
    loadStoryFlags: (flagsArray) => set({ storyFlags: new Set(flagsArray) }),

    journal: [],
    addJournalEntry: (entry) => set(s => ({
      journal: [...s.journal, { ...entry, timestamp: Date.now() }]
    })),
    loadJournal: (entries) => set({ journal: entries || [] }),

    npcBusy: null,
    setNpcBusy: (info) => set({ npcBusy: info }),
    clearNpcBusy: () => set({ npcBusy: null }),

    activeCutscene: null,
    setActiveCutscene: (info) => set({ activeCutscene: info }),
    clearActiveCutscene: () => set({ activeCutscene: null }),

    quests: [],
    addQuest: (quest) => set(s => ({ quests: [...s.quests, quest] })),
    updateQuest: (questId, updates) => set(s => ({
      quests: s.quests.map(q => q.id === questId ? { ...q, ...updates } : q)
    })),
    completeQuestObjective: (questId, objId) => set(s => {
      const updatedQuests = s.quests.map(q => {
        if (q.id !== questId) return q
        const withObjComplete = completeObjective(q, objId)
        const withQuestComplete = maybeCompleteQuest(withObjComplete)

        // If quest just completed and has a faction, increase reputation
        if (withQuestComplete.status === 'completed' && q.status !== 'completed' && withQuestComplete.faction) {
          const repIncrement = 20 // Default quest completion reward
          if (s.adjustFactionReputation) {
            s.adjustFactionReputation(withQuestComplete.faction, repIncrement)
          }
        }

        return withQuestComplete
      })
      return { quests: updatedQuests }
    }),
  }
}
