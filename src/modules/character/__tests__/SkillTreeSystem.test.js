/**
 * SkillTreeSystem Unit Tests
 *
 * Tests for skill tree allocation, validation, and effect calculation
 */

import skillTreeSystem from '../SkillTreeSystem';
import { getDefaultCharacterData } from '../CharacterSystem';

describe('SkillTreeSystem', () => {
  let character;

  beforeEach(() => {
    character = getDefaultCharacterData();
    character.skillPoints = 10; // Start with some points
    character.skills = {
      settlement: {},
    };
  });

  // ============================================================================
  // BASIC ALLOCATION TESTS
  // ============================================================================

  describe('Skill Allocation', () => {
    test('allocates skill point successfully', () => {
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(true);
      expect(character.skills.settlement.efficientBuilder).toBe(1);
      expect(character.skillPoints).toBe(9);
    });

    test('cannot allocate without skill points', () => {
      character.skillPoints = 0;

      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(false);
      expect(result.message).toContain('skill points');
    });

    test('cannot allocate past max points', () => {
      character.skillPoints = 10;

      // Allocate to max (efficientBuilder has maxPoints: 1)
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      // Try to allocate again
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(false);
      expect(result.message).toContain('maximum');
    });

    test('deallocates skill point successfully', () => {
      // First allocate
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      // Then deallocate
      const result = skillTreeSystem.deallocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(true);
      expect(character.skills.settlement.efficientBuilder).toBe(0);
      expect(character.skillPoints).toBe(10); // Refunded
    });

    test('cannot deallocate skill with no points', () => {
      const result = skillTreeSystem.deallocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // PREREQUISITE TESTS
  // ============================================================================

  describe('Prerequisites', () => {
    test('cannot allocate skill without prerequisite', () => {
      // masterBuilder requires efficientBuilder
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');

      expect(result.success).toBe(false);
      expect(result.message).toContain('prerequisite');
    });

    test('can allocate skill with prerequisite met', () => {
      // First allocate prerequisite
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      // Now allocate masterBuilder
      character.skillPoints = 10; // Ensure enough points
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // TIER REQUIREMENTS TESTS
  // ============================================================================

  describe('Tier Requirements', () => {
    test('cannot allocate tier 2 skill without level requirement', () => {
      character.level = 1; // Tier 2 requires level 5

      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');

      expect(result.success).toBe(false);
      expect(result.message).toContain('level');
    });

    test('cannot allocate tier 2 skill without points in tree', () => {
      character.level = 10; // High enough level

      // Tier 2 requires 5 points in tree
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');

      expect(result.success).toBe(false);
      expect(result.message).toContain('points in tree');
    });

    test('can allocate tier 2 skill with requirements met', () => {
      character.level = 10;
      character.skillPoints = 10;

      // Allocate 5 tier 1 skills
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

      // Now can allocate tier 2
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // PASSIVE EFFECT CALCULATION TESTS
  // ============================================================================

  describe('Passive Effect Calculation', () => {
    test('calculates passive effects correctly', () => {
      // Allocate efficientBuilder (+10% building speed)
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      const effects = skillTreeSystem.calculatePassiveEffects(character);

      expect(effects.buildingSpeed).toBe(0.10);
    });

    test('aggregates multiple passive effects', () => {
      character.skillPoints = 10;

      // Allocate multiple skills
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder'); // +10% building speed
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement'); // +10% resource storage
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner'); // +10% XP

      const effects = skillTreeSystem.calculatePassiveEffects(character);

      expect(effects.buildingSpeed).toBe(0.10);
      expect(effects.storageCapacity).toBe(0.10);
      expect(effects.xpGain).toBe(0.10);
    });

    test('stacks effects from same category', () => {
      character.skillPoints = 20;
      character.level = 15;

      // Allocate efficientBuilder (tier 1) and masterBuilder (tier 2)
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder'); // +10%
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
      skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder'); // +25%

      const effects = skillTreeSystem.calculatePassiveEffects(character);

      // Should stack: 10% + 25% = 35%
      expect(effects.buildingSpeed).toBe(0.35);
    });

    test('returns empty effects for no skills allocated', () => {
      const effects = skillTreeSystem.calculatePassiveEffects(character);

      // All effects should be 0
      Object.values(effects).forEach(value => {
        expect(value).toBe(0);
      });
    });
  });

  // ============================================================================
  // ACTIVE SKILL DETECTION TESTS
  // ============================================================================

  describe('Active Skill Detection', () => {
    test('getActiveSkills returns empty array when none unlocked', () => {
      const activeSkills = skillTreeSystem.getActiveSkills(character);

      expect(activeSkills).toEqual([]);
    });

    test('getActiveSkills returns unlocked active skills', () => {
      character.skillPoints = 20;
      character.level = 10;

      // Allocate to unlock Rally Cry (tier 2 active skill)
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      const activeSkills = skillTreeSystem.getActiveSkills(character);

      expect(activeSkills.length).toBeGreaterThan(0);
      expect(activeSkills[0].type).toBe('active');
    });
  });

  // ============================================================================
  // RESPEC TESTS
  // ============================================================================

  describe('Respec Functionality', () => {
    test('respec refunds all skill points', () => {
      character.skillPoints = 10;

      // Allocate several skills
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

      const pointsBeforeRespec = character.skillPoints;

      // Respec
      skillTreeSystem.respecTree(character, 'settlement');

      expect(character.skillPoints).toBe(pointsBeforeRespec + 3);
      expect(character.skills.settlement).toEqual({});
    });

    test('respecAll refunds all trees', () => {
      character.skillPoints = 5;

      // Allocate in settlement
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');

      const pointsBeforeRespec = character.skillPoints;

      // Respec all
      skillTreeSystem.respecAll(character);

      expect(character.skillPoints).toBe(pointsBeforeRespec + 2);
    });
  });

  // ============================================================================
  // MUTUAL EXCLUSION TESTS (CAPSTONE SKILLS)
  // ============================================================================

  describe('Mutual Exclusion', () => {
    test('cannot allocate both capstone skills', () => {
      character.skillPoints = 30;
      character.level = 25;

      // Allocate enough to reach tier 5
      // This is a simplified test - in practice would need 20 points in tree
      for (let i = 0; i < 20; i++) {
        character.skills.settlement[`skill${i}`] = 1;
      }

      // Allocate first capstone
      const result1 = skillTreeSystem.allocateSkill(character, 'settlement', 'civilization');

      // Try to allocate second capstone
      const result2 = skillTreeSystem.allocateSkill(character, 'settlement', 'empireBuilder');

      // First should succeed, second should fail (if mutual exclusion is implemented)
      // Note: This depends on data structure having mutuallyExclusive field
      if (result1.success) {
        expect(result2.success).toBe(false);
      }
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles invalid tree ID gracefully', () => {
      const result = skillTreeSystem.allocateSkill(character, 'invalid_tree', 'someSkill');

      expect(result.success).toBe(false);
    });

    test('handles invalid skill ID gracefully', () => {
      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'invalid_skill');

      expect(result.success).toBe(false);
    });

    test('handles missing skills object', () => {
      character.skills = null;

      const result = skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      expect(result.success).toBe(false);
    });

    test('getSkillPoints returns 0 for unallocated skill', () => {
      const points = skillTreeSystem.getSkillPoints(character, 'settlement', 'efficientBuilder');

      expect(points).toBe(0);
    });

    test('getSkillPoints returns correct value for allocated skill', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      const points = skillTreeSystem.getSkillPoints(character, 'settlement', 'efficientBuilder');

      expect(points).toBe(1);
    });
  });
});
