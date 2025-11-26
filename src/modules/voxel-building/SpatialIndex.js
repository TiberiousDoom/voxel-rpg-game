/**
 * SpatialIndex.js - Spatial indexing for efficient queries
 *
 * Provides fast spatial lookups for voxel building operations.
 *
 * Part of Phase 23: Performance Optimization
 */

/**
 * SpatialIndex - Grid-based spatial indexing
 */
export class SpatialIndex {
  /**
   * Create spatial index
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    this.cellSize = config.cellSize || 16; // Grid cell size
    this.cells = new Map(); // cellKey -> Set of entity IDs
    this.entities = new Map(); // entityId -> { position, cellKey, data }
  }

  /**
   * Get cell key for a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate (optional)
   * @returns {string} Cell key
   */
  getCellKey(x, y, z = 0) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellY},${cellZ}`;
  }

  /**
   * Add entity to index
   * @param {string} entityId - Entity identifier
   * @param {object} position - Position {x, y, z}
   * @param {object} data - Additional entity data
   */
  add(entityId, position, data = null) {
    const cellKey = this.getCellKey(position.x, position.y, position.z || 0);

    // Remove from old cell if exists
    if (this.entities.has(entityId)) {
      this.remove(entityId);
    }

    // Add to cell
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }
    this.cells.get(cellKey).add(entityId);

    // Store entity info
    this.entities.set(entityId, {
      position: { ...position },
      cellKey,
      data
    });
  }

  /**
   * Remove entity from index
   * @param {string} entityId - Entity identifier
   */
  remove(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Remove from cell
    const cell = this.cells.get(entity.cellKey);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.cells.delete(entity.cellKey);
      }
    }

    // Remove entity info
    this.entities.delete(entityId);
  }

  /**
   * Update entity position
   * @param {string} entityId - Entity identifier
   * @param {object} newPosition - New position {x, y, z}
   */
  update(entityId, newPosition) {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const newCellKey = this.getCellKey(newPosition.x, newPosition.y, newPosition.z || 0);

    // Check if cell changed
    if (newCellKey !== entity.cellKey) {
      // Remove from old cell
      const oldCell = this.cells.get(entity.cellKey);
      if (oldCell) {
        oldCell.delete(entityId);
        if (oldCell.size === 0) {
          this.cells.delete(entity.cellKey);
        }
      }

      // Add to new cell
      if (!this.cells.has(newCellKey)) {
        this.cells.set(newCellKey, new Set());
      }
      this.cells.get(newCellKey).add(entityId);

      entity.cellKey = newCellKey;
    }

    entity.position = { ...newPosition };
  }

  /**
   * Query entities near a position
   * @param {object} position - Center position {x, y, z}
   * @param {number} radius - Search radius
   * @returns {Array} Array of { entityId, position, data, distance }
   */
  queryNear(position, radius) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    const centerCellX = Math.floor(position.x / this.cellSize);
    const centerCellY = Math.floor(position.y / this.cellSize);
    const centerCellZ = Math.floor((position.z || 0) / this.cellSize);

    // Check all nearby cells
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const cellKey = `${centerCellX + dx},${centerCellY + dy},${centerCellZ + dz}`;
          const cell = this.cells.get(cellKey);

          if (cell) {
            for (const entityId of cell) {
              const entity = this.entities.get(entityId);
              if (entity) {
                const distance = this._distance(position, entity.position);
                if (distance <= radius) {
                  results.push({
                    entityId,
                    position: entity.position,
                    data: entity.data,
                    distance
                  });
                }
              }
            }
          }
        }
      }
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Query entities in a rectangular region
   * @param {object} min - Minimum corner {x, y, z}
   * @param {object} max - Maximum corner {x, y, z}
   * @returns {Array} Array of { entityId, position, data }
   */
  queryRegion(min, max) {
    const results = [];

    const minCellX = Math.floor(min.x / this.cellSize);
    const maxCellX = Math.floor(max.x / this.cellSize);
    const minCellY = Math.floor(min.y / this.cellSize);
    const maxCellY = Math.floor(max.y / this.cellSize);
    const minCellZ = Math.floor((min.z || 0) / this.cellSize);
    const maxCellZ = Math.floor((max.z || 0) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cz = minCellZ; cz <= maxCellZ; cz++) {
          const cellKey = `${cx},${cy},${cz}`;
          const cell = this.cells.get(cellKey);

          if (cell) {
            for (const entityId of cell) {
              const entity = this.entities.get(entityId);
              if (entity) {
                const pos = entity.position;
                if (pos.x >= min.x && pos.x <= max.x &&
                    pos.y >= min.y && pos.y <= max.y &&
                    (pos.z || 0) >= (min.z || 0) && (pos.z || 0) <= (max.z || 0)) {
                  results.push({
                    entityId,
                    position: entity.position,
                    data: entity.data
                  });
                }
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Get entity by ID
   * @param {string} entityId - Entity identifier
   * @returns {object|null}
   */
  get(entityId) {
    return this.entities.get(entityId) || null;
  }

  /**
   * Check if entity exists
   * @param {string} entityId - Entity identifier
   * @returns {boolean}
   */
  has(entityId) {
    return this.entities.has(entityId);
  }

  /**
   * Get all entity IDs
   * @returns {Array}
   */
  getAllIds() {
    return Array.from(this.entities.keys());
  }

  /**
   * Get entity count
   * @returns {number}
   */
  get size() {
    return this.entities.size;
  }

  /**
   * Clear all entities
   */
  clear() {
    this.cells.clear();
    this.entities.clear();
  }

  /**
   * Calculate distance between positions
   * @private
   */
  _distance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = (pos1.z || 0) - (pos2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      entityCount: this.entities.size,
      cellCount: this.cells.size,
      cellSize: this.cellSize,
      avgEntitiesPerCell: this.cells.size > 0
        ? this.entities.size / this.cells.size
        : 0
    };
  }
}

export default SpatialIndex;
