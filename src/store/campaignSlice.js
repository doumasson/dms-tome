import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { getClassResources } from '../lib/classResources';
import { computeAcFromEquipped } from '../data/equipment';
import { buildPollinationsUrl } from '../lib/dalleApi';
import { notifySaveStart, notifySaveComplete, notifySaveError } from '../components/game/AutoSaveIndicator';
import { normalizeCampaignData } from '../lib/campaignSchema';

/**
 * Campaign slice — campaign data, scenes, campaign-owned characters, notes, saving/loading.
 */
export function createCampaignSlice(set, get) {
  return {
    // === Auth ===
    user: null,
    setUser: (user) => set({ user }),

    // === Formation ===
    formation: { front: [], back: [] },
    setFormation: (formation) => set({ formation }),

    // === Active Campaign (Supabase record) ===
    activeCampaign: null,
    isDM: false,
    setActiveCampaign: (campaign) => {
      const user = get().user;
      const isDM = !!(campaign && user && campaign.dm_user_id === user.id);
      // Host starts with dmMode OFF — AI DM runs automatically via isDM;
      // dmMode is only for manual host override tools
      set({ activeCampaign: campaign, isDM, dmMode: false });
    },
    clearActiveCampaign: () => set({ activeCampaign: null, isDM: false, dmMode: false, myCharacter: null, partyMembers: [] }),
    resetCampaign: () => set({
      campaign: {
        title: '', scenes: [], characters: [], loaded: false,
        currentSceneIndex: 0, notes: { dm: '', shared: '' },
        savedEncounters: [], questObjectives: [],
      },
      activeCampaign: null,
      encounter: { phase: 'idle', combatants: [], currentTurn: 0, round: 1, log: [], activeEffects: [] },
      respawnPosition: null, lastCombatPosition: null, preCombatPositions: {}, defeatedEnemies: {}, defeatReset: false,
      partyMembers: [], narrator: { history: [], open: false },
      sessionApiKey: null, isDM: false, dmMode: false, myCharacter: null,
      // V2 world state
      currentAreaId: null, areas: {}, areaBriefs: {}, areaLayers: null,
      areaTokenPositions: {}, fogBitfields: {}, roofStates: {},
      sceneImages: {}, sceneTokenPositions: {},
      // Story state
      storyFlags: new Set(), journal: [], npcBusy: null,
      activeCutscene: null, stealthMode: null,
      campaignComplete: false,
    }),
    setIsDM: (value) => set({ isDM: value, dmMode: value }),

    // === DM Mode ===
    dmMode: false,
    toggleDmMode: () => set((state) => ({ dmMode: !state.dmMode })),

    // === Campaign ===
    campaign: {
      title: '',
      scenes: [],
      characters: [],
      loaded: false,
      currentSceneIndex: 0,
      notes: { dm: '', shared: '' },
      savedEncounters: [],
      questObjectives: [],
    },
    loadCampaign: (data) => {
      const normalized = normalizeCampaignData(data);
      return set({
        campaign: {
          ...normalized,
          title: normalized.title,
          scenes: normalized.scenes || [],
          characters: (normalized.characters || []).map(c => ({ resourcesUsed: {}, ...c })),
          loaded: true,
          currentSceneIndex: 0,
          notes: { dm: '', shared: '' },
          savedEncounters: [],
          questObjectives: normalized.questObjectives || [],
        },
      });
    },
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
          fogBitfields: settings?.fogBitfields || state.fogBitfields,
          roofStates: settings?.roofStates || state.roofStates,
          defeatedEnemies: settings?.defeatedEnemies || state.defeatedEnemies,
          quests: settings?.quests || state.quests,
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
              id: uuidv4(),
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

    // Append AI-generated continuation scenes to the campaign
    appendScenes: (newScenes) =>
      set((state) => ({
        campaign: {
          ...state.campaign,
          scenes: [...(state.campaign.scenes || []), ...newScenes],
        },
      })),

    // Campaign completion state — shown when last scene concludes
    campaignComplete: false,
    setCampaignComplete: (val) => set({ campaignComplete: val }),

    // Chapter milestone detection
    chapterMilestoneReached: false,
    checkChapterMilestone: (triggerType, triggerId) => {
      const state = get();
      const milestone = state.campaign?.chapterMilestone;
      if (!milestone || state.chapterMilestoneReached) return false;
      if (milestone.trigger === triggerType && milestone.targetId === triggerId) {
        set({ chapterMilestoneReached: true });
        return true;
      }
      return false;
    },
    resetChapterMilestone: () => set({ chapterMilestoneReached: false }),

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

    // Spell slot management
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
        const entry = { id: uuidv4(), name, enemies, savedAt: Date.now() };
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

    // === Supabase Persistence ===
    saveSettingsToSupabase: async (campaignState) => {
      const { activeCampaign } = get();
      if (!activeCampaign?.id) return;
      const c = campaignState || get().campaign;
      notifySaveStart();
      try {
        const { data: cur } = await supabase
          .from('campaigns').select('settings').eq('id', activeCampaign.id).maybeSingle();
        await supabase
          .from('campaigns')
          .update({ settings: { ...(cur?.settings || {}), notes: c.notes, savedEncounters: c.savedEncounters } })
          .eq('id', activeCampaign.id);
        notifySaveComplete();
      } catch { notifySaveError(); }
    },

    saveSessionStateToSupabase: async () => {
      const { activeCampaign, campaign, encounter, isDM, fogBitfields, roofStates, defeatedEnemies, quests } = get();
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
              fogBitfields,
              roofStates,
              defeatedEnemies: defeatedEnemies || {},
              quests: quests || [],
            },
          })
          .eq('id', activeCampaign.id);
      } catch { /* non-critical */ }
    },

    saveCampaignToSupabase: async () => {
      const { activeCampaign, campaign } = get();
      if (!activeCampaign?.id) return;
      notifySaveStart();
      try {
        const merged = {
          ...(activeCampaign.campaign_data || {}),
          meta: campaign.meta,
          questObjectives: campaign.questObjectives,
          characters: campaign.characters,
        };
        await supabase
          .from('campaigns')
          .update({ campaign_data: merged })
          .eq('id', activeCampaign.id);
        notifySaveComplete();
      } catch {
        notifySaveError();
      }
    },

    // === Scene Images (cache) ===
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
    preGenerateSceneImages: async (campaignId, scenes) => {
      // buildPollinationsUrl is statically imported at top of file
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
  };
}
