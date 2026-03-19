import tavernBar from './tavern_bar.json'
import tavernKitchen from './tavern_kitchen.json'
import townSquare from './town_square.json'
import dungeonRoom from './dungeon_room.json'
import dungeonCorridor from './dungeon_corridor.json'
import forestClearing from './forest_clearing.json'
import cave from './cave.json'
import throneRoom from './throne_room.json'

const templates = {
  tavern_bar: tavernBar,
  tavern_kitchen: tavernKitchen,
  town_square: townSquare,
  dungeon_room: dungeonRoom,
  dungeon_corridor: dungeonCorridor,
  forest_clearing: forestClearing,
  cave: cave,
  throne_room: throneRoom,
}

export function getTemplate(type) {
  return templates[type] || null
}

export function getTemplateTypes() {
  return Object.keys(templates)
}
