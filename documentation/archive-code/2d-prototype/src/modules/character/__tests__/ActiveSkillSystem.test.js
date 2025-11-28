/**
 * ActiveSkillSystem Unit Tests
 *
 * Tests for active skill activation, cooldowns, and buffs
 */

import activeSkillSystem from '../ActiveSkillSystem';
import skillTreeSystem from '../SkillTreeSystem';
import { getDefaultCharacterData } from '../CharacterSystem';

describe('ActiveSkillSystem', () => {
  let character;

  beforeEach(() => {
    // Reset active skill system
    activeSkillSystem.reset();

    // Create character with skills allocated
    character = getDefaultCharacterData();
    character.skillPoints = 20;
    character.level = 10;
    character.skills = {
      settlement: {},
    };

    // Allocate tier 1 skills to unlock tier 2
    skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
    skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
    skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
    skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
    skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');
  });

  // ============================================================================
  // ACTIVATION VALIDATION TESTS
  // ============================================================================

  describe('Activation Validation', () => {
    test('cannot activate skill that is not unlocked', () => {
      const validation = activeSkillSystem.canActivateSkill(character, 'settlement', 'rallyCry');

      expect(validation.canActivate).toBe(false);
      expect(validation.reason).toContain('not unlocked');
    });

    test('can activate unlocked active skill', () => {
      // Allocate Rally Cry
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      const validation = activeSkillSystem.canActivateSkill(character, 'settlement', 'rallyCry');

      expect(validation.canActivate).toBe(true);
    });

    test('cannot activate passive skill', () => {
      const validation = activeSkillSystem.canActivateSkill(character, 'settlement', 'efficientBuilder');

      expect(validation.canActivate).toBe(false);
      expect(validation.reason).toContain('Not an active skill');
    });

    test('cannot activate skill on cooldown', () => {
      // Allocate and activate Rally Cry
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Try to activate again
      const validation = activeSkillSystem.canActivateSkill(character, 'settlement', 'rallyCry');

      expect(validation.canActivate).toBe(false);
      expect(validation.reason).toContain('cooldown');
    });

    test('cannot activate skill that is already active', () => {
      // Allocate and activate Rally Cry (60s duration)
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Try to activate again
      const validation = activeSkillSystem.canActivateSkill(character, 'settlement', 'rallyCry');

      expect(validation.canActivate).toBe(false);
    });
  });

  // ============================================================================
  // ACTIVATION TESTS
  // ============================================================================

  describe('Skill Activation', () => {
    test('activates skill successfully', () => {
      // Allocate Rally Cry
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      const result = activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated');
    });

    test('starts cooldown on activation', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const cooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');

      // Rally Cry has 300s cooldown
      expect(cooldown).toBe(300);
    });

    test('creates buff for duration-based skills', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const buffs = activeSkillSystem.getActiveBuffs();

      expect(buffs.length).toBe(1);
      expect(buffs[0].skillId).toBe('rallyCry');
      expect(buffs[0].duration).toBe(60); // Rally Cry has 60s duration
    });

    test('instant skills do not create buffs', () => {
      // Allocate Instant Repair (duration: 0, instant effect)
      character.skillPoints = 20;
      skillTreeSystem.allocateSkill(character, 'settlement', 'instantRepair');
      const result = activeSkillSystem.activateSkill(character, 'settlement', 'instantRepair');

      expect(result.success).toBe(true);
      expect(result.instant).toBe(true);

      const buffs = activeSkillSystem.getActiveBuffs();
      expect(buffs.length).toBe(0);
    });
  });

  // ============================================================================
  // COOLDOWN TRACKING TESTS
  // ============================================================================

  describe('Cooldown Tracking', () => {
    test('cooldown decreases over time', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Initial cooldown
      const initialCooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(initialCooldown).toBe(300);

      // Update with 10 seconds
      activeSkillSystem.update(10);

      const updatedCooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(updatedCooldown).toBe(290);
    });

    test('cooldown reaches zero', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Update with more than cooldown duration
      activeSkillSystem.update(301);

      const cooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(cooldown).toBe(0);
    });

    test('isOnCooldown returns correct status', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      expect(activeSkillSystem.isOnCooldown('settlement', 'rallyCry')).toBe(false);

      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      expect(activeSkillSystem.isOnCooldown('settlement', 'rallyCry')).toBe(true);

      activeSkillSystem.update(301);
      expect(activeSkillSystem.isOnCooldown('settlement', 'rallyCry')).toBe(false);
    });
  });

  // ============================================================================
  // BUFF DURATION TESTS
  // ============================================================================

  describe('Buff Duration', () => {
    test('buff duration decreases over time', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const initialBuffs = activeSkillSystem.getActiveBuffs();
      expect(initialBuffs[0].remainingDuration).toBe(60);

      // Update with 10 seconds
      activeSkillSystem.update(10);

      const updatedBuffs = activeSkillSystem.getActiveBuffs();
      expect(updatedBuffs[0].remainingDuration).toBe(50);
    });

    test('buff expires after duration', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(activeSkillSystem.getActiveBuffs().length).toBe(1);

      // Update with more than buff duration
      activeSkillSystem.update(61);

      expect(activeSkillSystem.getActiveBuffs().length).toBe(0);
    });

    test('multiple buffs tracked independently', () => {
      character.skillPoints = 40;
      character.level = 15;

      // Allocate and activate multiple active skills
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry'); // 60s duration
      skillTreeSystem.allocateSkill(character, 'settlement', 'instantRepair');

      // Need more points for tier 3
      for (let i = 0; i < 5; i++) {
        character.skills.settlement[`tier2_${i}`] = 1;
      }
      skillTreeSystem.allocateSkill(character, 'settlement', 'massProduction'); // 30s duration

      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'massProduction');

      expect(activeSkillSystem.getActiveBuffs().length).toBe(2);

      // Update 31 seconds - massProduction should expire, rallyCry should remain
      activeSkillSystem.update(31);

      const buffs = activeSkillSystem.getActiveBuffs();
      expect(buffs.length).toBe(1);
      expect(buffs[0].skillId).toBe('rallyCry');
    });
  });

  // ============================================================================
  // BUFF EFFECT AGGREGATION TESTS
  // ============================================================================

  describe('Buff Effect Aggregation', () => {
    test('getActiveBuffEffects returns aggregated effects', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const effects = activeSkillSystem.getActiveBuffEffects();

      // Rally Cry provides +20% NPC efficiency
      expect(effects.npcEfficiency).toBe(0.20);
    });

    test('multiple buffs stack effects', () => {
      character.skillPoints = 40;
      character.level = 20;

      // Allocate multiple active skills with different effects
      for (let i = 0; i < 10; i++) {
        character.skills.settlement[`tier_${i}`] = 1;
      }

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry'); // +20% NPC efficiency
      skillTreeSystem.allocateSkill(character, 'settlement', 'massProduction'); // +100% production

      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'massProduction');

      const effects = activeSkillSystem.getActiveBuffEffects();

      expect(effects.npcEfficiency).toBe(0.20);
      expect(effects.productionBonus).toBe(1.00);
    });

    test('returns zero effects when no buffs active', () => {
      const effects = activeSkillSystem.getActiveBuffEffects();

      Object.values(effects).forEach(value => {
        expect(value).toBe(0);
      });
    });
  });

  // ============================================================================
  // EVENT SYSTEM TESTS
  // ============================================================================

  describe('Event System', () => {
    test('fires onBuffStart event', () => {
      const callback = jest.fn();
      activeSkillSystem.on('onBuffStart', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
        })
      );
    });

    test('fires onBuffEnd event when buff expires', () => {
      const callback = jest.fn();
      activeSkillSystem.on('onBuffEnd', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Fast forward past duration
      activeSkillSystem.update(61);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
        })
      );
    });

    test('fires onCooldownStart event', () => {
      const callback = jest.fn();
      activeSkillSystem.on('onCooldownStart', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
          cooldown: 300,
        })
      );
    });

    test('fires onCooldownEnd event when cooldown expires', () => {
      const callback = jest.fn();
      activeSkillSystem.on('onCooldownEnd', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Fast forward past cooldown
      activeSkillSystem.update(301);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
        })
      );
    });

    test('can remove event listener', () => {
      const callback = jest.fn();
      activeSkillSystem.on('onBuffStart', callback);
      activeSkillSystem.off('onBuffStart', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SERIALIZATION TESTS
  // ============================================================================

  describe('Serialization', () => {
    test('serializes cooldowns and buffs', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const serialized = activeSkillSystem.serialize();

      expect(serialized.cooldowns).toBeDefined();
      expect(serialized.activeBuffs).toBeDefined();
      expect(serialized.cooldowns['settlement_rallyCry']).toBe(300);
    });

    test('deserializes cooldowns and buffs', () => {
      const data = {
        cooldowns: {
          'settlement_rallyCry': 150,
        },
        activeBuffs: [
          {
            key: 'settlement_rallyCry',
            treeId: 'settlement',
            skillId: 'rallyCry',
            duration: 60,
            remainingDuration: 30,
          },
        ],
      };

      activeSkillSystem.deserialize(data);

      expect(activeSkillSystem.getCooldown('settlement', 'rallyCry')).toBe(150);
      expect(activeSkillSystem.getActiveBuffs().length).toBe(1);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles invalid skill gracefully', () => {
      const result = activeSkillSystem.activateSkill(character, 'settlement', 'invalid_skill');

      expect(result.success).toBe(false);
    });

    test('handles rapid activations', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      const result2 = activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      const result3 = activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    test('reset clears all state', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      activeSkillSystem.reset();

      expect(activeSkillSystem.getCooldown('settlement', 'rallyCry')).toBe(0);
      expect(activeSkillSystem.getActiveBuffs().length).toBe(0);
    });
  });
});
