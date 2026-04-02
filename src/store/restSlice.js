import { getClassResources } from '../lib/classResources';
import { CLASSES } from '../data/classes';
import { broadcastEncounterAction } from '../lib/liveChannel';
import { buildSpellSlots } from '../lib/charBuilder';

/**
 * Rest slice — short rest, long rest, hit dice spending.
 */
export function createRestSlice(set, get) {
  return {
    shortRest: () => {
      // Restore short-rest class resources (HP recovery happens via spendHitDie calls)
      set((state) => {
        const updatedChars = state.campaign.characters.map((c) => {
          const defs = getClassResources(c.class, c.level, c.stats);
          const restored = { ...c.resourcesUsed };
          defs.filter(r => r.resetOn === 'short').forEach(r => { restored[r.name] = 0; });
          return { ...c, resourcesUsed: restored };
        });

        // Also update myCharacter so the HUD reflects restored resources immediately
        let updatedMyChar = state.myCharacter;
        if (state.myCharacter) {
          const match = updatedChars.find(c =>
            c.id === state.myCharacter.id || c.name === state.myCharacter.name
          );
          if (match) {
            updatedMyChar = { ...state.myCharacter, resourcesUsed: match.resourcesUsed };
          } else {
            // myCharacter not in campaign.characters — restore directly
            const defs = getClassResources(state.myCharacter.class, state.myCharacter.level, state.myCharacter.stats);
            const restored = { ...state.myCharacter.resourcesUsed };
            defs.filter(r => r.resetOn === 'short').forEach(r => { restored[r.name] = 0; });
            updatedMyChar = { ...state.myCharacter, resourcesUsed: restored };
          }
        }

        return {
          myCharacter: updatedMyChar,
          campaign: { ...state.campaign, characters: updatedChars },
          encounter: {
            ...state.encounter,
            log: ['\ud83c\udf19 Short rest \u2014 short-rest resources restored.', ...state.encounter.log].slice(0, 30),
          },
        };
      });
      // Don't auto-spend hit dice — let the player use the hit dice roller UI in RestModal
      // Notify all players via narrator
      const charName = get().myCharacter?.name || 'The party'
      const msg = { role: 'dm', speaker: 'System', text: `${charName} takes a short rest. Class resources restored.`, id: crypto.randomUUID?.() || Date.now().toString(), timestamp: Date.now() }
      get().addNarratorMessage?.(msg)
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
          log: [`\ud83c\udfb2 ${char.name} spends a hit die: d${hitDie}(${roll})${conMod >= 0 ? '+' : ''}${conMod} = +${healed} HP`, ...state.encounter.log].slice(0, 30),
        },
      }));
      // Broadcast HP change to all players
      broadcastEncounterAction({ type: 'rest-hp-update', charId: char.id, charName: char.name, currentHp: newHp, maxHp: char.maxHp });
      get().saveCampaignToSupabase();

      return { roll, healed, remaining, newHp };
    },

    longRest: () => {
      set((state) => {
        const updatedChars = state.campaign.characters.map((c) => {
          // Restore all spell slots to full (used: 0)
          let spellSlots = c.spellSlots
          if (spellSlots && Object.keys(spellSlots).length > 0) {
            spellSlots = Object.fromEntries(
              Object.entries(spellSlots).map(([lvl, s]) => [lvl, { ...s, used: 0 }])
            )
          } else if (c.class) {
            // Rebuild spell slots from class/level if missing
            spellSlots = buildSpellSlots(c.class, c.level || 1)
          }
          // Long rest restores half your level in hit dice (minimum 1)
          const totalHitDice = c.level || 1;
          const restored = Math.max(1, Math.floor(totalHitDice / 2));
          const current = c.hitDiceRemaining ?? totalHitDice;
          const hitDiceRemaining = Math.min(totalHitDice, current + restored);
          // Recharge magic item charges on long rest (dawn recharge)
          const recharged = { ...(c.equippedItems || {}) };
          for (const [slot, item] of Object.entries(recharged)) {
            if (item?.charges?.recharge === 'dawn') {
              const roll = Math.floor(Math.random() * 6) + 1 + 1; // 1d6+1
              recharged[slot] = {
                ...item,
                charges: { ...item.charges, current: Math.min(item.charges.max, item.charges.current + roll) },
              };
            }
          }
          return { ...c, currentHp: c.maxHp, conditions: [], resourcesUsed: {}, spellSlots, hitDiceRemaining, equippedItems: recharged };
        });
        // Also restore HP for player combatants in an active encounter
        const updatedCombatants = state.encounter.combatants.map((c) => {
          if (c.type !== 'player') return c;
          return { ...c, currentHp: c.maxHp, conditions: [], deathSaves: { successes: 0, failures: 0, stable: false } };
        });

        // Update myCharacter directly so the HUD reflects full heal immediately
        let updatedMyChar = state.myCharacter;
        if (state.myCharacter) {
          const match = updatedChars.find(c =>
            c.id === state.myCharacter.id || c.name === state.myCharacter.name
          );
          if (match) {
            updatedMyChar = {
              ...state.myCharacter,
              currentHp: match.maxHp,
              hp: match.maxHp,
              maxHp: match.maxHp,
              conditions: [],
              resourcesUsed: {},
              spellSlots: match.spellSlots,
              hitDiceRemaining: match.hitDiceRemaining,
              equippedItems: match.equippedItems,
            };
          } else {
            // myCharacter not in campaign.characters — heal directly
            const mySlots = state.myCharacter.spellSlots && Object.keys(state.myCharacter.spellSlots).length > 0
              ? Object.fromEntries(Object.entries(state.myCharacter.spellSlots).map(([lvl, s]) => [lvl, { ...s, used: 0 }]))
              : buildSpellSlots(state.myCharacter.class, state.myCharacter.level || 1)
            updatedMyChar = {
              ...state.myCharacter,
              currentHp: state.myCharacter.maxHp,
              hp: state.myCharacter.maxHp,
              conditions: [],
              resourcesUsed: {},
              spellSlots: mySlots,
            };
          }
        }

        return {
          campaign: { ...state.campaign, characters: updatedChars },
          myCharacter: updatedMyChar,
          encounter: {
            ...state.encounter,
            combatants: updatedCombatants,
            log: ['\u2600\ufe0f Long rest taken \u2014 all HP and resources restored.', ...state.encounter.log].slice(0, 30),
          },
        };
      });
      // Notify all players via narrator
      const charName = get().myCharacter?.name || 'The party'
      const msg = { role: 'dm', speaker: 'System', text: `${charName} completes a long rest. Full HP, spell slots, and resources restored.`, id: crypto.randomUUID?.() || Date.now().toString(), timestamp: Date.now() }
      get().addNarratorMessage?.(msg)
      // Broadcast rest completion so all players restore HP
      // Include both campaign.characters AND partyMembers to cover all multiplayer players
      const campChars = get().campaign.characters || []
      const party = get().partyMembers || []
      const seenIds = new Set()
      const allChars = []
      for (const c of [...campChars, ...party]) {
        const key = c.id || c.name
        if (seenIds.has(key)) continue
        seenIds.add(key)
        allChars.push({
          id: c.id, name: c.name, userId: c.userId,
          currentHp: c.maxHp, maxHp: c.maxHp,
          hitDiceRemaining: c.hitDiceRemaining, conditions: [],
          spellSlots: c.spellSlots ? Object.fromEntries(Object.entries(c.spellSlots).map(([lvl, s]) => [lvl, { ...s, used: 0 }])) : c.spellSlots,
        })
      }
      broadcastEncounterAction({ type: 'rest-complete', restType: 'long', characters: allChars });
      get().saveCampaignToSupabase();
      get().saveSettingsToSupabase();
    },
  };
}
