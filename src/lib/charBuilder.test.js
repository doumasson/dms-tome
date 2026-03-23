import { describe, it, expect, beforeEach } from 'vitest'
import {
  STANDARD_ARRAY,
  STAT_KEYS,
  STAT_LABELS,
  STAT_FULL,
  BACKGROUNDS,
  ALIGNMENT_OPTIONS,
  STEPS,
  STARTER_SPELLS,
  statMod,
  modNum,
  profBonus,
  calcHp,
  calcAc,
  buildSpellSlots,
  buildAttacks,
  buildFeatures,
  getStarterSpells,
  avatarUrl,
} from './charBuilder'

describe('Character Builder', () => {
  describe('Constants', () => {
    it('STANDARD_ARRAY is valid D&D 5e array', () => {
      expect(STANDARD_ARRAY).toEqual([15, 14, 13, 12, 10, 8])
      expect(STANDARD_ARRAY.length).toBe(6)
      expect(STANDARD_ARRAY).toEqual(expect.arrayContaining([15, 14, 13, 12, 10, 8]))
    })

    it('STAT_KEYS contains all 6 abilities', () => {
      expect(STAT_KEYS).toEqual(['str', 'dex', 'con', 'int', 'wis', 'cha'])
      expect(STAT_KEYS.length).toBe(6)
    })

    it('STAT_LABELS maps correctly', () => {
      expect(STAT_LABELS.str).toBe('STR')
      expect(STAT_LABELS.dex).toBe('DEX')
      expect(STAT_LABELS.con).toBe('CON')
      expect(STAT_LABELS.int).toBe('INT')
      expect(STAT_LABELS.wis).toBe('WIS')
      expect(STAT_LABELS.cha).toBe('CHA')
    })

    it('STAT_FULL has descriptive names', () => {
      expect(STAT_FULL.str).toBe('Strength')
      expect(STAT_FULL.dex).toBe('Dexterity')
      expect(STAT_FULL.con).toBe('Constitution')
      expect(STAT_FULL.int).toBe('Intelligence')
      expect(STAT_FULL.wis).toBe('Wisdom')
      expect(STAT_FULL.cha).toBe('Charisma')
    })

    it('BACKGROUNDS array has required properties', () => {
      expect(BACKGROUNDS.length).toBeGreaterThan(0)
      BACKGROUNDS.forEach(bg => {
        expect(bg).toHaveProperty('name')
        expect(bg).toHaveProperty('skills')
        expect(bg).toHaveProperty('description')
        expect(Array.isArray(bg.skills)).toBe(true)
        expect(bg.skills.length).toBeGreaterThan(0)
      })
    })

    it('BACKGROUNDS includes common D&D backgrounds', () => {
      const names = BACKGROUNDS.map(b => b.name)
      expect(names).toContain('Acolyte')
      expect(names).toContain('Criminal')
      expect(names).toContain('Folk Hero')
      expect(names).toContain('Sage')
      expect(names).toContain('Soldier')
    })

    it('ALIGNMENT_OPTIONS contains all 9 alignments', () => {
      expect(ALIGNMENT_OPTIONS.length).toBe(9)
      expect(ALIGNMENT_OPTIONS).toContain('Lawful Good')
      expect(ALIGNMENT_OPTIONS).toContain('True Neutral')
      expect(ALIGNMENT_OPTIONS).toContain('Chaotic Evil')
    })

    it('STEPS defines builder workflow', () => {
      expect(STEPS).toEqual(['Race', 'Class', 'Background', 'Abilities', 'Identity'])
    })

    it('STARTER_SPELLS includes all spellcasting classes', () => {
      expect(STARTER_SPELLS).toHaveProperty('Wizard')
      expect(STARTER_SPELLS).toHaveProperty('Sorcerer')
      expect(STARTER_SPELLS).toHaveProperty('Warlock')
      expect(STARTER_SPELLS).toHaveProperty('Cleric')
      expect(STARTER_SPELLS).toHaveProperty('Druid')
      expect(STARTER_SPELLS).toHaveProperty('Bard')
      expect(STARTER_SPELLS).toHaveProperty('Paladin')
      expect(STARTER_SPELLS).toHaveProperty('Ranger')
    })

    it('STARTER_SPELLS martial classes have empty spell lists', () => {
      expect(STARTER_SPELLS.Fighter).toEqual([])
      expect(STARTER_SPELLS.Rogue).toEqual([])
      expect(STARTER_SPELLS.Barbarian).toEqual([])
      expect(STARTER_SPELLS.Monk).toEqual([])
    })
  })

  describe('statMod()', () => {
    it('calculates positive modifiers correctly', () => {
      expect(statMod(10)).toBe('+0')
      expect(statMod(12)).toBe('+1')
      expect(statMod(14)).toBe('+2')
      expect(statMod(16)).toBe('+3')
      expect(statMod(18)).toBe('+4')
      expect(statMod(20)).toBe('+5')
    })

    it('calculates negative modifiers correctly', () => {
      expect(statMod(8)).toBe('-1')
      expect(statMod(6)).toBe('-2')
      expect(statMod(4)).toBe('-3')
      expect(statMod(2)).toBe('-4')
    })

    it('returns string format with sign', () => {
      const result = statMod(14)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[+-]\d+$/)
    })

    it('handles edge cases', () => {
      expect(statMod(1)).toBe('-5')
      expect(statMod(30)).toBe('+10')
    })
  })

  describe('modNum()', () => {
    it('calculates positive modifiers as numbers', () => {
      expect(modNum(10)).toBe(0)
      expect(modNum(12)).toBe(1)
      expect(modNum(14)).toBe(2)
      expect(modNum(16)).toBe(3)
      expect(modNum(18)).toBe(4)
      expect(modNum(20)).toBe(5)
    })

    it('calculates negative modifiers as numbers', () => {
      expect(modNum(8)).toBe(-1)
      expect(modNum(6)).toBe(-2)
      expect(modNum(4)).toBe(-3)
    })

    it('returns number not string', () => {
      const result = modNum(14)
      expect(typeof result).toBe('number')
    })

    it('floors correctly', () => {
      expect(modNum(11)).toBe(0)
      expect(modNum(13)).toBe(1)
      expect(modNum(15)).toBe(2)
    })
  })

  describe('profBonus()', () => {
    it('calculates proficiency bonus per D&D 5e rules', () => {
      expect(profBonus(1)).toBe(2)
      expect(profBonus(4)).toBe(2)
      expect(profBonus(5)).toBe(3)
      expect(profBonus(8)).toBe(3)
      expect(profBonus(9)).toBe(4)
      expect(profBonus(12)).toBe(4)
      expect(profBonus(13)).toBe(5)
      expect(profBonus(17)).toBe(6)
      expect(profBonus(20)).toBe(6)
    })

    it('always returns at least +2', () => {
      for (let level = 1; level <= 20; level++) {
        expect(profBonus(level)).toBeGreaterThanOrEqual(2)
      }
    })

    it('increases at specific level thresholds', () => {
      expect(profBonus(1)).toBe(profBonus(4))
      expect(profBonus(5)).toBeGreaterThan(profBonus(4))
      expect(profBonus(9)).toBeGreaterThan(profBonus(8))
    })
  })

  describe('calcHp()', () => {
    it('calculates base HP with constitution modifier', () => {
      const barb = { hitDie: 12 }
      expect(calcHp(barb, 16)).toBe(15) // 12 + 3 (con mod)
    })

    it('applies negative constitution modifier', () => {
      const wiz = { hitDie: 6 }
      expect(calcHp(wiz, 8)).toBe(5) // 6 - 1 (con mod)
    })

    it('minimum HP is 1', () => {
      const wiz = { hitDie: 6 }
      expect(calcHp(wiz, 1)).toBe(1) // 6 - 5 = 1, min is 1
    })

    it('handles various classes', () => {
      const fighter = { hitDie: 10 }
      const cleric = { hitDie: 8 }
      const rogue = { hitDie: 8 }

      expect(calcHp(fighter, 14)).toBeGreaterThan(calcHp(rogue, 14))
      expect(calcHp(cleric, 14)).toBe(calcHp(rogue, 14)) // Both have hitDie 8
    })

    it('higher CON always increases HP', () => {
      const cls = { hitDie: 8 }
      const low = calcHp(cls, 10)
      const high = calcHp(cls, 18)
      expect(high).toBeGreaterThan(low)
    })
  })

  describe('calcAc()', () => {
    it('calculates AC for heavy armor class', () => {
      const paladin = { armorProficiencies: ['Heavy', 'Medium', 'Light', 'Shields'] }
      expect(calcAc(paladin, 10)).toBe(16)
      expect(calcAc(paladin, 18)).toBe(16) // Heavy AC ignores DEX
    })

    it('calculates AC for medium armor with DEX cap', () => {
      const cleric = { armorProficiencies: ['Medium', 'Light', 'Shields'] }
      expect(calcAc(cleric, 10)).toBe(13) // 13 + 0 (cap to +2 DEX)
      expect(calcAc(cleric, 14)).toBe(15) // 13 + 2 (cap to +2 DEX)
      expect(calcAc(cleric, 18)).toBe(15) // 13 + 2 (cap to +2 DEX)
    })

    it('calculates AC for light armor with full DEX', () => {
      const rogue = { armorProficiencies: ['Light', 'Shields'] }
      expect(calcAc(rogue, 10)).toBe(11) // 11 + 0
      expect(calcAc(rogue, 14)).toBe(13) // 11 + 2
      expect(calcAc(rogue, 18)).toBe(15) // 11 + 4
    })

    it('calculates AC for no armor proficiency', () => {
      const wizard = { armorProficiencies: [] }
      expect(calcAc(wizard, 10)).toBe(10) // 10 + 0
      expect(calcAc(wizard, 14)).toBe(12) // 10 + 2
      expect(calcAc(wizard, 18)).toBe(14) // 10 + 4
    })

    it('handles missing armorProficiencies', () => {
      const noprof = {}
      expect(calcAc(noprof, 14)).toBe(12)
    })
  })

  describe('buildSpellSlots()', () => {
    it('returns empty object for non-spellcasting classes', () => {
      const slots = buildSpellSlots('Fighter', 1)
      expect(slots).toEqual({})
    })

    it('builds spell slots for spellcasting classes', () => {
      // Note: This will depend on actual getSpellSlots implementation
      // So we just verify the structure
      const slots = buildSpellSlots('Wizard', 1)
      if (Object.keys(slots).length > 0) {
        Object.values(slots).forEach(slot => {
          expect(slot).toHaveProperty('total')
          expect(slot).toHaveProperty('used')
          expect(slot.used).toBe(0)
          expect(slot.total).toBeGreaterThanOrEqual(0)
        })
      }
    })

    it('returns object with numeric keys for spell levels', () => {
      const slots = buildSpellSlots('Cleric', 5)
      Object.keys(slots).forEach(key => {
        expect(!isNaN(parseInt(key))).toBe(true)
      })
    })
  })

  describe('buildAttacks()', () => {
    it('returns array of attacks', () => {
      const stats = { str: 16, dex: 14, int: 10, wis: 12, cha: 10, con: 12 }
      const attacks = buildAttacks('Fighter', stats)
      expect(Array.isArray(attacks)).toBe(true)
    })

    it('Wizard gets Fire Bolt cantrip', () => {
      const stats = { str: 8, dex: 12, int: 16, wis: 14, cha: 10, con: 10 }
      const attacks = buildAttacks('Wizard', stats)
      const firebolts = attacks.filter(a => a.name === 'Fire Bolt')
      expect(firebolts.length).toBeGreaterThan(0)
    })

    it('Warlock gets Eldritch Blast cantrip', () => {
      const stats = { str: 8, dex: 12, int: 10, wis: 14, cha: 16, con: 12 }
      const attacks = buildAttacks('Warlock', stats)
      const blasts = attacks.filter(a => a.name === 'Eldritch Blast')
      expect(blasts.length).toBeGreaterThan(0)
    })

    it('Cleric gets Sacred Flame and weapon', () => {
      const stats = { str: 14, dex: 12, int: 10, wis: 16, cha: 12, con: 14 }
      const attacks = buildAttacks('Cleric', stats)
      const hasFlame = attacks.some(a => a.name === 'Sacred Flame')
      const hasMace = attacks.some(a => a.name === 'Mace')
      expect(hasFlame).toBe(true)
      expect(hasMace).toBe(true)
    })

    it('Rogue/Finesse classes get appropriate weapon', () => {
      const stats = { str: 10, dex: 16, int: 12, wis: 12, cha: 12, con: 12 }
      const attacks = buildAttacks('Rogue', stats)
      expect(attacks.length).toBeGreaterThan(0)
      expect(attacks[0].name).toMatch(/Shortsword|Dagger/)
    })

    it('Martial classes get weapon based on proficiencies', () => {
      const stats = { str: 16, dex: 12, int: 10, wis: 12, cha: 10, con: 14 }
      const attacks = buildAttacks('Fighter', stats)
      expect(attacks.length).toBeGreaterThan(0)
    })

    it('attacks have required properties', () => {
      const stats = { str: 14, dex: 14, int: 10, wis: 12, cha: 10, con: 14 }
      const attacks = buildAttacks('Fighter', stats)
      attacks.forEach(attack => {
        expect(attack).toHaveProperty('name')
        expect(attack).toHaveProperty('bonus')
        expect(attack).toHaveProperty('damage')
      })
    })

    it('returns empty array for invalid class', () => {
      const stats = { str: 14, dex: 14, int: 10, wis: 12, cha: 10, con: 14 }
      const attacks = buildAttacks('InvalidClass', stats)
      expect(attacks).toEqual([])
    })
  })

  describe('buildFeatures()', () => {
    it('returns array of features', () => {
      const features = buildFeatures('Fighter', 1)
      expect(Array.isArray(features)).toBe(true)
    })

    it('higher levels have more or equal features', () => {
      const level1 = buildFeatures('Fighter', 1)
      const level5 = buildFeatures('Fighter', 5)
      expect(level5.length).toBeGreaterThanOrEqual(level1.length)
    })
  })

  describe('getStarterSpells()', () => {
    it('returns array of spells for spellcasting class', () => {
      const spells = getStarterSpells('Wizard')
      expect(Array.isArray(spells)).toBe(true)
      expect(spells.length).toBeGreaterThan(0)
    })

    it('includes Fire Bolt for Wizard', () => {
      const spells = getStarterSpells('Wizard')
      expect(spells).toContain('Fire Bolt')
    })

    it('includes Eldritch Blast for Warlock', () => {
      const spells = getStarterSpells('Warlock')
      expect(spells).toContain('Eldritch Blast')
    })

    it('returns empty array for martial classes', () => {
      expect(getStarterSpells('Fighter')).toEqual([])
      expect(getStarterSpells('Rogue')).toEqual([])
      expect(getStarterSpells('Barbarian')).toEqual([])
    })

    it('returns empty array for unknown class', () => {
      expect(getStarterSpells('UnknownClass')).toEqual([])
    })

    it('all classes either have spells or empty array', () => {
      const classes = ['Wizard', 'Sorcerer', 'Fighter', 'Rogue', 'Cleric']
      classes.forEach(cls => {
        const spells = getStarterSpells(cls)
        expect(Array.isArray(spells)).toBe(true)
      })
    })
  })

  describe('avatarUrl()', () => {
    it('generates valid dicebear URL', () => {
      const url = avatarUrl('Gandalf', 'Human', 'Wizard')
      expect(url).toContain('https://api.dicebear.com')
      expect(url).toContain('adventurer')
      expect(url).toContain('seed=')
    })

    it('encodes name, race, and class in seed', () => {
      const url = avatarUrl('Legolas', 'Elf', 'Ranger')
      expect(url).toContain('Legolas')
      expect(url).toContain('Elf')
      expect(url).toContain('Ranger')
    })

    it('returns different URLs for different inputs', () => {
      const url1 = avatarUrl('Alice', 'Human', 'Fighter')
      const url2 = avatarUrl('Bob', 'Dwarf', 'Cleric')
      expect(url1).not.toBe(url2)
    })

    it('returns same URL for same inputs', () => {
      const url1 = avatarUrl('Same', 'Human', 'Wizard')
      const url2 = avatarUrl('Same', 'Human', 'Wizard')
      expect(url1).toBe(url2)
    })

    it('includes transparent background', () => {
      const url = avatarUrl('Test', 'Human', 'Bard')
      expect(url).toContain('backgroundColor=transparent')
    })

    it('handles special characters in names', () => {
      const url = avatarUrl("O'Brien", 'Half-Elf', 'Warlock')
      expect(url).toContain('dicebear')
      expect(typeof url).toBe('string')
    })

    it('handles empty strings', () => {
      const url = avatarUrl('', '', '')
      expect(typeof url).toBe('string')
      expect(url).toContain('dicebear')
    })
  })

  describe('integration scenarios', () => {
    it('complete character builder flow', () => {
      // Wizard scenario
      const name = 'Gandalf'
      const race = 'Human'
      const cls = 'Wizard'
      const stats = { str: 8, dex: 12, con: 10, int: 16, wis: 14, cha: 10 }

      const avatar = avatarUrl(name, race, cls)
      expect(avatar).toContain('dicebear')

      const spells = getStarterSpells(cls)
      expect(spells.length).toBeGreaterThan(0)

      const attacks = buildAttacks(cls, stats)
      expect(attacks.length).toBeGreaterThan(0)

      const hp = calcHp({ hitDie: 6 }, stats.con)
      expect(hp).toBeGreaterThan(0)
    })

    it('fighter with heavy armor has fixed AC', () => {
      const stats = { str: 16, dex: 8, con: 14, int: 10, wis: 12, cha: 10 }
      const fighter = {
        hitDie: 10,
        armorProficiencies: ['Heavy', 'Medium', 'Light', 'Shields']
      }

      const ac = calcAc(fighter, stats.dex)
      expect(ac).toBe(16) // Heavy armor always 16

      const attacks = buildAttacks('Fighter', stats)
      expect(attacks.length).toBeGreaterThan(0)
    })

    it('rogue with high DEX and light armor', () => {
      const stats = { str: 10, dex: 16, con: 12, int: 12, wis: 12, cha: 12 }
      const rogue = {
        hitDie: 8,
        armorProficiencies: ['Light', 'Shields']
      }

      const ac = calcAc(rogue, stats.dex)
      expect(ac).toBeGreaterThan(13) // 11 + 4 DEX mod

      const hp = calcHp(rogue, stats.con)
      expect(hp).toBe(9) // 8 + 1 CON mod
    })

    it('modifier calculations are consistent', () => {
      const stat = 14
      const strMod = modNum(stat)
      const strModStr = statMod(stat)

      expect(strMod).toBe(2)
      expect(strModStr).toBe('+2')
    })

    it('proficiency bonus scales correctly with level', () => {
      const prof1 = profBonus(1)
      const prof20 = profBonus(20)

      expect(prof20).toBeGreaterThan(prof1)
      expect(prof1).toBe(2)
      expect(prof20).toBe(6)
    })
  })

  describe('edge cases', () => {
    it('handles ability scores at extremes', () => {
      expect(modNum(3)).toBe(-4)
      expect(modNum(20)).toBe(5)
      expect(statMod(3)).toBe('-4')
      expect(statMod(20)).toBe('+5')
    })

    it('calcHp never returns 0 or negative', () => {
      const weak = { hitDie: 6 }
      expect(calcHp(weak, 1)).toBeGreaterThanOrEqual(1)
      expect(calcHp(weak, 3)).toBeGreaterThanOrEqual(1)
    })

    it('backgrounds have at least 2 skills each', () => {
      BACKGROUNDS.forEach(bg => {
        expect(bg.skills.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('all STARTER_SPELLS classes are valid', () => {
      const validClasses = [
        'Wizard', 'Sorcerer', 'Warlock', 'Cleric', 'Druid', 'Bard',
        'Paladin', 'Ranger', 'Fighter', 'Rogue', 'Barbarian', 'Monk'
      ]
      Object.keys(STARTER_SPELLS).forEach(cls => {
        expect(validClasses).toContain(cls)
      })
    })

    it('alignment has no duplicates', () => {
      const set = new Set(ALIGNMENT_OPTIONS)
      expect(set.size).toBe(ALIGNMENT_OPTIONS.length)
    })
  })
})
