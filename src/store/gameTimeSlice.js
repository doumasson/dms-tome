import { supabase } from '../lib/supabase';
import { broadcastEncounterAction } from '../lib/liveChannel';
import { advanceTime } from '../lib/gameTime.js';
import { rollWeatherChange } from '../lib/weather.js';

/**
 * Game time slice — game clock, skill checks, fog of war, scene tokens,
 * area state (V2 procedural maps), API key, DM trigger.
 */
export function createGameTimeSlice(set, get) {
  return {
    // === Game Time ===
    gameTime: { hour: 8, day: 1 },
    weather: { current: 'clear', duration: 3 },
    advanceGameTime: (hours) => {
      const { gameTime, weather } = get();
      const newTime = advanceTime(gameTime, hours);
      let newWeather = weather;
      const newDuration = weather.duration - 1;
      if (newDuration <= 0) {
        const next = rollWeatherChange(weather.current);
        newWeather = { current: next, duration: 2 + Math.floor(Math.random() * 4) };
        broadcastEncounterAction?.({ type: 'weather-change', weather: newWeather });
      } else {
        newWeather = { ...weather, duration: newDuration };
      }
      set({ gameTime: newTime, weather: newWeather });
      broadcastEncounterAction?.({ type: 'time-advance', gameTime: newTime });
    },

    // === Skill Checks ===
    pendingSkillCheck: null,
    setPendingSkillCheck: (check) => set({ pendingSkillCheck: check }),
    clearPendingSkillCheck: () => set({ pendingSkillCheck: null }),

    // === Session-wide API key (broadcast from DM to all players) ===
    sessionApiKey: null,
    setSessionApiKey: (key) => set({ sessionApiKey: key }),

    // === Pending DM Trigger (NPC proximity interaction -> auto-send to narrator) ===
    pendingDmTrigger: null,
    setPendingDmTrigger: (text) => set({ pendingDmTrigger: text }),
    clearPendingDmTrigger: () => set({ pendingDmTrigger: null }),

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

    // ── Area State (V2 procedural maps) ────────────────────────────────
    currentAreaId: null,
    areas: {},                    // { areaId: builtArea }
    areaBriefs: {},               // { areaId: brief } — unbuilt area briefs
    areaLayers: null,             // decompressed layers for current area
    areaCollision: null,          // Uint8Array collision grid
    areaTilePalette: [],          // string tile ID lookup
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 0.5,
    fogBitfields: {},             // { areaId: base64 string }
    roofStates: {},               // { buildingId: boolean }
    areaTokenPositions: {},       // { areaId: { playerId: {x,y} } }

    setCurrentArea: (areaId) => set(state => ({
      currentAreaId: areaId,
      areaLayers: null,
      areaCollision: null,
    })),

    setAreaLayers: (layers, collision, palette) => set({
      areaLayers: layers,
      areaCollision: collision,
      areaTilePalette: palette,
    }),

    setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
    setCameraZoom: (zoom) => set({ cameraZoom: zoom }),

    updateFogBitfield: (areaId, bitfield) => set(state => ({
      fogBitfields: { ...state.fogBitfields, [areaId]: bitfield },
    })),

    setRoofState: (areaId, buildingId, revealed) => set(state => ({
      roofStates: {
        ...state.roofStates,
        [areaId]: { ...(state.roofStates[areaId] || {}), [buildingId]: revealed },
      },
    })),

    setAreaTokenPosition: (areaId, playerId, pos) => set(state => ({
      areaTokenPositions: {
        ...state.areaTokenPositions,
        [areaId]: {
          ...(state.areaTokenPositions[areaId] || {}),
          [playerId]: pos,
        },
      },
    })),

    loadArea: (areaId, areaData) => set(state => ({
      areas: { ...state.areas, [areaId]: areaData },
    })),

    setAreaBriefs: (briefs) => set({ areaBriefs: briefs }),

    loadAreaWorld: (world) => set(state => ({
      currentAreaId: world.startArea,
      areas: world.areas || {},
      areaBriefs: world.areaBriefs || {},
      campaign: {
        ...state.campaign,
        title: world.title || state.campaign.title,
        questObjectives: world.questObjectives || [],
      },
    })),

    buildAndLoadArea: (areaId, builtArea) => set(state => {
      const newAreas = { ...state.areas, [areaId]: builtArea };
      const newBriefs = { ...state.areaBriefs };
      delete newBriefs[areaId];
      return { areas: newAreas, areaBriefs: newBriefs };
    }),

    activateArea: (areaId) => set(state => {
      const area = state.areas[areaId];
      if (!area) return {};
      return {
        currentAreaId: areaId,
        areaLayers: area.layers,
        areaCollision: area.collision || null,
        areaTilePalette: area.palette || [],
      };
    }),
  };
}
