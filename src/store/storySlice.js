/**
 * Story progression state — flags, journal, NPC busy locks, quests.
 * Merged into the main Zustand store.
 */
import { completeObjective } from '../lib/questSystem.js'

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
    completeQuestObjective: (questId, objId) => set(s => ({
      quests: s.quests.map(q =>
        q.id === questId ? completeObjective(q, objId) : q
      )
    })),
  }
}
