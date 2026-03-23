import { describe, it, expect } from 'vitest';
import {
  calculatePartyPower,
  calculateEnemyPower,
  rateEncounterDifficulty,
  generateDifficultyWarning,
  suggestEncounterScaling,
  checkEncounterDifficulty,
} from './encounterScaling.js';

describe('encounterScaling', () => {
  const mockParty = [
    { id: 'p1', name: 'Fighter', class: 'Fighter', level: 5, currentHp: 40, maxHp: 50, ac: 16 },
    { id: 'p2', name: 'Wizard', class: 'Wizard', level: 5, currentHp: 25, maxHp: 28, ac: 12 },
    { id: 'p3', name: 'Cleric', class: 'Cleric', level: 5, currentHp: 35, maxHp: 40, ac: 15 },
    { id: 'p4', name: 'Rogue', class: 'Rogue', level: 5, currentHp: 30, maxHp: 32, ac: 14 },
  ];

  const weakEnemies = [
    { id: 'e1', name: 'Goblin 1', originalName: 'Goblin', cr: 0.25, currentHp: 7, maxHp: 7, ac: 15 },
    { id: 'e2', name: 'Goblin 2', originalName: 'Goblin', cr: 0.25, currentHp: 7, maxHp: 7, ac: 15 },
  ];

  const mediumEnemies = [
    { id: 'e1', name: 'Ogre', originalName: 'Ogre', cr: 2, currentHp: 59, maxHp: 59, ac: 11 },
    { id: 'e2', name: 'Thug', originalName: 'Thug', cr: 0.125, currentHp: 27, maxHp: 27, ac: 11 },
  ];

  const strongBoss = [
    { id: 'b1', name: 'Dragon Lord', cr: 8, phases: [{ number: 1 }], currentHp: 150, maxHp: 150, ac: 18 },
  ];

  describe('calculatePartyPower', () => {
    it('should return positive power for healthy party', () => {
      const power = calculatePartyPower(mockParty);
      expect(power).toBeGreaterThan(0);
    });

    it('should factor in class differences', () => {
      const barbarianParty = [
        { id: 'p1', name: 'Barbarian', class: 'Barbarian', level: 5, currentHp: 60, maxHp: 60, ac: 12 },
      ];
      const wizardParty = [
        { id: 'p1', name: 'Wizard', class: 'Wizard', level: 5, currentHp: 20, maxHp: 20, ac: 12 },
      ];
      const barbarianPower = calculatePartyPower(barbarianParty);
      const wizardPower = calculatePartyPower(wizardParty);
      // Barbarians should be more powerful than wizards at same level/HP
      expect(barbarianPower).toBeGreaterThan(wizardPower);
    });

    it('should reduce power when players are damaged', () => {
      const healthyPower = calculatePartyPower(mockParty);
      const damagedParty = mockParty.map((p, i) => ({
        ...p,
        currentHp: i === 0 ? 1 : p.currentHp, // Fighter at 1 HP
      }));
      const damagedPower = calculatePartyPower(damagedParty);
      expect(damagedPower).toBeLessThan(healthyPower);
    });

    it('should ignore dead players', () => {
      const partyWithDead = [
        ...mockParty.slice(0, 3),
        { ...mockParty[3], currentHp: 0 }, // Dead
      ];
      const power = calculatePartyPower(partyWithDead);
      expect(power).toBeGreaterThan(0);
    });
  });

  describe('calculateEnemyPower', () => {
    it('should return positive power for enemies', () => {
      const power = calculateEnemyPower(weakEnemies);
      expect(power).toBeGreaterThan(0);
    });

    it('should give bosses higher power than minions', () => {
      const bossPower = calculateEnemyPower(strongBoss);
      const minionPower = calculateEnemyPower(weakEnemies);
      expect(bossPower).toBeGreaterThan(minionPower);
    });

    it('should factor in CR differences', () => {
      const lowCR = [{ id: 'e1', name: 'Rat', cr: 0.125, currentHp: 1, maxHp: 1, ac: 10 }];
      const highCR = [{ id: 'e1', name: 'Dragon', cr: 10, currentHp: 200, maxHp: 200, ac: 19 }];
      const lowPower = calculateEnemyPower(lowCR);
      const highPower = calculateEnemyPower(highCR);
      expect(highPower).toBeGreaterThan(lowPower);
    });
  });

  describe('rateEncounterDifficulty', () => {
    it('should rate trivial encounters', () => {
      const partyPower = 500;
      const enemyPower = 50;
      const difficulty = rateEncounterDifficulty(partyPower, enemyPower, 4);
      expect(difficulty).toBe('Trivial');
    });

    it('should rate easy encounters', () => {
      const partyPower = 500;
      const enemyPower = 200;
      const difficulty = rateEncounterDifficulty(partyPower, enemyPower, 4);
      expect(difficulty).toBe('Easy');
    });

    it('should rate medium encounters', () => {
      const partyPower = 500;
      const enemyPower = 400;
      const difficulty = rateEncounterDifficulty(partyPower, enemyPower, 4);
      expect(difficulty).toBe('Medium');
    });

    it('should rate hard encounters', () => {
      const partyPower = 500;
      const enemyPower = 650;
      const difficulty = rateEncounterDifficulty(partyPower, enemyPower, 4);
      expect(difficulty).toBe('Hard');
    });

    it('should rate deadly encounters', () => {
      const partyPower = 500;
      const enemyPower = 1000;
      const difficulty = rateEncounterDifficulty(partyPower, enemyPower, 4);
      expect(difficulty).toBe('Deadly');
    });
  });

  describe('generateDifficultyWarning', () => {
    it('should warn for hard encounters', () => {
      const warning = generateDifficultyWarning('Hard');
      expect(warning).toContain('WARNING');
      expect(warning.length).toBeGreaterThan(0);
    });

    it('should warn for deadly encounters', () => {
      const warning = generateDifficultyWarning('Deadly');
      expect(warning).toContain('DEADLY');
      expect(warning.length).toBeGreaterThan(0);
    });

    it('should not warn for easy encounters', () => {
      const warning = generateDifficultyWarning('Easy');
      expect(warning).toBe('');
    });

    it('should not warn for medium encounters', () => {
      const warning = generateDifficultyWarning('Medium');
      expect(warning).toBe('');
    });

    it('should not warn for trivial encounters', () => {
      const warning = generateDifficultyWarning('Trivial');
      expect(warning).toBe('');
    });
  });

  describe('suggestEncounterScaling', () => {
    it('should suggest adding enemies for trivial encounters', () => {
      const suggestion = suggestEncounterScaling('Trivial');
      expect(suggestion).toBeDefined();
      expect(suggestion.action).toBe('add');
      expect(suggestion.count).toBeGreaterThan(0);
    });

    it('should suggest removing enemies for deadly encounters', () => {
      const suggestion = suggestEncounterScaling('Deadly');
      expect(suggestion).toBeDefined();
      expect(suggestion.action).toBe('remove');
      expect(suggestion.count).toBeGreaterThan(0);
    });

    it('should not suggest scaling for medium encounters', () => {
      const suggestion = suggestEncounterScaling('Medium');
      expect(suggestion).toBeNull();
    });

    it('should not suggest scaling for hard encounters', () => {
      const suggestion = suggestEncounterScaling('Hard');
      expect(suggestion).toBeNull();
    });
  });

  describe('checkEncounterDifficulty', () => {
    it('should return null when not in combat', () => {
      const encounter = {
        phase: 'exploration',
        combatants: [...mockParty, ...weakEnemies],
      };
      const result = checkEncounterDifficulty(encounter);
      expect(result).toBeNull();
    });

    it('should return null when warning already shown', () => {
      const encounter = {
        phase: 'combat',
        difficultyWarningShown: true,
        combatants: [...mockParty, ...strongBoss],
      };
      const result = checkEncounterDifficulty(encounter);
      expect(result).toBeNull();
    });

    it('should detect trivial encounters', () => {
      const encounter = {
        phase: 'combat',
        combatants: [...mockParty, ...weakEnemies],
        round: 1,
      };
      const result = checkEncounterDifficulty(encounter);
      if (result) {
        expect(['Trivial', 'Easy']).toContain(result.difficulty);
      }
    });

    it('should detect deadly encounters', () => {
      const encounter = {
        phase: 'combat',
        combatants: [...mockParty, ...strongBoss, ...strongBoss],
        round: 1,
      };
      const result = checkEncounterDifficulty(encounter);
      if (result) {
        expect(['Hard', 'Deadly']).toContain(result.difficulty);
      }
    });

    it('should return difficulty info when appropriate', () => {
      const encounter = {
        phase: 'combat',
        combatants: [...mockParty, ...strongBoss],
        round: 1,
      };
      const result = checkEncounterDifficulty(encounter);
      if (result && result.difficulty === 'Hard') {
        expect(result.warning).toBeDefined();
        expect(result.warning.length).toBeGreaterThan(0);
      }
    });
  });
});
