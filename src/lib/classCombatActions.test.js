// src/lib/classCombatActions.test.js
import { describe, it, expect } from 'vitest'
import { getClassCombatActions } from './classCombatActions'

describe('getClassCombatActions', () => {
  it('returns Monk Ki abilities at level 2+', () => {
    const actions = getClassCombatActions('Monk', 2)
    const names = actions.map(a => a.name)
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

  it('each action has required fields', () => {
    const actions = getClassCombatActions('Fighter', 5)
    for (const a of actions) {
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('actionType')
      expect(a).toHaveProperty('icon')
    }
  })
})
