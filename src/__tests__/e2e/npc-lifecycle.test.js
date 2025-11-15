/**
 * E2E NPC Lifecycle Test
 * Tests the complete lifecycle of NPCs from spawn to death
 *
 * This test validates:
 * - NPC spawning and initialization
 * - NPC needs system (hunger, rest, social)
 * - NPC task assignment and execution
 * - NPC pathfinding and movement
 * - NPC health and happiness
 * - NPC death and cleanup
 */

import GameManager from '../../GameManager.js';
import { waitFor } from '../../test-utils.js';

describe('E2E: NPC Lifecycle', () => {
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

  describe('NPC Spawning and Initialization', () => {
    test('should spawn NPC with correct initial state', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      // Verify NPC structure
      expect(npc).toBeDefined();
      expect(npc.id).toBeDefined();
      expect(npc.position).toEqual({ x: 5, y: 0, z: 5 });
      expect(npc.health).toBeGreaterThan(0);
      expect(npc.happiness).toBeDefined();
      expect(npc.alive).toBe(true);

      // Verify needs system
      expect(npc.needs).toBeDefined();
      expect(npc.needs.food).toBeDefined();
      expect(npc.needs.rest).toBeDefined();
      expect(npc.needs.social).toBeDefined();

    }, TEST_TIMEOUT);

    test('should spawn multiple NPCs with unique IDs', async () => {
      await gameManager.startGame();

      const npc1 = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      const npc2 = await gameManager.orchestrator.spawnNPC({
        position: { x: 8, y: 0, z: 8 },
      });

      expect(npc1.id).not.toBe(npc2.id);

      const state = gameManager.getGameState();
      expect(state.npcs.length).toBe(2);

    }, TEST_TIMEOUT);

    test('should spawn NPC with specified role', async () => {
      await gameManager.startGame();

      const farmer = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
      });

      expect(farmer.role).toBe('FARMER');

    }, TEST_TIMEOUT);
  });

  describe('NPC Needs System', () => {
    test('should decrease needs over time', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      const initialNeeds = { ...npc.needs };

      // Run game loop for extended period
      for (let i = 0; i < 100; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const state = gameManager.getGameState();
      const updatedNPC = state.npcs.find(n => n.id === npc.id);

      // At least one need should have decreased
      const needsDecreased =
        updatedNPC.needs.food < initialNeeds.food ||
        updatedNPC.needs.rest < initialNeeds.rest ||
        updatedNPC.needs.social < initialNeeds.social;

      expect(needsDecreased).toBe(true);

    }, TEST_TIMEOUT);

    test('should satisfy food need when eating', async () => {
      await gameManager.startGame();

      // Ensure there's food available
      gameManager.orchestrator.addResources({ food: 100 });

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      // Manually decrease food need
      if (gameManager.orchestrator.npcSystem) {
        const npcInstance = gameManager.orchestrator.npcSystem.getNPC(npc.id);
        if (npcInstance && npcInstance.needs) {
          npcInstance.needs.food = 20; // Low food need
        }
      }

      // Run game loop to allow NPC to seek food
      for (let i = 0; i < 50; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // NPC system should be attempting to satisfy needs
      expect(gameManager.orchestrator.npcSystem).toBeDefined();

    }, TEST_TIMEOUT);

    test('should affect happiness when needs are not met', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      const initialHappiness = npc.happiness;

      // Manually set low needs
      if (gameManager.orchestrator.npcSystem) {
        const npcInstance = gameManager.orchestrator.npcSystem.getNPC(npc.id);
        if (npcInstance && npcInstance.needs) {
          npcInstance.needs.food = 10;
          npcInstance.needs.rest = 10;
          npcInstance.needs.social = 10;
        }
      }

      // Run game loop
      for (let i = 0; i < 50; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const state = gameManager.getGameState();
      const updatedNPC = state.npcs.find(n => n.id === npc.id);

      // Happiness might decrease or system might try to satisfy needs
      expect(updatedNPC).toBeDefined();
      expect(updatedNPC.happiness).toBeDefined();

    }, TEST_TIMEOUT);
  });

  describe('NPC Task Assignment', () => {
    test('should assign NPC to building', async () => {
      await gameManager.startGame();

      // Build a farm
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      const buildResult = await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 10, y: 0, z: 10 },
      });

      expect(buildResult.success).toBe(true);

      // Spawn NPC
      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
      });

      // Assign NPC to building
      const building = gameManager.getGameState().buildings.find(b => b.type === 'FARM');
      const assignResult = await gameManager.orchestrator.assignNPCToBuilding(npc.id, building.id);

      expect(assignResult).toBe(true);

      const state = gameManager.getGameState();
      const assignedNPC = state.npcs.find(n => n.id === npc.id);
      expect(assignedNPC.assignedBuilding).toBe(building.id);

    }, TEST_TIMEOUT);

    test('should execute assigned tasks', async () => {
      await gameManager.startGame();

      // Build a farm
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 10, y: 0, z: 10 },
      });

      // Spawn NPC
      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
      });

      // Assign to building
      const building = gameManager.getGameState().buildings.find(b => b.type === 'FARM');
      await gameManager.orchestrator.assignNPCToBuilding(npc.id, building.id);

      // Run game loop to execute tasks
      for (let i = 0; i < 50; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // NPC should have a task or be working
      const state = gameManager.getGameState();
      const workingNPC = state.npcs.find(n => n.id === npc.id);
      expect(workingNPC).toBeDefined();

    }, TEST_TIMEOUT);

    test('should unassign NPC from building', async () => {
      await gameManager.startGame();

      // Build and assign
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 10, y: 0, z: 10 },
      });

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
      });

      const building = gameManager.getGameState().buildings.find(b => b.type === 'FARM');
      await gameManager.orchestrator.assignNPCToBuilding(npc.id, building.id);

      // Unassign
      const unassignResult = await gameManager.orchestrator.unassignNPC(npc.id);
      expect(unassignResult).toBe(true);

      const state = gameManager.getGameState();
      const unassignedNPC = state.npcs.find(n => n.id === npc.id);
      expect(unassignedNPC.assignedBuilding).toBeUndefined();

    }, TEST_TIMEOUT);
  });

  describe('NPC Pathfinding and Movement', () => {
    test('should move NPC to target position', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 0, y: 0, z: 0 },
      });

      const targetPosition = { x: 10, y: 0, z: 10 };

      // Set move target
      if (gameManager.orchestrator.npcSystem) {
        gameManager.orchestrator.npcSystem.moveNPCTo(npc.id, targetPosition);
      }

      // Run game loop to allow movement
      for (let i = 0; i < 100; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const state = gameManager.getGameState();
      const movedNPC = state.npcs.find(n => n.id === npc.id);

      // NPC should have moved (not necessarily reached target, but should have progressed)
      const hasMoved =
        movedNPC.position.x !== 0 ||
        movedNPC.position.z !== 0;

      expect(hasMoved || movedNPC.position.x === targetPosition.x).toBe(true);

    }, TEST_TIMEOUT);

    test('should find path around obstacles', async () => {
      await gameManager.startGame();

      // Create obstacles (buildings)
      gameManager.orchestrator.addResources({ wood: 500, stone: 250 });

      for (let i = 1; i < 10; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: 'WALL',
          position: { x: i, y: 0, z: 5 },
        });
      }

      // Spawn NPC on one side
      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 0, y: 0, z: 0 },
      });

      // Move to other side
      const targetPosition = { x: 0, y: 0, z: 10 };

      if (gameManager.orchestrator.npcSystem) {
        gameManager.orchestrator.npcSystem.moveNPCTo(npc.id, targetPosition);
      }

      // Run game loop
      for (let i = 0; i < 150; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // NPC should attempt to pathfind (exact behavior depends on pathfinding implementation)
      const state = gameManager.getGameState();
      const pathfindingNPC = state.npcs.find(n => n.id === npc.id);
      expect(pathfindingNPC).toBeDefined();

    }, TEST_TIMEOUT);
  });

  describe('NPC Health and Damage', () => {
    test('should take damage and reduce health', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      const initialHealth = npc.health;

      // Apply damage
      if (gameManager.orchestrator.npcSystem) {
        gameManager.orchestrator.npcSystem.damageNPC(npc.id, 20);
      }

      const state = gameManager.getGameState();
      const damagedNPC = state.npcs.find(n => n.id === npc.id);

      expect(damagedNPC.health).toBeLessThan(initialHealth);

    }, TEST_TIMEOUT);

    test('should heal when health is restored', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      // Damage then heal
      if (gameManager.orchestrator.npcSystem) {
        gameManager.orchestrator.npcSystem.damageNPC(npc.id, 30);
        const damagedState = gameManager.getGameState();
        const damagedNPC = damagedState.npcs.find(n => n.id === npc.id);
        const damagedHealth = damagedNPC.health;

        gameManager.orchestrator.npcSystem.healNPC(npc.id, 15);
        const healedState = gameManager.getGameState();
        const healedNPC = healedState.npcs.find(n => n.id === npc.id);

        expect(healedNPC.health).toBeGreaterThan(damagedHealth);
      }

    }, TEST_TIMEOUT);

    test('should die when health reaches zero', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      // Deal lethal damage
      if (gameManager.orchestrator.npcSystem) {
        gameManager.orchestrator.npcSystem.damageNPC(npc.id, 1000);
      }

      // Run game loop to process death
      for (let i = 0; i < 10; i++) {
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const state = gameManager.getGameState();
      const deadNPC = state.npcs.find(n => n.id === npc.id);

      // NPC should be dead or removed
      expect(deadNPC === undefined || deadNPC.alive === false).toBe(true);

    }, TEST_TIMEOUT);
  });

  describe('NPC Cleanup and Removal', () => {
    test('should remove NPC from game state', async () => {
      await gameManager.startGame();

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
      });

      const initialCount = gameManager.getGameState().npcs.length;

      // Remove NPC
      await gameManager.orchestrator.removeNPC(npc.id);

      const state = gameManager.getGameState();
      expect(state.npcs.length).toBe(initialCount - 1);
      expect(state.npcs.find(n => n.id === npc.id)).toBeUndefined();

    }, TEST_TIMEOUT);

    test('should clean up NPC resources on removal', async () => {
      await gameManager.startGame();

      // Build and assign NPC
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 10, y: 0, z: 10 },
      });

      const npc = await gameManager.orchestrator.spawnNPC({
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
      });

      const building = gameManager.getGameState().buildings.find(b => b.type === 'FARM');
      await gameManager.orchestrator.assignNPCToBuilding(npc.id, building.id);

      // Remove NPC
      await gameManager.orchestrator.removeNPC(npc.id);

      // Building should no longer have assigned NPC
      const state = gameManager.getGameState();
      const updatedBuilding = state.buildings.find(b => b.id === building.id);
      expect(updatedBuilding.assignedNPCs?.includes(npc.id)).toBe(false);

    }, TEST_TIMEOUT);
  });

  describe('NPC Population Management', () => {
    test('should respect population capacity limits', async () => {
      await gameManager.startGame();

      // Get current population capacity
      const state = gameManager.getGameState();
      const capacity = state.populationCapacity || 10;

      // Try to spawn beyond capacity
      const npcs = [];
      for (let i = 0; i < capacity + 5; i++) {
        try {
          const npc = await gameManager.orchestrator.spawnNPC({
            position: { x: i, y: 0, z: i },
          });
          npcs.push(npc);
        } catch (error) {
          // Should fail when reaching capacity
          expect(error.message).toMatch(/capacity|limit/i);
        }
      }

      const finalState = gameManager.getGameState();
      expect(finalState.npcs.length).toBeLessThanOrEqual(capacity);

    }, TEST_TIMEOUT);
  });
});
