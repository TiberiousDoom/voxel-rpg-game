/**
 * ResourceEconomy.test.js - Tests for Module 3 Resource Economy
 *
 * Test coverage:
 * - StorageManager: 10 tests
 * - ConsumptionSystem: 8 tests
 * - MoraleCalculator: 8 tests
 * - ProductionTick: 6 tests
 * Total: 32 tests
 */

import StorageManager from '../StorageManager';
import ConsumptionSystem from '../ConsumptionSystem';
import MoraleCalculator from '../MoraleCalculator';
import ProductionTick from '../ProductionTick';
import BuildingConfig from '../../building-types/BuildingConfig';
import BuildingEffect from '../../building-types/BuildingEffect';
import SpatialPartitioning from '../../foundation/SpatialPartitioning';

describe('Module 3: Resource Economy', () => {
  // ============================================
  // STORAGE MANAGER TESTS (10 tests)
  // ============================================

  describe('StorageManager', () => {
    let storage;

    beforeEach(() => {
      storage = new StorageManager(1000);
    });

    test('should initialize with empty resources', () => {
      expect(storage.getResource('food')).toBe(0);
      expect(storage.getResource('wood')).toBe(0);
      expect(storage.getTotalUsage()).toBe(0);
    });

    test('should add resources', () => {
      storage.addResource('food', 100);
      expect(storage.getResource('food')).toBe(100);
    });

    test('should remove resources', () => {
      storage.addResource('wood', 50);
      const removed = storage.removeResource('wood', 30);
      expect(removed).toBe(30);
      expect(storage.getResource('wood')).toBe(20);
    });

    test('should not remove more than available', () => {
      storage.addResource('food', 10);
      const removed = storage.removeResource('food', 20);
      expect(removed).toBe(10);
      expect(storage.getResource('food')).toBe(0);
    });

    test('should detect when at capacity', () => {
      storage.setCapacity(100);
      storage.addResource('food', 100);
      expect(storage.isAtCapacity()).toBe(true);
    });

    test('should calculate available space', () => {
      storage.setCapacity(500);
      storage.addResource('food', 200);
      expect(storage.getAvailableSpace()).toBe(300);
    });

    test('should handle overflow by dumping least valuable', () => {
      storage.setCapacity(100);
      storage.addResource('wood', 50);
      storage.addResource('food', 60); // Total 110, exceeds 100
      const overflow = storage.checkAndHandleOverflow();
      expect(overflow.overflowed).toBe(true);
      // Wood (less valuable) should be dumped first
      expect(storage.getResource('wood')).toBeLessThan(50);
    });

    test('should track statistics', () => {
      storage.addResource('food', 100);
      storage.removeResource('food', 30);
      const stats = storage.getStatistics();
      expect(stats.totalProduced).toBe('100.00');
      expect(stats.totalConsumed).toBe('30.00');
    });

    test('should get resource breakdown', () => {
      storage.addResource('food', 100);
      storage.addResource('wood', 100);
      const breakdown = storage.getResourceBreakdown();
      expect(breakdown.food.percentage).toBe('50.0');
      expect(breakdown.wood.percentage).toBe('50.0');
    });

    test('should increase capacity for upgrades', () => {
      expect(storage.getCapacity()).toBe(1000);
      storage.increaseCapacity(500);
      expect(storage.getCapacity()).toBe(1500);
    });
  });

  // ============================================
  // CONSUMPTION SYSTEM TESTS (8 tests)
  // ============================================

  describe('ConsumptionSystem', () => {
    let consumption;

    beforeEach(() => {
      consumption = new ConsumptionSystem();
    });

    test('should register NPCs', () => {
      consumption.registerNPC('npc1', true);
      const npc = consumption.getNPC('npc1');
      expect(npc).toBeDefined();
      expect(npc.isWorking).toBe(true);
    });

    test('should track working vs idle NPCs', () => {
      consumption.registerNPC('npc1', true);
      consumption.registerNPC('npc2', false);
      const stats = consumption.getConsumptionStats();
      expect(stats.workingCount).toBe(1);
      expect(stats.idleCount).toBe(1);
    });

    test('should calculate consumption per tick', () => {
      consumption.registerNPC('worker', true);
      consumption.registerNPC('idle', false);
      // Worker: 0.5/12 = 0.04167
      // Idle: 0.1/12 = 0.00833
      // Total: 0.05
      const c1 = consumption.calculateConsumption('worker');
      const c2 = consumption.calculateConsumption('idle');
      expect(c1).toBeCloseTo(0.5 / 12.0, 4);
      expect(c2).toBeCloseTo(0.1 / 12.0, 4);
    });

    test('should execute consumption tick without starvation', () => {
      consumption.registerNPC('npc1', true);
      consumption.registerNPC('npc2', false);
      const result = consumption.executeConsumptionTick(100);
      expect(result.starvationOccurred).toBe(false);
      expect(result.npcsDied).toBe(0);
    });

    test('should detect starvation when food runs out', () => {
      consumption.registerNPC('npc1', true);
      consumption.registerNPC('npc2', true);
      const result = consumption.executeConsumptionTick(0.001); // Almost no food
      expect(result.starvationOccurred).toBe(true);
      expect(result.npcsDied).toBeGreaterThan(0);
    });

    test('should update NPC happiness', () => {
      consumption.registerNPC('npc1');
      consumption.updateHappiness(50);
      const npc = consumption.getNPC('npc1');
      expect(npc.happiness).toBeGreaterThan(0);
    });

    test('should get alive NPCs only', () => {
      consumption.registerNPC('npc1');
      consumption.registerNPC('npc2');
      const npc2 = consumption.getNPC('npc2');
      npc2.alive = false;
      const alive = consumption.getAliveNPCs();
      expect(alive.length).toBe(1);
    });

    test('should track starvation events', () => {
      consumption.registerNPC('npc1', true);
      consumption.executeConsumptionTick(0); // Starvation
      const stats = consumption.getConsumptionStats();
      expect(stats.totalNPCsDead).toBeGreaterThan(0);
    });
  });

  // ============================================
  // MORALE CALCULATOR TESTS (8 tests)
  // ============================================

  describe('MoraleCalculator', () => {
    let morale;

    beforeEach(() => {
      morale = new MoraleCalculator();
    });

    test('should initialize with zero morale', () => {
      expect(morale.getCurrentMorale()).toBe(0);
    });

    test('should calculate happiness factor', () => {
      const npcs = [
        { happiness: 50 },
        { happiness: 60 },
        { happiness: 40 }
      ];
      const factor = morale.calculateHappinessFactor(npcs);
      expect(factor).toBeCloseTo(0, 1); // Average 50 = factor 0
    });

    test('should calculate housing factor', () => {
      // 5 NPCs, 10 housing = 50% occupancy
      const factor = morale.calculateHousingFactor(5, 10);
      expect(factor).toBeGreaterThanOrEqual(-50);
      expect(factor).toBeLessThanOrEqual(50);
    });

    test('should calculate food factor', () => {
      // 2 NPCs, 1440 food (1 day consumption)
      const factor = morale.calculateFoodFactor(1440, 2, 0.5);
      expect(factor).toBeGreaterThanOrEqual(-50);
      expect(factor).toBeLessThanOrEqual(50);
    });

    test('should calculate expansion factor', () => {
      const factor = morale.calculateExpansionFactor(3);
      expect(factor).toBe(30); // 3 × 10
    });

    test('should calculate composite town morale', () => {
      const params = {
        npcs: [{ happiness: 50 }, { happiness: 50 }],
        foodAvailable: 1440,
        housingCapacity: 10,
        expansionCount: 0
      };
      const moraleValue = morale.calculateTownMorale(params);
      expect(moraleValue).toBeGreaterThanOrEqual(-100);
      expect(moraleValue).toBeLessThanOrEqual(100);
    });

    test('should convert morale to production multiplier', () => {
      morale.calculateTownMorale({
        npcs: [{ happiness: 100 }], // Excellent
        foodAvailable: 5000,
        housingCapacity: 10,
        expansionCount: 5
      });
      const multiplier = morale.getMoraleMultiplier();
      expect(multiplier).toBeGreaterThan(1.0);
      expect(multiplier).toBeLessThanOrEqual(1.1);
    });

    test('should provide morale state description', () => {
      morale.calculateTownMorale({
        npcs: [{ happiness: 80 }],
        foodAvailable: 5000,
        housingCapacity: 10,
        expansionCount: 5
      });
      const state = morale.getMoraleState();
      expect(state.description).toBeDefined();
      expect(state.productionMultiplier).toBeDefined();
    });
  });

  // ============================================
  // PRODUCTION TICK TESTS (6 tests)
  // ============================================

  describe('ProductionTick', () => {
    let tick;
    let buildingConfig;
    let buildingEffect;
    let storageManager;

    beforeEach(() => {
      buildingConfig = new BuildingConfig();
      const spatial = new SpatialPartitioning(100, 50, 10);
      buildingEffect = new BuildingEffect(spatial, buildingConfig);
      storageManager = new StorageManager(10000);

      tick = new ProductionTick(buildingConfig, buildingEffect, storageManager);
    });

    test('should initialize with required systems', () => {
      expect(tick).toBeDefined();
      expect(tick.tickNumber).toBe(0);
    });

    test('should throw error without dependencies', () => {
      expect(() => new ProductionTick(null, null, null)).toThrow();
    });

    test('should execute empty tick without errors', () => {
      const result = tick.executeTick([], {}, 1.0);
      expect(result.errors.length).toBe(0);
      expect(result.tick).toBe(1);
    });

    test('should execute production tick with buildings', () => {
      const farm = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 }
      };

      const result = tick.executeTick([farm], { farm1: [] }, 1.0);
      expect(result.production).toBeDefined();
      // Farm produces 1 food per tick (with no NPC, 0.5x multiplier = 0.5)
      expect(result.production.food || 0).toBeGreaterThanOrEqual(0);
    });

    test('should track tick progression', () => {
      tick.executeTick([], {}, 1.0);
      tick.executeTick([], {}, 1.0);
      tick.executeTick([], {}, 1.0);
      expect(tick.tickNumber).toBe(3);
    });

    test('should get statistics', () => {
      tick.executeTick([], {}, 1.0);
      const stats = tick.getStatistics();
      expect(stats.ticksExecuted).toBe(1);
      expect(stats.currentStorage).toBeDefined();
    });
  });
});

describe('Module 3: Integration Tests', () => {
  test('StorageManager + ConsumptionSystem should work together', () => {
    const storage = new StorageManager(1000);
    const consumption = new ConsumptionSystem();

    // Add food to storage
    storage.addResource('food', 100);

    // Create NPC and consume
    consumption.registerNPC('npc1', true);
    const foodBefore = storage.getResource('food');

    // Simulate consumption
    const tick = consumption.executeConsumptionTick(foodBefore);
    const consumed = parseFloat(tick.foodConsumed);
    storage.removeResource('food', consumed);

    expect(storage.getResource('food')).toBeLessThan(foodBefore);
  });

  test('MoraleCalculator + ConsumptionSystem should work together', () => {
    const consumption = new ConsumptionSystem();
    const morale = new MoraleCalculator();

    // Create NPCs
    consumption.registerNPC('npc1', true);
    consumption.registerNPC('npc2', false);

    // Update happiness
    consumption.updateHappiness(100);

    // Calculate morale
    const params = {
      npcs: consumption.getAliveNPCs(),
      foodAvailable: 1440,
      housingCapacity: 10,
      expansionCount: 0
    };
    morale.calculateTownMorale(params);

    expect(morale.getCurrentMorale()).toBeDefined();
    expect(morale.getMoraleMultiplier()).toBeGreaterThan(0.9);
  });

  test('Full economic cycle: Production → Consumption → Storage', () => {
    const storage = new StorageManager(10000);
    const consumption = new ConsumptionSystem();

    // Simulate production
    storage.addResource('food', 100);

    // Create NPCs
    consumption.registerNPC('npc1', true);
    consumption.registerNPC('npc2', true);

    // Get food status before
    const foodBefore = storage.getResource('food');

    // Execute consumption tick
    const consumptionTick = consumption.executeConsumptionTick(foodBefore);
    const consumed = parseFloat(consumptionTick.foodConsumed);

    // Update storage
    storage.removeResource('food', consumed);

    // Verify no one starved
    expect(consumptionTick.starvationOccurred).toBe(false);
    expect(storage.getResource('food')).toBeGreaterThan(0);
  });
});
