/**
 * VoxelWorkerBehavior.js - NPC behavior for voxel building tasks
 *
 * Integrates NPCs with the voxel building system, enabling them to:
 * - Mine designated blocks
 * - Haul resources to stockpiles
 * - Build structures from blueprints
 *
 * Part of Phase 18: Connect NPC AI to Building System
 */

import { MiningTaskStatus } from '../gathering/MiningTask.js';

/**
 * Voxel work task types
 */
export const VoxelTaskType = {
  MINE: 'voxel_mine',
  HAUL: 'voxel_haul',
  BUILD: 'voxel_build',
  IDLE: 'voxel_idle'
};

/**
 * Voxel worker states
 */
export const VoxelWorkerState = {
  IDLE: 'idle',
  SEEKING_TASK: 'seeking_task',
  TRAVELING_TO_TASK: 'traveling_to_task',
  MINING: 'mining',
  HAULING_PICKUP: 'hauling_pickup',
  HAULING_DELIVERY: 'hauling_delivery',
  BUILDING: 'building',
  RETURNING: 'returning'
};

/**
 * VoxelWorkerBehavior - Manages NPC voxel work behavior
 */
export class VoxelWorkerBehavior {
  /**
   * Create voxel worker behavior manager
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    // External references
    this.npcManager = config.npcManager || null;
    this.voxelOrchestrator = config.voxelOrchestrator || null;
    this.pathfindingService = config.pathfindingService || null;

    // Worker tracking
    this.workerStates = new Map(); // npcId -> VoxelWorkerState
    this.workerTasks = new Map(); // npcId -> current task info
    this.registeredWorkers = new Set(); // npcIds that can do voxel work

    // Configuration
    this.config = {
      miningRange: config.miningRange || 1.5,
      buildRange: config.buildRange || 1.5,
      pickupRange: config.pickupRange || 1.0,
      workTickRate: config.workTickRate || 1, // Work progress per tick
      taskSearchRadius: config.taskSearchRadius || 50,
      ...config
    };

    // Statistics
    this.stats = {
      blocksMinedByNpcs: 0,
      blocksPlacedByNpcs: 0,
      resourcesHauled: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };

    // State
    this.enabled = true;
  }

  /**
   * Set external references
   * @param {object} refs - External references
   */
  setReferences(refs) {
    if (refs.npcManager) this.npcManager = refs.npcManager;
    if (refs.voxelOrchestrator) this.voxelOrchestrator = refs.voxelOrchestrator;
    if (refs.pathfindingService) this.pathfindingService = refs.pathfindingService;
  }

  /**
   * Register an NPC as a voxel worker
   * @param {string} npcId - NPC ID
   */
  registerWorker(npcId) {
    this.registeredWorkers.add(npcId);
    this.workerStates.set(npcId, VoxelWorkerState.IDLE);
  }

  /**
   * Unregister an NPC from voxel work
   * @param {string} npcId - NPC ID
   */
  unregisterWorker(npcId) {
    // Cancel any current task
    this._abandonTask(npcId);
    this.registeredWorkers.delete(npcId);
    this.workerStates.delete(npcId);
    this.workerTasks.delete(npcId);
  }

  /**
   * Check if NPC is registered for voxel work
   * @param {string} npcId - NPC ID
   * @returns {boolean}
   */
  isWorkerRegistered(npcId) {
    return this.registeredWorkers.has(npcId);
  }

  /**
   * Get worker's current state
   * @param {string} npcId - NPC ID
   * @returns {string}
   */
  getWorkerState(npcId) {
    return this.workerStates.get(npcId) || VoxelWorkerState.IDLE;
  }

  /**
   * Get worker's current task
   * @param {string} npcId - NPC ID
   * @returns {object|null}
   */
  getWorkerTask(npcId) {
    return this.workerTasks.get(npcId) || null;
  }

  /**
   * Update all voxel workers
   * @param {number} deltaTime - Time elapsed
   */
  update(deltaTime = 1) {
    if (!this.enabled) return;

    for (const npcId of this.registeredWorkers) {
      this._updateWorker(npcId, deltaTime);
    }
  }

  /**
   * Update a single worker
   * @private
   */
  _updateWorker(npcId, deltaTime) {
    const state = this.workerStates.get(npcId);
    const npc = this._getNpc(npcId);

    if (!npc || !npc.alive) {
      this._abandonTask(npcId);
      return;
    }

    // Check if NPC is too tired or hungry
    if (this._shouldRestOrEat(npc)) {
      this._abandonTask(npcId);
      return;
    }

    switch (state) {
      case VoxelWorkerState.IDLE:
        this._handleIdleState(npcId, npc);
        break;

      case VoxelWorkerState.SEEKING_TASK:
        this._handleSeekingTaskState(npcId, npc);
        break;

      case VoxelWorkerState.TRAVELING_TO_TASK:
        this._handleTravelingState(npcId, npc, deltaTime);
        break;

      case VoxelWorkerState.MINING:
        this._handleMiningState(npcId, npc, deltaTime);
        break;

      case VoxelWorkerState.HAULING_PICKUP:
        this._handleHaulingPickupState(npcId, npc, deltaTime);
        break;

      case VoxelWorkerState.HAULING_DELIVERY:
        this._handleHaulingDeliveryState(npcId, npc, deltaTime);
        break;

      case VoxelWorkerState.BUILDING:
        this._handleBuildingState(npcId, npc, deltaTime);
        break;

      case VoxelWorkerState.RETURNING:
        this._handleReturningState(npcId, npc, deltaTime);
        break;

      default:
        this.workerStates.set(npcId, VoxelWorkerState.IDLE);
    }
  }

  /**
   * Handle idle state - look for work
   * @private
   */
  _handleIdleState(npcId, npc) {
    // Transition to seeking task
    this.workerStates.set(npcId, VoxelWorkerState.SEEKING_TASK);
  }

  /**
   * Handle seeking task state - find available work
   * @private
   */
  _handleSeekingTaskState(npcId, npc) {
    const task = this._findBestTask(npcId, npc);

    if (task) {
      this.workerTasks.set(npcId, task);
      this._startTravelingToTask(npcId, npc, task);
    } else {
      // No tasks available, return to idle
      this.workerStates.set(npcId, VoxelWorkerState.IDLE);
    }
  }

  /**
   * Handle traveling state - move toward task location
   * @private
   */
  _handleTravelingState(npcId, npc, deltaTime) {
    const task = this.workerTasks.get(npcId);
    if (!task) {
      this.workerStates.set(npcId, VoxelWorkerState.IDLE);
      return;
    }

    // Check if arrived at task location
    const distance = this._getDistance(npc.position, task.targetPosition);
    const range = this._getTaskRange(task.type);

    if (distance <= range) {
      // Arrived, start working
      this._startWorking(npcId, npc, task);
    }
    // Movement is handled by NPC's own movement system
  }

  /**
   * Handle mining state - mine the block
   * @private
   */
  _handleMiningState(npcId, npc, deltaTime) {
    const task = this.workerTasks.get(npcId);
    if (!task || !task.miningTaskId) {
      this._completeTask(npcId, false);
      return;
    }

    const gatheringManager = this.voxelOrchestrator?.gatheringManager;
    if (!gatheringManager) {
      this._completeTask(npcId, false);
      return;
    }

    // Get the mining task
    const miningTask = gatheringManager.miningTasks.get(task.miningTaskId);
    if (!miningTask) {
      this._completeTask(npcId, false);
      return;
    }

    // Ensure task is in mining state
    if (miningTask.status === MiningTaskStatus.ASSIGNED) {
      miningTask.startTraveling();
    }
    if (miningTask.status === MiningTaskStatus.TRAVELING) {
      miningTask.startMining();
    }

    // Apply tool modifier based on NPC skills
    const skillModifier = this._getSkillModifier(npc, 'mining');
    const workAmount = this.config.workTickRate * deltaTime * skillModifier;

    // Update mining progress
    const result = gatheringManager.updateMiningProgress(task.miningTaskId, workAmount);

    if (result) {
      // Mining complete!
      this.stats.blocksMinedByNpcs++;
      this.stats.tasksCompleted++;

      // Add resources to NPC inventory or drop on ground
      if (result.resources && result.resources.length > 0) {
        this._handleMinedResources(npcId, npc, result.resources, result.position);
      }

      this._completeTask(npcId, true);
    }
  }

  /**
   * Handle hauling pickup state
   * @private
   */
  _handleHaulingPickupState(npcId, npc, deltaTime) {
    const task = this.workerTasks.get(npcId);
    if (!task || !task.haulingTaskId) {
      this._completeTask(npcId, false);
      return;
    }

    const haulingManager = this.voxelOrchestrator?.haulingManager;
    if (!haulingManager) {
      this._completeTask(npcId, false);
      return;
    }

    // Check if at pickup location
    const distance = this._getDistance(npc.position, task.pickupPosition);
    if (distance > this.config.pickupRange) {
      // Not there yet, keep traveling
      return;
    }

    // Pick up the resource
    const haulingTask = haulingManager.getTask(task.haulingTaskId);
    if (!haulingTask) {
      this._completeTask(npcId, false);
      return;
    }

    // Mark as picked up
    haulingTask.pickup();
    task.carrying = {
      type: haulingTask.resourceType,
      amount: haulingTask.quantity
    };

    // Now travel to delivery
    task.targetPosition = { ...task.deliveryPosition };
    this._setNpcTarget(npcId, npc, task.deliveryPosition);
    this.workerStates.set(npcId, VoxelWorkerState.HAULING_DELIVERY);
  }

  /**
   * Handle hauling delivery state
   * @private
   */
  _handleHaulingDeliveryState(npcId, npc, deltaTime) {
    const task = this.workerTasks.get(npcId);
    if (!task || !task.haulingTaskId) {
      this._completeTask(npcId, false);
      return;
    }

    // Check if at delivery location
    const distance = this._getDistance(npc.position, task.deliveryPosition);
    if (distance > this.config.pickupRange) {
      // Not there yet
      return;
    }

    const haulingManager = this.voxelOrchestrator?.haulingManager;
    const stockpileManager = this.voxelOrchestrator?.stockpileManager;

    if (!haulingManager || !stockpileManager) {
      this._completeTask(npcId, false);
      return;
    }

    // Deliver to stockpile
    const haulingTask = haulingManager.getTask(task.haulingTaskId);
    if (haulingTask && task.carrying) {
      // Find stockpile at delivery location
      const stockpile = stockpileManager.getStockpileAtPosition(
        task.deliveryPosition.x,
        task.deliveryPosition.y,
        task.deliveryPosition.z
      );

      if (stockpile) {
        stockpile.addResource(task.carrying.type, task.carrying.amount);
      }

      haulingTask.deliver();
      haulingManager.completeTask(task.haulingTaskId);

      this.stats.resourcesHauled += task.carrying.amount;
      this.stats.tasksCompleted++;
    }

    task.carrying = null;
    this._completeTask(npcId, true);
  }

  /**
   * Handle building state
   * @private
   */
  _handleBuildingState(npcId, npc, deltaTime) {
    const task = this.workerTasks.get(npcId);
    if (!task || !task.constructionSiteId) {
      this._completeTask(npcId, false);
      return;
    }

    const constructionManager = this.voxelOrchestrator?.constructionManager;
    if (!constructionManager) {
      this._completeTask(npcId, false);
      return;
    }

    const site = constructionManager.getSite(task.constructionSiteId);
    if (!site) {
      this._completeTask(npcId, false);
      return;
    }

    // Get next block to build
    const blockToBuild = site.getNextBuildableBlock();
    if (!blockToBuild) {
      // No more blocks to build at this site
      this._completeTask(npcId, true);
      return;
    }

    // Apply skill modifier
    const skillModifier = this._getSkillModifier(npc, 'building');
    const workAmount = this.config.workTickRate * deltaTime * skillModifier;

    // Update build progress
    const result = constructionManager.updateBuildProgress(
      task.constructionSiteId,
      blockToBuild.x,
      blockToBuild.y,
      blockToBuild.z,
      workAmount
    );

    if (result && result.blockPlaced) {
      this.stats.blocksPlacedByNpcs++;

      // Check if site is complete
      if (site.isComplete()) {
        this.stats.tasksCompleted++;
        this._completeTask(npcId, true);
      }
      // Otherwise continue building next block
    }
  }

  /**
   * Handle returning state - go back to idle position
   * @private
   */
  _handleReturningState(npcId, npc, deltaTime) {
    // Just transition to idle, NPC will handle its own idle behavior
    this.workerStates.set(npcId, VoxelWorkerState.IDLE);
  }

  /**
   * Find best available task for worker
   * @private
   */
  _findBestTask(npcId, npc) {
    if (!this.voxelOrchestrator) return null;

    const position = npc.position;
    let bestTask = null;
    let bestScore = -Infinity;

    // Check mining tasks
    const gatheringManager = this.voxelOrchestrator.gatheringManager;
    if (gatheringManager) {
      const miningTask = gatheringManager.getAvailableTask(npcId, position);
      if (miningTask) {
        const score = this._scoreTask(npc, {
          type: VoxelTaskType.MINE,
          position: miningTask.position,
          priority: miningTask.priority
        });
        if (score > bestScore) {
          bestScore = score;
          bestTask = {
            type: VoxelTaskType.MINE,
            miningTaskId: miningTask.id,
            targetPosition: { ...miningTask.position },
            priority: miningTask.priority
          };
        }
      }
    }

    // Check hauling tasks
    const haulingManager = this.voxelOrchestrator.haulingManager;
    if (haulingManager) {
      const haulingTask = haulingManager.getAvailableTask?.(npcId, position);
      if (haulingTask) {
        const score = this._scoreTask(npc, {
          type: VoxelTaskType.HAUL,
          position: haulingTask.sourcePosition,
          priority: haulingTask.priority
        });
        if (score > bestScore) {
          bestScore = score;
          bestTask = {
            type: VoxelTaskType.HAUL,
            haulingTaskId: haulingTask.id,
            targetPosition: { ...haulingTask.sourcePosition },
            pickupPosition: { ...haulingTask.sourcePosition },
            deliveryPosition: { ...haulingTask.destinationPosition },
            priority: haulingTask.priority
          };
        }
      }
    }

    // Check construction tasks
    const constructionManager = this.voxelOrchestrator.constructionManager;
    if (constructionManager) {
      const buildSite = constructionManager.getAvailableSite?.(npcId, position);
      if (buildSite) {
        const score = this._scoreTask(npc, {
          type: VoxelTaskType.BUILD,
          position: buildSite.position,
          priority: buildSite.priority || 50
        });
        if (score > bestScore) {
          bestScore = score;
          bestTask = {
            type: VoxelTaskType.BUILD,
            constructionSiteId: buildSite.id,
            targetPosition: { ...buildSite.position },
            priority: buildSite.priority || 50
          };
        }
      }
    }

    // Assign the task if found
    if (bestTask) {
      this._assignTask(npcId, bestTask);
    }

    return bestTask;
  }

  /**
   * Score a task for a given NPC (higher = better)
   * @private
   */
  _scoreTask(npc, task) {
    const distance = this._getDistance(npc.position, task.position);
    const distanceScore = Math.max(0, 100 - distance);
    const priorityScore = task.priority || 50;

    // Factor in NPC skills
    let skillBonus = 0;
    if (task.type === VoxelTaskType.MINE) {
      skillBonus = (npc.skills?.terrain_work || 0) * 10;
    } else if (task.type === VoxelTaskType.BUILD) {
      skillBonus = (npc.skills?.crafting || 0) * 10;
    }

    return distanceScore + priorityScore + skillBonus;
  }

  /**
   * Assign a task to worker
   * @private
   */
  _assignTask(npcId, task) {
    if (task.type === VoxelTaskType.MINE && task.miningTaskId) {
      const gatheringManager = this.voxelOrchestrator?.gatheringManager;
      if (gatheringManager) {
        gatheringManager.assignTask(task.miningTaskId, npcId);
      }
    } else if (task.type === VoxelTaskType.HAUL && task.haulingTaskId) {
      const haulingManager = this.voxelOrchestrator?.haulingManager;
      if (haulingManager?.assignTask) {
        haulingManager.assignTask(task.haulingTaskId, npcId);
      }
    } else if (task.type === VoxelTaskType.BUILD && task.constructionSiteId) {
      const constructionManager = this.voxelOrchestrator?.constructionManager;
      if (constructionManager?.assignWorker) {
        constructionManager.assignWorker(task.constructionSiteId, npcId);
      }
    }
  }

  /**
   * Start traveling to a task
   * @private
   */
  _startTravelingToTask(npcId, npc, task) {
    this._setNpcTarget(npcId, npc, task.targetPosition);
    this.workerStates.set(npcId, VoxelWorkerState.TRAVELING_TO_TASK);
  }

  /**
   * Start working on current task
   * @private
   */
  _startWorking(npcId, npc, task) {
    switch (task.type) {
      case VoxelTaskType.MINE:
        this.workerStates.set(npcId, VoxelWorkerState.MINING);
        break;
      case VoxelTaskType.HAUL:
        this.workerStates.set(npcId, VoxelWorkerState.HAULING_PICKUP);
        break;
      case VoxelTaskType.BUILD:
        this.workerStates.set(npcId, VoxelWorkerState.BUILDING);
        break;
      default:
        this.workerStates.set(npcId, VoxelWorkerState.IDLE);
    }
  }

  /**
   * Complete current task
   * @private
   */
  _completeTask(npcId, success) {
    const task = this.workerTasks.get(npcId);

    if (!success && task) {
      this.stats.tasksFailed++;
      this._abandonTask(npcId);
    }

    this.workerTasks.delete(npcId);
    this.workerStates.set(npcId, VoxelWorkerState.RETURNING);
  }

  /**
   * Abandon current task
   * @private
   */
  _abandonTask(npcId) {
    const task = this.workerTasks.get(npcId);
    if (!task) return;

    // Unassign from managers
    if (task.type === VoxelTaskType.MINE && task.miningTaskId) {
      const gatheringManager = this.voxelOrchestrator?.gatheringManager;
      gatheringManager?.unassignNpc?.(npcId);
    } else if (task.type === VoxelTaskType.HAUL && task.haulingTaskId) {
      const haulingManager = this.voxelOrchestrator?.haulingManager;
      haulingManager?.unassignTask?.(task.haulingTaskId);
    } else if (task.type === VoxelTaskType.BUILD && task.constructionSiteId) {
      const constructionManager = this.voxelOrchestrator?.constructionManager;
      constructionManager?.unassignWorker?.(task.constructionSiteId, npcId);
    }

    this.workerTasks.delete(npcId);
    this.workerStates.set(npcId, VoxelWorkerState.IDLE);
  }

  /**
   * Handle mined resources
   * @private
   */
  _handleMinedResources(npcId, npc, resources, position) {
    // For now, create hauling tasks for the resources
    const haulingManager = this.voxelOrchestrator?.haulingManager;
    if (haulingManager && this.voxelOrchestrator?.config?.autoCreateHaulTask !== false) {
      for (const resource of resources) {
        haulingManager.createTask?.({
          sourcePosition: { ...position },
          resourceType: resource.type,
          quantity: resource.amount,
          priority: 50
        });
      }
    }
  }

  /**
   * Set NPC's target position
   * @private
   */
  _setNpcTarget(npcId, npc, targetPosition) {
    if (!this.npcManager) return;

    // Use the NPC manager's pathfinding
    npc.targetPosition = { ...targetPosition };

    if (this.pathfindingService) {
      const path = this.pathfindingService.findPath(npc.position, targetPosition);
      if (path && path.length > 0) {
        npc.currentPath = this.pathfindingService.smoothPath?.(path) || path;
        npc.pathIndex = 0;
        npc.isMoving = true;
      }
    } else {
      // Fallback to direct movement
      npc.isMoving = true;
    }
  }

  /**
   * Get NPC from manager
   * @private
   */
  _getNpc(npcId) {
    return this.npcManager?.getNPCById?.(npcId) || null;
  }

  /**
   * Check if NPC should rest or eat
   * @private
   */
  _shouldRestOrEat(npc) {
    // Check fatigue
    if (npc.fatigued || (npc.needs?.rest !== undefined && npc.needs.rest < 15)) {
      return true;
    }
    // Check hunger
    if (npc.hungry || (npc.needs?.food !== undefined && npc.needs.food < 15)) {
      return true;
    }
    return false;
  }

  /**
   * Get skill modifier for work type
   * @private
   */
  _getSkillModifier(npc, workType) {
    let baseModifier = 1.0;

    if (workType === 'mining') {
      const terrainSkill = npc.skills?.terrain_work || 0;
      baseModifier = 0.5 + (terrainSkill / 100) * 1.5; // 0.5 to 2.0
    } else if (workType === 'building') {
      const craftingSkill = npc.skills?.crafting || 0;
      baseModifier = 0.5 + (craftingSkill / 100) * 1.5;
    }

    // Apply personality modifiers
    if (npc.personality?.traits?.INDUSTRIOUS) {
      baseModifier *= 1 + (npc.personality.traits.INDUSTRIOUS * 0.3);
    }

    return baseModifier;
  }

  /**
   * Get range for task type
   * @private
   */
  _getTaskRange(taskType) {
    switch (taskType) {
      case VoxelTaskType.MINE: return this.config.miningRange;
      case VoxelTaskType.BUILD: return this.config.buildRange;
      case VoxelTaskType.HAUL: return this.config.pickupRange;
      default: return 1.5;
    }
  }

  /**
   * Calculate distance between positions
   * @private
   */
  _getDistance(pos1, pos2) {
    const dx = (pos2.x || 0) - (pos1.x || 0);
    const dy = (pos2.y || 0) - (pos1.y || 0);
    const dz = ((pos2.z || 0) - (pos1.z || 0)) * 2; // Z weighted more
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Enable/disable the behavior system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      // Abandon all tasks when disabled
      for (const npcId of this.registeredWorkers) {
        this._abandonTask(npcId);
      }
    }
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      registeredWorkers: this.registeredWorkers.size,
      activeWorkers: Array.from(this.workerStates.values())
        .filter(s => s !== VoxelWorkerState.IDLE).length,
      workersByState: this._countWorkersByState()
    };
  }

  /**
   * Count workers by state
   * @private
   */
  _countWorkersByState() {
    const counts = {};
    for (const state of this.workerStates.values()) {
      counts[state] = (counts[state] || 0) + 1;
    }
    return counts;
  }

  /**
   * Export to JSON
   * @returns {object}
   */
  toJSON() {
    return {
      registeredWorkers: Array.from(this.registeredWorkers),
      workerStates: Object.fromEntries(this.workerStates),
      workerTasks: Object.fromEntries(this.workerTasks),
      stats: this.stats,
      enabled: this.enabled
    };
  }

  /**
   * Import from JSON
   * @param {object} data
   */
  fromJSON(data) {
    if (data.registeredWorkers) {
      this.registeredWorkers = new Set(data.registeredWorkers);
    }
    if (data.workerStates) {
      this.workerStates = new Map(Object.entries(data.workerStates));
    }
    if (data.workerTasks) {
      this.workerTasks = new Map(Object.entries(data.workerTasks));
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    this.enabled = data.enabled !== false;
  }

  /**
   * Reset state
   */
  reset() {
    for (const npcId of this.registeredWorkers) {
      this._abandonTask(npcId);
    }
    this.registeredWorkers.clear();
    this.workerStates.clear();
    this.workerTasks.clear();
    this.stats = {
      blocksMinedByNpcs: 0,
      blocksPlacedByNpcs: 0,
      resourcesHauled: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };
  }
}

export default VoxelWorkerBehavior;
