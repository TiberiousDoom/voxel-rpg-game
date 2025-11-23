/**
 * Spell Integration Tests
 *
 * Test-Driven Development: These tests define how the Magic attribute
 * and skill tree should affect spells.
 *
 * Purpose: Ensure:
 * - Magic attribute scales spell damage
 * - Magic attribute reduces mana costs
 * - Magic attribute reduces cooldowns
 * - Skill tree modifiers apply correctly
 * - Soft caps are respected
 */

// Using Jest (included with react-scripts)

// This import will fail until we create the file (expected for TDD)
import { SpellIntegration } from '../SpellIntegration';

describe('Spell Integration Tests', () => {
  let mockCharacter;
  let mockSpell;

  beforeEach(() => {
    mockCharacter = {
      attributes: {
        magic: 10
      },
      skills: {
        settlement: [],
        explorer: [],
        combat: []
      }
    };

    mockSpell = {
      id: 'fireball',
      damage: 20,
      manaCost: 20,
      cooldown: 0.5
    };
  });

  // ============================================================================
  // SPELL DAMAGE SCALING TESTS
  // ============================================================================

  describe('Spell Damage Scaling', () => {
    test('Magic attribute increases spell damage by 2% per point', () => {
      mockCharacter.attributes.magic = 50;

      const damage = SpellIntegration.calculateSpellDamage(mockSpell, mockCharacter);

      // baseDamage: 20
      // magic bonus: 50 * 0.02 = 1.0 (100% increase)
      // Total: 20 * (1 + 1.0) = 40
      expect(damage).toBe(40);
    });

    test('Zero magic attribute still deals base damage', () => {
      mockCharacter.attributes.magic = 0;

      const damage = SpellIntegration.calculateSpellDamage(mockSpell, mockCharacter);

      // No bonus, should be base damage
      expect(damage).toBe(20);
    });

    test('High magic attribute provides significant boost', () => {
      mockCharacter.attributes.magic = 100;

      const damage = SpellIntegration.calculateSpellDamage(mockSpell, mockCharacter);

      // baseDamage: 20
      // magic bonus: 100 * 0.02 = 2.0 (200% increase)
      // Total: 20 * (1 + 2.0) = 60
      expect(damage).toBe(60);
    });

    test('Spell damage rounds down to nearest integer', () => {
      mockCharacter.attributes.magic = 15; // Would give 1.5 damage bonus

      const damage = SpellIntegration.calculateSpellDamage(mockSpell, mockCharacter);

      // baseDamage: 20
      // magic bonus: 15 * 0.02 = 0.30 (30% increase)
      // Total: 20 * 1.30 = 26 (rounded)
      expect(damage).toBe(26);
    });

    test('Works with different base spell damages', () => {
      const weakSpell = { damage: 10 };
      const strongSpell = { damage: 50 };
      mockCharacter.attributes.magic = 40;

      const weakDamage = SpellIntegration.calculateSpellDamage(weakSpell, mockCharacter);
      const strongDamage = SpellIntegration.calculateSpellDamage(strongSpell, mockCharacter);

      // weakSpell: 10 * (1 + 0.80) = 18
      // strongSpell: 50 * (1 + 0.80) = 90
      expect(weakDamage).toBe(18);
      expect(strongDamage).toBe(90);
    });
  });

  // ============================================================================
  // MANA COST REDUCTION TESTS
  // ============================================================================

  describe('Mana Cost Reduction', () => {
    test('Magic attribute reduces mana cost by 0.5% per point', () => {
      mockCharacter.attributes.magic = 40;

      const manaCost = SpellIntegration.calculateManaCost(mockSpell, mockCharacter);

      // baseCost: 20
      // reduction: 40 * 0.005 = 0.20 (20% reduction)
      // final: 20 * (1 - 0.20) = 16
      expect(manaCost).toBe(16);
    });

    test('Mana cost reduction is capped at 40%', () => {
      mockCharacter.attributes.magic = 100; // Would be 50% but capped at 40%

      const manaCost = SpellIntegration.calculateManaCost(mockSpell, mockCharacter);

      // baseCost: 20
      // reduction: 40% (capped)
      // final: 20 * (1 - 0.40) = 12
      expect(manaCost).toBe(12);
    });

    test('Mana cost reduction never goes below 1', () => {
      mockCharacter.attributes.magic = 200; // Extremely high

      const lowCostSpell = { manaCost: 5 };
      const manaCost = SpellIntegration.calculateManaCost(lowCostSpell, mockCharacter);

      // Even with max reduction, should be at least 1
      expect(manaCost).toBeGreaterThanOrEqual(1);
    });

    test('Mana cost rounds up to nearest integer', () => {
      mockCharacter.attributes.magic = 30; // 15% reduction

      const spell = { manaCost: 25 };
      const manaCost = SpellIntegration.calculateManaCost(spell, mockCharacter);

      // 25 * (1 - 0.15) = 25 * 0.85 = 21.25 → rounds to 22
      expect(manaCost).toBe(22);
    });

    test('Works with high-cost spells', () => {
      const expensiveSpell = { manaCost: 100 };
      mockCharacter.attributes.magic = 80; // 40% reduction (capped)

      const manaCost = SpellIntegration.calculateManaCost(expensiveSpell, mockCharacter);

      // 100 * 0.60 = 60
      expect(manaCost).toBe(60);
    });

    test('Zero magic attribute has no reduction', () => {
      mockCharacter.attributes.magic = 0;

      const manaCost = SpellIntegration.calculateManaCost(mockSpell, mockCharacter);

      expect(manaCost).toBe(20); // No reduction
    });
  });

  // ============================================================================
  // COOLDOWN REDUCTION TESTS
  // ============================================================================

  describe('Cooldown Reduction', () => {
    test('Magic attribute reduces cooldown by 0.5% per point', () => {
      mockCharacter.attributes.magic = 40;

      const cooldown = SpellIntegration.calculateCooldown(mockSpell, mockCharacter);

      // baseCooldown: 0.5
      // reduction: 40 * 0.005 = 0.20 (20% reduction)
      // final: 0.5 * (1 - 0.20) = 0.4
      expect(cooldown).toBe(0.4);
    });

    test('Cooldown reduction is capped at 40%', () => {
      mockCharacter.attributes.magic = 100; // Would be 50% but capped at 40%

      const spell = { cooldown: 10 };
      const cooldown = SpellIntegration.calculateCooldown(spell, mockCharacter);

      // baseCooldown: 10
      // reduction: 40% (capped)
      // final: 10 * 0.60 = 6
      expect(cooldown).toBe(6);
    });

    test('Cooldown reduction never goes below 0.1 seconds', () => {
      mockCharacter.attributes.magic = 200; // Extremely high

      const fastSpell = { cooldown: 0.3 };
      const cooldown = SpellIntegration.calculateCooldown(fastSpell, mockCharacter);

      // Should have minimum cooldown
      expect(cooldown).toBeGreaterThanOrEqual(0.1);
    });

    test('Works with long cooldown spells', () => {
      const ultimateSpell = { cooldown: 60 };
      mockCharacter.attributes.magic = 80; // 40% reduction (capped)

      const cooldown = SpellIntegration.calculateCooldown(ultimateSpell, mockCharacter);

      // 60 * 0.60 = 36 seconds
      expect(cooldown).toBe(36);
    });

    test('Zero magic attribute has no reduction', () => {
      mockCharacter.attributes.magic = 0;

      const cooldown = SpellIntegration.calculateCooldown(mockSpell, mockCharacter);

      expect(cooldown).toBe(0.5); // No reduction
    });

    test('Cooldown maintains precision for short spells', () => {
      mockCharacter.attributes.magic = 50; // 25% reduction

      const quickSpell = { cooldown: 0.4 };
      const cooldown = SpellIntegration.calculateCooldown(quickSpell, mockCharacter);

      // 0.4 * 0.75 = 0.3
      expect(cooldown).toBe(0.3);
    });
  });

  // ============================================================================
  // SKILL TREE MODIFIER TESTS (Post-MVP)
  // ============================================================================

  describe('Skill Tree Modifiers', () => {
    test('Returns 1.0 multiplier when no skills allocated (MVP)', () => {
      mockCharacter.skills.combat = [];

      const modifier = SpellIntegration.getSpellSkillModifier(mockCharacter);

      // MVP: No skill tree integration yet
      expect(modifier).toBe(1.0);
    });

    test('Future: Arcane Knowledge skill increases spell damage by 10%', () => {
      // This test is for Post-MVP Phase 1 (Combat tree)
      // Will be skipped in MVP

      mockCharacter.skills.combat = [
        { id: 'arcaneKnowledge', points: 5 }
      ];

      // For MVP, this will return 1.0
      // For Post-MVP, this should return 1.10
      const modifier = SpellIntegration.getSpellSkillModifier(mockCharacter);

      // For now, expect 1.0 (no skill integration in MVP)
      expect(modifier).toBe(1.0);

      // Post-MVP expectation (will be uncommented later):
      // expect(modifier).toBe(1.10);
    });

    test('Future: Multiple spell skills stack multiplicatively', () => {
      // Post-MVP test
      mockCharacter.skills.combat = [
        { id: 'arcaneKnowledge', points: 5 },  // +10%
        { id: 'spellPower', points: 3 }        // +15%
      ];

      const modifier = SpellIntegration.getSpellSkillModifier(mockCharacter);

      // For MVP: 1.0
      expect(modifier).toBe(1.0);

      // Post-MVP: 1.10 * 1.15 = 1.265
      // expect(modifier).toBeCloseTo(1.265, 3);
    });
  });

  // ============================================================================
  // COMBINED EFFECT TESTS
  // ============================================================================

  describe('Combined Effects', () => {
    test('Damage, mana cost, and cooldown all scale together', () => {
      mockCharacter.attributes.magic = 60;

      const spell = {
        damage: 30,
        manaCost: 50,
        cooldown: 2.0
      };

      const damage = SpellIntegration.calculateSpellDamage(spell, mockCharacter);
      const manaCost = SpellIntegration.calculateManaCost(spell, mockCharacter);
      const cooldown = SpellIntegration.calculateCooldown(spell, mockCharacter);

      // Damage: 30 * (1 + 1.20) = 66
      expect(damage).toBe(66);

      // Mana cost: 50 * (1 - 0.30) = 35
      expect(manaCost).toBe(35);

      // Cooldown: 2.0 * (1 - 0.30) = 1.4
      expect(cooldown).toBe(1.4);
    });

    test('High magic makes spells more powerful and efficient', () => {
      const lowMagic = { attributes: { magic: 10 } };
      const highMagic = { attributes: { magic: 80 } };

      const spell = {
        damage: 40,
        manaCost: 60,
        cooldown: 3.0
      };

      // Low magic
      const lowDamage = SpellIntegration.calculateSpellDamage(spell, lowMagic);
      const lowCost = SpellIntegration.calculateManaCost(spell, lowMagic);
      const lowCooldown = SpellIntegration.calculateCooldown(spell, lowMagic);

      // High magic (capped at 40% reduction)
      const highDamage = SpellIntegration.calculateSpellDamage(spell, highMagic);
      const highCost = SpellIntegration.calculateManaCost(spell, highMagic);
      const highCooldown = SpellIntegration.calculateCooldown(spell, highMagic);

      // High magic should have higher damage
      expect(highDamage).toBeGreaterThan(lowDamage);

      // High magic should have lower costs
      expect(highCost).toBeLessThan(lowCost);
      expect(highCooldown).toBeLessThan(lowCooldown);
    });
  });

  // ============================================================================
  // SOFT CAP TESTS
  // ============================================================================

  describe('Soft Caps', () => {
    test('Reduction caps prevent over-optimization', () => {
      mockCharacter.attributes.magic = 150; // Very high

      const spell = {
        manaCost: 100,
        cooldown: 10
      };

      const manaCost = SpellIntegration.calculateManaCost(spell, mockCharacter);
      const cooldown = SpellIntegration.calculateCooldown(spell, mockCharacter);

      // Both should be capped at 40% reduction
      expect(manaCost).toBe(60); // 100 * 0.60
      expect(cooldown).toBe(6);   // 10 * 0.60
    });

    test('Damage scaling has no cap (intentional design)', () => {
      mockCharacter.attributes.magic = 150;

      const spell = { damage: 20 };
      const damage = SpellIntegration.calculateSpellDamage(spell, mockCharacter);

      // 150 * 0.02 = 3.0 (300% increase)
      // Total: 20 * (1 + 3.0) = 80
      // No cap on damage scaling
      expect(damage).toBe(80);
    });
  });

  // ============================================================================
  // SPELL TYPE TESTS
  // ============================================================================

  describe('Different Spell Types', () => {
    test('Projectile spells scale correctly', () => {
      mockCharacter.attributes.magic = 50;

      const fireball = { type: 'projectile', damage: 20, manaCost: 20 };
      const damage = SpellIntegration.calculateSpellDamage(fireball, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(fireball, mockCharacter);

      expect(damage).toBe(40);  // 20 * 2.0
      expect(cost).toBe(15);    // 20 * 0.75
    });

    test('AOE spells scale correctly', () => {
      mockCharacter.attributes.magic = 40;

      const meteor = { type: 'aoe', damage: 50, manaCost: 50, aoeRadius: 8 };
      const damage = SpellIntegration.calculateSpellDamage(meteor, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(meteor, mockCharacter);

      expect(damage).toBe(90);  // 50 * 1.8
      expect(cost).toBe(40);    // 50 * 0.80
      // AOE radius is not affected by magic
    });

    test('Healing spells benefit from magic attribute', () => {
      mockCharacter.attributes.magic = 60;

      const healSpell = { type: 'heal', healAmount: 50 };
      const healing = SpellIntegration.calculateSpellHealing(healSpell, mockCharacter);

      // Same scaling as damage: 50 * (1 + 1.20) = 110
      expect(healing).toBe(110);
    });

    test('Buff spells have reduced mana cost', () => {
      mockCharacter.attributes.magic = 50;

      const buffSpell = { type: 'buff', manaCost: 40 };
      const cost = SpellIntegration.calculateManaCost(buffSpell, mockCharacter);

      // 40 * (1 - 0.25) = 30
      expect(cost).toBe(30);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('Handles zero damage spells (utility spells)', () => {
      mockCharacter.attributes.magic = 50;

      const utilitySpell = { damage: 0, manaCost: 30 };
      const damage = SpellIntegration.calculateSpellDamage(utilitySpell, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(utilitySpell, mockCharacter);

      expect(damage).toBe(0); // No damage to scale
      expect(cost).toBe(23);  // Mana cost still reduced
    });

    test('Handles very short cooldown spells with minimum floor', () => {
      mockCharacter.attributes.magic = 100;

      const fastSpell = { cooldown: 0.2 };
      const cooldown = SpellIntegration.calculateCooldown(fastSpell, mockCharacter);

      // 0.2 * 0.60 = 0.12, but minimum is 0.1
      expect(cooldown).toBeGreaterThanOrEqual(0.1);
    });

    test('Handles negative magic attribute (should treat as 0)', () => {
      mockCharacter.attributes.magic = -10; // Invalid

      const damage = SpellIntegration.calculateSpellDamage(mockSpell, mockCharacter);

      // Should treat as 0 magic, no bonus
      expect(damage).toBe(20);
    });

    test('Handles missing spell properties gracefully', () => {
      const incompleteSpell = {
        // No damage, manaCost, or cooldown
      };

      // Should not throw errors
      expect(() => {
        SpellIntegration.calculateSpellDamage(incompleteSpell, mockCharacter);
      }).not.toThrow();
    });

    test('Handles very high spell damage values', () => {
      mockCharacter.attributes.magic = 100;

      const powerfulSpell = { damage: 1000 };
      const damage = SpellIntegration.calculateSpellDamage(powerfulSpell, mockCharacter);

      // 1000 * (1 + 2.0) = 3000
      expect(damage).toBe(3000);
    });
  });

  // ============================================================================
  // INTEGRATION WITH EXISTING SPELL SYSTEM
  // ============================================================================

  describe('Integration with Existing Spells', () => {
    test('Fireball scales correctly', () => {
      mockCharacter.attributes.magic = 50;

      const fireball = {
        id: 'fireball',
        damage: 20,
        manaCost: 20,
        cooldown: 0.5
      };

      const damage = SpellIntegration.calculateSpellDamage(fireball, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(fireball, mockCharacter);
      const cooldown = SpellIntegration.calculateCooldown(fireball, mockCharacter);

      expect(damage).toBe(40);    // 20 * 2.0
      expect(cost).toBe(15);      // 20 * 0.75
      expect(cooldown).toBe(0.38); // 0.5 * 0.75 = 0.375, rounded to 0.38
    });

    test('Lightning Bolt scales correctly', () => {
      mockCharacter.attributes.magic = 60;

      const lightning = {
        id: 'lightning',
        damage: 40,
        manaCost: 30,
        cooldown: 0.8
      };

      const damage = SpellIntegration.calculateSpellDamage(lightning, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(lightning, mockCharacter);
      const cooldown = SpellIntegration.calculateCooldown(lightning, mockCharacter);

      expect(damage).toBe(88);    // 40 * 2.2
      expect(cost).toBe(21);      // 30 * 0.70
      expect(cooldown).toBe(0.56); // 0.8 * 0.70
    });

    test('Meteor (AOE) scales correctly', () => {
      mockCharacter.attributes.magic = 40;

      const meteor = {
        id: 'meteor',
        damage: 50,
        manaCost: 50,
        cooldown: 2
      };

      const damage = SpellIntegration.calculateSpellDamage(meteor, mockCharacter);
      const cost = SpellIntegration.calculateManaCost(meteor, mockCharacter);
      const cooldown = SpellIntegration.calculateCooldown(meteor, mockCharacter);

      expect(damage).toBe(90);   // 50 * 1.8
      expect(cost).toBe(40);     // 50 * 0.80
      expect(cooldown).toBe(1.6); // 2 * 0.80
    });
  });
});
