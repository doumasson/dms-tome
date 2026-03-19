import { buildAreaFromBrief } from './areaBuilder.js'

/**
 * Convert AI-generated campaign output into the final campaign data structure.
 * Builds only the starting area; remaining areas stay as briefs for on-demand generation.
 *
 * @param {object} aiOutput — AI-generated campaign:
 *   { title, startArea, areaBriefs: { [areaId]: brief }, questObjectives, storyMilestones }
 * @returns {object} campaign data with built starting area + remaining briefs
 */
export function buildAreaWorld(aiOutput) {
  const {
    title = 'Untitled Campaign',
    startArea,
    areaBriefs = {},
    questObjectives = [],
    storyMilestones = [],
  } = aiOutput

  // Validate we have a starting area
  const startBrief = areaBriefs[startArea]
  if (!startBrief) {
    console.error(`[campaignGenerator] No brief found for startArea "${startArea}"`)
    return { title, startArea: null, areas: {}, areaBriefs, questObjectives, storyMilestones }
  }

  // Build the starting area from its brief
  const builtStartArea = buildAreaFromBrief(startBrief, 42)

  // Keep remaining briefs for on-demand generation
  const remainingBriefs = { ...areaBriefs }
  delete remainingBriefs[startArea]

  return {
    title,
    startArea,
    areas: { [startArea]: builtStartArea },
    areaBriefs: remainingBriefs,
    questObjectives,
    storyMilestones,
  }
}
