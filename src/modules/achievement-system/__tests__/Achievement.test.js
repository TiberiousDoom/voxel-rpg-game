/**
 * Achievement.test.js - Unit tests for Achievement class
 */

import Achievement, { AchievementCategory, RewardType, ConditionType } from '../Achievement.js';

describe('Achievement', () => {
  describe('Constructor Validation', () => {
    test('should create achievement with valid config', () => {
      const achievement = new Achievement({
        id: 'test_achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        category: AchievementCategory.BUILDING,
        condition: {
          type: ConditionType.BUILDING_COUNT,
          target: 10
        }
      });

      expect(achievement.id).toBe('test_achievement');
      expect(achievement.name).toBe('Test Achievement');
      expect(achievement.description).toBe('A test achievement');
      expect(achievement.category).toBe(AchievementCategory.BUILDING);
    });

    test('should throw error if id is missing', () => {
      expect(() => {
        new Achievement({
          name: 'Test',
          description: 'Test',
          category: AchievementCategory.BUILDING,
          condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
        });
      }).toThrow('Achievement requires id, name, and description');
    });

    test('should throw error if name is missing', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          description: 'Test',
          category: AchievementCategory.BUILDING,
          condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
        });
      }).toThrow('Achievement requires id, name, and description');
    });

    test('should throw error if description is missing', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          name: 'Test',
          category: AchievementCategory.BUILDING,
          condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
        });
      }).toThrow('Achievement requires id, name, and description');
    });

    test('should throw error if category is missing', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          name: 'Test',
          description: 'Test',
          condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
        });
      }).toThrow('Achievement requires valid category');
    });

    test('should throw error if category is invalid', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          name: 'Test',
          description: 'Test',
          category: 'invalid_category',
          condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
        });
      }).toThrow('Achievement requires valid category');
    });

    test('should throw error if condition is missing', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          name: 'Test',
          description: 'Test',
          category: AchievementCategory.BUILDING
        });
      }).toThrow('Achievement requires condition with type');
    });

    test('should throw error if condition type is missing', () => {
      expect(() => {
        new Achievement({
          id: 'test',
          name: 'Test',
          description: 'Test',
          category: AchievementCategory.BUILDING,
          condition: { target: 10 }
        });
      }).toThrow('Achievement requires condition with type');
    });

    test('should use default icon if not provided', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.icon).toBe('🏆');
    });

    test('should use custom icon if provided', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        icon: '🏗️',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.icon).toBe('🏗️');
    });

    test('should initialize with unlocked = false', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.isUnlocked).toBe(false);
      expect(achievement.unlockedAt).toBeNull();
      expect(achievement.progress).toBe(0);
    });

    test('should initialize condition with current = 0', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.condition.current).toBe(0);
    });

    test('should include condition params if provided', () => {
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

      expect(achievement.condition.params.resourceType).toBe('food');
    });

    test('should use default cosmetic reward if not provided', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.reward.type).toBe(RewardType.COSMETIC);
      expect(achievement.reward.value).toBeNull();
    });

    test('should include custom reward if provided', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 },
        reward: { type: RewardType.MULTIPLIER, value: { production: 0.05 } }
      });

      expect(achievement.reward.type).toBe(RewardType.MULTIPLIER);
      expect(achievement.reward.value.production).toBe(0.05);
    });
  });

  describe('Progress Updates', () => {
    let achievement;

    beforeEach(() => {
      achievement = new Achievement({
        id: 'test',
        name: 'Build 10 Buildings',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: {
          type: ConditionType.BUILDING_COUNT,
          target: 10
        }
      });
    });

    test('should update progress correctly', () => {
      achievement.updateProgress(5);

      expect(achievement.condition.current).toBe(5);
      expect(achievement.progress).toBe(50);
    });

    test('should not exceed 100% progress', () => {
      achievement.updateProgress(15);

      expect(achievement.progress).toBe(100);
    });

    test('should unlock when target reached', () => {
      const unlocked = achievement.updateProgress(10);

      expect(unlocked).toBe(true);
      expect(achievement.isUnlocked).toBe(true);
      expect(achievement.progress).toBe(100);
    });

    test('should not update progress if already unlocked', () => {
      achievement.updateProgress(10); // Unlock
      const secondUpdate = achievement.updateProgress(5);

      expect(secondUpdate).toBe(false);
      expect(achievement.condition.current).toBe(10); // Unchanged
    });

    test('should set unlockedAt timestamp when unlocked', () => {
      achievement.updateProgress(10);

      expect(achievement.unlockedAt).toBeDefined();
      expect(typeof achievement.unlockedAt).toBe('string');
    });

    test('should handle zero target (edge case)', () => {
      achievement.condition.target = 0;
      achievement.updateProgress(0);

      expect(achievement.progress).toBe(100);
    });

    test('should handle boolean conditions (no numeric target)', () => {
      const boolAchievement = new Achievement({
        id: 'test_bool',
        name: 'Test Boolean',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: {
          type: ConditionType.STORAGE_FULL,
          target: null
        }
      });

      boolAchievement.updateProgress(true);

      expect(boolAchievement.progress).toBe(100);
    });
  });

  describe('Unlock Conditions', () => {
    test('should unlock BUILDING_COUNT when >= target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.updateProgress(10);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should unlock BUILDING_TYPE_COUNT when >= target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_TYPE_COUNT, target: 5, params: { buildingType: 'farm' } }
      });

      achievement.updateProgress(5);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should unlock RESOURCE_TOTAL when >= target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.RESOURCE_TOTAL, target: 1000, params: { resourceType: 'food' } }
      });

      achievement.updateProgress(1000);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should unlock NPC_COUNT when >= target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_COUNT, target: 20 }
      });

      achievement.updateProgress(20);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should unlock TIER_REACHED when === target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_REACHED, target: 'TOWN' }
      });

      achievement.updateProgress('TOWN');

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should not unlock TIER_REACHED if wrong tier', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_REACHED, target: 'TOWN' }
      });

      achievement.updateProgress('VILLAGE');

      expect(achievement.isUnlocked).toBe(false);
    });

    test('should unlock TIER_SPEED when <= target time', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_SPEED, target: 600 }
      });

      achievement.updateProgress(500); // 500 seconds < 600

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should not unlock TIER_SPEED when > target time', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_SPEED, target: 600 }
      });

      achievement.updateProgress(700); // 700 seconds > 600

      expect(achievement.isUnlocked).toBe(false);
    });

    test('should unlock STORAGE_FULL when true', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.STORAGE_FULL, target: true }
      });

      achievement.updateProgress(true);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should unlock EVENT_ALL_TYPES when array length >= target', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: { type: ConditionType.EVENT_ALL_TYPES, target: 3 }
      });

      achievement.updateProgress(['DISASTER', 'INVASION', 'STORM']);

      expect(achievement.isUnlocked).toBe(true);
    });

    test('should handle unknown condition type gracefully', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: 'UNKNOWN_TYPE', target: 10 }
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      achievement.updateProgress(10);

      expect(achievement.isUnlocked).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown achievement condition type: UNKNOWN_TYPE');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Progress Descriptions', () => {
    test('should return "Unlocked!" when unlocked', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.unlock();

      expect(achievement.getProgressDescription()).toBe('Unlocked!');
    });

    test('should describe BUILDING_COUNT progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.updateProgress(5);

      expect(achievement.getProgressDescription()).toBe('5/10 buildings placed');
    });

    test('should describe BUILDING_TYPE_COUNT progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_TYPE_COUNT, target: 5, params: { buildingType: 'farm' } }
      });

      achievement.updateProgress(3);

      expect(achievement.getProgressDescription()).toBe('3/5 farm buildings');
    });

    test('should describe RESOURCE_TOTAL progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.RESOURCE_TOTAL, target: 1000, params: { resourceType: 'food' } }
      });

      achievement.updateProgress(750);

      expect(achievement.getProgressDescription()).toBe('750/1000 food');
    });

    test('should describe NPC_COUNT progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.NPC,
        condition: { type: ConditionType.NPC_COUNT, target: 20 }
      });

      achievement.updateProgress(15);

      expect(achievement.getProgressDescription()).toBe('15/20 NPCs alive');
    });

    test('should describe TIER_SPEED progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.TIER,
        condition: { type: ConditionType.TIER_SPEED, target: 600 }
      });

      achievement.updateProgress(480);

      expect(achievement.getProgressDescription()).toContain('8min');
      expect(achievement.getProgressDescription()).toContain('limit: 10min');
    });

    test('should describe EVENT_ALL_TYPES progress', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.SURVIVAL,
        condition: { type: ConditionType.EVENT_ALL_TYPES, target: 5 }
      });

      achievement.updateProgress(['DISASTER', 'INVASION']);

      expect(achievement.getProgressDescription()).toBe('2/5 event types survived');
    });

    test('should handle default case with percentage', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: 'CUSTOM_TYPE', target: 10 }
      });

      achievement.progress = 75.5;

      expect(achievement.getProgressDescription()).toBe('75% complete');
    });
  });

  describe('Serialization', () => {
    let achievement;

    beforeEach(() => {
      achievement = new Achievement({
        id: 'test_serialize',
        name: 'Test Serialize',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });
    });

    test('should serialize achievement state', () => {
      achievement.updateProgress(7);

      const serialized = achievement.serialize();

      expect(serialized.id).toBe('test_serialize');
      expect(serialized.condition.current).toBe(7);
      expect(serialized.isUnlocked).toBe(false);
      expect(serialized.progress).toBe(70);
    });

    test('should serialize unlocked achievement', () => {
      achievement.updateProgress(10);

      const serialized = achievement.serialize();

      expect(serialized.isUnlocked).toBe(true);
      expect(serialized.unlockedAt).toBeDefined();
      expect(serialized.progress).toBe(100);
    });

    test('should deserialize achievement state', () => {
      const data = {
        id: 'test_serialize',
        condition: { current: 5 },
        isUnlocked: false,
        unlockedAt: null,
        progress: 50
      };

      achievement.deserialize(data);

      expect(achievement.condition.current).toBe(5);
      expect(achievement.isUnlocked).toBe(false);
      expect(achievement.progress).toBe(50);
    });

    test('should deserialize unlocked achievement', () => {
      const timestamp = new Date().toISOString();
      const data = {
        id: 'test_serialize',
        condition: { current: 10 },
        isUnlocked: true,
        unlockedAt: timestamp,
        progress: 100
      };

      achievement.deserialize(data);

      expect(achievement.isUnlocked).toBe(true);
      expect(achievement.unlockedAt).toBe(timestamp);
      expect(achievement.progress).toBe(100);
    });

    test('should handle deserializing with missing fields', () => {
      const data = {
        id: 'test_serialize'
      };

      achievement.deserialize(data);

      expect(achievement.isUnlocked).toBe(false);
      expect(achievement.unlockedAt).toBeNull();
      expect(achievement.progress).toBe(0);
    });

    test('should preserve achievement definition after deserialization', () => {
      const data = {
        condition: { current: 5 },
        isUnlocked: false,
        progress: 50
      };

      achievement.deserialize(data);

      expect(achievement.id).toBe('test_serialize');
      expect(achievement.name).toBe('Test Serialize');
      expect(achievement.condition.target).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    test('should not unlock twice', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.unlock();
      const firstUnlockTime = achievement.unlockedAt;

      // Try to unlock again
      achievement.unlock();

      expect(achievement.unlockedAt).toBe(firstUnlockTime);
    });

    test('should handle negative progress values', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.updateProgress(-5);

      expect(achievement.progress).toBeLessThanOrEqual(0);
    });

    test('should handle very large progress values', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      achievement.updateProgress(1000000);

      expect(achievement.progress).toBe(100);
      expect(achievement.isUnlocked).toBe(true);
    });

    test('should have createdAt timestamp', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.BUILDING,
        condition: { type: ConditionType.BUILDING_COUNT, target: 10 }
      });

      expect(achievement.createdAt).toBeDefined();
      expect(typeof achievement.createdAt).toBe('string');
    });

    test('should handle float progress values correctly', () => {
      const achievement = new Achievement({
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: AchievementCategory.RESOURCE,
        condition: { type: ConditionType.RESOURCE_TOTAL, target: 1000, params: { resourceType: 'food' } }
      });

      achievement.updateProgress(333.33);

      expect(achievement.progress).toBeCloseTo(33.33, 1);
      expect(achievement.getProgressDescription()).toBe('333/1000 food');
    });
  });
});
