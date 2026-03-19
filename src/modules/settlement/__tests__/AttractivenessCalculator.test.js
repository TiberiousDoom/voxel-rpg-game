/**
 * AttractivenessCalculator.test.js - Unit tests for settlement attractiveness scoring
 */

import AttractivenessCalculator from '../AttractivenessCalculator.js';
import {
  ATTRACTIVENESS_CAMPFIRE_BONUS,
  ATTRACTIVENESS_PER_SURVIVAL_BUILDING,
  ATTRACTIVENESS_PER_PERMANENT_BUILDING,
  ATTRACTIVENESS_PER_TOWN_BUILDING,
  ATTRACTIVENESS_PER_HOUSING_SLOT,
  ATTRACTIVENESS_PER_FOOD_UNIT,
  ATTRACTIVENESS_PER_WALL,
  ATTRACTIVENESS_PER_WATCHTOWER,
  ATTRACTIVENESS_RIFT_PENALTY,
  ATTRACTIVENESS_HAPPINESS_MIN_MULT,
  ATTRACTIVENESS_HAPPINESS_MAX_MULT,
} from '../../../data/tuning.js';

describe('AttractivenessCalculator', () => {
  let calculator;
  let mockStorage;
  let mockTownManager;
  let mockNpcManager;

  beforeEach(() => {
    mockStorage = {
      getResource: jest.fn().mockReturnValue(0),
    };
    mockTownManager = {
      calculateHousingCapacity: jest.fn().mockReturnValue(0),
    };
    mockNpcManager = {
      getStatistics: jest.fn().mockReturnValue({ alive: 0, total: 0 }),
      npcs: new Map(),
    };

    calculator = new AttractivenessCalculator({
      storage: mockStorage,
      townManager: mockTownManager,
      npcManager: mockNpcManager,
    });
  });

  describe('Initialization', () => {
    test('should initialize with zero score', () => {
      expect(calculator.getScore()).toBe(0);
    });

    test('should initialize with empty breakdown', () => {
      const breakdown = calculator.getBreakdown();
      expect(breakdown.total).toBe(0);
    });

    test('should handle missing dependencies gracefully', () => {
      const bare = new AttractivenessCalculator();
      bare.recalculate({ buildings: [] });
      expect(bare.getScore()).toBe(0);
    });
  });

  describe('Campfire bonus', () => {
    test('should add campfire bonus when completed campfire exists', () => {
      const gameState = {
        buildings: [{ type: 'CAMPFIRE', status: 'COMPLETE' }],
      };

      calculator.recalculate(gameState);
      const breakdown = calculator.getBreakdown();

      expect(breakdown.campfire).toBe(ATTRACTIVENESS_CAMPFIRE_BONUS);
    });

    test('should not add campfire bonus for incomplete campfire', () => {
      const gameState = {
        buildings: [{ type: 'CAMPFIRE', status: 'BUILDING' }],
      };

      calculator.recalculate(gameState);
      const breakdown = calculator.getBreakdown();

      expect(breakdown.campfire).toBe(0);
    });

    test('should not add campfire bonus when no campfire exists', () => {
      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().campfire).toBe(0);
    });
  });

  describe('Building tier bonuses', () => {
    test('should score survival-tier buildings', () => {
      const gameState = {
        buildings: [
          { type: 'SHELTER', status: 'COMPLETE', tier: 'SURVIVAL' },
          { type: 'SHELTER', status: 'COMPLETE', tier: 'SURVIVAL' },
        ],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().buildings).toBe(
        ATTRACTIVENESS_PER_SURVIVAL_BUILDING * 2
      );
    });

    test('should score permanent-tier buildings higher', () => {
      const gameState = {
        buildings: [
          { type: 'HOUSE', status: 'COMPLETE', tier: 'PERMANENT' },
        ],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().buildings).toBe(
        ATTRACTIVENESS_PER_PERMANENT_BUILDING
      );
    });

    test('should score town-tier buildings highest', () => {
      const gameState = {
        buildings: [
          { type: 'TOWN_HALL', status: 'COMPLETE', tier: 'TOWN' },
        ],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().buildings).toBe(
        ATTRACTIVENESS_PER_TOWN_BUILDING
      );
    });

    test('should skip incomplete buildings', () => {
      const gameState = {
        buildings: [
          { type: 'HOUSE', status: 'BUILDING', tier: 'PERMANENT' },
        ],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().buildings).toBe(0);
    });
  });

  describe('Defense bonuses', () => {
    test('should add wall defense bonus', () => {
      const gameState = {
        buildings: [{ type: 'WALL', status: 'COMPLETE' }],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().defense).toBe(ATTRACTIVENESS_PER_WALL);
    });

    test('should add watchtower defense bonus', () => {
      const gameState = {
        buildings: [{ type: 'WATCHTOWER', status: 'COMPLETE' }],
      };

      calculator.recalculate(gameState);
      expect(calculator.getBreakdown().defense).toBe(ATTRACTIVENESS_PER_WATCHTOWER);
    });
  });

  describe('Housing bonus', () => {
    test('should score unoccupied housing slots', () => {
      mockTownManager.calculateHousingCapacity.mockReturnValue(4);
      mockNpcManager.getStatistics.mockReturnValue({ alive: 1 });

      calculator.recalculate({ buildings: [] });
      // 4 capacity - 1 population = 3 available slots
      expect(calculator.getBreakdown().housing).toBe(
        3 * ATTRACTIVENESS_PER_HOUSING_SLOT
      );
    });

    test('should score zero when fully occupied', () => {
      mockTownManager.calculateHousingCapacity.mockReturnValue(2);
      mockNpcManager.getStatistics.mockReturnValue({ alive: 3 });

      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().housing).toBe(0);
    });
  });

  describe('Food bonus', () => {
    test('should score food in stockpile', () => {
      mockStorage.getResource.mockReturnValue(50);

      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().food).toBe(
        50 * ATTRACTIVENESS_PER_FOOD_UNIT
      );
    });
  });

  describe('Rift penalty', () => {
    test('should apply rift penalty from game state', () => {
      calculator.recalculate({ buildings: [], activeRiftCount: 3 });
      expect(calculator.getBreakdown().rifts).toBe(
        3 * ATTRACTIVENESS_RIFT_PENALTY
      );
    });

    test('should default to zero rifts when not provided', () => {
      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().rifts).toBeCloseTo(0);
    });
  });

  describe('Happiness multiplier', () => {
    test('should use neutral multiplier with no NPCs', () => {
      // No NPCs → default 50% happiness → mid multiplier
      calculator.recalculate({ buildings: [] });
      const breakdown = calculator.getBreakdown();
      const expectedMult = ATTRACTIVENESS_HAPPINESS_MIN_MULT +
        (ATTRACTIVENESS_HAPPINESS_MAX_MULT - ATTRACTIVENESS_HAPPINESS_MIN_MULT) * 0.5;
      expect(breakdown.happinessMultiplier).toBeCloseTo(expectedMult);
    });

    test('should use max multiplier at 100% happiness', () => {
      mockNpcManager.npcs = new Map([
        ['npc1', { happiness: 100 }],
      ]);

      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().happinessMultiplier).toBeCloseTo(
        ATTRACTIVENESS_HAPPINESS_MAX_MULT
      );
    });

    test('should use min multiplier at 0% happiness', () => {
      mockNpcManager.npcs = new Map([
        ['npc1', { happiness: 0 }],
      ]);

      calculator.recalculate({ buildings: [] });
      expect(calculator.getBreakdown().happinessMultiplier).toBeCloseTo(
        ATTRACTIVENESS_HAPPINESS_MIN_MULT
      );
    });
  });

  describe('Total score', () => {
    test('should multiply base score by happiness', () => {
      const gameState = {
        buildings: [{ type: 'CAMPFIRE', status: 'COMPLETE' }],
      };

      calculator.recalculate(gameState);
      const breakdown = calculator.getBreakdown();
      const expectedBase = breakdown.campfire + breakdown.buildings +
        breakdown.housing + breakdown.food + breakdown.defense + breakdown.rifts;
      const expectedTotal = Math.max(0, expectedBase * breakdown.happinessMultiplier);

      expect(calculator.getScore()).toBeCloseTo(expectedTotal);
    });

    test('should never go below zero', () => {
      // 5 rifts, no buildings = negative base score
      calculator.recalculate({ buildings: [], activeRiftCount: 5 });
      expect(calculator.getScore()).toBeGreaterThanOrEqual(0);
    });
  });
});
