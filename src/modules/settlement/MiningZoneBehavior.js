/**
 * MiningZoneBehavior.js - Generates and manages mining tasks within mining zones
 *
 * When a MINING zone is created, scans all solid blocks within bounds
 * and generates mining tasks. NPCs with mining skill claim tasks from
 * the zone's task queue.
 *
 * Task priority: ore blocks > surface blocks > deep blocks.
 * Mined blocks generate hauling tasks to nearest STOCKPILE zone.
 */

import {
  MINING_TASK_REGEN_INTERVAL,
  MINING_BASE_TIME_PER_BLOCK,
  MINING_SKILL_BASE,
} from '../../data/tuning.js';
import { ZONE_TYPES } from './ZoneManager.js';

// Block value for mining priority (higher = mined first)
const BLOCK_PRIORITY = {
  diamond_ore: 100,
  gold_ore: 80,
  iron_ore: 60,
  coal_ore: 40,
  crystal: 90,
  stone: 10,
  dirt: 5,
  sand: 5,
  default: 8,
};

/**
 * Mining task status
 */
export const MINING_TASK_STATUS = {
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  COMPLETED: 'COMPLETED',
};

class MiningZoneBehavior {
  /**
   * @param {Object} deps
   * @param {Object} deps.zoneManager - ZoneManager instance
   * @param {Object} deps.grid - GridManager or world data for block queries
   * @param {Object} deps.settlementModule - Parent SettlementModule for events
   */
  constructor(deps = {}) {
    this.zoneManager = deps.zoneManager || null;
    this.grid = deps.grid || null;
    this.settlementModule = deps.settlementModule || null;

    /** @type {Map<string, Object>} taskId → mining task */
    this.tasks = new Map();

    /** @type {Map<string, Object>} zoneId → zone progress tracking */
    this.zoneProgress = new Map();

    this._nextTaskId = 1;
    this._regenTimer = 0;
  }

  /**
   * Called when a mining zone is created — scan and generate initial tasks.
   * @param {Object} zone - Zone object from ZoneManager
   */
  onZoneCreated(zone) {
    if (zone.type !== ZONE_TYPES.MINING) return;
    this._generateTasksForZone(zone);
  }

  /**
   * Called when a mining zone is deleted — remove all tasks for that zone.
   * @param {Object} zone
   */
  onZoneDeleted(zone) {
    if (zone.type !== ZONE_TYPES.MINING) return;

    for (const [taskId, task] of this.tasks) {
      if (task.zoneId === zone.id) {
        this.tasks.delete(taskId);
      }
    }
    this.zoneProgress.delete(zone.id);
  }

  /**
   * Generate mining tasks for all solid blocks within a zone's bounds.
   * @param {Object} zone
   */
  _generateTasksForZone(zone) {
    const { min, max } = zone.bounds;
    const blocks = [];

    // Scan all positions within the zone
    for (let x = Math.floor(min.x); x < Math.ceil(max.x); x++) {
      for (let y = Math.floor(min.y); y < Math.ceil(max.y); y++) {
        for (let z = Math.floor(min.z); z < Math.ceil(max.z); z++) {
          const blockType = this._getBlockAt(x, y, z);
          if (blockType && blockType !== 'air') {
            const hasExposedFace = this._hasExposedFace(x, y, z);
            blocks.push({
              position: { x, y, z },
              blockType,
              priority: this._getBlockPriority(blockType, y, min.y, max.y, hasExposedFace),
            });
          }
        }
      }
    }

    // Sort by priority (highest first)
    blocks.sort((a, b) => b.priority - a.priority);

    let totalBlocks = 0;
    for (const block of blocks) {
      // Skip if task already exists for this position
      if (this._hasTaskAt(block.position, zone.id)) continue;

      const taskId = `mining_${this._nextTaskId++}`;
      this.tasks.set(taskId, {
        id: taskId,
        zoneId: zone.id,
        type: 'MINE',
        position: block.position,
        blockType: block.blockType,
        priority: block.priority,
        status: MINING_TASK_STATUS.PENDING,
        assignedNpcId: null,
        mineTime: MINING_BASE_TIME_PER_BLOCK,
      });
      totalBlocks++;
    }

    this.zoneProgress.set(zone.id, {
      totalBlocks,
      minedBlocks: 0,
    });
  }

  /**
   * Get block type at position. Delegates to grid/world system.
   */
  _getBlockAt(x, y, z) {
    if (!this.grid) return null;

    // Try grid.getBlockAt or grid.getBlock depending on the API
    if (typeof this.grid.getBlockAt === 'function') {
      return this.grid.getBlockAt(x, y, z);
    }
    if (typeof this.grid.getBlock === 'function') {
      return this.grid.getBlock(x, y, z);
    }
    return null;
  }

  /**
   * Check if a block has at least one exposed face (adjacent to air).
   */
  _hasExposedFace(x, y, z) {
    const neighbors = [
      [x + 1, y, z], [x - 1, y, z],
      [x, y + 1, z], [x, y - 1, z],
      [x, y, z + 1], [x, y, z - 1],
    ];
    for (const [nx, ny, nz] of neighbors) {
      const block = this._getBlockAt(nx, ny, nz);
      if (!block || block === 'air') return true;
    }
    return false;
  }

  /**
   * Calculate mining priority for a block.
   */
  _getBlockPriority(blockType, y, minY, maxY, hasExposedFace) {
    const baseValue = BLOCK_PRIORITY[blockType] || BLOCK_PRIORITY.default;
    // Bonus for exposed faces (accessible)
    const exposedBonus = hasExposedFace ? 20 : 0;
    // Bonus for surface blocks (mine top-down)
    const depthRange = maxY - minY || 1;
    const surfaceBonus = Math.round(((y - minY) / depthRange) * 10);
    return baseValue + exposedBonus + surfaceBonus;
  }

  /**
   * Check if a task already exists at a given position for a zone.
   */
  _hasTaskAt(position, zoneId) {
    for (const task of this.tasks.values()) {
      if (task.zoneId === zoneId &&
          task.position.x === position.x &&
          task.position.y === position.y &&
          task.position.z === position.z) {
        return true;
      }
    }
    return false;
  }

  // ── NPC Interface ──────────────────────────────────────────

  /**
   * Get available (unclaimed) mining tasks, sorted by priority.
   * @param {string} [zoneId] - Optional filter to specific zone
   * @returns {Object[]} Available tasks sorted by priority
   */
  getAvailableTasks(zoneId) {
    const available = [];
    for (const task of this.tasks.values()) {
      if (task.status !== MINING_TASK_STATUS.PENDING) continue;
      if (zoneId && task.zoneId !== zoneId) continue;
      // Only include tasks in active zones
      if (this.zoneManager) {
        const zone = this.zoneManager.getZone(task.zoneId);
        if (!zone || !zone.active) continue;
      }
      available.push(task);
    }
    available.sort((a, b) => b.priority - a.priority);
    return available;
  }

  /**
   * Claim a task for an NPC.
   * @param {string} taskId
   * @param {string} npcId
   * @returns {{ success: boolean, error?: string }}
   */
  claimTask(taskId, npcId) {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: 'Task not found' };
    if (task.status !== MINING_TASK_STATUS.PENDING) {
      return { success: false, error: 'Task already claimed' };
    }

    task.status = MINING_TASK_STATUS.CLAIMED;
    task.assignedNpcId = npcId;
    return { success: true };
  }

  /**
   * Release a claimed task (NPC interrupted or failed).
   * @param {string} taskId
   */
  releaseTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = MINING_TASK_STATUS.PENDING;
    task.assignedNpcId = null;
  }

  /**
   * Complete a mining task (block mined).
   * @param {string} taskId
   * @returns {{ position: Object, blockType: string, zoneId: string } | null}
   */
  completeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const result = {
      position: { ...task.position },
      blockType: task.blockType,
      zoneId: task.zoneId,
    };

    this.tasks.delete(taskId);

    // Update zone progress
    const progress = this.zoneProgress.get(task.zoneId);
    if (progress) {
      progress.minedBlocks++;
    }

    if (this.settlementModule) {
      this.settlementModule.emit('mining:block-mined', result);
    }

    return result;
  }

  /**
   * Calculate mining time for an NPC based on skill.
   * @param {number} miningSkill - NPC mining skill (0-5)
   * @returns {number} Time in seconds to mine one block
   */
  getMineTime(miningSkill = 1) {
    return MINING_BASE_TIME_PER_BLOCK / (MINING_SKILL_BASE + miningSkill);
  }

  // ── Progress ──────────────────────────────────────────────

  /**
   * Get progress for a specific zone.
   * @param {string} zoneId
   * @returns {{ totalBlocks: number, minedBlocks: number, pendingTasks: number, claimedTasks: number } | null}
   */
  getZoneProgress(zoneId) {
    const progress = this.zoneProgress.get(zoneId);
    if (!progress) return null;

    let pendingTasks = 0;
    let claimedTasks = 0;
    for (const task of this.tasks.values()) {
      if (task.zoneId !== zoneId) continue;
      if (task.status === MINING_TASK_STATUS.PENDING) pendingTasks++;
      else if (task.status === MINING_TASK_STATUS.CLAIMED) claimedTasks++;
    }

    return {
      ...progress,
      pendingTasks,
      claimedTasks,
    };
  }

  // ── Tick ──────────────────────────────────────────────────

  /**
   * Per-tick update. Periodically regenerates tasks for zones
   * that may have new blocks (e.g., zone expanded or blocks placed).
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    this._regenTimer += deltaSeconds;
    if (this._regenTimer >= MINING_TASK_REGEN_INTERVAL) {
      this._regenTimer = 0;
      // Regenerate tasks for all active mining zones
      if (this.zoneManager) {
        const miningZones = this.zoneManager.getActiveZonesByType(ZONE_TYPES.MINING);
        for (const zone of miningZones) {
          this._generateTasksForZone(zone);
        }
      }
    }

    return {
      totalTasks: this.tasks.size,
      pendingTasks: [...this.tasks.values()].filter(t => t.status === MINING_TASK_STATUS.PENDING).length,
    };
  }

  // ── Serialization ────────────────────────────────────────

  serialize() {
    const tasks = [];
    for (const task of this.tasks.values()) {
      tasks.push({ ...task });
    }

    const zoneProgress = {};
    for (const [zoneId, progress] of this.zoneProgress) {
      zoneProgress[zoneId] = { ...progress };
    }

    return {
      tasks,
      zoneProgress,
      nextTaskId: this._nextTaskId,
    };
  }

  deserialize(state) {
    if (!state) return;

    this.tasks.clear();
    if (state.tasks) {
      for (const task of state.tasks) {
        this.tasks.set(task.id, { ...task });
      }
    }

    this.zoneProgress.clear();
    if (state.zoneProgress) {
      for (const [zoneId, progress] of Object.entries(state.zoneProgress)) {
        this.zoneProgress.set(zoneId, { ...progress });
      }
    }

    if (state.nextTaskId != null) {
      this._nextTaskId = state.nextTaskId;
    }
  }
}

export default MiningZoneBehavior;
