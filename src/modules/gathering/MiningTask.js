/**
 * MiningTask.js - Task for mining voxel blocks
 *
 * Represents a mining operation that extracts resources from
 * voxel blocks. Works with the voxel building system to remove
 * blocks and generate resource drops.
 *
 * Part of Phase 14: Resource Gathering
 */

import { BlockType, getBlockResources, isMineable } from '../voxel/BlockTypes.js';

/**
 * Mining task status
 */
export const MiningTaskStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  TRAVELING: 'traveling',
  MINING: 'mining',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Mining task priority
 */
export const MiningPriority = {
  LOW: 25,
  NORMAL: 50,
  HIGH: 75,
  URGENT: 100
};

/**
 * Get base mining time for a block type (in game ticks)
 * @param {number} blockType - Block type ID
 * @returns {number} Mining time in ticks
 */
function getBaseMiningTime(blockType) {
  // Use hardcoded values to avoid computed property issues
  switch (blockType) {
    case 1: return 15;  // DIRT
    case 2: return 18;  // GRASS
    case 4: return 12;  // SAND
    case 3: return 40;  // STONE
    case 41: return 45; // COBBLESTONE
    case 31: return 25; // WOOD_LOG
    case 32: return 20; // WOOD_PLANK
    case 22: return 60; // IRON_ORE
    case 23: return 55; // GOLD_ORE
    case 21: return 50; // COAL_ORE
    default: return 30;
  }
}

/**
 * MiningTask - Represents a single mining operation
 */
export class MiningTask {
  /**
   * Create a mining task
   * @param {object} config - Task configuration
   */
  constructor(config = {}) {
    this.id = config.id || `mining-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Target block position
    this.position = {
      x: config.x || 0,
      y: config.y || 0,
      z: config.z || 0
    };

    // Block information
    this.blockType = config.blockType || BlockType.STONE;

    // Task state
    this.status = MiningTaskStatus.PENDING;
    this.assignedNpcId = null;
    this.priority = config.priority || MiningPriority.NORMAL;

    // Tool modifier (mining speed multiplier) - must be set before _calculateMiningTime
    this.toolModifier = config.toolModifier || 1.0;

    // Progress tracking
    this.miningProgress = 0;
    this.totalMiningTime = this._calculateMiningTime();

    // Resources that will drop
    this.expectedResources = getBlockResources(this.blockType);

    // Creation time
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Calculate mining time based on block type
   * @private
   */
  _calculateMiningTime() {
    const baseTime = getBaseMiningTime(this.blockType);
    const modifier = this.toolModifier || 1.0;
    return Math.ceil(baseTime / modifier);
  }

  /**
   * Assign this task to an NPC
   * @param {string} npcId - NPC ID
   */
  assign(npcId) {
    if (this.status !== MiningTaskStatus.PENDING) {
      return false;
    }

    this.assignedNpcId = npcId;
    this.status = MiningTaskStatus.ASSIGNED;
    return true;
  }

  /**
   * Mark task as traveling to mining location
   */
  startTraveling() {
    if (this.status !== MiningTaskStatus.ASSIGNED) {
      return false;
    }

    this.status = MiningTaskStatus.TRAVELING;
    return true;
  }

  /**
   * Start mining the block
   */
  startMining() {
    if (this.status !== MiningTaskStatus.TRAVELING) {
      return false;
    }

    this.status = MiningTaskStatus.MINING;
    this.startedAt = Date.now();
    return true;
  }

  /**
   * Update mining progress
   * @param {number} deltaTime - Time elapsed in game ticks
   * @returns {boolean} True if mining is complete
   */
  updateProgress(deltaTime = 1) {
    if (this.status !== MiningTaskStatus.MINING) {
      return false;
    }

    this.miningProgress += deltaTime * this.toolModifier;

    if (this.miningProgress >= this.totalMiningTime) {
      this.complete();
      return true;
    }

    return false;
  }

  /**
   * Get current progress (0-1)
   * @returns {number}
   */
  getProgress() {
    if (this.totalMiningTime === 0) return 1;
    return Math.min(this.miningProgress / this.totalMiningTime, 1);
  }

  /**
   * Complete the mining task
   */
  complete() {
    this.status = MiningTaskStatus.COMPLETED;
    this.miningProgress = this.totalMiningTime;
    this.completedAt = Date.now();
  }

  /**
   * Cancel the mining task
   */
  cancel() {
    this.status = MiningTaskStatus.CANCELLED;
    this.completedAt = Date.now();
  }

  /**
   * Unassign the task (NPC abandoned it)
   */
  unassign() {
    this.assignedNpcId = null;
    this.status = MiningTaskStatus.PENDING;
    this.miningProgress = 0;
    this.startedAt = null;
  }

  /**
   * Check if block is mineable
   * @returns {boolean}
   */
  isMineable() {
    return isMineable(this.blockType);
  }

  /**
   * Get time remaining in ticks
   * @returns {number}
   */
  getTimeRemaining() {
    return Math.max(0, this.totalMiningTime - this.miningProgress);
  }

  /**
   * Export to JSON
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      position: { ...this.position },
      blockType: this.blockType,
      status: this.status,
      assignedNpcId: this.assignedNpcId,
      priority: this.priority,
      miningProgress: this.miningProgress,
      totalMiningTime: this.totalMiningTime,
      toolModifier: this.toolModifier,
      expectedResources: this.expectedResources,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Create from JSON
   * @param {object} data - Serialized data
   * @returns {MiningTask}
   */
  static fromJSON(data) {
    const task = new MiningTask({
      id: data.id,
      x: data.position.x,
      y: data.position.y,
      z: data.position.z,
      blockType: data.blockType,
      priority: data.priority,
      toolModifier: data.toolModifier
    });

    task.status = data.status;
    task.assignedNpcId = data.assignedNpcId;
    task.miningProgress = data.miningProgress;
    task.totalMiningTime = data.totalMiningTime;
    task.expectedResources = data.expectedResources;
    task.createdAt = data.createdAt;
    task.startedAt = data.startedAt;
    task.completedAt = data.completedAt;

    return task;
  }
}

export default MiningTask;
