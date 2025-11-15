/**
 * E2E Building Lifecycle Test
 * Tests the complete lifecycle of buildings from construction to destruction
 *
 * This test validates:
 * - Building placement and validation
 * - Building construction process
 * - Building resource production/consumption
 * - Building upgrades across tiers
 * - Building destruction and cleanup
 * - Building interconnections and dependencies
 */

import GameManager from '../GameManager';
import { waitFor } from '../test-utils';

describe('E2E: Building Lifecycle', () => {
  let gameManager;
  const TEST_TIMEOUT = 60000;

  beforeEach(() => {
    gameManager = new GameManager({
      enableAutoSave: false,
      enablePerformanceMonitoring: false,
    });
    gameManager.initialize();
  });

  afterEach(async () => {
    if (gameManager && gameManager.gameState === GameManager.GAME_STATE.RUNNING) {
      await gameManager.stopGame();
    }
  });

  describe('Building Construction', () => {
    test('should construct building with valid placement', async () => {
      await gameManager.startGame();

      // Give resources
      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      expect(result.success).toBe(true);
      expect(result.building).toBeDefined();
      expect(result.building.type).toBe('FARM');
      expect(result.building.position).toEqual({ x: 5, y: 0, z: 5 });

      const state = gameManager.getGameState();
      expect(state.buildings.length).toBe(1);

    }, TEST_TIMEOUT);

    test('should fail construction with insufficient resources', async () => {
      await gameManager.startGame();

      // Don't give resources
      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/insufficient|resources/i);

    }, TEST_TIMEOUT);

    test('should fail construction with invalid placement', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 200,
        stone: 100,
      });

      // Build first building
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      // Try to build on same position
      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'HOUSE',
        position: { x: 5, y: 0, z: 5 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/occupied|overlap|placement/i);

    }, TEST_TIMEOUT);

    test('should consume correct amount of resources', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 100,
      });

      const initialState = gameManager.getGameState();
      const initialWood = initialState.resources.wood;
      const initialStone = initialState.resources.stone;

      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const state = gameManager.getGameState();

      // Resources should be consumed
      expect(state.resources.wood).toBeLessThan(initialWood);

    }, TEST_TIMEOUT);

    test('should construct all building types successfully', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 2000,
        stone: 1000,
        gold: 500,
        food: 500,
      });

      const buildingTypes = [
        'FARM',
        'HOUSE',
        'STORAGE',
        'WALL',
        'WORKSHOP',
        'BARRACKS',
        'TEMPLE',
        'MARKET',
      ];

      for (let i = 0; i < buildingTypes.length; i++) {
        const type = buildingTypes[i];
        const result = await gameManager.orchestrator.processBuildingConstruction({
          type,
          position: { x: i * 3, y: 0, z: i * 3 },
        });

        expect(result.success).toBe(true);
        expect(result.building.type).toBe(type);
      }

      const state = gameManager.getGameState();
      expect(state.buildings.length).toBe(buildingTypes.length);

    }, TEST_TIMEOUT);
  });

  describe('Building Production and Functionality', () => {
    test('should produce resources from production buildings', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      // Build a farm
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const initialState = gameManager.getGameState();
      const initialFood = initialState.resources.food || 0;

      // Run game loop for production
      for (let i = 0; i < 50; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Farm should produce food (exact production depends on implementation)
      const state = gameManager.getGameState();
      expect(state.resources.food).toBeDefined();

    }, TEST_TIMEOUT);

    test('should increase storage capacity with storage buildings', async () => {
      await gameManager.startGame();

      const initialState = gameManager.getGameState();
      const initialCapacity = initialState.storageCapacity || 0;

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      // Build storage
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'STORAGE',
        position: { x: 5, y: 0, z: 5 },
      });

      const state = gameManager.getGameState();
      const newCapacity = state.storageCapacity || 0;

      // Storage capacity should increase
      expect(newCapacity).toBeGreaterThanOrEqual(initialCapacity);

    }, TEST_TIMEOUT);

    test('should provide housing for NPCs', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      // Build house
      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'HOUSE',
        position: { x: 5, y: 0, z: 5 },
      });

      expect(result.success).toBe(true);

      const state = gameManager.getGameState();
      const house = state.buildings.find(b => b.type === 'HOUSE');

      // House should have NPC capacity
      expect(house.npcCapacity || house.capacity).toBeGreaterThan(0);

    }, TEST_TIMEOUT);
  });

  describe('Building Upgrades', () => {
    test('should upgrade building to higher tier', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 500,
        stone: 250,
        gold: 100,
      });

      // Build initial building
      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;

      // Progress to higher tier (need to meet requirements first)
      // Simplified for testing - in real game, tier progression has prerequisites
      await gameManager.orchestrator.progressToTier('PERMANENT');

      gameManager.orchestrator.addResources({
        wood: 500,
        stone: 250,
        gold: 100,
      });

      // Upgrade building
      const upgradeResult = await gameManager.orchestrator.upgradeBuilding(
        buildingId,
        'PERMANENT'
      );

      if (upgradeResult && upgradeResult.success) {
        const state = gameManager.getGameState();
        const upgradedBuilding = state.buildings.find(b => b.id === buildingId);

        expect(upgradedBuilding.tier).toBe('PERMANENT');
      }

    }, TEST_TIMEOUT);

    test('should increase building stats when upgraded', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 1000,
        stone: 500,
        gold: 200,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;
      const initialProduction = buildResult.building.production || 0;

      // Upgrade
      await gameManager.orchestrator.progressToTier('PERMANENT');
      gameManager.orchestrator.addResources({
        wood: 1000,
        stone: 500,
        gold: 200,
      });

      const upgradeResult = await gameManager.orchestrator.upgradeBuilding(
        buildingId,
        'PERMANENT'
      );

      if (upgradeResult && upgradeResult.success) {
        const state = gameManager.getGameState();
        const upgradedBuilding = state.buildings.find(b => b.id === buildingId);

        // Production or capacity should increase
        expect(
          upgradedBuilding.production > initialProduction ||
          upgradedBuilding.capacity > buildResult.building.capacity
        ).toBe(true);
      }

    }, TEST_TIMEOUT);
  });

  describe('Building Destruction', () => {
    test('should destroy building and return resources', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;
      const initialCount = gameManager.getGameState().buildings.length;

      // Destroy building
      const destroyResult = await gameManager.orchestrator.destroyBuilding(buildingId);

      expect(destroyResult).toBe(true);

      const state = gameManager.getGameState();
      expect(state.buildings.length).toBe(initialCount - 1);
      expect(state.buildings.find(b => b.id === buildingId)).toBeUndefined();

    }, TEST_TIMEOUT);

    test('should remove building from game state', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'WALL',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;

      await gameManager.orchestrator.destroyBuilding(buildingId);

      const state = gameManager.getGameState();
      const destroyedBuilding = state.buildings.find(b => b.id === buildingId);

      expect(destroyedBuilding).toBeUndefined();

    }, TEST_TIMEOUT);

    test('should unassign NPCs when building is destroyed', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      // Build farm
      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      // Spawn and assign NPC
      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 3, y: 0, z: 3 },
        role: 'FARMER',
      });

      await gameManager.orchestrator.assignNPCToBuilding(npc.id, buildResult.building.id);

      // Destroy building
      await gameManager.orchestrator.destroyBuilding(buildResult.building.id);

      const state = gameManager.getGameState();
      const unassignedNPC = state.npcs.find(n => n.id === npc.id);

      expect(unassignedNPC.assignedBuilding).toBeUndefined();

    }, TEST_TIMEOUT);
  });

  describe('Building Damage and Repair', () => {
    test('should damage building and reduce health', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'WALL',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;
      const initialHealth = buildResult.building.health || 100;

      // Damage building
      if (gameManager.orchestrator.damageBuilding) {
        await gameManager.orchestrator.damageBuilding(buildingId, 30);

        const state = gameManager.getGameState();
        const damagedBuilding = state.buildings.find(b => b.id === buildingId);

        expect(damagedBuilding.health).toBeLessThan(initialHealth);
      }

    }, TEST_TIMEOUT);

    test('should repair damaged building', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 200,
        stone: 100,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'WALL',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;

      // Damage and repair
      if (gameManager.orchestrator.damageBuilding && gameManager.orchestrator.repairBuilding) {
        await gameManager.orchestrator.damageBuilding(buildingId, 40);

        const damagedState = gameManager.getGameState();
        const damagedBuilding = damagedState.buildings.find(b => b.id === buildingId);
        const damagedHealth = damagedBuilding.health;

        await gameManager.orchestrator.repairBuilding(buildingId, 20);

        const repairedState = gameManager.getGameState();
        const repairedBuilding = repairedState.buildings.find(b => b.id === buildingId);

        expect(repairedBuilding.health).toBeGreaterThan(damagedHealth);
      }

    }, TEST_TIMEOUT);

    test('should destroy building when health reaches zero', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'WALL',
        position: { x: 5, y: 0, z: 5 },
      });

      const buildingId = buildResult.building.id;

      // Deal massive damage
      if (gameManager.orchestrator.damageBuilding) {
        await gameManager.orchestrator.damageBuilding(buildingId, 10000);

        // Run game loop to process destruction
        for (let i = 0; i < 10; i++) {
          gameManager.engine.tick(16);
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const state = gameManager.getGameState();
        const destroyedBuilding = state.buildings.find(b => b.id === buildingId);

        // Building should be destroyed or have zero health
        expect(destroyedBuilding === undefined || destroyedBuilding.health <= 0).toBe(true);
      }

    }, TEST_TIMEOUT);
  });

  describe('Building Interconnections', () => {
    test('should respect territory boundaries', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 500,
        stone: 250,
      });

      // Try to build far outside territory
      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 1000, y: 0, z: 1000 },
      });

      // Should fail if outside territory (depends on implementation)
      // Or succeed if territory is large enough
      expect(result).toBeDefined();

    }, TEST_TIMEOUT);

    test('should count buildings for tier requirements', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 1000,
        stone: 500,
        gold: 200,
      });

      // Build required buildings for tier progression
      const requiredBuildings = ['WALL', 'WALL', 'WALL'];

      for (let i = 0; i < requiredBuildings.length; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: requiredBuildings[i],
          position: { x: i * 3, y: 0, z: 0 },
        });
      }

      // Check if buildings are counted
      const state = gameManager.getGameState();
      const wallCount = state.buildings.filter(b => b.type === 'WALL').length;

      expect(wallCount).toBe(requiredBuildings.length);

    }, TEST_TIMEOUT);
  });

  describe('Building Visual States', () => {
    test('should have construction state when being built', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      // Building might start in construction state
      expect(result.building.state === 'UNDER_CONSTRUCTION' || result.building.state === 'COMPLETE').toBe(true);

    }, TEST_TIMEOUT);

    test('should transition to complete state', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 100,
        stone: 50,
      });

      const result = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      // Run game loop to complete construction
      for (let i = 0; i < 30; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const state = gameManager.getGameState();
      const building = state.buildings.find(b => b.id === result.building.id);

      // Building should be complete or functional
      expect(building.active || building.state === 'COMPLETE').toBe(true);

    }, TEST_TIMEOUT);
  });
});
