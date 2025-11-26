/**
 * BuilderBehavior.js - Behavior tree nodes for construction NPCs
 *
 * This module provides behavior tree nodes that enable NPCs to:
 * - Haul materials from stockpiles to construction sites
 * - Build blocks at construction sites
 * - Coordinate with other builder NPCs
 *
 * Part of Phase 6: Builder Behavior System
 *
 * Usage:
 *   const builderTree = createBuilderBehavior(npcId, managers);
 *   behaviorSystem.setBehavior(npcId, builderTree);
 */

import {
  BehaviorTree,
  Selector,
  Sequence,
  Action,
  ConditionCheck,
  Decorator
} from '../ai/BehaviorTree.js';

/**
 * Builder NPC states
 */
export const BuilderState = {
  IDLE: 'idle',
  SEEKING_WORK: 'seeking_work',
  HAULING: 'hauling',
  BUILDING: 'building',
  RETURNING: 'returning'
};

/**
 * Create a behavior tree for a builder NPC
 * @param {string} npcId - NPC identifier
 * @param {object} managers - Manager references
 * @returns {BehaviorTree}
 */
export function createBuilderBehavior(npcId, managers) {
  const {
    haulingManager,
    constructionManager,
    stockpileManager,
    jobManager
  } = managers;

  const blackboard = {
    npcId,
    state: BuilderState.IDLE,
    currentTask: null,
    currentBuildJob: null,
    targetPosition: null,
    actionTimer: 0
  };

  // Root selector: try construction work, then haul work, then idle
  const root = new Selector([
    // Priority 1: Continue current build job
    createContinueBuildingSequence(blackboard, managers),

    // Priority 2: Continue current haul task
    createContinueHaulingSequence(blackboard, managers),

    // Priority 3: Find new construction work
    createSeekBuildWorkSequence(blackboard, managers),

    // Priority 4: Find new hauling work
    createSeekHaulWorkSequence(blackboard, managers),

    // Fallback: Idle behavior
    createIdleAction(blackboard)
  ]);

  return new BehaviorTree(root, blackboard);
}

/**
 * Sequence for continuing an active build job
 */
function createContinueBuildingSequence(blackboard, managers) {
  return new Sequence([
    // Check if we have an active build job
    new ConditionCheck(() => {
      return blackboard.currentBuildJob !== null &&
             blackboard.state === BuilderState.BUILDING;
    }),

    // Execute build actions
    new Action((bb) => {
      return executeBuildAction(bb, managers);
    })
  ]);
}

/**
 * Sequence for continuing an active haul task
 */
function createContinueHaulingSequence(blackboard, managers) {
  return new Sequence([
    // Check if we have an active haul task
    new ConditionCheck(() => {
      return blackboard.currentTask !== null &&
             blackboard.state === BuilderState.HAULING;
    }),

    // Execute haul actions
    new Action((bb) => {
      return executeHaulAction(bb, managers);
    })
  ]);
}

/**
 * Sequence for finding new build work
 */
function createSeekBuildWorkSequence(blackboard, managers) {
  return new Sequence([
    // Check if there are sites needing builders
    new ConditionCheck(() => {
      if (!managers.constructionManager) return false;

      const sites = managers.constructionManager.getActiveSites();
      for (const site of sites) {
        const readyBlocks = site.getBlocksReadyToBuild();
        if (readyBlocks.length > 0) {
          return true;
        }
      }
      return false;
    }),

    // Request build work
    new Action((bb) => {
      return requestBuildWork(bb, managers);
    })
  ]);
}

/**
 * Sequence for finding new haul work
 */
function createSeekHaulWorkSequence(blackboard, managers) {
  return new Sequence([
    // Check if hauling is needed
    new ConditionCheck(() => {
      if (!managers.haulingManager) return false;

      const pending = managers.haulingManager.getPendingTasks();
      return pending.length > 0;
    }),

    // Request haul task
    new Action((bb) => {
      return requestHaulWork(bb, managers);
    })
  ]);
}

/**
 * Idle behavior when no work is available
 */
function createIdleAction(blackboard) {
  return new Action((bb) => {
    bb.state = BuilderState.IDLE;
    bb.currentTask = null;
    bb.currentBuildJob = null;
    return 'SUCCESS';
  });
}

/**
 * Execute build actions based on current state
 */
function executeBuildAction(blackboard, managers) {
  const job = blackboard.currentBuildJob;
  if (!job) {
    blackboard.state = BuilderState.IDLE;
    return 'FAILURE';
  }

  const site = managers.constructionManager?.getSite(job.siteId);
  if (!site) {
    blackboard.currentBuildJob = null;
    blackboard.state = BuilderState.IDLE;
    return 'FAILURE';
  }

  // Check if we're at the build location
  const npcPos = blackboard.npcPosition;
  const blockPos = job.blockPosition;

  if (!npcPos || !blockPos) {
    return 'RUNNING';
  }

  const distance = Math.sqrt(
    Math.pow(npcPos.x - blockPos.x, 2) +
    Math.pow(npcPos.y - blockPos.y, 2)
  );

  if (distance > 2.0) {
    // Need to move closer
    blackboard.targetPosition = blockPos;
    return 'RUNNING';
  }

  // At location, perform build action
  blackboard.actionTimer += blackboard.deltaTime || 0.016;

  if (blackboard.actionTimer >= job.buildTime) {
    // Complete the block
    const success = site.completeBlock(job.blockKey, blackboard.npcId);

    if (success) {
      blackboard.currentBuildJob = null;
      blackboard.actionTimer = 0;
      blackboard.state = BuilderState.SEEKING_WORK;
      return 'SUCCESS';
    } else {
      blackboard.currentBuildJob = null;
      blackboard.actionTimer = 0;
      blackboard.state = BuilderState.IDLE;
      return 'FAILURE';
    }
  }

  return 'RUNNING';
}

/**
 * Execute haul actions based on current state
 */
function executeHaulAction(blackboard, managers) {
  const task = blackboard.currentTask;
  if (!task) {
    blackboard.state = BuilderState.IDLE;
    return 'FAILURE';
  }

  // Update task with current context
  const context = {
    npcPosition: blackboard.npcPosition,
    arrivalThreshold: 1.5,
    stockpileManager: managers.stockpileManager,
    constructionManager: managers.constructionManager
  };

  const status = task.update(blackboard.deltaTime || 0.016, context);

  // Update target position for pathfinding
  blackboard.targetPosition = task.getCurrentTargetPosition();

  if (task.isTerminal()) {
    blackboard.currentTask = null;
    blackboard.state = BuilderState.SEEKING_WORK;
    return status === 'COMPLETED' ? 'SUCCESS' : 'FAILURE';
  }

  return 'RUNNING';
}

/**
 * Request build work from construction manager
 */
function requestBuildWork(blackboard, managers) {
  if (!managers.constructionManager) {
    return 'FAILURE';
  }

  const npcPos = blackboard.npcPosition || { x: 0, y: 0 };
  const sites = managers.constructionManager.getActiveSites();

  // Find nearest site with available build work
  let bestSite = null;
  let bestBlock = null;
  let bestDistance = Infinity;

  for (const site of sites) {
    const readyBlocks = site.getBlocksReadyToBuild();

    for (const block of readyBlocks) {
      const distance = Math.sqrt(
        Math.pow(npcPos.x - block.position.x, 2) +
        Math.pow(npcPos.y - block.position.y, 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSite = site;
        bestBlock = block;
      }
    }
  }

  if (bestSite && bestBlock) {
    // Reserve the block for building
    const reserved = bestSite.reserveBlockForBuilding(bestBlock.key, blackboard.npcId);

    if (reserved) {
      blackboard.currentBuildJob = {
        siteId: bestSite.id,
        blockKey: bestBlock.key,
        blockPosition: bestBlock.position,
        buildTime: 2.0  // 2 seconds per block
      };
      blackboard.state = BuilderState.BUILDING;
      blackboard.targetPosition = bestBlock.position;
      blackboard.actionTimer = 0;
      return 'SUCCESS';
    }
  }

  return 'FAILURE';
}

/**
 * Request haul work from hauling manager
 */
function requestHaulWork(blackboard, managers) {
  if (!managers.haulingManager) {
    return 'FAILURE';
  }

  const npcPos = blackboard.npcPosition || { x: 0, y: 0 };
  const task = managers.haulingManager.requestTask(blackboard.npcId, npcPos);

  if (task) {
    blackboard.currentTask = task;
    blackboard.state = BuilderState.HAULING;
    blackboard.targetPosition = task.getCurrentTargetPosition();
    return 'SUCCESS';
  }

  return 'FAILURE';
}

/**
 * BuilderController - Higher-level controller for builder NPCs
 *
 * Manages the behavior tree and provides interface for
 * the NPC system to interact with.
 */
export class BuilderController {
  /**
   * Create a builder controller
   * @param {string} npcId - NPC identifier
   * @param {object} managers - Manager references
   */
  constructor(npcId, managers = {}) {
    this.npcId = npcId;
    this.managers = managers;
    this.behaviorTree = createBuilderBehavior(npcId, managers);
    this.enabled = true;

    // Stats
    this.stats = {
      blocksBuilt: 0,
      resourcesHauled: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };
  }

  /**
   * Update the builder behavior
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} npcState - Current NPC state
   * @returns {object} Action result
   */
  update(deltaTime, npcState) {
    if (!this.enabled) {
      return { action: 'idle' };
    }

    // Update blackboard with NPC state
    const bb = this.behaviorTree.blackboard;
    bb.npcPosition = npcState.position;
    bb.deltaTime = deltaTime;

    // Run behavior tree
    const result = this.behaviorTree.tick();

    // Return action for NPC system
    return {
      action: this._getActionFromState(bb.state),
      targetPosition: bb.targetPosition,
      state: bb.state,
      isCarrying: bb.currentTask?.isCarrying() || false,
      carryingResource: bb.currentTask?.resourceType || null,
      result
    };
  }

  /**
   * Convert builder state to action type
   * @private
   */
  _getActionFromState(state) {
    switch (state) {
      case BuilderState.HAULING:
        return 'move_to';
      case BuilderState.BUILDING:
        return 'build';
      case BuilderState.SEEKING_WORK:
        return 'seek';
      case BuilderState.RETURNING:
        return 'move_to';
      default:
        return 'idle';
    }
  }

  /**
   * Get current state
   * @returns {string}
   */
  getState() {
    return this.behaviorTree.blackboard.state;
  }

  /**
   * Get current target position
   * @returns {{x: number, y: number, z: number} | null}
   */
  getTargetPosition() {
    return this.behaviorTree.blackboard.targetPosition;
  }

  /**
   * Check if builder has active work
   * @returns {boolean}
   */
  hasWork() {
    const bb = this.behaviorTree.blackboard;
    return bb.currentTask !== null || bb.currentBuildJob !== null;
  }

  /**
   * Cancel current work
   */
  cancelWork() {
    const bb = this.behaviorTree.blackboard;

    if (bb.currentTask) {
      bb.currentTask.cancel('Controller cancelled');
      bb.currentTask = null;
    }

    if (bb.currentBuildJob && this.managers.constructionManager) {
      const site = this.managers.constructionManager.getSite(bb.currentBuildJob.siteId);
      if (site) {
        site.releaseBlockReservation(bb.currentBuildJob.blockKey, this.npcId);
      }
      bb.currentBuildJob = null;
    }

    bb.state = BuilderState.IDLE;
    bb.targetPosition = null;
  }

  /**
   * Enable/disable the builder
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelWork();
    }
  }

  /**
   * Get builder statistics
   * @returns {object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Record a completed block
   */
  recordBlockBuilt() {
    this.stats.blocksBuilt++;
    this.stats.tasksCompleted++;
  }

  /**
   * Record hauled resources
   * @param {number} quantity
   */
  recordResourcesHauled(quantity) {
    this.stats.resourcesHauled += quantity;
    this.stats.tasksCompleted++;
  }

  /**
   * Record a failed task
   */
  recordTaskFailed() {
    this.stats.tasksFailed++;
  }
}

/**
 * BuilderManager - Manages all builder NPCs
 */
export class BuilderManager {
  /**
   * Create a builder manager
   * @param {object} managers - External manager references
   */
  constructor(managers = {}) {
    this.managers = managers;
    this.builders = new Map();  // npcId -> BuilderController
    this.enabled = true;
  }

  /**
   * Set external manager references
   * @param {object} managers
   */
  setManagers(managers) {
    this.managers = { ...this.managers, ...managers };

    // Update existing builders
    for (const builder of this.builders.values()) {
      builder.managers = this.managers;
    }
  }

  /**
   * Register an NPC as a builder
   * @param {string} npcId - NPC identifier
   * @returns {BuilderController}
   */
  registerBuilder(npcId) {
    if (this.builders.has(npcId)) {
      return this.builders.get(npcId);
    }

    const controller = new BuilderController(npcId, this.managers);
    this.builders.set(npcId, controller);
    return controller;
  }

  /**
   * Unregister a builder NPC
   * @param {string} npcId
   */
  unregisterBuilder(npcId) {
    const builder = this.builders.get(npcId);
    if (builder) {
      builder.cancelWork();
      this.builders.delete(npcId);
    }
  }

  /**
   * Get builder controller for an NPC
   * @param {string} npcId
   * @returns {BuilderController | null}
   */
  getBuilder(npcId) {
    return this.builders.get(npcId) || null;
  }

  /**
   * Update all builders
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} gameState - Current game state
   * @returns {Map<string, object>} Actions for each NPC
   */
  update(deltaTime, gameState) {
    if (!this.enabled) {
      return new Map();
    }

    const actions = new Map();

    for (const [npcId, builder] of this.builders) {
      const npc = gameState?.npcs?.get?.(npcId);
      if (!npc) continue;

      const npcState = {
        position: npc.position,
        isMoving: npc.isMoving,
        currentPath: npc.currentPath
      };

      const action = builder.update(deltaTime, npcState);
      actions.set(npcId, action);
    }

    return actions;
  }

  /**
   * Get all builder IDs
   * @returns {string[]}
   */
  getBuilderIds() {
    return Array.from(this.builders.keys());
  }

  /**
   * Get count of active builders
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    for (const builder of this.builders.values()) {
      if (builder.hasWork()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get aggregate statistics
   * @returns {object}
   */
  getStats() {
    const stats = {
      totalBuilders: this.builders.size,
      activeBuilders: 0,
      idleBuilders: 0,
      totalBlocksBuilt: 0,
      totalResourcesHauled: 0
    };

    for (const builder of this.builders.values()) {
      const builderStats = builder.getStats();
      stats.totalBlocksBuilt += builderStats.blocksBuilt;
      stats.totalResourcesHauled += builderStats.resourcesHauled;

      if (builder.hasWork()) {
        stats.activeBuilders++;
      } else {
        stats.idleBuilders++;
      }
    }

    return stats;
  }

  /**
   * Enable/disable all builders
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    for (const builder of this.builders.values()) {
      builder.setEnabled(enabled);
    }
  }
}
