/**
 * GatheringManager.js - Coordinates resource gathering operations
 *
 * Manages mining tasks for voxel blocks and integrates with the
 * hauling system to transport gathered resources to stockpiles.
 *
 * Part of Phase 14: Resource Gathering
 */

import { MiningTask, MiningTaskStatus, MiningPriority } from './MiningTask.js';
import { getBlockResources, isMineable } from '../voxel/BlockTypes.js';

/**
 * GatheringManager - Coordinates mining and resource gathering
 */
export class GatheringManager {
  /**
   * Create gathering manager
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    // External references
    this.voxelWorld = config.voxelWorld || null;
    this.stockpileManager = config.stockpileManager || null;
    this.haulingManager = config.haulingManager || null;

    // Mining tasks
    this.miningTasks = new Map(); // taskId -> MiningTask
    this.tasksByPosition = new Map(); // "x,y,z" -> taskId
    this.tasksByNpc = new Map(); // npcId -> taskId

    // Configuration
    this.config = {
      maxTasksPerNpc: config.maxTasksPerNpc || 1,
      autoCreateHaulTask: config.autoCreateHaulTask !== false,
      miningRange: config.miningRange || 1.5,
      ...config
    };

    // State
    this.enabled = true;

    // Statistics
    this.stats = {
      blocksMinedTotal: 0,
      resourcesGatheredTotal: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksCancelled: 0
    };

    // Callbacks
    this.onMiningComplete = null;
    this.onResourceGathered = null;
  }

  /**
   * Set external managers
   * @param {object} managers - Manager references
   */
  setManagers(managers) {
    if (managers.voxelWorld) {
      this.voxelWorld = managers.voxelWorld;
    }
    if (managers.stockpileManager) {
      this.stockpileManager = managers.stockpileManager;
    }
    if (managers.haulingManager) {
      this.haulingManager = managers.haulingManager;
    }
  }

  /**
   * Designate a block for mining
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @param {object} options - Task options
   * @returns {MiningTask | null}
   */
  designateMining(x, y, z, options = {}) {
    const posKey = `${x},${y},${z}`;

    // Check if already designated
    if (this.tasksByPosition.has(posKey)) {
      return null;
    }

    // Get block type
    const blockType = this.voxelWorld?.getBlock(x, y, z);
    if (blockType === undefined || blockType === null) {
      return null;
    }

    // Check if block is mineable
    if (!isMineable(blockType)) {
      return null;
    }

    // Create mining task
    const task = new MiningTask({
      x,
      y,
      z,
      blockType,
      priority: options.priority || MiningPriority.NORMAL,
      toolModifier: options.toolModifier || 1.0
    });

    // Store task
    this.miningTasks.set(task.id, task);
    this.tasksByPosition.set(posKey, task.id);

    this.stats.tasksCreated++;

    return task;
  }

  /**
   * Designate a region for mining
   * @param {object} min - Minimum corner {x, y, z}
   * @param {object} max - Maximum corner {x, y, z}
   * @param {object} options - Task options
   * @returns {MiningTask[]} Created tasks
   */
  designateMiningRegion(min, max, options = {}) {
    const tasks = [];

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const task = this.designateMining(x, y, z, options);
          if (task) {
            tasks.push(task);
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Cancel mining designation
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {boolean}
   */
  cancelMining(x, y, z) {
    const posKey = `${x},${y},${z}`;
    const taskId = this.tasksByPosition.get(posKey);

    if (!taskId) {
      return false;
    }

    return this.cancelTask(taskId);
  }

  /**
   * Cancel a mining task by ID
   * @param {string} taskId - Task ID
   * @returns {boolean}
   */
  cancelTask(taskId) {
    const task = this.miningTasks.get(taskId);
    if (!task) {
      return false;
    }

    // Unassign NPC if assigned
    if (task.assignedNpcId) {
      this.tasksByNpc.delete(task.assignedNpcId);
    }

    // Remove from position index
    const posKey = `${task.position.x},${task.position.y},${task.position.z}`;
    this.tasksByPosition.delete(posKey);

    // Cancel and remove task
    task.cancel();
    this.miningTasks.delete(taskId);

    this.stats.tasksCancelled++;

    return true;
  }

  /**
   * Get available mining task for an NPC
   * @param {string} npcId - NPC ID
   * @param {object} npcPosition - NPC position {x, y, z}
   * @returns {MiningTask | null}
   */
  getAvailableTask(npcId, npcPosition) {
    // Check if NPC already has a task
    if (this.tasksByNpc.has(npcId)) {
      return this.miningTasks.get(this.tasksByNpc.get(npcId));
    }

    // Find nearest pending task
    let nearestTask = null;
    let nearestDistance = Infinity;

    for (const task of this.miningTasks.values()) {
      if (task.status !== MiningTaskStatus.PENDING) {
        continue;
      }

      // Calculate distance
      const dx = task.position.x - npcPosition.x;
      const dy = task.position.y - npcPosition.y;
      const dz = (task.position.z - npcPosition.z) * 2; // Z distance weighted more
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Factor in priority
      const effectiveDistance = distance / (task.priority / MiningPriority.NORMAL);

      if (effectiveDistance < nearestDistance) {
        nearestDistance = effectiveDistance;
        nearestTask = task;
      }
    }

    return nearestTask;
  }

  /**
   * Assign a mining task to an NPC
   * @param {string} taskId - Task ID
   * @param {string} npcId - NPC ID
   * @returns {boolean}
   */
  assignTask(taskId, npcId) {
    const task = this.miningTasks.get(taskId);
    if (!task) {
      return false;
    }

    if (!task.assign(npcId)) {
      return false;
    }

    this.tasksByNpc.set(npcId, taskId);
    return true;
  }

  /**
   * Update a mining task's progress
   * @param {string} taskId - Task ID
   * @param {number} deltaTime - Time elapsed
   * @returns {object | null} Result if completed, null otherwise
   */
  updateMiningProgress(taskId, deltaTime = 1) {
    const task = this.miningTasks.get(taskId);
    if (!task || task.status !== MiningTaskStatus.MINING) {
      return null;
    }

    const complete = task.updateProgress(deltaTime);

    if (complete) {
      return this._completeMiningTask(task);
    }

    return null;
  }

  /**
   * Complete a mining task
   * @private
   */
  _completeMiningTask(task) {
    // Get resources from block
    const resources = getBlockResources(task.blockType);

    // Remove block from voxel world
    if (this.voxelWorld) {
      this.voxelWorld.setBlock(
        task.position.x,
        task.position.y,
        task.position.z,
        0 // AIR
      );
    }

    // Update stats
    this.stats.blocksMinedTotal++;
    this.stats.tasksCompleted++;

    for (const resource of resources) {
      this.stats.resourcesGatheredTotal += resource.amount;
    }

    // Callback
    if (this.onMiningComplete) {
      this.onMiningComplete(task, resources);
    }

    if (resources.length > 0 && this.onResourceGathered) {
      this.onResourceGathered(task.position, resources);
    }

    // Create hauling task if auto-haul enabled
    if (this.config.autoCreateHaulTask && this.haulingManager && resources.length > 0) {
      for (const resource of resources) {
        this.haulingManager.createTask({
          sourcePosition: { ...task.position },
          resourceType: resource.type,
          quantity: resource.amount,
          priority: task.priority
        });
      }
    }

    // Cleanup
    const posKey = `${task.position.x},${task.position.y},${task.position.z}`;
    this.tasksByPosition.delete(posKey);

    if (task.assignedNpcId) {
      this.tasksByNpc.delete(task.assignedNpcId);
    }

    this.miningTasks.delete(task.id);

    return {
      task,
      resources,
      position: { ...task.position }
    };
  }

  /**
   * Unassign task from NPC (NPC abandoned task)
   * @param {string} npcId - NPC ID
   */
  unassignNpc(npcId) {
    const taskId = this.tasksByNpc.get(npcId);
    if (!taskId) {
      return;
    }

    const task = this.miningTasks.get(taskId);
    if (task) {
      task.unassign();
    }

    this.tasksByNpc.delete(npcId);
  }

  /**
   * Get task at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {MiningTask | null}
   */
  getTaskAtPosition(x, y, z) {
    const posKey = `${x},${y},${z}`;
    const taskId = this.tasksByPosition.get(posKey);
    return taskId ? this.miningTasks.get(taskId) : null;
  }

  /**
   * Get all pending tasks
   * @returns {MiningTask[]}
   */
  getPendingTasks() {
    return Array.from(this.miningTasks.values())
      .filter(t => t.status === MiningTaskStatus.PENDING);
  }

  /**
   * Get all active tasks (assigned or in progress)
   * @returns {MiningTask[]}
   */
  getActiveTasks() {
    return Array.from(this.miningTasks.values())
      .filter(t =>
        t.status === MiningTaskStatus.ASSIGNED ||
        t.status === MiningTaskStatus.TRAVELING ||
        t.status === MiningTaskStatus.MINING
      );
  }

  /**
   * Enable/disable the manager
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      pendingTasks: this.getPendingTasks().length,
      activeTasks: this.getActiveTasks().length,
      totalTasks: this.miningTasks.size,
      assignedNpcs: this.tasksByNpc.size
    };
  }

  /**
   * Export to JSON
   * @returns {object}
   */
  toJSON() {
    return {
      tasks: Array.from(this.miningTasks.values()).map(t => t.toJSON()),
      stats: this.stats,
      enabled: this.enabled
    };
  }

  /**
   * Import from JSON
   * @param {object} data
   */
  fromJSON(data) {
    // Clear existing
    this.miningTasks.clear();
    this.tasksByPosition.clear();
    this.tasksByNpc.clear();

    // Restore tasks
    if (data.tasks) {
      for (const taskData of data.tasks) {
        const task = MiningTask.fromJSON(taskData);
        this.miningTasks.set(task.id, task);

        const posKey = `${task.position.x},${task.position.y},${task.position.z}`;
        this.tasksByPosition.set(posKey, task.id);

        if (task.assignedNpcId) {
          this.tasksByNpc.set(task.assignedNpcId, task.id);
        }
      }
    }

    // Restore stats
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    this.enabled = data.enabled !== false;
  }

  /**
   * Reset manager state
   */
  reset() {
    this.miningTasks.clear();
    this.tasksByPosition.clear();
    this.tasksByNpc.clear();

    this.stats = {
      blocksMinedTotal: 0,
      resourcesGatheredTotal: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksCancelled: 0
    };
  }
}

export default GatheringManager;
