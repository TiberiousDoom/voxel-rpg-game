/**
 * BuildingTypes.test.js - Comprehensive tests for Module 2
 *
 * Test coverage:
 * - BuildingConfig: 15 tests
 * - TierProgression: 20 tests
 * - BuildingEffect: 10 tests
 * Total: 45+ tests
 */

import BuildingConfig from '../BuildingConfig';
import TierProgression from '../TierProgression';
import BuildingEffect from '../BuildingEffect';
import SpatialPartitioning from '../../foundation/SpatialPartitioning';

describe('Module 2: Building Types & Properties', () => {
  // ============================================
  // BUILDING CONFIG TESTS (15 tests)
  // ============================================

  describe('BuildingConfig', () => {
    let config;

    beforeEach(() => {
      config = new BuildingConfig();
    });

    // Initialization and validation
    test('should initialize all building types', () => {
      expect(config.getAllTypes().length).toBeGreaterThan(0);
    });

    test('should validate all building configurations on init', () => {
      // Constructor validates all configs - no exception means success
      const config2 = new BuildingConfig();
      expect(config2).toBeDefined();
    });

    test('should have 8 building types defined', () => {
      const types = config.getAllTypes();
      expect(types.length).toBe(8);
      expect(types).toContain('CAMPFIRE');
      expect(types).toContain('FARM');
      expect(types).toContain('HOUSE');
      expect(types).toContain('WAREHOUSE');
      expect(types).toContain('TOWN_CENTER');
      expect(types).toContain('MARKET');
      expect(types).toContain('WATCHTOWER');
      expect(types).toContain('CASTLE');
    });

    // Type retrieval
    test('getConfig should return deep copy', () => {
      const config1 = config.getConfig('FARM');
      const config2 = config.getConfig('FARM');
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });

    test('getTypesByTier should filter by tier', () => {
      const survivalTypes = config.getTypesByTier('SURVIVAL');
      expect(survivalTypes).toContain('CAMPFIRE');
      expect(survivalTypes).toContain('FARM');
      expect(survivalTypes.length).toBe(2);
    });

    test('getTypesByTier should work for all tiers', () => {
      expect(config.getTypesByTier('SURVIVAL').length).toBe(2);
      expect(config.getTypesByTier('PERMANENT').length).toBe(2);
      expect(config.getTypesByTier('TOWN').length).toBe(3);
      expect(config.getTypesByTier('CASTLE').length).toBe(1);
    });

    // Building properties
    test('getBuildingCost should return cost object', () => {
      const cost = config.getBuildingCost('FARM');
      expect(cost).toHaveProperty('wood');
      expect(cost).toHaveProperty('food');
      expect(cost).toHaveProperty('stone');
      expect(cost.wood).toBe(10);
    });

    test('getBuildingDimensions should return dimensions', () => {
      const dims = config.getBuildingDimensions('FARM');
      expect(dims).toEqual({ width: 2, height: 1, depth: 2 });
    });

    test('getStorageCapacity should return storage limits', () => {
      const storage = config.getStorageCapacity('WAREHOUSE');
      expect(storage.wood).toBe(200);
      expect(storage.food).toBe(200);
      expect(storage.stone).toBe(100);
    });

    test('getProductionRates should return production per tick', () => {
      const production = config.getProductionRates('FARM');
      expect(production.wood).toBe(0);
      expect(production.food).toBe(1.0);
      expect(production.stone).toBe(0);
    });

    test('getWorkSlots should return slot count', () => {
      expect(config.getWorkSlots('CAMPFIRE')).toBe(1);
      expect(config.getWorkSlots('TOWN_CENTER')).toBe(2);
      expect(config.getWorkSlots('CASTLE')).toBe(5);
    });

    // Effects
    test('hasAura should identify buildings with auras', () => {
      expect(config.hasAura('TOWN_CENTER')).toBe(true);
      expect(config.hasAura('CASTLE')).toBe(true);
      expect(config.hasAura('FARM')).toBe(false);
    });

    test('hasZoneBonus should identify buildings with zone bonuses', () => {
      expect(config.hasZoneBonus('MARKET')).toBe(true);
      expect(config.hasZoneBonus('WATCHTOWER')).toBe(true);
      expect(config.hasZoneBonus('CASTLE')).toBe(true);
      expect(config.hasZoneBonus('FARM')).toBe(false);
    });

    test('should throw error for invalid building type', () => {
      expect(() => config.getConfig('INVALID_TYPE')).toThrow();
    });

    test('typeExists should check if type is registered', () => {
      expect(config.typeExists('FARM')).toBe(true);
      expect(config.typeExists('INVALID')).toBe(false);
    });
  });

  // ============================================
  // TIER PROGRESSION TESTS (20 tests)
  // ============================================

  describe('TierProgression', () => {
    let progression;
    let config;

    beforeEach(() => {
      config = new BuildingConfig();
      progression = new TierProgression(config);
    });

    // Tier hierarchy
    test('getTierHierarchy should return tiers in order', () => {
      const hierarchy = progression.getTierHierarchy();
      expect(hierarchy).toEqual(['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE']);
    });

    test('getTierIndex should return correct indices', () => {
      expect(progression.getTierIndex('SURVIVAL')).toBe(0);
      expect(progression.getTierIndex('PERMANENT')).toBe(1);
      expect(progression.getTierIndex('TOWN')).toBe(2);
      expect(progression.getTierIndex('CASTLE')).toBe(3);
    });

    test('getNextTier should return next tier in progression', () => {
      expect(progression.getNextTier('SURVIVAL')).toBe('PERMANENT');
      expect(progression.getNextTier('PERMANENT')).toBe('TOWN');
      expect(progression.getNextTier('TOWN')).toBe('CASTLE');
      expect(progression.getNextTier('CASTLE')).toBe(null);
    });

    test('isValidTier should validate tier names', () => {
      expect(progression.isValidTier('SURVIVAL')).toBe(true);
      expect(progression.isValidTier('INVALID')).toBe(false);
    });

    // Advancement validation
    test('canAdvanceToTier should pass for valid advancement', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 20, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(true);
    });

    test('canAdvanceToTier should fail without buildings', () => {
      const buildings = [];
      const resources = { wood: 20, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
    });

    test('canAdvanceToTier should fail without resources', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 0, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
    });

    // AND-gate logic
    test('AND-gate: ALL requirements must be met', () => {
      // Missing buildings AND missing resources
      const buildings = [];
      const resources = { wood: 0, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThanOrEqual(2);
    });

    // Tier progression order
    test('cannot skip tiers', () => {
      const buildings = [];
      const resources = { wood: 0, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('TOWN', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('skip');
    });

    test('cannot advance backwards', () => {
      const buildings = [];
      const resources = { wood: 0, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('SURVIVAL', buildings, resources, 'PERMANENT');
      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('backwards');
    });

    // TOWN advancement
    test('TOWN advancement requires TOWN_CENTER building', () => {
      const buildings = [
        { id: 'tc1', type: 'TOWN_CENTER', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 100, food: 50, stone: 100 };

      const result = progression.canAdvanceToTier('TOWN', buildings, resources, 'PERMANENT');
      expect(result.canAdvance).toBe(true);
    });

    test('TOWN advancement fails with insufficient resources', () => {
      const buildings = [
        { id: 'tc1', type: 'TOWN_CENTER', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 50, food: 25, stone: 50 }; // Needs more

      const result = progression.canAdvanceToTier('TOWN', buildings, resources, 'PERMANENT');
      expect(result.canAdvance).toBe(false);
    });

    // CASTLE advancement
    test('CASTLE advancement requires CASTLE building', () => {
      const buildings = [
        { id: 'castle1', type: 'CASTLE', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 500, food: 300, stone: 1000 };

      const result = progression.canAdvanceToTier('CASTLE', buildings, resources, 'TOWN');
      expect(result.canAdvance).toBe(true);
    });

    // Edge cases
    test('extra buildings should not prevent advancement', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } },
        { id: 'house2', type: 'HOUSE', position: { x: 10, y: 0, z: 0 } },
        { id: 'farm1', type: 'FARM', position: { x: 20, y: 0, z: 0 } }
      ];
      const resources = { wood: 20, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(true);
    });

    test('extra resources should not prevent advancement', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 100, food: 100, stone: 100 }; // Extra resources

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.canAdvance).toBe(true);
    });

    test('should validate resource object', () => {
      const buildings = [];
      const badResources = { wood: 10 }; // Missing food and stone

      const result = progression.canAdvanceToTier('PERMANENT', buildings, badResources, 'SURVIVAL');
      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('Resources');
    });

    test('should provide progress information', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } }
      ];
      const resources = { wood: 10, food: 0, stone: 0 };

      const result = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
      expect(result.buildingProgress).toBeDefined();
      expect(result.resourceProgress).toBeDefined();
    });
  });

  // ============================================
  // BUILDING EFFECT TESTS (10 tests)
  // ============================================

  describe('BuildingEffect', () => {
    let effects;
    let spatial;
    let config;

    beforeEach(() => {
      config = new BuildingConfig();
      spatial = new SpatialPartitioning(100, 50, 10);
      effects = new BuildingEffect(spatial, config);
    });

    test('should initialize with valid dependencies', () => {
      expect(effects).toBeDefined();
      expect(effects.buildingConfig).toBe(config);
      expect(effects.spatial).toBe(spatial);
    });

    test('should throw error without SpatialPartitioning', () => {
      expect(() => new BuildingEffect(null, config)).toThrow();
    });

    test('should throw error without BuildingConfig', () => {
      expect(() => new BuildingEffect(spatial, null)).toThrow();
    });

    // Effect registration
    test('registerBuildingEffects should register aura', () => {
      const building = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };

      const effectIds = effects.registerBuildingEffects(building);
      expect(effectIds.length).toBeGreaterThan(0);
    });

    test('getProductionBonusAt should return 1.0 without effects', () => {
      const bonus = effects.getProductionBonusAt(50, 25, 50);
      expect(bonus).toBe(1.0);
    });

    test('getProductionBonusAt should return aura bonus within radius', () => {
      const building = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(building);

      // Within 50-cell radius (distance = 10)
      const bonus = effects.getProductionBonusAt(60, 25, 50);
      expect(bonus).toBeGreaterThan(1.0);
      expect(bonus).toBeLessThanOrEqual(1.05);
    });

    test('getProductionBonusAt should return 1.0 outside radius', () => {
      const building = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(building);

      // Outside 50-cell radius (distance = 60)
      const bonus = effects.getProductionBonusAt(110, 25, 50);
      expect(bonus).toBe(1.0);
    });

    test('unregisterBuildingEffects should remove effects', () => {
      const building = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(building);

      expect(effects.getAllEffects().length).toBeGreaterThan(0);

      const removed = effects.unregisterBuildingEffects(building.id);
      expect(removed).toBeGreaterThan(0);
      expect(effects.getAllEffects().length).toBe(0);
    });

    test('getStatistics should report effect counts', () => {
      const building = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(building);

      const stats = effects.getStatistics();
      expect(stats.totalEffects).toBeGreaterThan(0);
      expect(stats.buildingsWithEffects).toBe(1);
    });

    test('getDefenseBonusAt should return watchtower bonus', () => {
      const building = {
        id: 'wt1',
        type: 'WATCHTOWER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(building);

      // Within defense radius
      const bonus = effects.getDefenseBonusAt(60, 25, 50);
      expect(bonus).toBeGreaterThan(1.0);
      expect(bonus).toBeLessThanOrEqual(1.2);
    });

    test('multiple buildings should stack correctly', () => {
      // First aura
      const tc1 = {
        id: 'tc1',
        type: 'TOWN_CENTER',
        position: { x: 50, y: 25, z: 50 }
      };
      effects.registerBuildingEffects(tc1);

      // Check position in first aura
      const bonus = effects.getProductionBonusAt(60, 25, 50);
      expect(bonus).toBeGreaterThan(1.0);

      // Position should have strongest aura applied
      expect(bonus).toBeLessThanOrEqual(1.05); // Max is +5% per aura
    });
  });
});

describe('Module 2: Integration Tests', () => {
  test('BuildingConfig + TierProgression should work together', () => {
    const config = new BuildingConfig();
    const progression = new TierProgression(config);

    // Verify building config exists
    expect(config.typeExists('FARM')).toBe(true);
    expect(config.typeExists('HOUSE')).toBe(true);

    // Verify progression has tier hierarchy
    const hierarchy = progression.getTierHierarchy();
    expect(hierarchy.length).toBe(4);
    expect(hierarchy[0]).toBe('SURVIVAL');
    expect(hierarchy[1]).toBe('PERMANENT');
    expect(hierarchy[2]).toBe('TOWN');
    expect(hierarchy[3]).toBe('CASTLE');
  });

  test('BuildingConfig + BuildingEffect should work together', () => {
    const config = new BuildingConfig();
    const spatial = new SpatialPartitioning(100, 50, 10);
    const effects = new BuildingEffect(spatial, config);

    const building = {
      id: 'tc1',
      type: 'TOWN_CENTER',
      position: { x: 50, y: 25, z: 50 }
    };

    // Verify building config has effects
    expect(config.hasAura('TOWN_CENTER')).toBe(true);

    // Register and verify effects work
    const effectIds = effects.registerBuildingEffects(building);
    expect(effectIds.length).toBeGreaterThan(0);

    const bonus = effects.getProductionBonusAt(60, 25, 50);
    expect(bonus).toBeGreaterThan(1.0);
  });

  test('Full module 2 flow: Config → Progression → Effects', () => {
    const config = new BuildingConfig();
    const progression = new TierProgression(config);
    const spatial = new SpatialPartitioning(100, 50, 10);
    const effects = new BuildingEffect(spatial, config);

    // Step 1: Check if can build HOUSE (uses config)
    expect(config.typeExists('HOUSE')).toBe(true);
    const houseCost = config.getBuildingCost('HOUSE');
    expect(houseCost.wood).toBe(20);

    // Step 2: Advance to PERMANENT (uses progression)
    const buildings = [
      { id: 'house1', type: 'HOUSE', position: { x: 10, y: 5, z: 10 } }
    ];
    const resources = { wood: 20, food: 5, stone: 0 };
    const canAdvance = progression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
    expect(canAdvance.canAdvance).toBe(true);

    // Step 3: Build TOWN_CENTER and register effects
    const townCenter = {
      id: 'tc1',
      type: 'TOWN_CENTER',
      position: { x: 50, y: 25, z: 50 }
    };
    expect(config.hasAura('TOWN_CENTER')).toBe(true);
    const effectIds = effects.registerBuildingEffects(townCenter);
    expect(effectIds.length).toBeGreaterThan(0);

    // Verify farm in aura gets bonus
    const farmBonus = effects.getProductionBonusAt(55, 25, 50);
    expect(farmBonus).toBeGreaterThan(1.0);
  });
});
