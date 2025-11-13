import EventEmitter from 'events';
import BrowserSaveManager from './persistence/BrowserSaveManager';
import ModuleOrchestrator from './core/ModuleOrchestrator';
import GameEngine from './core/GameEngine';
import NPCAssignment from './modules/npc-system/NPCAssignment';
import TierProgression from './modules/building-types/TierProgression';
import BuildingConfig from './modules/building-types/BuildingConfig';
import BuildingEffect from './modules/building-types/BuildingEffect';
import ProductionTick from './modules/resource-economy/ProductionTick';
import { TerritoryManager } from './modules/territory-town/TerritoryManager';
import GridManager from './modules/foundation/GridManager';
import SpatialPartitioning from './modules/foundation/SpatialPartitioning';
import StorageManager from './modules/resource-economy/StorageManager';
import ConsumptionSystem from './modules/resource-economy/ConsumptionSystem';
import TownManager from './modules/territory-town/TownManager';
import { NPCManager } from './modules/npc-system/NPCManager';
// Phase 3A: NPC Advanced Behaviors
import IdleTaskManager from './modules/npc-system/IdleTaskManager';
import NPCNeedsTracker from './modules/npc-system/NPCNeedsTracker';
import AutonomousDecision from './modules/npc-system/AutonomousDecision';
// Phase 3C: Achievement System
import AchievementSystem from './modules/achievement-system/AchievementSystem';
import achievementDefinitions from './modules/achievement-system/achievementDefinitions';
// Phase 3B: Event System
import { createEventSystem } from './modules/event-system';

/**
 * GameManager - Main game controller
 * Manages game lifecycle, state, and React integration
 */
export default class GameManager extends EventEmitter {
  static GAME_STATE = {
    UNINITIALIZED: 'uninitialized',
    INITIALIZED: 'initialized',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    ERRORED: 'errored'
  };

  constructor(config = {}) {
    super();
    this.config = {
      tickInterval: 1000, // 1 second between ticks for better responsiveness
      autoSaveInterval: 300, // Auto-save every 5 minutes (300 seconds)
      enableAutoSave: true,
      enablePerformanceMonitoring: true,
      enableErrorRecovery: true,
      ...config
    };

    this.gameState = GameManager.GAME_STATE.UNINITIALIZED;
    this.orchestrator = null;
    this.engine = null;
    this.saveManager = null;
    this.persistenceIntegration = null;
    this.performanceMonitor = null;
    this.errorRecovery = null;
    this.tickTimer = null;
    this.currentTick = 0;
    this.eventCallbacks = new Map();
  }

  /**
   * Initialize all game systems
   */
  initialize() {
    try {
      if (this.gameState !== GameManager.GAME_STATE.UNINITIALIZED) {
        // eslint-disable-next-line no-console
        console.warn('Game already initialized');
        return false;
      }

      // Initialize save manager
      this.saveManager = new BrowserSaveManager({
        namespace: 'voxel-rpg',
        maxSlots: 10
      });

      // Initialize persistence integration (placeholder for now)
      this.persistenceIntegration = {
        enabled: this.config.enableAutoSave,
        interval: this.config.autoSaveInterval
      };

      // Initialize performance monitor if enabled
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor = {
          enabled: true,
          metrics: []
        };
      }

      // Initialize error recovery if enabled
      if (this.config.enableErrorRecovery) {
        this.errorRecovery = {
          enabled: true,
          maxRetries: 3
        };
      }

      // Create module orchestrator with all game modules
      this.orchestrator = new ModuleOrchestrator(this._createModules());

      // Initialize game engine
      this.engine = new GameEngine(this.orchestrator);

      // Set up engine event forwarding
      this._setupEngineEvents();

      this.gameState = GameManager.GAME_STATE.INITIALIZED;
      this._emit('game:initialized', {});

      // eslint-disable-next-line no-console
      console.log('[GameManager] Initialization complete');
      return true;
    } catch (err) {
      console.error('[GameManager] Initialization failed:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this._emit('game:error', { error: err.message });
      return false;
    }
  }

  /**
   * Create all game modules
   */
  _createModules() {
    // Create real GridManager
    const grid = new GridManager({
      gridSize: 100,
      gridHeight: 50
    });

    // Create BuildingConfig once and share it across all modules
    const buildingConfig = new BuildingConfig();

    // Create TerritoryManager and initialize with starting territory
    const territoryManager = new TerritoryManager(buildingConfig);
    territoryManager.createTerritory({ x: 50, y: 0, z: 50 });

    // Create TownManager
    const townManager = new TownManager(buildingConfig);

    // Create NPCManager (requires TownManager)
    const npcManager = new NPCManager(townManager);

    // Create real SpatialPartitioning
    const spatial = new SpatialPartitioning(100, 50, 10);

    // Create real StorageManager with initial capacity
    const storage = new StorageManager(1000);
    // Set initial resources
    storage.addResource('food', 100);
    storage.addResource('wood', 50);
    storage.addResource('stone', 50);

    // Create real ConsumptionSystem
    const consumption = new ConsumptionSystem();

    // Phase 3A: NPC Advanced Behaviors
    const idleTaskManager = new IdleTaskManager(grid);
    const npcNeedsTracker = new NPCNeedsTracker();
    const autonomousDecision = new AutonomousDecision(npcNeedsTracker, idleTaskManager);

    // Phase 3C: Achievement System
    const achievementSystem = new AchievementSystem(achievementDefinitions);

    // Create real BuildingEffect
    const buildingEffect = new BuildingEffect(spatial, buildingConfig);

    // Create real ProductionTick
    const productionTick = new ProductionTick(buildingConfig, buildingEffect, storage);

    // Phase 3B: Event System (pass null for now, will set orchestrator after creation)
    const eventSystem = createEventSystem(null);

    return {
      grid: grid,
      spatial: spatial,
      buildingConfig: buildingConfig,
      tierProgression: new TierProgression(buildingConfig),
      buildingEffect: buildingEffect,
      productionTick: productionTick,
      storage: storage,
      consumption: consumption,
      morale: this._createMockMoraleCalculator(),
      territoryManager: territoryManager,
      townManager: townManager,
      npcManager: npcManager,
      npcAssignment: new NPCAssignment(buildingConfig),
      // Phase 3A modules
      idleTaskManager: idleTaskManager,
      npcNeedsTracker: npcNeedsTracker,
      autonomousDecision: autonomousDecision,
      // Phase 3C modules
      achievementSystem: achievementSystem,
      // Phase 3B modules
      eventSystem: eventSystem
    };
  }

  /**
   * Set up event forwarding from engine
   */
  _setupEngineEvents() {
    if (!this.engine) return;

    this.engine.on('tick:start', (data) => {
      this._emit('tick:start', data);
    });

    this.engine.on('tick:complete', (data) => {
      this.currentTick++;
      
      // Update population stats
      const population = this.orchestrator.npcManager.getStatistics();
      
      // Emit tick with full game state
      this._emit('tick:complete', {
        tick: this.currentTick,
        timestamp: Date.now(),
        gameState: {
          currentTier: this.orchestrator.gameState.currentTier,
          buildings: this.orchestrator.gameState.buildings,
          npcs: this.orchestrator.gameState.npcs,
          resources: this.orchestrator.storage.getStorage(),
          morale: this.orchestrator.morale.getCurrentMorale(),
          moraleState: this.orchestrator.morale.getMoraleState(),
          population: population
        }
      });
    });

    this.engine.on('tick:error', (error) => {
      console.error('[GameManager] Tick error:', error);
      this._emit('tick:error', error);
    });
  }

  /**
   * Start the game
   */
  async startGame(saveSlot = null) {
    try {
      if (this.gameState === GameManager.GAME_STATE.RUNNING) {
        // eslint-disable-next-line no-console
        console.warn('Game already running');
        return false;
      }

      if (!this.orchestrator || !this.engine) {
        // eslint-disable-next-line no-console
        console.error('Game not initialized');
        return false;
      }

      // Load save if provided
      if (saveSlot && this.saveManager?.saveExists(saveSlot)) {
        const loadResult = await this.saveManager.loadGame(
          saveSlot,
          this.orchestrator,
          this.engine
        );

        if (!loadResult.success) {
          console.error('[GameManager] Failed to load save:', loadResult.message);
          return false;
        }

        this._emit('game:loaded', { slot: saveSlot, metadata: loadResult.metadata });
      }

      // Start the game engine
      await this.engine.start();

      // Start the tick timer
      this._startTickTimer();

      this.gameState = GameManager.GAME_STATE.RUNNING;
      
      // Emit started event with current state
      this._emit('game:started', {
        tick: this.currentTick,
        timestamp: Date.now()
      });

      // eslint-disable-next-line no-console
      console.log('[GameManager] Game started successfully');
      return true;
    } catch (err) {
      console.error('[GameManager] Failed to start game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this._emit('game:error', { error: err.message });
      return false;
    }
  }

  /**
   * Start the game tick timer
   */
  _startTickTimer() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }

    // Run first tick immediately
    this._processTick();

    // Then run ticks on interval
    this.tickTimer = setInterval(() => {
      if (this.gameState === GameManager.GAME_STATE.RUNNING) {
        this._processTick();
      }
    }, this.config.tickInterval);
  }

  /**
   * Process a single game tick
   */
  _processTick() {
    try {
      this._emit('tick:start', { tick: this.currentTick });

      // Execute tick in orchestrator
      const tickResult = this.orchestrator.executeTick();

      // Update current tick counter
      this.currentTick++;

      // Update population for the progress bar
      const population = this.orchestrator.npcManager.getStatistics();
      const populationPercent = population.totalSpawned > 0 
        ? (population.aliveCount / population.totalSpawned) * 100 
        : 100;

      // Emit complete event with all data
      this._emit('tick:complete', {
        tick: this.currentTick,
        timestamp: Date.now(),
        ...tickResult,
        population: {
          ...population,
          percent: populationPercent
        }
      });

    } catch (err) {
      console.error('[GameManager] Tick processing error:', err);
      this._emit('tick:error', { error: err.message, tick: this.currentTick });
    }
  }

  /**
   * Stop the game
   */
  async stopGame() {
    try {
      // Check if already stopped
      if (this.gameState === GameManager.GAME_STATE.STOPPED ||
          this.gameState === GameManager.GAME_STATE.UNINITIALIZED) {
        return false;
      }

      // eslint-disable-next-line no-console
      console.log('[GameManager] Stopping game...');

      // Stop the game engine
      await this.engine.stop();

      // Clear tick timer
      if (this.tickTimer) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }

      this.gameState = GameManager.GAME_STATE.STOPPED;
      this._emit('game:stopped', { tick: this.currentTick });

      // eslint-disable-next-line no-console
      console.log('[GameManager] Game stopped');
      return true;
    } catch (err) {
      console.error('[GameManager] Failed to stop game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      return false;
    }
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (this.gameState === GameManager.GAME_STATE.RUNNING) {
      this.gameState = GameManager.GAME_STATE.PAUSED;

      // Pause the orchestrator
      if (this.orchestrator) {
        this.orchestrator.pause();
      }

      this._emit('game:paused', {});
      // eslint-disable-next-line no-console
      console.log('[GameManager] Game paused');
      return true;
    }
    return false;
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (this.gameState === GameManager.GAME_STATE.PAUSED) {
      this.gameState = GameManager.GAME_STATE.RUNNING;

      // Resume the orchestrator
      if (this.orchestrator) {
        this.orchestrator.resume();
      }

      this._emit('game:resumed', {});
      // eslint-disable-next-line no-console
      console.log('[GameManager] Game resumed');
      return true;
    }
    return false;
  }

  /**
   * Place a building
   */
  placeBuilding(type, position) {
    try {
      // Validate position
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return { success: false, message: 'Invalid position' };
      }

      // Create building with proper structure
      const building = {
        id: `building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        dimensions: { width: 1, height: 1, depth: 1 }
      };

      // Place building through orchestrator
      const result = this.orchestrator.placeBuilding(building);

      if (result.success) {
        this._emit('building:placed', {
          buildingId: result.buildingId,
          type,
          position
        });

        // Update game state immediately
        this.orchestrator._updateGameState();

        return { success: true, buildingId: result.buildingId };
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to place building:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Spawn an NPC
   */
  spawnNPC(role = 'WORKER', position = null) {
    try {
      const result = this.orchestrator.spawnNPC(role, position || this._getRandomPosition());

      if (result.success) {
        // Update population stats
        const stats = this.orchestrator.npcManager.getStatistics();

        this._emit('npc:spawned', {
          npc: result.npc,
          npcId: result.npcId,
          population: stats
        });

        // Force an immediate tick update
        this.orchestrator._updateGameState();

        return result;
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to spawn NPC:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get random position within grid bounds
   */
  _getRandomPosition() {
    return {
      x: Math.floor(Math.random() * 10),
      y: Math.floor(Math.random() * 10),
      z: 0
    };
  }

  /**
   * Get current tier progression status
   */
  getTierProgress() {
    try {
      const currentTier = this.orchestrator.gameState.currentTier || 'SURVIVAL';
      const nextTier = this.orchestrator.tierProgression.getNextTier(currentTier);

      if (!nextTier) {
        return {
          currentTier,
          nextTier: null,
          maxTierReached: true,
          canAdvance: false,
          progress: null
        };
      }

      const buildings = this.orchestrator.gameState.buildings || [];
      const resources = this.orchestrator.storage.getStorage();

      const progress = this.orchestrator.tierProgression.canAdvanceToTier(
        nextTier,
        buildings,
        resources,
        currentTier
      );

      return {
        currentTier,
        nextTier,
        maxTierReached: false,
        canAdvance: progress.canAdvance,
        progress
      };
    } catch (err) {
      console.error('[GameManager] Failed to get tier progress:', err);
      return {
        currentTier: 'SURVIVAL',
        nextTier: null,
        maxTierReached: false,
        canAdvance: false,
        error: err.message
      };
    }
  }

  /**
   * Advance to the next tier
   */
  advanceTier(targetTier) {
    try {
      const result = this.orchestrator.advanceTier(targetTier);

      if (result.success) {
        this._emit('tier:advanced', {
          tier: targetTier,
          resourcesSpent: result.resourcesSpent
        });
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to advance tier:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get territory status
   */
  getTerritoryStatus() {
    try {
      const territories = this.orchestrator.territoryManager.getAllTerritories();
      const mainTerritory = territories[0]; // Get primary territory

      if (!mainTerritory) {
        return {
          hasTerritory: false,
          currentSize: 0,
          nextSize: null,
          canExpand: false
        };
      }

      // Get expansion requirements for next tier
      const currentTier = mainTerritory.tier;
      const tierHierarchy = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
      const currentIndex = tierHierarchy.indexOf(currentTier);
      const nextTier = currentIndex < tierHierarchy.length - 1 ? tierHierarchy[currentIndex + 1] : null;

      if (!nextTier) {
        return {
          hasTerritory: true,
          currentSize: mainTerritory.dimension,
          currentTier,
          nextSize: null,
          maxSizeReached: true,
          canExpand: false
        };
      }

      // Check if can expand
      const resources = this.orchestrator.storage.getStorage();
      const buildings = this.orchestrator.gameState.buildings || [];

      const expansionResult = this.orchestrator.territoryManager.canExpandTerritory(
        mainTerritory.id,
        resources,
        buildings
      );

      return {
        hasTerritory: true,
        territoryId: mainTerritory.id,
        currentSize: mainTerritory.dimension,
        currentTier,
        nextSize: this._getTerritorySize(nextTier),
        nextTier,
        maxSizeReached: false,
        canExpand: expansionResult.canExpand,
        expansionResult
      };
    } catch (err) {
      console.error('[GameManager] Failed to get territory status:', err);
      return {
        hasTerritory: false,
        error: err.message
      };
    }
  }

  /**
   * Expand territory
   */
  expandTerritory(territoryId) {
    try {
      const result = this.orchestrator.expandTerritory(territoryId);

      if (result.success) {
        this._emit('territory:expanded', {
          territoryId,
          newTier: result.newTier
        });
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to expand territory:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Helper to get territory size by tier
   */
  _getTerritorySize(tier) {
    const sizes = {
      SURVIVAL: 25,
      PERMANENT: 50,
      TOWN: 100,
      CASTLE: 150
    };
    return sizes[tier] || 25;
  }

  /**
   * Assign NPC to building
   */
  assignNPC(npcId, buildingId) {
    try {
      const result = this.orchestrator.assignNPC(npcId, buildingId);

      if (result.success) {
        this._emit('npc:assigned', {
          npcId,
          buildingId
        });

        // Update game state immediately
        this.orchestrator._updateGameState();
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to assign NPC:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Unassign NPC from building
   */
  unassignNPC(npcId) {
    try {
      const result = this.orchestrator.unassignNPC(npcId);

      if (result.success) {
        this._emit('npc:unassigned', { npcId });

        // Update game state immediately
        this.orchestrator._updateGameState();
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to unassign NPC:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Auto-assign idle NPCs to buildings
   */
  autoAssignNPCs() {
    try {
      const result = this.orchestrator.autoAssignNPCs();

      if (result.success) {
        this._emit('npc:auto-assigned', {
          count: result.assignedCount
        });

        // Update game state immediately
        this.orchestrator._updateGameState();
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to auto-assign NPCs:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Damage a building
   * @param {string} buildingId - Building ID
   * @param {number} damage - Amount of damage to apply
   * @returns {object} Result of damage operation
   */
  damageBuilding(buildingId, damage) {
    try {
      const result = this.orchestrator.grid.damageBuilding(buildingId, damage);

      if (result.success) {
        this._emit('building:damaged', {
          buildingId,
          damage,
          newHealth: result.newHealth,
          destroyed: result.destroyed,
          state: result.state
        });

        // Update game state immediately
        this.orchestrator._updateGameState();
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to damage building:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Repair a building
   * @param {string} buildingId - Building ID
   * @param {number} repairAmount - Amount of health to restore
   * @returns {object} Result of repair operation
   */
  repairBuilding(buildingId, repairAmount = 100) {
    try {
      const building = this.orchestrator.grid.getBuilding(buildingId);
      if (!building) {
        return { success: false, message: 'Building not found' };
      }

      // Get repair cost from building config
      const repairCost = this.orchestrator.buildingConfig.getRepairCost(building.type);
      const currentResources = this.orchestrator.storage.getStorage();

      // Attempt repair
      const result = this.orchestrator.grid.repairBuilding(
        buildingId,
        repairAmount,
        currentResources,
        repairCost
      );

      if (result.success) {
        // Deduct resources
        for (const [resource, amount] of Object.entries(result.resourcesUsed)) {
          this.orchestrator.storage.removeResource(resource, amount);
        }

        this._emit('building:repaired', {
          buildingId,
          healthRestored: result.healthRestored,
          newHealth: result.newHealth,
          resourcesUsed: result.resourcesUsed,
          state: result.state
        });

        // Update game state immediately
        this.orchestrator._updateGameState();
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to repair building:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Save the game
   */
  async saveGame(slotName, description = '') {
    try {
      const result = await this.saveManager.saveGame(
        this.orchestrator,
        this.engine,
        slotName,
        description
      );

      if (result.success) {
        this._emit('game:saved', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[GameManager] Failed to save game:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Load a saved game
   */
  async loadGame(slotName) {
    try {
      const result = await this.saveManager.loadGame(
        slotName,
        this.orchestrator,
        this.engine
      );

      if (result.success) {
        this.currentTick = this.orchestrator.tickCount || 0;
        this._emit('game:loaded', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[GameManager] Failed to load game:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get available save slots
   */
  async getSaveSlots() {
    if (!this.saveManager) {
      return [];
    }
    try {
      return await this.saveManager.listSaves();
    } catch (err) {
      console.error('[GameManager] Failed to get save slots:', err);
      return [];
    }
  }

  /**
   * Get current game status
   */
  getGameStatus() {
    return {
      state: this.gameState,
      tick: this.currentTick,
      tier: this.orchestrator?.gameState?.currentTier || 'SURVIVAL',
      isRunning: this.gameState === GameManager.GAME_STATE.RUNNING,
      isPaused: this.gameState === GameManager.GAME_STATE.PAUSED,
      orchestrator: this.orchestrator
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.removeAllListeners();
    
    if (this.engine) {
      this.engine.destroy();
    }

    // eslint-disable-next-line no-console
    console.log('[GameManager] Destroyed');
  }

  // ===== MOCK MODULE CREATORS =====
  // These would normally be real module imports
  
  _createMockGridManager() {
    const buildings = new Map();
    return {
      buildings: buildings,
      placeBuilding: (building) => {
        // Validate required fields
        if (!building || !building.id || !building.position) {
          return { success: false, error: 'Invalid building data' };
        }

        // Add default state and properties if not present
        if (!building.state) {
          building.state = 'COMPLETE';
        }
        if (!building.properties) {
          building.properties = { npcCapacity: 2 };
        }

        // Store building
        buildings.set(building.id, building);

        return { success: true, buildingId: building.id };
      },
      getBuilding: (buildingId) => {
        return buildings.get(buildingId) || null;
      },
      removeBuilding: (buildingId) => {
        return buildings.delete(buildingId);
      },
      getAllBuildings: () => Array.from(buildings.values()),
      gridSize: 100,
      gridHeight: 50
    };
  }

  _createMockSpatialPartitioning() {
    return {
      chunkSize: 10,
      chunks: new Map(),
      buildingChunks: new Map(),
      addBuilding: () => {},
      removeBuilding: () => {},
      insert: () => {},
      query: () => []
    };
  }

  _createMockBuildingConfig() {
    // Use real BuildingConfig instead of mock
    return new BuildingConfig();
  }

  _createMockTierProgression(buildingConfig) {
    // Use real TierProgression instead of mock
    // Accept buildingConfig parameter to avoid creating duplicate instances
    return new TierProgression(buildingConfig);
  }

  _createMockBuildingEffect() {
    return {
      registerBuildingEffects: () => [],
      unregisterBuildingEffects: () => {},
      calculateEffects: () => ({})
    };
  }

  _createMockProductionTick() {
    return {
      executeTick: () => ({
        production: { food: 5, wood: 2 }
      })
    };
  }

  _createMockStorageManager() {
    const storage = {
      food: 100,
      wood: 50,
      stone: 50,
      gold: 0,
      essence: 0,
      crystal: 0
    };
    const capacity = 1000;

    const getTotalUsage = () => {
      return Object.values(storage).reduce((sum, val) => sum + val, 0);
    };

    return {
      getStorage: () => ({ ...storage }),
      getResource: (type) => storage[type] || 0,
      addResource: (type, amount) => {
        storage[type] = (storage[type] || 0) + amount;
      },
      removeResource: (type, amount) => {
        storage[type] = Math.max(0, (storage[type] || 0) - amount);
      },
      getStatus: () => {
        const usage = getTotalUsage();
        return {
          storage: { ...storage },
          capacity: capacity,
          usage: usage,
          available: Math.max(0, capacity - usage),
          percentUsed: ((usage / capacity) * 100).toFixed(1),
          isFull: usage >= capacity
        };
      }
    };
  }

  /**
   * Register event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
    return this;
  }

  /**
   * Unregister event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventCallbacks.has(event)) {
      const callbacks = this.eventCallbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.eventCallbacks.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit game event (custom implementation that uses both systems)
   * @private
   */
  _emit(event, data) {
    // Call callbacks from our custom system
    if (this.eventCallbacks.has(event)) {
      for (const callback of this.eventCallbacks.get(event)) {
        try {
          callback(data);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Error in event callback for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(event) {
    if (event) {
      this.eventCallbacks.delete(event);
    } else {
      this.eventCallbacks.clear();
    }
    return super.removeAllListeners(event);
  }

  _createMockConsumptionSystem() {
    return {
      executeConsumptionTick: () => ({
        foodConsumed: 2,
        starvationOccurred: false
      }),
      getAliveCount: () => 100,
      getAliveNPCs: () => []
    };
  }

  _createMockMoraleCalculator() {
    let morale = 0;
    
    return {
      getCurrentMorale: () => morale,
      getMoraleState: () => {
        if (morale < -50) return 'MISERABLE';
        if (morale < -25) return 'UPSET';
        if (morale < 0) return 'UNHAPPY';
        if (morale === 0) return 'NEUTRAL';
        if (morale < 25) return 'HAPPY';
        return 'THRILLED';
      },
      getMoraleMultiplier: () => 1 + (morale / 100),
      updateMorale: (delta) => {
        morale = Math.max(-100, Math.min(100, morale + delta));
      }
    };
  }

  _createMockTerritoryManager(buildingConfig) {
    // Use real TerritoryManager instead of mock
    // Accept buildingConfig parameter to avoid creating duplicate instances
    const territoryManager = new TerritoryManager(buildingConfig);

    // Create initial territory
    territoryManager.createTerritory({ x: 50, y: 0, z: 50 });

    return territoryManager;
  }

  _createMockTownManager() {
    return {
      getHousingCapacity: () => 10,
      getMaxPopulation: () => 100,
      spawnNPC: () => {},
      updateNPCHappiness: () => {},
      assignNPC: () => true,
      unassignNPC: () => {},
      killNPC: () => {},
      removeNPC: () => {},
      getStatistics: (buildings = []) => {
        return {
          population: {
            alive: 0,
            dead: 0,
            totalSpawned: 0,
            averageSkill: 0
          },
          happiness: {
            average: 0,
            min: 0,
            max: 0
          },
          morale: {
            average: 0,
            min: 0,
            max: 0
          },
          housing: {
            capacity: 10,
            occupied: 0,
            occupancyPercent: 0
          },
          createdAt: Date.now()
        };
      }
    };
  }

  _createMockNPCManager() {
    const npcs = new Map();
    const idleNPCs = new Set();
    const workingNPCs = new Set();
    const restingNPCs = new Set();
    let totalSpawned = 0;

    return {
      npcs: npcs,
      idleNPCs: idleNPCs,
      workingNPCs: workingNPCs,
      restingNPCs: restingNPCs,
      spawnNPC: (role, position) => {
        totalSpawned++;
        const npc = {
          id: totalSpawned,
          role: role || 'WORKER',
          position: position || { x: 0, y: 0, z: 0 },
          health: 100,
          alive: true,
          assignedBuilding: null,
          setWorking: function(working) {
            this.isWorking = working;
          }
        };
        npcs.set(npc.id, npc);
        idleNPCs.add(npc.id);
        return {
          success: true,
          npcId: npc.id,
          npc: npc
        };
      },
      killNPC: (id) => {
        const npc = npcs.get(id);
        if (npc) {
          npc.alive = false;
          npc.health = 0;
          idleNPCs.delete(id);
          workingNPCs.delete(id);
          restingNPCs.delete(id);
        }
      },
      moveToWorking: (npcId) => {
        idleNPCs.delete(npcId);
        workingNPCs.add(npcId);
        // eslint-disable-next-line no-console
        console.log(`[NPCManager] NPC ${npcId} now working`);
      },
      moveToIdle: (npcId) => {
        workingNPCs.delete(npcId);
        restingNPCs.delete(npcId);
        idleNPCs.add(npcId);
        // eslint-disable-next-line no-console
        console.log(`[NPCManager] NPC ${npcId} now idle`);
      },
      moveToResting: (npcId) => {
        idleNPCs.delete(npcId);
        workingNPCs.delete(npcId);
        restingNPCs.add(npcId);
        // eslint-disable-next-line no-console
        console.log(`[NPCManager] NPC ${npcId} now resting`);
      },
      getStatistics: () => {
        const aliveNPCs = Array.from(npcs.values()).filter(n => n.alive);
        const aliveCount = aliveNPCs.length;
        return {
          aliveCount,
          totalSpawned,
          deadCount: totalSpawned - aliveCount,
          percent: totalSpawned > 0 ? (aliveCount / totalSpawned) * 100 : 100
        };
      },
      getAllNPCStates: () => Array.from(npcs.values())
    };
  }

  _createMockNPCAssignment() {
    return {
      registerBuilding: () => {},
      unregisterBuilding: () => {},
      assignNPC: () => true,
      unassignNPC: () => {},
      getNPCsInBuilding: () => [],
      getAssignments: () => ({}),
      getStatistics: () => ({ byBuilding: [] })
    };
  }
}
