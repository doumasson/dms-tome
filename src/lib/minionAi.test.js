import { describe, it, expect } from 'vitest';
import {
  getMinionsActionPriority,
  shouldMinionRetreat,
  calculateFlankingBonus,
  describeMinionsStatus,
} from './minionAi.js';

describe('minionAi', () => {
  const mockBoss = {
    id: 'boss_1',
    name: 'Dragon Lord',
    currentHp: 100,
    maxHp: 150,
    position: { x: 5, y: 5 },
  };

  const mockMinion = {
    id: 'minion_1',
    name: 'Goblin',
    currentHp: 10,
    maxHp: 10,
    position: { x: 4, y: 5 },
  };

  const mockEnemy = {
    id: 'player_1',
    name: 'Fighter',
    currentHp: 40,
    maxHp: 50,
    position: { x: 2, y: 5 },
  };

  describe('getMinionsActionPriority', () => {
    it('should return idle if minion has no position', () => {
      const minion = { ...mockMinion, position: null };
      const result = getMinionsActionPriority(minion, mockBoss, [], [mockEnemy]);
      expect(result.action).toBe('idle');
    });

    it('should protect boss when boss is endangered', () => {
      const damagedBoss = { ...mockBoss, currentHp: 30 }; // 20% HP
      const distantMinion = { ...mockMinion, position: { x: 8, y: 5 } }; // Far away
      const nearbyEnemy = { ...mockEnemy, position: { x: 4, y: 5 } }; // Adjacent to boss
      const result = getMinionsActionPriority(distantMinion, damagedBoss, [], [nearbyEnemy]);
      expect(result.action).toBe('defend-boss');
    });

    it('should attack adjacent enemies', () => {
      const adjacentEnemy = { ...mockEnemy, position: { x: 5, y: 5 } }; // Adjacent to minion
      const result = getMinionsActionPriority(mockMinion, mockBoss, [], [adjacentEnemy]);
      expect(result.action).toBe('attack');
      expect(result.targetId).toBe(adjacentEnemy.id);
    });

    it('should advance toward distant enemies', () => {
      const result = getMinionsActionPriority(mockMinion, mockBoss, [], [mockEnemy]);
      expect(['advance', 'attack']).toContain(result.action);
    });

    it('should idle when no enemies present', () => {
      const result = getMinionsActionPriority(mockMinion, mockBoss, [], []);
      expect(result.action).toBe('idle');
    });

    it('should have narrative descriptions for all actions', () => {
      const result = getMinionsActionPriority(mockMinion, mockBoss, [], [mockEnemy]);
      expect(result.narrative).toBeDefined();
      expect(result.narrative.length).toBeGreaterThan(0);
    });
  });

  describe('shouldMinionRetreat', () => {
    it('should retreat when boss is dead', () => {
      const deadBoss = { ...mockBoss, currentHp: 0 };
      const result = shouldMinionRetreat(mockMinion, deadBoss, [], [mockEnemy]);
      expect(result).toBe(true);
    });

    it('should retreat when minion is last standing and enemies alive', () => {
      const result = shouldMinionRetreat(mockMinion, mockBoss, [], [mockEnemy]);
      expect(result).toBe(true);
    });

    it('should not retreat when boss is alive and minions present', () => {
      const allies = [{ id: 'minion_2', currentHp: 10 }];
      const result = shouldMinionRetreat(mockMinion, mockBoss, allies, []);
      expect(result).toBe(false);
    });

    it('should retreat when severely wounded and outnumbered', () => {
      const woundedMinion = { ...mockMinion, currentHp: 1, maxHp: 10 };
      const enemies = [mockEnemy, { id: 'player_2', currentHp: 30 }];
      const result = shouldMinionRetreat(woundedMinion, mockBoss, [], enemies);
      expect(result).toBe(true);
    });

    it('should not retreat when healthy', () => {
      const healthyMinion = { ...mockMinion, currentHp: 10 };
      const result = shouldMinionRetreat(healthyMinion, mockBoss, [mockMinion], [mockEnemy]);
      expect(result).toBe(false);
    });
  });

  describe('calculateFlankingBonus', () => {
    it('should grant flanking bonus when ally on opposite side of target', () => {
      const minion = { id: 'm1', position: { x: 1, y: 5 } };
      const ally = { id: 'boss', position: { x: 9, y: 5 } };
      const target = { id: 'p1', position: { x: 5, y: 5 } };
      const bonus = calculateFlankingBonus(minion, [ally], target);
      expect(bonus).toBe(2);
    });

    it('should not grant bonus if no ally opposite', () => {
      const minion = { id: 'm1', position: { x: 1, y: 5 } };
      const ally = { id: 'other', position: { x: 2, y: 5 } }; // Same side
      const target = { id: 'p1', position: { x: 5, y: 5 } };
      const bonus = calculateFlankingBonus(minion, [ally], target);
      expect(bonus).toBe(0);
    });

    it('should not grant bonus if ally too far vertically', () => {
      const minion = { id: 'm1', position: { x: 1, y: 5 } };
      const ally = { id: 'boss', position: { x: 9, y: 8 } }; // Too far vertically
      const target = { id: 'p1', position: { x: 5, y: 5 } };
      const bonus = calculateFlankingBonus(minion, [ally], target);
      expect(bonus).toBe(0);
    });

    it('should return 0 if positions missing', () => {
      const minion = { id: 'm1', position: null };
      const ally = { id: 'boss', position: { x: 9, y: 5 } };
      const target = { id: 'p1', position: { x: 5, y: 5 } };
      const bonus = calculateFlankingBonus(minion, [ally], target);
      expect(bonus).toBe(0);
    });
  });

  describe('describeMinionsStatus', () => {
    it('should describe minions when present', () => {
      const minions = [mockMinion, { id: 'm2', currentHp: 5, maxHp: 10 }];
      const desc = describeMinionsStatus(minions, mockBoss);
      expect(desc).toContain('minion');
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should note when minions are bloodied', () => {
      const woundedMinion = { id: 'm1', currentHp: 2, maxHp: 10 };
      const desc = describeMinionsStatus([woundedMinion], mockBoss);
      expect(desc).toContain('bloodied');
    });

    it('should return empty string if no minions', () => {
      const desc = describeMinionsStatus([], mockBoss);
      expect(desc).toBe('');
    });

    it('should report when all minions fallen', () => {
      const deadMinion = { id: 'm1', currentHp: 0, maxHp: 10 };
      const desc = describeMinionsStatus([deadMinion], mockBoss);
      expect(desc).toContain('fallen');
    });
  });
});
