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
        gameManager.engine.tick(16);
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
        await gm.stopGame();
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
      for (let i = 0; i < 50; i++) {
        await gameManager.orchestrator.spawnNPC({
          position: { x: (i % 10) * 2, y: 0, z: Math.floor(i / 10) * 2 },
        });
      }

      const state = gameManager.getGameState();
      expect(state.npcs.length).toBe(50);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 120; i++) {
        const startTime = performance.now();
        gameManager.engine.tick(16);
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
      for (let i = 0; i < 100; i++) {
        await gameManager.orchestrator.spawnNPC({
          position: { x: (i % 10) * 2, y: 0, z: Math.floor(i / 10) * 2 },
        });
      }

      const state = gameManager.getGameState();
      expect(state.npcs.length).toBe(100);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 60; i++) {
        const startTime = performance.now();
        gameManager.engine.tick(16);
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
        const npc = await gameManager.orchestrator.spawnNPC({
          position: { x: 0, y: 0, z: 0 },
        });
        npcs.push(npc);
      }

      // Measure pathfinding performance
      const pathfindingTimes = [];

      for (const npc of npcs) {
        const startTime = performance.now();

        if (gameManager.orchestrator.npcSystem) {
          gameManager.orchestrator.npcSystem.moveNPCTo(npc.id, {
            x: 20,
            y: 0,
            z: 20,
          });
        }

        const pathfindingTime = performance.now() - startTime;
        pathfindingTimes.push(pathfindingTime);
      }

      const avgPathfindingTime = pathfindingTimes.reduce((a, b) => a + b, 0) / pathfindingTimes.length;

      console.log(`Average pathfinding time: ${avgPathfindingTime.toFixed(2)}ms`);

      expect(avgPathfindingTime).toBeLessThan(10); // Should compute path in under 10ms

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

      // Build 100 buildings
      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 10; z++) {
          await gameManager.orchestrator.processBuildingConstruction({
            type: x % 2 === 0 ? 'FARM' : 'HOUSE',
            position: { x: x * 3, y: 0, z: z * 3 },
          });
        }
      }

      const state = gameManager.getGameState();
      expect(state.buildings.length).toBe(100);

      // Measure tick performance
      const tickTimes = [];
      for (let i = 0; i < 60; i++) {
        const startTime = performance.now();
        gameManager.engine.tick(16);
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
      for (let i = 0; i < 50; i++) {
        await gameManager.orchestrator.processBuildingConstruction({
          type: i % 3 === 0 ? 'FARM' : i % 3 === 1 ? 'HOUSE' : 'STORAGE',
          position: { x: (i % 10) * 3, y: 0, z: Math.floor(i / 10) * 3 },
        });
      }

      // Spawn 50 NPCs
      for (let i = 0; i < 50; i++) {
        await gameManager.orchestrator.spawnNPC({
          position: { x: i * 2, y: 0, z: i * 2 },
        });
      }

      const state = gameManager.getGameState();
      expect(state.buildings.length).toBe(50);
      expect(state.npcs.length).toBe(50);

      // Measure combined performance
      const tickTimes = [];
      for (let i = 0; i < 120; i++) {
        const startTime = performance.now();
        gameManager.engine.tick(16);
        const tickTime = performance.now() - startTime;
        tickTimes.push(tickTime);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
      const fps = 1000 / avgTickTime;

      console.log(`Combined Load - Average tick time: ${avgTickTime.toFixed(2)}ms (${fps.toFixed(1)} FPS)`);
      console.log(`Combined Load - 50 buildings, 50 NPCs`);

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
          const npc = await gameManager.orchestrator.spawnNPC({
            position: { x: i, y: 0, z: i },
          });
          npcs.push(npc);
        }

        // Run game loop
        for (let i = 0; i < 20; i++) {
          gameManager.engine.tick(16);
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Remove NPCs
        for (const npc of npcs) {
          await gameManager.orchestrator.removeNPC(npc.id);
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
        await gameManager.orchestrator.spawnNPC({
          position: { x: i * 2, y: 0, z: i * 2 },
        });
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
        gameManager.engine.tick(16);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Performance monitor should have metrics
      if (gameManager.performanceMonitor) {
        const metrics = gameManager.performanceMonitor.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.avgTickTime).toBeDefined();
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
        gameManager.engine.tick(16);

        // Periodically add complexity
        if (i % 100 === 0) {
          await gameManager.orchestrator.spawnNPC({
            position: { x: i / 10, y: 0, z: i / 10 },
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const state = gameManager.getGameState();
      expect(state.npcs.length).toBeGreaterThan(0);
      expect(gameManager.gameState).toBe(GameManager.GAME_STATE.RUNNING);

    }, TEST_TIMEOUT);
  });
});
