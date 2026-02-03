/**
 * IdleTaskManager.js - Manages idle tasks for NPCs
 *
 * Handles:
 * - Assigning tasks to idle NPCs
 * - Task prioritization (rest > social > wander)
 * - Task progress tracking
 * - Task completion and rewards
 * - Finding suitable tasks based on NPC state
 */

import { IdleTask, IdleTaskType } from './IdleTask.js';

class IdleTaskManager {
  /**
   * Initialize idle task manager
   * @param {GridManager} grid - Grid for spatial queries
   */
  constructor(grid) {
    if (!grid) {
      throw new Error('IdleTaskManager requires GridManager');
    }

    this.grid = grid;

    // Task tracking
    this.activeTasks = new Map(); // npcId -> IdleTask
    this.taskHistory = []; // Completed tasks log
    this.taskQueue = new Map(); // npcId -> [pending tasks]

    // Task rewards configuration
    this.taskRewards = {
      WANDER: { happiness: 0.5, restNeed: 2 },
      REST: { happiness: 1.0, fatigue: -20 },
      SOCIALIZE: { happiness: 2.0, socialNeed: 15 },
      INSPECT: { happiness: 0.5 },
      EXPLORE: { happiness: 1.5, restNeed: 3 }
    };

    // Configuration
    this.config = {
      maxHistorySize: 1000,
      taskCooldown: 1000, // 1 second between tasks
      socialDistance: 10, // Max distance for SOCIALIZE task
      inspectDistance: 15 // Max distance for INSPECT task
    };

    // Statistics
    this.stats = {
      totalTasksAssigned: 0,
      totalTasksCompleted: 0,
      totalTasksCancelled: 0,
      tasksCompleted: {}, // Track completions by type
      taskTypeCount: {}
    };
  }

  /**
   * Assign a task to an idle NPC
   * @param {Object} npc - NPC object
   * @param {Object} options - Task assignment options
   * @returns {IdleTask|boolean} Assigned task or boolean based on usage
   */
  assignTask(npc, options = {}) {
    if (!npc || !npc.id) {
      return false;
    }

    // Don't assign task if NPC is working
    if (npc.isWorking) {
      return false;
    }

    // Check if NPC already has an active task
    if (this.activeTasks.has(npc.id)) {
      return this.activeTasks.get(npc.id);
    }

    // Determine best task for NPC based on state
    const taskType = this._selectBestTask(npc, options);
    if (!taskType) {
      return false;
    }

    // Create task with NPC-specific data
    const taskData = this._createTaskData(npc, taskType);
    const task = new IdleTask(taskType, taskData);

    // Add rewards to task
    task.rewards = this.taskRewards[taskType] || {};

    // Start the task
    if (task.start()) {
      this.activeTasks.set(npc.id, task);
      this.stats.totalTasksAssigned++;
      this._incrementTaskTypeCount(taskType);
      return task;
    }

    return false;
  }

  /**
   * Select the best task for an NPC based on their state
   * @param {Object} npc - NPC object
   * @param {Object} options - Options
   * @returns {string|null} Task type or null
   */
  _selectBestTask(npc, options = {}) {
    // If NPC has high fatigue, prioritize REST
    if (npc.fatigued || (npc.restNeed && npc.restNeed < 30)) {
      return IdleTaskType.REST;
    }

    // If NPC has low social need, prioritize SOCIALIZE
    if (npc.socialNeed && npc.socialNeed < 40) {
      // Check if there are nearby NPCs to socialize with
      if (this._hasNearbyNPCs(npc)) {
        return IdleTaskType.SOCIALIZE;
      }
    }

    // Random choice between WANDER and INSPECT
    const random = Math.random();
    if (random < 0.6) {
      return IdleTaskType.WANDER;
    } else {
      return IdleTaskType.INSPECT;
    }
  }

  /**
   * Create task-specific data
   * @param {Object} npc - NPC object
   * @param {string} taskType - Task type
   * @returns {Object} Task data
   */
  _createTaskData(npc, taskType) {
    const data = {
      npcId: npc.id,
      npcPosition: { ...npc.position },
      npcFatigue: npc.fatigued ? 80 : 20,
      npcSocialNeed: npc.socialNeed || 50
    };

    // Add type-specific data
    switch (taskType) {
      case IdleTaskType.WANDER:
        data.targetPosition = this._getRandomWanderPosition(npc);
        break;

      case IdleTaskType.SOCIALIZE:
        data.targetNPC = this._findNearbySocialNPC(npc);
        break;

      case IdleTaskType.INSPECT:
        data.targetBuilding = this._findNearbyBuilding(npc);
        break;

      case IdleTaskType.REST:
        // No additional data needed for REST
        break;

      default:
        // Unknown task type - no additional data
        break;
    }

    return data;
  }

  /**
   * Get random position within territory for wandering
   * @param {Object} npc - NPC object
   * @returns {Object} Target position
   */
  _getRandomWanderPosition(npc) {
    // Generate random position within 10 cells of current position
    const offset = 5 + Math.random() * 5; // 5-10 cells
    const angle = Math.random() * Math.PI * 2;

    return {
      x: Math.round(npc.position.x + Math.cos(angle) * offset),
      y: npc.position.y,
      z: Math.round(npc.position.z + Math.sin(angle) * offset)
    };
  }

  /**
   * Find nearby NPC for socializing
   * @param {Object} npc - NPC object
   * @returns {Object|null} Target NPC
   */
  _findNearbySocialNPC(npc) {
    // This would query NPCManager for nearby NPCs
    // For now, return null (will be implemented during integration)
    return null;
  }

  /**
   * Find nearby building for inspection
   * @param {Object} npc - NPC object
   * @returns {Object|null} Target building
   */
  _findNearbyBuilding(npc) {
    if (!this.grid || !this.grid.getAllBuildings) {
      return null;
    }

    const buildings = this.grid.getAllBuildings();
    if (!buildings || buildings.length === 0) {
      return null;
    }

    // Find closest building within inspect distance
    let closestBuilding = null;
    let closestDistance = this.config.inspectDistance;

    for (const building of buildings) {
      const distance = this._calculateDistance(npc.position, building.position);
      if (distance < closestDistance) {
        closestBuilding = building;
        closestDistance = distance;
      }
    }

    return closestBuilding;
  }

  /**
   * Check if there are nearby NPCs
   * @param {Object} npc - NPC object
   * @returns {boolean} True if nearby NPCs exist
   */
  _hasNearbyNPCs(npc) {
    // This would query NPCManager for nearby NPCs
    // For now, return random chance (will be implemented during integration)
    return Math.random() > 0.5;
  }

  /**
   * Calculate distance between two positions
   * @param {Object} pos1 - First position
   * @param {Object} pos2 - Second position
   * @returns {number} Distance
   */
  _calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Update all active tasks
   * @param {number} deltaTime - Time since last update (ms)
   * @returns {Array} Completed tasks
   */
  updateTasks(deltaTime) {
    const currentTime = Date.now();
    const completedTasks = [];

    for (const [npcId, task] of this.activeTasks.entries()) {
      // Update task progress
      const completed = task.update(currentTime);

      if (completed) {
        completedTasks.push({ npcId, task });
        this._onTaskComplete(npcId, task);
      }
    }

    return completedTasks;
  }

  /**
   * Handle task completion
   * @param {string} npcId - NPC ID
   * @param {IdleTask} task - Completed task
   */
  _onTaskComplete(npcId, task) {
    // Remove from active tasks
    this.activeTasks.delete(npcId);

    // Add to history
    this.taskHistory.push({
      npcId,
      taskType: task.type,
      completedAt: task.completedAt,
      duration: task.duration,
      rewards: task.rewards
    });

    // Trim history if too large
    if (this.taskHistory.length > this.config.maxHistorySize) {
      this.taskHistory.shift();
    }

    // Update stats
    this.stats.totalTasksCompleted++;

    // Track completion by type
    if (!this.stats.tasksCompleted[task.type]) {
      this.stats.tasksCompleted[task.type] = 0;
    }
    this.stats.tasksCompleted[task.type]++;
  }

  /**
   * Cancel an NPC's current task
   * @param {string} npcId - NPC ID
   * @returns {boolean} True if task was cancelled
   */
  cancelTask(npcId) {
    const task = this.activeTasks.get(npcId);
    if (!task) {
      return false;
    }

    const cancelled = task.cancel();
    if (cancelled) {
      this.activeTasks.delete(npcId);
      this.stats.totalTasksCancelled++;
      return true;
    }

    return false;
  }

  /**
   * Get an NPC's current task
   * @param {string} npcId - NPC ID
   * @returns {IdleTask|null} Current task or null
   */
  getCurrentTask(npcId) {
    return this.activeTasks.get(npcId) || null;
  }

  /**
   * Check if NPC has an active task
   * @param {string} npcId - NPC ID
   * @returns {boolean} True if NPC has active task
   */
  hasActiveTask(npcId) {
    return this.activeTasks.has(npcId);
  }

  /**
   * Get task rewards for completed task
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Rewards or null
   */
  getTaskRewards(npcId) {
    const task = this.activeTasks.get(npcId);
    if (!task || !task.isComplete) {
      return null;
    }

    return task.rewards;
  }

  /**
   * Increment task type counter
   * @param {string} taskType - Task type
   */
  _incrementTaskTypeCount(taskType) {
    if (!this.stats.taskTypeCount[taskType]) {
      this.stats.taskTypeCount[taskType] = 0;
    }
    this.stats.taskTypeCount[taskType]++;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    // Calculate average task duration
    let totalDuration = 0;
    let durationCount = 0;
    for (const entry of this.taskHistory) {
      if (entry.duration) {
        totalDuration += entry.duration;
        durationCount++;
      }
    }
    const averageTaskDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    return {
      activeTasks: this.activeTasks.size,
      totalTasksAssigned: this.stats.totalTasksAssigned,
      totalCompleted: this.stats.totalTasksCompleted,
      totalCancelled: this.stats.totalTasksCancelled,
      tasksCompleted: { ...this.stats.tasksCompleted },
      taskTypeDistribution: { ...this.stats.taskTypeCount },
      averageTaskDuration,
      completionRate: this.stats.totalTasksAssigned > 0
        ? (this.stats.totalTasksCompleted / this.stats.totalTasksAssigned * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Get an NPC's active task (alias for getCurrentTask)
   * @param {string} npcId - NPC ID
   * @returns {IdleTask|null} Current task or null
   */
  getActiveTask(npcId) {
    return this.getCurrentTask(npcId);
  }

  /**
   * Reset idle task manager (clear tasks and reset stats)
   */
  reset() {
    this.clearAllTasks();
    this.resetStatistics();
  }

  /**
   * Get task history for an NPC
   * @param {string} npcId - NPC ID
   * @param {number} limit - Max number of tasks to return
   * @returns {Array} Task history
   */
  getTaskHistory(npcId, limit = 10) {
    return this.taskHistory
      .filter(entry => entry.npcId === npcId)
      .slice(-limit);
  }

  /**
   * Remove NPC from task system (cleanup when NPC is removed/dies)
   * @param {string} npcId - NPC ID to remove
   * @returns {boolean} True if NPC was removed
   */
  removeNPC(npcId) {
    if (!npcId) {
      return false;
    }

    let removed = false;

    // Cancel and remove active task
    if (this.activeTasks.has(npcId)) {
      const task = this.activeTasks.get(npcId);
      task.cancel();
      this.activeTasks.delete(npcId);
      removed = true;
    }

    // Remove from task queue (if implemented in future)
    if (this.taskQueue.has(npcId)) {
      this.taskQueue.delete(npcId);
      removed = true;
    }

    return removed;
  }

  /**
   * Clear old task history entries to prevent memory bloat
   * @param {number} maxAge - Max age in milliseconds (default: 1 hour)
   */
  cleanupHistory(maxAge = 3600000) {
    const cutoffTime = Date.now() - maxAge;

    this.taskHistory = this.taskHistory.filter(entry => {
      return entry.completedAt >= cutoffTime;
    });
  }

  /**
   * Clear all tasks
   */
  clearAllTasks() {
    for (const task of this.activeTasks.values()) {
      task.cancel();
    }
    this.activeTasks.clear();
    this.taskQueue.clear();
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalTasksAssigned: 0,
      totalTasksCompleted: 0,
      totalTasksCancelled: 0,
      tasksCompleted: {},
      taskTypeCount: {}
    };
    this.taskHistory = [];
  }

  /**
   * Get memory usage info (for debugging)
   * @returns {Object} Memory usage statistics
   */
  getMemoryInfo() {
    return {
      activeTasksCount: this.activeTasks.size,
      taskHistoryCount: this.taskHistory.length,
      taskQueueCount: this.taskQueue.size,
      estimatedMemoryKB: (
        (this.activeTasks.size * 0.5) +  // ~500 bytes per active task
        (this.taskHistory.length * 0.2) + // ~200 bytes per history entry
        (this.taskQueue.size * 0.3)       // ~300 bytes per queued task
      ).toFixed(2)
    };
  }

  /**
   * Serialize idle task manager state for saving
   * @returns {Object} Serialized state
   */
  serialize() {
    // Serialize active tasks
    const activeTasks = [];
    for (const [npcId, task] of this.activeTasks.entries()) {
      activeTasks.push({
        npcId,
        task: task.serialize()
      });
    }

    return {
      activeTasks,
      taskHistory: this.taskHistory.slice(-100), // Keep only last 100 history entries
      stats: {
        totalTasksAssigned: this.stats.totalTasksAssigned,
        totalTasksCompleted: this.stats.totalTasksCompleted,
        totalTasksCancelled: this.stats.totalTasksCancelled,
        taskTypeCount: { ...this.stats.taskTypeCount }
      }
    };
  }

  /**
   * Deserialize idle task manager state from save
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (!data) return;

    // Restore active tasks
    if (data.activeTasks) {
      this.activeTasks.clear();
      for (const entry of data.activeTasks) {
        const task = new IdleTask(entry.task.type, entry.task.data);
        task.deserialize(entry.task);
        this.activeTasks.set(entry.npcId, task);
      }
    }

    // Restore task history
    if (data.taskHistory) {
      this.taskHistory = data.taskHistory;
    }

    // Restore statistics
    if (data.stats) {
      this.stats.totalTasksAssigned = data.stats.totalTasksAssigned || 0;
      this.stats.totalTasksCompleted = data.stats.totalTasksCompleted || 0;
      this.stats.totalTasksCancelled = data.stats.totalTasksCancelled || 0;
      this.stats.taskTypeCount = data.stats.taskTypeCount || {};
    }
  }
}

export default IdleTaskManager;
