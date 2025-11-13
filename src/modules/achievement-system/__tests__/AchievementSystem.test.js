/**
 * AchievementSystem.test.js - Unit tests for Achievement System
 */

import AchievementSystem from '../AchievementSystem.js';
import Achievement, { AchievementCategory, ConditionType, RewardType } from '../Achievement.js';
import { achievementDefinitions } from '../achievementDefinitions.js';

describe('AchievementSystem', () => {
  let achievementSystem;
  let mockGameState;

  beforeEach(() => {
    // Create a small set of test achievements
    const testAchievements = [
      {
        id: 'test_first_building',
        name: 'First Building',
        description: 'Place your first building',
        icon: '🏗️',
        category: AchievementCategory.BUILDING,
        condition: {
          type: ConditionType.BUILDING_COUNT,
          target: 1
        },
        reward: {
          type: RewardType.MULTIPLIER,
          value: { production: 0.02 }
        }
      },
      {
        id: 'test_ten_buildings',
        name: 'Ten Buildings',
        description: 'Place 10 buildings',
        icon: '🏛️',
        category: AchievementCategory.BUILDING,
        condition: {
          type: ConditionType.BUILDING_COUNT,
          target: 10
        },
        reward: {
          type: RewardType.MULTIPLIER,
          value: { production: 0.05 }
        }
      },
      {
        id: 'test_food_collector',
        name: 'Food Collector',
        description: 'Collect 100 food',
        icon: '🍞',
        category: AchievementCategory.RESOURCE,
        condition: {
          type: ConditionType.RESOURCE_TOTAL,
          target: 100,
          params: { resourceType: 'food' }
        },
        reward: {
          type: RewardType.COSMETIC,
          value: { badge: 'gatherer' }
        }
      }
    ];

    achievementSystem = new AchievementSystem(testAchievements);

    // Mock game state
    mockGameState = {
      buildings: [],
      npcs: [],
      currentTier: 'SURVIVAL',
      storage: {
        getResource: jest.fn((type) => 0),
        getTotalResources: jest.fn(() => 0),
        capacity: 1000
      },
      npcManager: {
        stats: {
          totalSpawned: 0
        }
      }
    };
  });

  describe('Initialization', () => {
    test('should initialize with correct number of achievements', () => {
      expect(achievementSystem.stats.totalAchievements).toBe(3);
      expect(achievementSystem.stats.unlockedAchievements).toBe(0);
    });

    test('should register all achievements', () => {
      expect(achievementSystem.achievements.size).toBe(3);
      expect(achievementSystem.achievements.has('test_first_building')).toBe(true);
    });

    test('should initialize with full achievement definitions', () => {
      const fullSystem = new AchievementSystem(achievementDefinitions);
      expect(fullSystem.stats.totalAchievements).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Achievement Unlocking', () => {
    test('should unlock achievement when condition is met', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];

      const unlocked = achievementSystem.checkAchievements(mockGameState);

      expect(unlocked.length).toBe(1);
      expect(unlocked[0].id).toBe('test_first_building');
      expect(achievementSystem.stats.unlockedAchievements).toBe(1);
    });

    test('should not unlock achievement twice', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];

      achievementSystem.checkAchievements(mockGameState);
      const secondCheck = achievementSystem.checkAchievements(mockGameState);

      expect(secondCheck.length).toBe(0);
      expect(achievementSystem.stats.unlockedAchievements).toBe(1);
    });

    test('should unlock multiple achievements in one check', () => {
      mockGameState.buildings = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        type: 'farm'
      }));

      const unlocked = achievementSystem.checkAchievements(mockGameState);

      expect(unlocked.length).toBe(2); // First building + Ten buildings
      expect(achievementSystem.stats.unlockedAchievements).toBe(2);
    });

    test('should track achievement progress', () => {
      mockGameState.buildings = [
        { id: 1, type: 'farm' },
        { id: 2, type: 'farm' },
        { id: 3, type: 'farm' }
      ];

      achievementSystem.checkAchievements(mockGameState);

      const tenBuildingsAchievement = achievementSystem.getAchievement('test_ten_buildings');
      expect(tenBuildingsAchievement.progress).toBe(30); // 3/10 = 30%
      expect(tenBuildingsAchievement.isUnlocked).toBe(false);
    });
  });

  describe('Achievement Tracking', () => {
    test('should record event survived', () => {
      achievementSystem.recordEventSurvived('DISASTER');

      expect(achievementSystem.tracker.gameEvents.totalEventsSurvived).toBe(1);
      expect(achievementSystem.tracker.gameEvents.survivedEvents.has('DISASTER')).toBe(true);
    });

    test('should record NPC death', () => {
      achievementSystem.recordNPCDeath('starvation');

      expect(achievementSystem.tracker.gameEvents.npcDeaths).toBe(1);
      expect(achievementSystem.tracker.gameEvents.starvationDeaths).toBe(1);
    });

    test('should record tier reached', () => {
      achievementSystem.recordTierReached('TOWN');

      expect(achievementSystem.tracker.gameEvents.tierReachTimes['TOWN']).toBeDefined();
      expect(achievementSystem.tracker.gameEvents.tierReachTimes['TOWN']).toBeGreaterThan(0);
    });

    test('should update resource totals', () => {
      mockGameState.storage.getResource.mockReturnValue(100);

      achievementSystem.checkAchievements(mockGameState);

      expect(achievementSystem.tracker.resourceTotals.food).toBe(100);
    });
  });

  describe('Achievement Queries', () => {
    test('should get unlocked achievements', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      const unlocked = achievementSystem.getUnlockedAchievements();

      expect(unlocked.length).toBe(1);
      expect(unlocked[0].isUnlocked).toBe(true);
    });

    test('should get in-progress achievements', () => {
      mockGameState.buildings = [
        { id: 1, type: 'farm' },
        { id: 2, type: 'farm' }
      ];
      achievementSystem.checkAchievements(mockGameState);

      const inProgress = achievementSystem.getInProgressAchievements();

      expect(inProgress.length).toBeGreaterThan(0);
      expect(inProgress[0].progress).toBeGreaterThan(0);
      expect(inProgress[0].progress).toBeLessThan(100);
    });

    test('should get achievements by category', () => {
      const buildingAchievements = achievementSystem.getAchievementsByCategory('building');

      expect(buildingAchievements.length).toBe(2);
      expect(buildingAchievements.every(a => a.category === 'building')).toBe(true);
    });

    test('should get statistics', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      const stats = achievementSystem.getStatistics();

      expect(stats.totalAchievements).toBe(3);
      expect(stats.unlockedAchievements).toBe(1);
      expect(stats.completionPercentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('Notifications', () => {
    test('should queue notifications for unlocked achievements', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      const notification = achievementSystem.popNotification();

      expect(notification).toBeDefined();
      expect(notification.achievement.id).toBe('test_first_building');
    });

    test('should pop notifications in FIFO order', () => {
      mockGameState.buildings = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        type: 'farm'
      }));
      achievementSystem.checkAchievements(mockGameState);

      const first = achievementSystem.popNotification();
      const second = achievementSystem.popNotification();

      expect(first.achievement.id).toBe('test_first_building');
      expect(second.achievement.id).toBe('test_ten_buildings');
    });

    test('should return null when no notifications', () => {
      const notification = achievementSystem.popNotification();

      expect(notification).toBeNull();
    });
  });

  describe('Serialization', () => {
    test('should serialize achievement system state', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      const serialized = achievementSystem.serialize();

      expect(serialized.achievements).toBeDefined();
      expect(serialized.tracker).toBeDefined();
      expect(serialized.stats).toBeDefined();
      expect(serialized.stats.unlockedAchievements).toBe(1);
    });

    test('should deserialize achievement system state', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      const serialized = achievementSystem.serialize();

      const newSystem = new AchievementSystem([
        {
          id: 'test_first_building',
          name: 'First Building',
          description: 'Place your first building',
          icon: '🏗️',
          category: AchievementCategory.BUILDING,
          condition: {
            type: ConditionType.BUILDING_COUNT,
            target: 1
          },
          reward: {
            type: RewardType.MULTIPLIER,
            value: { production: 0.02 }
          }
        }
      ]);

      newSystem.deserialize(serialized);

      expect(newSystem.stats.unlockedAchievements).toBe(1);
      expect(newSystem.getAchievement('test_first_building').isUnlocked).toBe(true);
    });
  });

  describe('Reset', () => {
    test('should reset all achievements', () => {
      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);

      achievementSystem.reset();

      expect(achievementSystem.stats.unlockedAchievements).toBe(0);
      expect(achievementSystem.getAchievement('test_first_building').isUnlocked).toBe(false);
    });
  });

  describe('Event System', () => {
    test('should emit unlock event when achievement is unlocked', (done) => {
      achievementSystem.on('achievement:unlocked', (data) => {
        expect(data.id).toBe('test_first_building');
        expect(data.name).toBe('First Building');
        done();
      });

      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);
    });

    test('should emit reward event when achievement is unlocked', (done) => {
      achievementSystem.on('achievement:reward', (data) => {
        expect(data.achievementId).toBe('test_first_building');
        expect(data.rewardType).toBe('multiplier');
        done();
      });

      mockGameState.buildings = [{ id: 1, type: 'farm' }];
      achievementSystem.checkAchievements(mockGameState);
    });
  });
});
