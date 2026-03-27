import { buildAreaFromBrief } from './areaBuilder.js'

/**
 * Convert AI-generated campaign output into the final campaign data structure.
 * Builds only the starting area; remaining areas stay as briefs for on-demand generation.
 *
 * @param {object} aiOutput — AI-generated campaign:
 *   { title, startArea, areaBriefs: { [areaId]: brief }, questObjectives, storyMilestones,
 *     chapter, factions, chapterMilestone }
 * @returns {object} campaign data with built starting area + remaining briefs
 */
export function buildAreaWorld(aiOutput) {
  const {
    title = 'Untitled Campaign',
    startArea,
    areaBriefs = {},
    questObjectives = [],
    storyMilestones = [],
    chapter = 1,
    factions = [],
    chapterMilestone = null,
  } = aiOutput

  // If startArea is undefined, pick the first brief key
  const effectiveStartArea = startArea || Object.keys(areaBriefs)[0]
  const startBrief = effectiveStartArea ? areaBriefs[effectiveStartArea] : null
  if (!startBrief) {
    console.error(`[campaignGenerator] No brief found for startArea "${startArea}"`)
    return {
      title,
      startArea: null,
      areas: {},
      areaBriefs,
      questObjectives,
      storyMilestones,
      chapter,
      factions,
      chapterMilestone,
    }
  }

  // Build the starting area from its brief
  const builtStartArea = buildAreaFromBrief(startBrief, 42)

  // Keep remaining briefs for on-demand generation
  const remainingBriefs = { ...areaBriefs }
  delete remainingBriefs[effectiveStartArea]

  return {
    title,
    startArea: effectiveStartArea,
    areas: { [effectiveStartArea]: builtStartArea },
    areaBriefs: remainingBriefs,
    questObjectives,
    storyMilestones,
    chapter,
    factions,
    chapterMilestone,
  }
}

/**
 * Build a prompt asking Claude to summarize the story so far.
 *
 * @param {object} campaignState — current campaign data (questObjectives, factions, etc.)
 * @param {Array}  sessionLog    — array of message objects with a .text property
 * @returns {string} prompt string for Claude
 */
export function buildStorySoFarPrompt(campaignState, sessionLog) {
  const { questObjectives = [], factions = [] } = campaignState

  // Gather completed and active quest titles
  const completedQuests = questObjectives
    .filter(q => q.status === 'completed')
    .map(q => q.title || q.description || 'Unknown quest')

  const activeQuests = questObjectives
    .filter(q => q.status !== 'completed')
    .map(q => q.title || q.description || 'Unknown quest')

  // Extract faction names
  const factionNames = factions.map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean)

  // Take the last 50 messages from the session log
  const recentLog = (sessionLog || [])
    .slice(-50)
    .map(msg => msg.text || '')
    .filter(Boolean)
    .join('\n')

  const questSection = [
    completedQuests.length ? `Completed quests: ${completedQuests.join(', ')}.` : '',
    activeQuests.length ? `Active quests: ${activeQuests.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const factionSection = factionNames.length
    ? `Factions involved: ${factionNames.join(', ')}.`
    : ''

  return [
    'You are the narrator of a tabletop RPG campaign. Summarize the story so far in approximately 200 words.',
    'Write in past tense, third person. Focus on major events, decisions, and turning points.',
    questSection,
    factionSection,
    recentLog ? `\nRecent session log:\n${recentLog}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Build a prompt for generating the next chapter of the campaign.
 *
 * @param {string} tone         — campaign tone (e.g. "dark", "heroic")
 * @param {string} setting      — campaign setting description
 * @param {number} chapter      — the upcoming chapter number
 * @param {string} storySoFar   — summary of events so far
 * @param {Array}  questState   — current quest objectives array
 * @param {Array}  factionState — current factions array
 * @returns {string} prompt string for Claude
 */
export function generateContinuationPrompt(
  tone,
  setting,
  chapter,
  storySoFar,
  questState,
  factionState
) {
  const activeQuests = (questState || [])
    .filter(q => q.status !== 'completed')
    .map(q => q.title || q.description || 'Unknown quest')

  const factionNames = (factionState || [])
    .map(f => (typeof f === 'string' ? f : f.name))
    .filter(Boolean)

  const activeQuestSection = activeQuests.length
    ? `Active quests that should continue or resolve: ${activeQuests.join(', ')}.`
    : ''

  const factionSection = factionNames.length
    ? `Factions that should remain relevant: ${factionNames.join(', ')}.`
    : ''

  return `You are generating Chapter ${chapter} of a tabletop RPG campaign.

Tone: ${tone || 'classic fantasy'}
Setting: ${setting || 'a fantasy world'}

Story so far:
${storySoFar || 'This is the beginning of the campaign.'}

${activeQuestSection}
${factionSection}

Generate Chapter ${chapter} using the same JSON structure as Chapter 1:
{
  "title": "Campaign or chapter title",
  "startArea": "areaId of the starting location",
  "areaBriefs": {
    "<areaId>": { "name": "...", "description": "...", "encounters": [], "npcs": [], "exits": [] }
  },
  "questObjectives": [{ "id": "...", "title": "...", "description": "...", "status": "active" }],
  "storyMilestones": ["..."],
  "chapter": ${chapter},
  "factions": [{ "name": "...", "disposition": "..." }],
  "chapterMilestone": "A single sentence describing what must happen to complete this chapter."
}

Respond with valid JSON only. No markdown, no commentary.`
}
