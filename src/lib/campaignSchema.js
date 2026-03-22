import { getDefaultCampaignMeta } from '../config/product';

function normalizeScene(scene = {}, index = 0) {
  return {
    id: scene.id || `scene-${String(index + 1).padStart(2, '0')}`,
    title: scene.title || `Scene ${index + 1}`,
    text: scene.text || scene.description || '',
    description: scene.description || scene.text || '',
    dmNotes: scene.dmNotes || scene.dm_notes || '',
    choices: Array.isArray(scene.choices) ? scene.choices : [],
    isEncounter: Boolean(scene.isEncounter),
    enemies: Array.isArray(scene.enemies) ? scene.enemies : [],
    npcs: Array.isArray(scene.npcs) ? scene.npcs : [],
    ...scene,
  };
}

function normalizeCharacter(character = {}, index = 0) {
  const maxHp = Number(character.maxHp) || 10;
  const currentHp = character.currentHp ?? maxHp;

  return {
    id: character.id || `char-${String(index + 1).padStart(2, '0')}`,
    name: character.name || `Character ${index + 1}`,
    race: character.race || '',
    class: character.class || '',
    level: Number(character.level) || 1,
    stats: character.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: Array.isArray(character.skills) ? character.skills : [],
    weapons: Array.isArray(character.weapons) ? character.weapons : [],
    maxHp,
    currentHp: Number(currentHp) || maxHp,
    ac: Number(character.ac) || 10,
    speed: Number(character.speed) || 30,
    spellSlots: character.spellSlots || null,
    resourcesUsed: character.resourcesUsed || {},
    ...character,
  };
}

export function normalizeCampaignData(data = {}, metaOverrides = {}) {
  const title = data.title || 'Untitled Campaign';
  const meta = {
    ...getDefaultCampaignMeta(),
    ...(data.meta || {}),
    ...metaOverrides,
  };

  return {
    ...data,
    title,
    meta,
    scenes: Array.isArray(data.scenes) ? data.scenes.map(normalizeScene) : [],
    characters: Array.isArray(data.characters) ? data.characters.map(normalizeCharacter) : [],
    questObjectives: Array.isArray(data.questObjectives) ? data.questObjectives : [],
    storyMilestones: Array.isArray(data.storyMilestones) ? data.storyMilestones : [],
    areaBriefs: data.areaBriefs && typeof data.areaBriefs === 'object' ? data.areaBriefs : {},
    areas: data.areas && typeof data.areas === 'object' ? data.areas : {},
  };
}
