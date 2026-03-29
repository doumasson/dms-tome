import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { computeDerivedStats } from '../lib/derivedStats.js';
import { triggerLootAnimation } from '../components/game/LootAnimation';
import { broadcastEncounterAction } from '../lib/liveChannel';
import { autoLevelCharacter, stripToLevel } from '../lib/charBuilder';

/**
 * Character slice — player-owned characters, equipment, inventory, gold, XP.
 */
export function createCharacterSlice(set, get) {
  return {
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

    // === Active Character in Campaign ===
    myCharacter: null,   // This user's character in the active campaign (from campaign_members)
    setMyCharacter: (char) => set({ myCharacter: char }),
    partyMembers: [],    // All real players' characters (from campaign_members.character_data)
    setPartyMembers: (members) => set({ partyMembers: members }),

    // Save myCharacter changes to store + Supabase campaign_members
    updateMyCharacter: async (changes) => {
      const { myCharacter, activeCampaign, user } = get();
      if (!myCharacter) return;
      const updated = { ...myCharacter, ...changes };
      set({ myCharacter: updated });
      if (activeCampaign?.id && user?.id) {
        try {
          const { error, count } = await supabase
            .from('campaign_members')
            .update({ character_data: updated }, { count: 'exact' })
            .eq('campaign_id', activeCampaign.id)
            .eq('user_id', user.id);
          if (error) console.error('[updateMyCharacter] save error:', error.message, error);
          else if (count === 0) console.warn('[updateMyCharacter] 0 rows updated — campaign_id:', activeCampaign.id, 'user_id:', user.id);
        } catch (err) {
          console.error('[updateMyCharacter] exception:', err);
        }
      } else {
        console.warn('[updateMyCharacter] skipped — activeCampaign:', activeCampaign?.id, 'user:', user?.id);
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
        inventory.push({ ...equippedItems[slotName], instanceId: uuidv4() });
      }
      // Remove the item being equipped from inventory
      const idx = inventory.findIndex(i => i.instanceId === item.instanceId);
      if (idx !== -1) inventory.splice(idx, 1);
      equippedItems[slotName] = item;
      // Recompute all derived stats (AC, initiative, etc.) after equip
      const updatedCharacterEquip = { ...myCharacter, equippedItems, inventory };
      const derivedEquip = computeDerivedStats(updatedCharacterEquip);
      const updates = { equippedItems, inventory, ac: derivedEquip.ac, derivedStats: derivedEquip };
      get().updateMyCharacter(updates);
      // Sync AC to combat combatant if in combat
      const { encounter } = get();
      if (encounter.phase !== 'idle') {
        set(state => ({
          encounter: {
            ...state.encounter,
            combatants: state.encounter.combatants.map(c =>
              (c.id === myCharacter.id || c.name === myCharacter.name)
                ? { ...c, ac: derivedEquip.ac }
                : c
            ),
          },
        }));
      }
    },

    // Move equipped item back to inventory
    unequipItem: (slotName) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      const equippedItems = { ...(myCharacter.equippedItems || {}) };
      const item = equippedItems[slotName];
      if (!item) return;
      const inventory = [...(myCharacter.inventory || []), { ...item, instanceId: uuidv4() }];
      equippedItems[slotName] = null;
      // Recompute all derived stats (AC, initiative, etc.) after unequip
      const updatedCharacterUnequip = { ...myCharacter, equippedItems, inventory };
      const derivedUnequip = computeDerivedStats(updatedCharacterUnequip);
      const updates = { equippedItems, inventory, ac: derivedUnequip.ac, derivedStats: derivedUnequip };
      get().updateMyCharacter(updates);
      // Sync AC to combat combatant if in combat
      const { encounter } = get();
      if (encounter.phase !== 'idle') {
        set(state => ({
          encounter: {
            ...state.encounter,
            combatants: state.encounter.combatants.map(c =>
              (c.id === myCharacter.id || c.name === myCharacter.name)
                ? { ...c, ac: derivedUnequip.ac }
                : c
            ),
          },
        }));
      }
    },

    // Attune to a magic item (max 3 attuned items at once)
    attuneItem: (instanceId) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      const attuned = myCharacter.attunedItems || [];
      if (attuned.length >= 3) return; // max 3
      const item = Object.values(myCharacter.equippedItems || {}).find(i => i?.instanceId === instanceId);
      if (!item?.requiresAttunement) return;
      if (attuned.includes(instanceId)) return;
      const newAttuned = [...attuned, instanceId];
      const updated = { ...myCharacter, attunedItems: newAttuned };
      const derived = computeDerivedStats(updated);
      get().updateMyCharacter({ attunedItems: newAttuned, ac: derived.ac, derivedStats: derived });
    },

    // Remove attunement from a magic item (blocked if cursed)
    unattuneItem: (instanceId) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      const item = Object.values(myCharacter.equippedItems || {}).find(i => i?.instanceId === instanceId);
      if (item?.cursed) return; // can't un-attune cursed items
      const newAttuned = (myCharacter.attunedItems || []).filter(id => id !== instanceId);
      const updated = { ...myCharacter, attunedItems: newAttuned };
      const derived = computeDerivedStats(updated);
      get().updateMyCharacter({ attunedItems: newAttuned, ac: derived.ac, derivedStats: derived });
    },

    // Add an item to myCharacter's inventory
    addItemToInventory: (item) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      const inventory = [...(myCharacter.inventory || [])];
      // Trigger loot pickup animation (center screen → inventory)
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      triggerLootAnimation(item.name || 'Item', cx, cy);
      // Stack consumables by id
      if (item.type === 'consumable' || item.id) {
        const existing = inventory.find(i => i.id === item.id);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
          return get().updateMyCharacter({ inventory });
        }
      }
      inventory.push({ ...item, instanceId: uuidv4(), quantity: item.quantity || 1 });
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
        // Also update combatant HP if in combat — use applyEncounterHeal for
        // proper floating numbers and multiplayer broadcast
        if (encounter.phase !== 'idle') {
          const combatantId = encounter.combatants.find(c =>
            c.id === myCharacter.id || c.name === myCharacter.name
          )?.id;
          if (combatantId) {
            get().applyEncounterHeal(combatantId, healed);
            broadcastEncounterAction({ type: 'heal', targetId: combatantId, amount: healed, userId: get().user?.id || 'system' });
          }
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

    // Add gold to myCharacter (negative amount = spend; floor at 0 to prevent negative gold)
    addGold: (amount) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      const newGold = Math.max(0, (myCharacter.gold || 0) + amount);
      get().updateMyCharacter({ gold: newGold });
    },

    // Claim post-combat rewards: XP + gold in a single atomic write to avoid race conditions
    // Broadcasts to all players so everyone gets their share
    claimCombatRewards: (xpAmount, goldAmount) => {
      const { myCharacter } = get();
      if (!myCharacter) return;
      get().updateMyCharacter({
        xp: (myCharacter.xp || 0) + xpAmount,
        gold: (myCharacter.gold || 0) + goldAmount,
      });
      // Broadcast so all other players also get rewards
      broadcastEncounterAction({
        type: 'combat-rewards',
        xp: xpAmount,
        gold: goldAmount,
        claimedBy: myCharacter.name,
      });
    },

    // Notify that a character is ready to level up (sets a flag watched by GameLayout)
    pendingLevelUp: false,
    setPendingLevelUp: (val) => set({ pendingLevelUp: val }),

    // Post-combat loot screen trigger
    pendingLoot: null, // { enemies: [...], partySize: n } | null
    setPendingLoot: (val) => set({ pendingLoot: val }),

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
        if (!myChar) return state;

        // Save snapshot at CURRENT level before applying
        const snapshots = { ...(myChar.levelSnapshots || {}) };
        const { levelSnapshots: _, ...charWithoutSnapshots } = myChar;
        snapshots[String(myChar.level || 1)] = { ...charWithoutSnapshots };

        const updatedChar = { ...myChar, ...updates, levelSnapshots: snapshots };

        // Save snapshot at NEW level after applying
        const { levelSnapshots: _2, ...newCharWithoutSnapshots } = updatedChar;
        updatedChar.levelSnapshots[String(updatedChar.level)] = { ...newCharWithoutSnapshots };

        const updatedCampaignChars = state.campaign.characters.map(c =>
          (c.id === myChar?.id || c.name === myChar?.name)
            ? { ...c, ...updates, levelSnapshots: updatedChar.levelSnapshots }
            : c
        );
        return {
          myCharacter: updatedChar,
          campaign: { ...state.campaign, characters: updatedCampaignChars },
        };
      });
      get().saveCampaignToSupabase();
    },

    // Scale myCharacter to a target level using snapshots or auto-level/strip helpers
    scaleCharacterToLevel: (targetLevel) => {
      set((state) => {
        const myChar = state.myCharacter;
        if (!myChar) return state;
        const currentLevel = myChar.level || 1;
        if (currentLevel === targetLevel) return state;

        let scaledChar;
        if (targetLevel < currentLevel) {
          const snapshot = myChar.levelSnapshots?.[String(targetLevel)];
          if (snapshot) {
            scaledChar = { ...snapshot, levelSnapshots: myChar.levelSnapshots };
          } else {
            scaledChar = { ...stripToLevel(myChar, targetLevel), levelSnapshots: myChar.levelSnapshots || {} };
          }
        } else {
          scaledChar = { ...autoLevelCharacter(myChar, currentLevel, targetLevel), levelSnapshots: myChar.levelSnapshots || {} };
        }

        return { myCharacter: scaledChar };
      });
      get().updateMyCharacter({});
    },
  };
}
