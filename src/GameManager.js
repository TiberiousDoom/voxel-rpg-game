import EventEmitter from 'events';
import BrowserSaveManager from './persistence/BrowserSaveManager';
import ModuleOrchestrator from './core/ModuleOrchestrator';
import GameEngine from './core/GameEngine';

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
      enableAutoSave: true,
      enablePerformanceMonitoring: false,
      enableErrorRecovery: true,
      ...config
    };

    this.gameState = GameManager.GAME_STATE.UNINITIALIZED;
    this.orchestrator = null;
    this.engine = null;
    this.saveManager = null;
    this.tickTimer = null;
    this.currentTick = 0;
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

      // Create module orchestrator with all game modules
      this.orchestrator = new ModuleOrchestrator(this._createModules());
      
      // Initialize game engine
      this.engine = new GameEngine(this.orchestrator);

      // Set up engine event forwarding
      this._setupEngineEvents();

      this.gameState = GameManager.GAME_STATE.INITIALIZED;
      this.emit('game:initialized', {});

      console.log('[GameManager] Initialization complete');
      return true;
    } catch (err) {
      console.error('[GameManager] Initialization failed:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this.emit('game:error', { error: err.message });
      return false;
    }
  }

  /**
   * Create all game modules
   */
  _createModules() {
    // This would normally import and instantiate all your game modules
    // For now, creating mock modules for demonstration
    return {
      grid: this._createMockGridManager(),
      spatial: this._createMockSpatialPartitioning(),
      buildingConfig: this._createMockBuildingConfig(),
      tierProgression: this._createMockTierProgression(),
      buildingEffect: this._createMockBuildingEffect(),
      productionTick: this._createMockProductionTick(),
      storage: this._createMockStorageManager(),
      consumption: this._createMockConsumptionSystem(),
      morale: this._createMockMoraleCalculator(),
      territoryManager: this._createMockTerritoryManager(),
      townManager: this._createMockTownManager(),
      npcManager: this._createMockNPCManager(),
      npcAssignment: this._createMockNPCAssignment()
    };
  }

  /**
   * Set up event forwarding from engine
   */
  _setupEngineEvents() {
    if (!this.engine) return;

    this.engine.on('tick:start', (data) => {
      this.emit('tick:start', data);
    });

    this.engine.on('tick:complete', (data) => {
      this.currentTick++;
      
      // Update population stats
      const population = this.orchestrator.npcManager.getStatistics();
      
      // Emit tick with full game state
      this.emit('tick:complete', {
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
      this.emit('tick:error', error);
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
        const loadResult = this.saveManager.loadGame(
          saveSlot,
          this.orchestrator,
          this.engine
        );

        if (!loadResult.success) {
          console.error('[GameManager] Failed to load save:', loadResult.message);
          return false;
        }

        this.emit('game:loaded', { slot: saveSlot, metadata: loadResult.metadata });
      }

      // Start the tick timer
      this._startTickTimer();

      this.gameState = GameManager.GAME_STATE.RUNNING;
      
      // Emit started event with current state
      this.emit('game:started', { 
        tick: this.currentTick,
        timestamp: Date.now()
      });

      console.log('[GameManager] Game started successfully');
      return true;
    } catch (err) {
      console.error('[GameManager] Failed to start game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this.emit('game:error', { error: err.message });
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
      this.emit('tick:start', { tick: this.currentTick });

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
      this.emit('tick:complete', {
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
      this.emit('tick:error', { error: err.message, tick: this.currentTick });
    }
  }

  /**
   * Stop the game
   */
  async stopGame() {
    try {
      console.log('[GameManager] Stopping game...');

      // Clear tick timer
      if (this.tickTimer) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }

      this.gameState = GameManager.GAME_STATE.STOPPED;
      this.emit('game:stopped', { tick: this.currentTick });

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
      this.emit('game:paused', {});
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
      this.emit('game:resumed', {});
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

      // Create building through grid manager
      const building = this.orchestrator.grid.placeBuilding(type, position);
      
      if (building) {
        this.emit('building:placed', { 
          buildingId: building.id, 
          type, 
          position 
        });

        // Force an immediate tick update
        this._processTick();

        return { success: true, building };
      }

      return { success: false, message: 'Failed to place building' };
    } catch (err) {
      console.error('[GameManager] Failed to place building:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Spawn an NPC
   */
  spawnNPC(role = 'WORKER') {
    try {
      const npc = this.orchestrator.npcManager.spawnNPC({
        role,
        position: this._getRandomPosition()
      });

      if (npc) {
        // Update population stats
        const stats = this.orchestrator.npcManager.getStatistics();
        
        this.emit('npc:spawned', { 
          npc,
          population: stats
        });

        // Force an immediate tick update
        this._processTick();

        return npc;
      }

      return null;
    } catch (err) {
      console.error('[GameManager] Failed to spawn NPC:', err);
      return null;
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
   * Advance to the next tier
   */
  advanceTier(targetTier) {
    try {
      const result = this.orchestrator.advanceTier(targetTier);
      
      if (result.success) {
        this.emit('tier:advanced', { 
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
   * Save the game
   */
  saveGame(slotName, description = '') {
    try {
      const result = this.saveManager.saveGame(
        this.orchestrator,
        this.engine,
        slotName,
        description
      );

      if (result.success) {
        this.emit('game:saved', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to save game:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Load a saved game
   */
  loadGame(slotName) {
    try {
      const result = this.saveManager.loadGame(
        slotName,
        this.orchestrator,
        this.engine
      );

      if (result.success) {
        this.currentTick = this.orchestrator.tickCount || 0;
        this.emit('game:loaded', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      console.error('[GameManager] Failed to load game:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get available save slots
   */
  getSaveSlots() {
    return this.saveManager ? this.saveManager.getSaveSlots() : [];
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
      isPaused: this.gameState === GameManager.GAME_STATE.PAUSED
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

    console.log('[GameManager] Destroyed');
  }

  // ===== MOCK MODULE CREATORS =====
  // These would normally be real module imports
  
  _createMockGridManager() {
    return {
      placeBuilding: (type, position) => ({
        id: `building-${Date.now()}`,
        type,
        position
      }),
      getAllBuildings: () => []
    };
  }

  _createMockSpatialPartitioning() {
    return {
      insert: () => {},
      query: () => []
    };
  }

  _createMockBuildingConfig() {
    return {
      getBuildingData: (type) => ({
        type,
        cost: { wood: 10, stone: 5 }
      })
    };
  }

  _createMockTierProgression() {
    return {
      canAdvanceToTier: () => ({ canAdvance: true }),
      getRequirementsForTier: () => ({ wood: 100, stone: 50 })
    };
  }

  _createMockBuildingEffect() {
    return {
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

    return {
      getStorage: () => ({ ...storage }),
      getResource: (type) => storage[type] || 0,
      addResource: (type, amount) => {
        storage[type] = (storage[type] || 0) + amount;
      },
      removeResource: (type, amount) => {
        storage[type] = Math.max(0, (storage[type] || 0) - amount);
      }
    };
  }

  /**
   * Emit game event
   * @private
   */
  _emit(event, data) {
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

  _createMockTerritoryManager() {
    return {
      getAllTerritories: () => [],
      createTerritory: (id, bounds) => ({
        id,
        bounds
      })
    };
  }

  _createMockTownManager() {
    return {
      getHousingCapacity: () => 10
    };
  }

  _createMockNPCManager() {
    const npcs = [];
    let totalSpawned = 0;

    return {
      spawnNPC: (config) => {
        totalSpawned++;
        const npc = {
          id: `npc-${totalSpawned}`,
          role: config.role || 'WORKER',
          position: config.position || { x: 0, y: 0, z: 0 },
          health: 100,
          alive: true
        };
        npcs.push(npc);
        return npc;
      },
      killNPC: (id) => {
        const npc = npcs.find(n => n.id === id);
        if (npc) {
          npc.alive = false;
          npc.health = 0;
        }
      },
      getStatistics: () => {
        const aliveCount = npcs.filter(n => n.alive).length;
        return {
          aliveCount,
          totalSpawned,
          deadCount: totalSpawned - aliveCount,
          percent: totalSpawned > 0 ? (aliveCount / totalSpawned) * 100 : 100
        };
      },
      getAllNPCStates: () => npcs
    };
  }

  _createMockNPCAssignment() {
    return {
      assignNPC: () => {},
      unassignNPC: () => {},
      getAssignments: () => ({})
    };
  }
}
