/**
 * ZoneManager.js - Manages designated zones within the settlement
 *
 * Players designate rectangular areas for specific purposes (mining, stockpile,
 * farming, building, restricted). Zones tell NPCs *where* to work.
 *
 * Zone data shape:
 *   { id, type, bounds: {min: {x,y,z}, max: {x,y,z}}, priority: 1-5, active: boolean, label: string }
 *
 * Overlap rules:
 *   - STOCKPILE zones cannot overlap other STOCKPILE zones
 *   - MINING zones can overlap (merged into one work area)
 *   - RESTRICTED zones override all others — NPCs avoid them entirely
 *   - FARMING and BUILDING zones follow STOCKPILE rules (no same-type overlap)
 *
 * Performance guard: max 20 zones per type.
 */

export const ZONE_TYPES = {
  MINING: 'MINING',
  STOCKPILE: 'STOCKPILE',
  FARMING: 'FARMING',
  BUILDING: 'BUILDING',
  RESTRICTED: 'RESTRICTED',
};

export const MAX_ZONES_PER_TYPE = 20;

// Types that cannot overlap with the same type
const NO_SELF_OVERLAP_TYPES = new Set([
  ZONE_TYPES.STOCKPILE,
  ZONE_TYPES.FARMING,
  ZONE_TYPES.BUILDING,
]);

class ZoneManager {
  /**
   * @param {Object} deps
   * @param {Object} deps.grid - GridManager instance
   * @param {Object} deps.settlementModule - Parent SettlementModule (for events)
   */
  constructor(deps = {}) {
    this.grid = deps.grid || null;
    this.settlementModule = deps.settlementModule || null;

    /** @type {Map<string, Object>} zone id → zone data */
    this.zones = new Map();

    this._nextId = 1;
  }

  /**
   * Create a new zone.
   * @param {Object} params
   * @param {string} params.type - One of ZONE_TYPES
   * @param {Object} params.bounds - { min: {x,y,z}, max: {x,y,z} }
   * @param {number} [params.priority=3] - Priority 1 (low) to 5 (high)
   * @param {string} [params.label] - Optional display label
   * @returns {{ success: boolean, zone?: Object, error?: string }}
   */
  createZone({ type, bounds, priority = 3, label = '' }) {
    // Validate type
    if (!ZONE_TYPES[type]) {
      return { success: false, error: `Invalid zone type: ${type}` };
    }

    // Validate bounds
    if (!bounds || !bounds.min || !bounds.max) {
      return { success: false, error: 'Bounds must have min and max with x, y, z' };
    }

    // Normalize bounds so min < max on each axis
    const normalizedBounds = {
      min: {
        x: Math.min(bounds.min.x, bounds.max.x),
        y: Math.min(bounds.min.y, bounds.max.y),
        z: Math.min(bounds.min.z, bounds.max.z),
      },
      max: {
        x: Math.max(bounds.min.x, bounds.max.x),
        y: Math.max(bounds.min.y, bounds.max.y),
        z: Math.max(bounds.min.z, bounds.max.z),
      },
    };

    // Validate priority
    const clampedPriority = Math.max(1, Math.min(5, Math.round(priority)));

    // Check zone limit per type
    const typeCount = this._countByType(type);
    if (typeCount >= MAX_ZONES_PER_TYPE) {
      return {
        success: false,
        error: `Maximum ${MAX_ZONES_PER_TYPE} ${type} zones reached`,
      };
    }

    // Check overlap rules
    if (NO_SELF_OVERLAP_TYPES.has(type)) {
      const overlapping = this._findOverlapping(type, normalizedBounds);
      if (overlapping.length > 0) {
        return {
          success: false,
          error: `${type} zones cannot overlap other ${type} zones`,
        };
      }
    }

    const id = `zone_${this._nextId++}`;
    const zone = {
      id,
      type,
      bounds: normalizedBounds,
      priority: clampedPriority,
      active: true,
      label: label || `${type.charAt(0) + type.slice(1).toLowerCase()} Zone ${id.split('_')[1]}`,
    };

    this.zones.set(id, zone);

    if (this.settlementModule) {
      this.settlementModule.emit('zone:created', { zone });
    }

    return { success: true, zone };
  }

  /**
   * Delete a zone by ID.
   * @param {string} id
   * @returns {{ success: boolean, error?: string }}
   */
  deleteZone(id) {
    const zone = this.zones.get(id);
    if (!zone) {
      return { success: false, error: `Zone not found: ${id}` };
    }

    this.zones.delete(id);

    if (this.settlementModule) {
      this.settlementModule.emit('zone:deleted', { zone });
    }

    return { success: true };
  }

  /**
   * Update zone priority.
   * @param {string} id
   * @param {number} priority - 1-5
   * @returns {{ success: boolean, error?: string }}
   */
  setZonePriority(id, priority) {
    const zone = this.zones.get(id);
    if (!zone) return { success: false, error: `Zone not found: ${id}` };

    zone.priority = Math.max(1, Math.min(5, Math.round(priority)));
    return { success: true };
  }

  /**
   * Toggle zone active state.
   * @param {string} id
   * @param {boolean} active
   * @returns {{ success: boolean, error?: string }}
   */
  setZoneActive(id, active) {
    const zone = this.zones.get(id);
    if (!zone) return { success: false, error: `Zone not found: ${id}` };

    zone.active = !!active;
    return { success: true };
  }

  // ── Queries ────────────────────────────────────────────────

  /**
   * Get all zones, optionally filtered by type.
   * @param {string} [type] - Filter by ZONE_TYPES value
   * @returns {Object[]}
   */
  getZones(type) {
    const result = [];
    for (const zone of this.zones.values()) {
      if (!type || zone.type === type) {
        result.push(zone);
      }
    }
    return result;
  }

  /**
   * Get a zone by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getZone(id) {
    return this.zones.get(id) || null;
  }

  /**
   * Find all active zones containing a world position.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {string} [type] - Optional type filter
   * @returns {Object[]} Matching zones, sorted by priority (highest first)
   */
  getZonesAtPosition(x, y, z, type) {
    const result = [];
    for (const zone of this.zones.values()) {
      if (!zone.active) continue;
      if (type && zone.type !== type) continue;
      if (this._containsPoint(zone.bounds, x, y, z)) {
        result.push(zone);
      }
    }
    result.sort((a, b) => b.priority - a.priority);
    return result;
  }

  /**
   * Check if a position is inside a RESTRICTED zone.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  isRestricted(x, y, z) {
    for (const zone of this.zones.values()) {
      if (!zone.active) continue;
      if (zone.type !== ZONE_TYPES.RESTRICTED) continue;
      if (this._containsPoint(zone.bounds, x, y, z)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get active zones of a given type sorted by priority (highest first).
   * @param {string} type
   * @returns {Object[]}
   */
  getActiveZonesByType(type) {
    const result = [];
    for (const zone of this.zones.values()) {
      if (zone.active && zone.type === type) {
        result.push(zone);
      }
    }
    result.sort((a, b) => b.priority - a.priority);
    return result;
  }

  // ── Tick ───────────────────────────────────────────────────

  /**
   * Per-tick update. Currently a no-op — zone state is event-driven.
   * Future: could handle zone decay, auto-expand, etc.
   */
  update(/* deltaSeconds, gameState */) {
    return {
      totalZones: this.zones.size,
    };
  }

  // ── Serialization ──────────────────────────────────────────

  serialize() {
    const zones = [];
    for (const zone of this.zones.values()) {
      zones.push({ ...zone });
    }
    return {
      zones,
      nextId: this._nextId,
    };
  }

  deserialize(state) {
    if (!state) return;

    this.zones.clear();
    if (state.zones) {
      for (const zone of state.zones) {
        this.zones.set(zone.id, { ...zone });
      }
    }
    if (state.nextId != null) {
      this._nextId = state.nextId;
    }
  }

  // ── Internal helpers ───────────────────────────────────────

  _countByType(type) {
    let count = 0;
    for (const zone of this.zones.values()) {
      if (zone.type === type) count++;
    }
    return count;
  }

  /**
   * Find zones of the given type that overlap with bounds.
   */
  _findOverlapping(type, bounds) {
    const result = [];
    for (const zone of this.zones.values()) {
      if (zone.type !== type) continue;
      if (this._boundsOverlap(zone.bounds, bounds)) {
        result.push(zone);
      }
    }
    return result;
  }

  /**
   * AABB overlap test for two 3D bounding boxes.
   */
  _boundsOverlap(a, b) {
    return (
      a.min.x < b.max.x && a.max.x > b.min.x &&
      a.min.y < b.max.y && a.max.y > b.min.y &&
      a.min.z < b.max.z && a.max.z > b.min.z
    );
  }

  /**
   * Check if point (x,y,z) is inside bounds (inclusive min, exclusive max).
   */
  _containsPoint(bounds, x, y, z) {
    return (
      x >= bounds.min.x && x < bounds.max.x &&
      y >= bounds.min.y && y < bounds.max.y &&
      z >= bounds.min.z && z < bounds.max.z
    );
  }
}

export default ZoneManager;
