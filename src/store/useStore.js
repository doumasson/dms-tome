import { create } from 'zustand/react';
import { createCharacterSlice } from './characterSlice';
import { createEncounterSlice } from './encounterSlice';
import { createCampaignSlice } from './campaignSlice';
import { createRestSlice } from './restSlice';
import { createGameTimeSlice } from './gameTimeSlice';
import { createUiSlice } from './uiSlice';
import { createStorySlice } from './storySlice';
import { createFactionSlice } from './factionSlice';

const useStore = create((...a) => ({
  ...createCampaignSlice(...a),
  ...createCharacterSlice(...a),
  ...createEncounterSlice(...a),
  ...createRestSlice(...a),
  ...createGameTimeSlice(...a),
  ...createUiSlice(...a),
  ...createStorySlice(...a),
  ...createFactionSlice(...a),
}));

export default useStore;
