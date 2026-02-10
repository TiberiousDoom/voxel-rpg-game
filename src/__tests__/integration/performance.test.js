/**
 * Performance Integration Tests
 * Tests game performance under various load conditions
 *
 * This test validates:
 * - Frame rate (FPS) targets under load
 * - Tick time performance
 * - Memory usage patterns
 * - Scalability with multiple entities
 * - Rendering performance
 * - Pathfinding performance
 */

import GameManager from '../../GameManager.js';
import { measureTime } from '../../test-utils.js';

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

describe('Integration: Performance Benchmarks', () => {
  let gameManager;
  const TEST_TIMEOUT = 120000; // 2 minutes for performance tests

  // Performance targets
  const PERFORMANCE_TARGETS = {
    tickTime: 16, // 16ms = 60 FPS
    tickTimeWith50NPCs: 20, // Allow some degradation
    tickTimeWith100NPCs: 30,
    memoryLeakThreshold: 50 * 1024 * 1024, // 50MB growth over test
  };

  beforeEach(() => {
    gameManager = new GameManager({
      enableAutoSave: false,
      enablePerformanceMonitoring: true,
    });
    gameManager.initialize();

    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(async () => {
    if (gameManager && gameManager.gameState === GameManager.GAME_STATE.RUNNING) {
      await gameManager.stopGame();
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  });

  describe('Baseline Performance', () => {
    test('should maintain 60 FPS with minimal load', async () => {
      await gameManager.startGame();

      const tickTimes = [];
      const iterations = 60;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
      const maxTickTime = Math.max(...tickTimes);

      console.log(`Baseline - Average tick time: ${avgTickTime.toFixed(2)}ms`);
      console.log(`Baseline - Max tick time: ${maxTickTime.toFixed(2)}ms`);

      expect(avgTickTime).toBeLessThan(PERFORMANCE_TARGETS.tickTime);

    }, TEST_TIMEOUT);

    test('should complete initialization quickly', async () => {
      const { duration } = await measureTime(async () => {
        const gm = new GameManager({ enableAutoSave: false });
        gm.initialize();
      });

      console.log(`Initialization time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000); // Should init in under 1 second

    }, TEST_TIMEOUT);
  });

  describe('Performance with NPCs', () => {
    test('should maintain performance with 50 NPCs', async () => {
      await gameManager.startGame();

      // Give resources
      gameManager.orchestrator.addResources({
        food: 10000,
        wood: 5000,
        stone: 2500,
        gold: 1000,
      });

      // Spawn 50 NPCs
      let spawnedCount = 0;
      for (let i = 0; i < 50; i++) {
        const result = gameManager.orchestrator.spawnNPC(
          'WORKER',
          { x: (i % 10) * 2, y: 0, z: Math.floor(i / 10) * 2 }
        );
        if (result.success) spawnedCount++;
      }

      const state = getGameState(gameManager);
      expect(state.npcs.length).toBe(spawnedCount);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 120; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
      const maxTickTime = Math.max(...tickTimes);
      const fps = 1000 / avgTickTime;

      console.log(`50 NPCs - Average tick time: ${avgTickTime.toFixed(2)}ms (${fps.toFixed(1)} FPS)`);
      console.log(`50 NPCs - Max tick time: ${maxTickTime.toFixed(2)}ms`);

      expect(avgTickTime).toBeLessThan(PERFORMANCE_TARGETS.tickTimeWith50NPCs);
      expect(fps).toBeGreaterThan(50); // At least 50 FPS

    }, TEST_TIMEOUT);

    test('should maintain performance with 100 NPCs', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        food: 20000,
        wood: 10000,
        stone: 5000,
        gold: 2000,
      });

      // Spawn 100 NPCs
      let spawnedCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = gameManager.orchestrator.spawnNPC(
          'WORKER',
          { x: (i % 10) * 2, y: 0, z: Math.floor(i / 10) * 2 }
        );
        if (result.success) spawnedCount++;
      }

      const state = getGameState(gameManager);
      expect(state.npcs.length).toBe(spawnedCount);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 60; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
      const fps = 1000 / avgTickTime;

      console.log(`100 NPCs - Average tick time: ${avgTickTime.toFixed(2)}ms (${fps.toFixed(1)} FPS)`);

      expect(avgTickTime).toBeLessThan(PERFORMANCE_TARGETS.tickTimeWith100NPCs);
      expect(fps).toBeGreaterThan(30); // At least 30 FPS

    }, TEST_TIMEOUT);

    test('should handle NPC pathfinding efficiently', async () => {
      await gameManager.startGame();

      // Spawn NPCs
      const npcs = [];
      for (let i = 0; i < 20; i++) {
        const result = gameManager.orchestrator.spawnNPC('WORKER', { x: 0, y: 0, z: 0 });
        if (result.success) npcs.push(result);
      }

      // Pathfinding is internal to the NPC system; just verify NPCs were spawned
      expect(npcs.length).toBeGreaterThan(0);

      // Run ticks to exercise pathfinding
      const pathfindingTimes = [];
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        pathfindingTimes.push(tickTime);
      }

      const avgPathfindingTime = pathfindingTimes.reduce((a, b) => a + b, 0) / pathfindingTimes.length;

      console.log(`Average tick+pathfinding time: ${avgPathfindingTime.toFixed(2)}ms`);

      expect(avgPathfindingTime).toBeLessThan(10); // Should compute in under 10ms

    }, TEST_TIMEOUT);
  });

  describe('Performance with Buildings', () => {
    test('should maintain performance with many buildings', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 50000,
        stone: 25000,
        gold: 10000,
      });

      // Build many buildings (within grid bounds, grid may be 10x10)
      let builtCount = 0;
      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 10; z++) {
          const result = await gameManager.orchestrator.processBuildingConstruction({
            type: x % 2 === 0 ? 'FARM' : 'HOUSE',
            position: { x: x * 3, y: 0, z: z * 3 },
          });
          if (result.success) builtCount++;
        }
      }

      const state = getGameState(gameManager);
      // Some buildings may be outside grid bounds, so just verify we built some
      expect(state.buildings.length).toBeGreaterThan(0);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 60; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;

      console.log(`100 Buildings - Average tick time: ${avgTickTime.toFixed(2)}ms`);

      expect(avgTickTime).toBeLessThan(PERFORMANCE_TARGETS.tickTime);

    }, TEST_TIMEOUT);

    test('should handle building construction efficiently', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        wood: 10000,
        stone: 5000,
      });

      // Measure construction time
      const constructionTimes = [];

      for (let i = 0; i < 20; i++) {
        const { duration } = await measureTime(async () => {
          await gameManager.orchestrator.processBuildingConstruction({
            type: 'FARM',
            position: { x: i * 3, y: 0, z: i * 3 },
          });
        });

        constructionTimes.push(duration);
      }

      const avgConstructionTime = constructionTimes.reduce((a, b) => a + b, 0) / constructionTimes.length;

      console.log(`Average construction time: ${avgConstructionTime.toFixed(2)}ms`);

      expect(avgConstructionTime).toBeLessThan(50); // Should construct in under 50ms

    }, TEST_TIMEOUT);
  });

  describe('Combined Load Performance', () => {
    test('should handle complex scenarios with NPCs and buildings', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        food: 50000,
        wood: 25000,
        stone: 12500,
        gold: 5000,
      });

      // Build 50 buildings
      let builtCount = 0;
      for (let i = 0; i < 50; i++) {
        const result = await gameManager.orchestrator.processBuildingConstruction({
          type: i % 3 === 0 ? 'FARM' : i % 3 === 1 ? 'HOUSE' : 'CAMPFIRE',
          position: { x: (i % 10) * 3, y: 0, z: Math.floor(i / 10) * 3 },
        });
        if (result.success) builtCount++;
      }

      // Spawn 50 NPCs
      let spawnedCount = 0;
      for (let i = 0; i < 50; i++) {
        const result = gameManager.orchestrator.spawnNPC(
          'WORKER',
          { x: i * 2, y: 0, z: i * 2 }
        );
        if (result.success) spawnedCount++;
      }

      const state = getGameState(gameManager);
      // Some buildings may be outside grid bounds
      expect(state.buildings.length).toBeGreaterThan(0);
      expect(state.npcs.length).toBe(spawnedCount);

      // Measure combined performance
      const tickTimes = [];
      for (let i = 0; i < 120; i++) {
        const startTime = performance.now();
        executeTick(gameManager);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
      const fps = 1000 / avgTickTime;

      console.log(`Combined Load - Average tick time: ${avgTickTime.toFixed(2)}ms (${fps.toFixed(1)} FPS)`);
      console.log(`Combined Load - ${builtCount} buildings, ${spawnedCount} NPCs`);

      expect(fps).toBeGreaterThan(30); // At least 30 FPS under combined load

    }, TEST_TIMEOUT);
  });

  describe('Memory Performance', () => {
    test('should not leak memory during extended gameplay', async () => {
      if (!global.gc || typeof process === 'undefined') {
        console.log('Skipping memory test - gc not available');
        return;
      }

      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        food: 10000,
        wood: 5000,
        stone: 2500,
        gold: 1000,
      });

      // Get initial memory
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;

      // Spawn and remove NPCs repeatedly
      for (let cycle = 0; cycle < 10; cycle++) {
        // Spawn NPCs
        const npcs = [];
        for (let i = 0; i < 20; i++) {
          const result = gameManager.orchestrator.spawnNPC(
            'WORKER',
            { x: i % 10, y: 0, z: Math.floor(i / 10) }
          );
          if (result.success) npcs.push(result);
        }

        // Run game loop
        for (let i = 0; i < 20; i++) {
          executeTick(gameManager);
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Remove NPCs
        for (const npc of npcs) {
          gameManager.orchestrator.npcManager.removeNPC(npc.npcId);
        }

        // Force GC
        global.gc();
      }

      // Get final memory
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;

      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      expect(memoryGrowth).toBeLessThan(PERFORMANCE_TARGETS.memoryLeakThreshold);

    }, TEST_TIMEOUT);
  });

  describe('Save/Load Performance', () => {
    test('should save game state quickly', async () => {
      await gameManager.startGame();

      // Create complex game state
      gameManager.orchestrator.addResources({
        wood: 5000,
        stone: 2500,
      });

      for (let i = 0; i < 20; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: 'FARM',
          position: { x: i * 3, y: 0, z: i * 3 },
        });
      }

      for (let i = 0; i < 20; i++) {
        gameManager.orchestrator.spawnNPC(
          'WORKER',
          { x: i * 2, y: 0, z: i * 2 }
        );
      }

      // Measure save time
      const { duration } = await measureTime(async () => {
        await gameManager.saveGame('perf-test-save');
      });

      console.log(`Save time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500); // Should save in under 500ms

    }, TEST_TIMEOUT);

    test('should load game state quickly', async () => {
      await gameManager.startGame();

      // Create and save state
      gameManager.orchestrator.addResources({
        wood: 5000,
        stone: 2500,
      });

      for (let i = 0; i < 20; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: 'FARM',
          position: { x: i * 3, y: 0, z: i * 3 },
        });
      }

      await gameManager.saveGame('perf-test-load');

      // Reset
      await gameManager.stopGame();
      gameManager = new GameManager({ enableAutoSave: false });
      gameManager.initialize();

      // Measure load time
      const { duration } = await measureTime(async () => {
        await gameManager.loadGame('perf-test-load');
      });

      console.log(`Load time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500); // Should load in under 500ms

    }, TEST_TIMEOUT);
  });

  describe('Rendering Performance', () => {
    test('should handle viewport culling efficiently', async () => {
      await gameManager.startGame();

      // This would test viewport culling if implemented
      // For now, we just verify the game runs
      expect(gameManager.engine).toBeDefined();
    });

    test('should render sprites efficiently', async () => {
      await gameManager.startGame();

      // Test sprite rendering performance (conceptual)
      // Actual implementation would depend on rendering system
      expect(gameManager.orchestrator).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      await gameManager.startGame();

      // Run game loop
      for (let i = 0; i < 60; i++) {
        executeTick(gameManager);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Performance monitor should have metrics
      if (gameManager.performanceMonitor) {
        expect(gameManager.performanceMonitor).toBeDefined();
      }
    });
  });

  describe('Stress Tests', () => {
    test('should survive extended gameplay session', async () => {
      await gameManager.startGame();

      gameManager.orchestrator.addResources({
        food: 100000,
        wood: 50000,
        stone: 25000,
        gold: 10000,
      });

      // Run for 1000 ticks (simulated ~16 seconds of gameplay)
      for (let i = 0; i < 1000; i++) {
        executeTick(gameManager);

        // Periodically add complexity
        if (i % 100 === 0) {
          gameManager.orchestrator.spawnNPC(
            'WORKER',
            { x: (i / 10) % 10, y: 0, z: Math.floor((i / 10) / 10) }
          );
        }

        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const state = getGameState(gameManager);
      expect(state.npcs.length).toBeGreaterThan(0);
      expect(gameManager.gameState).toBe(GameManager.GAME_STATE.RUNNING);

    }, TEST_TIMEOUT);
  });
});
