import { v4 as uuidv4 } from 'uuid';
import { triggerEnemyTurn, computeGruntAction, computeMinionAction } from '../lib/enemyAi';
import { broadcastNarratorMessage, broadcastEncounterAction } from '../lib/liveChannel';
import { getSaveProficiencies, profBonus as getProfBonus } from '../lib/derivedStats.js';
import { checkPhaseTransition } from '../lib/bossPhases.js';
import { executeAbility, spawnMinions, isLegendaryAbility } from '../lib/abilityResolver.js';
import { checkEncounterDifficulty } from '../lib/encounterScaling.js';
import { findOATriggers, resolveOA } from '../lib/opportunityAttack.js';


/**
 * Encounter slice — unified scene + combat state, action economy, enemy AI.
 */
export function createEncounterSlice(set, get) {
  return {
    // === Encounter (unified scene + combat) ===
    damageEvents: [],  // [{ targetId, amount, type, timestamp }] — consumed by CombatPhase for floating numbers
    encounter: {
      phase: 'idle',       // 'idle' | 'initiative' | 'combat'
      combatants: [],      // See startEncounter for shape
      currentTurn: 0,
      round: 1,
      log: [],
      activeEffects: [],   // Persistent spell area overlays: [{ id, spellName, casterId, concentration, areaType, ...geometry }]
      hazards: [],         // Environmental hazards affecting the battlefield
    },
    lastCombatPosition: null,   // Saved player position when combat ends
    preCombatPositions: {},     // { [playerId]: {x,y} } — exploration positions saved when combat starts
    defeatedEnemies: {},        // { [areaId]: [enemyName, ...] } — prevents respawn in exploration
    showDeathOptions: false,    // Show respawn choice dialog after TPK

    startEncounter: (enemies, partyMembers, autoRollInitiative = false, { surprise = false, hazards = [], combatCenter = null, combatRadius = 10 } = {}) => {
      // Save pre-combat exploration positions for all party members so we can restore after combat
      const savedPositions = {};
      const areaId = get().currentAreaId;
      const areaPositions = get().areaTokenPositions?.[areaId] || {};
      partyMembers?.forEach(char => {
        const id = char.id || 'player';
        // Prefer areaTokenPositions (most accurate exploration position), fall back to char.position
        const pos = areaPositions[id] || char.position;
        if (pos) {
          savedPositions[id] = { x: pos.x, y: pos.y };
        }
      });
      console.log('[startEncounter] Saved pre-combat positions:', savedPositions);

      // Clear stealth when combat starts
      set({ stealthMode: null, preCombatPositions: savedPositions });
      const combatants = [];

      // Determine combat center from enemies or first party member
      const center = combatCenter
        || enemies?.find(e => e.position)?.position
        || partyMembers?.[0]?.position
        || { x: 10, y: 10 };

      // Scale enemy count to party size (skip for template-resolved enemies which have role field)
      const playerCount = Math.max(1, (partyMembers || []).length);
      let scaledEnemies = [...(enemies || [])];
      const isTemplateResolved = scaledEnemies.some(e => e.role);
      if (!isTemplateResolved) {
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
            id: group.id || uuidv4(),
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
            readiedAction: null,
            portrait: null,
          });
        }
      });

      // Add party members within combat radius — players too far away stay in exploration
      partyMembers?.forEach((rawChar) => {
        // Overlay fresh myCharacter data for the local player (handles stale partyMembers from Supabase)
        const myChar = get().myCharacter;
        const isLocal = myChar && (rawChar.id === myChar.id || rawChar.name === myChar.name);
        const char = isLocal ? { ...rawChar, ...myChar } : rawChar;

        // Check if player is within combat radius
        if (char.position && center) {
          const dx = (char.position.x || 0) - center.x;
          const dy = (char.position.y || 0) - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > combatRadius) {
            console.log(`[startEncounter] ${char.name} too far from combat (${Math.round(dist)} tiles), skipping`);
            return; // skip — this player stays in exploration
          }
        }

        // Try multiple sources for class
        let resolvedClass = char.class || char.className || char.characterClass || '';
        // If still empty, try to detect from myCharacter in store
        if (!resolvedClass && myChar?.name === char.name) {
          resolvedClass = myChar.class || myChar.className || '';
        }
        console.log('[startEncounter] Player combatant:', { name: char.name, class: resolvedClass, level: char.level, currentHp: char.currentHp, hp: char.hp, maxHp: char.maxHp, rawClass: char.class, hasEquipped: !!char.equippedItems });
        const spd = char.speed || 30;

        // Resolve attacks — prioritize equipped weapons, then weapons/attacks arrays, then class defaults
        const charStats = char.stats || {};
        const strMod = Math.floor(((charStats.str || 10) - 10) / 2);
        const dexMod = Math.floor(((charStats.dex || 10) - 10) / 2);
        const profBonus = Math.ceil((char.level || 1) / 4) + 1;
        const meleeBonus = Math.max(strMod, dexMod) + profBonus;

        let attacks = [];

        // 1. Build attacks from actually equipped weapons (most accurate)
        if (char.equippedItems) {
          const weaponSlots = ['mainHand', 'offHand', 'twoHanded'];
          for (const slot of weaponSlots) {
            const item = char.equippedItems[slot];
            if (item && item.damage) {
              const isFinesse = item.properties?.includes('finesse');
              const isRanged = item.category?.includes('ranged');
              const mod = isFinesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod);
              const bonus = mod + profBonus;
              attacks.push({
                name: item.name,
                bonus: `+${bonus}`,
                damage: `${item.damage}+${mod}`,
                range: item.range?.normal || null,
              });
            }
          }
          if (attacks.length > 0) {
            console.log('[startEncounter] Built attacks from equippedItems for', char.name, attacks);
          }
        }

        // 2. Fall back to explicit weapons/attacks arrays if no equipped weapons found
        if (attacks.length === 0) {
          attacks = (char.weapons || char.attacks || []).map(w =>
            typeof w === 'string'
              ? { name: w, bonus: '+0', damage: '1d6' }
              : { name: w.name || w, bonus: w.attackBonus || w.bonus || '+0', damage: w.damage || '1d6' }
          );
        }

        // 3. Last resort: class-based defaults
        if (attacks.length === 0) {
          switch (resolvedClass) {
            case 'Monk':
              attacks = [
                { name: 'Unarmed Strike', bonus: `+${meleeBonus}`, damage: `1d4+${dexMod}` },
                { name: 'Quarterstaff', bonus: `+${meleeBonus}`, damage: `1d6+${dexMod}` },
              ];
              break;
            case 'Fighter': case 'Paladin': case 'Barbarian': case 'Ranger':
              attacks = [
                { name: 'Longsword', bonus: `+${meleeBonus}`, damage: `1d8+${strMod}` },
                { name: 'Unarmed Strike', bonus: `+${meleeBonus}`, damage: `1+${strMod}` },
              ];
              break;
            case 'Rogue':
              attacks = [
                { name: 'Shortsword', bonus: `+${meleeBonus}`, damage: `1d6+${dexMod}` },
                { name: 'Dagger', bonus: `+${meleeBonus}`, damage: `1d4+${dexMod}` },
              ];
              break;
            case 'Cleric':
              attacks = [
                { name: 'Mace', bonus: `+${strMod + profBonus}`, damage: `1d6+${strMod}` },
                { name: 'Unarmed Strike', bonus: `+${meleeBonus}`, damage: `1+${strMod}` },
              ];
              break;
            case 'Wizard': case 'Sorcerer': case 'Warlock':
              attacks = [
                { name: 'Quarterstaff', bonus: `+${strMod + profBonus}`, damage: `1d6+${strMod}` },
                { name: 'Dagger', bonus: `+${meleeBonus}`, damage: `1d4+${dexMod}` },
              ];
              break;
            case 'Bard':
              attacks = [
                { name: 'Rapier', bonus: `+${dexMod + profBonus}`, damage: `1d8+${dexMod}` },
                { name: 'Dagger', bonus: `+${meleeBonus}`, damage: `1d4+${dexMod}` },
              ];
              break;
            case 'Druid':
              attacks = [
                { name: 'Quarterstaff', bonus: `+${strMod + profBonus}`, damage: `1d6+${strMod}` },
                { name: 'Scimitar', bonus: `+${dexMod + profBonus}`, damage: `1d6+${dexMod}` },
              ];
              break;
            default:
              attacks = [{ name: 'Unarmed Strike', bonus: `+${meleeBonus}`, damage: `1+${strMod}` }];
          }
          console.log('[startEncounter] Generated default attacks for', char.name, resolvedClass, attacks);
        }

        // Always include Unarmed Strike as an option
        if (!attacks.some(a => a.name?.includes('Unarmed'))) {
          attacks.push({ name: 'Unarmed Strike', bonus: `+${meleeBonus}`, damage: `1+${strMod}` });
        }

        // Monks always need Unarmed Strike in their attacks list (for Martial Arts)
        if (resolvedClass === 'Monk' && !attacks.some(a => a.name?.includes('Unarmed'))) {
          const charStats = char.stats || {};
          const dexMod = Math.floor(((charStats.dex || 10) - 10) / 2);
          const profB = Math.ceil((char.level || 1) / 4) + 1;
          const martialDie = (char.level || 1) >= 17 ? '1d10' : (char.level || 1) >= 11 ? '1d8' : (char.level || 1) >= 5 ? '1d6' : '1d4';
          attacks.push({ name: 'Unarmed Strike', bonus: `+${dexMod + profB}`, damage: `${martialDie}+${dexMod}` });
        }

        combatants.push({
          id: char.id || uuidv4(),
          name: char.name,
          type: 'player',
          class: resolvedClass,
          level: char.level || 1,
          initiative: null,
          maxHp: char.maxHp || char.hp || 10,
          currentHp: char.currentHp ?? char.hp ?? char.maxHp ?? 10,
          ac: char.ac || 10,
          speed: spd,
          remainingMove: Math.floor(spd / 5),
          actionsUsed: 0,
          bonusActionsUsed: 0,
          stats: char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          attacks,
          spells: char.spells || [],
          spellSlots: char.spellSlots || null,
          resourcesUsed: char.resourcesUsed || {},
          conditions: [],
          concentration: null,
          position: char.position || null,
          deathSaves: { successes: 0, failures: 0, stable: false },
          readiedAction: null,
          portrait: char.portrait || null,
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
            hazards,
            combatCenter: center,
            combatRadius,
          },
        });
        // Log enemies to bestiary
        const addToBestiary = get().addToBestiary;
        if (addToBestiary) {
          placed.filter(c => c.type === 'enemy').forEach(e => addToBestiary(e));
        }
      } else {
        set({
          encounter: {
            phase: 'initiative',
            combatants,
            currentTurn: 0,
            round: 1,
            log: ['Encounter started — roll initiative for all combatants.'],
            hazards,
          },
        });
      }
    },

    // Join an active combat mid-fight — rolls initiative and inserts into order
    joinEncounterMidCombat: (charData) => {
      const state = get();
      if (state.encounter.phase !== 'combat') return;
      // Don't add if already in combat
      if (state.encounter.combatants.some(c => c.id === charData.id || c.name === charData.name)) return;

      const dexMod = Math.floor(((charData.stats?.dex || 10) - 10) / 2);
      const initiative = Math.floor(Math.random() * 20) + 1 + dexMod;
      const spd = charData.speed || 30;

      const newCombatant = {
        id: charData.id || uuidv4(),
        name: charData.name,
        type: 'player',
        class: charData.class || '',
        level: charData.level || 1,
        initiative,
        maxHp: charData.maxHp || charData.hp || 10,
        currentHp: charData.currentHp ?? charData.hp ?? charData.maxHp ?? 10,
        ac: charData.ac || 10,
        speed: spd,
        remainingMove: Math.floor(spd / 5),
        actionsUsed: 0,
        bonusActionsUsed: 0,
        stats: charData.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        attacks: charData.attacks || [{ name: 'Unarmed Strike', bonus: '+2', damage: '1' }],
        spells: charData.spells || [],
        spellSlots: charData.spellSlots || null,
        resourcesUsed: charData.resourcesUsed || {},
        conditions: [],
        concentration: null,
        position: charData.position || null,
        deathSaves: { successes: 0, failures: 0, stable: false },
        readiedAction: null,
        portrait: charData.portrait || null,
      };

      // Insert into initiative order at the right spot
      set(s => {
        const combatants = [...s.encounter.combatants];
        let insertIdx = combatants.findIndex(c => (c.initiative || 0) < initiative);
        if (insertIdx === -1) insertIdx = combatants.length;
        combatants.splice(insertIdx, 0, newCombatant);
        // Adjust currentTurn if insert is before current
        const currentTurn = insertIdx <= s.encounter.currentTurn
          ? s.encounter.currentTurn + 1
          : s.encounter.currentTurn;
        return {
          encounter: {
            ...s.encounter,
            combatants,
            currentTurn,
            log: [`${charData.name} joins the fray! (Initiative: ${initiative})`, ...s.encounter.log].slice(0, 30),
          },
        };
      });

      broadcastEncounterAction({
        type: 'mid-combat-join',
        combatant: newCombatant,
      });

      get().addNarratorMessage?.({
        role: 'dm', speaker: 'Combat',
        text: `${charData.name} enters combat! (Initiative: ${initiative})`,
        id: uuidv4(), timestamp: Date.now(),
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

    checkCombatDifficulty: () => {
      const { encounter } = get();
      const difficultyInfo = checkEncounterDifficulty(encounter);

      if (difficultyInfo) {
        // Mark warning as shown
        set((state) => ({
          encounter: {
            ...state.encounter,
            difficultyWarningShown: true,
          },
        }));

        // Broadcast warning to all players
        if (difficultyInfo.warning) {
          const msg = {
            role: 'dm',
            speaker: 'The Narrator',
            text: difficultyInfo.warning,
            id: uuidv4(),
            timestamp: Date.now(),
          };
          get().addNarratorMessage(msg);
          broadcastNarratorMessage(msg);
        }

        // Suggest scaling if needed
        if (difficultyInfo.scaling) {
          const scalingMsg = {
            role: 'dm',
            speaker: 'The Narrator',
            text: `[DM Note] ${difficultyInfo.scaling.reason} (Difficulty: ${difficultyInfo.difficulty})`,
            id: uuidv4(),
            timestamp: Date.now(),
          };
          get().addNarratorMessage(scalingMsg);
          broadcastNarratorMessage(scalingMsg);
        }
      }
    },

    // === Readied Action ===
    setReadiedAction: (combatantId, readiedAction) => {
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === combatantId ? { ...c, readiedAction, reactionUsed: false } : c
          ),
        },
      }))
    },
    clearReadiedAction: (combatantId) => {
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === combatantId ? { ...c, readiedAction: null } : c
          ),
        },
      }))
    },

    nextEncounterTurn: () => {
      const state = get();
      const { combatants, currentTurn, round } = state.encounter;
      if (combatants.length === 0) return;

      // Check for party defeat — if NO player can take actions (all at 0 HP, whether dying or stable)
      const playersInCombat = combatants.filter(c => c.type !== 'enemy');
      const playersWhoCanAct = playersInCombat.filter(c => c.currentHp > 0);
      // Check if there are party members outside combat who could rescue
      const allParty = get().partyMembers || [];
      const playersOutsideCombat = allParty.filter(p =>
        !playersInCombat.some(c => c.id === p.id || c.name === p.name)
      );
      const hasRescuers = playersOutsideCombat.length > 0;
      if (playersWhoCanAct.length === 0 && !hasRescuers) {
        // All players down (dying or stable) — no one can act, combat is over
        get().addEncounterLog('\u2620 The party has fallen...');
        const msg = {
          role: 'dm', speaker: 'The Narrator',
          text: 'The party has been defeated. Darkness closes in... but fate is not yet done with you.',
          id: uuidv4(), timestamp: Date.now(),
        };
        get().addNarratorMessage(msg);
        broadcastNarratorMessage(msg);
        setTimeout(() => {
          get().endEncounterWithDefeat();
        }, 2500);
        return;
      }

      // Find next combatant who can actually act (skip dead, unconscious, stable, stunned, paralyzed)
      const cannotAct = (c) => {
        // Dead (3 failed death saves)
        if (c.currentHp <= 0 && c.deathSaves?.failures >= 3) return true;
        // Unconscious at 0 HP (dying or stable — can't take turns either way)
        if (c.currentHp <= 0) return true;
        // Unconscious condition (from Sleep or other effects)
        if (c.conditions?.includes('Unconscious')) return true;
        return false;
      };
      let nextTurn = currentTurn;
      let nextRound = round;
      let attempts = 0;
      do {
        const isLast = nextTurn >= combatants.length - 1;
        nextTurn = isLast ? 0 : nextTurn + 1;
        if (isLast) nextRound = nextRound + 1;
        attempts++;
      } while (cannotAct(combatants[nextTurn]) && attempts < combatants.length);

      // If ALL combatants can't act (everyone unconscious/dead), end combat
      if (attempts >= combatants.length && cannotAct(combatants[nextTurn])) {
        get().addEncounterLog('All combatants are incapacitated. Combat ends.');
        get().endEncounter();
        return;
      }

      const roundChanged = nextRound !== round;
      if (roundChanged) {
        // Each combat round is 6 seconds in D&D 5e
        get().advanceGameTime(6 / 3600);
      }
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
          readiedAction: null,
          usedLegendaryActions: 0, // Reset legendary action budget at start of boss turn
        } : c
      );

      // Check for boss phase transition
      let finalCombatants = updated;
      const activeCombatant = updated[nextTurn];
      if (activeCombatant && activeCombatant.phases && activeCombatant.phases.length > 0) {
        const newPhase = checkPhaseTransition(activeCombatant);
        if (newPhase && newPhase.number !== activeCombatant.bossPhase) {
          // Phase transition occurred
          const oldPhase = activeCombatant.bossPhase || 1;
          finalCombatants = updated.map((c, i) =>
            i === nextTurn ? {
              ...c,
              bossPhase: newPhase.number,
              currentHp: c.currentHp, // Maintain current HP across phase
            } : c
          );
          // Log phase change
          log.unshift(`⚡ ${activeCombatant.name} enters Phase ${newPhase.number}! ${newPhase.description}`);
          // Broadcast phase change to all clients
          broadcastEncounterAction({
            type: 'boss-phase-change',
            bossId: activeCombatant.id,
            bossName: activeCombatant.name,
            newPhase: newPhase.number,
            description: newPhase.description,
            userId: get().user?.id || 'system',
          });
        }
      }

      set({
        encounter: {
          ...state.encounter,
          combatants: finalCombatants,
          currentTurn: nextTurn,
          round: nextRound,
          log: log.slice(0, 30),
        },
      });
    },

    applyEncounterDamage: (targetId, amount, damageType) => {
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

          // Wild Shape revert: when beast form drops to 0, revert to original form
          if (newHp === 0 && c.wildShape) {
            const overflow = amount - c.currentHp; // excess damage carries over
            const revertHp = Math.max(0, c.wildShape.originalHp - overflow);
            return {
              ...c,
              currentHp: revertHp,
              maxHp: c.wildShape.originalMaxHp,
              ac: c.wildShape.originalAc,
              speed: c.wildShape.originalSpeed,
              wildShape: null,
              ...(revertHp === 0 && c.type === 'player' ? { concentration: null, deathSaves: { successes: 0, failures: 0, stable: false } } : {}),
            };
          }

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
      // Emit damage event so CombatPhase can show floating numbers (works for all clients)
      set(s => ({ damageEvents: [...s.damageEvents, { targetId, amount, type: damageType || (amount > 0 ? 'damage' : 'miss'), timestamp: Date.now() }] }));
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
          // Generate combat summary
          const rounds = afterDmg.round || 1;
          const enemyNames = [...new Set(deadEnemies.map(e => e.name?.replace(/\s+\d+$/, '') || 'enemy'))];
          const partyHurt = afterDmg.combatants.filter(c => c.type === 'player' && c.currentHp < c.maxHp);
          const summary = `Victory! ${deadEnemies.length} ${deadEnemies.length === 1 ? 'enemy' : 'enemies'} defeated (${enemyNames.join(', ')}) in ${rounds} ${rounds === 1 ? 'round' : 'rounds'}.${partyHurt.length > 0 ? ` ${partyHurt.length} party ${partyHurt.length === 1 ? 'member' : 'members'} wounded.` : ' No casualties.'}`;
          get().addNarratorMessage({ role: 'dm', speaker: 'The Narrator', text: summary });
          setTimeout(() => get().endEncounter(), 2000);
        }
      }
    },

    applyEncounterHeal: (targetId, amount) => {
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
      });
      // Emit heal event for floating numbers
      set(s => ({ damageEvents: [...s.damageEvents, { targetId, amount, type: 'heal', timestamp: Date.now() }] }));
    },

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
          if (successes >= 3) { newHp = 1; successes = 0; failures = 0; stable = false; logMsg = `${c.name} succeeds 3 death saves \u2014 revived with 1 HP!`; }
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
          if (successes >= 3) { newHp = 1; successes = 0; failures = 0; stable = false; logMsg = `${c.name} succeeds 3 death saves \u2014 revived with 1 HP!`; }
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

    addEncounterLog: (entry) => {
      // Auto-detect log entry type from content for color-coding
      const lower = (entry || '').toLowerCase()
      let logType = 'combat'
      let icon = '⚔'
      if (lower.includes('miss')) { logType = 'miss'; icon = '○' }
      else if (lower.includes('crit')) { logType = 'crit'; icon = '💥' }
      else if (lower.includes('heal') || lower.includes('💚')) { logType = 'heal'; icon = '💚' }
      else if (lower.includes('dmg') || lower.includes('damage') || lower.includes('hit')) { logType = 'hit'; icon = '⚔' }
      else if (lower.includes('spell') || lower.includes('cast') || lower.includes('✨')) { logType = 'spell'; icon = '✨' }
      else if (lower.includes('save') || lower.includes('saving')) { logType = 'save'; icon = '🛡' }
      set((state) => ({
        encounter: {
          ...state.encounter,
          log: [entry, ...state.encounter.log].slice(0, 30),
        },
        sessionLog: [
          { id: uuidv4(), timestamp: Date.now(), type: logType, icon, title: entry, detail: null },
          ...state.sessionLog,
        ].slice(0, 120),
      }))
    },

    addEncounterCondition: (id, condition) => {
      const CONDITION_DESC = {
        Poisoned: 'Disadvantage on attacks and ability checks',
        Stunned: 'Cannot move or act, auto-fail STR/DEX saves',
        Paralyzed: 'Cannot move or act, attacks within 5ft auto-crit',
        Frightened: 'Disadvantage on attacks while source visible',
        Charmed: 'Cannot attack the charmer',
        Blinded: 'Attacks have disadvantage, enemies have advantage',
        Restrained: 'Speed 0, attacks have disadvantage',
        Prone: 'Melee attacks have advantage, ranged disadvantage',
        Grappled: 'Speed reduced to 0',
        Invisible: 'Attacks have advantage, enemies have disadvantage',
        Concentrating: 'Maintaining a spell effect',
        Dodging: 'Attacks against have disadvantage',
        Hidden: 'Enemies cannot see you',
        Turned: 'Must flee from the source',
        Raging: '+2 melee damage, resistance to physical',
      }
      const target = get().encounter.combatants?.find(c => c.id === id)
      if (target && !target.conditions?.includes(condition)) {
        const desc = CONDITION_DESC[condition]
        if (desc) {
          get().addEncounterLog(`⚡ ${target.name}: ${condition} — ${desc}`)
        }
      }
      set((state) => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map((c) =>
            c.id === id && !c.conditions.includes(condition)
              ? { ...c, conditions: [...c.conditions, condition] }
              : c
          ),
        },
      }))
    },

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

    // End encounter after TPK — show death options dialog
    endEncounterWithDefeat: () => {
      const wasInCombat = get().encounter.phase !== 'idle';
      console.log('[endEncounterWithDefeat] Ending combat with defeat — clearing all combat state, wasInCombat:', wasInCombat);
      // End combat phase but don't auto-revive — let the player choose
      set({
        encounter: {
          phase: 'idle',
          combatants: [],
          currentTurn: 0,
          round: 1,
          log: [],
          activeEffects: [],
        },
        preCombatPositions: {},  // Clear saved positions
        showDeathOptions: true,
      });
      // Only broadcast if we were actually in combat (prevents infinite broadcast loop)
      if (wasInCombat) {
        broadcastEncounterAction({ type: 'end-encounter-defeat', userId: get().user?.id || 'system' });
      }
      // Persist idle state immediately so refresh doesn't restore old combat
      setTimeout(() => get().saveSessionStateToSupabase(), 0);
    },

    // Mercy revive — player chose to continue after TPK
    mercyRevive: () => {
      const state = get();

      // Revive character at 1 HP
      if (state.myCharacter) {
        const hpChanges = {
          currentHp: 1,
          hp: 1,
          conditions: [],
        };
        set(prev => ({
          myCharacter: { ...prev.myCharacter, ...hpChanges },
          showDeathOptions: false,
        }));
        setTimeout(() => get().updateMyCharacter(hpChanges), 0);
      } else {
        set({ showDeathOptions: false });
      }

      // Move player to safe spawn point (area's playerStart)
      const currentAreaId = get().currentAreaId;
      const area = get().areas?.[currentAreaId] || null;
      const respawnPos = area?.playerStart || null;

      set({
        respawnPosition: respawnPos,
        defeatReset: true,
        stealthMode: null, // Clear stealth on resurrect
      });

      // Narrate the revival
      const reviveMsg = {
        role: 'dm', speaker: 'The Narrator',
        text: 'You wake up bruised but alive, the taste of dirt and blood in your mouth. Fate has granted you another chance...',
        id: uuidv4(), timestamp: Date.now(),
      };
      get().addNarratorMessage(reviveMsg);
      broadcastNarratorMessage(reviveMsg);

      // Broadcast to all players so they also revive at 1 HP
      broadcastEncounterAction({
        type: 'mercy-revive',
        respawnPosition: respawnPos,
      });

      setTimeout(() => get().saveSessionStateToSupabase(), 0);
    },

    endEncounter: () => {
      const state = get()
      const { combatants } = state.encounter

      // Restore pre-combat exploration position (NOT combat grid position)
      const preCombatPositions = state.preCombatPositions || {};
      let lastCombatPosition = null;
      if (combatants?.length && state.myCharacter) {
        const playerId = state.myCharacter.id || 'player';
        // Use saved pre-combat position if available, otherwise fall back to combat position
        const preCombatPos = preCombatPositions[playerId];
        const myCombatant = combatants.find(c =>
          c.type === 'player' && (c.id === state.myCharacter.id || c.name === state.myCharacter.name)
        );
        if (preCombatPos) {
          lastCombatPosition = { ...preCombatPos };
          console.log('[endEncounter] Restoring pre-combat position for', state.myCharacter.name, preCombatPos);
        } else if (myCombatant?.position) {
          lastCombatPosition = { ...myCombatant.position };
          console.log('[endEncounter] No pre-combat position saved, using combat position for', state.myCharacter.name);
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
          setTimeout(() => {
            get().updateMyCharacter(hpChanges)
            // Also sync campaign.characters so saveCampaignToSupabase doesn't overwrite with stale HP
            const state = get()
            const myChar = state.myCharacter
            if (myChar && state.campaign?.characters) {
              set(prev => ({
                campaign: {
                  ...prev.campaign,
                  characters: prev.campaign.characters.map(c =>
                    (c.id === myChar.id || c.name === myChar.name)
                      ? { ...c, currentHp: myChar.currentHp, hp: myChar.currentHp, conditions: myChar.conditions, spellSlots: myChar.spellSlots }
                      : c
                  ),
                },
              }))
              get().saveCampaignToSupabase()
            }
          }, 0)
        }
      }

      // Track defeated enemies so they don't respawn in exploration.
      // When combat ends in victory (all enemies dead), mark ALL original zone
      // enemies as defeated — not just the scaled-down combatants that were in the fight.
      const areaId = state.currentAreaId
      const allEnemiesDead = (combatants || []).every(c => c.type !== 'enemy' || (c.currentHp ?? 0) <= 0)

      const defeatedUpdate = {}
      if (areaId) {
        if (allEnemiesDead) {
          // Victory: mark ALL zone enemies as defeated (covers scaling mismatch)
          const area = state.areas?.[areaId]
          const allZoneEnemyNames = (area?.enemies || []).map(e => e.name)
          // Also include combatant names in case zone.enemies doesn't cover them
          const combatEnemyNames = (combatants || []).filter(c => c.type === 'enemy').map(e => e.name)
          const allNames = [...new Set([...allZoneEnemyNames, ...combatEnemyNames])]
          if (allNames.length > 0) {
            defeatedUpdate.defeatedEnemies = {
              ...state.defeatedEnemies,
              [areaId]: [...new Set([...(state.defeatedEnemies?.[areaId] || []), ...allNames])],
            }
          }

          // Check chapter milestone: defeat_boss
          const milestone = get().campaign?.chapterMilestone
          if (milestone?.trigger === 'defeat_boss') {
            const checkChapterMilestone = get().checkChapterMilestone
            if (checkChapterMilestone) {
              checkChapterMilestone('defeat_boss', milestone.targetId)
            }
          }
        } else {
          // Partial victory: only mark actually killed enemies
          const deadNames = (combatants || []).filter(c => c.type === 'enemy' && (c.currentHp ?? 0) <= 0).map(e => e.name)
          if (deadNames.length > 0) {
            defeatedUpdate.defeatedEnemies = {
              ...state.defeatedEnemies,
              [areaId]: [...(state.defeatedEnemies?.[areaId] || []), ...deadNames],
            }
          }
        }
      }

      // Update area token positions: restore ALL players to their pre-combat exploration positions
      const posUpdate = {};
      // areaId already declared above from state.currentAreaId
      if (areaId) {
        const updatedAreaPositions = { ...(state.areaTokenPositions?.[areaId] || {}) };
        // Restore pre-combat positions for all players (not just local player)
        for (const [pid, pos] of Object.entries(preCombatPositions)) {
          if (pos) {
            updatedAreaPositions[pid] = { ...pos };
          }
        }
        // Also ensure local player position is set
        if (lastCombatPosition) {
          const playerId = state.myCharacter?.id || 'player';
          updatedAreaPositions[playerId] = lastCombatPosition;
        }
        posUpdate.areaTokenPositions = {
          ...state.areaTokenPositions,
          [areaId]: updatedAreaPositions,
        };
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
        preCombatPositions: {},  // Clear saved positions
        respawnPosition: null,  // Clear respawn so it doesn't teleport after next combat
        ...defeatedUpdate,
        ...posUpdate,
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

      // Check if all players IN COMBAT are unable to act (0 HP — dying or stable) — end combat immediately
      const playersWhoCanAct = encounter.combatants.filter(c =>
        c.type !== 'enemy' && c.currentHp > 0
      );
      if (playersWhoCanAct.length === 0) {
        console.log('[runEnemyTurn] All players in combat are down — ending combat with defeat')
        get().addEncounterLog('\u2620 All combatants have fallen...');
        const msg = {
          role: 'dm', speaker: 'The Narrator',
          text: 'The party has been defeated. Darkness closes in... but fate is not yet done with you.',
          id: uuidv4(), timestamp: Date.now(),
        };
        get().addNarratorMessage(msg);
        broadcastNarratorMessage(msg);
        setTimeout(() => get().endEncounterWithDefeat(), 2000);
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

      // Determine enemy type: minion > boss > grunt
      const isMinion = active.originalName && active.originalName !== active.name;
      const isBoss = !isMinion && (active.isBoss || (active.cr != null && Number(active.cr) >= 5));
      console.log('[runEnemyTurn] Enemy type - isMinion:', isMinion, 'isBoss:', isBoss, 'name:', active.name, 'cr:', active.cr)

      try {
        let result;

        if (isMinion) {
          // Minion path: tactical coordination with boss
          result = computeMinionAction(active, encounter);
        } else if (isBoss) {
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

            // Check for opportunity attacks from players when enemy moves away
            const movePath = result.movePath || (from ? [from, { x, y }] : null);
            if (movePath && !active.disengaged) {
              const alivePlayers = encounter.combatants.filter(c =>
                c.type === 'player' && (c.currentHp ?? 0) > 0 && c.position && !c.reactionUsed
              );
              const oaTriggers = findOATriggers(movePath, alivePlayers, false);
              for (const { enemy: player } of oaTriggers) {
                const oaResult = resolveOA(player, active);
                if (oaResult.hit && oaResult.damage > 0) {
                  get().applyEncounterDamage(active.id, oaResult.damage);
                }
                // Mark player's reaction as used
                set(state => ({
                  encounter: {
                    ...state.encounter,
                    combatants: state.encounter.combatants.map(c =>
                      c.id === player.id ? { ...c, reactionUsed: true } : c
                    ),
                  },
                }));
                const oaText = oaResult.hit
                  ? `⚔ ${player.name} takes an opportunity attack against ${active.name} with ${oaResult.weaponName} — ${oaResult.damage} damage${oaResult.isCrit ? ' (CRITICAL!)' : ''}!`
                  : `⚔ ${player.name} takes an opportunity attack against ${active.name} but misses!`;
                get().addEncounterLog(oaText);
                broadcastNarratorMessage({ role: 'dm', speaker: 'Combat', text: oaText, id: uuidv4(), timestamp: Date.now() });
              }
            }

            get().moveToken(active.id, x, y, cost);
            broadcastEncounterAction({
              type: 'move',
              id: active.id,
              x, y, cost,
              userId: get().user?.id || 'system',
            });
          }
        }

        // Execute boss ability if specified
        if (result.abilityToUse && active.phases) {
          const targets = encounter.combatants.filter(c => c.type === 'player' && c.currentHp > 0);
          const abilityResult = executeAbility(result.abilityToUse, active, targets, encounter);

          // Log ability activation
          get().addEncounterLog(`✨ ${active.name} uses ${result.abilityToUse}! ${abilityResult.narrative}`);
          broadcastEncounterAction({
            type: 'boss-ability',
            bossId: active.id,
            bossName: active.name,
            ability: result.abilityToUse,
            narrative: abilityResult.narrative,
            userId: get().user?.id || 'system',
          });

          // Apply ability effects
          if (abilityResult.damage > 0 && abilityResult.affectedTargets?.length) {
            abilityResult.affectedTargets.forEach(targetId => {
              get().applyEncounterDamage(targetId, abilityResult.damage);
              broadcastEncounterAction({
                type: 'damage',
                targetId,
                amount: abilityResult.damage,
                userId: get().user?.id || 'system',
              });
            });
          }

          // Apply healing if regeneration or other heal ability
          if (abilityResult.healTarget && abilityResult.healAmount > 0) {
            get().applyEncounterHeal(abilityResult.healTarget, abilityResult.healAmount);
            get().addEncounterLog(`💚 ${active.name} heals ${abilityResult.healAmount} HP`);
          }

          // Apply conditions from ability
          if (abilityResult.conditions?.length) {
            abilityResult.conditions.forEach(cond => {
              const targets = abilityResult.affectedTargets || encounter.combatants
                .filter(c => c.type === 'player').map(c => c.id);
              targets.forEach(targetId => {
                get().addEncounterCondition(targetId, cond.type || cond);
                broadcastEncounterAction({
                  type: 'add-condition',
                  id: targetId,
                  condition: cond.type || cond,
                  userId: get().user?.id || 'system',
                });
              });
            });
          }

          // Spawn minions if ability triggers spawning
          if (abilityResult.minionSpawn) {
            const newMinions = spawnMinions(abilityResult.minionSpawn, active.position, encounter.combatants);
            set((state) => ({
              encounter: {
                ...state.encounter,
                combatants: [...state.encounter.combatants, ...newMinions],
              },
            }));
            newMinions.forEach(minion => {
              broadcastEncounterAction({
                type: 'minion-spawn',
                minion,
                userId: get().user?.id || 'system',
              });
            });
            get().addEncounterLog(`⚔ ${newMinions.length} minions spawn!`);
          }

          // Track legendary action usage
          if (isLegendaryAbility(result.abilityToUse)) {
            set((state) => ({
              encounter: {
                ...state.encounter,
                combatants: state.encounter.combatants.map((c) =>
                  c.id === active.id
                    ? { ...c, usedLegendaryActions: (c.usedLegendaryActions || 0) + 1 }
                    : c
                ),
              },
            }));
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
            role: 'dm', speaker: 'The Narrator',
            text: result.narrative,
            id: uuidv4(), timestamp: Date.now(),
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
            const msg = { role: 'dm', speaker: 'The Narrator', text: fallbackResult.narrative, id: uuidv4(), timestamp: Date.now() };
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
    // Combat narration disabled — was making an API call for EVERY attack/spell/action
    // causing constant TTS and flooding the chat with AI-generated play-by-play
    narrateCombatAction: async () => {},

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
    // Preserve local player's combat position (DM may have stale data for remote players)
    syncEncounterDown: (encounterData) => {
      const myChar = get().myCharacter;
      if (!myChar || !encounterData?.combatants) {
        set({ encounter: encounterData });
        return;
      }
      // Find our combatant in the incoming data and preserve our local position
      const localCombatant = get().encounter?.combatants?.find(
        c => c.type === 'player' && (c.id === myChar.id || c.name === myChar.name)
      );
      if (localCombatant?.position) {
        const combatants = encounterData.combatants.map(c => {
          if (c.type === 'player' && (c.id === myChar.id || c.name === myChar.name)) {
            return { ...c, position: localCombatant.position };
          }
          return c;
        });
        set({ encounter: { ...encounterData, combatants } });
      } else {
        set({ encounter: encounterData });
      }
    },

    // === Combat (legacy simple tracker) ===
    combat: {
      combatants: [],
      currentTurn: 0,
      round: 1,
    },
    addCombatant: (combatant) =>
      set((state) => {
        const newCombatant = {
          id: uuidv4(),
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
