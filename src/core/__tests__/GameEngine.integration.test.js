/**
 * GameEngine.integration.test.js - Complete game engine integration tests
 *
 * Tests all 13 modules working together in a live game loop:
 * - Module 1: Foundation (GridManager, SpatialPartitioning)
 * - Module 2: Building Types (BuildingConfig, TierProgression, BuildingEffect)
 * - Module 3: Resource Economy (ProductionTick, StorageManager, ConsumptionSystem, MoraleCalculator)
 * - Module 4: Territory & Town (TerritoryManager, TownManager)
 * - NPC System (NPCManager, NPCAssignment)
 * - Core Engine (ModuleOrchestrator, GameEngine)
 *
 * Integration scenarios tested:
 * 1. Engine initialization with all modules
 * 2. Engine start/stop lifecycle
 * 3. Pause/resume functionality
 * 4. FPS and frame metrics tracking
 * 5. Event emission during gameplay
 * 6. Building placement during game
 * 7. NPC spawning and verification
 * 8. Tier advancement during gameplay
 * 9. Complete game scenario (15-minute survival)
 */

import GameEngine from '../GameEngine';
import ModuleOrchestrator from '../ModuleOrchestrator';
import GridManager from '../../modules/foundation/GridManager';
import SpatialPartitioning from '../../modules/foundation/SpatialPartitioning';
import BuildingConfig from '../../modules/building-types/BuildingConfig';
import TierProgression from '../../modules/building-types/TierProgression';
import BuildingEffect from '../../modules/building-types/BuildingEffect';
import ProductionTick from '../../modules/resource-economy/ProductionTick';
import StorageManager from '../../modules/resource-economy/StorageManager';
import ConsumptionSystem from '../../modules/resource-economy/ConsumptionSystem';
import MoraleCalculator from '../../modules/resource-economy/MoraleCalculator';
import { TerritoryManager } from '../../modules/territory-town/TerritoryManager';
import TownManager from '../../modules/territory-town/TownManager';
import { NPCManager } from '../../modules/npc-system/NPCManager';
import { NPCAssignment } from '../../modules/npc-system/NPCAssignment';

describe('GameEngine Integration Tests', () => {
  let gameEngine;
  let orchestrator;
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
  let npcManager;
  let npcAssignment;

  beforeEach(() => {
    // Initialize all modules in dependency order
    grid = new GridManager();
    spatial = new SpatialPartitioning();
    buildingConfig = new BuildingConfig();
    tierProgression = new TierProgression(buildingConfig);
    buildingEffect = new BuildingEffect(spatial, buildingConfig);
    storage = new StorageManager();
    productionTick = new ProductionTick(buildingConfig, buildingEffect, storage);
    consumption = new ConsumptionSystem();
    morale = new MoraleCalculator();
    territoryManager = new TerritoryManager(buildingConfig);
    townManager = new TownManager(buildingConfig);
    npcManager = new NPCManager(townManager);
    npcAssignment = new NPCAssignment(buildingConfig);

    // Create orchestrator with all modules
    orchestrator = new ModuleOrchestrator({
      grid,
      spatial,
      buildingConfig,
      tierProgression,
      buildingEffect,
      productionTick,
      storage,
      consumption,
      morale,
      territoryManager,
      townManager,
      npcManager,
      npcAssignment
    });

    // Create game engine
    gameEngine = new GameEngine(orchestrator);
  });

  // ============================================
  // TEST 1: ENGINE INITIALIZATION
  // ============================================

  describe('Initialization', () => {
    test('should initialize with orchestrator', () => {
      expect(gameEngine).toBeDefined();
      expect(gameEngine.orchestrator).toBe(orchestrator);
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.isPaused).toBe(false);
    });

    test('should have correct initial configuration', () => {
      expect(gameEngine.config.targetFPS).toBe(60);
      expect(gameEngine.config.gameTick).toBe(5000); // 5 seconds
      expect(gameEngine.config.autoSaveInterval).toBe(50); // Every 50 ticks
    });

    test('should initialize frame metrics', () => {
      expect(gameEngine.frameCount).toBe(0);
      expect(gameEngine.ticksElapsed).toBe(0);
      expect(gameEngine.fps).toBe(60);
      expect(gameEngine.frameTimestamps.length).toBe(0);
    });

    test('should have event system initialized', () => {
      expect(gameEngine.eventListeners).toBeDefined();
      expect(gameEngine.eventListeners.size).toBe(0);
    });
  });

  // ============================================
  // TEST 2: ENGINE START/STOP
  // ============================================

  describe('Start/Stop Lifecycle', () => {
    test('should start game engine', async () => {
      expect(gameEngine.isRunning).toBe(false);

      await gameEngine.start();

      expect(gameEngine.isRunning).toBe(true);
      expect(gameEngine.lastFrameTime).toBeGreaterThan(0);
    });

    test('should not start twice', async () => {
      await gameEngine.start();
      const firstFrameTime = gameEngine.lastFrameTime;

      await gameEngine.start();

      expect(gameEngine.lastFrameTime).toBe(firstFrameTime);
    });

    test('should stop game engine', async () => {
      await gameEngine.start();
      expect(gameEngine.isRunning).toBe(true);

      await gameEngine.stop();

      expect(gameEngine.isRunning).toBe(false);
    });

    test('should emit start event', (done) => {
      gameEngine.on('game:start', () => {
        expect(gameEngine.isRunning).toBe(true);
        gameEngine.stop().then(done);
      });

      gameEngine.start();
    });

    test('should emit stop event', (done) => {
      gameEngine.on('game:stop', () => {
        expect(gameEngine.isRunning).toBe(false);
        done();
      });

      gameEngine.start().then(() => {
        gameEngine.stop();
      });
    });
  });

  // ============================================
  // TEST 3: PAUSE/RESUME
  // ============================================

  describe('Pause/Resume', () => {
    test('should pause game', async () => {
      await gameEngine.start();

      gameEngine.pause();

      expect(gameEngine.isPaused).toBe(true);
    });

    test('should not pause twice', async () => {
      await gameEngine.start();
      gameEngine.pause();
      gameEngine.pause();

      expect(gameEngine.isPaused).toBe(true);
    });

    test('should resume game', async () => {
      await gameEngine.start();
      gameEngine.pause();

      gameEngine.resume();

      expect(gameEngine.isPaused).toBe(false);
    });

    test('should not resume when not paused', async () => {
      await gameEngine.start();
      gameEngine.resume();

      expect(gameEngine.isPaused).toBe(false);
    });

    test('should emit paused and resumed events', (done) => {
      const events = [];

      gameEngine.on('game:paused', () => {
        events.push('paused');
      });

      gameEngine.on('game:resumed', () => {
        events.push('resumed');

        expect(events).toEqual(['paused', 'resumed']);
        gameEngine.stop().then(done);
      });

      gameEngine.start().then(() => {
        gameEngine.pause();
        setTimeout(() => gameEngine.resume(), 50);
      });
    });
  });

  // ============================================
  // TEST 4: FRAME METRICS
  // ============================================

  describe('Frame Metrics', () => {
    test('should track frame count', async () => {
      const countBefore = gameEngine.frameCount;
      expect(countBefore).toBe(0);

      await gameEngine.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(gameEngine.frameCount).toBeGreaterThan(countBefore);
      await gameEngine.stop();
    });

    test('should track frame timestamps', async () => {
      await gameEngine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(gameEngine.frameTimestamps.length).toBeGreaterThan(0);
      await gameEngine.stop();
    });

    test('should calculate FPS', async () => {
      await gameEngine.start();

      await new Promise(resolve => setTimeout(resolve, 1000));

      // FPS should be close to 60 after 1 second
      expect(gameEngine.fps).toBeGreaterThan(30);
      expect(gameEngine.fps).toBeLessThan(80);
      await gameEngine.stop();
    });

    test('should track frame time delta', async () => {
      await gameEngine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(gameEngine.frameTime).toBeGreaterThan(0);
      await gameEngine.stop();
    });

    test('should get engine statistics', async () => {
      await gameEngine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = gameEngine.getEngineStats();
      expect(stats.running).toBe(true);
      expect(stats.paused).toBe(false);
      expect(stats.frameCount).toBeGreaterThan(0);
      expect(stats.currentFPS).toBeGreaterThan(0);

      await gameEngine.stop();
    });
  });

  // ============================================
  // TEST 5: EVENT SYSTEM
  // ============================================

  describe('Event System', () => {
    test('should emit tick:complete events', (done) => {
      const ticks = [];

      gameEngine.on('tick:complete', (result) => {
        ticks.push(result.tick);

        if (ticks.length >= 2) {
          expect(ticks[0]).toBe(1);
          expect(ticks[1]).toBe(2);
          gameEngine.stop().then(done);
        }
      });

      // Set very short tick interval for testing
      gameEngine.config.gameTick = 50;
      gameEngine.start();
    });

    test('should emit production:update events', (done) => {
      const productions = [];

      gameEngine.on('production:update', (production) => {
        productions.push(production);

        if (productions.length >= 1) {
          expect(production).toBeDefined();
          gameEngine.stop().then(done);
        }
      });

      // Set initial resources and building
      storage.setResources({ food: 100, wood: 100, stone: 100 });
      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };
      grid.placeBuilding(building);
      npcAssignment.registerBuilding(building);

      gameEngine.config.gameTick = 50;
      gameEngine.start();
    });

    test('should allow event listener registration', (done) => {
      let eventFired = false;

      gameEngine.on('test:event', () => {
        eventFired = true;
      });

      gameEngine.emit('test:event', {});

      expect(eventFired).toBe(true);
      done();
    });

    test('should allow event listener removal', (done) => {
      let callCount = 0;

      const callback = () => {
        callCount++;
      };

      gameEngine.on('test:event', callback);
      gameEngine.emit('test:event', {});

      gameEngine.off('test:event', callback);
      gameEngine.emit('test:event', {});

      expect(callCount).toBe(1);
      done();
    });

    test('should emit game:autosave events', (done) => {
      const saves = [];

      gameEngine.on('game:autosave', (tickNum) => {
        saves.push(tickNum);

        if (saves.length >= 1) {
          expect(saves[0]).toBeGreaterThan(0);
          gameEngine.stop().then(done);
        }
      });

      gameEngine.config.gameTick = 50;
      gameEngine.config.autoSaveInterval = 1; // Every tick
      gameEngine.start();
    });
  });

  // ============================================
  // TEST 6: BUILDING PLACEMENT DURING GAME
  // ============================================

  describe('Building Placement During Game', () => {
    test('should place building during game', async () => {
      await gameEngine.start();

      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };

      const result = orchestrator.placeBuilding(building);

      expect(result.success).toBe(true);
      expect(result.buildingId).toBe('farm1');

      const placed = grid.getBuilding('farm1');
      expect(placed).toBeDefined();
      expect(placed.id).toBe('farm1');

      await gameEngine.stop();
    });

    test('should remove building during game', async () => {
      await gameEngine.start();

      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };

      orchestrator.placeBuilding(building);
      expect(grid.getBuilding('farm1')).toBeDefined();

      const removed = orchestrator.removeBuilding('farm1');

      expect(removed).toBe(true);
      expect(grid.getBuilding('farm1')).toBeNull();

      await gameEngine.stop();
    });
  });

  // ============================================
  // TEST 7: NPC SPAWNING DURING GAME
  // ============================================

  describe('NPC Spawning During Game', () => {
    test('should spawn NPC during game', async () => {
      await gameEngine.start();

      const result = orchestrator.spawnNPC('FARMER', { x: 50, y: 25, z: 50 });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.npc).toBeDefined();
      expect(result.npc.role).toBe('FARMER');
      expect(result.npc.alive).toBe(true);

      const stats = npcManager.getStatistics();
      expect(stats.aliveCount).toBe(1);

      await gameEngine.stop();
    });

    test('should assign NPC to building during game', async () => {
      await gameEngine.start();

      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };
      orchestrator.placeBuilding(building);

      const result = orchestrator.spawnNPC('FARMER');
      const assigned = npcAssignment.assignNPC(result.npc.id, 'farm1');

      expect(assigned).toBe(true);
      const staffing = npcAssignment.getStaffingLevel('farm1');
      expect(staffing.filled).toBe(1);

      await gameEngine.stop();
    });

    test('should track NPC statistics during game', async () => {
      await gameEngine.start();

      orchestrator.spawnNPC('FARMER');
      orchestrator.spawnNPC('CRAFTSMAN');
      orchestrator.spawnNPC('GUARD');

      const stats = npcManager.getStatistics();
      expect(stats.aliveCount).toBe(3);
      expect(stats.totalSpawned).toBe(3);

      await gameEngine.stop();
    });
  });

  // ============================================
  // TEST 8: TIER ADVANCEMENT DURING GAME
  // ============================================

  describe('Tier Advancement During Game', () => {
    test('should attempt tier advancement during game', async () => {
      await gameEngine.start();

      // Set up resources for PERMANENT tier
      storage.setResources({ food: 100, wood: 100, stone: 100 });

      // Create HOUSE for PERMANENT tier requirement
      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const house = {
        id: 'house1',
        type: 'HOUSE',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };
      orchestrator.placeBuilding(house);

      const result = orchestrator.advanceTier('PERMANENT');

      expect(result.success).toBe(true);
      expect(result.newTier).toBe('PERMANENT');
      expect(orchestrator.gameState.currentTier).toBe('PERMANENT');

      await gameEngine.stop();
    });

    test('should not advance tier without requirements', async () => {
      await gameEngine.start();

      // Insufficient resources
      storage.setResources({ food: 10, wood: 10, stone: 10 });

      const result = orchestrator.advanceTier('PERMANENT');

      expect(result.success).toBe(false);
      expect(orchestrator.gameState.currentTier).toBe('SURVIVAL');

      await gameEngine.stop();
    });
  });

  // ============================================
  // TEST 9: COMPLETE GAME SCENARIO
  // ============================================

  describe('Complete Game Scenario', () => {
    test('should complete full 15-second gameplay scenario', async () => {
      // Set up short tick interval for faster testing
      gameEngine.config.gameTick = 100;

      let ticksExecuted = 0;
      const ticks = [];

      gameEngine.on('tick:complete', (result) => {
        ticksExecuted++;
        ticks.push(result);
      });

      await gameEngine.start();

      // Initialize game state
      storage.setResources({ food: 500, wood: 500, stone: 500 });
      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });

      // Place buildings
      const farm = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };
      orchestrator.placeBuilding(farm);
      npcAssignment.registerBuilding(farm);

      // Spawn NPCs
      const npc1 = orchestrator.spawnNPC('FARMER');
      const npc2 = orchestrator.spawnNPC('WORKER');
      npcAssignment.assignNPC(npc1.npc.id, 'farm1');

      // Wait for ticks to execute
      await new Promise(resolve => setTimeout(resolve, 2000));

      await gameEngine.stop();

      expect(ticksExecuted).toBeGreaterThan(0);
      expect(orchestrator.tickCount).toBe(ticksExecuted);

      // Verify state was updated
      const stats = gameEngine.getEngineStats();
      expect(stats.ticksElapsed).toBe(ticksExecuted);
    });

    test('should maintain game state consistency', async () => {
      gameEngine.config.gameTick = 100;

      await gameEngine.start();

      // Set initial state
      storage.setResources({ food: 500, wood: 200, stone: 300 });
      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });
      const farm = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 50, y: 25, z: 50 },
        health: 100
      };
      orchestrator.placeBuilding(farm);

      const result = orchestrator.spawnNPC('FARMER');
      npcAssignment.assignNPC(result.npc.id, 'farm1');

      // Get initial snapshot
      const snapshot1 = gameEngine.getGameSnapshot();
      expect(snapshot1.state).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 300));

      // Get snapshot after some ticks
      const snapshot2 = gameEngine.getGameSnapshot();
      expect(snapshot2.state).toBeDefined();

      // Verify tick count increased
      expect(snapshot2.ticksElapsed).toBeGreaterThanOrEqual(snapshot1.ticksElapsed);

      await gameEngine.stop();
    });

    test('should record game history', async () => {
      gameEngine.config.gameTick = 100;

      await gameEngine.start();

      storage.setResources({ food: 500, wood: 200, stone: 300 });
      const territory = territoryManager.createTerritory('territory1', { x: 50, y: 25, z: 50 });

      await new Promise(resolve => setTimeout(resolve, 500));

      const history = gameEngine.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('tick');
      expect(history[0]).toHaveProperty('state');

      await gameEngine.stop();
    });
  });

  // ============================================
  // TEST 10: ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    test('should require orchestrator', () => {
      expect(() => new GameEngine(null)).toThrow('GameEngine requires ModuleOrchestrator');
    });

    test('should handle event errors gracefully', (done) => {
      gameEngine.on('test:event', () => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => {
        gameEngine.emit('test:event', {});
      }).not.toThrow();

      done();
    });

    test('should track performance metrics during errors', async () => {
      gameEngine.config.gameTick = 50;

      await gameEngine.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = gameEngine.getEngineStats();
      expect(stats.frameTime).toBeDefined();
      expect(stats.currentFPS).toBeDefined();

      await gameEngine.stop();
    });
  });
});
