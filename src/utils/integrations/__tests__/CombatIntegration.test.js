/**
 * CombatIntegration.test.js
 * Tests for Combat and Endurance attribute integration with combat systems
 *
 * TDD Approach: These tests are written BEFORE implementation
 * They will FAIL until the actual integration code is written in Phase 1
 */

import { CombatIntegration } from '../CombatIntegration';

describe('CombatIntegration', () => {
  let mockCharacter;
  let mockEnemy;
  let mockEquipment;

  beforeEach(() => {
    mockCharacter = {
      level: 10,
      attributes: {
        combat: 30,
        magic: 20,
        endurance: 40,
        leadership: 10,
        construction: 10,
        exploration: 10,
      },
      skills: {
        activeNodes: [],
      },
      position: { x: 0, y: 0, z: 0 },
      isBlocking: false,
    };

    mockEnemy = {
      level: 10,
      baseDamage: 20,
      defense: 5,
      position: { x: 2, y: 0, z: 2 },
    };

    mockEquipment = {
      weapon: {
        id: 'iron_sword',
        damage: 15,
        attackSpeed: 1.0,
      },
      armor: {
        id: 'iron_armor',
        defense: 10,
      },
    };
  });

  // ============================================================================
  // COMBAT ATTRIBUTE: DAMAGE CALCULATIONS
  // ============================================================================

  describe('Damage Calculations', () => {
    test('Combat attribute increases damage by 1.5 per point', () => {
      const damage = CombatIntegration.calculateDamage(mockCharacter, mockEquipment);

      // Base damage: 10 + (level * 0.8) = 10 + 8 = 18
      // Combat bonus: 30 * 1.5 = 45
      // Equipment bonus: 15
      // Skill multiplier: 1.0 (no active skills)
      // Total: (18 + 45 + 15) * 1.0 = 78
      expect(damage).toBe(78);
    });

    test('Damage calculation works without weapon equipped', () => {
      const damage = CombatIntegration.calculateDamage(mockCharacter, {});

      // Base damage: 18
      // Combat bonus: 45
      // Equipment bonus: 0
      // Total: 63
      expect(damage).toBe(63);
    });

    test('Damage calculation includes skill tree multipliers', () => {
      mockCharacter.skills.activeNodes = ['combat_power_strike']; // +15% damage

      const damage = CombatIntegration.calculateDamage(mockCharacter, mockEquipment);

      // Base calculation: 78
      // With 15% skill bonus: 78 * 1.15 = 89.7 (rounded)
      expect(damage).toBeCloseTo(89.7, 1);
    });

    test('Critical strike chance scales with Combat attribute', () => {
      mockCharacter.attributes.combat = 50;

      const critChance = CombatIntegration.calculateCritChance(mockCharacter);

      // Base crit: 5%
      // Combat bonus: 50 * 0.3 = 15%
      // Total: 20%
      expect(critChance).toBe(0.20);
    });

    test('Critical strike chance is capped at 50%', () => {
      mockCharacter.attributes.combat = 200; // Would give 60% crit

      const critChance = CombatIntegration.calculateCritChance(mockCharacter);

      expect(critChance).toBe(0.50); // Capped at 50%
    });

    test('Critical damage multiplier is 2.0x', () => {
      const baseDamage = 50;
      const critDamage = CombatIntegration.applyCriticalHit(baseDamage);

      expect(critDamage).toBe(100); // 50 * 2.0
    });
  });

  // ============================================================================
  // COMBAT ATTRIBUTE: ATTACK SPEED
  // ============================================================================

  describe('Attack Speed', () => {
    test('Combat attribute increases attack speed by 0.5% per point', () => {
      const attackSpeed = CombatIntegration.calculateAttackSpeed(mockCharacter, mockEquipment);

      // Base speed (from weapon): 1.0
      // Combat bonus: 30 * 0.005 = 0.15 (15% increase)
      // Total: 1.0 * (1 + 0.15) = 1.15
      expect(attackSpeed).toBeCloseTo(1.15, 2);
    });

    test('Attack speed works without weapon (unarmed)', () => {
      const attackSpeed = CombatIntegration.calculateAttackSpeed(mockCharacter, {});

      // Base unarmed speed: 0.8
      // Combat bonus: 15%
      // Total: 0.8 * 1.15 = 0.92
      expect(attackSpeed).toBeCloseTo(0.92, 2);
    });

    test('Attack speed is capped at 3.0x base', () => {
      mockCharacter.attributes.combat = 1000; // Would give 500% bonus

      const attackSpeed = CombatIntegration.calculateAttackSpeed(mockCharacter, mockEquipment);

      // Base: 1.0
      // Max multiplier: 3.0
      expect(attackSpeed).toBe(3.0);
    });
  });

  // ============================================================================
  // ENDURANCE ATTRIBUTE: HEALTH AND STAMINA
  // ============================================================================

  describe('Health Calculations', () => {
    test('Endurance attribute increases max health by 15 per point', () => {
      const maxHealth = CombatIntegration.calculateMaxHealth(mockCharacter);

      // Base health: 100
      // Endurance bonus: 40 * 15 = 600
      // Total: 700
      expect(maxHealth).toBe(700);
    });

    test('Health regeneration scales with Endurance (0.3 HP/s per point)', () => {
      const healthRegen = CombatIntegration.calculateHealthRegen(mockCharacter);

      // Base regen: 0.5 HP/s
      // Endurance bonus: 40 * 0.3 = 12 HP/s
      // Total: 12.5 HP/s
      expect(healthRegen).toBe(12.5);
    });

    test('Health regeneration is paused in combat', () => {
      const healthRegen = CombatIntegration.calculateHealthRegen(mockCharacter, true);

      expect(healthRegen).toBe(0); // No regen during combat
    });
  });

  describe('Stamina Calculations', () => {
    test('Endurance attribute increases max stamina by 5 per point', () => {
      const maxStamina = CombatIntegration.calculateMaxStamina(mockCharacter);

      // Base stamina: 100
      // Endurance bonus: 40 * 5 = 200
      // Total: 300
      expect(maxStamina).toBe(300);
    });

    test('Stamina regeneration scales with Endurance (0.2 per point)', () => {
      const staminaRegen = CombatIntegration.calculateStaminaRegen(mockCharacter);

      // Base regen: 30 per second
      // Endurance bonus: 40 * 0.2 = 8 per second
      // Total: 38 per second
      expect(staminaRegen).toBe(38);
    });

    test('Sprint stamina cost is reduced by Endurance (0.1% per point)', () => {
      const sprintCost = CombatIntegration.calculateSprintCost(mockCharacter);

      // Base cost: 20 per second
      // Endurance reduction: 40 * 0.001 = 0.04 (4% reduction)
      // Total: 20 * 0.96 = 19.2 per second
      expect(sprintCost).toBeCloseTo(19.2, 1);
    });
  });

  // ============================================================================
  // ENDURANCE ATTRIBUTE: DEFENSE AND RESISTANCE
  // ============================================================================

  describe('Defense Calculations', () => {
    test('Endurance attribute increases defense by 0.5 per point', () => {
      const defense = CombatIntegration.calculateDefense(mockCharacter, mockEquipment);

      // Base defense: 0
      // Endurance bonus: 40 * 0.5 = 20
      // Equipment bonus: 10
      // Total: 30
      expect(defense).toBe(30);
    });

    test('Defense reduces incoming damage', () => {
      const incomingDamage = 100;
      const defense = 30;

      const finalDamage = CombatIntegration.applyDefense(incomingDamage, defense);

      // Damage reduction: defense / (defense + 100)
      // 30 / (30 + 100) = 0.2308 (23% reduction)
      // Final: 100 * (1 - 0.2308) = 76.92
      expect(finalDamage).toBeCloseTo(76.92, 1);
    });

    test('Defense has diminishing returns (soft cap)', () => {
      const defense = 200; // Very high defense

      const reduction = CombatIntegration.calculateDefenseReduction(defense);

      // 200 / (200 + 100) = 0.6667 (66.67% reduction)
      // Diminishing returns prevent 100% damage reduction
      expect(reduction).toBeCloseTo(0.6667, 3);
    });

    test('Blocking multiplies defense by 2.0', () => {
      mockCharacter.isBlocking = true;

      const defense = CombatIntegration.calculateDefense(mockCharacter, mockEquipment);

      // Normal defense: 30
      // Blocking multiplier: 2.0
      // Total: 60
      expect(defense).toBe(60);
    });
  });

  describe('Elemental Resistance', () => {
    test('Endurance provides 0.2% resistance per point', () => {
      const resistance = CombatIntegration.calculateElementalResistance(mockCharacter);

      // Endurance: 40
      // Resistance: 40 * 0.002 = 0.08 (8%)
      expect(resistance).toBeCloseTo(0.08, 3);
    });

    test('Resistance is capped at 75%', () => {
      mockCharacter.attributes.endurance = 500; // Would give 100% resistance

      const resistance = CombatIntegration.calculateElementalResistance(mockCharacter);

      expect(resistance).toBe(0.75); // Capped at 75%
    });

    test('Elemental damage is reduced by resistance', () => {
      const elementalDamage = 50;
      const resistance = 0.20; // 20% resistance

      const finalDamage = CombatIntegration.applyElementalResistance(elementalDamage, resistance);

      // 50 * (1 - 0.20) = 40
      expect(finalDamage).toBe(40);
    });
  });

  // ============================================================================
  // MULTI-ATTRIBUTE SYNERGIES
  // ============================================================================

  describe('Combat System Integration', () => {
    test('Full damage calculation includes all bonuses', () => {
      mockCharacter.skills.activeNodes = ['combat_power_strike']; // +15% damage

      const damage = CombatIntegration.calculateFinalDamage(
        mockCharacter,
        mockEquipment,
        mockEnemy
      );

      // Player damage: 78 * 1.15 = 89.7
      // Enemy defense: 5
      // Defense reduction: 5 / 105 = 4.76%
      // Final: 89.7 * 0.9524 = 85.4
      expect(damage).toBeCloseTo(85.4, 0);
    });

    test('Combat effectiveness rating combines offense and defense', () => {
      const effectiveness = CombatIntegration.calculateCombatEffectiveness(
        mockCharacter,
        mockEquipment
      );

      // Damage: 78
      // Defense: 30
      // Health: 700
      // Effectiveness formula: (damage * 10 + defense * 5 + health / 10)
      // (780 + 150 + 70) = 1000
      expect(effectiveness).toBe(1000);
    });

    test('Zero attributes provide minimum combat stats', () => {
      mockCharacter.attributes.combat = 0;
      mockCharacter.attributes.endurance = 0;

      const damage = CombatIntegration.calculateDamage(mockCharacter, {});
      const health = CombatIntegration.calculateMaxHealth(mockCharacter);
      const defense = CombatIntegration.calculateDefense(mockCharacter, {});

      // Minimum damage: base only
      expect(damage).toBeGreaterThan(0);
      // Minimum health: 100
      expect(health).toBe(100);
      // Minimum defense: 0
      expect(defense).toBe(0);
    });
  });

  // ============================================================================
  // SOFT CAPS AND DIMINISHING RETURNS
  // ============================================================================

  describe('Soft Caps', () => {
    test('Combat attribute has soft cap at 50 points', () => {
      mockCharacter.attributes.combat = 75; // Above soft cap

      const damage = CombatIntegration.calculateDamage(mockCharacter, mockEquipment);

      // First 50 points: 50 * 1.5 = 75
      // Next 25 points: 25 * 0.75 = 18.75 (50% effectiveness)
      // Total combat bonus: 93.75
      // Base: 18, Equipment: 15
      // Total: 18 + 93.75 + 15 = 126.75
      expect(damage).toBeCloseTo(126.75, 1);
    });

    test('Endurance attribute has soft cap at 50 points', () => {
      mockCharacter.attributes.endurance = 75; // Above soft cap

      const health = CombatIntegration.calculateMaxHealth(mockCharacter);

      // First 50 points: 50 * 15 = 750
      // Next 25 points: 25 * 7.5 = 187.5 (50% effectiveness)
      // Total: 100 + 750 + 187.5 = 1037.5
      expect(health).toBeCloseTo(1037.5, 0);
    });

    test('Soft cap documentation is accessible', () => {
      const softCapInfo = CombatIntegration.getSoftCapInfo('combat');

      expect(softCapInfo).toEqual({
        attribute: 'combat',
        softCapThreshold: 50,
        fullEffectiveness: 1.0,
        reducedEffectiveness: 0.5,
        description: 'Combat gains are halved after 50 points',
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    test('Handles missing equipment gracefully', () => {
      const damage = CombatIntegration.calculateDamage(mockCharacter, null);

      expect(damage).toBeGreaterThan(0);
      expect(damage).toBe(63); // Base + combat bonus only
    });

    test('Handles negative damage (should return 0)', () => {
      const finalDamage = CombatIntegration.applyDefense(10, 1000);

      expect(finalDamage).toBeGreaterThanOrEqual(0);
      // Very high defense should still allow minimum damage
      expect(finalDamage).toBeGreaterThan(0);
    });

    test('Handles extremely high attribute values', () => {
      mockCharacter.attributes.combat = 10000;
      mockCharacter.attributes.endurance = 10000;

      const damage = CombatIntegration.calculateDamage(mockCharacter, mockEquipment);
      const health = CombatIntegration.calculateMaxHealth(mockCharacter);

      // Should not cause overflow or NaN
      expect(damage).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(health).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(Number.isFinite(damage)).toBe(true);
      expect(Number.isFinite(health)).toBe(true);
    });

    test('Handles zero level character', () => {
      mockCharacter.level = 0;

      const damage = CombatIntegration.calculateDamage(mockCharacter, mockEquipment);

      // Should still provide base damage
      expect(damage).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTEGRATION WITH EXISTING COMBAT SYSTEM
  // ============================================================================

  describe('Backward Compatibility', () => {
    test('Works with existing player object structure', () => {
      const legacyPlayer = {
        level: 10,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        position: { x: 0, y: 0, z: 0 },
      };

      // Should initialize with default attributes
      const damage = CombatIntegration.calculateDamage(legacyPlayer, mockEquipment);

      expect(damage).toBeGreaterThan(0);
    });

    test('Integrates with existing damage dealing code', () => {
      const attackResult = CombatIntegration.executeAttack(
        mockCharacter,
        mockEnemy,
        mockEquipment
      );

      expect(attackResult).toHaveProperty('damage');
      expect(attackResult).toHaveProperty('isCritical');
      expect(attackResult).toHaveProperty('finalDamage');
      expect(attackResult.damage).toBeGreaterThan(0);
    });

    test('Works with player getTotalStats function', () => {
      const totalStats = CombatIntegration.getTotalStats(mockCharacter, mockEquipment);

      expect(totalStats).toHaveProperty('maxHealth');
      expect(totalStats).toHaveProperty('maxStamina');
      expect(totalStats).toHaveProperty('damage');
      expect(totalStats).toHaveProperty('defense');
      expect(totalStats).toHaveProperty('speed');
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    test('Damage calculation completes in under 1ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        CombatIntegration.calculateDamage(mockCharacter, mockEquipment);
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(1); // < 1ms per calculation
    });

    test('Full stats calculation completes in under 5ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        CombatIntegration.getTotalStats(mockCharacter, mockEquipment);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(5); // < 5ms per full calculation
    });
  });
});
