/**
 * FarmingZoneBehavior.js - Manages farming tasks within farming zones
 *
 * Farm lifecycle per tile: EMPTY → PLANTED → GROWING → READY → HARVESTED → EMPTY
 * NPCs autonomously plant and harvest crops.
 * Unattended farms auto-collect at 25% rate.
 */

import {
  FARM_GROW_TIME,
  FARM_HARVEST_YIELD,
  FARM_PLANT_TIME,
  FARM_HARVEST_TIME,
  FARM_UNATTENDED_RATE,
  MAX_FARMERS_PER_ZONE,
} from '../../data/tuning.js';
import { ZONE_TYPES } from './ZoneManager.js';

export const FARM_TILE_STATUS = {
  EMPTY: 'EMPTY',
  PLANTED: 'PLANTED',
  GROWING: 'GROWING',
  READY: 'READY',
  HARVESTED: 'HARVESTED',
};

export const FARM_TASK_TYPE = {
  PLANT: 'FARM_PLANT',
  HARVEST: 'FARM_HARVEST',
};

class FarmingZoneBehavior {
  /**
   * @param {Object} deps
   * @param {Object} deps.zoneManager - ZoneManager instance
   * @param {Object} deps.settlementModule - Parent SettlementModule for events
   */
  constructor(deps = {}) {
    this.zoneManager = deps.zoneManager || null;
    this.settlementModule = deps.settlementModule || null;

    /** @type {Map<string, Map<string, Object>>} zoneId → Map<tileKey, tileState> */
    this.farmTiles = new Map();

    /** @type {Map<string, Object>} taskId → farm task */
    this.tasks = new Map();

    /** @type {Map<string, Set<string>>} zoneId → Set of assigned NPC IDs */
    this.assignedFarmers = new Map();

    this._nextTaskId = 1;
  }

  /**
   * Called when a farming zone is created — initialize tiles.
   * @param {Object} zone
   */
  onZoneCreated(zone) {
    if (zone.type !== ZONE_TYPES.FARMING) return;
    this._initializeTiles(zone);
  }

  /**
   * Called when a farming zone is deleted.
   * @param {Object} zone
   */
  onZoneDeleted(zone) {
    if (zone.type !== ZONE_TYPES.FARMING) return;
    this.farmTiles.delete(zone.id);
    this.assignedFarmers.delete(zone.id);

    // Remove tasks for this zone
    for (const [taskId, task] of this.tasks) {
      if (task.zoneId === zone.id) {
        this.tasks.delete(taskId);
      }
    }
  }

  /**
   * Initialize farm tiles for a zone (ground-level tiles only).
   */
  _initializeTiles(zone) {
    const { min, max } = zone.bounds;
    const tiles = new Map();

    // Farm tiles are on the ground plane (use min.y)
    const y = Math.floor(min.y);
    for (let x = Math.floor(min.x); x < Math.ceil(max.x); x++) {
      for (let z = Math.floor(min.z); z < Math.ceil(max.z); z++) {
        const key = `${x},${y},${z}`;
        tiles.set(key, {
          position: { x, y, z },
          status: FARM_TILE_STATUS.EMPTY,
          growthTimer: 0,
          harvestCooldown: 0,
        });
      }
    }

    this.farmTiles.set(zone.id, tiles);
    this.assignedFarmers.set(zone.id, new Set());
  }

  // ── Tick ──────────────────────────────────────────────────

  /**
   * Update farm zones — advance growth timers, handle auto-collection.
   * @param {number} deltaSeconds
   * @returns {Object} Tick summary
   */
  update(deltaSeconds) {
    let totalHarvested = 0;
    let totalAutoCollected = 0;

    for (const [zoneId, tiles] of this.farmTiles) {
      // Check if zone is still active
      if (this.zoneManager) {
        const zone = this.zoneManager.getZone(zoneId);
        if (!zone || !zone.active) continue;
      }

      const farmers = this.assignedFarmers.get(zoneId);
      const hasFarmer = farmers && farmers.size > 0;

      for (const [key, tile] of tiles) {
        switch (tile.status) {
          case FARM_TILE_STATUS.GROWING:
            tile.growthTimer += deltaSeconds;
            if (tile.growthTimer >= FARM_GROW_TIME) {
              tile.status = FARM_TILE_STATUS.READY;
              tile.growthTimer = 0;
            }
            break;

          case FARM_TILE_STATUS.READY:
            // Unattended auto-collection
            if (!hasFarmer) {
              tile.growthTimer += deltaSeconds;
              if (tile.growthTimer >= FARM_GROW_TIME) {
                const autoYield = Math.floor(FARM_HARVEST_YIELD * FARM_UNATTENDED_RATE);
                if (autoYield > 0) {
                  totalAutoCollected += autoYield;
                  if (this.settlementModule) {
                    this.settlementModule.emit('farming:auto-harvest', {
                      zoneId,
                      position: tile.position,
                      yield: autoYield,
                    });
                  }
                }
                tile.status = FARM_TILE_STATUS.HARVESTED;
                tile.growthTimer = 0;
                tile.harvestCooldown = 5; // brief cooldown before replanting
              }
            }
            break;

          case FARM_TILE_STATUS.HARVESTED:
            tile.harvestCooldown -= deltaSeconds;
            if (tile.harvestCooldown <= 0) {
              tile.status = FARM_TILE_STATUS.EMPTY;
              tile.harvestCooldown = 0;
            }
            break;
        }
      }

      // Generate tasks for this zone
      this._generateTasks(zoneId, tiles);
    }

    return {
      totalTiles: this._getTotalTileCount(),
      totalHarvested,
      totalAutoCollected,
      totalTasks: this.tasks.size,
    };
  }

  /**
   * Generate farming tasks for empty (plant) and ready (harvest) tiles.
   */
  _generateTasks(zoneId, tiles) {
    for (const [key, tile] of tiles) {
      const hasTask = this._hasTaskForTile(zoneId, key);
      if (hasTask) continue;

      if (tile.status === FARM_TILE_STATUS.EMPTY) {
        const taskId = `farm_${this._nextTaskId++}`;
        this.tasks.set(taskId, {
          id: taskId,
          zoneId,
          type: FARM_TASK_TYPE.PLANT,
          tileKey: key,
          position: { ...tile.position },
          status: 'PENDING',
          assignedNpcId: null,
          workTime: FARM_PLANT_TIME,
        });
      } else if (tile.status === FARM_TILE_STATUS.READY) {
        const taskId = `farm_${this._nextTaskId++}`;
        this.tasks.set(taskId, {
          id: taskId,
          zoneId,
          type: FARM_TASK_TYPE.HARVEST,
          tileKey: key,
          position: { ...tile.position },
          status: 'PENDING',
          assignedNpcId: null,
          workTime: FARM_HARVEST_TIME,
        });
      }
    }
  }

  _hasTaskForTile(zoneId, tileKey) {
    for (const task of this.tasks.values()) {
      if (task.zoneId === zoneId && task.tileKey === tileKey &&
          task.status !== 'COMPLETED') {
        return true;
      }
    }
    return false;
  }

  _getTotalTileCount() {
    let count = 0;
    for (const tiles of this.farmTiles.values()) {
      count += tiles.size;
    }
    return count;
  }

  // ── NPC Interface ──────────────────────────────────────────

  /**
   * Get available farming tasks, optionally filtered by zone.
   * @param {string} [zoneId]
   * @returns {Object[]}
   */
  getAvailableTasks(zoneId) {
    const available = [];
    for (const task of this.tasks.values()) {
      if (task.status !== 'PENDING') continue;
      if (zoneId && task.zoneId !== zoneId) continue;
      available.push(task);
    }
    // Harvest tasks should be higher priority than plant tasks
    available.sort((a, b) => {
      if (a.type === FARM_TASK_TYPE.HARVEST && b.type !== FARM_TASK_TYPE.HARVEST) return -1;
      if (b.type === FARM_TASK_TYPE.HARVEST && a.type !== FARM_TASK_TYPE.HARVEST) return 1;
      return 0;
    });
    return available;
  }

  /**
   * Claim a farming task for an NPC.
   * @param {string} taskId
   * @param {string} npcId
   * @returns {{ success: boolean, error?: string }}
   */
  claimTask(taskId, npcId) {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: 'Task not found' };
    if (task.status !== 'PENDING') return { success: false, error: 'Task already claimed' };

    // Check farmer limit per zone
    const farmers = this.assignedFarmers.get(task.zoneId);
    if (farmers && farmers.size >= MAX_FARMERS_PER_ZONE && !farmers.has(npcId)) {
      return { success: false, error: 'Maximum farmers reached for this zone' };
    }

    task.status = 'CLAIMED';
    task.assignedNpcId = npcId;
    if (farmers) farmers.add(npcId);

    return { success: true };
  }

  /**
   * Release a claimed task.
   * @param {string} taskId
   */
  releaseTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (task.assignedNpcId) {
      const farmers = this.assignedFarmers.get(task.zoneId);
      if (farmers) farmers.delete(task.assignedNpcId);
    }

    task.status = 'PENDING';
    task.assignedNpcId = null;
  }

  /**
   * Complete a farming task.
   * @param {string} taskId
   * @returns {{ type: string, position: Object, yield?: number } | null}
   */
  completeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const tiles = this.farmTiles.get(task.zoneId);
    const tile = tiles ? tiles.get(task.tileKey) : null;

    let result = null;

    if (task.type === FARM_TASK_TYPE.PLANT && tile) {
      tile.status = FARM_TILE_STATUS.GROWING;
      tile.growthTimer = 0;
      result = { type: 'PLANT', position: { ...task.position } };

      if (this.settlementModule) {
        this.settlementModule.emit('farming:planted', result);
      }
    } else if (task.type === FARM_TASK_TYPE.HARVEST && tile) {
      tile.status = FARM_TILE_STATUS.HARVESTED;
      tile.harvestCooldown = 5;
      result = {
        type: 'HARVEST',
        position: { ...task.position },
        yield: FARM_HARVEST_YIELD,
      };

      if (this.settlementModule) {
        this.settlementModule.emit('farming:harvested', result);
      }
    }

    // Remove farmer assignment
    if (task.assignedNpcId) {
      const farmers = this.assignedFarmers.get(task.zoneId);
      if (farmers) farmers.delete(task.assignedNpcId);
    }

    this.tasks.delete(taskId);
    return result;
  }

  // ── Progress ──────────────────────────────────────────────

  /**
   * Get farm zone status.
   * @param {string} zoneId
   * @returns {Object|null}
   */
  getZoneStatus(zoneId) {
    const tiles = this.farmTiles.get(zoneId);
    if (!tiles) return null;

    const counts = {
      empty: 0,
      planted: 0,
      growing: 0,
      ready: 0,
      harvested: 0,
    };

    for (const tile of tiles.values()) {
      const key = tile.status.toLowerCase();
      if (key in counts) counts[key]++;
    }

    const farmers = this.assignedFarmers.get(zoneId);

    return {
      totalTiles: tiles.size,
      ...counts,
      assignedFarmers: farmers ? farmers.size : 0,
      maxFarmers: MAX_FARMERS_PER_ZONE,
    };
  }

  // ── Serialization ────────────────────────────────────────

  serialize() {
    const farmTiles = {};
    for (const [zoneId, tiles] of this.farmTiles) {
      farmTiles[zoneId] = {};
      for (const [key, tile] of tiles) {
        farmTiles[zoneId][key] = { ...tile };
      }
    }

    const tasks = [];
    for (const task of this.tasks.values()) {
      tasks.push({ ...task });
    }

    return {
      farmTiles,
      tasks,
      nextTaskId: this._nextTaskId,
    };
  }

  deserialize(state) {
    if (!state) return;

    this.farmTiles.clear();
    if (state.farmTiles) {
      for (const [zoneId, tiles] of Object.entries(state.farmTiles)) {
        const tileMap = new Map();
        for (const [key, tile] of Object.entries(tiles)) {
          tileMap.set(key, { ...tile });
        }
        this.farmTiles.set(zoneId, tileMap);
        this.assignedFarmers.set(zoneId, new Set());
      }
    }

    this.tasks.clear();
    if (state.tasks) {
      for (const task of state.tasks) {
        this.tasks.set(task.id, { ...task });
      }
    }

    if (state.nextTaskId != null) {
      this._nextTaskId = state.nextTaskId;
    }
  }
}

export default FarmingZoneBehavior;
