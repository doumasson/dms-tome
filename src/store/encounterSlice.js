import { triggerEnemyTurn, computeGruntAction } from '../lib/enemyAi';
import { broadcastNarratorMessage, broadcastEncounterAction } from '../lib/liveChannel';
import { getSaveProficiencies, profBonus as getProfBonus } from '../lib/derivedStats.js';

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
  return `https://image.pollinations.ai/prompt/${prompt}?width=256&height=256&nologo=true&model=turbo&seed=${seed}`;
}

/**
 * Encounter slice — unified scene + combat state, action economy, enemy AI.
 */
export function createEncounterSlice(set, get) {
  return {
    // === Encounter (unified scene + combat) ===
    encounter: {
      phase: 'idle',       // 'idle' | 'initiative' | 'combat'
      combatants: [],      // See startEncounter for shape
      currentTurn: 0,
      round: 1,
      log: [],
      activeEffects: [],   // Persistent spell area overlays: [{ id, spellName, casterId, concentration, areaType, ...geometry }]
    },
    lastCombatPosition: null,   // Saved player position when combat ends
    defeatedEnemies: {},        // { [areaId]: [enemyName, ...] } — prevents respawn in exploration

    startEncounter: (enemies, partyMembers, autoRollInitiative = false, { surprise = false } = {}) => {
      const combatants = [];

      // Scale enemy count to party size
      const playerCount = Math.max(1, (partyMembers || []).length);
      let scaledEnemies = [...(enemies || [])];
      if (playerCount <= 2 && scaledEnemies.length > 2) {
        // Solo/duo: cap at playerCount enemies
        scaledEnemies = scaledEnemies.slice(0, Math.max(1, playerCount));
      } else if (playerCount <= 3 && scaledEnemies.length > playerCount + 1) {
        scaledEnemies = scaledEnemies.slice(0, playerCount + 1);
      }
      // Also scale individual group counts for solo/duo
      if (playerCount <= 2) {
        scaledEnemies = scaledEnemies.map(e => ({
          ...e,
          count: Math.min(e.count || 1, Math.max(1, playerCount)),
        }));
      }

      // Expand enemy groups by count
      scaledEnemies.forEach((group, gi) => {
        const count = group.count || 1;
        // Stats may be nested in group.stats (area builder) or top-level (legacy)
        const stats = group.stats || {};
        const hp = Number(group.hp) || Number(stats.hp) || 10;
        const ac = Number(group.ac) || Number(stats.ac) || 10;
        const spd = Number(group.speed) || Number(stats.speed) || 30;
        for (let i = 0; i < count; i++) {
          const label = count > 1 ? `${group.name} ${i + 1}` : group.name;
          combatants.push({
            id: group.id || crypto.randomUUID(),
            name: label,
            type: 'enemy',
            isEnemy: true,
            initiative: null,
            maxHp: hp,
            currentHp: hp,
            ac: ac,
            speed: spd,
            remainingMove: Math.floor(spd / 5),
            actionsUsed: 0,
            bonusActionsUsed: 0,
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...stats },
            attacks: group.attacks || [],
            spells: group.spells || [],
            conditions: [],
            concentration: null,
            cr: group.cr || stats.cr || null,
            position: group.position
              ? { x: group.position.x + (i > 0 ? i : 0), y: group.position.y }
              : null,
            deathSaves: { successes: 0, failures: 0, stable: false },
          });
        }
      });

      // Add party members from campaign characters
      partyMembers?.forEach((char) => {
        const resolvedClass = char.class || char.className || char.characterClass || '';
        console.log('[startEncounter] Player combatant:', { name: char.name, class: resolvedClass, level: char.level, rawClass: char.class });
        const spd = char.speed || 30;
        combatants.push({
          id: char.id || crypto.randomUUID(),
          name: char.name,
          type: 'player',
          class: resolvedClass,
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
          position: char.position || null,
          deathSaves: { successes: 0, failures: 0, stable: false },
          portrait: makePortraitUrl(char.name, char.race, char.class),
        });
      });

      if (autoRollInitiative) {
        // Auto-roll initiative: d20 + DEX modifier for each combatant
        combatants.forEach(c => {
          const dexMod = Math.floor(((c.stats?.dex || 10) - 10) / 2);
          c.initiative = Math.floor(Math.random() * 20) + 1 + dexMod;
          // Surprise: enemies are surprised — they skip their first turn
          if (surprise && c.type === 'enemy') {
            c.conditions = [...(c.conditions || []), 'Surprised'];
          }
        });
        // Sort descending; on surprise, players go before enemies at equal initiative
        const sorted = [...combatants].sort((a, b) => {
          const diff = (b.initiative || 0) - (a.initiative || 0);
          if (diff !== 0) return diff;
          if (surprise) return a.type === 'enemy' ? 1 : -1;
          return 0;
        });
        const initLog = sorted.map(c => `${c.name}: ${c.initiative}`).join(', ');

        // Place combatants — keep existing positions if they have them,
        // only auto-place those without positions (fallback for V1 scenes)
        // A position is "valid" if it exists and isn't at the default origin (0,0)
        const isValidPos = (pos) => pos != null && pos.x != null && !(pos.x === 0 && pos.y === 0)
        const hasPositions = sorted.some(c => isValidPos(c.position))
        let placed
        if (hasPositions) {
          // V2 tilemap: combatants already have map positions from area generation
          // Just ensure all have a position (players get placed near first enemy if missing)
          const firstEnemy = sorted.find(c => c.type === 'enemy' && isValidPos(c.position))
          const fallbackPos = firstEnemy?.position || { x: 5, y: 5 }
          placed = sorted.map((c, i) => ({
            ...c,
            position: isValidPos(c.position) ? c.position : { x: fallbackPos.x - 2 + (i % 3), y: fallbackPos.y - 1 + Math.floor(i / 3) },
            remainingMove: Math.floor((c.speed || 30) / 5),
          }))
        } else {
          // V1 fallback: auto-place in a small grid
          const players = sorted.filter(c => c.type !== 'enemy');
          const enemyList = sorted.filter(c => c.type === 'enemy');
          const autoPlace = (list, startX) =>
            list.map((c, i) => ({
              ...c,
              position: { x: Math.min(startX + (i % 3), 9), y: Math.min(Math.floor(i / 3) * 2, 7) },
              remainingMove: Math.floor((c.speed || 30) / 5),
            }));
          placed = [...autoPlace(players, 0), ...autoPlace(enemyList, 7)]
            .sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
        }

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
        const enemyList = sorted.filter((c) => c.type === 'enemy');

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
          ...place(enemyList, 7),
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
            log: ['\u2694 Combat begins! Round 1.'],
          },
        };
      }),

    nextEncounterTurn: () => {
      const state = get();
      const { combatants, currentTurn, round } = state.encounter;
      if (combatants.length === 0) return;

      // Check for total party kill — all players dead (3 failed saves) or dying with no living players
      const livingPlayers = combatants.filter(c =>
        c.type !== 'enemy' && (c.currentHp > 0 || c.deathSaves?.stable)
      );
      if (livingPlayers.length === 0) {
        // TPK — end combat with defeat
        get().addEncounterLog('\u2620 The party has fallen...');
        const msg = {
          role: 'dm', speaker: 'Dungeon Master',
          text: 'The party has been defeated. Darkness closes in... but fate is not yet done with you.',
          id: crypto.randomUUID(), timestamp: Date.now(),
        };
        get().addNarratorMessage(msg);
        broadcastNarratorMessage(msg);
        setTimeout(() => {
          get().endEncounterWithDefeat();
        }, 2500);
        return;
      }

      // Find next living combatant (skip dead characters — 3 failed death saves)
      const isDead = (c) => c.currentHp <= 0 && c.deathSaves?.failures >= 3 && !c.deathSaves?.stable;
      let nextTurn = currentTurn;
      let nextRound = round;
      let attempts = 0;
      do {
        const isLast = nextTurn >= combatants.length - 1;
        nextTurn = isLast ? 0 : nextTurn + 1;
        if (isLast) nextRound = nextRound + 1;
        attempts++;
      } while (isDead(combatants[nextTurn]) && attempts < combatants.length);

      const roundChanged = nextRound !== round;
      const log = roundChanged
        ? [`Round ${nextRound} begins.`, ...state.encounter.log]
        : state.encounter.log;

      // Reset movement + action economy for the next combatant
      const updated = combatants.map((c, i) =>
        i === nextTurn ? {
          ...c,
          remainingMove: Math.floor((c.speed || 30) / 5),
          actionsUsed: 0,
          bonusActionsUsed: 0,
          reactionUsed: false,
          disengaged: false,
          leveledSpellCastThisTurn: false,
        } : c
      );
      set({
        encounter: {
          ...state.encounter,
          combatants: updated,
          currentTurn: nextTurn,
          round: nextRound,
          log: log.slice(0, 30),
        },
      });
    },

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
          // Add proficiency bonus if character is proficient in CON saves
          const saveProfs = target.class ? getSaveProficiencies(target.class) : [];
          const conSaveBonus = conMod + (saveProfs.includes('con') ? getProfBonus(target.level || 1) : 0);
          const total = roll + conSaveBonus;
          const pass = total >= dc;
          if (!pass) concentrationBroke = true;
          extraLog.push(
            `\ud83c\udfaf ${target.name} concentration (${target.concentration}) DC ${dc}: ` +
            `d20(${roll})${conMod >= 0 ? '+' : ''}${conMod}=${total} \u2014 ${pass ? '\u2713 Maintained' : '\u2717 BROKEN \u2014 spell ends'}`
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
      // Check if all enemies are dead — trigger loot/victory from any damage source
      const afterDmg = get().encounter;
      if (afterDmg.phase === 'combat') {
        const allEnemiesDead = afterDmg.combatants.every(c => c.type !== 'enemy' || c.currentHp <= 0);
        if (allEnemiesDead) {
          const deadEnemies = afterDmg.combatants.filter(c => c.type === 'enemy');
          const partySize = afterDmg.combatants.filter(c => c.type === 'player').length || 1;
          if (deadEnemies.length > 0 && !get().pendingLoot) {
            get().setPendingLoot({ enemies: deadEnemies, partySize });
          }
          get().addNarratorMessage({ role: 'dm', speaker: 'DM', text: 'Victory! All enemies have fallen.' });
          setTimeout(() => get().endEncounter(), 2000);
        }
      }
    },

    applyEncounterHeal: (targetId, amount) =>
      set((state) => {
        let revivalLog = null;
        const combatants = state.encounter.combatants.map((c) => {
          if (c.id !== targetId) return c;
          const wasDying = (c.currentHp ?? 0) <= 0 && (c.deathSaves?.failures ?? 0) < 3;
          const newHp = Math.min(c.maxHp, c.currentHp + amount);
          if (wasDying) revivalLog = `${c.name} is healed for ${amount} HP and rejoins the fight!`;
          // Healing resets death saves
          return { ...c, currentHp: newHp, deathSaves: { successes: 0, failures: 0, stable: false } };
        });
        return {
          encounter: {
            ...state.encounter,
            combatants,
            log: revivalLog
              ? [revivalLog, ...state.encounter.log].slice(0, 30)
              : state.encounter.log,
          },
        };
      }),

    // Apply a pre-computed death save result (used for multiplayer sync — caller rolls d20)
    applyDeathSaveResult: (id, roll) =>
      set((state) => {
        const c = state.encounter.combatants.find(x => x.id === id);
        if (!c || c.currentHp > 0 || c.deathSaves?.stable) return state;
        let { successes, failures } = c.deathSaves;
        let newHp = 0, stable = false, logMsg = '';
        if (roll === 20) {
          newHp = 1; successes = 0; failures = 0; stable = false;
          logMsg = `${c.name} rolled a natural 20 on death save \u2014 revived with 1 HP!`;
        } else if (roll === 1) {
          failures = Math.min(3, failures + 2);
          logMsg = `${c.name} rolled a 1 on death save \u2014 2 failures! (${failures}/3)`;
        } else if (roll >= 10) {
          successes = Math.min(3, successes + 1);
          if (successes >= 3) { stable = true; logMsg = `${c.name} stabilizes! (3 successes)`; }
          else logMsg = `${c.name} death save: ${roll} \u2014 success (${successes}/3)`;
        } else {
          failures = Math.min(3, failures + 1);
          logMsg = `${c.name} death save: ${roll} \u2014 failure (${failures}/3)`;
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
          logMsg = `${c.name} rolled a natural 20 on death save \u2014 revived with 1 HP!`;
        } else if (roll === 1) {
          // Natural 1: two failures
          failures = Math.min(3, failures + 2);
          logMsg = `${c.name} rolled a 1 on death save \u2014 2 failures! (${failures}/3)`;
        } else if (roll >= 10) {
          successes = Math.min(3, successes + 1);
          if (successes >= 3) { stable = true; logMsg = `${c.name} stabilizes! (3 successes)`; }
          else logMsg = `${c.name} death save: ${roll} \u2014 success (${successes}/3)`;
        } else {
          failures = Math.min(3, failures + 1);
          logMsg = `${c.name} death save: ${roll} \u2014 failure (${failures}/3)`;
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
          { id: crypto.randomUUID(), timestamp: Date.now(), type: 'combat', icon: '\u2694', title: entry, detail: null },
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

    // End encounter after TPK — revive players at 1 HP (mercy rule)
    endEncounterWithDefeat: () => {
      const state = get();
      const { combatants } = state.encounter;

      // Sync combatant back to myCharacter, but revive at 1 HP
      if (combatants?.length && state.myCharacter) {
        const myCombatant = combatants.find(c =>
          c.type === 'player' && (c.id === state.myCharacter.id || c.name === state.myCharacter.name)
        );
        if (myCombatant) {
          const hpChanges = {
            currentHp: 1,
            hp: 1,
            conditions: [],
            spellSlots: myCombatant.spellSlots || state.myCharacter.spellSlots,
            resourcesUsed: myCombatant.resourcesUsed || {},
          };
          set(prev => ({
            myCharacter: { ...prev.myCharacter, ...hpChanges },
          }));
          setTimeout(() => get().updateMyCharacter(hpChanges), 0);
        }
      }

      // Move player to safe spawn point (area's playerStart)
      const currentAreaId = get().currentAreaId;
      const area = get().areas?.[currentAreaId] || null;
      const respawnPos = area?.playerStart || null;

      set({
        encounter: {
          phase: 'idle',
          combatants: [],
          currentTurn: 0,
          round: 1,
          log: [],
          activeEffects: [],
        },
        respawnPosition: respawnPos,
      });

      // Narrate the revival
      const reviveMsg = {
        role: 'dm', speaker: 'Dungeon Master',
        text: 'You wake up bruised but alive, the taste of dirt and blood in your mouth. Fate has granted you another chance...',
        id: crypto.randomUUID(), timestamp: Date.now(),
      };
      get().addNarratorMessage(reviveMsg);
      broadcastNarratorMessage(reviveMsg);

      setTimeout(() => get().saveSessionStateToSupabase(), 0);
    },

    endEncounter: () => {
      const state = get()
      const { combatants } = state.encounter

      // Save player's final combat position so exploration doesn't revert
      let lastCombatPosition = null
      if (combatants?.length && state.myCharacter) {
        const myCombatant = combatants.find(c =>
          c.type === 'player' && (c.id === state.myCharacter.id || c.name === state.myCharacter.name)
        )
        if (myCombatant?.position) {
          lastCombatPosition = { ...myCombatant.position }
        }

        // Sync combatant HP/conditions back to myCharacter before clearing
        if (myCombatant) {
          const hpChanges = {
            currentHp: myCombatant.currentHp,
            hp: myCombatant.currentHp,
            conditions: myCombatant.conditions?.filter(c => c !== 'Surprised') || [],
            spellSlots: myCombatant.spellSlots || state.myCharacter.spellSlots,
            resourcesUsed: myCombatant.resourcesUsed || {},
          }
          set(prev => ({
            myCharacter: { ...prev.myCharacter, ...hpChanges },
          }))
          // Persist to Supabase so HP survives refresh
          setTimeout(() => get().updateMyCharacter(hpChanges), 0)
        }
      }

      // Track defeated enemies so they don't respawn in exploration
      const deadEnemies = (combatants || []).filter(c => c.type === 'enemy' && (c.currentHp ?? 0) <= 0)
      const deadNames = deadEnemies.map(e => e.name)
      const areaId = state.currentAreaId

      const defeatedUpdate = {}
      if (areaId && deadNames.length > 0) {
        defeatedUpdate.defeatedEnemies = {
          ...state.defeatedEnemies,
          [areaId]: [...(state.defeatedEnemies?.[areaId] || []), ...deadNames],
        }
      }

      set({
        encounter: {
          phase: 'idle',
          combatants: [],
          currentTurn: 0,
          round: 1,
          log: [],
          activeEffects: [],
        },
        lastCombatPosition,
        ...defeatedUpdate,
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

    useSpellSlot: (combatantId, slotLevel) =>
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === combatantId && c.spellSlots?.[slotLevel]
              ? { ...c, spellSlots: { ...c.spellSlots, [slotLevel]: { ...c.spellSlots[slotLevel], used: c.spellSlots[slotLevel].used + 1 } } }
              : c
          ),
        },
      })),

    useClassResource: (combatantId, resourceName, cost = 1) =>
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === combatantId
              ? { ...c, resourcesUsed: { ...(c.resourcesUsed || {}), [resourceName]: ((c.resourcesUsed || {})[resourceName] || 0) + cost } }
              : c
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
      const { encounter } = get();
      const active = encounter.combatants[encounter.currentTurn];
      console.log('[runEnemyTurn] Start:', active?.name, 'type:', active?.type, 'hp:', active?.currentHp, 'turn:', encounter.currentTurn)

      // Check if all players are dead/dying — don't run enemy turn if TPK
      const livingPlayers = encounter.combatants.filter(c =>
        c.type !== 'enemy' && (c.currentHp > 0 || c.deathSaves?.stable)
      );
      if (livingPlayers.length === 0) {
        console.log('[runEnemyTurn] No living players — TPK detected, skipping enemy turn')
        get().nextEncounterTurn(); // This will trigger TPK handling
        return;
      }

      if (!active || active.type !== 'enemy' || active.currentHp <= 0) {
        console.log('[runEnemyTurn] Early return — advancing turn')
        get().nextEncounterTurn();
        return;
      }

      // Surprised enemies skip their first turn (5e: surprised ends at end of your turn)
      if (active.conditions?.includes('Surprised')) {
        get().removeEncounterCondition(active.id, 'Surprised');
        get().addEncounterLog(`${active.name} is surprised and loses their turn!`);
        broadcastEncounterAction({ type: 'remove-condition', id: active.id, condition: 'Surprised', userId: get().user?.id || 'system' });
        setTimeout(() => {
          get().nextEncounterTurn();
          broadcastEncounterAction({ type: 'next-turn', userId: get().user?.id || 'system' });
        }, 1000);
        return;
      }

      get().addEncounterLog(`\u2694 ${active.name} is acting...`);

      // Determine grunt vs boss: boss flag or CR >= 5 uses Claude API; everything else is grunt
      const isBoss = active.isBoss || (active.cr != null && Number(active.cr) >= 5);
      console.log('[runEnemyTurn] isBoss:', isBoss, 'cr:', active.cr)

      try {
        let result;

        if (isBoss) {
          // Boss path: use Claude API for rich tactical decisions
          result = await triggerEnemyTurn(active, encounter, apiKey);
        } else {
          // Grunt path: local pathfinding AI — fast, free, deterministic
          const currentAreaId = get().currentAreaId;
          const area = get().areas?.[currentAreaId] || null;
          console.log('[runEnemyTurn] Grunt path — area:', currentAreaId, 'wallEdges:', !!area?.wallEdges, 'size:', area?.width, 'x', area?.height)
          let collisionData = null;
          let areaWidth = 20;
          let areaHeight = 20;
          if (area?.wallEdges) {
            collisionData = {
              wallEdges: area.wallEdges,
              cellBlocked: area.cellBlocked || new Uint8Array((area.width || 20) * (area.height || 20)),
            };
            areaWidth = area.width || 20;
            areaHeight = area.height || 20;
          }
          result = computeGruntAction(active, encounter.combatants, collisionData, areaWidth, areaHeight);
        }

        console.log('[runEnemyTurn] AI result:', result.action, 'moveTo:', result.moveTo, 'target:', result.targetName, 'damage:', result.damage, 'narrative:', result.narrative?.slice(0, 60))

        // Apply move — grunt result uses moveTo, legacy AI uses moveToPosition
        const moveDest = result.moveTo || result.moveToPosition;
        if (moveDest && typeof moveDest.x === 'number') {
          const { x, y } = moveDest;
          const occupied = encounter.combatants.some(c => c.id !== active.id && c.position?.x === x && c.position?.y === y);
          if (!occupied) {
            const from = active.position;
            const cost = result.moveCost ?? (from ? Math.max(Math.abs(x - from.x), Math.abs(y - from.y)) : 1);
            get().moveToken(active.id, x, y, cost);
            broadcastEncounterAction({
              type: 'move',
              id: active.id,
              x, y, cost,
              userId: get().user?.id || 'system',
            });
          }
        }

        // Apply attack damage — broadcast immediately so all clients update HP without waiting for sync
        if (result.targetId && typeof result.damage === 'number' && result.damage > 0) {
          get().applyEncounterDamage(result.targetId, result.damage);
          const target = encounter.combatants.find(c => c.id === result.targetId);
          const rollDetail = result.d20 != null ? ` (d20:${result.d20}+${result.bonus}=${result.total} vs AC ${target?.ac || '?'})` : '';
          const hitDesc = result.isCrit
            ? `CRIT! ${result.damage} dmg${rollDetail}`
            : `HIT ${result.damage} dmg${rollDetail}`;
          get().addEncounterLog(
            `⚔ ${active.name} → ${target?.name || '?'}: ${hitDesc}`
          );
          broadcastEncounterAction({
            type: 'damage',
            targetId: result.targetId,
            amount: result.damage,
            userId: get().user?.id || 'system',
          });
        } else if (result.hit === false && result.targetId) {
          const target = encounter.combatants.find(c => c.id === result.targetId);
          const rollDetail = result.d20 != null ? ` (d20:${result.d20}+${result.bonus}=${result.total} vs AC ${target?.ac || '?'})` : '';
          get().addEncounterLog(`⚔ ${active.name} → ${target?.name || '?'}: MISS${rollDetail}`);
        } else if (result.action === 'wait') {
          get().addEncounterLog(`⚔ ${active.name}: waits (no targets)`);
        } else if (result.action === 'move') {
          const dest = result.moveTo;
          get().addEncounterLog(`⚔ ${active.name}: moves to (${dest?.x},${dest?.y})`);
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
        console.error('Boss AI turn failed:', err);
        get().addEncounterLog(`\u2694 AI error: ${err.message} — falling back to basic attack`);
        // Fallback: use grunt AI so the enemy still does something
        try {
          const currentAreaId = get().currentAreaId;
          const area = get().areas?.[currentAreaId] || null;
          const collisionData = area?.wallEdges ? {
            wallEdges: area.wallEdges,
            cellBlocked: area.cellBlocked || new Uint8Array((area.width || 20) * (area.height || 20)),
          } : null;
          const fallbackResult = computeGruntAction(active, encounter.combatants, collisionData, area?.width || 20, area?.height || 20);
          if (fallbackResult.narrative) {
            const msg = { role: 'dm', speaker: 'Dungeon Master', text: fallbackResult.narrative, id: crypto.randomUUID(), timestamp: Date.now() };
            get().addNarratorMessage(msg);
            broadcastNarratorMessage(msg);
          }
          if (fallbackResult.targetId && fallbackResult.damage > 0) {
            get().applyEncounterDamage(fallbackResult.targetId, fallbackResult.damage);
            broadcastEncounterAction({ type: 'damage', targetId: fallbackResult.targetId, amount: fallbackResult.damage, userId: get().user?.id || 'system' });
          }
          const moveDest = fallbackResult.moveTo;
          if (moveDest && typeof moveDest.x === 'number') {
            const occupied = encounter.combatants.some(c => c.id !== active.id && c.position?.x === moveDest.x && c.position?.y === moveDest.y);
            if (!occupied) {
              const cost = fallbackResult.moveCost ?? 1;
              get().moveToken(active.id, moveDest.x, moveDest.y, cost);
              broadcastEncounterAction({ type: 'move', id: active.id, x: moveDest.x, y: moveDest.y, cost, userId: get().user?.id || 'system' });
            }
          }
        } catch (fallbackErr) {
          console.error('Grunt AI fallback also failed:', fallbackErr);
        }
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
      } catch (error) { console.warn('Combat narration failed:', error); }
    },

    setConcentration: (id, spell) =>
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map((c) =>
            c.id === id ? { ...c, concentration: spell || null } : c
          ),
          log: [`\ud83c\udfaf ${state.encounter.combatants.find(x => x.id === id)?.name} concentrates on ${spell}.`, ...state.encounter.log].slice(0, 30),
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
          log: [`\ud83c\udfaf ${state.encounter.combatants.find(x => x.id === id)?.name} dropped concentration.`, ...state.encounter.log].slice(0, 30),
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

    // === Combat (legacy simple tracker) ===
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
  };
}
