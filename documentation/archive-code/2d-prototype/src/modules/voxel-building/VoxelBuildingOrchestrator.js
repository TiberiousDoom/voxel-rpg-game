/**
 * VoxelBuildingOrchestrator.js - Integration layer for voxel building systems
 *
 * This orchestrator coordinates all voxel building-related modules:
 * - VoxelWorld: Block storage and terrain
 * - StockpileManager: Resource storage zones
 * - ConstructionManager: Blueprint and construction sites
 * - HaulingManager: Material transport tasks
 * - BuilderManager: NPC builder behavior
 * - JobManager: Unified job queue
 *
 * Part of Phase 9: Module Integration
 *
 * Usage:
 *   const voxelBuilding = new VoxelBuildingOrchestrator();
 *   voxelBuilding.initialize({ npcManager, pathfindingService });
 *
 *   // In game loop:
 *   voxelBuilding.update(deltaTime, gameState);
 */

import { VoxelWorld } from '../voxel/VoxelWorld.js';
import { StockpileManager } from '../stockpile/StockpileManager.js';
import { ConstructionManager } from '../construction/ConstructionManager.js';
import { HaulingManager } from '../hauling/HaulingManager.js';
import { BuilderManager } from '../building/BuilderBehavior.js';
import { JobManager } from '../jobs/JobManager.js';
import { TerrainToVoxelConverter } from './TerrainToVoxelConverter.js';
import { GatheringManager } from '../gathering/GatheringManager.js';
import { VoxelWorkerBehavior } from './VoxelWorkerBehavior.js';
import { VoxelIdleTaskProvider } from './VoxelIdleTasks.js';

/**
 * VoxelBuildingOrchestrator - Coordinates voxel building systems
 */
export class VoxelBuildingOrchestrator {
  /**
   * Create the voxel building orchestrator
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    // Initialize subsystems
    this.voxelWorld = new VoxelWorld({
      chunkSize: config.chunkSize || 32,
      maxHeight: config.maxHeight || 16
    });

    this.stockpileManager = new StockpileManager();

    this.constructionManager = new ConstructionManager({
      voxelWorld: this.voxelWorld
    });

    this.haulingManager = new HaulingManager({
      stockpileManager: this.stockpileManager,
      constructionManager: this.constructionManager
    });

    this.builderManager = new BuilderManager({
      haulingManager: this.haulingManager,
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager
    });

    this.jobManager = new JobManager({
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager,
      haulingManager: this.haulingManager
    });

    // Gathering manager for mining tasks
    this.gatheringManager = new GatheringManager({
      voxelWorld: this.voxelWorld,
      stockpileManager: this.stockpileManager,
      haulingManager: this.haulingManager,
      autoCreateHaulTask: config.autoCreateHaulTask !== false
    });

    // Worker behavior for NPC integration
    this.voxelWorkerBehavior = new VoxelWorkerBehavior({
      voxelOrchestrator: this,
      miningRange: config.miningRange || 1.5,
      buildRange: config.buildRange || 1.5
    });

    // Idle task provider for NPC idle system integration
    this.idleTaskProvider = new VoxelIdleTaskProvider({
      voxelOrchestrator: this,
      voxelWorkerBehavior: this.voxelWorkerBehavior
    });

    // Terrain converter (set via initialize when terrainSystem available)
    this.terrainConverter = null;

    // External references (set via initialize)
    this.npcManager = null;
    this.pathfindingService = null;
    this.terrainSystem = null;

    // State
    this.enabled = true;
    this.initialized = false;

    // Statistics
    this.stats = {
      totalBlocksPlaced: 0,
      totalBlocksRemoved: 0,
      totalSitesCompleted: 0,
      totalResourcesHauled: 0
    };

    // Event callbacks
    this.onSiteStarted = config.onSiteStarted || null;
    this.onSiteCompleted = config.onSiteCompleted || null;
    this.onBlockPlaced = config.onBlockPlaced || null;
  }

  /**
   * Initialize with external dependencies
   * @param {object} dependencies - External manager references
   */
  initialize(dependencies = {}) {
    if (dependencies.npcManager) {
      this.npcManager = dependencies.npcManager;
      this.voxelWorkerBehavior.setReferences({
        npcManager: dependencies.npcManager
      });
    }

    if (dependencies.pathfindingService) {
      this.pathfindingService = dependencies.pathfindingService;
      this.haulingManager.pathfindingService = dependencies.pathfindingService;
      this.voxelWorkerBehavior.setReferences({
        pathfindingService: dependencies.pathfindingService
      });
    }

    // Initialize terrain converter if terrain system provided
    if (dependencies.terrainSystem) {
      this.terrainSystem = dependencies.terrainSystem;
      this.terrainConverter = new TerrainToVoxelConverter(
        this.terrainSystem,
        this.voxelWorld,
        dependencies.terrainConverterConfig || {}
      );
    }

    // Wire up cross-references
    this.haulingManager.setManagers({
      stockpileManager: this.stockpileManager,
      constructionManager: this.constructionManager,
      pathfindingService: this.pathfindingService
    });

    this.builderManager.setManagers({
      haulingManager: this.haulingManager,
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager,
      jobManager: this.jobManager
    });

    this.jobManager.setManagers({
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager,
      haulingManager: this.haulingManager
    });

    // Register event handlers
    this.constructionManager.onSiteCompleted = (site) => {
      this.stats.totalSitesCompleted++;
      if (this.onSiteCompleted) {
        this.onSiteCompleted(site);
      }
    };

    this.initialized = true;
  }

  /**
   * Update all voxel building systems
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} gameState - Current game state
   * @returns {object} Update result
   */
  update(deltaTime, gameState) {
    if (!this.enabled || !this.initialized) {
      return { skipped: true };
    }

    const result = {
      hauling: null,
      building: null,
      jobs: null,
      construction: null,
      gathering: null,
      workers: null
    };

    // Update job manager first (creates jobs from construction needs)
    this.jobManager.update(deltaTime, gameState);
    result.jobs = this.jobManager.getStats();

    // Update gathering (mining) tasks
    if (this.gatheringManager) {
      result.gathering = this.gatheringManager.getStats();
    }

    // Update voxel worker behavior (NPC work assignments)
    if (this.voxelWorkerBehavior) {
      this.voxelWorkerBehavior.update(deltaTime);
      result.workers = this.voxelWorkerBehavior.getStats();
    }

    // Update hauling tasks
    this.haulingManager.update(deltaTime, gameState);
    result.hauling = this.haulingManager.getStats();

    // Update builder NPCs
    const builderActions = this.builderManager.update(deltaTime, gameState);
    result.building = {
      actions: builderActions.size,
      stats: this.builderManager.getStats()
    };

    // Update construction sites (check for completions)
    this._updateConstructionSites(deltaTime);
    result.construction = {
      activeSites: this.constructionManager.getActiveSites().length,
      completedSites: this.stats.totalSitesCompleted
    };

    // Apply builder actions to NPCs
    this._applyBuilderActions(builderActions);

    return result;
  }

  /**
   * Update construction site progress
   * @private
   */
  _updateConstructionSites(deltaTime) {
    const sites = this.constructionManager.getActiveSites();

    for (const site of sites) {
      // Check if site is complete
      if (site.isComplete()) {
        this.constructionManager.completeSite(site.id);
      }
    }
  }

  /**
   * Apply builder actions to NPC movement system
   * @private
   */
  _applyBuilderActions(actions) {
    if (!this.npcManager) return;

    for (const [npcId, action] of actions) {
      const npc = this.npcManager.getNPC?.(npcId);
      if (!npc) continue;

      if (action.action === 'move_to' && action.targetPosition) {
        // Set NPC target position
        if (this.pathfindingService) {
          const path = this.pathfindingService.findPath(
            npc.position,
            action.targetPosition
          );
          if (path) {
            npc.currentPath = path;
            npc.pathIndex = 0;
            npc.isMoving = true;
          }
        }
      } else if (action.action === 'build') {
        // NPC is building (stationary animation)
        npc.isBuilding = true;
        npc.isMoving = false;
      } else if (action.action === 'idle') {
        npc.isBuilding = false;
      }

      // Track carrying state for visuals
      npc.isCarrying = action.isCarrying || false;
      npc.carryingResource = action.carryingResource || null;
    }
  }

  // ========================================
  // PUBLIC API: Stockpile Management
  // ========================================

  /**
   * Create a new stockpile zone
   * @param {object} config - Stockpile configuration
   * @returns {object} Created stockpile
   */
  createStockpile(config) {
    return this.stockpileManager.createStockpile(config);
  }

  /**
   * Remove a stockpile
   * @param {string} stockpileId - Stockpile ID
   * @returns {boolean}
   */
  removeStockpile(stockpileId) {
    return this.stockpileManager.removeStockpile(stockpileId);
  }

  /**
   * Deposit resources into stockpiles
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to deposit
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {number} Amount deposited
   */
  depositResource(resourceType, quantity, x, y) {
    return this.stockpileManager.depositResource(resourceType, quantity, x, y);
  }

  /**
   * Get total resources across all stockpiles
   * @returns {Map<string, number>}
   */
  getAllResources() {
    return this.stockpileManager.getAllResources();
  }

  // ========================================
  // PUBLIC API: Construction Management
  // ========================================

  /**
   * Start construction of a building from a blueprint
   * @param {string} blueprintId - Blueprint ID or template name
   * @param {object} position - World position {x, y, z}
   * @param {object} options - Construction options
   * @returns {object | null} Created construction site
   */
  startConstruction(blueprintId, position, options = {}) {
    const blueprint = this.constructionManager.getBlueprint(blueprintId);
    if (!blueprint) {
      return null;
    }

    const site = this.constructionManager.createSite(blueprint, position, {
      priority: options.priority || 50,
      ...options
    });

    if (site && this.onSiteStarted) {
      this.onSiteStarted(site);
    }

    return site;
  }

  /**
   * Cancel a construction site
   * @param {string} siteId - Construction site ID
   * @returns {boolean}
   */
  cancelConstruction(siteId) {
    // Cancel related jobs
    this.jobManager.cancelSiteJobs(siteId);

    // Remove the site
    return this.constructionManager.removeSite(siteId);
  }

  /**
   * Get all active construction sites
   * @returns {array}
   */
  getActiveSites() {
    return this.constructionManager.getActiveSites();
  }

  /**
   * Register a blueprint template
   * @param {object} blueprint - Blueprint definition
   */
  registerBlueprint(blueprint) {
    this.constructionManager.registerBlueprint(blueprint);
  }

  /**
   * Load predefined building templates
   */
  async loadDefaultTemplates() {
    try {
      const { SURVIVAL_TEMPLATES } = await import('../construction/templates/SurvivalTemplates.js');
      const { SETTLEMENT_TEMPLATES } = await import('../construction/templates/SettlementTemplates.js');

      for (const template of Object.values(SURVIVAL_TEMPLATES)) {
        this.constructionManager.registerBlueprint(template);
      }

      for (const template of Object.values(SETTLEMENT_TEMPLATES)) {
        this.constructionManager.registerBlueprint(template);
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  // ========================================
  // PUBLIC API: Builder NPC Management
  // ========================================

  /**
   * Register an NPC as a builder
   * @param {string} npcId - NPC identifier
   * @returns {object} Builder controller
   */
  registerBuilder(npcId) {
    return this.builderManager.registerBuilder(npcId);
  }

  /**
   * Unregister a builder NPC
   * @param {string} npcId - NPC identifier
   */
  unregisterBuilder(npcId) {
    this.builderManager.unregisterBuilder(npcId);
  }

  /**
   * Get all registered builder IDs
   * @returns {string[]}
   */
  getBuilderIds() {
    return this.builderManager.getBuilderIds();
  }

  // ========================================
  // PUBLIC API: Mining & Gathering
  // ========================================

  /**
   * Designate a block for mining
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @param {object} options - Mining options
   * @returns {object|null} Mining task
   */
  designateMining(x, y, z, options = {}) {
    if (!this.gatheringManager) return null;
    return this.gatheringManager.designateMining(x, y, z, options);
  }

  /**
   * Designate a region for mining
   * @param {object} min - Minimum corner {x, y, z}
   * @param {object} max - Maximum corner {x, y, z}
   * @param {object} options - Mining options
   * @returns {array} Created mining tasks
   */
  designateMiningRegion(min, max, options = {}) {
    if (!this.gatheringManager) return [];
    return this.gatheringManager.designateMiningRegion(min, max, options);
  }

  /**
   * Cancel mining designation at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {boolean}
   */
  cancelMining(x, y, z) {
    if (!this.gatheringManager) return false;
    return this.gatheringManager.cancelMining(x, y, z);
  }

  /**
   * Get mining task at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {object|null}
   */
  getMiningTask(x, y, z) {
    if (!this.gatheringManager) return null;
    return this.gatheringManager.getTaskAtPosition(x, y, z);
  }

  /**
   * Get all pending mining tasks
   * @returns {array}
   */
  getPendingMiningTasks() {
    if (!this.gatheringManager) return [];
    return this.gatheringManager.getPendingTasks();
  }

  // ========================================
  // PUBLIC API: Voxel Workers
  // ========================================

  /**
   * Register an NPC as a voxel worker
   * @param {string} npcId - NPC identifier
   */
  registerVoxelWorker(npcId) {
    if (this.voxelWorkerBehavior) {
      this.voxelWorkerBehavior.registerWorker(npcId);
    }
  }

  /**
   * Unregister an NPC from voxel work
   * @param {string} npcId - NPC identifier
   */
  unregisterVoxelWorker(npcId) {
    if (this.voxelWorkerBehavior) {
      this.voxelWorkerBehavior.unregisterWorker(npcId);
    }
  }

  /**
   * Get voxel worker state
   * @param {string} npcId - NPC identifier
   * @returns {string}
   */
  getVoxelWorkerState(npcId) {
    if (!this.voxelWorkerBehavior) return 'idle';
    return this.voxelWorkerBehavior.getWorkerState(npcId);
  }

  /**
   * Check if voxel work is available for an NPC
   * @param {object} npc - NPC object
   * @returns {object|null} Available task
   */
  getAvailableVoxelTask(npc) {
    if (!this.idleTaskProvider) return null;
    return this.idleTaskProvider.getAvailableTask(npc);
  }

  /**
   * Get all registered voxel worker IDs
   * @returns {string[]}
   */
  getVoxelWorkerIds() {
    if (!this.voxelWorkerBehavior) return [];
    return Array.from(this.voxelWorkerBehavior.registeredWorkers);
  }

  // ========================================
  // PUBLIC API: Voxel World
  // ========================================

  /**
   * Get block at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {number} Block type
   */
  getBlock(x, y, z) {
    return this.voxelWorld.getBlock(x, y, z);
  }

  /**
   * Set block at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @param {number} blockType - Block type
   * @returns {boolean}
   */
  setBlock(x, y, z, blockType) {
    const result = this.voxelWorld.setBlock(x, y, z, blockType);
    if (result) {
      this.stats.totalBlocksPlaced++;
      if (this.onBlockPlaced) {
        this.onBlockPlaced({ x, y, z, blockType });
      }
    }
    return result;
  }

  /**
   * Get blocks in a region
   * @param {object} min - Minimum corner {x, y, z}
   * @param {object} max - Maximum corner {x, y, z}
   * @returns {array} Block data
   */
  getBlocksInRegion(min, max) {
    return this.voxelWorld.getBlocksInRegion(min, max);
  }

  // ========================================
  // PUBLIC API: Terrain Conversion
  // ========================================

  /**
   * Convert terrain heightmap to voxel blocks for a region
   * @param {number} startX - Start X coordinate
   * @param {number} startZ - Start Z coordinate
   * @param {number} width - Width in tiles
   * @param {number} depth - Depth in tiles
   * @returns {object | null} Conversion result or null if no converter
   */
  convertTerrainRegion(startX, startZ, width, depth) {
    if (!this.terrainConverter) {
      return null;
    }
    return this.terrainConverter.convertRegion(startX, startZ, width, depth);
  }

  /**
   * Convert terrain for a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @param {number} chunkSize - Chunk size in tiles (default: 32)
   * @returns {object | null} Conversion result or null if no converter
   */
  convertTerrainChunk(chunkX, chunkZ, chunkSize = 32) {
    if (!this.terrainConverter) {
      return null;
    }
    return this.terrainConverter.convertChunk(chunkX, chunkZ, chunkSize);
  }

  /**
   * Get the voxel surface level at a terrain position
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Voxel Z level of surface
   */
  getVoxelSurfaceLevel(x, z) {
    if (!this.terrainConverter) {
      return 0;
    }
    return this.terrainConverter.getVoxelSurfaceLevel(x, z);
  }

  /**
   * Check if terrain converter is available
   * @returns {boolean}
   */
  hasTerrainConverter() {
    return this.terrainConverter !== null;
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  /**
   * Enable/disable the voxel building system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.haulingManager.setEnabled(enabled);
    this.builderManager.setEnabled(enabled);
    this.jobManager.setEnabled(enabled);
    if (this.voxelWorkerBehavior) {
      this.voxelWorkerBehavior.setEnabled(enabled);
    }
    if (this.idleTaskProvider) {
      this.idleTaskProvider.setEnabled(enabled);
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      voxelWorld: {
        loadedChunks: this.voxelWorld.getLoadedChunkCount?.() || 0
      },
      stockpiles: this.stockpileManager.getStats?.() || {},
      construction: {
        activeSites: this.constructionManager.getActiveSites?.()?.length || 0,
        blueprints: this.constructionManager.getBlueprintCount?.() || 0
      },
      hauling: this.haulingManager.getStats?.() || {},
      building: this.builderManager.getStats?.() || {},
      jobs: this.jobManager.getStats?.() || {},
      gathering: this.gatheringManager?.getStats?.() || {},
      workers: this.voxelWorkerBehavior?.getStats?.() || {},
      terrainConversion: this.terrainConverter ? this.terrainConverter.getStats() : null
    };
  }

  /**
   * Export full state for save/load
   * @returns {object}
   */
  toJSON() {
    return {
      voxelWorld: this.voxelWorld.toJSON(),
      stockpileManager: this.stockpileManager.toJSON(),
      constructionManager: this.constructionManager.toJSON(),
      haulingManager: this.haulingManager.toJSON(),
      jobManager: this.jobManager.toJSON(),
      gatheringManager: this.gatheringManager?.toJSON?.() || null,
      voxelWorkerBehavior: this.voxelWorkerBehavior?.toJSON?.() || null,
      stats: this.stats,
      enabled: this.enabled
    };
  }

  /**
   * Import state from save data
   * @param {object} data
   */
  fromJSON(data) {
    if (data.voxelWorld) {
      this.voxelWorld.fromJSON(data.voxelWorld);
    }

    if (data.stockpileManager) {
      this.stockpileManager.fromJSON(data.stockpileManager);
    }

    if (data.constructionManager) {
      this.constructionManager.fromJSON(data.constructionManager);
    }

    if (data.haulingManager) {
      this.haulingManager.fromJSON(data.haulingManager);
    }

    if (data.jobManager) {
      this.jobManager.fromJSON(data.jobManager);
    }

    if (data.gatheringManager && this.gatheringManager?.fromJSON) {
      this.gatheringManager.fromJSON(data.gatheringManager);
    }

    if (data.voxelWorkerBehavior && this.voxelWorkerBehavior?.fromJSON) {
      this.voxelWorkerBehavior.fromJSON(data.voxelWorkerBehavior);
    }

    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    this.enabled = data.enabled !== false;
  }

  /**
   * Reset all systems to initial state
   */
  reset() {
    this.voxelWorld.reset();
    this.stockpileManager = new StockpileManager();
    this.constructionManager = new ConstructionManager({
      voxelWorld: this.voxelWorld
    });

    // Re-wire managers
    this.haulingManager.setManagers({
      stockpileManager: this.stockpileManager,
      constructionManager: this.constructionManager
    });

    this.builderManager = new BuilderManager({
      haulingManager: this.haulingManager,
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager
    });

    this.jobManager = new JobManager({
      constructionManager: this.constructionManager,
      stockpileManager: this.stockpileManager,
      haulingManager: this.haulingManager
    });

    // Reset gathering manager
    if (this.gatheringManager?.reset) {
      this.gatheringManager.reset();
    }

    // Reset worker behavior
    if (this.voxelWorkerBehavior?.reset) {
      this.voxelWorkerBehavior.reset();
    }

    this.stats = {
      totalBlocksPlaced: 0,
      totalBlocksRemoved: 0,
      totalSitesCompleted: 0,
      totalResourcesHauled: 0
    };
  }
}

export default VoxelBuildingOrchestrator;
