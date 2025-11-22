/**
 * BuildingIntegration.test.js
 * Tests for Construction attribute integration with building system
 *
 * TDD Approach: These tests are written BEFORE implementation
 * They will FAIL until the actual integration code is written in Phase 1
 */

import { BuildingIntegration } from '../BuildingIntegration';

describe('BuildingIntegration', () => {
  let mockCharacter;
  let mockBuilding;
  let mockSettlement;

  beforeEach(() => {
    mockCharacter = {
      level: 10,
      attributes: {
        leadership: 30,
        construction: 50,
        exploration: 20,
        combat: 30,
        magic: 20,
        endurance: 30,
      },
      skills: {
        activeNodes: [],
      },
      position: { x: 0, y: 0, z: 0 },
    };

    mockBuilding = {
      id: 'building_house_001',
      type: 'house',
      level: 1,
      baseCost: {
        wood: 50,
        stone: 30,
        iron: 10,
      },
      baseBuildTime: 300, // 5 minutes in seconds
      health: 100,
      maxHealth: 100,
      upgradeLevel: 1,
    };

    mockSettlement = {
      buildings: ['house', 'house', 'workshop'],
      resources: {
        wood: 1000,
        stone: 800,
        iron: 200,
        gold: 500,
      },
    };
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: BUILDING COST REDUCTION
  // ============================================================================

  describe('Building Cost Reduction', () => {
    test('Construction attribute reduces building costs by 0.5% per point', () => {
      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // Base wood cost: 50
      // Construction reduction: 50 * 0.005 = 0.25 (25% reduction)
      // Final wood cost: 50 * 0.75 = 37.5
      expect(cost.wood).toBeCloseTo(37.5, 1);

      // Base stone cost: 30
      // Final stone cost: 30 * 0.75 = 22.5
      expect(cost.stone).toBeCloseTo(22.5, 1);

      // Base iron cost: 10
      // Final iron cost: 10 * 0.75 = 7.5
      expect(cost.iron).toBeCloseTo(7.5, 1);
    });

    test('Cost reduction is capped at 50%', () => {
      mockCharacter.attributes.construction = 150; // Would give 75% reduction

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // Should cap at 50% reduction (50% of original cost)
      expect(cost.wood).toBe(25); // 50 * 0.50
      expect(cost.stone).toBe(15); // 30 * 0.50
      expect(cost.iron).toBe(5); // 10 * 0.50
    });

    test('Zero construction provides base cost', () => {
      mockCharacter.attributes.construction = 0;

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      expect(cost.wood).toBe(mockBuilding.baseCost.wood);
      expect(cost.stone).toBe(mockBuilding.baseCost.stone);
      expect(cost.iron).toBe(mockBuilding.baseCost.iron);
    });

    test('Cost reduction applies to all resource types', () => {
      const complexBuilding = {
        ...mockBuilding,
        baseCost: {
          wood: 100,
          stone: 80,
          iron: 40,
          gold: 20,
          crystal: 5,
        },
      };

      const cost = BuildingIntegration.calculateBuildingCost(complexBuilding, mockCharacter);

      // All resources should have 25% reduction
      expect(cost.wood).toBeCloseTo(75, 1);
      expect(cost.stone).toBeCloseTo(60, 1);
      expect(cost.iron).toBeCloseTo(30, 1);
      expect(cost.gold).toBeCloseTo(15, 1);
      expect(cost.crystal).toBeCloseTo(3.75, 2);
    });
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: BUILD SPEED
  // ============================================================================

  describe('Build Speed', () => {
    test('Construction attribute increases build speed by 1% per point', () => {
      const buildTime = BuildingIntegration.calculateBuildTime(mockBuilding, mockCharacter);

      // Base time: 300s
      // Construction bonus: 50 * 0.01 = 0.50 (50% faster)
      // Speed multiplier: 1.5
      // Time: 300 / 1.5 = 200s
      expect(buildTime).toBe(200);
    });

    test('Build speed applies to construction duration', () => {
      const complexBuilding = {
        ...mockBuilding,
        baseBuildTime: 1800, // 30 minutes
      };

      const buildTime = BuildingIntegration.calculateBuildTime(complexBuilding, mockCharacter);

      // Base: 1800s
      // Speed: 1.5x
      // Time: 1800 / 1.5 = 1200s (20 minutes)
      expect(buildTime).toBe(1200);
    });

    test('Build speed is capped at 3.0x', () => {
      mockCharacter.attributes.construction = 300; // Would give 3x speed (300% bonus)

      const buildTime = BuildingIntegration.calculateBuildTime(mockBuilding, mockCharacter);

      // Max speed: 3.0x
      // Time: 300 / 3.0 = 100s
      expect(buildTime).toBe(100);
    });

    test('Build speed combines with NPC builder efficiency', () => {
      const npcEfficiency = 1.4; // From Leadership attribute

      const buildTime = BuildingIntegration.calculateBuildTimeWithNPC(
        mockBuilding,
        mockCharacter,
        npcEfficiency
      );

      // Base: 300s
      // Construction speed: 1.5x
      // NPC efficiency: 1.4x
      // Combined: 1.5 * 1.4 = 2.1x
      // Time: 300 / 2.1 = 142.86s
      expect(buildTime).toBeCloseTo(142.86, 1);
    });
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: BUILDING UPGRADES
  // ============================================================================

  describe('Building Upgrades', () => {
    test('Construction reduces upgrade costs', () => {
      const upgradeBuilding = {
        ...mockBuilding,
        upgradeLevel: 1,
        upgradeCost: {
          wood: 100,
          stone: 80,
          iron: 40,
        },
      };

      const cost = BuildingIntegration.calculateUpgradeCost(upgradeBuilding, mockCharacter);

      // 25% reduction from 50 construction
      expect(cost.wood).toBeCloseTo(75, 1);
      expect(cost.stone).toBeCloseTo(60, 1);
      expect(cost.iron).toBeCloseTo(30, 1);
    });

    test('Construction reduces upgrade time', () => {
      const upgradeTime = 600; // 10 minutes

      const actualTime = BuildingIntegration.calculateUpgradeTime(
        upgradeTime,
        mockCharacter
      );

      // Speed: 1.5x from 50 construction
      // Time: 600 / 1.5 = 400s
      expect(actualTime).toBe(400);
    });

    test('Higher construction unlocks building tiers earlier', () => {
      const tier3Building = {
        type: 'fortress',
        requiredConstructionLevel: 40,
      };

      const canBuild = BuildingIntegration.canBuildType(tier3Building, mockCharacter);

      expect(canBuild).toBe(true); // Has 50 construction, needs 40
    });

    test('Insufficient construction locks higher tiers', () => {
      mockCharacter.attributes.construction = 20;

      const tier3Building = {
        type: 'fortress',
        requiredConstructionLevel: 40,
      };

      const canBuild = BuildingIntegration.canBuildType(tier3Building, mockCharacter);

      expect(canBuild).toBe(false);
    });
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: BUILDING DURABILITY
  // ============================================================================

  describe('Building Durability', () => {
    test('Construction increases building max health by 2 per point', () => {
      const maxHealth = BuildingIntegration.calculateBuildingHealth(mockBuilding, mockCharacter);

      // Base health: 100
      // Construction bonus: 50 * 2 = 100
      // Total: 200
      expect(maxHealth).toBe(200);
    });

    test('Construction reduces decay rate', () => {
      const baseDecayRate = 0.1; // HP per hour

      const decayRate = BuildingIntegration.calculateDecayRate(baseDecayRate, mockCharacter);

      // Base: 0.1
      // Construction reduction: 50 * 0.003 = 0.15 (15% reduction)
      // Final: 0.1 * 0.85 = 0.085
      expect(decayRate).toBeCloseTo(0.085, 3);
    });

    test('Decay rate is capped at 50% reduction', () => {
      mockCharacter.attributes.construction = 200;
      const baseDecayRate = 0.1;

      const decayRate = BuildingIntegration.calculateDecayRate(baseDecayRate, mockCharacter);

      // Max reduction: 50%
      expect(decayRate).toBeCloseTo(0.05, 3);
    });

    test('Construction increases repair efficiency', () => {
      const repairAmount = 10; // HP restored per repair

      const actualRepair = BuildingIntegration.calculateRepairAmount(
        repairAmount,
        mockCharacter
      );

      // Base: 10
      // Construction bonus: 50 * 0.01 = 0.50 (50% more efficient)
      // Total: 10 * 1.5 = 15
      expect(actualRepair).toBe(15);
    });
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: BUILDING CAPACITY
  // ============================================================================

  describe('Building Capacity', () => {
    test('Construction increases storage building capacity by 1% per point', () => {
      const storageBuilding = {
        type: 'warehouse',
        baseCapacity: 1000,
      };

      const capacity = BuildingIntegration.calculateStorageCapacity(
        storageBuilding,
        mockCharacter
      );

      // Base: 1000
      // Construction bonus: 50 * 0.01 = 0.50 (50% increase)
      // Total: 1000 * 1.5 = 1500
      expect(capacity).toBe(1500);
    });

    test('Construction increases workshop production by 0.5% per point', () => {
      const workshopBuilding = {
        type: 'workshop',
        baseProduction: 10, // Items per hour
      };

      const production = BuildingIntegration.calculateProductionRate(
        workshopBuilding,
        mockCharacter
      );

      // Base: 10
      // Construction bonus: 50 * 0.005 = 0.25 (25% increase)
      // Total: 10 * 1.25 = 12.5
      expect(production).toBe(12.5);
    });

    test('Construction increases farm yield by 0.5% per point', () => {
      const farmBuilding = {
        type: 'farm',
        baseYield: 50, // Food per harvest
      };

      const yield_ = BuildingIntegration.calculateFarmYield(farmBuilding, mockCharacter);

      // Base: 50
      // Construction bonus: 50 * 0.005 = 0.25 (25% increase)
      // Total: 50 * 1.25 = 62.5
      expect(yield_).toBe(62.5);
    });
  });

  // ============================================================================
  // CONSTRUCTION ATTRIBUTE: SETTLEMENT LIMITS
  // ============================================================================

  describe('Settlement Building Limits', () => {
    test('Construction increases max building slots by 0.2 per point', () => {
      const maxSlots = BuildingIntegration.calculateMaxBuildingSlots(mockCharacter);

      // Base slots: 10
      // Construction bonus: 50 * 0.2 = 10
      // Total: 20
      expect(maxSlots).toBe(20);
    });

    test('Construction increases building quality tier', () => {
      const qualityTier = BuildingIntegration.calculateBuildingQuality(mockCharacter);

      // 0-20: Basic
      // 21-40: Standard
      // 41-60: Quality
      // 61-80: Superior
      // 81+: Masterwork
      expect(qualityTier).toBe('Quality');
    });

    test('Building quality affects stats', () => {
      const qualityBonus = BuildingIntegration.getQualityBonus('Quality');

      expect(qualityBonus).toEqual({
        healthMultiplier: 1.2,
        capacityMultiplier: 1.15,
        costMultiplier: 0.95,
        description: 'Well-crafted building with enhanced durability',
      });
    });
  });

  // ============================================================================
  // MULTI-ATTRIBUTE SYNERGIES
  // ============================================================================

  describe('Attribute Synergies', () => {
    test('Construction + Leadership synergy for settlement buildings', () => {
      const settlementBuilding = {
        type: 'town_hall',
        category: 'settlement',
        baseCost: { wood: 200, stone: 150, gold: 50 },
      };

      const cost = BuildingIntegration.calculateBuildingCostWithSynergy(
        settlementBuilding,
        mockCharacter
      );

      // Construction reduction: 25%
      // Leadership synergy: Additional 5% for settlement buildings
      // Total reduction: 30%
      // Wood: 200 * 0.70 = 140
      expect(cost.wood).toBeCloseTo(140, 1);
    });

    test('Construction + Exploration synergy for outposts', () => {
      const outpost = {
        type: 'outpost',
        category: 'exploration',
        baseBuildTime: 600,
      };

      const buildTime = BuildingIntegration.calculateBuildTimeWithSynergy(
        outpost,
        mockCharacter
      );

      // Construction speed: 1.5x
      // Exploration synergy: +10% for outposts
      // Total: 1.65x
      // Time: 600 / 1.65 = 363.6s
      expect(buildTime).toBeCloseTo(363.6, 0);
    });

    test('Construction + Endurance synergy for defensive structures', () => {
      const defensiveBuilding = {
        type: 'wall',
        category: 'defense',
        baseHealth: 500,
      };

      const health = BuildingIntegration.calculateBuildingHealthWithSynergy(
        defensiveBuilding,
        mockCharacter
      );

      // Base: 500
      // Construction: 50 * 2 = 100
      // Endurance synergy: 30 * 1 = 30 (additional HP for defense)
      // Total: 630
      expect(health).toBe(630);
    });
  });

  // ============================================================================
  // SKILL TREE INTEGRATION
  // ============================================================================

  describe('Skill Tree Bonuses', () => {
    test('Settlement skill tree further reduces building costs', () => {
      mockCharacter.skills.activeNodes = ['settlement_efficient_building']; // -10% cost

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // Construction: 25% reduction
      // Skill: 10% additional reduction
      // Total: 35% reduction
      // Wood: 50 * 0.65 = 32.5
      expect(cost.wood).toBeCloseTo(32.5, 1);
    });

    test('Settlement skill tree increases build speed', () => {
      mockCharacter.skills.activeNodes = ['settlement_rapid_construction']; // +20% speed

      const buildTime = BuildingIntegration.calculateBuildTime(mockBuilding, mockCharacter);

      // Construction: 1.5x speed
      // Skill: 1.2x speed
      // Total: 1.8x speed
      // Time: 300 / 1.8 = 166.67s
      expect(buildTime).toBeCloseTo(166.67, 1);
    });

    test('Multiple skill nodes stack', () => {
      mockCharacter.skills.activeNodes = [
        'settlement_efficient_building', // -10% cost
        'settlement_master_builder', // -15% cost, +10% speed
      ];

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // Construction: 25%
      // Skills: 10% + 15% = 25%
      // Total: 50% reduction (at cap)
      expect(cost.wood).toBe(25); // 50 * 0.50
    });
  });

  // ============================================================================
  // SOFT CAPS AND DIMINISHING RETURNS
  // ============================================================================

  describe('Soft Caps', () => {
    test('Construction has soft cap at 50 points for cost reduction', () => {
      mockCharacter.attributes.construction = 75;

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // First 50 points: 50 * 0.005 = 0.25 (25%)
      // Next 25 points: 25 * 0.0025 = 0.0625 (6.25%) - half effectiveness
      // Total reduction: 31.25%
      // Wood: 50 * 0.6875 = 34.375
      expect(cost.wood).toBeCloseTo(34.375, 2);
    });

    test('Construction has soft cap at 50 points for build speed', () => {
      mockCharacter.attributes.construction = 75;

      const buildTime = BuildingIntegration.calculateBuildTime(mockBuilding, mockCharacter);

      // First 50 points: 50 * 0.01 = 0.50 (50% speed)
      // Next 25 points: 25 * 0.005 = 0.125 (12.5%) - half effectiveness
      // Total: 62.5% speed bonus = 1.625x
      // Time: 300 / 1.625 = 184.6s
      expect(buildTime).toBeCloseTo(184.6, 0);
    });

    test('Soft cap documentation is accessible', () => {
      const softCapInfo = BuildingIntegration.getSoftCapInfo('construction');

      expect(softCapInfo).toEqual({
        attribute: 'construction',
        softCapThreshold: 50,
        fullEffectiveness: 1.0,
        reducedEffectiveness: 0.5,
        description: 'Construction gains are halved after 50 points',
      });
    });
  });

  // ============================================================================
  // INTEGRATION WITH EXISTING BUILDING SYSTEM
  // ============================================================================

  describe('Building System Integration', () => {
    test('Integrates with existing building placement', () => {
      const placementData = {
        type: 'house',
        position: { x: 10, y: 0, z: 10 },
      };

      const buildingData = BuildingIntegration.prepareBuildingData(
        placementData,
        mockCharacter
      );

      expect(buildingData).toHaveProperty('cost');
      expect(buildingData).toHaveProperty('buildTime');
      expect(buildingData).toHaveProperty('maxHealth');
      expect(buildingData).toHaveProperty('quality');
    });

    test('Works with existing building manager', () => {
      const canAfford = BuildingIntegration.canAffordBuilding(
        mockBuilding,
        mockSettlement.resources,
        mockCharacter
      );

      // Settlement has: wood: 1000, stone: 800, iron: 200
      // Building costs (with 25% reduction): wood: 37.5, stone: 22.5, iron: 7.5
      expect(canAfford).toBe(true);
    });

    test('Deducts correct resources when building', () => {
      const remainingResources = BuildingIntegration.deductBuildingCost(
        mockBuilding,
        mockSettlement.resources,
        mockCharacter
      );

      expect(remainingResources.wood).toBeCloseTo(962.5, 1); // 1000 - 37.5
      expect(remainingResources.stone).toBeCloseTo(777.5, 1); // 800 - 22.5
      expect(remainingResources.iron).toBeCloseTo(192.5, 1); // 200 - 7.5
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    test('Handles building with no cost', () => {
      const freeBuilding = {
        ...mockBuilding,
        baseCost: {},
      };

      const cost = BuildingIntegration.calculateBuildingCost(freeBuilding, mockCharacter);

      expect(cost).toEqual({});
    });

    test('Handles building with zero build time', () => {
      const instantBuilding = {
        ...mockBuilding,
        baseBuildTime: 0,
      };

      const buildTime = BuildingIntegration.calculateBuildTime(instantBuilding, mockCharacter);

      expect(buildTime).toBe(0);
    });

    test('Handles missing construction attribute', () => {
      const noConstructionChar = { ...mockCharacter };
      delete noConstructionChar.attributes.construction;

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, noConstructionChar);

      expect(cost).toEqual(mockBuilding.baseCost); // Use base cost
    });

    test('Handles extremely high construction values', () => {
      mockCharacter.attributes.construction = 10000;

      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);

      // Should still enforce 50% minimum cost
      expect(cost.wood).toBeGreaterThanOrEqual(25); // At least 50% of base
    });

    test('Handles negative build times (should return positive)', () => {
      mockCharacter.attributes.construction = 10000; // Very high speed

      const buildTime = BuildingIntegration.calculateBuildTime(mockBuilding, mockCharacter);

      expect(buildTime).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BACKWARD COMPATIBILITY
  // ============================================================================

  describe('Backward Compatibility', () => {
    test('Works with buildings created before character system', () => {
      const legacyBuilding = {
        id: 'legacy_001',
        type: 'house',
        cost: { wood: 50, stone: 30 },
      };

      const cost = BuildingIntegration.calculateBuildingCost(legacyBuilding, mockCharacter);

      expect(cost.wood).toBeLessThan(50); // Should apply construction discount
    });

    test('Preserves existing building data structure', () => {
      const updatedBuilding = BuildingIntegration.applyConstructionBonuses(
        mockBuilding,
        mockCharacter
      );

      // Should maintain original properties
      expect(updatedBuilding.id).toBe(mockBuilding.id);
      expect(updatedBuilding.type).toBe(mockBuilding.type);
      expect(updatedBuilding.level).toBe(mockBuilding.level);
    });

    test('Gracefully handles missing character object', () => {
      const cost = BuildingIntegration.calculateBuildingCost(mockBuilding, null);

      expect(cost).toEqual(mockBuilding.baseCost); // Use base cost
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    test('Cost calculation completes quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        BuildingIntegration.calculateBuildingCost(mockBuilding, mockCharacter);
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(0.5); // < 0.5ms per calculation
    });

    test('Can process many buildings efficiently', () => {
      const manyBuildings = Array.from({ length: 100 }, (_, i) => ({
        ...mockBuilding,
        id: `building_${i}`,
      }));

      const start = performance.now();

      manyBuildings.forEach((building) => {
        BuildingIntegration.calculateBuildingCost(building, mockCharacter);
        BuildingIntegration.calculateBuildTime(building, mockCharacter);
        BuildingIntegration.calculateBuildingHealth(building, mockCharacter);
      });

      const end = performance.now();

      expect(end - start).toBeLessThan(20); // < 20ms for 100 buildings
    });
  });
});
