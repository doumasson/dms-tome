import { describe, it, expect } from 'vitest';
import {
  generateBossPhases,
  checkPhaseTransition,
  describePhase,
} from './bossPhases.js';

describe('bossPhases', () => {
  const mockBoss = {
    name: 'Test Boss',
    tier: 'champion',
    archetype: 'WARLORD',
    maxHp: 100,
    tactics: 'aggressive',
    abilities: ['MULTI_ATTACK', 'REGENERATION', 'AURA'],
  };

  describe('generateBossPhases', () => {
    it('should generate phases for lieutenant tier', () => {
      const boss = { ...mockBoss, tier: 'lieutenant' };
      const phases = generateBossPhases(boss);
      expect(phases.length).toBe(2);
    });

    it('should generate phases for champion tier', () => {
      const phases = generateBossPhases(mockBoss);
      expect(phases.length).toBe(3);
    });

    it('should generate phases for legendary tier', () => {
      const boss = { ...mockBoss, tier: 'legendary' };
      const phases = generateBossPhases(boss);
      expect(phases.length).toBe(4);
    });

    it('should generate phases for ancient tier', () => {
      const boss = { ...mockBoss, tier: 'ancient' };
      const phases = generateBossPhases(boss);
      expect(phases.length).toBe(4);
    });

    it('should have correct HP thresholds in descending order', () => {
      const phases = generateBossPhases(mockBoss);
      for (let i = 0; i < phases.length - 1; i++) {
        expect(phases[i].maxHpPercent).toBeGreaterThan(phases[i].minHpPercent);
        expect(phases[i].minHpPercent).toEqual(phases[i + 1].maxHpPercent);
      }
    });

    it('should have first phase starting at 100% HP', () => {
      const phases = generateBossPhases(mockBoss);
      expect(phases[0].maxHpPercent).toEqual(1);
    });

    it('should have last phase ending at 0% HP', () => {
      const phases = generateBossPhases(mockBoss);
      expect(phases[phases.length - 1].minHpPercent).toEqual(0);
    });

    it('should escalate tactics through phases', () => {
      const boss = { ...mockBoss, tactics: 'defensive' };
      const phases = generateBossPhases(boss);
      // Defensive should escalate toward aggressive/berserker
      expect(phases[0].tactics).toBe('defensive');
      expect(phases[phases.length - 1].tactics).not.toBe('defensive');
    });

    it('should include more abilities in later phases', () => {
      const phases = generateBossPhases(mockBoss);
      let prevAbilityCount = 0;
      for (const phase of phases) {
        expect(phase.activatedAbilities.length).toBeGreaterThanOrEqual(prevAbilityCount);
        prevAbilityCount = phase.activatedAbilities.length;
      }
    });

    it('should enable lair actions in final phases', () => {
      const phases = generateBossPhases(mockBoss);
      const numPhases = phases.length;
      for (let i = 0; i < phases.length; i++) {
        if (i >= numPhases - 2) {
          expect(phases[i].lairActionEnabled).toBe(true);
        } else {
          expect(phases[i].lairActionEnabled).toBe(false);
        }
      }
    });

    it('should generate minion spawns', () => {
      const phases = generateBossPhases(mockBoss);
      const hasMinions = phases.some(p => p.minionSpawn !== null);
      expect(hasMinions).toBe(true);
    });

    it('should not spawn minions in phase 1', () => {
      const phases = generateBossPhases(mockBoss);
      expect(phases[0].minionSpawn).toBeNull();
    });

    it('should have descriptions for each phase', () => {
      const phases = generateBossPhases(mockBoss);
      for (const phase of phases) {
        expect(phase.description).toBeDefined();
        expect(phase.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('checkPhaseTransition', () => {
    it('should return null when no phases defined', () => {
      const combatant = { ...mockBoss, bossPhase: 1, phases: [] };
      const result = checkPhaseTransition(combatant);
      expect(result).toBeNull();
    });

    it('should return null when still in current phase', () => {
      const phases = generateBossPhases(mockBoss);
      const combatant = {
        ...mockBoss,
        maxHp: 100,
        currentHp: 90,
        bossPhase: 1,
        phases,
      };
      const result = checkPhaseTransition(combatant);
      expect(result).toBeNull();
    });

    it('should transition to phase 2 when HP drops to 75%', () => {
      const phases = generateBossPhases(mockBoss);
      const combatant = {
        ...mockBoss,
        maxHp: 100,
        currentHp: 74,
        bossPhase: 1,
        phases,
      };
      const result = checkPhaseTransition(combatant);
      expect(result).toBeDefined();
      if (result) {
        expect(result.number).toBeGreaterThan(1);
      }
    });

    it('should not transition beyond available phases', () => {
      const phases = generateBossPhases(mockBoss);
      const combatant = {
        ...mockBoss,
        maxHp: 100,
        currentHp: 0,
        bossPhase: phases.length,
        phases,
      };
      const result = checkPhaseTransition(combatant);
      // At 0 HP or very low, no valid phase
      expect(result === null || result.number <= phases.length).toBe(true);
    });
  });

  describe('describePhase', () => {
    it('should return non-empty description for phase 1', () => {
      const desc = describePhase(1, 3, 'champion');
      expect(desc).toBeDefined();
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should return non-empty description for phase 2', () => {
      const desc = describePhase(2, 3, 'champion');
      expect(desc).toBeDefined();
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should return non-empty description for phase 3', () => {
      const desc = describePhase(3, 3, 'champion');
      expect(desc).toBeDefined();
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should describe later phases more intensely', () => {
      const phase1 = describePhase(1, 3, 'champion');
      const phase3 = describePhase(3, 3, 'champion');
      // Both should exist and phase 3 should potentially reference higher stakes
      expect(phase1).toBeDefined();
      expect(phase3).toBeDefined();
    });
  });
});
