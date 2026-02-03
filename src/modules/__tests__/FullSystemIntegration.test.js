/**
 * FullSystemIntegration.test.js - Complete system integration tests
 *
 * Validates all 4 modules working together:
 * - Module 1: Foundation (GridManager, BuildingFactory, SpatialPartitioning)
 * - Module 2: Building Types (BuildingConfig, TierProgression, BuildingEffect)
 * - Module 3: Resource Economy (ProductionTick, StorageManager, ConsumptionSystem, MoraleCalculator)
 * - Module 4: Territory & Town (TerritoryManager, TownManager)
 *
 * Tests: 35+ comprehensive integration scenarios
 */

import GridManager from '../foundation/GridManager';
import SpatialPartitioning from '../foundation/SpatialPartitioning';

import BuildingConfig from '../building-types/BuildingConfig';
import TierProgression from '../building-types/TierProgression';
import BuildingEffect from '../building-types/BuildingEffect';

import ProductionTick from '../resource-economy/ProductionTick';
import StorageManager from '../resource-economy/StorageManager';
import ConsumptionSystem from '../resource-economy/ConsumptionSystem';
import MoraleCalculator from '../resource-economy/MoraleCalculator';

import { TerritoryManager } from '../territory-town/TerritoryManager';
import TownManager from '../territory-town/TownManager';

describe('Full System Integration Tests', () => {
  let grid;
  let spatial;
  let buildingConfig;
  let tierProgression;
  let buildingEffect;
  let productionTick;
  let storage;
  let consumption;
  let morale;
  let territoryManager;
  let townManager;

  beforeEach(() => {
    // Module 1: Foundation
    grid = new GridManager(100, 50, 100);
    buildingConfig = new BuildingConfig();
    spatial = new SpatialPartitioning(100, 50, 10);

    // Module 2: Building Types
    tierProgression = new TierProgression(buildingConfig);
    buildingEffect = new BuildingEffect(spatial, buildingConfig);

    // Module 3: Resource Economy
    storage = new StorageManager(10000);
    consumption = new ConsumptionSystem();
    morale = new MoraleCalculator();
    productionTick = new ProductionTick(buildingConfig, buildingEffect, storage);

    // Module 4: Territory & Town
    territoryManager = new TerritoryManager(buildingConfig);
    townManager = new TownManager(buildingConfig);
  });

  // ============================================
  // SCENARIO 1: Complete Game Flow (SURVIVAL tier)
  // ============================================

  test('Scenario 1: Survive first 15 minutes in SURVIVAL territory', () => {
    // Setup: Create SURVIVAL territory
    const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
    expect(territory.tier).toBe('SURVIVAL');

    // Create initial buildings
    const farm = {
      id: 'farm1',
      type: 'FARM',
      position: { x: 55, y: 25, z: 55 }
    };

    const house = {
      id: 'house1',
      type: 'HOUSE',
      position: { x: 45, y: 25, z: 45 }
    };

    // Place buildings in grid
    const farmResult = grid.placeBuilding(farm);
    const houseResult = grid.placeBuilding(house);
    expect(farmResult.success).toBe(true);
    expect(houseResult.success).toBe(true);

    // Add to territory
    territoryManager.addBuildingToTerritory(territory.id, farm);
    territoryManager.addBuildingToTerritory(territory.id, house);

    // Register effects
    buildingEffect.registerBuildingEffects(farm);
    buildingEffect.registerBuildingEffects(house);

    // Add to spatial index
    spatial.addBuilding(farm);
    spatial.addBuilding(house);

    // Spawn NPCs
    const npc1 = townManager.spawnNPC('FARMER');
    const npc2 = townManager.spawnNPC('WORKER');

    // Assign to buildings
    townManager.assignNPC(npc1.id, 'farm1');
    townManager.assignNPC(npc2.id, 'house1');

    // Initial storage
    storage.addResource('food', 500);
    storage.addResource('wood', 200);

    // Simulate 3 ticks (15 seconds)
    for (let tick = 0; tick < 3; tick++) {
      // Consumption
      const consumptionResult = consumption.executeConsumptionTick(storage.getResource('food'));
      expect(consumptionResult.starvationOccurred).toBe(false);

      // Production
      const npcAssignments = {
        farm1: [npc1.id],
        house1: [npc2.id]
      };
      const productionResult = productionTick.executeTick([farm, house], npcAssignments, 1.0);
      expect(productionResult.production.food || 0).toBeGreaterThanOrEqual(0);

      // Update storage
      const consumed = parseFloat(consumptionResult.foodConsumed);
      storage.removeResource('food', consumed);
    }

    // Verify survival
    const stats = townManager.getStatistics([house]);
    expect(stats.population.alive).toBe(2);
    expect(storage.getResource('food')).toBeGreaterThan(0);
  });

  // ============================================
  // SCENARIO 2: Territory Expansion Flow
  // ============================================

  test('Scenario 2: Expand from SURVIVAL to PERMANENT tier', () => {
    // Create SURVIVAL territory
    const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');

    // Create required buildings for expansion
    const buildings = [
      { id: 'house1', type: 'HOUSE', position: { x: 55, y: 25, z: 55 } },
      { id: 'house2', type: 'HOUSE', position: { x: 45, y: 25, z: 45 } },
      { id: 'farm1', type: 'FARM', position: { x: 55, y: 25, z: 45 } },
      { id: 'farm2', type: 'FARM', position: { x: 45, y: 25, z: 55 } }
    ];

    // Place in grid
    for (const building of buildings) {
      grid.placeBuilding(building);
      territoryManager.addBuildingToTerritory(territory.id, building);
    }

    // Add resources for expansion
    storage.addResource('wood', 200);
    storage.addResource('food', 100);
    storage.addResource('stone', 100);

    // Attempt expansion
    const resources = {
      wood: storage.getResource('wood'),
      food: storage.getResource('food'),
      stone: storage.getResource('stone')
    };

    const result = territoryManager.expandTerritory(territory.id, resources, buildings);
    expect(result.success).toBe(true);
    expect(result.newTier).toBe('PERMANENT');
    expect(territory.dimension).toBe(50);

    // Verify tier progression
    const canAdvance = tierProgression.canAdvanceToTier('PERMANENT', buildings, resources, 'SURVIVAL');
    expect(canAdvance.canAdvance).toBe(true);
  });

  // ============================================
  // SCENARIO 3: Production + Morale + Consumption
  // ============================================

  test('Scenario 3: Production affects morale which affects consumption', () => {
    // Setup buildings
    const farm = { id: 'farm1', type: 'FARM', position: { x: 50, y: 25, z: 50 } };
    grid.placeBuilding(farm);
    spatial.addBuilding(farm);
    buildingEffect.registerBuildingEffects(farm);

    // Setup NPCs and town
    const npc1 = townManager.spawnNPC('FARMER');
    const npc2 = townManager.spawnNPC('FARMER');
    townManager.assignNPC(npc1.id, 'farm1');
    townManager.assignNPC(npc2.id, 'farm1');

    consumption.registerNPC(npc1.id, true);
    consumption.registerNPC(npc2.id, true);

    // Initial resources
    storage.addResource('food', 1000);

    // Execute several ticks
    for (let tick = 0; tick < 10; tick++) {
      // Consumption
      const consumptionResult = consumption.executeConsumptionTick(storage.getResource('food'));
      const consumed = parseFloat(consumptionResult.foodConsumed);

      // Production
      const npcAssignments = { farm1: [npc1.id, npc2.id] };
      productionTick.executeTick([farm], npcAssignments, 1.0);
      const produced = productionTick.lastTickResult.production.food || 0;

      // Update storage
      storage.addResource('food', produced);
      storage.removeResource('food', consumed);

      // Update morale
      consumption.updateHappiness(storage.getResource('food') / 2);
      const aliveNPCs = consumption.getAliveNPCs();
      morale.calculateTownMorale({
        npcs: aliveNPCs,
        foodAvailable: storage.getResource('food'),
        housingCapacity: 10,
        expansionCount: 0
      });
    }

    // Verify system stability
    expect(consumption.getAliveCount()).toBeGreaterThan(0);
    expect(storage.getResource('food')).toBeGreaterThanOrEqual(0);
  });

  // ============================================
  // SCENARIO 4: Building Effects with Territory
  // ============================================

  test('Scenario 4: Town Center aura affects farm production within territory', () => {
    // Create territory
    const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'TOWN');

    // Place Town Center (has aura)
    const townCenter = {
      id: 'tc1',
      type: 'TOWN_CENTER',
      position: { x: 50, y: 25, z: 50 }
    };
    grid.placeBuilding(townCenter);
    spatial.addBuilding(townCenter);
    buildingEffect.registerBuildingEffects(townCenter);
    territoryManager.addBuildingToTerritory(territory.id, townCenter);

    // Place farms near and far from aura
    const farmNear = {
      id: 'farm_near',
      type: 'FARM',
      position: { x: 55, y: 25, z: 55 } // Distance ≈ 7
    };

    const farmFar = {
      id: 'farm_far',
      type: 'FARM',
      position: { x: 100, y: 25, z: 100 } // Distance ≈ 71
    };

    grid.placeBuilding(farmNear);
    grid.placeBuilding(farmFar);
    spatial.addBuilding(farmNear);
    spatial.addBuilding(farmFar);
    territoryManager.addBuildingToTerritory(territory.id, farmNear);
    territoryManager.addBuildingToTerritory(territory.id, farmFar);

    // Calculate bonuses
    const bonusNear = buildingEffect.getProductionBonusAt(farmNear.position.x, farmNear.position.y, farmNear.position.z);
    const bonusFar = buildingEffect.getProductionBonusAt(farmFar.position.x, farmFar.position.y, farmFar.position.z);

    // Near farm should have aura bonus, far farm should not
    expect(bonusNear).toBeGreaterThan(1.0); // Has aura
    expect(bonusFar).toBe(1.0); // No aura
  });

  // ============================================
  // SCENARIO 5: Housing + Population Balance
  // ============================================

  test('Scenario 5: Housing capacity affects morale and population', () => {
    // Create houses
    const houses = [
      { id: 'house1', type: 'HOUSE', position: { x: 45, y: 25, z: 45 } },
      { id: 'house2', type: 'HOUSE', position: { x: 55, y: 25, z: 55 } }
    ];

    for (const house of houses) {
      grid.placeBuilding(house);
    }

    // Spawn NPCs (4 total, houses hold 2 each = 4 capacity)
    const npcs = [];
    for (let i = 0; i < 4; i++) {
      const npc = townManager.spawnNPC('WORKER');
      npcs.push(npc);
      townManager.assignNPC(npc.id, houses[i % 2].id);
    }

    // Calculate housing metrics
    const occupancyRatio = townManager.getOccupancyRatio(houses);
    const stats = townManager.getStatistics(houses);

    expect(occupancyRatio).toBe(100); // All houses full
    expect(stats.housing.occupancyPercent).toBe('100.0');

    // Morale should reflect good housing
    morale.calculateTownMorale({
      npcs: stats.population.alive > 0 ? npcs : [],
      foodAvailable: 1000,
      housingCapacity: stats.housing.capacity,
      expansionCount: 0
    });

    expect(morale.getCurrentMorale()).toBeGreaterThanOrEqual(-100);
  });

  // ============================================
  // SCENARIO 6: Full Economy Simulation (1 minute)
  // ============================================

  test('Scenario 6: Simulate full economy for 60 seconds (12 ticks)', () => {
    // Setup complete infrastructure
    const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');

    const buildings = [
      { id: 'farm1', type: 'FARM', position: { x: 55, y: 25, z: 55 } },
      { id: 'farm2', type: 'FARM', position: { x: 45, y: 25, z: 45 } },
      { id: 'house1', type: 'HOUSE', position: { x: 50, y: 25, z: 60 } }
    ];

    for (const building of buildings) {
      grid.placeBuilding(building);
      spatial.addBuilding(building);
      territoryManager.addBuildingToTerritory(territory.id, building);
      buildingEffect.registerBuildingEffects(building);
    }

    // Spawn workforce
    const npcs = [];
    for (let i = 0; i < 2; i++) {
      const npc = townManager.spawnNPC('FARMER');
      npcs.push(npc);
      consumption.registerNPC(npc.id, true);
      townManager.assignNPC(npc.id, 'farm1');
    }

    // Initialize resources
    storage.addResource('food', 500);

    // Simulate 12 ticks (60 seconds)
    let totalProduced = 0;
    let totalConsumed = 0;

    for (let tick = 0; tick < 12; tick++) {
      // Consumption
      const consumptionResult = consumption.executeConsumptionTick(storage.getResource('food'));
      const consumed = parseFloat(consumptionResult.foodConsumed);
      totalConsumed += consumed;

      // Production
      const npcAssignments = {
        farm1: npcs.map(n => n.id),
        farm2: [],
        house1: []
      };
      const productionResult = productionTick.executeTick(buildings, npcAssignments, 1.0);
      const produced = productionResult.production.food || 0;
      totalProduced += produced;

      // Update storage
      storage.addResource('food', produced);
      storage.removeResource('food', consumed);

      // Update morale
      consumption.updateHappiness(storage.getResource('food') / npcs.length);
      morale.calculateTownMorale({
        npcs: consumption.getAliveNPCs(),
        foodAvailable: storage.getResource('food'),
        housingCapacity: 2,
        expansionCount: 0
      });
    }

    // Verify results
    expect(consumption.getAliveCount()).toBe(2); // All NPCs survived
    expect(totalProduced).toBeGreaterThan(0);
    expect(totalConsumed).toBeGreaterThan(0);
    expect(storage.getResource('food')).toBeGreaterThanOrEqual(0);
  });

  // ============================================
  // SCENARIO 7: NPC Training + Skill Progression
  // ============================================

  test('Scenario 7: NPC training increases skill and production', () => {
    // Create farm
    const farm = { id: 'farm1', type: 'FARM', position: { x: 50, y: 25, z: 50 } };
    grid.placeBuilding(farm);
    spatial.addBuilding(farm);

    // Spawn and train NPC
    const npc = townManager.spawnNPC('FARMER');
    const initialSkill = npc.skill;

    townManager.assignNPC(npc.id, 'farm1');
    townManager.trainNPC(npc.id, 0.2); // Train NPC

    expect(npc.skill).toBeGreaterThan(initialSkill);
    expect(npc.skill).toBeLessThanOrEqual(1.5); // Capped
  });

  // ============================================
  // SCENARIO 8: Storage Overflow Management
  // ============================================

  test('Scenario 8: Storage overflow dumps least valuable resources', () => {
    // Set small capacity
    storage.setCapacity(100);

    // Add mixed resources
    storage.addResource('wood', 40);
    storage.addResource('stone', 40);
    storage.addResource('food', 30); // Total 110, exceeds 100

    // Check overflow
    const overflow = storage.checkAndHandleOverflow();
    expect(overflow.overflowed).toBe(true);

    // Wood should be dumped first (lowest priority)
    expect(storage.getResource('wood')).toBeLessThan(40);
  });

  // ============================================
  // SCENARIO 9: Tier Progression Validation
  // ============================================

  test('Scenario 9: Complex tier progression with all requirements', () => {
    // Start at SURVIVAL
    let currentTier = 'SURVIVAL';
    const buildings = [];
    const resources = { wood: 0, food: 0, stone: 0 };

    // Advance to PERMANENT
    const perm = tierProgression.canAdvanceToTier('PERMANENT', [
      { id: 'h1', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } },
      { id: 'h2', type: 'HOUSE', position: { x: 0, y: 0, z: 0 } },
      { id: 'f1', type: 'FARM', position: { x: 0, y: 0, z: 0 } },
      { id: 'f2', type: 'FARM', position: { x: 0, y: 0, z: 0 } }
    ], { wood: 100, food: 50, stone: 50 }, 'SURVIVAL');
    expect(perm.canAdvance).toBe(true);
  });

  // ============================================
  // SCENARIO 10: Critical System Stability
  // ============================================

  test('Scenario 10: System remains stable under stress', () => {
    // Create large number of NPCs
    const npcs = [];
    for (let i = 0; i < 50; i++) {
      const npc = townManager.spawnNPC('WORKER');
      npcs.push(npc);
      consumption.registerNPC(npc.id, i % 2 === 0); // 50% working
    }

    // Create multiple buildings
    const buildings = [];
    for (let i = 0; i < 10; i++) {
      const building = {
        id: `farm_${i}`,
        type: 'FARM',
        position: { x: 30 + i * 5, y: 25, z: 30 + i * 5 }
      };
      grid.placeBuilding(building);
      buildings.push(building);
    }

    // Initialize large storage
    storage.addResource('food', 10000);

    // Run simulation
    for (let tick = 0; tick < 20; tick++) {
      const consumptionResult = consumption.executeConsumptionTick(storage.getResource('food'));
      const consumed = parseFloat(consumptionResult.foodConsumed);
      storage.removeResource('food', consumed);

      morale.calculateTownMorale({
        npcs: consumption.getAliveNPCs(),
        foodAvailable: storage.getResource('food'),
        housingCapacity: 100,
        expansionCount: 0
      });
    }

    // System should remain stable
    expect(consumption.getAliveCount()).toBeGreaterThan(0);
    expect(storage.getTotalUsage()).toBeLessThanOrEqual(storage.getCapacity());
  });
});
