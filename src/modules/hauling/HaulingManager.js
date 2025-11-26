/**
 * HaulingManager.js - Coordinates material hauling across construction sites
 *
 * The HaulingManager creates and assigns haul tasks to NPCs, ensuring materials
 * flow efficiently from stockpiles to construction sites.
 *
 * Part of Phase 5: Hauling System
 *
 * Features:
 * - Automatic task creation based on construction site needs
 * - NPC assignment based on proximity and availability
 * - Task prioritization by construction site priority
 * - Reservation system to prevent conflicts
 * - Statistics tracking
 */

import { HaulTask, HaulPriority } from './HaulTask.js';

/**
 * HaulingManager - Coordinates hauling operations
 */
export class HaulingManager {
  /**
   * Create a hauling manager
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    // Task storage
    this.tasks = new Map();           // taskId -> HaulTask
    this.npcTasks = new Map();        // npcId -> taskId
    this.pendingTasks = [];           // Tasks waiting for assignment

    // External manager references
    this.stockpileManager = config.stockpileManager || null;
    this.constructionManager = config.constructionManager || null;
    this.pathfindingService = config.pathfindingService || null;

    // Configuration
    this.maxTasksPerNpc = config.maxTasksPerNpc || 1;
    this.taskScanInterval = config.taskScanInterval || 2.0;  // seconds
    this.reservationTimeout = config.reservationTimeout || 60000;  // ms

    // State
    this.timeSinceLastScan = 0;
    this.enabled = true;

    // Statistics
    this.stats = {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalTasksCancelled: 0,
      totalResourcesHauled: 0
    };

    // Callbacks
    this.onTaskCreated = config.onTaskCreated || null;
    this.onTaskCompleted = config.onTaskCompleted || null;
    this.onTaskFailed = config.onTaskFailed || null;
  }

  /**
   * Set external manager references
   * @param {object} managers - Manager references
   */
  setManagers(managers) {
    if (managers.stockpileManager) {
      this.stockpileManager = managers.stockpileManager;
    }
    if (managers.constructionManager) {
      this.constructionManager = managers.constructionManager;
    }
    if (managers.pathfindingService) {
      this.pathfindingService = managers.pathfindingService;
    }
  }

  /**
   * Update the hauling system
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} gameState - Current game state
   */
  update(deltaTime, gameState) {
    if (!this.enabled) return;

    // Periodically scan for new hauling needs
    this.timeSinceLastScan += deltaTime;
    if (this.timeSinceLastScan >= this.taskScanInterval) {
      this._scanForHaulingNeeds();
      this.timeSinceLastScan = 0;
    }

    // Update active tasks
    this._updateActiveTasks(deltaTime, gameState);

    // Clean up completed tasks
    this._cleanupCompletedTasks();
  }

  /**
   * Scan construction sites for hauling needs
   * @private
   */
  _scanForHaulingNeeds() {
    if (!this.constructionManager || !this.stockpileManager) return;

    const sites = this.constructionManager.getActiveSites();

    for (const site of sites) {
      const needs = site.getMaterialNeeds();

      for (const need of needs) {
        // Check if we already have a task for this need
        if (this._hasTaskForNeed(site.id, need.blockKey, need.resourceType)) {
          continue;
        }

        // Try to find a stockpile with the resource
        const sourceInfo = this._findResourceSource(need.resourceType, need.quantity);
        if (!sourceInfo) continue;

        // Create a haul task
        const task = this._createHaulTask(site, need, sourceInfo);
        if (task) {
          this.pendingTasks.push(task);
        }
      }
    }
  }

  /**
   * Check if a task already exists for a specific need
   * @private
   */
  _hasTaskForNeed(siteId, blockKey, resourceType) {
    for (const task of this.tasks.values()) {
      if (task.isTerminal()) continue;

      if (task.destination.siteId === siteId &&
          task.destination.blockKey === blockKey &&
          task.resourceType === resourceType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find a stockpile with the needed resource
   * @private
   */
  _findResourceSource(resourceType, quantity) {
    if (!this.stockpileManager) return null;

    const result = this.stockpileManager.findNearestResource(
      resourceType,
      { x: 0, y: 0 },  // TODO: Use destination position for better routing
      quantity
    );

    if (!result) return null;

    return {
      stockpileId: result.stockpile.id,
      slot: result.slot,
      position: result.slot.position
    };
  }

  /**
   * Create a haul task for a material need
   * @private
   */
  _createHaulTask(site, need, sourceInfo) {
    // Reserve the resource in the stockpile
    const stockpile = this.stockpileManager.getStockpile(sourceInfo.stockpileId);
    if (!stockpile) return null;

    const task = new HaulTask({
      resourceType: need.resourceType,
      quantity: need.quantity,
      sourceStockpileId: sourceInfo.stockpileId,
      sourcePosition: sourceInfo.position,
      sourceSlotKey: `${sourceInfo.position.x},${sourceInfo.position.y}`,
      destinationSiteId: site.id,
      destinationPosition: need.position,
      destinationBlockKey: need.blockKey,
      priority: this._getSitePriority(site),
      onComplete: (t) => this._handleTaskComplete(t),
      onFail: (t, reason) => this._handleTaskFail(t, reason),
      onCancel: (t, reason) => this._handleTaskCancel(t, reason)
    });

    this.tasks.set(task.id, task);
    this.stats.totalTasksCreated++;

    if (this.onTaskCreated) {
      this.onTaskCreated(task);
    }

    return task;
  }

  /**
   * Convert site priority to haul priority
   * @private
   */
  _getSitePriority(site) {
    if (site.priority >= 75) return HaulPriority.URGENT;
    if (site.priority >= 50) return HaulPriority.HIGH;
    if (site.priority >= 25) return HaulPriority.NORMAL;
    return HaulPriority.LOW;
  }

  /**
   * Update all active tasks
   * @private
   */
  _updateActiveTasks(deltaTime, gameState) {
    for (const task of this.tasks.values()) {
      if (!task.isActive()) continue;

      const npc = gameState?.npcs?.get?.(task.assignedNpcId);
      if (!npc) continue;

      const context = {
        npcPosition: npc.position,
        arrivalThreshold: 1.5,
        stockpileManager: this.stockpileManager,
        constructionManager: this.constructionManager
      };

      task.update(deltaTime, context);
    }
  }

  /**
   * Clean up completed tasks
   * @private
   */
  _cleanupCompletedTasks() {
    const completedIds = [];

    for (const [id, task] of this.tasks) {
      if (task.isTerminal()) {
        // Release NPC assignment
        if (task.assignedNpcId) {
          this.npcTasks.delete(task.assignedNpcId);
        }

        // Keep task for a bit for status queries, then remove
        if (task.completedAt && (Date.now() - task.completedAt) > 30000) {
          completedIds.push(id);
        }
      }
    }

    for (const id of completedIds) {
      this.tasks.delete(id);
    }
  }

  /**
   * Handle task completion
   * @private
   */
  _handleTaskComplete(task) {
    this.stats.totalTasksCompleted++;
    this.stats.totalResourcesHauled += task.quantityPickedUp;

    if (this.onTaskCompleted) {
      this.onTaskCompleted(task);
    }
  }

  /**
   * Handle task failure
   * @private
   */
  _handleTaskFail(task, reason) {
    this.stats.totalTasksFailed++;

    // Release any reservations
    if (task.source.stockpileId && this.stockpileManager) {
      const stockpile = this.stockpileManager.getStockpile(task.source.stockpileId);
      if (stockpile && task.assignedNpcId) {
        stockpile.releaseAllReservations(task.assignedNpcId);
      }
    }

    if (this.onTaskFailed) {
      this.onTaskFailed(task, reason);
    }
  }

  /**
   * Handle task cancellation
   * @private
   */
  _handleTaskCancel(task, reason) {
    this.stats.totalTasksCancelled++;

    // Release any reservations
    if (task.source.stockpileId && this.stockpileManager) {
      const stockpile = this.stockpileManager.getStockpile(task.source.stockpileId);
      if (stockpile && task.assignedNpcId) {
        stockpile.releaseAllReservations(task.assignedNpcId);
      }
    }
  }

  /**
   * Request a haul task for an NPC
   * @param {string} npcId - NPC ID
   * @param {object} npcPosition - NPC's current position
   * @returns {HaulTask | null}
   */
  requestTask(npcId, npcPosition) {
    // Check if NPC already has a task
    if (this.npcTasks.has(npcId)) {
      const existingTaskId = this.npcTasks.get(npcId);
      const existingTask = this.tasks.get(existingTaskId);
      if (existingTask && !existingTask.isTerminal()) {
        return existingTask;
      }
    }

    // Find best pending task for this NPC
    const task = this._findBestTask(npcId, npcPosition);
    if (!task) return null;

    // Assign task to NPC
    this._assignTask(task, npcId);

    return task;
  }

  /**
   * Find the best pending task for an NPC
   * @private
   */
  _findBestTask(npcId, npcPosition) {
    if (this.pendingTasks.length === 0) return null;

    // Sort by priority (desc) then by distance (asc)
    const scored = this.pendingTasks.map(task => {
      const distance = npcPosition ?
        this._calculateDistance(npcPosition, task.source.position) : 0;

      return {
        task,
        score: (task.priority * 1000) - distance
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Return the best task and remove from pending
    const best = scored[0];
    if (best) {
      const index = this.pendingTasks.indexOf(best.task);
      if (index >= 0) {
        this.pendingTasks.splice(index, 1);
      }
      return best.task;
    }

    return null;
  }

  /**
   * Assign a task to an NPC
   * @private
   */
  _assignTask(task, npcId) {
    // Reserve in stockpile
    if (task.source.stockpileId && this.stockpileManager) {
      const stockpile = this.stockpileManager.getStockpile(task.source.stockpileId);
      if (stockpile) {
        const reserved = stockpile.reserveForPickup(
          task.resourceType,
          npcId,
          task.quantity
        );

        if (!reserved) {
          // Resource was taken, cancel task
          task.cancel('Resource no longer available');
          return false;
        }
      }
    }

    // Start the task
    if (task.start(npcId)) {
      this.npcTasks.set(npcId, task.id);
      return true;
    }

    return false;
  }

  /**
   * Calculate distance between positions
   * @private
   */
  _calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return Infinity;
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get NPC's current task
   * @param {string} npcId - NPC ID
   * @returns {HaulTask | null}
   */
  getNpcTask(npcId) {
    const taskId = this.npcTasks.get(npcId);
    if (!taskId) return null;
    return this.tasks.get(taskId) || null;
  }

  /**
   * Cancel all tasks for an NPC
   * @param {string} npcId - NPC ID
   * @returns {number} Number of tasks cancelled
   */
  cancelNpcTasks(npcId) {
    let cancelled = 0;

    for (const task of this.tasks.values()) {
      if (task.assignedNpcId === npcId && !task.isTerminal()) {
        task.cancel('NPC reassigned');
        cancelled++;
      }
    }

    this.npcTasks.delete(npcId);
    return cancelled;
  }

  /**
   * Get all pending tasks
   * @returns {HaulTask[]}
   */
  getPendingTasks() {
    return [...this.pendingTasks];
  }

  /**
   * Get all active tasks
   * @returns {HaulTask[]}
   */
  getActiveTasks() {
    return Array.from(this.tasks.values()).filter(t => t.isActive());
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {HaulTask | null}
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get hauling statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      pendingTasks: this.pendingTasks.length,
      activeTasks: this.getActiveTasks().length,
      totalTasks: this.tasks.size,
      assignedNpcs: this.npcTasks.size
    };
  }

  /**
   * Enable/disable the hauling system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Force a scan for hauling needs
   */
  forceScan() {
    this._scanForHaulingNeeds();
  }

  /**
   * Export manager state
   * @returns {object}
   */
  toJSON() {
    return {
      tasks: Array.from(this.tasks.values())
        .filter(t => !t.isTerminal())
        .map(t => t.toJSON()),
      pendingTasks: this.pendingTasks.map(t => t.toJSON()),
      npcTasks: Object.fromEntries(this.npcTasks),
      stats: this.stats,
      enabled: this.enabled
    };
  }

  /**
   * Import manager state
   * @param {object} data
   */
  fromJSON(data) {
    this.tasks.clear();
    this.pendingTasks = [];
    this.npcTasks.clear();

    // Restore tasks
    if (data.tasks) {
      for (const taskData of data.tasks) {
        const task = HaulTask.fromJSON(taskData);
        task.onComplete = (t) => this._handleTaskComplete(t);
        task.onFail = (t, reason) => this._handleTaskFail(t, reason);
        task.onCancel = (t, reason) => this._handleTaskCancel(t, reason);
        this.tasks.set(task.id, task);
      }
    }

    // Restore pending tasks
    if (data.pendingTasks) {
      for (const taskData of data.pendingTasks) {
        const task = HaulTask.fromJSON(taskData);
        task.onComplete = (t) => this._handleTaskComplete(t);
        task.onFail = (t, reason) => this._handleTaskFail(t, reason);
        task.onCancel = (t, reason) => this._handleTaskCancel(t, reason);
        this.pendingTasks.push(task);
      }
    }

    // Restore NPC assignments
    if (data.npcTasks) {
      for (const [npcId, taskId] of Object.entries(data.npcTasks)) {
        this.npcTasks.set(npcId, taskId);
      }
    }

    // Restore stats
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    this.enabled = data.enabled !== false;
  }
}
