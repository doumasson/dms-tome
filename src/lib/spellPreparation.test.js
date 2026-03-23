import { describe, it, expect } from 'vitest';
import {
  isPreparationCaster,
  calculatePreparedSpellCount,
  getAvailableSpellsForPreparation,
  validatePreparedSpells,
  getPreparedSpells,
  setPreparedSpells,
  describeSpellPrepStatus,
  isSpellPrepared,
} from './spellPreparation.js';

describe('spellPreparation', () => {
  const mockSpells = [
    { spellId: 'cure-wounds', id: 'cure-wounds', name: 'Cure Wounds', level: 1, classes: ['Cleric', 'Druid', 'Ranger'] },
    { spellId: 'healing-word', id: 'healing-word', name: 'Healing Word', level: 1, classes: ['Cleric', 'Druid', 'Sorcerer'] },
    { spellId: 'hold-person', id: 'hold-person', name: 'Hold Person', level: 2, classes: ['Cleric', 'Wizard'] },
    { spellId: 'spiritual-weapon', id: 'spiritual-weapon', name: 'Spiritual Weapon', level: 2, classes: ['Cleric'] },
    { spellId: 'fireball', id: 'fireball', name: 'Fireball', level: 3, classes: ['Sorcerer', 'Wizard'] },
    { spellId: 'light', id: 'light', name: 'Light', level: 0, classes: ['Wizard', 'Sorcerer', 'Cleric'] },
    { spellId: 'cantrip-attack', id: 'cantrip-attack', name: 'Attack Cantrip', level: 0, classes: ['Wizard', 'Sorcerer', 'Cleric'] },
  ];

  describe('isPreparationCaster', () => {
    it('should identify preparation casters', () => {
      expect(isPreparationCaster('Cleric')).toBe(true);
      expect(isPreparationCaster('Druid')).toBe(true);
      expect(isPreparationCaster('Monk')).toBe(true);
      expect(isPreparationCaster('Paladin')).toBe(true);
      expect(isPreparationCaster('Wizard')).toBe(true);
    });

    it('should reject non-preparation casters', () => {
      expect(isPreparationCaster('Sorcerer')).toBe(false);
      expect(isPreparationCaster('Bard')).toBe(false);
      expect(isPreparationCaster('Warlock')).toBe(false);
      expect(isPreparationCaster('Rogue')).toBe(false);
    });
  });

  describe('calculatePreparedSpellCount', () => {
    it('should use level + ability modifier formula', () => {
      expect(calculatePreparedSpellCount('Cleric', 5, 2)).toBe(7); // 5 + 2
      expect(calculatePreparedSpellCount('Cleric', 5, -1)).toBe(4); // 5 - 1
    });

    it('should enforce minimum of 1', () => {
      expect(calculatePreparedSpellCount('Cleric', 1, -5)).toBe(1);
    });

    it('should return 0 for non-prep casters', () => {
      expect(calculatePreparedSpellCount('Sorcerer', 5, 2)).toBe(0);
    });

    it('should scale with level', () => {
      const low = calculatePreparedSpellCount('Wizard', 3, 0);
      const high = calculatePreparedSpellCount('Wizard', 10, 0);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('getAvailableSpellsForPreparation', () => {
    it('should return available spells for class and level', () => {
      const available = getAvailableSpellsForPreparation('Cleric', 3, mockSpells);
      expect(available.leveledSpells).toBeDefined();
      expect(available.cantrips).toBeDefined();
      expect(available.total).toBeDefined();
    });

    it('should include cantrips', () => {
      const available = getAvailableSpellsForPreparation('Cleric', 1, mockSpells);
      expect(available.cantrips.length).toBeGreaterThan(0);
      expect(available.cantrips.some(s => s.level === 0)).toBe(true);
    });

    it('should exclude spells above character level', () => {
      const available = getAvailableSpellsForPreparation('Cleric', 1, mockSpells);
      expect(available.leveledSpells.every(s => s.level <= 1)).toBe(true);
    });

    it('should exclude spells class cannot access', () => {
      const available = getAvailableSpellsForPreparation('Cleric', 5, mockSpells);
      expect(available.total.every(s => s.classes?.includes('Cleric'))).toBe(true);
    });

    it('should return empty for non-prep casters', () => {
      const available = getAvailableSpellsForPreparation('Sorcerer', 5, mockSpells);
      expect(available).toEqual([]);
    });
  });

  describe('validatePreparedSpells', () => {
    it('should accept valid spell selection', () => {
      const selected = ['light', 'cure-wounds'];
      const result = validatePreparedSpells('Cleric', 5, 2, selected, mockSpells);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject unknown spells', () => {
      const selected = ['light', 'nonexistent-spell'];
      const result = validatePreparedSpells('Cleric', 5, 2, selected, mockSpells);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject spells above character level', () => {
      const selected = ['cure-wounds', 'fireball']; // Fireball is level 3
      const result = validatePreparedSpells('Cleric', 1, 2, selected, mockSpells); // Only level 1
      expect(result.valid).toBe(false);
    });

    it('should reject over-prepared spells', () => {
      const selected = ['light', 'cure-wounds', 'healing-word'];
      const result = validatePreparedSpells('Cleric', 1, 0, selected, mockSpells); // Max 1 leveled spell
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Too many'))).toBe(true);
    });

    it('should track prepared count', () => {
      const selected = ['light', 'cure-wounds'];
      const result = validatePreparedSpells('Cleric', 5, 2, selected, mockSpells);
      expect(result.selectedCount).toBe(2);
      expect(result.maxPrepared).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getPreparedSpells', () => {
    it('should return prepared spells for prep casters', () => {
      const char = {
        class: 'Cleric',
        preparedSpells: [{ spellId: 'light' }, { spellId: 'cure-wounds' }],
      };
      const prepared = getPreparedSpells(char);
      expect(prepared.length).toBe(2);
    });

    it('should return all spells for non-prep casters', () => {
      const char = {
        class: 'Sorcerer',
        spells: [{ spellId: 'light' }, { spellId: 'fireball' }],
      };
      const prepared = getPreparedSpells(char);
      expect(prepared.length).toBe(2);
    });
  });

  describe('setPreparedSpells', () => {
    it('should set prepared spells for prep casters', () => {
      const char = { class: 'Cleric', spells: mockSpells };
      const updated = setPreparedSpells(char, ['light', 'cure-wounds']);
      expect(updated.preparedSpells).toBeDefined();
      expect(updated.preparedSpells.length).toBe(2);
    });

    it('should not change non-prep casters', () => {
      const char = { class: 'Sorcerer', spells: mockSpells };
      const updated = setPreparedSpells(char, ['light']);
      expect(updated.preparedSpells).toBeUndefined();
    });
  });

  describe('describeSpellPrepStatus', () => {
    it('should describe prep caster status', () => {
      const desc = describeSpellPrepStatus('Cleric', 5, 4, 7);
      expect(desc).toContain('4/7');
      expect(desc).toContain('Cleric');
    });

    it('should describe non-prep caster status', () => {
      const desc = describeSpellPrepStatus('Sorcerer', 5, 0, 0);
      expect(desc).toContain('knows spells');
    });
  });

  describe('isSpellPrepared', () => {
    it('should check prepared spells for prep casters', () => {
      const char = {
        class: 'Cleric',
        preparedSpells: [{ spellId: 'light' }, { spellId: 'cure-wounds' }],
      };
      expect(isSpellPrepared(char, 'light')).toBe(true);
      expect(isSpellPrepared(char, 'healing-word')).toBe(false);
    });

    it('should allow all spells for non-prep casters', () => {
      const char = {
        class: 'Sorcerer',
        spells: [{ spellId: 'light' }, { spellId: 'fireball' }],
      };
      expect(isSpellPrepared(char, 'light')).toBe(true);
      expect(isSpellPrepared(char, 'fireball')).toBe(true);
    });
  });
});
