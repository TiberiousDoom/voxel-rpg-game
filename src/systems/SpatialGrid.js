/**
 * SpatialGrid.js - Spatial partitioning system for efficient entity updates
 *
 * Purpose:
 * - Divide world into grid cells to quickly find nearby entities
 * - Only update monsters within player's vicinity
 * - Reduce unnecessary distance calculations
 *
 * Performance Benefits:
 * - O(1) insertion and removal
 * - O(k) nearby queries where k = entities in nearby cells
 * - Avoids O(n) full scan for every update
 */

/**
 * SpatialGrid - Grid-based spatial partitioning system
 */
export class SpatialGrid {
  /**
   * Create a spatial grid
   * @param {number} cellSize - Size of each grid cell (in world units)
   * @param {number} worldSize - Total size of the world (assumes square)
   */
  constructor(cellSize = 20, worldSize = 1000) {
    this.cellSize = cellSize;
    this.worldSize = worldSize;
    this.gridDimension = Math.ceil(worldSize / cellSize);

    // Map of "x,z" -> Set of entity IDs
    this.cells = new Map();

    // Map of entity ID -> "x,z" (for fast removal)
    this.entityCells = new Map();

    console.log(`📐 SpatialGrid: Created ${this.gridDimension}x${this.gridDimension} grid (cell size: ${cellSize})`);
  }

  /**
   * Get grid cell key from world position
   * @param {number} x - World X position
   * @param {number} z - World Z position
   * @returns {string} - Cell key "cellX,cellZ"
   */
  getCellKey(x, z) {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Add entity to grid
   * @param {string} id - Entity ID
   * @param {number} x - World X position
   * @param {number} z - World Z position
   */
  insert(id, x, z) {
    const cellKey = this.getCellKey(x, z);

    // Create cell if it doesn't exist
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }

    // Add entity to cell
    this.cells.get(cellKey).add(id);

    // Track which cell this entity is in
    this.entityCells.set(id, cellKey);
  }

  /**
   * Remove entity from grid
   * @param {string} id - Entity ID
   */
  remove(id) {
    const cellKey = this.entityCells.get(id);
    if (!cellKey) return;

    // Remove from cell
    const cell = this.cells.get(cellKey);
    if (cell) {
      cell.delete(id);

      // Clean up empty cells
      if (cell.size === 0) {
        this.cells.delete(cellKey);
      }
    }

    // Remove tracking
    this.entityCells.delete(id);
  }

  /**
   * Update entity position (remove from old cell, add to new cell)
   * @param {string} id - Entity ID
   * @param {number} x - New world X position
   * @param {number} z - New world Z position
   */
  update(id, x, z) {
    const oldCellKey = this.entityCells.get(id);
    const newCellKey = this.getCellKey(x, z);

    // Only update if cell changed
    if (oldCellKey !== newCellKey) {
      this.remove(id);
      this.insert(id, x, z);
    }
  }

  /**
   * Get all entities within radius of a position
   * @param {number} x - World X position
   * @param {number} z - World Z position
   * @param {number} radius - Search radius
   * @returns {Set<string>} - Set of entity IDs
   */
  getNearby(x, z, radius) {
    const nearby = new Set();

    // Calculate how many cells to check in each direction
    const cellRadius = Math.ceil(radius / this.cellSize);

    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellZ = Math.floor(z / this.cellSize);

    // Check all cells within radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const cellX = centerCellX + dx;
        const cellZ = centerCellZ + dz;
        const cellKey = `${cellX},${cellZ}`;

        const cell = this.cells.get(cellKey);
        if (cell) {
          // Add all entities in this cell
          cell.forEach(id => nearby.add(id));
        }
      }
    }

    return nearby;
  }

  /**
   * Get entities in the same cell as position
   * @param {number} x - World X position
   * @param {number} z - World Z position
   * @returns {Set<string>} - Set of entity IDs
   */
  getCell(x, z) {
    const cellKey = this.getCellKey(x, z);
    return this.cells.get(cellKey) || new Set();
  }

  /**
   * Clear all entities from grid
   */
  clear() {
    this.cells.clear();
    this.entityCells.clear();
  }

  /**
   * Rebuild grid from array of entities
   * @param {Array} entities - Array of entities with id, position.x, position.z
   */
  rebuild(entities) {
    this.clear();
    entities.forEach(entity => {
      if (entity && entity.id && entity.position) {
        this.insert(entity.id, entity.position.x, entity.position.z);
      }
    });
  }

  /**
   * Get grid statistics
   * @returns {Object} - Statistics about the grid
   */
  getStats() {
    const totalEntities = this.entityCells.size;
    const occupiedCells = this.cells.size;
    const totalCells = this.gridDimension * this.gridDimension;
    const avgEntitiesPerCell = occupiedCells > 0 ? (totalEntities / occupiedCells).toFixed(2) : 0;

    return {
      totalEntities,
      occupiedCells,
      totalCells,
      avgEntitiesPerCell,
      utilization: ((occupiedCells / totalCells) * 100).toFixed(2) + '%'
    };
  }
}

export default SpatialGrid;
