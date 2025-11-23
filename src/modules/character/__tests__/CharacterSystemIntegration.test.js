/**
 * Character System Integration Tests
 *
 * Tests for complete character system integration including:
 * - XP bonuses
 * - Gold bonuses
 * - Production bonuses
 * - Skill effects integration
 */


import {
  getDefaultCharacterData,
  calculateDerivedStats,
  allocateAttributePoint,
  grantLevelUpPoints,
} from '../CharacterSystem';
import skillTreeSystem from '../SkillTreeSystem';
import activeSkillSystem from '../ActiveSkillSystem';

describe('Character System Integration', () => {
  let character;
  let player;
  let equipment;

  beforeEach(() => {
    character = getDefaultCharacterData();
    player = {
      level: 10,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      stamina: 100,
      maxStamina: 100,
      damage: 10,
      defense: 0,
      speed: 5,
      xp: 0,
      xpToNext: 100,
    };
    equipment = {};

    activeSkillSystem.reset();
  });

  // ============================================================================
  // LEVEL UP AND POINT GRANTING TESTS
  // ============================================================================

  describe('Level Up System', () => {
    test('grants correct points on level up', () => {
      const updatedCharacter = grantLevelUpPoints(character, 2);

      // 5 attribute points + 2 skill points per level
      expect(updatedCharacter.attributePoints).toBe(5);
      expect(updatedCharacter.skillPoints).toBe(2);
    });

    test('grants cumulative points on multiple level ups', () => {
      let char = grantLevelUpPoints(character, 2);
      char = grantLevelUpPoints(char, 3);
      char = grantLevelUpPoints(char, 4);

      // 3 level ups = 15 attribute points, 6 skill points
      expect(char.attributePoints).toBe(15);
      expect(char.skillPoints).toBe(6);
    });
  });

  // ============================================================================
  // ATTRIBUTE ALLOCATION TESTS
  // ============================================================================

  describe('Attribute Allocation', () => {
    test('allocates attribute points correctly', () => {
      character.attributePoints = 10;

      const updated = allocateAttributePoint(character, 'leadership');

      expect(updated.attributes.leadership).toBe(1);
      expect(updated.attributePoints).toBe(9);
    });

    test('cannot allocate without points', () => {
      character.attributePoints = 0;

      expect(() => {
        allocateAttributePoint(character, 'leadership');
      }).toThrow();
    });

    test('cannot allocate past max (100)', () => {
      character.attributes.leadership = 100;
      character.attributePoints = 10;

      expect(() => {
        allocateAttributePoint(character, 'leadership');
      }).toThrow();
    });
  });

  // ============================================================================
  // DERIVED STATS CALCULATION TESTS
  // ============================================================================

  describe('Derived Stats Calculation', () => {
    test('calculates base stats with no attributes', () => {
      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.maxHealth).toBe(100); // Base
      expect(stats.maxMana).toBe(100); // Base
      expect(stats.maxStamina).toBe(100); // Base
      expect(stats.speed).toBe(5); // Base
    });

    test('leadership affects NPC capacity', () => {
      character.attributes.leadership = 50;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.maxNPCCapacity).toBeGreaterThan(10); // Base + leadership bonus
    });

    test('construction affects building bonuses', () => {
      character.attributes.construction = 40;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.buildingCostReduction).toBeGreaterThan(0);
      expect(stats.buildingSpeed).toBeGreaterThan(1.0);
    });

    test('exploration affects movement and gathering', () => {
      character.attributes.exploration = 50;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.speed).toBeGreaterThan(5); // Base speed + exploration bonus
      expect(stats.gatheringSpeed).toBeGreaterThan(1.0);
    });

    test('combat affects damage and crit', () => {
      character.attributes.combat = 40;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.damage).toBeGreaterThan(player.damage);
      expect(stats.critChance).toBeGreaterThan(0);
    });

    test('magic affects mana and spell power', () => {
      character.attributes.magic = 50;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.maxMana).toBeGreaterThan(100);
      expect(stats.manaRegen).toBeGreaterThan(1.0);
      expect(stats.spellPower).toBeGreaterThan(1.0);
    });

    test('endurance affects health and stamina', () => {
      character.attributes.endurance = 50;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.maxHealth).toBeGreaterThan(100);
      expect(stats.maxStamina).toBeGreaterThan(100);
      expect(stats.healthRegen).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // SKILL TREE PASSIVE BONUS INTEGRATION TESTS
  // ============================================================================

  describe('Skill Tree Passive Bonuses', () => {
    test('passive skills add to derived stats', () => {
      character.skillPoints = 10;
      character.skills = { settlement: {} };

      // Allocate Quick Learner (+10% XP)
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

      const stats = calculateDerivedStats(character, player, equipment);

      // Should have XP multiplier
      expect(stats.xpGainMultiplier).toBeGreaterThan(1.0);
      expect(stats.skillEffects.xpGain).toBe(0.10);
    });

    test('multiple passive skills stack', () => {
      character.skillPoints = 20;
      character.level = 15;
      character.skills = { settlement: {} };

      // Allocate Quick Learner and Scholar
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner'); // +10% XP
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'scholar'); // +15% XP

      const stats = calculateDerivedStats(character, player, equipment);

      // Should stack: 10% + 15% = 25%
      expect(stats.skillEffects.xpGain).toBe(0.25);
      expect(stats.xpGainMultiplier).toBe(1.25);
    });

    test('resource production skills are included', () => {
      character.skillPoints = 10;
      character.skills = { settlement: {} };

      // Allocate Resource Management (+10% storage)
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.skillEffects.storageCapacity).toBe(0.10);
    });

    test('building speed skills are included', () => {
      character.skillPoints = 10;
      character.skills = { settlement: {} };

      // Allocate Efficient Builder (+10% building speed)
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.skillEffects.buildingSpeed).toBe(0.10);
    });
  });

  // ============================================================================
  // ACTIVE SKILL BUFF INTEGRATION TESTS
  // ============================================================================

  describe('Active Skill Buff Integration', () => {
    test('active buffs combine with passive effects', () => {
      character.skillPoints = 20;
      character.level = 10;
      character.skills = { settlement: {} };

      // Allocate tier 1 skills
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

      // Allocate and activate Rally Cry (+20% NPC efficiency)
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Get passive effects
      const passiveEffects = skillTreeSystem.calculatePassiveEffects(character);

      // Get active buff effects
      const activeEffects = activeSkillSystem.getActiveBuffEffects();

      // Verify Rally Cry buff is active
      expect(activeEffects.npcEfficiency).toBe(0.20);

      // inspiringLeader gives +5% NPC efficiency, Rally Cry adds +20%
      expect(passiveEffects.npcEfficiency + activeEffects.npcEfficiency).toBe(0.25);
    });

    test('production buff stacks with passive production bonuses', () => {
      character.skillPoints = 40;
      character.level = 20;
      character.skills = { settlement: {} };

      // Allocate many skills to reach tier 3
      for (let i = 0; i < 10; i++) {
        character.skills.settlement[`skill_${i}`] = 1;
      }

      // Allocate Mass Production (+100% production for 30s)
      skillTreeSystem.allocateSkill(character, 'settlement', 'massProduction');
      activeSkillSystem.activateSkill(character, 'settlement', 'massProduction');

      const activeEffects = activeSkillSystem.getActiveBuffEffects();

      expect(activeEffects.productionBonus).toBe(1.00); // 100% bonus
    });

    test('buffs expire and stop contributing', () => {
      character.skillPoints = 20;
      character.level = 10;
      character.skills = { settlement: {} };

      // Setup and activate
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Verify buff is active
      expect(activeSkillSystem.getActiveBuffEffects().npcEfficiency).toBe(0.20);

      // Fast forward past duration (60s)
      activeSkillSystem.update(61);

      // Buff should be gone
      expect(activeSkillSystem.getActiveBuffEffects().npcEfficiency).toBe(0);
    });
  });

  // ============================================================================
  // XP BONUS INTEGRATION TESTS
  // ============================================================================

  describe('XP Bonus Integration', () => {
    test('Quick Learner provides 10% XP bonus', () => {
      character.skillPoints = 10;
      character.skills = { settlement: {} };

      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.xpGainMultiplier).toBe(1.10);
    });

    test('Scholar provides 15% XP bonus', () => {
      character.skillPoints = 20;
      character.level = 10;
      character.skills = { settlement: {} };

      // Allocate to tier 2
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
      skillTreeSystem.allocateSkill(character, 'settlement', 'scholar');

      const stats = calculateDerivedStats(character, player, equipment);

      // Quick Learner (10%) + Scholar (15%) = 25%
      expect(stats.xpGainMultiplier).toBe(1.25);
    });
  });

  // ============================================================================
  // GOLD BONUS INTEGRATION TESTS
  // ============================================================================

  describe('Gold Bonus Integration', () => {
    test('Economic Genius provides gold bonus', () => {
      character.skillPoints = 20;
      character.level = 10;
      character.skills = { settlement: {} };

      // Allocate to tier 2
      skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
      skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
      skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
      skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
      skillTreeSystem.allocateSkill(character, 'settlement', 'economicGenius');

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.skillEffects.goldGain).toBe(0.15); // 15% bonus
    });
  });

  // ============================================================================
  // PRODUCTION BONUS INTEGRATION TESTS
  // ============================================================================

  describe('Production Bonus Integration', () => {
    test('Resource Empire provides production bonus', () => {
      character.skillPoints = 40;
      character.level = 20;
      character.skills = { settlement: {} };

      // Allocate to tier 3
      for (let i = 0; i < 10; i++) {
        character.skills.settlement[`skill_${i}`] = 1;
      }
      skillTreeSystem.allocateSkill(character, 'settlement', 'resourceEmpire');

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.skillEffects.resourceProduction).toBeGreaterThan(0);
    });

    test('Empire Builder provides massive production bonus', () => {
      character.skillPoints = 60;
      character.level = 25;
      character.skills = { settlement: {} };

      // Allocate to tier 5
      for (let i = 0; i < 20; i++) {
        character.skills.settlement[`skill_${i}`] = 1;
      }
      skillTreeSystem.allocateSkill(character, 'settlement', 'empireBuilder');

      const stats = calculateDerivedStats(character, player, equipment);

      // Empire Builder provides +200% building efficiency
      expect(stats.skillEffects.buildingEfficiency).toBe(2.00);
    });
  });

  // ============================================================================
  // COMPLETE CHARACTER PROGRESSION TEST
  // ============================================================================

  describe('Complete Character Progression', () => {
    test('simulates full character progression from level 1 to 10', () => {
      let char = getDefaultCharacterData();

      // Level up to 10
      for (let level = 2; level <= 10; level++) {
        char = grantLevelUpPoints(char, level);
      }

      // Should have: 9 level ups * (5 attribute + 2 skill) = 45 attribute, 18 skill points
      expect(char.attributePoints).toBe(45);
      expect(char.skillPoints).toBe(18);

      // Spend attribute points
      for (let i = 0; i < 10; i++) {
        char = allocateAttributePoint(char, 'leadership');
      }
      for (let i = 0; i < 10; i++) {
        char = allocateAttributePoint(char, 'construction');
      }
      for (let i = 0; i < 10; i++) {
        char = allocateAttributePoint(char, 'combat');
      }

      expect(char.attributes.leadership).toBe(10);
      expect(char.attributes.construction).toBe(10);
      expect(char.attributes.combat).toBe(10);
      expect(char.attributePoints).toBe(15); // 45 - 30

      // Calculate stats
      player.level = 10;
      const stats = calculateDerivedStats(char, player, equipment);

      // Verify stat improvements
      expect(stats.maxHealth).toBeGreaterThan(100);
      expect(stats.damage).toBeGreaterThan(10);
      expect(stats.buildingSpeed).toBeGreaterThan(1.0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles empty skills object', () => {
      character.skills = {};

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats).toBeDefined();
      expect(stats.maxHealth).toBeDefined();
    });

    test('handles null equipment', () => {
      const stats = calculateDerivedStats(character, player, null);

      expect(stats).toBeDefined();
    });

    test('handles missing player stats', () => {
      const minimalPlayer = { level: 1 };

      const stats = calculateDerivedStats(character, minimalPlayer, equipment);

      expect(stats).toBeDefined();
    });

    test('very high attribute values dont break calculations', () => {
      character.attributes.combat = 200;
      character.attributes.magic = 200;
      character.attributes.endurance = 200;

      const stats = calculateDerivedStats(character, player, equipment);

      expect(stats.damage).toBeDefined();
      expect(stats.maxHealth).toBeDefined();
      expect(stats.maxMana).toBeDefined();
      expect(isFinite(stats.damage)).toBe(true);
      expect(isFinite(stats.maxHealth)).toBe(true);
    });
  });
});
