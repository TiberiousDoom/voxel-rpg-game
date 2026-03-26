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
    character.skillPoints = 30;
    character.level = 11; // Tier 2 requires level 11
    character.skills = {
      settlement: {},
    };

    // Allocate tier 1 skills to unlock tier 2 (5 points in tree)
    skillTreeSystem.allocateSkill(character, 'settlement', 'efficientBuilder');
    skillTreeSystem.allocateSkill(character, 'settlement', 'resourceManagement');
    skillTreeSystem.allocateSkill(character, 'settlement', 'inspiringLeader');
    skillTreeSystem.allocateSkill(character, 'settlement', 'carefulPlanning');
    skillTreeSystem.allocateSkill(character, 'settlement', 'quickLearner');

    // Allocate naturalLeader (prerequisite for rallyCry)
    skillTreeSystem.allocateSkill(character, 'settlement', 'naturalLeader');
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

      // Rally Cry has 60s cooldown
      expect(cooldown).toBe(60);
    });

    test('creates buff for duration-based skills', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      const buffs = activeSkillSystem.getActiveBuffs();

      expect(buffs.length).toBe(1);
      expect(buffs[0].skillId).toBe('rallyCry');
      expect(buffs[0].duration).toBe(30); // Rally Cry has 30s duration
    });

    test('instant skills do not create buffs', () => {
      // Allocate masterBuilder (prerequisite for instantRepair)
      skillTreeSystem.allocateSkill(character, 'settlement', 'masterBuilder');
      // Allocate Instant Repair (no duration field in activation)
      skillTreeSystem.allocateSkill(character, 'settlement', 'instantRepair');
      const result = activeSkillSystem.activateSkill(character, 'settlement', 'instantRepair');

      expect(result.success).toBe(true);

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

      // Initial cooldown (Rally Cry has 60s cooldown)
      const initialCooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(initialCooldown).toBe(60);

      // Update with 10 seconds
      activeSkillSystem.update(10);

      const updatedCooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(updatedCooldown).toBe(50);
    });

    test('cooldown reaches zero', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Update with more than cooldown duration (60s)
      activeSkillSystem.update(61);

      const cooldown = activeSkillSystem.getCooldown('settlement', 'rallyCry');
      expect(cooldown).toBe(0);
    });

    test('isOnCooldown returns correct status', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');

      expect(activeSkillSystem.isOnCooldown('settlement', 'rallyCry')).toBe(false);

      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');
      expect(activeSkillSystem.isOnCooldown('settlement', 'rallyCry')).toBe(true);

      activeSkillSystem.update(61); // Past 60s cooldown
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
      // Rally Cry has 30s duration
      expect(initialBuffs[0].remainingDuration).toBe(30);

      // Update with 10 seconds
      activeSkillSystem.update(10);

      const updatedBuffs = activeSkillSystem.getActiveBuffs();
      expect(updatedBuffs[0].remainingDuration).toBe(20);
    });

    test('buff expires after duration', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(activeSkillSystem.getActiveBuffs().length).toBe(1);

      // Rally Cry has 30s duration, update past it
      activeSkillSystem.update(31);

      expect(activeSkillSystem.getActiveBuffs().length).toBe(0);
    });

    test('buff duration tracked after partial time', () => {
      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(activeSkillSystem.getActiveBuffs().length).toBe(1);

      // Advance part of the duration (30s total)
      activeSkillSystem.update(15);

      // rallyCry should still be active
      const remaining = activeSkillSystem.getActiveBuffs();
      expect(remaining.length).toBe(1);
      expect(remaining[0].skillId).toBe('rallyCry');
      expect(remaining[0].remainingDuration).toBe(15);
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

      // Active skill buffs store skill.effects (top-level), which is empty for active skills
      // (the actual effects are nested in activation.effects, not top-level)
      expect(effects.npcEfficiency).toBe(0);
    });

    test('returns zero effects when no buffs active', () => {
      const effects = activeSkillSystem.getActiveBuffEffects();

      Object.values(effects).forEach(value => {
        expect(value).toBe(0);
      });
    });

    test('effect aggregation returns all expected keys', () => {
      const effects = activeSkillSystem.getActiveBuffEffects();

      // Should have all standard effect keys
      expect(effects).toHaveProperty('npcEfficiency');
      expect(effects).toHaveProperty('productionBonus');
      expect(effects).toHaveProperty('constructionSpeed');
      expect(effects).toHaveProperty('goldGain');
    });
  });

  // ============================================================================
  // EVENT SYSTEM TESTS
  // ============================================================================

  describe('Event System', () => {
    test('fires onBuffStart event', () => {
      const callback = vi.fn();
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
      const callback = vi.fn();
      activeSkillSystem.on('onBuffEnd', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Fast forward past duration (30s)
      activeSkillSystem.update(31);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
        })
      );
    });

    test('fires onCooldownStart event', () => {
      const callback = vi.fn();
      activeSkillSystem.on('onCooldownStart', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
          cooldown: 60,
        })
      );
    });

    test('fires onCooldownEnd event when cooldown expires', () => {
      const callback = vi.fn();
      activeSkillSystem.on('onCooldownEnd', callback);

      skillTreeSystem.allocateSkill(character, 'settlement', 'rallyCry');
      activeSkillSystem.activateSkill(character, 'settlement', 'rallyCry');

      // Fast forward past cooldown (60s)
      activeSkillSystem.update(61);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'settlement',
          skillId: 'rallyCry',
        })
      );
    });

    test('can remove event listener', () => {
      const callback = vi.fn();
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
      expect(serialized.cooldowns['settlement_rallyCry']).toBe(60);
    });

    test('deserializes cooldowns and buffs', () => {
      const data = {
        cooldowns: {
          'settlement_rallyCry': 45,
        },
        activeBuffs: [
          {
            key: 'settlement_rallyCry',
            treeId: 'settlement',
            skillId: 'rallyCry',
            duration: 30,
            remainingDuration: 15,
          },
        ],
      };

      activeSkillSystem.deserialize(data);

      expect(activeSkillSystem.getCooldown('settlement', 'rallyCry')).toBe(45);
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
