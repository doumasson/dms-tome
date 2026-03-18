import { create } from 'zustand/react';
import { supabase } from '../lib/supabase';
import { getClassResources } from '../lib/classResources';
import { triggerEnemyTurn } from '../lib/enemyAi';
import { broadcastNarratorMessage, broadcastEncounterAction } from '../lib/liveChannel';
import { computeAcFromEquipped } from '../data/equipment';
import { CLASSES } from '../data/classes';

// Generate a deterministic Pollinations portrait URL for a character.
// Same name/race/class always produces the same portrait.
// Falls back to initials-based seed so even partial data gives a unique image.
function makePortraitUrl(name, race, cls) {
  const n = (name || 'adventurer').trim().toLowerCase();
  const r = (race || 'human').toLowerCase();
  const c = (cls  || 'fighter').toLowerCase();
  // Numeric seed from character name for determinism
  const seed = [...n].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 99999;
  const prompt = encodeURIComponent(
    `portrait of a ${r} ${c} named ${n}, fantasy D&D 5e character art, dramatic lighting, ` +
    `detailed face, dark background, heroic, no text, no border`
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=256&height=256&nologo=true&model=flux-schnell&seed=${seed}`;
}

const useStore = create((set, get) => ({
  // === Auth ===
  user: null,
  setUser: (user) => set({ user }),

  // === Player-owned Characters (portable across campaigns) ===
  myCharacters: [],   // All characters owned by this user (from `characters` Supabase table)
  loadMyCharacters: async () => {
    const user = get().user;
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!error && data) {
        set({ myCharacters: data.map(row => ({ ...row.character_data, _characterId: row.id, _updatedAt: row.updated_at })) });
      }
    } catch { /* table may not exist yet — fail silently */ }
  },
  saveCharacterToProfile: async (character) => {
    const user = get().user;
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('characters')
        .upsert({
          owner_user_id: user.id,
          name: character.name,
          class: character.class || '',
          race: character.race || '',
          background: character.background || '',
          appearance: character.appearance || '',
          backstory: character.backstory || '',
          portrait_url: character.portrait || '',
          character_data: character,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_user_id,name' })
        .select()
        .single();
      if (!error && data) {
        // Refresh local list
        get().loadMyCharacters();
        return data.id;
      }
    } catch { /* fail silently if table doesn't exist */ }
    return null;
  },

  // === Active Campaign (Supabase record) ===
  activeCampaign: null,
  isDM: false,
  myCharacter: null,   // This user's character in the active campaign (from campaign_members)
  setMyCharacter: (char) => set({ myCharacter: char }),
  partyMembers: [],    // All real players' characters (from campaign_members.character_data)
  setPartyMembers: (members) => set({ partyMembers: members }),
  setActiveCampaign: (campaign) => {
    const user = get().user;
    const isDM = !!(campaign && user && campaign.dm_user_id === user.id);
    set({ activeCampaign: campaign, isDM, dmMode: isDM });
  },
  clearActiveCampaign: () => set({ activeCampaign: null, isDM: false, dmMode: false, myCharacter: null, partyMembers: [] }),
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
    set((state) => {
      // Restore pre-generated scene image URLs if available
      const sceneImageUpdates = {};
      const campaignId = state.activeCampaign?.id;
      if (settings?.sceneImageUrls && campaignId) {
        Object.entries(settings.sceneImageUrls).forEach(([idx, url]) => {
          sceneImageUpdates[`${campaignId}:${idx}`] = url;
        });
      }
      return {
        campaign: {
          ...state.campaign,
          notes: settings?.notes || { dm: '', shared: '' },
          savedEncounters: settings?.savedEncounters || [],
        },
        sceneImages: { ...state.sceneImages, ...sceneImageUpdates },
        sceneTokenPositions: settings?.sceneTokenPositions || state.sceneTokenPositions,
      };
    }),
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
    activeEffects: [],   // Persistent spell area overlays: [{ id, spellName, casterId, concentration, areaType, ...geometry }]
  },

  startEncounter: (enemies, partyMembers, autoRollInitiative = false) => {
    const combatants = [];

    // Expand enemy groups by count
    enemies?.forEach((group, gi) => {
      const count = group.count || 1;
      const spd = Number(group.speed) || 30;
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
          speed: spd,
          remainingMove: Math.floor(spd / 5),
          actionsUsed: 0,
          bonusActionsUsed: 0,
          stats: group.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          attacks: group.attacks || [],
          spells: group.spells || [],
          conditions: [],
          concentration: null,
          position: null,
          deathSaves: { successes: 0, failures: 0, stable: false },
        });
      }
    });

    // Add party members from campaign characters
    partyMembers?.forEach((char) => {
      const spd = char.speed || 30;
      combatants.push({
        id: char.id || crypto.randomUUID(),
        name: char.name,
        type: 'player',
        class: char.class || '',
        level: char.level || 1,
        initiative: null,
        maxHp: char.maxHp || 10,
        currentHp: char.currentHp ?? char.maxHp ?? 10,
        ac: char.ac || 10,
        speed: spd,
        remainingMove: Math.floor(spd / 5),
        actionsUsed: 0,
        bonusActionsUsed: 0,
        stats: char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        attacks: (char.weapons || char.attacks || []).map(w =>
          typeof w === 'string'
            ? { name: w, bonus: '+0', damage: '1d6' }
            : { name: w.name || w, bonus: w.attackBonus || w.bonus || '+0', damage: w.damage || '1d6' }
        ),
        spells: char.spells || [],
        spellSlots: char.spellSlots || null,
        resourcesUsed: char.resourcesUsed || {},
        conditions: [],
        concentration: null,
        position: null,
        deathSaves: { successes: 0, failures: 0, stable: false },
        portrait: makePortraitUrl(char.name, char.race, char.class),
      });
    });

    if (autoRollInitiative) {
      // Auto-roll initiative: d20 + DEX modifier for each combatant
      combatants.forEach(c => {
        const dexMod = Math.floor(((c.stats?.dex || 10) - 10) / 2);
        c.initiative = Math.floor(Math.random() * 20) + 1 + dexMod;
      });
      // Sort descending and start combat immediately
      const sorted = [...combatants].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
      const initLog = sorted.map(c => `${c.name}: ${c.initiative}`).join(', ');

      // Auto-place: players left side (x 0-2), enemies right side (x 7-9)
      const players = sorted.filter(c => c.type !== 'enemy');
      const enemies = sorted.filter(c => c.type === 'enemy');
      const place = (list, startX) =>
        list.map((c, i) => ({
          ...c,
          position: { x: Math.min(startX + (i % 3), 9), y: Math.min(Math.floor(i / 3) * 2, 7) },
          remainingMove: Math.floor((c.speed || 30) / 5),
        }));
      const placed = [...place(players, 0), ...place(enemies, 7)]
        .sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

      set({
        encounter: {
          phase: 'combat',
          combatants: placed,
          currentTurn: 0,
          round: 1,
          log: [`Initiative rolled — ${initLog}`],
        },
      });
    } else {
      set({
        encounter: {
          phase: 'initiative',
          combatants,
          currentTurn: 0,
          round: 1,
          log: ['Encounter started — roll initiative for all combatants.'],
        },
      });
    }
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
      ]
        .sort((a, b) => (b.initiative || 0) - (a.initiative || 0))
        .map(c => ({ ...c, remainingMove: Math.floor((c.speed || 30) / 5), actionsUsed: 0, bonusActionsUsed: 0 }));

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
      const nextTurn = isLast ? 0 : currentTurn + 1;
      const nextRound = isLast ? round + 1 : round;
      const log = isLast
        ? [`Round ${nextRound} begins.`, ...state.encounter.log]
        : state.encounter.log;
      // Reset movement + action economy for the next combatant
      const updated = combatants.map((c, i) =>
        i === nextTurn ? {
          ...c,
          remainingMove: Math.floor((c.speed || 30) / 5),
          actionsUsed: 0,
          bonusActionsUsed: 0,
        } : c
      );
      return {
        encounter: {
          ...state.encounter,
          combatants: updated,
          currentTurn: nextTurn,
          round: nextRound,
          log: log.slice(0, 30),
        },
      };
    }),

  applyEncounterDamage: (targetId, amount) => {
    let concentrationBroke = false;
    set((state) => {
      const target = state.encounter.combatants.find(c => c.id === targetId);
      const extraLog = [];

      // Concentration CON save — DC = max(10, half damage taken) per PHB
      if (target && target.concentration && target.currentHp > 0 && amount > 0) {
        const dc = Math.max(10, Math.floor(amount / 2));
        const roll = Math.floor(Math.random() * 20) + 1;
        const conMod = Math.floor(((target.stats?.con || 10) - 10) / 2);
        const total = roll + conMod;
        const pass = total >= dc;
        if (!pass) concentrationBroke = true;
        extraLog.push(
          `🎯 ${target.name} concentration (${target.concentration}) DC ${dc}: ` +
          `d20(${roll})${conMod >= 0 ? '+' : ''}${conMod}=${total} — ${pass ? '✓ Maintained' : '✗ BROKEN — spell ends'}`
        );
      }

      const newCombatants = state.encounter.combatants.map((c) => {
        if (c.id !== targetId) return c;
        const newHp = Math.max(0, c.currentHp - amount);
        // Massive damage (damage >= maxHp while at 0) = instant death
        if (c.currentHp === 0 && amount >= c.maxHp) {
          return { ...c, currentHp: 0, deathSaves: { successes: 0, failures: 3, stable: false } };
        }
        // Dropping to 0: enter dying state (concentration also cleared)
        if (newHp === 0 && c.currentHp > 0 && c.type === 'player') {
          return { ...c, currentHp: 0, concentration: null, deathSaves: { successes: 0, failures: 0, stable: false } };
        }
        // Hit while already dying: add failure
        if (c.currentHp === 0 && c.type === 'player' && !c.deathSaves?.stable) {
          return { ...c, deathSaves: { ...c.deathSaves, failures: Math.min(3, (c.deathSaves?.failures || 0) + 1) } };
        }
        // Normal hit — clear concentration if save failed
        return { ...c, currentHp: newHp, ...(concentrationBroke ? { concentration: null } : {}) };
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
    });
    // Broadcast concentration break so all clients clear it
    if (concentrationBroke) {
      broadcastEncounterAction({ type: 'clear-concentration', id: targetId, userId: get().user?.id || 'system' });
    }
  },

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

  // Apply a pre-computed death save result (used for multiplayer sync — caller rolls d20)
  applyDeathSaveResult: (id, roll) =>
    set((state) => {
      const c = state.encounter.combatants.find(x => x.id === id);
      if (!c || c.currentHp > 0 || c.deathSaves?.stable) return state;
      let { successes, failures } = c.deathSaves;
      let newHp = 0, stable = false, logMsg = '';
      if (roll === 20) {
        newHp = 1; successes = 0; failures = 0; stable = false;
        logMsg = `${c.name} rolled a natural 20 on death save — revived with 1 HP!`;
      } else if (roll === 1) {
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
      sessionLog: [
        { id: crypto.randomUUID(), timestamp: Date.now(), type: 'combat', icon: '⚔', title: entry, detail: null },
        ...state.sessionLog,
      ].slice(0, 120),
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

  moveToken: (id, x, y, cost = 0) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? {
            ...c,
            position: { x, y },
            remainingMove: cost > 0
              ? Math.max(0, (c.remainingMove ?? Math.floor((c.speed || 30) / 5)) - cost)
              : c.remainingMove,
          } : c
        ),
      },
    })),

  endEncounter: () => {
    set({
      encounter: {
        phase: 'idle',
        combatants: [],
        currentTurn: 0,
        round: 1,
        log: [],
        activeEffects: [],
      },
    });
    // Persist idle state immediately so refresh doesn't restore old combat
    setTimeout(() => get().saveSessionStateToSupabase(), 0);
  },

  // === Action Economy ===
  useAction: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, actionsUsed: (c.actionsUsed || 0) + 1 } : c
        ),
      },
    })),

  useBonusAction: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, bonusActionsUsed: (c.bonusActionsUsed || 0) + 1 } : c
        ),
      },
    })),

  useMovement: (id, squares) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? { ...c, remainingMove: Math.max(0, (c.remainingMove ?? 0) - squares) } : c
        ),
      },
    })),

  // Dash: spend 1 action, double remaining movement
  dashAction: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map((c) =>
          c.id === id ? {
            ...c,
            actionsUsed: (c.actionsUsed || 0) + 1,
            remainingMove: (c.remainingMove ?? 0) + Math.floor((c.speed || 30) / 5),
          } : c
        ),
        log: [`${state.encounter.combatants.find(c => c.id === id)?.name} dashes!`, ...state.encounter.log].slice(0, 30),
      },
    })),

  // === AI Enemy Turns ===
  runEnemyTurn: async (apiKey) => {
    const { encounter, campaign } = get();
    const active = encounter.combatants[encounter.currentTurn];
    if (!active || active.type !== 'enemy' || active.currentHp <= 0) {
      get().nextEncounterTurn();
      return;
    }

    get().addEncounterLog(`⚔ ${active.name} is acting...`);

    try {
      const result = await triggerEnemyTurn(active, encounter, apiKey);

      // Move token if AI decided to move — deduct movement cost
      if (result.moveToPosition && typeof result.moveToPosition.x === 'number') {
        const { x, y } = result.moveToPosition;
        const occupied = encounter.combatants.some(c => c.id !== active.id && c.position?.x === x && c.position?.y === y);
        if (!occupied) {
          const from = active.position;
          const cost = from ? Math.max(Math.abs(x - from.x), Math.abs(y - from.y)) : 1;
          get().moveToken(active.id, x, y, cost);
        }
      }

      // Apply attack damage — broadcast immediately so all clients update HP without waiting for sync
      if (result.targetId && typeof result.damage === 'number' && result.damage > 0) {
        get().applyEncounterDamage(result.targetId, result.damage);
        const target = encounter.combatants.find(c => c.id === result.targetId);
        get().addEncounterLog(
          `⚔ ${active.name} attacks ${target?.name || '?'}: ` +
          `${result.hit ? `HIT for ${result.damage} ${result.damageType || ''} damage` : 'MISS'}`
        );
        broadcastEncounterAction({
          type: 'damage',
          targetId: result.targetId,
          amount: result.damage,
          userId: get().user?.id || 'system',
        });
      }

      // Apply conditions — broadcast so all clients apply them
      if (result.appliedConditions?.length) {
        result.appliedConditions.forEach(cond => {
          if (result.targetId) {
            get().addEncounterCondition(result.targetId, cond);
            broadcastEncounterAction({
              type: 'add-condition',
              id: result.targetId,
              condition: cond,
              userId: get().user?.id || 'system',
            });
          }
        });
      }

      // Narrate in chat — broadcast to ALL players, not just the DM's client
      if (result.narrative) {
        const msg = {
          role: 'dm', speaker: 'Dungeon Master',
          text: result.narrative,
          id: crypto.randomUUID(), timestamp: Date.now(),
        };
        get().addNarratorMessage(msg);
        broadcastNarratorMessage(msg);
      }

      // If all enemies are now dead, trigger a victory narration and loot screen
      const afterEncounter = get().encounter;
      const allEnemiesDead = afterEncounter.combatants.every(
        c => c.type !== 'enemy' || c.currentHp <= 0
      );
      if (allEnemiesDead) {
        // Collect dead enemies for loot calculation
        const deadEnemies = afterEncounter.combatants.filter(c => c.type === 'enemy');
        const partySize = afterEncounter.combatants.filter(c => c.type === 'player').length || 1;
        if (deadEnemies.length > 0 && !get().pendingLoot) {
          get().setPendingLoot({ enemies: deadEnemies, partySize });
        }
        setTimeout(() => {
          get().setPendingDmTrigger(
            'The battle is over. Describe the aftermath as the party catches their breath and surveys the scene.'
          );
        }, 2800);
      }
    } catch (err) {
      get().addEncounterLog(`⚔ ${active.name} hesitates. (${err.message})`);
    }

    // Auto-advance to next turn — broadcast so ALL clients advance simultaneously
    const userId = get().user?.id;
    setTimeout(() => {
      get().nextEncounterTurn();
      broadcastEncounterAction({ type: 'next-turn', userId: userId || 'system' });
    }, 1800);
  },

  // Narrate a player combat action in 1-2 sentences via Claude Haiku.
  // Fires-and-forgets — does not block turn progression.
  narrateCombatAction: async (actorName, actionLabel, targetName, resultDesc, apiKey) => {
    if (!apiKey) return;
    const prompt = `You are the Dungeon Master narrating a D&D 5e combat action.
${actorName} uses ${actionLabel}${targetName ? ` against ${targetName}` : ''}.
Result: ${resultDesc}
Write exactly 1-2 vivid, present-tense sentences narrating what happens. No dice numbers. Pure immersive narration.`;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (!text) return;
      const msg = { role: 'dm', speaker: 'Dungeon Master', text, id: crypto.randomUUID(), timestamp: Date.now() };
      get().addNarratorMessage(msg);
      broadcastNarratorMessage(msg);
    } catch { /* non-critical — narration is best-effort */ }
  },

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
        // Remove any concentration-linked area effects from this caster
        activeEffects: (state.encounter.activeEffects || []).filter(e =>
          !(e.concentration && e.casterId === id)
        ),
        log: [`🎯 ${state.encounter.combatants.find(x => x.id === id)?.name} dropped concentration.`, ...state.encounter.log].slice(0, 30),
      },
    })),

  // Apply a spell area effect to the map (state only — no broadcast).
  // Called by non-DM clients receiving an add-effect broadcast.
  applyEncounterEffect: (effect) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        activeEffects: [...(state.encounter.activeEffects || []), effect],
      },
    })),

  // Add a spell area effect and broadcast to all clients (DM only).
  addEncounterEffect: (effect) => {
    get().applyEncounterEffect(effect);
    broadcastEncounterAction({ type: 'add-effect', effect, userId: get().user?.id });
  },

  // Remove a spell area effect by id (state only — no broadcast).
  applyRemoveEffect: (id) =>
    set((state) => ({
      encounter: {
        ...state.encounter,
        activeEffects: (state.encounter.activeEffects || []).filter(e => e.id !== id),
      },
    })),

  // Remove a spell area effect and broadcast to all clients (DM only).
  removeEncounterEffect: (id) => {
    get().applyRemoveEffect(id);
    broadcastEncounterAction({ type: 'remove-effect', effectId: id, userId: get().user?.id });
  },

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
    // Restore short-rest class resources (HP recovery happens via spendHitDie calls)
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
        log: ['🌙 Short rest — short-rest resources restored.', ...get().encounter.log].slice(0, 30),
      },
    }));
    get().saveCampaignToSupabase();
  },

  // Spend one hit die during a short rest — rolls hitDie + CON mod, recovers HP
  spendHitDie: (charId) => {
    const { campaign, myCharacter } = get();
    const char = campaign.characters.find(c => c.id === charId || c.name === charId)
      || myCharacter;
    if (!char) return;

    const hitDie = CLASSES[char.class]?.hitDie || 8;
    const conMod = Math.floor(((char.stats?.con || 10) - 10) / 2);
    const roll = Math.floor(Math.random() * hitDie) + 1;
    const healed = Math.max(1, roll + conMod);
    const remaining = Math.max(0, (char.hitDiceRemaining ?? char.level ?? 1) - 1);
    const newHp = Math.min(char.maxHp, (char.currentHp || 0) + healed);

    set((state) => ({
      campaign: {
        ...state.campaign,
        characters: state.campaign.characters.map(c =>
          (c.id === charId || c.name === charId || c.id === char.id)
            ? { ...c, currentHp: newHp, hitDiceRemaining: remaining }
            : c
        ),
      },
      myCharacter: (state.myCharacter?.id === char.id || state.myCharacter?.name === char.name)
        ? { ...state.myCharacter, currentHp: newHp, hitDiceRemaining: remaining }
        : state.myCharacter,
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          (c.id === char.id || c.name === char.name)
            ? { ...c, currentHp: newHp }
            : c
        ),
        log: [`🎲 ${char.name} spends a hit die: d${hitDie}(${roll})${conMod >= 0 ? '+' : ''}${conMod} = +${healed} HP`, ...state.encounter.log].slice(0, 30),
      },
    }));
    get().saveCampaignToSupabase();

    return { roll, healed, remaining, newHp };
  },

  longRest: () => {
    set((state) => {
      const updatedChars = state.campaign.characters.map((c) => {
        const spellSlots = c.spellSlots
          ? Object.fromEntries(
              Object.entries(c.spellSlots).map(([lvl, s]) => [lvl, { ...s, used: 0 }])
            )
          : c.spellSlots;
        // Long rest restores half your level in hit dice (minimum 1)
        const totalHitDice = c.level || 1;
        const restored = Math.max(1, Math.floor(totalHitDice / 2));
        const current = c.hitDiceRemaining ?? totalHitDice;
        const hitDiceRemaining = Math.min(totalHitDice, current + restored);
        return { ...c, currentHp: c.maxHp, resourcesUsed: {}, spellSlots, hitDiceRemaining };
      });
      // Also restore HP for player combatants in an active encounter
      const updatedCombatants = state.encounter.combatants.map((c) => {
        if (c.type !== 'player') return c;
        return { ...c, currentHp: c.maxHp, conditions: [], deathSaves: { successes: 0, failures: 0, stable: false } };
      });
      return {
        campaign: { ...state.campaign, characters: updatedChars },
        encounter: {
          ...state.encounter,
          combatants: updatedCombatants,
          log: ['☀️ Long rest taken — all HP and resources restored.', ...state.encounter.log].slice(0, 30),
        },
      };
    });
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

  // === XP & Level Up ===
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

  // Apply confirmed level-up to myCharacter + campaign characters
  applyLevelUp: (updates) => {
    set((state) => {
      const myChar = state.myCharacter;
      const updatedChar = myChar ? { ...myChar, ...updates } : myChar;
      const updatedCampaignChars = state.campaign.characters.map(c =>
        (c.id === myChar?.id || c.name === myChar?.name)
          ? { ...c, ...updates }
          : c
      );
      return {
        myCharacter: updatedChar,
        campaign: { ...state.campaign, characters: updatedCampaignChars },
      };
    });
    get().saveCampaignToSupabase();
  },

  // Notify that a character is ready to level up (sets a flag watched by GameLayout)
  pendingLevelUp: false,
  setPendingLevelUp: (val) => set({ pendingLevelUp: val }),

  // Post-combat loot screen trigger
  pendingLoot: null, // { enemies: [...], partySize: n } | null
  setPendingLoot: (val) => set({ pendingLoot: val }),

  // === Inventory / Equipment / Gold / XP ====================================

  // Save myCharacter changes to store + Supabase campaign_members
  updateMyCharacter: async (changes) => {
    const { myCharacter, activeCampaign, user } = get();
    if (!myCharacter) return;
    const updated = { ...myCharacter, ...changes };
    set({ myCharacter: updated });
    if (activeCampaign?.id && user?.id) {
      try {
        await supabase
          .from('campaign_members')
          .update({ character_data: updated })
          .eq('campaign_id', activeCampaign.id)
          .eq('user_id', user.id);
      } catch { /* non-critical */ }
    }
  },

  // Equip an item from inventory into a named slot; old item returns to inventory
  equipItem: (slotName, item) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const equippedItems = { ...(myCharacter.equippedItems || {}) };
    const inventory = [...(myCharacter.inventory || [])];
    // Return currently equipped item to inventory
    if (equippedItems[slotName]) {
      inventory.push({ ...equippedItems[slotName], instanceId: crypto.randomUUID() });
    }
    // Remove the item being equipped from inventory
    const idx = inventory.findIndex(i => i.instanceId === item.instanceId);
    if (idx !== -1) inventory.splice(idx, 1);
    equippedItems[slotName] = item;
    // Recalc AC whenever chest/offHand changes
    let updates = { equippedItems, inventory };
    if (slotName === 'chest' || slotName === 'offHand') {
      // computeAcFromEquipped imported at top
      updates.ac = computeAcFromEquipped(equippedItems, myCharacter.stats);
    }
    get().updateMyCharacter(updates);
  },

  // Move equipped item back to inventory
  unequipItem: (slotName) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const equippedItems = { ...(myCharacter.equippedItems || {}) };
    const item = equippedItems[slotName];
    if (!item) return;
    const inventory = [...(myCharacter.inventory || []), { ...item, instanceId: crypto.randomUUID() }];
    equippedItems[slotName] = null;
    let updates = { equippedItems, inventory };
    if (slotName === 'chest' || slotName === 'offHand') {
      // computeAcFromEquipped imported at top
      updates.ac = computeAcFromEquipped(equippedItems, myCharacter.stats);
    }
    get().updateMyCharacter(updates);
  },

  // Add an item to myCharacter's inventory
  addItemToInventory: (item) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const inventory = [...(myCharacter.inventory || [])];
    // Stack consumables by id
    if (item.type === 'consumable' || item.id) {
      const existing = inventory.find(i => i.id === item.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        return get().updateMyCharacter({ inventory });
      }
    }
    inventory.push({ ...item, instanceId: crypto.randomUUID(), quantity: item.quantity || 1 });
    get().updateMyCharacter({ inventory });
  },

  // Remove item from inventory by instanceId
  removeItemFromInventory: (instanceId) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const inventory = (myCharacter.inventory || []).filter(i => i.instanceId !== instanceId);
    get().updateMyCharacter({ inventory });
  },

  // Use a consumable — apply effect, decrement quantity
  useItem: (instanceId) => {
    const { myCharacter, encounter } = get();
    if (!myCharacter) return;
    const inventory = [...(myCharacter.inventory || [])];
    const itemIdx = inventory.findIndex(i => i.instanceId === instanceId);
    if (itemIdx === -1) return;
    const item = inventory[itemIdx];
    const effect = item.effect;
    let changes = {};

    if (effect?.type === 'heal') {
      // Roll the heal dice
      const diceMatch = (effect.dice || '2d4').match(/(\d+)d(\d+)/);
      let healed = (effect.bonus || 0);
      if (diceMatch) {
        const count = parseInt(diceMatch[1]);
        const sides = parseInt(diceMatch[2]);
        healed += Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1).reduce((a, b) => a + b, 0);
      }
      const newHp = Math.min((myCharacter.currentHp || 0) + healed, myCharacter.maxHp || 0);
      changes.currentHp = newHp;
      // Also update combatant HP if in combat
      if (encounter.phase !== 'idle') {
        const combatants = encounter.combatants.map(c =>
          (c.id === myCharacter.id || c.name === myCharacter.name)
            ? { ...c, currentHp: Math.min(c.currentHp + healed, c.maxHp) }
            : c
        );
        set(state => ({ encounter: { ...state.encounter, combatants } }));
      }
    }

    // Consume the item
    if ((item.quantity || 1) <= 1) {
      inventory.splice(itemIdx, 1);
    } else {
      inventory[itemIdx] = { ...item, quantity: item.quantity - 1 };
    }
    changes.inventory = inventory;
    get().updateMyCharacter(changes);
    return effect;
  },

  // Add XP to myCharacter
  addXp: (amount) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const newXp = (myCharacter.xp || 0) + amount;
    get().updateMyCharacter({ xp: newXp });
  },

  // Add gold to myCharacter
  addGold: (amount) => {
    const { myCharacter } = get();
    if (!myCharacter) return;
    const newGold = (myCharacter.gold || 0) + amount;
    get().updateMyCharacter({ gold: newGold });
  },

  saveSettingsToSupabase: async (campaignState) => {
    const { activeCampaign } = get();
    if (!activeCampaign?.id) return;
    const c = campaignState || get().campaign;
    try {
      const { data: cur } = await supabase
        .from('campaigns').select('settings').eq('id', activeCampaign.id).maybeSingle();
      await supabase
        .from('campaigns')
        .update({ settings: { ...(cur?.settings || {}), notes: c.notes, savedEncounters: c.savedEncounters } })
        .eq('id', activeCampaign.id);
    } catch { /* non-critical */ }
  },

  saveSessionStateToSupabase: async () => {
    const { activeCampaign, campaign, encounter, isDM } = get();
    if (!activeCampaign?.id || !isDM) return;
    try {
      const { data: cur } = await supabase
        .from('campaigns').select('settings').eq('id', activeCampaign.id).maybeSingle();
      await supabase
        .from('campaigns')
        .update({
          settings: {
            ...(cur?.settings || {}),
            currentSceneIndex: campaign.currentSceneIndex,
            encounterState: encounter.phase !== 'idle' ? encounter : null,
          },
        })
        .eq('id', activeCampaign.id);
    } catch { /* non-critical */ }
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

  // === Session Log (unified activity feed) ===
  sessionLog: [], // { id, type, icon, title, detail, timestamp }
  addSessionEntry: (entry) =>
    set((state) => ({
      sessionLog: [
        { id: crypto.randomUUID(), timestamp: Date.now(), ...entry },
        ...state.sessionLog,
      ].slice(0, 120),
    })),
  clearSessionLog: () => set({ sessionLog: [] }),

  // === Dice ===
  dice: {
    rollHistory: [],
  },
  addRoll: (rollEntry) =>
    set((state) => {
      const mod = rollEntry.modifier !== 0 ? ` ${rollEntry.modifier > 0 ? '+' : ''}${rollEntry.modifier}` : '';
      const label = `${rollEntry.count}d${rollEntry.die}${mod}`;
      const detail = rollEntry.advantageRolls
        ? `[${rollEntry.advantageRolls.join(', ')}] (${rollEntry.advantage})`
        : rollEntry.rolls.length > 1
          ? `[${rollEntry.rolls.join(', ')}]`
          : null;
      const isNat = rollEntry.die === 20 && rollEntry.rolls[0] === 20;
      const isFail = rollEntry.die === 20 && rollEntry.rolls[0] === 1;
      return {
        dice: {
          rollHistory: [rollEntry, ...state.dice.rollHistory].slice(0, 10),
        },
        sessionLog: [
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'roll',
            icon: isNat ? '⭐' : isFail ? '💀' : '🎲',
            title: `${rollEntry.rolledBy ? `${rollEntry.rolledBy}: ` : ''}${label} = ${rollEntry.total}${isNat ? ' — NAT 20!' : isFail ? ' — NAT 1!' : ''}`,
            detail,
          },
          ...state.sessionLog,
        ].slice(0, 120),
      };
    }),
  clearHistory: () =>
    set({
      dice: { rollHistory: [] },
    }),

  // === Session-wide API key (broadcast from DM to all players) ===
  sessionApiKey: null,
  setSessionApiKey: (key) => set({ sessionApiKey: key }),

  // === Pending DM Trigger (NPC proximity interaction → auto-send to narrator) ===
  pendingDmTrigger: null,
  setPendingDmTrigger: (text) => set({ pendingDmTrigger: text }),
  clearPendingDmTrigger: () => set({ pendingDmTrigger: null }),

  // === Scene Images (DALL-E cache) ===
  sceneImages: {}, // { [campaignId:sceneIndex]: imageUrl }
  setSceneImage: (key, url) =>
    set((state) => {
      const next = { ...state.sceneImages };
      if (url == null) { delete next[key]; } else { next[key] = url; }
      return { sceneImages: next };
    }),
  clearSceneImages: () => set({ sceneImages: {} }),

  npcPortraits: {}, // { [campaignId:sceneIndex:npcName]: portraitUrl }
  setNpcPortrait: (key, url) =>
    set((state) => ({ npcPortraits: { ...state.npcPortraits, [key]: url } })),

  // Pre-populate scene image URLs at import time so they're ready immediately.
  // Uses deterministic Pollinations URLs (stable — same scene title → same image).
  // Saves to Supabase campaign settings for persistence across refreshes.
  preGenerateSceneImages: async (campaignId, scenes) => {
    const { buildPollinationsUrl } = await import('../lib/dalleApi');
    const urlMap = {};
    (scenes || []).forEach((scene, idx) => {
      const key = `${campaignId || 'local'}:${idx}`;
      const url = buildPollinationsUrl(scene.title);
      get().setSceneImage(key, url);
      urlMap[String(idx)] = url;
    });
    // Persist to Supabase so URLs survive page refresh
    const activeCampaign = get().activeCampaign;
    if (activeCampaign?.id) {
      try {
        const { data: cur } = await supabase.from('campaigns').select('settings').eq('id', activeCampaign.id).single();
        await supabase.from('campaigns').update({
          settings: { ...(cur?.settings || {}), sceneImageUrls: urlMap },
        }).eq('id', activeCampaign.id);
      } catch { /* non-critical */ }
    }
  },

  // === Fog of War ===
  fogEnabled: {},   // { [sceneKey]: boolean }
  fogRevealed: {},  // { [sceneKey]: { [cellKey]: true } } — cellKey = "x,y"
  applyFogSync: (enabled, revealed) => set({ fogEnabled: enabled || {}, fogRevealed: revealed || {} }),

  initFogForScene: (sceneKey, defaultEnabled) =>
    set((state) => ({
      fogEnabled: {
        ...state.fogEnabled,
        [sceneKey]: state.fogEnabled[sceneKey] ?? defaultEnabled,
      },
      fogRevealed: {
        ...state.fogRevealed,
        [sceneKey]: state.fogRevealed[sceneKey] || {},
      },
    })),

  revealFogCells: (sceneKey, cells) =>
    set((state) => {
      const prev = state.fogRevealed[sceneKey] || {};
      const next = { ...prev };
      cells.forEach(k => { next[k] = true; });
      return { fogRevealed: { ...state.fogRevealed, [sceneKey]: next } };
    }),

  toggleFog: (sceneKey) =>
    set((state) => ({
      fogEnabled: { ...state.fogEnabled, [sceneKey]: !state.fogEnabled[sceneKey] },
    })),

  setFogEnabled: (sceneKey, val) =>
    set((state) => ({
      fogEnabled: { ...state.fogEnabled, [sceneKey]: val },
    })),

  // === Scene Token Positions (free movement outside combat) ===
  sceneTokenPositions: {}, // { [sceneKey]: { [memberId]: { x, y } } }
  setSceneTokenPosition: (sceneKey, memberId, pos) => {
    set((state) => ({
      sceneTokenPositions: {
        ...state.sceneTokenPositions,
        [sceneKey]: {
          ...(state.sceneTokenPositions[sceneKey] || {}),
          [memberId]: pos,
        },
      },
    }));
    // Debounced persist to Supabase so positions survive refresh
    clearTimeout(get()._tokenPosSaveTimer);
    const timer = setTimeout(async () => {
      const { activeCampaign, sceneTokenPositions } = get();
      if (!activeCampaign?.id) return;
      try {
        const { data: cur } = await supabase.from('campaigns').select('settings').eq('id', activeCampaign.id).single();
        await supabase.from('campaigns').update({
          settings: { ...(cur?.settings || {}), sceneTokenPositions },
        }).eq('id', activeCampaign.id);
      } catch { /* non-critical */ }
    }, 2000);
    set({ _tokenPosSaveTimer: timer });
  },
  _tokenPosSaveTimer: null,

  // === Narrator (AI DM) ===
  narrator: {
    history: [], // { id, role: 'player'|'dm', speaker, text, rollRequest, timestamp }
    open: false,
  },
  addNarratorMessage: (msg) =>
    set((state) => {
      const logEntry = msg.role === 'player'
        ? {
            id: crypto.randomUUID(), timestamp: Date.now(),
            type: 'narrator', icon: '🗣',
            title: msg.speaker || 'Player',
            detail: msg.text?.slice(0, 100),
          }
        : msg.rollRequest
          ? {
              id: crypto.randomUUID(), timestamp: Date.now(),
              type: 'roll-request', icon: '🎲',
              title: `Roll ${msg.rollRequest.skill} — DC ${msg.rollRequest.dc}`,
              detail: msg.rollRequest.character ? `For ${msg.rollRequest.character}` : null,
            }
          : null;
      return {
        narrator: {
          ...state.narrator,
          history: [
            ...state.narrator.history,
            { id: crypto.randomUUID(), timestamp: Date.now(), ...msg },
          ].slice(-50),
        },
        sessionLog: logEntry
          ? [logEntry, ...state.sessionLog].slice(0, 120)
          : state.sessionLog,
      };
    }),
  setNarratorOpen: (open) =>
    set((state) => ({ narrator: { ...state.narrator, open } })),
  clearNarratorHistory: () =>
    set((state) => ({ narrator: { ...state.narrator, history: [] } })),
}));

export default useStore;
