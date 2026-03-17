import { create } from 'zustand/react';

const useStore = create((set, get) => ({
  // === Auth ===
  user: null,
  setUser: (user) => set({ user }),

  // === Active Campaign (Supabase record) ===
  activeCampaign: null,
  isDM: false,
  setActiveCampaign: (campaign) => {
    const user = get().user;
    const isDM = !!(campaign && user && campaign.dm_user_id === user.id);
    set({ activeCampaign: campaign, isDM, dmMode: isDM });
  },
  clearActiveCampaign: () => set({ activeCampaign: null, isDM: false, dmMode: false }),
  setIsDM: (value) => set({ isDM: value, dmMode: value }),

  // === DM Mode ===
  dmMode: false,
  toggleDmMode: () => set((state) => ({ dmMode: !state.dmMode })),

  // === Combat ===
  combat: {
    combatants: [],
    currentTurn: 0,
    round: 1,
  },
  addCombatant: (combatant) =>
    set((state) => {
      const newCombatant = {
        id: crypto.randomUUID(),
        name: combatant.name,
        initiative: Number(combatant.initiative) || 0,
        maxHp: Number(combatant.maxHp) || 10,
        currentHp: Number(combatant.maxHp) || 10,
        ac: combatant.ac !== '' && combatant.ac !== undefined ? Number(combatant.ac) : null,
        attackBonus: combatant.attackBonus?.trim() || null,
        damage: combatant.damage?.trim() || null,
      };
      const newList = [...state.combat.combatants, newCombatant].sort(
        (a, b) => b.initiative - a.initiative
      );
      return {
        combat: {
          ...state.combat,
          combatants: newList,
          currentTurn: 0,
        },
      };
    }),
  removeCombatant: (id) =>
    set((state) => {
      const newList = state.combat.combatants.filter((c) => c.id !== id);
      const newTurn = Math.min(state.combat.currentTurn, Math.max(0, newList.length - 1));
      return {
        combat: {
          ...state.combat,
          combatants: newList,
          currentTurn: newTurn,
        },
      };
    }),
  adjustHp: (id, delta) =>
    set((state) => ({
      combat: {
        ...state.combat,
        combatants: state.combat.combatants.map((c) =>
          c.id === id
            ? { ...c, currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)) }
            : c
        ),
      },
    })),
  setHp: (id, value) =>
    set((state) => ({
      combat: {
        ...state.combat,
        combatants: state.combat.combatants.map((c) =>
          c.id === id
            ? { ...c, currentHp: Math.max(0, Math.min(c.maxHp, Number(value))) }
            : c
        ),
      },
    })),
  nextTurn: () =>
    set((state) => {
      const { combatants, currentTurn, round } = state.combat;
      if (combatants.length === 0) return state;
      const isLastTurn = currentTurn >= combatants.length - 1;
      return {
        combat: {
          ...state.combat,
          currentTurn: isLastTurn ? 0 : currentTurn + 1,
          round: isLastTurn ? round + 1 : round,
        },
      };
    }),
  prevTurn: () =>
    set((state) => {
      const { combatants, currentTurn, round } = state.combat;
      if (combatants.length === 0) return state;
      const isFirstTurn = currentTurn === 0;
      return {
        combat: {
          ...state.combat,
          currentTurn: isFirstTurn ? combatants.length - 1 : currentTurn - 1,
          round: isFirstTurn && round > 1 ? round - 1 : round,
        },
      };
    }),
  resetCombat: () =>
    set((state) => ({
      combat: {
        combatants: [],
        currentTurn: 0,
        round: 1,
      },
    })),

  // === Campaign ===
  campaign: {
    title: '',
    scenes: [],
    characters: [],
    loaded: false,
    currentSceneIndex: 0,
  },
  loadCampaign: (data) =>
    set({
      campaign: {
        title: data.title || 'Untitled Campaign',
        scenes: data.scenes || [],
        characters: data.characters || [],
        loaded: true,
        currentSceneIndex: 0,
      },
    }),
  unloadCampaign: () =>
    set({
      campaign: {
        title: '',
        scenes: [],
        characters: [],
        loaded: false,
        currentSceneIndex: 0,
      },
    }),
  addCharacter: (char) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: [
          ...state.campaign.characters,
          {
            id: crypto.randomUUID(),
            name: char.name || 'New Character',
            stats: char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            skills: char.skills || [],
            weapons: char.weapons || [],
            maxHp: Number(char.maxHp) || 10,
            currentHp: Number(char.maxHp) || 10,
            spellSlots: char.spellSlots || null,
          },
        ],
      },
    })),
  updateCharacter: (id, updates) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    })),
  deleteCharacter: (id) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.filter((c) => c.id !== id),
      },
    })),
  setCurrentScene: (index) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        currentSceneIndex: index,
      },
    })),

  // === Dice ===
  dice: {
    rollHistory: [],
  },
  addRoll: (rollEntry) =>
    set((state) => ({
      dice: {
        rollHistory: [rollEntry, ...state.dice.rollHistory].slice(0, 10),
      },
    })),
  clearHistory: () =>
    set({
      dice: { rollHistory: [] },
    }),
}));

export default useStore;
