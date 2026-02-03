/**
 * AchievementTracker.test.js - Unit tests for Achievement Tracker
 */

import AchievementTracker from '../AchievementTracker.js';
import Achievement, { AchievementCategory, ConditionType, RewardType } from '../Achievement.js';

describe('AchievementTracker', () => {
  let tracker;
  let mockGameState;

  beforeEach(() => {
    tracker = new AchievementTracker();

    // Create comprehensive mock game state
    mockGameState = {
      buildings: [
        { id: 1, type: 'farm' },
        { id: 2, type: 'farm' },
        { id: 3, type: 'house' }
      ],
      npcs: [
        { id: 1, alive: true, happiness: 70 },
        { id: 2, alive: true, happiness: 80 },
        { id: 3, alive: false, happiness: 0 }
      ],
      currentTier: 'VILLAGE',
      storage: {
        getResource: jest.fn((type) => {
          const resources = { food: 100, wood: 50, stone: 30, gold: 10, essence: 5, crystals: 2 };
          return resources[type] || 0;
        }),
        getTotalResources: jest.fn(() => 197),
        capacity: 1000
      },
      npcManager: {
        stats: {
          totalSpawned: 10
        }
      }
    };
  });

  describe('Initialization', () => {
    test('should initialize with empty game events', () => {
      expect(tracker.gameEvents.survivedEvents.size).toBe(0);
      expect(tracker.gameEvents.totalEventsSurvived).toBe(0);
      expect(tracker.gameEvents.npcDeaths).toBe(0);
      expect(tracker.gameEvents.starvationDeaths).toBe(0);
    });

    test('should initialize with zero resource totals', () => {
      expect(tracker.resourceTotals.food).toBe(0);
      expect(tracker.resourceTotals.wood).toBe(0);
      expect(tracker.resourceTotals.stone).toBe(0);
      expect(tracker.resourceTotals.gold).toBe(0);
      expect(tracker.resourceTotals.essence).toBe(0);
      expect(tracker.resourceTotals.crystals).toBe(0);
    });

    test('should initialize with zero previous resources', () => {
      expect(tracker.previousResources.food).toBe(0);
      expect(tracker.previousResources.wood).toBe(0);
    });

    test('should initialize startTime', () => {
      expect(tracker.gameEvents.startTime).toBeDefined();
      expect(typeof tracker.gameEvents.startTime).toBe('number');
    });

    test('should initialize empty tierReachTimes', () => {
      expect(Object.keys(tracker.gameEvents.tierReachTimes).length).toBe(0);
    });
  });

  describe('Resource Tracking', () => {
    test('should update resource totals on first update', () => {
      tracker.updateResourceTotals(mockGameState);

      expect(tracker.resourceTotals.food).toBe(100);
      expect(tracker.resourceTotals.wood).toBe(50);
      expect(tracker.resourceTotals.stone).toBe(30);
    });

    test('should track resource deltas (increases only)', () => {
      // First update
      tracker.updateResourceTotals(mockGameState);

      // Increase resources
      mockGameState.storage.getResource = jest.fn((type) => {
        const resources = { food: 150, wood: 70 };
        return resources[type] || 0;
      });

      // Second update
      tracker.updateResourceTotals(mockGameState);

      expect(tracker.resourceTotals.food).toBe(150); // 100 + 50 delta
      expect(tracker.resourceTotals.wood).toBe(70); // 50 + 20 delta
    });

    test('should not count resource decreases in totals', () => {
      tracker.updateResourceTotals(mockGameState);

      // Decrease resources (consumption)
      mockGameState.storage.getResource = jest.fn((type) => {
        const resources = { food: 50 }; // Decreased from 100
        return resources[type] || 0;
      });

      tracker.updateResourceTotals(mockGameState);

      expect(tracker.resourceTotals.food).toBe(100); // Should stay at 100, not decrease
    });

    test('should update previous resources', () => {
      tracker.updateResourceTotals(mockGameState);

      expect(tracker.previousResources.food).toBe(100);
      expect(tracker.previousResources.wood).toBe(50);
    });

    test('should handle missing storage in game state', () => {
      const invalidGameState = { buildings: [] };

      expect(() => {
        tracker.updateResourceTotals(invalidGameState);
      }).not.toThrow();
    });

    test('should handle multiple update cycles', () => {
      // Cycle 1: 0 -> 100
      tracker.updateResourceTotals(mockGameState);
      expect(tracker.resourceTotals.food).toBe(100);

      // Cycle 2: 100 -> 150
      mockGameState.storage.getResource = jest.fn((type) => {
        return type === 'food' ? 150 : 0;
      });
      tracker.updateResourceTotals(mockGameState);
      expect(tracker.resourceTotals.food).toBe(150);

      // Cycle 3: 150 -> 120 (decrease - shouldn't affect total)
      mockGameState.storage.getResource = jest.fn((type) => {
        return type === 'food' ? 120 : 0;
      });
      tracker.updateResourceTotals(mockGameState);
      expect(tracker.resourceTotals.food).toBe(150); // Unchanged

      // Cycle 4: 120 -> 200 (increase by 80)
      mockGameState.storage.getResource = jest.fn((type) => {
        return type === 'food' ? 200 : 0;
      });
      tracker.updateResourceTotals(mockGameState);
      expect(tracker.resourceTotals.food).toBe(230); // 150 + 80
    });
  });

  describe('Event Tracking', () => {
    test('should record survived event', () => {
      tracker.recordEventSurvived('DISASTER');

      expect(tracker.gameEvents.survivedEvents.has('DISASTER')).toBe(true);
      expect(tracker.gameEvents.totalEventsSurvived).toBe(1);
    });

    test('should track unique event types', () => {
      tracker.recordEventSurvived('DISASTER');
      tracker.recordEventSurvived('DISASTER');
      tracker.recordEventSurvived('INVASION');

      expect(tracker.gameEvents.survivedEvents.size).toBe(2);
      expect(tracker.gameEvents.totalEventsSurvived).toBe(3);
    });

    test('should record NPC death', () => {
      tracker.recordNPCDeath('combat');

      expect(tracker.gameEvents.npcDeaths).toBe(1);
    });

    test('should record starvation deaths separately', () => {
      tracker.recordNPCDeath('starvation');

      expect(tracker.gameEvents.npcDeaths).toBe(1);
      expect(tracker.gameEvents.starvationDeaths).toBe(1);
    });

    test('should track multiple death types', () => {
      tracker.recordNPCDeath('starvation');
      tracker.recordNPCDeath('combat');
      tracker.recordNPCDeath('starvation');

      expect(tracker.gameEvents.npcDeaths).toBe(3);
      expect(tracker.gameEvents.starvationDeaths).toBe(2);
    });

    test('should record tier reached with timestamp', () => {
      tracker.recordTierReached('VILLAGE');

      expect(tracker.gameEvents.tierReachTimes['VILLAGE']).toBeDefined();
      expect(typeof tracker.gameEvents.tierReachTimes['VILLAGE']).toBe('number');
      expect(tracker.gameEvents.tierReachTimes['VILLAGE']).toBeGreaterThanOrEqual(0);
    });

    test('should not update tier time if already recorded', () => {
      tracker.recordTierReached('TOWN');
      const firstTime = tracker.gameEvents.tierReachTimes['TOWN'];

      // Wait and try to record again
      tracker.recordTierReached('TOWN');
      const secondTime = tracker.gameEvents.tierReachTimes['TOWN'];

      expect(secondTime).toBe(firstTime);
    });

    test('should track multiple tiers independently', () => {
      tracker.recordTierReached('VILLAGE');
      tracker.recordTierReached('TOWN');
      tracker.recordTierReached('CITY');

      expect(Object.keys(tracker.gameEvents.tierReachTimes).length).toBe(3);
    });
  });

  describe('Building Condition Extraction', () => {
    test('should extract building count', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 3 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(3);
    });

    test('should extract building type count', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: {
          type: ConditionType.BUILDING_TYPE_COUNT,
          target: 2,
          params: { buildingType: 'farm' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(2);
    });

    test('should extract unique building types', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_TYPES_UNIQUE, target: 2 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(2); // farm and house
    });

    test('should return 0 for building count with no buildings', () => {
      mockGameState.buildings = [];

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 1 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(0);
    });

    test('should handle missing buildings array', () => {
      delete mockGameState.buildings;

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 1 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(0);
    });
  });

  describe('Resource Condition Extraction', () => {
    beforeEach(() => {
      tracker.updateResourceTotals(mockGameState);
    });

    test('should extract resource total', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: {
          type: ConditionType.RESOURCE_TOTAL,
          target: 100,
          params: { resourceType: 'food' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(100);
    });

    test('should extract current resource amount', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: {
          type: ConditionType.RESOURCE_CURRENT,
          target: 50,
          params: { resourceType: 'wood' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(50);
    });

    test('should detect storage full', () => {
      mockGameState.storage.getTotalResources = jest.fn(() => 1000);

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.STORAGE_FULL, target: true }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(true);
    });

    test('should detect storage not full', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.STORAGE_FULL, target: true }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false);
    });
  });

  describe('NPC Condition Extraction', () => {
    test('should extract NPC count (alive only)', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_COUNT, target: 2 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(2); // Only alive NPCs
    });

    test('should extract total NPCs spawned', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_SPAWNED_TOTAL, target: 10 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(10);
    });

    test('should check if all NPCs are happy', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_HAPPINESS_ALL, target: 60 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(true); // Both alive NPCs have 70+ happiness
    });

    test('should return false if not all NPCs are happy', () => {
      mockGameState.npcs[0].happiness = 50;

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_HAPPINESS_ALL, target: 60 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false);
    });

    test('should check for no deaths by tier', () => {
      tracker.recordTierReached('VILLAGE');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: {
          type: ConditionType.NPC_NO_DEATHS,
          target: true,
          params: { tier: 'VILLAGE' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(true);
    });

    test('should return false for no deaths if deaths occurred', () => {
      tracker.recordTierReached('VILLAGE');
      tracker.recordNPCDeath('combat');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: {
          type: ConditionType.NPC_NO_DEATHS,
          target: true,
          params: { tier: 'VILLAGE' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false);
    });

    test('should check for no starvation by tier', () => {
      tracker.recordTierReached('TOWN');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: {
          type: ConditionType.NO_STARVATION,
          target: true,
          params: { tier: 'TOWN' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(true);
    });

    test('should return false for no starvation if starvation occurred', () => {
      tracker.recordTierReached('TOWN');
      tracker.recordNPCDeath('starvation');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: {
          type: ConditionType.NO_STARVATION,
          target: true,
          params: { tier: 'TOWN' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false);
    });

    test('should handle empty NPC array', () => {
      mockGameState.npcs = [];

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_COUNT, target: 1 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(0);
    });
  });

  describe('Tier Condition Extraction', () => {
    test('should extract current tier', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_REACHED, target: 'VILLAGE' }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe('VILLAGE');
    });

    test('should return null for current tier if not set', () => {
      delete mockGameState.currentTier;

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_REACHED, target: 'VILLAGE' }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBeNull();
    });

    test('should extract tier reach time', () => {
      tracker.recordTierReached('VILLAGE');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: {
          type: ConditionType.TIER_SPEED,
          target: 600,
          params: { tier: 'VILLAGE' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(typeof value).toBe('number');
    });

    test('should return 0 for tier reach time if tier not reached', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: {
          type: ConditionType.TIER_SPEED,
          target: 600,
          params: { tier: 'CITY' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(0);
    });
  });

  describe('Event Condition Extraction', () => {
    test('should extract total events survived', () => {
      tracker.recordEventSurvived('DISASTER');
      tracker.recordEventSurvived('INVASION');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: { type: ConditionType.EVENT_SURVIVED, target: 2 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(2);
    });

    test('should extract survived event types array', () => {
      tracker.recordEventSurvived('DISASTER');
      tracker.recordEventSurvived('INVASION');
      tracker.recordEventSurvived('STORM');

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: { type: ConditionType.EVENT_ALL_TYPES, target: 3 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(3);
      expect(value).toContain('DISASTER');
      expect(value).toContain('INVASION');
      expect(value).toContain('STORM');
    });
  });

  describe('Unknown Condition Type', () => {
    test('should return 0 and warn for unknown condition type', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: 'UNKNOWN_TYPE', target: 10 }
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown condition type for tracking: UNKNOWN_TYPE');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      tracker.updateResourceTotals(mockGameState);
      tracker.recordEventSurvived('DISASTER');
      tracker.recordEventSurvived('INVASION');
      tracker.recordNPCDeath('starvation');
      tracker.recordTierReached('VILLAGE');
    });

    test('should serialize tracker state', () => {
      const serialized = tracker.serialize();

      expect(serialized.gameEvents).toBeDefined();
      expect(serialized.resourceTotals).toBeDefined();
      expect(serialized.previousResources).toBeDefined();
    });

    test('should serialize game events', () => {
      const serialized = tracker.serialize();

      expect(serialized.gameEvents.survivedEvents).toContain('DISASTER');
      expect(serialized.gameEvents.survivedEvents).toContain('INVASION');
      expect(serialized.gameEvents.totalEventsSurvived).toBe(2);
      expect(serialized.gameEvents.npcDeaths).toBe(1);
      expect(serialized.gameEvents.starvationDeaths).toBe(1);
    });

    test('should serialize resource totals', () => {
      const serialized = tracker.serialize();

      expect(serialized.resourceTotals.food).toBe(100);
      expect(serialized.resourceTotals.wood).toBe(50);
    });

    test('should serialize tier reach times', () => {
      const serialized = tracker.serialize();

      expect(serialized.gameEvents.tierReachTimes['VILLAGE']).toBeDefined();
    });

    test('should deserialize tracker state', () => {
      const data = {
        gameEvents: {
          survivedEvents: ['DISASTER', 'STORM'],
          totalEventsSurvived: 5,
          npcDeaths: 2,
          starvationDeaths: 1,
          startTime: Date.now() - 10000,
          tierReachTimes: { VILLAGE: 120, TOWN: 300 }
        },
        resourceTotals: { food: 500, wood: 200 },
        previousResources: { food: 400, wood: 150 }
      };

      const newTracker = new AchievementTracker();
      newTracker.deserialize(data);

      expect(newTracker.gameEvents.survivedEvents.has('DISASTER')).toBe(true);
      expect(newTracker.gameEvents.totalEventsSurvived).toBe(5);
      expect(newTracker.gameEvents.npcDeaths).toBe(2);
      expect(newTracker.resourceTotals.food).toBe(500);
      expect(newTracker.gameEvents.tierReachTimes['VILLAGE']).toBe(120);
    });

    test('should handle deserializing with missing fields', () => {
      const data = {};

      const newTracker = new AchievementTracker();
      newTracker.deserialize(data);

      expect(newTracker.gameEvents.totalEventsSurvived).toBe(0);
      expect(newTracker.resourceTotals.food).toBe(0);
    });

    test('should handle deserializing with partial data', () => {
      const data = {
        gameEvents: {
          totalEventsSurvived: 3
        }
      };

      const newTracker = new AchievementTracker();
      newTracker.deserialize(data);

      expect(newTracker.gameEvents.totalEventsSurvived).toBe(3);
      expect(newTracker.gameEvents.npcDeaths).toBe(0);
    });

    test('should round-trip serialize/deserialize', () => {
      const serialized = tracker.serialize();

      const newTracker = new AchievementTracker();
      newTracker.deserialize(serialized);

      expect(newTracker.gameEvents.totalEventsSurvived).toBe(tracker.gameEvents.totalEventsSurvived);
      expect(newTracker.resourceTotals.food).toBe(tracker.resourceTotals.food);
      expect(newTracker.gameEvents.npcDeaths).toBe(tracker.gameEvents.npcDeaths);
    });
  });

  describe('Edge Cases', () => {
    test('should handle game state with all missing fields', () => {
      const emptyGameState = {};

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 1 }
      });

      const value = tracker.extractConditionValue(achievement, emptyGameState);

      expect(value).toBe(0);
    });

    test('should handle NPCs with missing happiness field', () => {
      mockGameState.npcs = [
        { id: 1, alive: true },
        { id: 2, alive: true }
      ];

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_HAPPINESS_ALL, target: 60 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false); // Default happiness is 0
    });

    test('should handle all NPCs dead for happiness check', () => {
      mockGameState.npcs = [
        { id: 1, alive: false, happiness: 100 },
        { id: 2, alive: false, happiness: 100 }
      ];

      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_HAPPINESS_ALL, target: 60 }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false); // No alive NPCs
    });

    test('should handle tier not reached for no-death check', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: {
          type: ConditionType.NPC_NO_DEATHS,
          target: true,
          params: { tier: 'NONEXISTENT' }
        }
      });

      const value = tracker.extractConditionValue(achievement, mockGameState);

      expect(value).toBe(false); // Tier not reached
    });
  });
});
