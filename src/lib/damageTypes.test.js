import { describe, it, expect } from 'vitest'
import {
  calculateActualDamage,
  getRacialResistances,
  getClassResistances,
  getEquipmentResistances,
  getAllDamageResistances,
  isDamageMagical,
  getDamageType,
  DAMAGE_TYPES,
} from './damageTypes'

describe('Damage Types and Resistances', () => {
  describe('calculateActualDamage', () => {
    it('applies full damage when no resistances', () => {
      const target = { name: 'Goblin' }
      const result = calculateActualDamage(10, 'fire', true, target)
      expect(result.actualDamage).toBe(10)
      expect(result.notes).toHaveLength(0)
    })

    it('applies half damage with resistance', () => {
      const target = { name: 'Goblin', resistances: ['fire'] }
      const result = calculateActualDamage(10, 'fire', true, target)
      expect(result.actualDamage).toBe(5)
      expect(result.notes.length).toBeGreaterThan(0)
    })

    it('applies double damage with vulnerability', () => {
      const target = { name: 'Goblin', vulnerabilities: ['fire'] }
      const result = calculateActualDamage(10, 'fire', true, target)
      expect(result.actualDamage).toBe(20)
    })

    it('applies immunity (no damage)', () => {
      const target = { name: 'Construct', immunities: ['poison'] }
      const result = calculateActualDamage(10, 'poison', true, target)
      expect(result.actualDamage).toBe(0)
    })

    it('protects from nonmagical damage', () => {
      const target = { name: 'Ghost', immunities: ['nonmagical'] }
      const result = calculateActualDamage(10, 'slashing', false, target)
      expect(result.actualDamage).toBe(0)
    })

    it('allows magical damage to nonmagical immune target', () => {
      const target = { name: 'Ghost', immunities: ['nonmagical'] }
      const result = calculateActualDamage(10, 'slashing', true, target)
      expect(result.actualDamage).toBe(10)
    })

    it('handles multiple resistances', () => {
      const target = { name: 'Dragon', resistances: ['fire', 'cold', 'lightning'] }
      const result = calculateActualDamage(20, 'fire', true, target)
      expect(result.actualDamage).toBe(10)
    })

    it('applies vulnerability then resistance (vulnerability first)', () => {
      // Creature with vulnerability to fire but resistance to radiant
      const target = { name: 'Vampire', vulnerabilities: ['fire'], resistances: ['radiant'] }
      // Fire damage: 10 base → ×2 vulnerability = 20
      const result = calculateActualDamage(10, 'fire', true, target)
      expect(result.actualDamage).toBe(20)
    })

    it('petrified creature takes 25% damage', () => {
      const target = { name: 'Statue', conditions: ['Petrified'] }
      const result = calculateActualDamage(16, 'bludgeoning', true, target)
      expect(result.actualDamage).toBe(4) // 25% of 16
    })

    it('petrified creature immune to poison', () => {
      const target = { name: 'Statue', conditions: ['Petrified'] }
      const result = calculateActualDamage(10, 'poison', true, target)
      expect(result.actualDamage).toBe(0)
    })

    it('raging barbarian resists B/P/S damage', () => {
      const target = { name: 'Barbarian', conditions: ['Raging'] }
      const result = calculateActualDamage(10, 'bludgeoning', true, target)
      expect(result.actualDamage).toBe(5)
    })

    it('raging barbarian takes full fire damage', () => {
      const target = { name: 'Barbarian', conditions: ['Raging'] }
      const result = calculateActualDamage(10, 'fire', true, target)
      expect(result.actualDamage).toBe(10)
    })

    it('handles null target gracefully', () => {
      const result = calculateActualDamage(10, 'fire', true, null)
      expect(result.actualDamage).toBe(10)
      expect(result.notes).toHaveLength(0)
    })

    it('calculates ceiling for halved odd numbers', () => {
      const target = { name: 'Dragon', resistances: ['fire'] }
      const result = calculateActualDamage(15, 'fire', true, target)
      expect(result.actualDamage).toBe(8) // Ceiling of 7.5
    })

    it('never returns negative damage', () => {
      const target = { name: 'Tank', immunities: ['all damage types'] }
      const result = calculateActualDamage(100, 'bludgeoning', true, target)
      expect(result.actualDamage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getRacialResistances', () => {
    it('returns Dwarf poison resistance', () => {
      const resistances = getRacialResistances('Dwarf')
      expect(resistances.resistances).toContain('poison')
    })

    it('returns Tiefling fire resistance', () => {
      const resistances = getRacialResistances('Tiefling')
      expect(resistances.resistances).toContain('fire')
    })

    it('returns Halfling poison resistance', () => {
      const resistances = getRacialResistances('Halfling')
      expect(resistances.resistances).toContain('poison')
    })

    it('returns empty for Human', () => {
      const resistances = getRacialResistances('Human')
      expect(resistances.resistances.length).toBe(0)
    })

    it('returns empty for unknown race', () => {
      const resistances = getRacialResistances('Unknown')
      expect(resistances.resistances.length).toBe(0)
    })
  })

  describe('getEquipmentResistances', () => {
    it('detects Potion of Fire Resistance', () => {
      const equipment = [
        { name: 'Potion of Fire Resistance' }
      ]
      const resistances = getEquipmentResistances(equipment)
      expect(resistances.resistances).toContain('fire')
    })

    it('handles empty equipment array', () => {
      const resistances = getEquipmentResistances([])
      expect(resistances.resistances.length).toBe(0)
    })

    it('handles null equipment', () => {
      const resistances = getEquipmentResistances(null)
      expect(resistances.resistances.length).toBe(0)
    })

    it('ignores non-resistance items', () => {
      const equipment = [
        { name: 'Longsword' },
        { name: 'Chain Mail' }
      ]
      const resistances = getEquipmentResistances(equipment)
      expect(resistances.resistances.length).toBe(0)
    })

    it('handles multiple resistance items', () => {
      const equipment = [
        { name: 'Potion of Fire Resistance' },
        { name: 'Potion of Fire Resistance' }
      ]
      const resistances = getEquipmentResistances(equipment)
      // Set removes duplicates
      expect(resistances.resistances.length).toBe(1)
    })
  })

  describe('getAllDamageResistances', () => {
    it('compiles resistances from all sources', () => {
      const character = {
        race: 'Tiefling', // fire resistance
        class: 'Barbarian',
        conditions: [],
        resistances: ['cold'],
        equippedItems: []
      }
      const all = getAllDamageResistances(character)
      expect(all.resistances).toContain('fire')
      expect(all.resistances).toContain('cold')
    })

    it('handles character with no resistances', () => {
      const character = { race: 'Human', class: 'Fighter' }
      const all = getAllDamageResistances(character)
      expect(all.resistances.length).toBe(0)
    })

    it('removes duplicate resistances', () => {
      const character = {
        race: 'Dwarf',
        resistances: ['poison', 'poison'],
        equippedItems: []
      }
      const all = getAllDamageResistances(character)
      // Set removes duplicates
      const poisonCount = all.resistances.filter(r => r === 'poison').length
      expect(poisonCount).toBe(1)
    })

    it('handles null character', () => {
      const all = getAllDamageResistances(null)
      expect(all.resistances.length).toBe(0)
      expect(all.immunities.length).toBe(0)
    })

    it('tracks vulnerabilities separately', () => {
      const character = {
        vulnerabilities: ['fire']
      }
      const all = getAllDamageResistances(character)
      expect(all.vulnerabilities).toContain('fire')
      expect(all.resistances).not.toContain('fire')
    })
  })

  describe('isDamageMagical', () => {
    it('identifies spells as magical', () => {
      expect(isDamageMagical({ isSpell: true })).toBe(true)
      expect(isDamageMagical({ type: 'spell' })).toBe(true)
    })

    it('identifies magical weapons as magical', () => {
      expect(isDamageMagical({ name: 'Flaming Sword', magical: true })).toBe(true)
      expect(isDamageMagical({ name: 'Longsword +1', rarity: 'uncommon' })).toBe(true)
    })

    it('identifies mundane weapons as nonmagical', () => {
      expect(isDamageMagical({ name: 'Longsword' })).toBe(false)
      expect(isDamageMagical({ name: 'Shortsword' })).toBe(false)
      expect(isDamageMagical({ name: 'Dagger' })).toBe(false)
    })

    it('handles null source', () => {
      expect(isDamageMagical(null)).toBe(false)
    })

    it('defaults to nonmagical for unknown weapons', () => {
      expect(isDamageMagical({ name: 'Unknown Weapon' })).toBe(false)
    })
  })

  describe('getDamageType', () => {
    it('extracts damage type from source', () => {
      expect(getDamageType({ damageType: 'fire' })).toBe('fire')
      expect(getDamageType({ type: 'fire' })).toBe('fire')
    })

    it('detects fire damage from text', () => {
      expect(getDamageType({ damageText: 'deals fire damage' })).toBe('fire')
    })

    it('defaults to bludgeoning for melee', () => {
      expect(getDamageType({ isMeleeAttack: true })).toBe('bludgeoning')
    })

    it('defaults to bludgeoning when unknown', () => {
      expect(getDamageType({ name: 'Unknown Attack' })).toBe('bludgeoning')
    })

    it('handles null source', () => {
      expect(getDamageType(null)).toBe('bludgeoning')
    })
  })

  describe('Integration scenarios', () => {
    it('fire resistant red dragon takes half fire damage', () => {
      const dragon = {
        name: 'Red Dragon',
        resistances: ['fire', 'cold']
      }
      const damage = calculateActualDamage(20, 'fire', true, dragon)
      expect(damage.actualDamage).toBe(10)
    })

    it('stone golem immune to poison but vulnerable to magic', () => {
      const golem = {
        name: 'Stone Golem',
        immunities: ['poison'],
        vulnerabilities: [],
        conditions: ['Petrified']
      }
      // Poison damage
      const poison = calculateActualDamage(10, 'poison', true, golem)
      expect(poison.actualDamage).toBe(0)

      // Physical damage (petrified reduces to 25%)
      const physical = calculateActualDamage(16, 'bludgeoning', true, golem)
      expect(physical.actualDamage).toBe(4)
    })

    it('vampire with fire vulnerability and radiant resistance', () => {
      const vampire = {
        name: 'Vampire',
        vulnerabilities: ['fire'],
        resistances: ['radiant', 'necrotic']
      }

      // Fire damage: doubled
      const fire = calculateActualDamage(10, 'fire', true, vampire)
      expect(fire.actualDamage).toBe(20)

      // Radiant damage: halved (but not doubled)
      const radiant = calculateActualDamage(10, 'radiant', true, vampire)
      expect(radiant.actualDamage).toBe(5)
    })

    it('tiefling barbarian resists both fire and bludgeoning in rage', () => {
      // Get racial resistances and add to character
      const racialResist = getRacialResistances('Tiefling')
      const tiefling = {
        name: 'Tiefling Barbarian',
        race: 'Tiefling',
        conditions: ['Raging'],
        resistances: [...racialResist.resistances]
      }

      // Fire damage with racial resistance
      const fire = calculateActualDamage(10, 'fire', true, tiefling)
      expect(fire.actualDamage).toBe(5) // Fire resistance from race

      // Bludgeoning with rage resistance (no racial, but rage gives it)
      const bludgeon = calculateActualDamage(10, 'bludgeoning', true, tiefling)
      expect(bludgeon.actualDamage).toBe(5) // Rage resistance
    })

    it('ghost immune to nonmagical damage but not magical', () => {
      const ghost = {
        name: 'Specter',
        immunities: ['nonmagical']
      }

      // Nonmagical sword
      const sword = calculateActualDamage(10, 'slashing', false, ghost)
      expect(sword.actualDamage).toBe(0)

      // Magical spell
      const spell = calculateActualDamage(10, 'fire', true, ghost)
      expect(spell.actualDamage).toBe(10)
    })
  })

  describe('Damage type constants', () => {
    it('has all 13 damage types', () => {
      const types = Object.values(DAMAGE_TYPES)
      expect(types.length).toBe(13)
    })

    it('includes physical damage types', () => {
      expect(DAMAGE_TYPES.BLUDGEONING).toBe('bludgeoning')
      expect(DAMAGE_TYPES.PIERCING).toBe('piercing')
      expect(DAMAGE_TYPES.SLASHING).toBe('slashing')
    })

    it('includes elemental damage types', () => {
      expect(DAMAGE_TYPES.FIRE).toBe('fire')
      expect(DAMAGE_TYPES.COLD).toBe('cold')
      expect(DAMAGE_TYPES.LIGHTNING).toBe('lightning')
    })

    it('includes exotic damage types', () => {
      expect(DAMAGE_TYPES.PSYCHIC).toBe('psychic')
      expect(DAMAGE_TYPES.FORCE).toBe('force')
      expect(DAMAGE_TYPES.NECROTIC).toBe('necrotic')
    })
  })
})
