// src/lib/classCombatActions.test.js
import { describe, it, expect } from 'vitest'
import { getClassCombatActions } from './classCombatActions'

describe('getClassCombatActions', () => {
  it('returns Martial Arts at level 1', () => {
    const actions = getClassCombatActions('Monk', 1)
    expect(actions.map(a => a.name)).toContain('Martial Arts')
    expect(actions.map(a => a.name)).not.toContain('Flurry of Blows') // level 2+
  })

  it('returns Monk Ki abilities at level 2+', () => {
    const actions = getClassCombatActions('Monk', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Martial Arts')
    expect(names).toContain('Flurry of Blows')
    expect(names).toContain('Patient Defense')
    expect(names).toContain('Step of the Wind')
    expect(names).not.toContain('Stunning Strike') // level 5+
  })

  it('returns Stunning Strike at level 5+', () => {
    const actions = getClassCombatActions('Monk', 5)
    expect(actions.map(a => a.name)).toContain('Stunning Strike')
  })

  it('returns Fighter Action Surge and Second Wind', () => {
    const actions = getClassCombatActions('Fighter', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Action Surge')
    expect(names).toContain('Second Wind')
  })

  it('returns no SPELLS button for Monk', () => {
    const actions = getClassCombatActions('Monk', 5)
    expect(actions.map(a => a.name)).not.toContain('Spells')
  })

  it('returns SPELLS button for Wizard', () => {
    const actions = getClassCombatActions('Wizard', 1)
    expect(actions.map(a => a.name)).toContain('Spells')
  })

  it('returns Rage for Barbarian', () => {
    const actions = getClassCombatActions('Barbarian', 1)
    expect(actions.map(a => a.name)).toContain('Rage')
  })

  it('returns Cunning Action for Rogue level 2+', () => {
    const actions = getClassCombatActions('Rogue', 2)
    expect(actions.map(a => a.name)).toContain('Cunning Action')
  })

  it('returns Smite and Lay on Hands for Paladin', () => {
    const actions = getClassCombatActions('Paladin', 2)
    const names = actions.map(a => a.name)
    expect(names).toContain('Divine Smite')
    expect(names).toContain('Lay on Hands')
    expect(names).toContain('Spells')
  })

  it('returns Bardic Inspiration for Bard', () => {
    const actions = getClassCombatActions('Bard', 1)
    expect(actions.map(a => a.name)).toContain('Bardic Inspiration')
  })

  it('returns Channel Divinity for Cleric', () => {
    const actions = getClassCombatActions('Cleric', 1)
    expect(actions.map(a => a.name)).toContain('Channel Divinity')
  })

  it('returns Wild Shape for Druid at level 2+', () => {
    expect(getClassCombatActions('Druid', 1).map(a => a.name)).not.toContain('Wild Shape')
    expect(getClassCombatActions('Druid', 2).map(a => a.name)).toContain('Wild Shape')
  })

  it("returns Hunter's Mark for Ranger at level 2+", () => {
    expect(getClassCombatActions('Ranger', 1).map(a => a.name)).not.toContain("Hunter's Mark")
    expect(getClassCombatActions('Ranger', 2).map(a => a.name)).toContain("Hunter's Mark")
  })

  it('returns Quickened Spell for Sorcerer at level 3+', () => {
    expect(getClassCombatActions('Sorcerer', 2).map(a => a.name)).not.toContain('Quickened Spell')
    const actions = getClassCombatActions('Sorcerer', 3)
    expect(actions.map(a => a.name)).toContain('Quickened Spell')
    const qs = actions.find(a => a.name === 'Quickened Spell')
    expect(qs.resourceName).toBe('Sorcery Points')
    expect(qs.resourceCost).toBe(2)
  })

  it('Ranger gets Spells button at level 2+', () => {
    const actions = getClassCombatActions('Ranger', 2)
    expect(actions.map(a => a.name)).toContain('Spells')
  })

  it('Sorcerer gets Spells button', () => {
    const actions = getClassCombatActions('Sorcerer', 1)
    expect(actions.map(a => a.name)).toContain('Spells')
  })

  it('each action has required fields', () => {
    const actions = getClassCombatActions('Fighter', 5)
    for (const a of actions) {
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('actionType')
      expect(a).toHaveProperty('icon')
    }
  })
})
