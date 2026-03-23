import { describe, it, expect } from 'vitest';
import {
  executeAbility,
  resolveLairAction,
  spawnMinions,
  isLegendaryAbility,
} from './abilityResolver.js';

describe('abilityResolver', () => {
  const mockBoss = {
    id: 'boss_1',
    name: 'Test Boss',
    currentHp: 50,
    maxHp: 100,
    ac: 16,
    cr: 5,
    position: { x: 10, y: 10 },
    attackBonus: 5,
  };

  const mockTarget = {
    id: 'player_1',
    name: 'Player',
    currentHp: 30,
    maxHp: 40,
    ac: 14,
    position: { x: 15, y: 10 },
    type: 'player',
  };

  describe('executeAbility', () => {
    it('should execute MULTI_ATTACK ability', () => {
      const result = executeAbility('MULTI_ATTACK', mockBoss, [mockTarget], {});
      expect(result).toBeDefined();
      expect(result.narrative).toBeDefined();
      expect(result.narrative).toContain('attacks');
    });

    it('should execute REGENERATION ability', () => {
      const result = executeAbility('REGENERATION', mockBoss, [], {});
      expect(result).toBeDefined();
      expect(result.healAmount).toBeGreaterThan(0);
      expect(result.healTarget).toBe('boss_1');
      expect(result.narrative).toContain('regenerate');
    });

    it('should execute MAGIC_RESISTANCE ability', () => {
      const result = executeAbility('MAGIC_RESISTANCE', mockBoss, [], {});
      expect(result).toBeDefined();
      expect(result.conditions.length).toBeGreaterThan(0);
      expect(result.conditions[0].type).toContain('MAGIC');
    });

    it('should execute SPELL_IMMUNITY ability', () => {
      const result = executeAbility('SPELL_IMMUNITY', mockBoss, [], {});
      expect(result).toBeDefined();
      expect(result.conditions.length).toBeGreaterThan(0);
    });

    it('should execute DAMAGE_IMMUNITY ability', () => {
      const result = executeAbility('DAMAGE_IMMUNITY', mockBoss, [], {});
      expect(result).toBeDefined();
      expect(result.conditions.length).toBeGreaterThan(0);
    });

    it('should execute AURA ability', () => {
      const result = executeAbility('AURA', mockBoss, [mockTarget], {});
      expect(result).toBeDefined();
      expect(result.narrative).toBeDefined();
      expect(result.conditions).toBeDefined();
    });

    it('should execute TELEPORT ability', () => {
      const result = executeAbility('TELEPORT', mockBoss, [mockTarget], {});
      expect(result).toBeDefined();
      expect(result.position).toBeDefined();
      expect(result.position.x).toBeDefined();
      expect(result.position.y).toBeDefined();
    });

    it('should handle unknown ability gracefully', () => {
      const result = executeAbility('NONEXISTENT', mockBoss, [], {});
      expect(result).toBeDefined();
      expect(result.damage).toBe(0);
    });

    it('should return non-empty narrative for all abilities', () => {
      const abilities = ['MULTI_ATTACK', 'REGENERATION', 'MAGIC_RESISTANCE', 'AURA', 'TELEPORT'];
      for (const ability of abilities) {
        const result = executeAbility(ability, mockBoss, [mockTarget], {});
        expect(result.narrative).toBeDefined();
        expect(result.narrative.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resolveLairAction', () => {
    const mockPhase = {
      lairActionEnabled: true,
      number: 3,
    };

    const mockEncounter = {
      combatants: [mockTarget, { ...mockBoss, type: 'enemy' }],
    };

    it('should return empty result when lair action disabled', () => {
      const phase = { lairActionEnabled: false };
      const result = resolveLairAction(phase, mockEncounter);
      expect(result.narrative).toBe('');
    });

    it('should generate lair action when enabled', () => {
      const result = resolveLairAction(mockPhase, mockEncounter);
      expect(result.narrative).toBeDefined();
      expect(result.narrative.length).toBeGreaterThan(0);
    });

    it('should generate damage based on party size', () => {
      const result = resolveLairAction(mockPhase, mockEncounter);
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should include name for lair action', () => {
      const result = resolveLairAction(mockPhase, mockEncounter);
      expect(result.name).toBeDefined();
    });

    it('should scale damage with party size', () => {
      const singleParty = { combatants: [mockTarget] };
      const largeParty = { combatants: [mockTarget, { ...mockTarget, id: 'p2' }, { ...mockTarget, id: 'p3' }] };

      const result1 = resolveLairAction(mockPhase, singleParty);
      const result2 = resolveLairAction(mockPhase, largeParty);

      // Larger party should take more total damage
      expect(result2.damage).toBeGreaterThanOrEqual(result1.damage);
    });
  });

  describe('spawnMinions', () => {
    it('should spawn correct count of minions', () => {
      const minions = spawnMinions(
        { type: 'Goblin', count: 3 },
        { x: 10, y: 10 },
        []
      );
      expect(minions.length).toBe(3);
    });

    it('should return empty array when no minions specified', () => {
      const minions = spawnMinions(null, { x: 10, y: 10 }, []);
      expect(minions).toEqual([]);
    });

    it('should give minions correct type', () => {
      const minions = spawnMinions(
        { type: 'Goblin', count: 2 },
        { x: 10, y: 10 },
        []
      );
      expect(minions[0].originalName).toBe('Goblin');
      expect(minions[1].originalName).toBe('Goblin');
    });

    it('should give minions sequential names', () => {
      const minions = spawnMinions(
        { type: 'Hobgoblin', count: 3 },
        { x: 10, y: 10 },
        []
      );
      expect(minions[0].name).toBe('Hobgoblin 1');
      expect(minions[1].name).toBe('Hobgoblin 2');
      expect(minions[2].name).toBe('Hobgoblin 3');
    });

    it('should set all minions as enemies', () => {
      const minions = spawnMinions(
        { type: 'Cultist', count: 2 },
        { x: 10, y: 10 },
        []
      );
      expect(minions[0].type).toBe('enemy');
      expect(minions[1].type).toBe('enemy');
    });

    it('should give minions positions near spawn point', () => {
      const minions = spawnMinions(
        { type: 'Goblin', count: 3 },
        { x: 10, y: 10 },
        []
      );
      for (const minion of minions) {
        expect(minion.position.x).toBeGreaterThanOrEqual(10);
        expect(minion.position.y).toEqual(10);
      }
    });

    it('should continue numbering from existing minions', () => {
      const existing = [
        { originalName: 'Goblin', name: 'Goblin 1' },
        { originalName: 'Goblin', name: 'Goblin 2' },
      ];
      const minions = spawnMinions(
        { type: 'Goblin', count: 2 },
        { x: 10, y: 10 },
        existing
      );
      expect(minions[0].name).toBe('Goblin 3');
      expect(minions[1].name).toBe('Goblin 4');
    });

    it('should give minions correct stats', () => {
      const minions = spawnMinions(
        { type: 'Hobgoblin', count: 1 },
        { x: 10, y: 10 },
        []
      );
      const minion = minions[0];
      expect(minion.hp).toBe(11);
      expect(minion.ac).toBe(18);
      expect(minion.cr).toBe(0.5);
    });
  });

  describe('isLegendaryAbility', () => {
    it('should identify MULTI_ATTACK as legendary', () => {
      expect(isLegendaryAbility('MULTI_ATTACK')).toBe(true);
    });

    it('should identify TELEPORT as legendary', () => {
      expect(isLegendaryAbility('TELEPORT')).toBe(true);
    });

    it('should not identify REGENERATION as legendary', () => {
      expect(isLegendaryAbility('REGENERATION')).toBe(false);
    });

    it('should not identify AURA as legendary', () => {
      expect(isLegendaryAbility('AURA')).toBe(false);
    });

    it('should not identify unknown abilities as legendary', () => {
      expect(isLegendaryAbility('NONEXISTENT')).toBe(false);
    });
  });
});
