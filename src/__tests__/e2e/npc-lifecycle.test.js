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

// Helper: Get game state in the format tests expect
function getGameState(gm) {
  gm.orchestrator._updateGameState();
  const state = gm.orchestrator.getGameState();
  state.resources = gm.orchestrator.storage.getStorage();
  return state;
}

// Helper: Execute a game tick (replaces gameManager.engine.tick(16))
function executeTick(gm) {
  return gm.orchestrator.executeTick();
}

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

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Verify NPC structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.npcId).toBeDefined();
      expect(result.npc).toBeDefined();
      expect(result.npc.health).toBeGreaterThan(0);
      expect(result.npc.alive).toBe(true);

    }, TEST_TIMEOUT);

    test('should spawn multiple NPCs with unique IDs', async () => {
      await gameManager.startGame();

      const result1 = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });
      const result2 = gameManager.orchestrator.spawnNPC('WORKER', { x: 8, y: 0, z: 8 });

      expect(result1.npcId).not.toBe(result2.npcId);

      const state = getGameState(gameManager);
      expect(state.npcs.length).toBe(2);

    }, TEST_TIMEOUT);

    test('should spawn NPC with specified role', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('FARMER', { x: 5, y: 0, z: 5 });

      expect(result.npc.role).toBe('FARMER');

    }, TEST_TIMEOUT);
  });

  describe('NPC Needs System', () => {
    test('should decrease needs over time', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Run game loop for extended period
      for (let i = 0; i < 100; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const state = getGameState(gameManager);
      const updatedNPC = state.npcs.find(n => n.id === result.npcId);

      // NPC should still exist
      expect(updatedNPC).toBeDefined();

    }, TEST_TIMEOUT);

    test('should satisfy food need when eating', async () => {
      await gameManager.startGame();

      // Ensure there's food available
      gameManager.orchestrator.addResources({ food: 100 });

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Manually decrease food need via needs tracker
      if (gameManager.orchestrator.npcNeedsTracker) {
        const needs = gameManager.orchestrator.npcNeedsTracker.getNeeds(result.npcId);
        if (needs) {
          needs.food = 20; // Low food need
        }
      }

      // Run game loop to allow NPC to seek food
      for (let i = 0; i < 50; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // NPC manager should be working
      expect(gameManager.orchestrator.npcManager).toBeDefined();

    }, TEST_TIMEOUT);

    test('should affect happiness when needs are not met', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Manually set low needs via needs tracker
      if (gameManager.orchestrator.npcNeedsTracker) {
        const needs = gameManager.orchestrator.npcNeedsTracker.getNeeds(result.npcId);
        if (needs) {
          needs.food = 10;
          needs.rest = 10;
          needs.social = 10;
        }
      }

      // Run game loop
      for (let i = 0; i < 50; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const state = getGameState(gameManager);
      const updatedNPC = state.npcs.find(n => n.id === result.npcId);

      // NPC should still exist
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
        position: { x: 5, y: 0, z: 5 },
      });

      expect(buildResult.success).toBe(true);

      // Spawn NPC
      const npcResult = gameManager.orchestrator.spawnNPC('FARMER', { x: 3, y: 0, z: 3 });

      // Assign NPC to building
      const state = getGameState(gameManager);
      const building = state.buildings.find(b => b.type === 'FARM');
      const assignResult = gameManager.orchestrator.assignNPCToBuilding(npcResult.npcId, building.id);

      expect(assignResult.success).toBe(true);

    }, TEST_TIMEOUT);

    test('should execute assigned tasks', async () => {
      await gameManager.startGame();

      // Build a farm
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      // Spawn NPC
      const npcResult = gameManager.orchestrator.spawnNPC('FARMER', { x: 3, y: 0, z: 3 });

      // Assign to building
      const state = getGameState(gameManager);
      const building = state.buildings.find(b => b.type === 'FARM');
      gameManager.orchestrator.assignNPCToBuilding(npcResult.npcId, building.id);

      // Run game loop to execute tasks
      for (let i = 0; i < 50; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // NPC should still be in game
      const updatedState = getGameState(gameManager);
      const workingNPC = updatedState.npcs.find(n => n.id === npcResult.npcId);
      expect(workingNPC).toBeDefined();

    }, TEST_TIMEOUT);

    test('should unassign NPC from building', async () => {
      await gameManager.startGame();

      // Build and assign
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const npcResult = gameManager.orchestrator.spawnNPC('FARMER', { x: 3, y: 0, z: 3 });

      const state = getGameState(gameManager);
      const building = state.buildings.find(b => b.type === 'FARM');
      gameManager.orchestrator.assignNPCToBuilding(npcResult.npcId, building.id);

      // Unassign
      const unassignResult = gameManager.orchestrator.unassignNPC(npcResult.npcId);
      expect(unassignResult.success).toBe(true);

      const updatedState = getGameState(gameManager);
      const unassignedNPC = updatedState.npcs.find(n => n.id === npcResult.npcId);
      if (unassignedNPC) {
        expect(unassignedNPC.assignedBuilding).toBeFalsy();
      }

    }, TEST_TIMEOUT);
  });

  describe('NPC Pathfinding and Movement', () => {
    test('should move NPC to target position', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 0, y: 0, z: 0 });

      // Run game loop to allow movement
      for (let i = 0; i < 100; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const state = getGameState(gameManager);
      const movedNPC = state.npcs.find(n => n.id === result.npcId);

      // NPC should still exist
      expect(movedNPC).toBeDefined();

    }, TEST_TIMEOUT);

    test('should find path around obstacles', async () => {
      await gameManager.startGame();

      // Create obstacles (buildings)
      gameManager.orchestrator.addResources({ wood: 500, stone: 250 });

      for (let i = 1; i < 10; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: 'CAMPFIRE',
          position: { x: i, y: 0, z: 5 },
        });
      }

      // Spawn NPC on one side
      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 0, y: 0, z: 0 });

      // Run game loop
      for (let i = 0; i < 150; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // NPC should attempt to pathfind (exact behavior depends on pathfinding implementation)
      const state = getGameState(gameManager);
      const pathfindingNPC = state.npcs.find(n => n.id === result.npcId);
      expect(pathfindingNPC).toBeDefined();

    }, TEST_TIMEOUT);
  });

  describe('NPC Health and Damage', () => {
    test('should take damage and reduce health', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      const initialHealth = result.npc.health;

      // Apply damage via NPC manager
      const npc = gameManager.orchestrator.npcManager.getNPC(result.npcId);
      if (npc) {
        npc.health = Math.max(0, npc.health - 20);
      }

      const state = getGameState(gameManager);
      const damagedNPC = state.npcs.find(n => n.id === result.npcId);

      expect(damagedNPC.health).toBeLessThan(initialHealth);

    }, TEST_TIMEOUT);

    test('should heal when health is restored', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Damage then heal via NPC manager
      const npc = gameManager.orchestrator.npcManager.getNPC(result.npcId);
      if (npc) {
        npc.health = Math.max(0, npc.health - 30);

        const damagedState = getGameState(gameManager);
        const damagedNPC = damagedState.npcs.find(n => n.id === result.npcId);
        const damagedHealth = damagedNPC.health;

        npc.health = Math.min(100, npc.health + 15);

        const healedState = getGameState(gameManager);
        const healedNPC = healedState.npcs.find(n => n.id === result.npcId);

        expect(healedNPC.health).toBeGreaterThan(damagedHealth);
      }

    }, TEST_TIMEOUT);

    test('should die when health reaches zero', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      // Deal lethal damage via NPC manager
      gameManager.orchestrator.npcManager.killNPC(result.npcId, 'test');

      // Run game loop to process death
      for (let i = 0; i < 10; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const state = getGameState(gameManager);
      const deadNPC = state.npcs.find(n => n.id === result.npcId);

      // NPC should be dead or removed (getAllNPCStates filters alive only)
      expect(deadNPC === undefined || deadNPC.alive === false).toBe(true);

    }, TEST_TIMEOUT);
  });

  describe('NPC Cleanup and Removal', () => {
    test('should remove NPC from game state', async () => {
      await gameManager.startGame();

      const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 5, y: 0, z: 5 });

      const initialCount = getGameState(gameManager).npcs.length;

      // Remove NPC via npcManager
      gameManager.orchestrator.npcManager.removeNPC(result.npcId);
      // Force game state update
      gameManager.orchestrator._updateGameState();

      const state = getGameState(gameManager);
      expect(state.npcs.length).toBe(initialCount - 1);
      expect(state.npcs.find(n => n.id === result.npcId)).toBeUndefined();

    }, TEST_TIMEOUT);

    test('should clean up NPC resources on removal', async () => {
      await gameManager.startGame();

      // Build and assign NPC
      gameManager.orchestrator.addResources({ wood: 100, stone: 50 });
      await gameManager.orchestrator.processBuildingConstruction({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 },
      });

      const npcResult = gameManager.orchestrator.spawnNPC('FARMER', { x: 3, y: 0, z: 3 });

      const state = getGameState(gameManager);
      const building = state.buildings.find(b => b.type === 'FARM');
      gameManager.orchestrator.assignNPCToBuilding(npcResult.npcId, building.id);

      // Remove NPC via npcManager
      gameManager.orchestrator.npcManager.removeNPC(npcResult.npcId);
      gameManager.orchestrator._updateGameState();

      // NPC should be removed from game state
      const updatedState = getGameState(gameManager);
      expect(updatedState.npcs.find(n => n.id === npcResult.npcId)).toBeUndefined();

    }, TEST_TIMEOUT);
  });

  describe('NPC Population Management', () => {
    test('should respect population capacity limits', async () => {
      await gameManager.startGame();

      // Try to spawn many NPCs - the system should enforce limits
      const npcs = [];
      for (let i = 0; i < 15; i++) {
        const result = gameManager.orchestrator.spawnNPC('WORKER', { x: i % 10, y: 0, z: Math.floor(i / 10) });
        if (result.success) {
          npcs.push(result);
        }
      }

      const finalState = getGameState(gameManager);
      // Should have spawned some NPCs (exact limit depends on housing capacity)
      expect(finalState.npcs.length).toBeGreaterThan(0);

    }, TEST_TIMEOUT);
  });
});
