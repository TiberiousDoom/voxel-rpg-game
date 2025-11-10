/**
 * GameManager.js - Main game manager entry point
 *
 * Coordinates:
 * - Game initialization
 * - Engine lifecycle
 * - Save/load operations
 * - Error handling
 * - Performance monitoring
 *
 * Public API for:
 * - Starting/stopping games
 * - Saving/loading
 * - Game operations (building, NPC spawning, etc.)
 * - Status and statistics
 */

import GameEngine from './core/GameEngine';
import ModuleOrchestrator from './core/ModuleOrchestrator';
import GridManager from './modules/foundation/GridManager';
import SpatialPartitioning from './modules/foundation/SpatialPartitioning';
import BuildingConfig from './modules/building-types/BuildingConfig';
import TierProgression from './modules/building-types/TierProgression';
import BuildingEffect from './modules/building-types/BuildingEffect';
import ProductionTick from './modules/resource-economy/ProductionTick';
import StorageManager from './modules/resource-economy/StorageManager';
import ConsumptionSystem from './modules/resource-economy/ConsumptionSystem';
import MoraleCalculator from './modules/resource-economy/MoraleCalculator';
import { TerritoryManager } from './modules/territory-town/TerritoryManager';
import TownManager from './modules/territory-town/TownManager';
import { NPCManager } from './modules/npc-system/NPCManager';
import { NPCAssignment } from './modules/npc-system/NPCAssignment';
import BrowserSaveManager from './persistence/BrowserSaveManager';
import GameEngineIntegration from './persistence/GameEngineIntegration';
import PerformanceMonitor from './utils/PerformanceMonitor';
import ErrorRecovery from './utils/ErrorRecovery';

class GameManager {
  /**
   * Game states
   */
  static GAME_STATE = {
    UNINITIALIZED: 'uninitialized',
    INITIALIZED: 'initialized',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    ERRORED: 'errored'
  };

  /**
   * Initialize game manager
   * @param {Object} config - Game configuration
   */
  constructor(config = {}) {
    this.config = {
      savePath: config.savePath || './.saves',
      enableAutoSave: config.enableAutoSave !== false,
      autoSaveInterval: config.autoSaveInterval || 300, // 5 minutes
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      enableErrorRecovery: config.enableErrorRecovery !== false,
      ...config
    };

    this.gameState = GameManager.GAME_STATE.UNINITIALIZED;

    // Core systems
    this.orchestrator = null;
    this.engine = null;

    // Utility systems
    this.saveManager = null;
    this.persistenceIntegration = null;
    this.performanceMonitor = null;
    this.errorRecovery = null;

    // Game event callbacks
    this.eventCallbacks = new Map();
  }

  /**
   * Initialize all game systems
   * @returns {boolean} Success
   */
  initialize() {
    try {
      if (this.gameState !== GameManager.GAME_STATE.UNINITIALIZED) {
        // eslint-disable-next-line no-console
        console.warn('Game already initialized');
        return false;
      }

      // Initialize all core modules in dependency order
      const grid = new GridManager();
      const spatial = new SpatialPartitioning();
      const buildingConfig = new BuildingConfig();
      const tierProgression = new TierProgression(buildingConfig);
      const buildingEffect = new BuildingEffect(spatial, buildingConfig);
      const storage = new StorageManager();
      const productionTick = new ProductionTick(buildingConfig, buildingEffect, storage);
      const consumption = new ConsumptionSystem();

      // Initialize BrowserSaveManager for browser-based persistence
      this.saveManager = new BrowserSaveManager({
        maxLocalStorageSaveSize: 100 * 1024, // 100KB
        useIndexedDB: true
      });
      const morale = new MoraleCalculator();
      const territoryManager = new TerritoryManager(buildingConfig);
      const townManager = new TownManager(buildingConfig);
      const npcManager = new NPCManager(townManager);
      const npcAssignment = new NPCAssignment(buildingConfig);

      // Create orchestrator with all modules
      this.orchestrator = new ModuleOrchestrator({
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
      this.engine = new GameEngine(this.orchestrator);

      // Initialize persistence integration
      this.persistenceIntegration = new GameEngineIntegration(
        this.engine,
        this.orchestrator,
        this.saveManager
      );

      if (this.config.enableAutoSave) {
        this.persistenceIntegration.enable();
        this.persistenceIntegration.enableRollingAutoSave(3);
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor = new PerformanceMonitor(this.engine, this.orchestrator);
        this.performanceMonitor.enable();
      }

      // Initialize error recovery
      if (this.config.enableErrorRecovery) {
        this.errorRecovery = new ErrorRecovery(this.orchestrator, this.saveManager);
        this.errorRecovery.enable();
      }

      this.gameState = GameManager.GAME_STATE.INITIALIZED;
      this._emit('game:initialized', {});

      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this._emit('game:error', { error: err.message });
      return false;
    }
  }

  /**
   * Start the game
   * @param {string} saveSlot - Save slot to load (optional)
   * @returns {boolean} Success
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
      if (saveSlot && this.saveManager.saveExists(saveSlot)) {
        const loadResult = this.saveManager.loadGame(
          saveSlot,
          this.orchestrator,
          this.engine
        );

        if (!loadResult.success) {
          // eslint-disable-next-line no-console
          console.error('Failed to load save:', loadResult.message);
          return false;
        }

        this._emit('game:loaded', { slot: saveSlot, metadata: loadResult.metadata });
      } else {
        // Start fresh game
        const territory = this.orchestrator.territoryManager.createTerritory(
          'territory-1',
          { x: 100, y: 50, z: 100 }
        );

        this._emit('game:reset', { territory: territory.id });
      }

      // Start engine
      await this.engine.start();

      this.gameState = GameManager.GAME_STATE.RUNNING;
      this._emit('game:started', { tick: this.orchestrator.tickCount });

      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to start game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      this._emit('game:error', { error: err.message });
      return false;
    }
  }

  /**
   * Stop the game
   * @returns {boolean} Success
   */
  async stopGame() {
    try {
      if (this.gameState !== GameManager.GAME_STATE.RUNNING &&
          this.gameState !== GameManager.GAME_STATE.PAUSED) {
        return false;
      }

      if (this.engine) {
        await this.engine.stop();
      }

      this.gameState = GameManager.GAME_STATE.STOPPED;
      this._emit('game:stopped', { tick: this.orchestrator.tickCount });

      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to stop game:', err);
      this.gameState = GameManager.GAME_STATE.ERRORED;
      return false;
    }
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (this.engine) {
      this.engine.pause();
      this.gameState = GameManager.GAME_STATE.PAUSED;
      this._emit('game:paused', {});
      return true;
    }
    return false;
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (this.engine) {
      this.engine.resume();
      this.gameState = GameManager.GAME_STATE.RUNNING;
      this._emit('game:resumed', {});
      return true;
    }
    return false;
  }

  /**
   * Save the current game
   * @param {string} slotName - Save slot name
   * @param {string} description - Save description
   * @returns {Object} Save result
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
        this._emit('game:saved', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      const errorResult = {
        success: false,
        message: `Save failed: ${err.message}`,
        error: err
      };

      this._emit('game:error', { error: err.message });
      return errorResult;
    }
  }

  /**
   * Load a saved game
   * @param {string} slotName - Save slot to load
   * @returns {Object} Load result
   */
  loadGame(slotName) {
    try {
      const result = this.saveManager.loadGame(
        slotName,
        this.orchestrator,
        this.engine
      );

      if (result.success) {
        this._emit('game:loaded', { slot: slotName, metadata: result.metadata });
      }

      return result;
    } catch (err) {
      const errorResult = {
        success: false,
        message: `Load failed: ${err.message}`,
        error: err
      };

      this._emit('game:error', { error: err.message });
      return errorResult;
    }
  }

  /**
   * Place a building
   * @param {string} buildingType - Building type
   * @param {Object} position - Position {x, y, z}
   * @returns {Object} Placement result
   */
  placeBuilding(buildingType, position) {
    try {
      const buildingId = `${buildingType.toLowerCase()}-${Date.now()}`;
      const building = {
        id: buildingId,
        type: buildingType,
        position,
        health: 100
      };

      const result = this.orchestrator.placeBuilding(building);

      if (result.success) {
        this._emit('building:placed', { buildingId, type: buildingType });
      }

      return result;
    } catch (err) {
      const errorResult = { success: false, message: err.message };
      this._emit('game:error', { error: err.message });
      return errorResult;
    }
  }

  /**
   * Spawn an NPC
   * @param {string} role - NPC role
   * @param {Object} position - Starting position
   * @returns {Object} NPC or error
   */
  spawnNPC(role, position) {
    try {
      const npc = this.orchestrator.spawnNPC(role, position);
      this._emit('npc:spawned', { npc });
      return npc;
    } catch (err) {
      const errorResult = { error: err.message };
      this._emit('game:error', { error: err.message });
      return errorResult;
    }
  }

  /**
   * Advance to next tier
   * @param {string} targetTier - Target tier
   * @returns {Object} Advancement result
   */
  advanceTier(targetTier) {
    try {
      const result = this.orchestrator.advanceTier(targetTier);

      if (result.success) {
        this._emit('tier:advanced', { tier: targetTier });
      }

      return result;
    } catch (err) {
      const errorResult = { success: false, message: err.message };
      this._emit('game:error', { error: err.message });
      return errorResult;
    }
  }

  /**
   * Get complete game status
   * @returns {Object} Game status
   */
  getGameStatus() {
    return {
      state: this.gameState,
      timestamp: new Date().toISOString(),
      orchestrator: this.orchestrator?.getStatistics() || null,
      engine: this.engine?.getEngineStats() || null,
      performance: this.performanceMonitor?.getSnapshot() || null,
      saves: this.saveManager?.listSaves() || []
    };
  }

  /**
   * Get available save slots
   * @returns {Array} Array of save metadata
   */
  getSaveSlots() {
    return this.saveManager?.listSaves() || [];
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
    }
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

  /**
   * Get version information
   * @returns {Object} Version info
   */
  static getVersion() {
    return {
      major: 1,
      minor: 0,
      patch: 0,
      name: 'Voxel RPG Game MVP',
      status: 'alpha'
    };
  }
}

export default GameManager;
