import { getTemplate } from '../data/roomTemplates/index.js'

/**
 * Merge a zone (from AI generation) with a room template.
 * Template provides: layers, width, height, spawnPoints, exitSlots.
 * Zone provides: npcs, exits, name, lighting, ambience.
 */
export function mergeZoneWithTemplate(zone, template) {
  const merged = {
    ...zone,
    width: template.width,
    height: template.height,
    layers: template.layers,
  }

  // Fill NPC positions from spawnPoints if not already set
  if (merged.npcs && template.spawnPoints) {
    merged.npcs = merged.npcs.map(npc => {
      if (npc.position) return npc
      const spawnKey = Object.keys(template.spawnPoints).find(k =>
        k === npc.role || k.startsWith(npc.role)
      )
      if (spawnKey) {
        return { ...npc, position: template.spawnPoints[spawnKey] }
      }
      return { ...npc, position: { x: Math.floor(template.width / 2), y: Math.floor(template.height / 2) } }
    })
  }

  // Fill exit positions from exitSlots if not already set
  if (merged.exits && template.exitSlots) {
    merged.exits = merged.exits.map(exit => {
      if (exit.position) return exit
      const slot = template.exitSlots[exit.direction]
      if (slot) {
        return { ...exit, position: { x: slot.x, y: slot.y }, width: slot.width || 1 }
      }
      return exit
    })
  }

  return merged
}

/**
 * Build a complete zone world from AI-generated zone graph + templates.
 * @param {object} aiWorld - { title, startZone, questObjectives, zones: [...] or {...} }
 * @returns {object} World with zones as a map, each zone fully merged with template
 */
export function buildWorldFromAiOutput(aiWorld) {
  const zonesMap = {}
  const zoneList = Array.isArray(aiWorld.zones) ? aiWorld.zones : Object.values(aiWorld.zones)

  for (const zone of zoneList) {
    const template = getTemplate(zone.type)
    if (template) {
      zonesMap[zone.id] = mergeZoneWithTemplate(zone, template)
    } else {
      console.warn(`No template for zone type: ${zone.type}`)
      zonesMap[zone.id] = { ...zone, width: 10, height: 8, layers: { floor: [], walls: [], props: [] } }
    }
  }

  return {
    title: aiWorld.title,
    startZone: aiWorld.startZone,
    questObjectives: aiWorld.questObjectives || [],
    storyMilestones: aiWorld.storyMilestones || [],
    zones: zonesMap,
  }
}
