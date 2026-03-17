import { create } from 'zustand/react';
import { supabase } from '../lib/supabase';
import { getClassResources } from '../lib/classResources';

function makePortraitUrl(name, race, cls) {
  const seed = encodeURIComponent(`${name || ''} ${race || ''} ${cls || ''}`.trim());
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
}

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
    notes: { dm: '', shared: '' },
    savedEncounters: [],
  },
  loadCampaign: (data) =>
    set({
      campaign: {
        title: data.title || 'Untitled Campaign',
        scenes: data.scenes || [],
        characters: (data.characters || []).map(c => ({ resourcesUsed: {}, ...c })),
        loaded: true,
        currentSceneIndex: 0,
        notes: { dm: '', shared: '' },
        savedEncounters: [],
      },
    }),
  loadCampaignSettings: (settings) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        notes: settings?.notes || { dm: '', shared: '' },
        savedEncounters: settings?.savedEncounters || [],
      },
    })),
  unloadCampaign: () =>
    set({
      campaign: {
        title: '',
        scenes: [],
        characters: [],
        loaded: false,
        currentSceneIndex: 0,
        notes: { dm: '', shared: '' },
        savedEncounters: [],
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
            race: char.race || '',
            class: char.class || '',
            level: Number(char.level) || 1,
            stats: char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            skills: char.skills || [],
            weapons: char.weapons || [],
            maxHp: Number(char.maxHp) || 10,
            currentHp: Number(char.maxHp) || 10,
            ac: Number(char.ac) || 10,
            spellSlots: char.spellSlots || null,
            resourcesUsed: char.resourcesUsed || {},
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

  // === Encounter (unified scene + combat) ===
  encounter: {
    phase: 'idle',       // 'idle' | 'initiative' | 'combat'
    combatants: [],      // See startEncounter for shape
    currentTurn: 0,
    round: 1,
    log: [],
  },

  startEncounter: (enemies, partyMembers) => {
    const combatants = [];

    // Expand enemy groups by count
    enemies?.forEach((group, gi) => {
      const count = group.count || 1;
      for (let i = 0; i < count; i++) {
        const label = count > 1 ? `${group.name} ${i + 1}` : group.name;
        combatants.push({
          id: crypto.randomUUID(),
          name: label,
          type: 'enemy',
          initiative: null,
          maxHp: Number(group.hp) || 10,
          currentHp: Number(group.hp) || 10,
          ac: Number(group.ac) || 10,
          speed: Number(group.speed) || 30,
          stats: group.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          attacks: group.attacks || [],
          conditions: [],
          concentration: null,
          position: null,
          deathSaves: { successes: 0, failures: 0, stable: false },
        });
      }
    });

    // Add party members from campaign characters
    partyMembers?.forEach((char) => {
      combatants.push({
        id: char.id || crypto.randomUUID(),
        name: char.name,
        type: 'player',
        initiative: null,
        maxHp: char.maxHp || 10,
        currentHp: char.currentHp ?? char.maxHp ?? 10,
        ac: char.ac || 10,
        speed: char.speed || 30,
        stats: char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        attacks: (char.weapons || []).map(w =>
          typeof w === 'string'
            ? { name: w, bonus: '+0', damage: '1d6' }
            : { name: w.name || w, bonus: w.attackBonus || '+0', damage: w.damage || '1d6' }
        ),
        conditions: [],
        concentration: null,
        position: null,
        deathSaves: { successes: 0, failures: 0, stable: false },
        portrait: makePortraitUrl(char.name, char.race, char.class),
      });
    });

    set({
      encounter: {
        phase: 'initiative',
        combatants,
        currentTurn: 0,
        round: 1,
        log: ['Encounter started — roll initiative for all combatants.'],
      },
    });
  },

  setEncounterInitiative: (id, value) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, initiative: value === '' ? null : Number(value) } : c
        ),
      },
    })),

  beginCombat: () =>
    set((state) => {
      const sorted = [...state.encounter.combatants].sort(
        (a, b) => (b.initiative || 0) - (a.initiative || 0)
      );

      // Auto-place: players left side (x 0-2), enemies right side (x 7-9)
      const players = sorted.filter((c) => c.type !== 'enemy');
      const enemies = sorted.filter((c) => c.type === 'enemy');

      const place = (list, startX) =>
        list.map((c, i) => ({
          ...c,
          position: {
            x: Math.min(startX + (i % 3), 9),
            y: Math.min(Math.floor(i / 3) * 2, 7),
          },
        }));

      const placed = [
        ...place(players, 0),
        ...place(enemies, 7),
      ].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

      return {
        encounter: {
          ...state.encounter,
          phase: 'combat',
          combatants: placed,
          currentTurn: 0,
          round: 1,
          log: ['⚔ Combat begins! Round 1.'],
        },
      };
    }),

  nextEncounterTurn: () =>
    set((state) => {
      const { combatants, currentTurn, round } = state.encounter;
      if (combatants.length === 0) return state;
      const isLast = currentTurn >= combatants.length - 1;
      const nextRound = isLast ? round + 1 : round;
      const log = isLast
        ? [`Round ${nextRound} begins.`, ...state.encounter.log]
        : state.encounter.log;
      return {
        encounter: {
          ...state.encounter,
          currentTurn: isLast ? 0 : currentTurn + 1,
          round: nextRound,
          log: log.slice(0, 30),
        },
      };
    }),

  applyEncounterDamage: (targetId, amount) =>
    set((state) => {
      const target = state.encounter.combatants.find(c => c.id === targetId);
      const extraLog = [];

      // Concentration Con save (PHB: DC = max(10, half damage taken))
      if (target && target.concentration && target.currentHp > 0 && amount > 0) {
        const dc = Math.max(10, Math.floor(amount / 2));
        const roll = Math.floor(Math.random() * 20) + 1;
        const conMod = Math.floor(((target.stats?.con || 10) - 10) / 2);
        const total = roll + conMod;
        const pass = total >= dc;
        extraLog.push(
          `🎯 ${target.name} concentration (${target.concentration}) DC ${dc}: ` +
          `d20(${roll})${conMod >= 0 ? '+' : ''}${conMod}=${total} — ${pass ? '✓ Maintained' : '✗ BROKEN'}`
        );
      }

      const newCombatants = state.encounter.combatants.map((c) => {
        if (c.id !== targetId) return c;
        const newHp = Math.max(0, c.currentHp - amount);
        // Massive damage (damage >= maxHp while at 0) = instant death
        if (c.currentHp === 0 && amount >= c.maxHp) {
          return { ...c, currentHp: 0, deathSaves: { successes: 0, failures: 3, stable: false } };
        }
        // Dropping to 0: enter dying state
        if (newHp === 0 && c.currentHp > 0 && c.type === 'player') {
          return { ...c, currentHp: 0, concentration: null, deathSaves: { successes: 0, failures: 0, stable: false } };
        }
        // Hit while already dying: add failure
        if (c.currentHp === 0 && c.type === 'player' && !c.deathSaves?.stable) {
          return { ...c, deathSaves: { ...c.deathSaves, failures: Math.min(3, (c.deathSaves?.failures || 0) + 1) } };
        }
        return { ...c, currentHp: newHp };
      });

      return {
        encounter: {
          ...state.encounter,
          combatants: newCombatants,
          log: extraLog.length
            ? [...extraLog, ...state.encounter.log].slice(0, 30)
            : state.encounter.log,
        },
      };
    }),

  applyEncounterHeal: (targetId, amount) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) => {
          if (c.id !== targetId) return c;
          const newHp = Math.min(c.maxHp, c.currentHp + amount);
          // Healing resets death saves
          return { ...c, currentHp: newHp, deathSaves: { successes: 0, failures: 0, stable: false } };
        }),
      },
    })),

  // Roll a death saving throw for a dying player (d20, no modifiers per RAW)
  rollDeathSave: (id) =>
    set((state) => {
      const c = state.encounter.combatants.find(x => x.id === id);
      if (!c || c.currentHp > 0 || c.deathSaves?.stable) return state;
      const roll = Math.floor(Math.random() * 20) + 1;
      let { successes, failures } = c.deathSaves;
      let newHp = 0;
      let stable = false;
      let logMsg = '';
      if (roll === 20) {
        // Natural 20: regain 1 HP
        newHp = 1;
        successes = 0; failures = 0; stable = false;
        logMsg = `${c.name} rolled a natural 20 on death save — revived with 1 HP!`;
      } else if (roll === 1) {
        // Natural 1: two failures
        failures = Math.min(3, failures + 2);
        logMsg = `${c.name} rolled a 1 on death save — 2 failures! (${failures}/3)`;
      } else if (roll >= 10) {
        successes = Math.min(3, successes + 1);
        if (successes >= 3) { stable = true; logMsg = `${c.name} stabilizes! (3 successes)`; }
        else logMsg = `${c.name} death save: ${roll} — success (${successes}/3)`;
      } else {
        failures = Math.min(3, failures + 1);
        logMsg = `${c.name} death save: ${roll} — failure (${failures}/3)`;
      }
      const isDead = failures >= 3;
      return {
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(x =>
            x.id === id
              ? { ...x, currentHp: newHp, deathSaves: { successes, failures, stable } }
              : x
          ),
          log: [logMsg, ...state.encounter.log].slice(0, 30),
        },
      };
    }),

  stabilizeCombatant: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, deathSaves: { ...c.deathSaves, stable: true } } : c
        ),
        log: [
          `${state.encounter.combatants.find(x => x.id === id)?.name} was stabilized.`,
          ...state.encounter.log,
        ].slice(0, 30),
      },
    })),

  addEncounterLog: (entry) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        log: [entry, ...state.encounter.log].slice(0, 30),
      },
    })),

  addEncounterCondition: (id, condition) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id && !c.conditions.includes(condition)
            ? { ...c, conditions: [...c.conditions, condition] }
            : c
        ),
      },
    })),

  removeEncounterCondition: (id, condition) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id
            ? { ...c, conditions: c.conditions.filter((x) => x !== condition) }
            : c
        ),
      },
    })),

  moveToken: (id, x, y) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, position: { x, y } } : c
        ),
      },
    })),

  endEncounter: () =>
    set({
      encounter: {
        phase: 'idle',
        combatants: [],
        currentTurn: 0,
        round: 1,
        log: [],
      },
    }),

  setConcentration: (id, spell) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, concentration: spell || null } : c
        ),
        log: [`🎯 ${state.encounter.combatants.find(x => x.id === id)?.name} concentrates on ${spell}.`, ...state.encounter.log].slice(0, 30),
      },
    })),

  clearConcentration: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, concentration: null } : c
        ),
        log: [`🎯 ${state.encounter.combatants.find(x => x.id === id)?.name} dropped concentration.`, ...state.encounter.log].slice(0, 30),
      },
    })),

  // Received from Supabase Realtime — non-DM clients sync encounter state
  syncEncounterDown: (encounterData) =>
    set({ encounter: encounterData }),

  // === Class Resources ===
  spendResource: (charId, resourceName) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          if (c.id !== charId) return c;
          const defs = getClassResources(c.class, c.level, c.stats);
          const def = defs.find(r => r.name === resourceName);
          if (!def) return c;
          const used = c.resourcesUsed?.[resourceName] ?? 0;
          if (used >= def.max) return c;
          return { ...c, resourcesUsed: { ...c.resourcesUsed, [resourceName]: used + 1 } };
        }),
      },
    })),

  gainResource: (charId, resourceName, amount = 1) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          if (c.id !== charId) return c;
          const used = Math.max(0, (c.resourcesUsed?.[resourceName] ?? 0) - amount);
          return { ...c, resourcesUsed: { ...c.resourcesUsed, [resourceName]: used } };
        }),
      },
    })),

  shortRest: () => {
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          const defs = getClassResources(c.class, c.level, c.stats);
          const restored = { ...c.resourcesUsed };
          defs.filter(r => r.resetOn === 'short').forEach(r => { restored[r.name] = 0; });
          return { ...c, resourcesUsed: restored };
        }),
      },
      encounter: {
        ...get().encounter,
        log: ['🌙 Short rest taken — short-rest resources restored.', ...get().encounter.log].slice(0, 30),
      },
    }));
    get().saveCampaignToSupabase();
  },

  longRest: () => {
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          // Reset spell slot used counts to 0
          const spellSlots = c.spellSlots
            ? Object.fromEntries(
                Object.entries(c.spellSlots).map(([lvl, s]) => [lvl, { ...s, used: 0 }])
              )
            : c.spellSlots;
          return { ...c, currentHp: c.maxHp, resourcesUsed: {}, spellSlots };
        }),
      },
      encounter: {
        ...get().encounter,
        log: ['☀️ Long rest taken — all resources and HP restored.', ...get().encounter.log].slice(0, 30),
      },
    }));
    get().saveCampaignToSupabase();
    get().saveSettingsToSupabase();
  },

  castSpell: (charId, slotLevel) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          if (c.id !== charId) return c;
          const slots = { ...(c.spellSlots || {}) };
          const lvl = slots[slotLevel];
          if (!lvl || lvl.used >= lvl.total) return c;
          slots[slotLevel] = { ...lvl, used: lvl.used + 1 };
          return { ...c, spellSlots: slots };
        }),
      },
    })),

  recoverSpellSlot: (charId, slotLevel) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map((c) => {
          if (c.id !== charId) return c;
          const slots = { ...(c.spellSlots || {}) };
          const lvl = slots[slotLevel];
          if (!lvl || lvl.used <= 0) return c;
          slots[slotLevel] = { ...lvl, used: lvl.used - 1 };
          return { ...c, spellSlots: slots };
        }),
      },
    })),

  // === Notes ===
  setNote: (type, value) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        notes: { ...state.campaign.notes, [type]: value },
      },
    })),

  // === Saved Encounters ===
  saveEncounterGroup: (name, enemies) =>
    set((state) => {
      const entry = { id: crypto.randomUUID(), name, enemies, savedAt: Date.now() };
      const savedEncounters = [entry, ...state.campaign.savedEncounters].slice(0, 20);
      get().saveSettingsToSupabase({ ...state.campaign, savedEncounters });
      return { campaign: { ...state.campaign, savedEncounters } };
    }),
  deleteEncounterGroup: (id) =>
    set((state) => {
      const savedEncounters = state.campaign.savedEncounters.filter(e => e.id !== id);
      get().saveSettingsToSupabase({ ...state.campaign, savedEncounters });
      return { campaign: { ...state.campaign, savedEncounters } };
    }),

  // === XP ===
  awardXp: (amount) =>
    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map(c => ({
          ...c,
          xp: (c.xp || 0) + Math.floor(amount / Math.max(1, state.campaign.characters.length)),
        })),
      },
    })),

  saveSettingsToSupabase: async (campaignState) => {
    const { activeCampaign } = get();
    if (!activeCampaign?.id) return;
    const c = campaignState || get().campaign;
    await supabase
      .from('campaigns')
      .update({ settings: { notes: c.notes, savedEncounters: c.savedEncounters } })
      .eq('id', activeCampaign.id);
  },

  saveCampaignToSupabase: async () => {
    const { activeCampaign, campaign } = get();
    if (!activeCampaign?.id) return;
    const merged = {
      ...(activeCampaign.campaign_data || {}),
      characters: campaign.characters,
    };
    await supabase
      .from('campaigns')
      .update({ campaign_data: merged })
      .eq('id', activeCampaign.id);
  },

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

  // === Narrator (AI DM) ===
  narrator: {
    history: [], // { id, role: 'player'|'dm', speaker, text, rollRequest, timestamp }
    open: false,
  },
  addNarratorMessage: (msg) =>
    set((state) => ({
      narrator: {
        ...state.narrator,
        history: [
          ...state.narrator.history,
          { id: crypto.randomUUID(), timestamp: Date.now(), ...msg },
        ].slice(-50),
      },
    })),
  setNarratorOpen: (open) =>
    set((state) => ({ narrator: { ...state.narrator, open } })),
  clearNarratorHistory: () =>
    set((state) => ({ narrator: { ...state.narrator, history: [] } })),
}));

export default useStore;
