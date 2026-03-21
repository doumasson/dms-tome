// src/lib/classCombatActions.js
import { CLASSES } from '../data/classes'
import { isCaster } from './spellSlots'

/**
 * Returns the class-specific combat action buttons for a given class and level.
 * Each action: { name, icon, actionType, resourceName?, resourceCost?, levelReq?, handler? }
 *
 * actionType values:
 *   'action'       — costs the character's Action
 *   'bonus_action' — costs the character's Bonus Action
 *   'free'         — triggered as part of another action (no action cost by itself)
 */
export function getClassCombatActions(className, level) {
  const actions = []
  const cls = CLASSES[className]
  if (!cls) return actions

  // Casters get a Spells button (Warlock included via isCaster)
  if (isCaster(className)) {
    actions.push({ name: 'Spells', icon: '✨', actionType: 'action', handler: 'openSpellPicker' })
  }

  // Class-specific abilities
  switch (className) {
    case 'Monk':
      if (level >= 2) {
        actions.push({ name: 'Flurry of Blows',  icon: '👊', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
        actions.push({ name: 'Patient Defense',   icon: '🛡', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
        actions.push({ name: 'Step of the Wind',  icon: '💨', actionType: 'bonus_action', resourceName: 'Ki Points', resourceCost: 1 })
      }
      if (level >= 5) {
        actions.push({ name: 'Stunning Strike', icon: '⚡', actionType: 'free', resourceName: 'Ki Points', resourceCost: 1, levelReq: 5 })
      }
      break

    case 'Fighter':
      actions.push({ name: 'Second Wind',  icon: '❤',  actionType: 'bonus_action', resourceName: 'Second Wind',  resourceCost: 1 })
      if (level >= 2) {
        actions.push({ name: 'Action Surge', icon: '⚡', actionType: 'free',         resourceName: 'Action Surge', resourceCost: 1 })
      }
      break

    case 'Barbarian':
      actions.push({ name: 'Rage',             icon: '🔥', actionType: 'bonus_action', resourceName: 'Rages', resourceCost: 1 })
      actions.push({ name: 'Reckless Attack',  icon: '⚔',  actionType: 'free' })
      break

    case 'Rogue':
      if (level >= 2) {
        actions.push({ name: 'Cunning Action', icon: '🎭', actionType: 'bonus_action' })
      }
      break

    case 'Paladin':
      if (level >= 2) {
        actions.push({ name: 'Divine Smite', icon: '🗡', actionType: 'free',   handler: 'smite' })
        actions.push({ name: 'Lay on Hands', icon: '❤', actionType: 'action', resourceName: 'Lay on Hands' })
      }
      break

    case 'Cleric':
      actions.push({ name: 'Channel Divinity', icon: '⚡', actionType: 'action', resourceName: 'Channel Divinity', resourceCost: 1 })
      break

    case 'Bard':
      actions.push({ name: 'Bardic Inspiration', icon: '🎵', actionType: 'bonus_action', resourceName: 'Bardic Inspiration', resourceCost: 1 })
      break

    case 'Druid':
      if (level >= 2) {
        actions.push({ name: 'Wild Shape', icon: '🐻', actionType: 'action', resourceName: 'Wild Shape', resourceCost: 1 })
      }
      break

    // Sorcerer, Warlock, Wizard, Ranger — Spells button covers them
  }

  return actions
}
