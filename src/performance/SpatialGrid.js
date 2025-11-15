/**
 * SpatialGrid.js - Spatial partitioning for efficient NPC queries
 *
 * Uses a spatial hash grid to optimize NPC lookups, collision detection,
 * and nearby entity queries. Divides the game world into cells for O(1)
 * location-based queries instead of O(n) linear searches.
 *
 * Performance Benefits:
 * - O(1) insertion and removal
 * - O(1) nearby entity queries (within cell or neighbors)
 * - Reduces collision checks from O(n²) to O(k) where k = entities per cell
 * - Supports dynamic grid resizing
 *
 * Usage:
 * ```javascript
 * const grid = new SpatialGrid(32); // 32x32 cell size
 * grid.insert(npc);
 * grid.update(npc, oldX, oldZ, newX, newZ);
 * const nearby = grid.getNearbyEntities(x, z, radius);
 * grid.remove(npc);
 * ```
 */

class SpatialGrid {
  /**
   * Initialize spatial grid
   * @param {number} cellSize - Size of each grid cell (default: 32)
   * @param {Object} options - Configuration options
   */
  constructor(cellSize = 32, options = {}) {
    this.cellSize = cellSize;
    this.cells = new Map(); // Map of "x,z" -> Set of entities
    this.entityToCell = new Map(); // Map of entity.id -> "x,z" key

    // Statistics
    this.stats = {
      totalEntities: 0,
      totalCells: 0,
      maxEntitiesPerCell: 0,
      insertions: 0,
      removals: 0,
      updates: 0,
      queries: 0
    };

    // Configuration
    this.config = {
      maxEntitiesPerCell: options.maxEntitiesPerCell || 100,
      enableStats: options.enableStats !== false,
      ...options
    };
  }

  /**
   * Get cell key for a position
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {string} Cell key
   */
  _getCellKey(x, z) {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Get or create a cell
   * @param {string} key - Cell key
   * @returns {Set} Cell entity set
   * @private
   */
  _getCell(key) {
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
      this.stats.totalCells++;
    }
    return this.cells.get(key);
  }

  /**
   * Insert an entity into the grid
   * @param {Object} entity - Entity to insert (must have id, x, z properties)
   * @returns {boolean} True if inserted successfully
   */
  insert(entity) {
    if (!entity || !entity.id) {
      console.warn('[SpatialGrid] Cannot insert entity without id');
      return false;
    }

    if (entity.x === undefined || entity.z === undefined) {
      console.warn('[SpatialGrid] Cannot insert entity without x, z coordinates');
      return false;
    }

    // Check if already inserted
    if (this.entityToCell.has(entity.id)) {
      console.warn(`[SpatialGrid] Entity ${entity.id} already in grid`);
      return false;
    }

    const key = this._getCellKey(entity.x, entity.z);
    const cell = this._getCell(key);

    // Check cell capacity
    if (cell.size >= this.config.maxEntitiesPerCell) {
      console.warn(`[SpatialGrid] Cell ${key} at capacity (${cell.size})`);
    }

    cell.add(entity);
    this.entityToCell.set(entity.id, key);

    this.stats.totalEntities++;
    this.stats.insertions++;
    this.stats.maxEntitiesPerCell = Math.max(this.stats.maxEntitiesPerCell, cell.size);

    return true;
  }

  /**
   * Remove an entity from the grid
   * @param {Object} entity - Entity to remove (must have id)
   * @returns {boolean} True if removed successfully
   */
  remove(entity) {
    if (!entity || !entity.id) {
      return false;
    }

    const key = this.entityToCell.get(entity.id);
    if (!key) {
      return false; // Not in grid
    }

    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(entity);

      // Clean up empty cells
      if (cell.size === 0) {
        this.cells.delete(key);
        this.stats.totalCells--;
      }
    }

    this.entityToCell.delete(entity.id);
    this.stats.totalEntities--;
    this.stats.removals++;

    return true;
  }

  /**
   * Update entity position in the grid
   * @param {Object} entity - Entity to update
   * @param {number} oldX - Old X position
   * @param {number} oldZ - Old Z position
   * @param {number} newX - New X position
   * @param {number} newZ - New Z position
   * @returns {boolean} True if updated successfully
   */
  update(entity, oldX, oldZ, newX, newZ) {
    const oldKey = this._getCellKey(oldX, oldZ);
    const newKey = this._getCellKey(newX, newZ);

    // No cell change needed
    if (oldKey === newKey) {
      return true;
    }

    const currentKey = this.entityToCell.get(entity.id);
    if (currentKey !== oldKey) {
      console.warn(`[SpatialGrid] Entity ${entity.id} cell mismatch`);
      // Force remove and re-insert
      this.remove(entity);
      entity.x = newX;
      entity.z = newZ;
      return this.insert(entity);
    }

    // Move to new cell
    const oldCell = this.cells.get(oldKey);
    if (oldCell) {
      oldCell.delete(entity);
      if (oldCell.size === 0) {
        this.cells.delete(oldKey);
        this.stats.totalCells--;
      }
    }

    const newCell = this._getCell(newKey);
    newCell.add(entity);
    this.entityToCell.set(entity.id, newKey);

    this.stats.updates++;
    this.stats.maxEntitiesPerCell = Math.max(this.stats.maxEntitiesPerCell, newCell.size);

    return true;
  }

  /**
   * Get all entities in a specific cell
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {Array} Array of entities in the cell
   */
  getEntitiesInCell(x, z) {
    const key = this._getCellKey(x, z);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }

  /**
   * Get entities near a position (including neighboring cells)
   * @param {number} x - Center X coordinate
   * @param {number} z - Center Z coordinate
   * @param {number} radius - Search radius (default: cellSize)
   * @returns {Array} Array of nearby entities
   */
  getNearbyEntities(x, z, radius = this.cellSize) {
    this.stats.queries++;

    const entities = new Set();
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellZ = Math.floor(z / this.cellSize);

    // Check all cells within radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCellX + dx},${centerCellZ + dz}`;
        const cell = this.cells.get(key);

        if (cell) {
          for (const entity of cell) {
            // Additional distance check for entities
            const distSq = (entity.x - x) ** 2 + (entity.z - z) ** 2;
            if (distSq <= radius * radius) {
              entities.add(entity);
            }
          }
        }
      }
    }

    return Array.from(entities);
  }

  /**
   * Get all entities in a rectangular region
   * @param {number} minX - Minimum X
   * @param {number} minZ - Minimum Z
   * @param {number} maxX - Maximum X
   * @param {number} maxZ - Maximum Z
   * @returns {Array} Array of entities in region
   */
  getEntitiesInRegion(minX, minZ, maxX, maxZ) {
    this.stats.queries++;

    const entities = new Set();
    const minCellX = Math.floor(minX / this.cellSize);
    const minCellZ = Math.floor(minZ / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const maxCellZ = Math.floor(maxZ / this.cellSize);

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
        const key = `${cellX},${cellZ}`;
        const cell = this.cells.get(key);

        if (cell) {
          for (const entity of cell) {
            // Verify entity is actually in bounds
            if (entity.x >= minX && entity.x <= maxX &&
                entity.z >= minZ && entity.z <= maxZ) {
              entities.add(entity);
            }
          }
        }
      }
    }

    return Array.from(entities);
  }

  /**
   * Check if a position is occupied by any entity
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {number} threshold - Distance threshold (default: 0.5)
   * @returns {Object|null} Entity at position or null
   */
  getEntityAtPosition(x, z, threshold = 0.5) {
    const key = this._getCellKey(x, z);
    const cell = this.cells.get(key);

    if (!cell) return null;

    for (const entity of cell) {
      const distSq = (entity.x - x) ** 2 + (entity.z - z) ** 2;
      if (distSq <= threshold * threshold) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Get all entities in the grid
   * @returns {Array} All entities
   */
  getAllEntities() {
    const entities = [];
    for (const cell of this.cells.values()) {
      entities.push(...cell);
    }
    return entities;
  }

  /**
   * Clear all entities from the grid
   */
  clear() {
    this.cells.clear();
    this.entityToCell.clear();

    this.stats.totalEntities = 0;
    this.stats.totalCells = 0;
    this.stats.maxEntitiesPerCell = 0;
  }

  /**
   * Get grid statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const avgEntitiesPerCell = this.stats.totalCells > 0
      ? (this.stats.totalEntities / this.stats.totalCells).toFixed(2)
      : 0;

    return {
      ...this.stats,
      avgEntitiesPerCell,
      cellSize: this.cellSize,
      memoryCells: this.cells.size,
      memoryMappings: this.entityToCell.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats.insertions = 0;
    this.stats.removals = 0;
    this.stats.updates = 0;
    this.stats.queries = 0;
  }

  /**
   * Debug: Visualize grid state
   * @returns {Object} Grid visualization data
   */
  debugVisualize() {
    const cellData = [];

    for (const [key, cell] of this.cells.entries()) {
      const [cellX, cellZ] = key.split(',').map(Number);
      cellData.push({
        x: cellX * this.cellSize,
        z: cellZ * this.cellSize,
        count: cell.size,
        entities: Array.from(cell).map(e => ({ id: e.id, x: e.x, z: e.z }))
      });
    }

    return {
      cellSize: this.cellSize,
      totalCells: this.cells.size,
      totalEntities: this.stats.totalEntities,
      cells: cellData
    };
  }
}

export default SpatialGrid;
