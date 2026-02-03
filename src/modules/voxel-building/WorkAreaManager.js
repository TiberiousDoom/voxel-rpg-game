/**
 * WorkAreaManager.js - Manages work area priorities
 *
 * Allows players to designate priority work zones and
 * control NPC work assignments.
 *
 * Part of Phase 25: Quality of Life Features
 */

/**
 * Work area priority levels
 */
export const WorkPriority = {
  PAUSED: 0,
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4
};

/**
 * Work area types
 */
export const WorkAreaType = {
  MINING: 'mining',
  CONSTRUCTION: 'construction',
  HAULING: 'hauling',
  GENERAL: 'general'
};

/**
 * WorkArea - Defines a prioritized work zone
 */
export class WorkArea {
  constructor(config = {}) {
    this.id = config.id || `area-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.name = config.name || 'Work Area';
    this.type = config.type || WorkAreaType.GENERAL;
    this.bounds = config.bounds || { x: 0, y: 0, z: 0, width: 1, depth: 1, height: 1 };
    this.priority = config.priority || WorkPriority.NORMAL;
    this.enabled = config.enabled !== false;
    this.assignedNpcs = new Set();
    this.maxWorkers = config.maxWorkers || 0; // 0 = unlimited
    this.createdAt = Date.now();
  }

  /**
   * Check if position is within this area
   */
  contains(x, y, z) {
    return x >= this.bounds.x &&
           x < this.bounds.x + this.bounds.width &&
           y >= this.bounds.y &&
           y < this.bounds.y + this.bounds.depth &&
           z >= this.bounds.z &&
           z < this.bounds.z + this.bounds.height;
  }

  /**
   * Assign NPC to this area
   */
  assignNpc(npcId) {
    if (this.maxWorkers > 0 && this.assignedNpcs.size >= this.maxWorkers) {
      return false;
    }
    this.assignedNpcs.add(npcId);
    return true;
  }

  /**
   * Remove NPC from this area
   */
  unassignNpc(npcId) {
    return this.assignedNpcs.delete(npcId);
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      bounds: this.bounds,
      priority: this.priority,
      enabled: this.enabled,
      assignedNpcs: Array.from(this.assignedNpcs),
      maxWorkers: this.maxWorkers,
      createdAt: this.createdAt
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    const area = new WorkArea(data);
    if (data.assignedNpcs) {
      area.assignedNpcs = new Set(data.assignedNpcs);
    }
    return area;
  }
}

/**
 * WorkAreaManager - Manages work area zones
 */
export class WorkAreaManager {
  constructor(config = {}) {
    this.areas = new Map(); // areaId -> WorkArea
    this.defaultPriority = config.defaultPriority || WorkPriority.NORMAL;
  }

  /**
   * Create a new work area
   */
  createArea(config) {
    const area = new WorkArea(config);
    this.areas.set(area.id, area);
    return area;
  }

  /**
   * Remove a work area
   */
  removeArea(areaId) {
    return this.areas.delete(areaId);
  }

  /**
   * Get work area by ID
   */
  getArea(areaId) {
    return this.areas.get(areaId) || null;
  }

  /**
   * Get all work areas
   */
  getAllAreas() {
    return Array.from(this.areas.values());
  }

  /**
   * Get areas of a specific type
   */
  getAreasByType(type) {
    return this.getAllAreas().filter(a => a.type === type);
  }

  /**
   * Get priority for a position
   * Returns highest priority from overlapping areas
   */
  getPriorityAt(x, y, z) {
    let highestPriority = this.defaultPriority;

    for (const area of this.areas.values()) {
      if (area.enabled && area.contains(x, y, z)) {
        if (area.priority > highestPriority) {
          highestPriority = area.priority;
        }
      }
    }

    return highestPriority;
  }

  /**
   * Check if position is paused
   */
  isPaused(x, y, z) {
    for (const area of this.areas.values()) {
      if (area.enabled && area.contains(x, y, z) && area.priority === WorkPriority.PAUSED) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get areas containing a position
   */
  getAreasAt(x, y, z) {
    return this.getAllAreas().filter(a => a.enabled && a.contains(x, y, z));
  }

  /**
   * Set area priority
   */
  setAreaPriority(areaId, priority) {
    const area = this.areas.get(areaId);
    if (area) {
      area.priority = priority;
      return true;
    }
    return false;
  }

  /**
   * Toggle area enabled state
   */
  toggleArea(areaId) {
    const area = this.areas.get(areaId);
    if (area) {
      area.enabled = !area.enabled;
      return area.enabled;
    }
    return false;
  }

  /**
   * Rename area
   */
  renameArea(areaId, name) {
    const area = this.areas.get(areaId);
    if (area) {
      area.name = name;
      return true;
    }
    return false;
  }

  /**
   * Get statistics
   */
  getStats() {
    const areas = this.getAllAreas();
    return {
      totalAreas: areas.length,
      enabledAreas: areas.filter(a => a.enabled).length,
      pausedAreas: areas.filter(a => a.priority === WorkPriority.PAUSED).length,
      areasByType: {
        mining: areas.filter(a => a.type === WorkAreaType.MINING).length,
        construction: areas.filter(a => a.type === WorkAreaType.CONSTRUCTION).length,
        hauling: areas.filter(a => a.type === WorkAreaType.HAULING).length,
        general: areas.filter(a => a.type === WorkAreaType.GENERAL).length
      }
    };
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      areas: Array.from(this.areas.values()).map(a => a.toJSON()),
      defaultPriority: this.defaultPriority
    };
  }

  /**
   * Import from JSON
   */
  fromJSON(data) {
    this.areas.clear();
    if (data.areas) {
      for (const areaData of data.areas) {
        const area = WorkArea.fromJSON(areaData);
        this.areas.set(area.id, area);
      }
    }
    if (data.defaultPriority !== undefined) {
      this.defaultPriority = data.defaultPriority;
    }
  }

  /**
   * Clear all areas
   */
  clear() {
    this.areas.clear();
  }
}

export default WorkAreaManager;
