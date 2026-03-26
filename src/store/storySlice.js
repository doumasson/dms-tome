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

    // NPC dialog viewer — read-only view for non-initiator players
    npcDialogViewer: null, // { npcName, messages: [] }
    openNpcDialogViewer: (npcName) => set({ npcDialogViewer: { npcName, messages: [] } }),
    appendNpcDialogMessage: (npcName, msg) => set(s => {
      if (!s.npcDialogViewer || s.npcDialogViewer.npcName !== npcName) return {}
      return { npcDialogViewer: { ...s.npcDialogViewer, messages: [...s.npcDialogViewer.messages, msg] } }
    }),
    closeNpcDialogViewer: () => set({ npcDialogViewer: null }),

    // Party speaker vote — who controls the narrator chat
    // null = anyone can talk (default). Object = vote in progress or decided.
    partySpeaker: null, // null | { phase: 'voting', votes: {playerId: nomineeId}, timestamp } | { phase: 'decided', speakerId, speakerName }
    startSpeakerVote: () => set({ partySpeaker: { phase: 'voting', votes: {}, timestamp: Date.now() } }),
    castSpeakerVote: (voterId, nomineeId) => set(s => {
      if (!s.partySpeaker || s.partySpeaker.phase !== 'voting') return {}
      const votes = { ...s.partySpeaker.votes, [voterId]: nomineeId }
      return { partySpeaker: { ...s.partySpeaker, votes } }
    }),
    decideSpeaker: (speakerId, speakerName) => set({ partySpeaker: { phase: 'decided', speakerId, speakerName } }),
    clearPartySpeaker: () => set({ partySpeaker: null }),

    activeCutscene: null,
    setActiveCutscene: (info) => set({ activeCutscene: info }),
    clearActiveCutscene: () => set({ activeCutscene: null }),

    // Bestiary — log of encountered monsters
    bestiary: [],
    addToBestiary: (enemy) => set(s => {
      const existing = s.bestiary.find(m => m.name === enemy.name);
      if (existing) {
        return { bestiary: s.bestiary.map(m =>
          m.name === enemy.name ? { ...m, timesEncountered: (m.timesEncountered || 1) + 1 } : m
        )};
      }
      return { bestiary: [...s.bestiary, {
        id: enemy.id || enemy.name,
        name: enemy.name,
        cr: enemy.cr,
        ac: enemy.ac,
        hp: enemy.maxHp || enemy.hp,
        maxHp: enemy.maxHp || enemy.hp,
        speed: enemy.speed,
        stats: enemy.stats,
        attacks: enemy.attacks,
        type: enemy.type === 'enemy' ? (enemy.creatureType || 'Monster') : enemy.type,
        size: enemy.size,
        alignment: enemy.alignment,
        portrait: enemy.portrait,
        resistances: enemy.resistances,
        immunities: enemy.immunities,
        vulnerabilities: enemy.vulnerabilities,
        timesEncountered: 1,
        firstEncountered: Date.now(),
      }]};
    }),

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
