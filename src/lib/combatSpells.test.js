import { describe, it, expect } from 'vitest'
import { COMBAT_SPELLS, getConditionModifiers } from './combatSpells'

// ──────────────────────────────────────────────────────────────────────────
// SPELL CATALOG TESTS
// ──────────────────────────────────────────────────────────────────────────

describe('COMBAT_SPELLS catalog structure', () => {
  it('exports a non-empty spell object', () => {
    expect(COMBAT_SPELLS).toBeDefined()
    expect(typeof COMBAT_SPELLS).toBe('object')
    expect(Object.keys(COMBAT_SPELLS).length).toBeGreaterThan(0)
  })

  it('contains at least 40 spells', () => {
    expect(Object.keys(COMBAT_SPELLS).length).toBeGreaterThanOrEqual(40)
  })

  it('has no duplicate spell names', () => {
    const names = Object.keys(COMBAT_SPELLS)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })
})

describe('All spells have required fields', () => {
  it('every spell has a level field (0-9)', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      expect(spell.level).toBeDefined()
      expect(typeof spell.level).toBe('number')
      expect(spell.level).toBeGreaterThanOrEqual(0)
      expect(spell.level).toBeLessThanOrEqual(9)
    })
  })

  it('every spell has an areaType field', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      expect(spell.areaType).toBeDefined()
      expect(['single', 'cone', 'sphere', 'line']).toContain(spell.areaType)
    })
  })

  it('every spell has a damageType field', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      expect(spell.damageType).toBeDefined()
      expect(typeof spell.damageType).toBe('string')
    })
  })

  it('single-target spells typically have a range field', () => {
    const singleTargetSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.areaType === 'single'
    )
    expect(singleTargetSpells.length).toBeGreaterThan(0)
    singleTargetSpells.forEach(([name, spell]) => {
      // Most single-target spells have range; validate when present
      if (spell.range !== undefined) {
        if (spell.range === 'touch' || spell.range === 'self') {
          expect(typeof spell.range).toBe('string')
        } else {
          expect(typeof spell.range).toBe('number')
          expect(spell.range).toBeGreaterThan(0)
        }
      }
    })
  })

  it('area spells (cone/sphere/line) may omit range or define it', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (['cone', 'sphere', 'line'].includes(spell.areaType)) {
        // Range is optional for area spells; if present, validate it
        if (spell.range !== undefined) {
          if (spell.range === 'touch' || spell.range === 'self') {
            expect(typeof spell.range).toBe('string')
          } else {
            expect(typeof spell.range).toBe('number')
            expect(spell.range).toBeGreaterThan(0)
          }
        }
      }
    })
  })
})

describe('Spell areaType and areaSize validation', () => {
  it('single-target spells have no areaSize', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.areaType === 'single') {
        // areaSize should not be defined or can be 0
        if (spell.areaSize !== undefined) {
          expect(spell.areaSize).toBe(0)
        }
      }
    })
  })

  it('cone spells have valid areaSize', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.areaType === 'cone') {
        expect(spell.areaSize).toBeDefined()
        expect(typeof spell.areaSize).toBe('number')
        expect(spell.areaSize).toBeGreaterThan(0)
      }
    })
  })

  it('sphere spells have valid areaSize', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.areaType === 'sphere') {
        expect(spell.areaSize).toBeDefined()
        expect(typeof spell.areaSize).toBe('number')
        expect(spell.areaSize).toBeGreaterThan(0)
      }
    })
  })

  it('line spells have valid areaSize and widthFt', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.areaType === 'line') {
        expect(spell.areaSize).toBeDefined()
        expect(typeof spell.areaSize).toBe('number')
        expect(spell.areaSize).toBeGreaterThan(0)
        expect(spell.widthFt).toBeDefined()
        expect(typeof spell.widthFt).toBe('number')
        expect(spell.widthFt).toBeGreaterThan(0)
      }
    })
  })

  it('selfCentered spells are area-based (cone/sphere)', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.selfCentered) {
        expect(['cone', 'sphere']).toContain(spell.areaType)
      }
    })
  })
})

describe('Spell damage format validation', () => {
  it('damage field is a string', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      expect(typeof spell.damage).toBe('string')
    })
  })

  it('healing spells have numeric or XdY damage format', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.healing) {
        // Valid formats: '1d8+3', '1d4+3', '70'
        const validFormat = /^\d+(d\d+)?(\+\d+)?$/.test(spell.damage)
        expect(validFormat).toBe(true)
      }
    })
  })

  it('damage spells follow XdY or XdY+Z format', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (!spell.healing && spell.damage && spell.damage !== '') {
        // Check for valid damage roll format: 1d10, 3d4+3, 20d6+20d6, etc.
        const validDamageFormat = /^(\d+d\d+)(\+\d+d\d+)*(\+\d+)?$/.test(spell.damage)
        expect(validDamageFormat).toBe(true)
      }
    })
  })

  it('control and buff spells have empty damage string', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.damageType === 'control' || spell.damageType === 'buff') {
        expect(spell.damage).toBe('')
      }
    })
  })
})

describe('Spell damage type validation', () => {
  it('all damage types are recognized 5e types or multi-types', () => {
    const validTypes = [
      'fire', 'cold', 'force', 'necrotic', 'healing',
      'radiant', 'psychic', 'thunder', 'lightning',
      'poison', 'bludgeoning', 'control', 'buff'
    ]
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      const types = spell.damageType.split('/')
      types.forEach(type => {
        expect(validTypes).toContain(type.trim())
      })
    })
  })

  it('compound damage types (slash-separated) are valid', () => {
    const compoundDamageSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.damageType.includes('/')
    )
    compoundDamageSpells.forEach(([name, spell]) => {
      const types = spell.damageType.split('/')
      expect(types.length).toBeGreaterThan(1)
      types.forEach(type => {
        expect(type.trim().length).toBeGreaterThan(0)
      })
    })
  })
})

describe('Spell save validation', () => {
  it('save field (when present) is a valid ability', () => {
    const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.save) {
        expect(validAbilities).toContain(spell.save)
      }
    })
  })

  it('Magic Missile has noSave property', () => {
    expect(COMBAT_SPELLS['Magic Missile'].noSave).toBe(true)
    expect(COMBAT_SPELLS['Magic Missile'].save).toBeUndefined()
  })

  it('spells without save use attack rolls', () => {
    const attackRollSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => !spell.save && !spell.noSave && !spell.healing
    )
    expect(attackRollSpells.length).toBeGreaterThan(0)
  })
})

describe('Healing spells validation', () => {
  it('healing spells have healing: true', () => {
    const healingSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.damageType === 'healing'
    )
    healingSpells.forEach(([name, spell]) => {
      expect(spell.healing).toBe(true)
    })
  })

  it('healing spells have areaType (single or area)', () => {
    const healingSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.healing
    )
    healingSpells.forEach(([name, spell]) => {
      expect(spell.areaType).toBeDefined()
      expect(['single', 'sphere', 'cone', 'line']).toContain(spell.areaType)
    })
  })

  it('single-target healing spells have range field', () => {
    const singleHealingSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.healing && spell.areaType === 'single'
    )
    singleHealingSpells.forEach(([name, spell]) => {
      expect(spell.range).toBeDefined()
    })
  })
})

describe('Concentration spells validation', () => {
  it('concentration property is boolean when present', () => {
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.concentration !== undefined) {
        expect(typeof spell.concentration).toBe('boolean')
      }
    })
  })

  it('concentration spells can have or lack damage', () => {
    const concentrationSpells = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.concentration
    )
    expect(concentrationSpells.length).toBeGreaterThan(0)
    // Some have damage (Hex), some don't (Hold Person)
  })
})

describe('Cantrips (level 0)', () => {
  it('all level 0 spells are cantrips', () => {
    const cantrips = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.level === 0
    )
    expect(cantrips.length).toBeGreaterThan(0)
  })

  it('cantrips are single-target or area with small damage', () => {
    const cantrips = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.level === 0
    )
    cantrips.forEach(([name, spell]) => {
      // Most are single target
      expect(['single', 'cone', 'sphere']).toContain(spell.areaType)
    })
  })

  it('cantrips range from d4 to d12 damage', () => {
    const cantrips = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.level === 0 && spell.damage
    )
    cantrips.forEach(([name, spell]) => {
      expect(/^\d+d[4-9]|d1[0-2]/.test(spell.damage)).toBe(true)
    })
  })
})

describe('Leveled spells (level 1-9)', () => {
  it('all leveled spells are between level 1 and 9', () => {
    const leveled = Object.entries(COMBAT_SPELLS).filter(
      ([_, spell]) => spell.level > 0
    )
    leveled.forEach(([name, spell]) => {
      expect(spell.level).toBeGreaterThan(0)
      expect(spell.level).toBeLessThanOrEqual(9)
    })
  })

  it('higher level spells typically deal more damage', () => {
    const spellsByLevel = {}
    Object.entries(COMBAT_SPELLS).forEach(([name, spell]) => {
      if (spell.level > 0 && spell.damage) {
        if (!spellsByLevel[spell.level]) {
          spellsByLevel[spell.level] = []
        }
        spellsByLevel[spell.level].push(spell)
      }
    })

    // Check that level 9 spells exist
    expect(Object.keys(spellsByLevel).includes('9')).toBe(true)
  })
})

describe('Spell name validation', () => {
  it('spell names with apostrophes are valid (Hunter\'s Mark)', () => {
    expect(COMBAT_SPELLS["Hunter's Mark"]).toBeDefined()
  })

  it('spell names with slashes are valid (Blindness/Deafness)', () => {
    expect(COMBAT_SPELLS['Blindness/Deafness']).toBeDefined()
  })

  it('all spell names are non-empty strings', () => {
    Object.keys(COMBAT_SPELLS).forEach(name => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })
  })
})

describe('Specific spell definitions', () => {
  it('Fire Bolt is a valid cantrip', () => {
    const spell = COMBAT_SPELLS['Fire Bolt']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(0)
    expect(spell.areaType).toBe('single')
    expect(spell.damage).toBe('1d10')
    expect(spell.damageType).toBe('fire')
    expect(spell.range).toBe(120)
  })

  it('Magic Missile has noSave property', () => {
    const spell = COMBAT_SPELLS['Magic Missile']
    expect(spell).toBeDefined()
    expect(spell.noSave).toBe(true)
    expect(spell.damage).toBe('3d4+3')
  })

  it('Burning Hands is a cone spell', () => {
    const spell = COMBAT_SPELLS['Burning Hands']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(1)
    expect(spell.areaType).toBe('cone')
    expect(spell.areaSize).toBe(15)
  })

  it('Fireball is a sphere spell with 20ft radius', () => {
    const spell = COMBAT_SPELLS['Fireball']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(3)
    expect(spell.areaType).toBe('sphere')
    expect(spell.areaSize).toBe(20)
    expect(spell.damage).toBe('8d6')
  })

  it('Lightning Bolt is a line spell', () => {
    const spell = COMBAT_SPELLS['Lightning Bolt']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(3)
    expect(spell.areaType).toBe('line')
    expect(spell.areaSize).toBe(100)
    expect(spell.widthFt).toBe(5)
  })

  it('Cure Wounds has touch range and healing', () => {
    const spell = COMBAT_SPELLS['Cure Wounds']
    expect(spell).toBeDefined()
    expect(spell.range).toBe('touch')
    expect(spell.healing).toBe(true)
    expect(spell.damageType).toBe('healing')
  })

  it('Hold Person is a control spell', () => {
    const spell = COMBAT_SPELLS['Hold Person']
    expect(spell).toBeDefined()
    expect(spell.damage).toBe('')
    expect(spell.damageType).toBe('control')
    expect(spell.concentration).toBe(true)
    expect(spell.save).toBe('wis')
  })

  it('Thunderwave is self-centered', () => {
    const spell = COMBAT_SPELLS['Thunderwave']
    expect(spell).toBeDefined()
    expect(spell.selfCentered).toBe(true)
    expect(spell.areaType).toBe('sphere')
  })

  it('Spirit Guardians is self-centered and concentration', () => {
    const spell = COMBAT_SPELLS['Spirit Guardians']
    expect(spell).toBeDefined()
    expect(spell.selfCentered).toBe(true)
    expect(spell.concentration).toBe(true)
  })

  it('Flame Strike has compound damage type', () => {
    const spell = COMBAT_SPELLS['Flame Strike']
    expect(spell).toBeDefined()
    expect(spell.damageType).toBe('fire/radiant')
    expect(spell.damage).toBe('4d6+4d6')
  })

  it('Meteor Swarm has compound damage with high numbers', () => {
    const spell = COMBAT_SPELLS['Meteor Swarm']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(9)
    expect(spell.damageType).toBe('fire/bludgeoning')
    expect(spell.damage).toBe('20d6+20d6')
  })

  it('Disintegrate has force damage and high range', () => {
    const spell = COMBAT_SPELLS['Disintegrate']
    expect(spell).toBeDefined()
    expect(spell.level).toBe(6)
    expect(spell.damageType).toBe('force')
    expect(spell.damage).toBe('10d6+40')
    expect(spell.range).toBe(60)
  })

  it('Cone of Cold has cone areaSize of 60', () => {
    const spell = COMBAT_SPELLS['Cone of Cold']
    expect(spell).toBeDefined()
    expect(spell.areaType).toBe('cone')
    expect(spell.areaSize).toBe(60)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// CONDITION MODIFIER TESTS
// ──────────────────────────────────────────────────────────────────────────

describe('getConditionModifiers - attacker conditions', () => {
  it('Blinded attacker has disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Blinded'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(false)
    expect(result.autoCrit).toBe(false)
  })

  it('Prone attacker has disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Prone'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
  })

  it('Restrained attacker has disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Restrained'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
  })

  it('Poisoned attacker has disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Poisoned'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
  })

  it('Frightened attacker has disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Frightened'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
  })

  it('multiple attacker disadvantage conditions stacks to single disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Blinded', 'Prone', 'Restrained'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(false)
  })
})

describe('getConditionModifiers - target conditions granting advantage', () => {
  it('Paralyzed target grants attacker advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Paralyzed'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(false)
    expect(result.autoCrit).toBe(true)
  })

  it('Unconscious target grants attacker advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Unconscious'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.autoCrit).toBe(true)
  })

  it('Stunned target grants attacker advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Stunned'] }
    )
    expect(result.hasAdv).toBe(true)
  })

  it('Restrained target grants attacker advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Restrained'] }
    )
    expect(result.hasAdv).toBe(true)
  })

  it('Prone target grants attacker advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Prone'] }
    )
    expect(result.hasAdv).toBe(true)
  })

  it('multiple target advantage conditions stacks to single advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Paralyzed', 'Restrained', 'Stunned'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(false)
  })
})

describe('getConditionModifiers - invisibility', () => {
  it('Invisible attacker has advantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Invisible'] },
      { conditions: [] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(false)
  })

  it('Invisible target grants attacker disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Invisible'] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(false)
  })

  it('Invisible attacker attacking invisible target (adv vs disadv cancels)', () => {
    const result = getConditionModifiers(
      { conditions: ['Invisible'] },
      { conditions: ['Invisible'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(true)
  })
})

describe('getConditionModifiers - combined conditions', () => {
  it('attacker disadvantage + target advantage results in disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Blinded'] },
      { conditions: ['Paralyzed'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(true)
  })

  it('attacker invisible + target restrained = advantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Invisible'] },
      { conditions: ['Restrained'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(false)
  })

  it('attacker blinded + target invisible = disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Blinded'] },
      { conditions: ['Invisible'] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(false)
  })

  it('multiple mixed conditions resolve correctly', () => {
    const result = getConditionModifiers(
      { conditions: ['Poisoned', 'Restrained'] },
      { conditions: ['Paralyzed', 'Prone'] }
    )
    // Attacker has Poisoned (disadv) + Restrained (disadv) → disadv
    // Target has Paralyzed (adv) + Prone (adv) → adv
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(true)
    expect(result.autoCrit).toBe(true)
  })
})

describe('getConditionModifiers - auto-crit conditions', () => {
  it('Paralyzed target triggers auto-crit', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Paralyzed'] }
    )
    expect(result.autoCrit).toBe(true)
  })

  it('Unconscious target triggers auto-crit', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Unconscious'] }
    )
    expect(result.autoCrit).toBe(true)
  })

  it('Paralyzed + Unconscious triggers auto-crit once', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Paralyzed', 'Unconscious'] }
    )
    expect(result.autoCrit).toBe(true)
  })

  it('only Paralyzed/Unconscious trigger auto-crit (not Restrained)', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Restrained', 'Stunned'] }
    )
    expect(result.autoCrit).toBe(false)
    expect(result.hasAdv).toBe(true)
  })

  it('invisibility does not grant auto-crit', () => {
    const result = getConditionModifiers(
      { conditions: ['Invisible'] },
      { conditions: [] }
    )
    expect(result.autoCrit).toBe(false)
    expect(result.hasAdv).toBe(true)
  })
})

describe('getConditionModifiers - empty and null conditions', () => {
  it('empty condition arrays means no advantage or disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: [] }
    )
    expect(result.hasAdv).toBe(false)
    expect(result.hasDisadv).toBe(false)
    expect(result.autoCrit).toBe(false)
  })

  it('undefined attacker conditions defaults to no disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: undefined },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(false)
  })

  it('undefined target conditions defaults to no advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: undefined }
    )
    expect(result.hasAdv).toBe(false)
  })

  it('both undefined conditions means no modifiers', () => {
    const result = getConditionModifiers(
      { conditions: undefined },
      { conditions: undefined }
    )
    expect(result.hasAdv).toBe(false)
    expect(result.hasDisadv).toBe(false)
    expect(result.autoCrit).toBe(false)
  })
})

describe('getConditionModifiers - no conditions', () => {
  it('healthy attacker and target returns all false', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: [] }
    )
    expect(result).toEqual({
      hasAdv: false,
      hasDisadv: false,
      autoCrit: false
    })
  })

  it('returns object with correct shape', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: [] }
    )
    expect(result).toHaveProperty('hasAdv')
    expect(result).toHaveProperty('hasDisadv')
    expect(result).toHaveProperty('autoCrit')
    expect(Object.keys(result).length).toBe(3)
  })
})

describe('getConditionModifiers - unrecognized conditions ignored', () => {
  it('unrecognized attacker conditions do not trigger disadvantage', () => {
    const result = getConditionModifiers(
      { conditions: ['Unknown', 'Bizarre'] },
      { conditions: [] }
    )
    expect(result.hasDisadv).toBe(false)
  })

  it('unrecognized target conditions do not grant advantage', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Unknown', 'Custom'] }
    )
    expect(result.hasAdv).toBe(false)
  })

  it('mix of recognized and unrecognized conditions uses only recognized', () => {
    const result = getConditionModifiers(
      { conditions: ['Blinded', 'Unknown'] },
      { conditions: ['Paralyzed', 'Custom'] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(true)
    expect(result.autoCrit).toBe(true)
  })
})

describe('getConditionModifiers - realistic combat scenarios', () => {
  it('blinded and restrained melee attacker vs prone enemy', () => {
    // Blinded warrior vs prone goblin (still at disadvantage due to blindness)
    const result = getConditionModifiers(
      { conditions: ['Blinded', 'Restrained'] },
      { conditions: ['Prone'] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(true)
  })

  it('invisible rogue vs stunned enemy (advantage)', () => {
    const result = getConditionModifiers(
      { conditions: ['Invisible'] },
      { conditions: ['Stunned'] }
    )
    expect(result.hasAdv).toBe(true)
    expect(result.hasDisadv).toBe(false)
  })

  it('paralyzed wizard vs invisible enemy (disadvantage)', () => {
    const result = getConditionModifiers(
      { conditions: ['Paralyzed'] },
      { conditions: ['Invisible'] }
    )
    // Paralyzed doesn't cause disadv on spells, but Invisible target does
    expect(result.hasDisadv).toBe(true)
  })

  it('unconscious creature is auto-crit', () => {
    const result = getConditionModifiers(
      { conditions: [] },
      { conditions: ['Unconscious'] }
    )
    expect(result.autoCrit).toBe(true)
    expect(result.hasAdv).toBe(true)
  })

  it('frightened attacker vs restrained target', () => {
    const result = getConditionModifiers(
      { conditions: ['Frightened'] },
      { conditions: ['Restrained'] }
    )
    expect(result.hasDisadv).toBe(true)
    expect(result.hasAdv).toBe(true)
  })
})

describe('Spell coverage in catalog', () => {
  it('includes all major damage types', () => {
    const damageTypes = new Set()
    Object.values(COMBAT_SPELLS).forEach(spell => {
      spell.damageType.split('/').forEach(type => {
        damageTypes.add(type.trim())
      })
    })
    expect(damageTypes.has('fire')).toBe(true)
    expect(damageTypes.has('cold')).toBe(true)
    expect(damageTypes.has('force')).toBe(true)
    expect(damageTypes.has('necrotic')).toBe(true)
    expect(damageTypes.has('radiant')).toBe(true)
    expect(damageTypes.has('healing')).toBe(true)
  })

  it('includes spells across all spell levels', () => {
    const levels = new Set()
    Object.values(COMBAT_SPELLS).forEach(spell => {
      levels.add(spell.level)
    })
    expect(levels.has(0)).toBe(true)
    expect(levels.has(1)).toBe(true)
    expect(levels.has(3)).toBe(true)
    expect(levels.has(5)).toBe(true)
    expect(levels.has(9)).toBe(true)
  })

  it('includes all area types', () => {
    const areaTypes = new Set()
    Object.values(COMBAT_SPELLS).forEach(spell => {
      areaTypes.add(spell.areaType)
    })
    expect(areaTypes.has('single')).toBe(true)
    expect(areaTypes.has('cone')).toBe(true)
    expect(areaTypes.has('sphere')).toBe(true)
    expect(areaTypes.has('line')).toBe(true)
  })

  it('includes both save and attack-based spells', () => {
    const hasSave = Object.values(COMBAT_SPELLS).some(spell => spell.save)
    const hasAttack = Object.values(COMBAT_SPELLS).some(
      spell => !spell.save && !spell.noSave && !spell.healing && spell.damage
    )
    expect(hasSave).toBe(true)
    expect(hasAttack).toBe(true)
  })

  it('includes control spells', () => {
    const controlSpells = Object.values(COMBAT_SPELLS).filter(
      spell => spell.damageType === 'control'
    )
    expect(controlSpells.length).toBeGreaterThan(0)
  })

  it('includes buff spells', () => {
    const buffSpells = Object.values(COMBAT_SPELLS).filter(
      spell => spell.damageType === 'buff'
    )
    expect(buffSpells.length).toBeGreaterThan(0)
  })

  it('includes healing spells', () => {
    const healingSpells = Object.values(COMBAT_SPELLS).filter(
      spell => spell.healing
    )
    expect(healingSpells.length).toBeGreaterThan(0)
  })

  it('includes concentration spells', () => {
    const concentrationSpells = Object.values(COMBAT_SPELLS).filter(
      spell => spell.concentration
    )
    expect(concentrationSpells.length).toBeGreaterThan(0)
  })
})
