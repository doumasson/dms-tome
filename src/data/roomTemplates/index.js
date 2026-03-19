import tavernBar from './tavern_bar.json'
import tavernKitchen from './tavern_kitchen.json'
import townSquare from './town_square.json'

const templates = {
  tavern_bar: tavernBar,
  tavern_kitchen: tavernKitchen,
  town_square: townSquare,
}

export function getTemplate(type) {
  return templates[type] || null
}

export function getTemplateTypes() {
  return Object.keys(templates)
}
