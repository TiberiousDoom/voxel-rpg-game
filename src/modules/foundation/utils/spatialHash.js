/**
 * SpatialHash - Efficient spatial query structure
 *
 * This utility provides O(1) insertion and O(n) query performance
 * for spatial lookups. It's used by the Foundation store to quickly
 * answer "what buildings are near position X?" without checking all buildings.
 *
 * The grid is divided into cells, and each building is hashed into one or more cells.
 * Queries check only nearby cells instead of the entire world.
 */

export class SpatialHash {
  /**
   * Create a new spatial hash.
   *
   * @param {number} cellSize - Size of each grid cell in world units
   */
  constructor(cellSize = 5) {
    this.cellSize = cellSize;
    // Map of "cellKey" -> Set of building IDs in that cell
    this.cells = new Map();
    // Map of building ID -> current cell key (for fast removal)
    this.buildingToCells = new Map();
  }

  /**
   * Convert world position to cell key.
   *
   * @param {Object} position - { x, y, z } world position
   * @returns {string} Cell key for hashing
   */
  _getKey(position) {
    const cx = Math.floor(position.x / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cz}`;
  }

  /**
   * Insert a building at a position.
   *
   * @param {string} buildingId - The building ID
   * @param {Object} position - { x, y, z } world position
   */
  insert(buildingId, position) {
    const key = this._getKey(position);

    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }

    this.cells.get(key).add(buildingId);
    this.buildingToCells.set(buildingId, key);
  }

  /**
   * Remove a building from the hash.
   *
   * @param {string} buildingId - The building ID
   * @param {Object} position - Current position (for key lookup)
   */
  remove(buildingId, position) {
    const key = this._getKey(position);

    if (this.cells.has(key)) {
      this.cells.get(key).delete(buildingId);

      // Clean up empty cells
      if (this.cells.get(key).size === 0) {
        this.cells.delete(key);
      }
    }

    this.buildingToCells.delete(buildingId);
  }

  /**
   * Query all buildings within a radius.
   *
   * Returns all buildings in cells that overlap with the search radius.
   * May include buildings outside the exact radius due to cell coverage.
   *
   * @param {Object} position - { x, y, z } center position
   * @param {number} radius - Search radius
   * @returns {Array<string>} Array of building IDs
   */
  queryRadius(position, radius) {
    const result = new Set();
    const cx = Math.floor(position.x / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    const cellsToCheck = Math.ceil(radius / this.cellSize) + 1;

    // Check all cells within the radius
    for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
      for (let dz = -cellsToCheck; dz <= cellsToCheck; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (this.cells.has(key)) {
          this.cells.get(key).forEach((id) => result.add(id));
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Query a rectangular region.
   *
   * @param {Object} min - { x, z } minimum corner
   * @param {Object} max - { x, z } maximum corner
   * @returns {Array<string>} Array of building IDs
   */
  queryRect(min, max) {
    const result = new Set();
    const minCx = Math.floor(min.x / this.cellSize);
    const minCz = Math.floor(min.z / this.cellSize);
    const maxCx = Math.floor(max.x / this.cellSize);
    const maxCz = Math.floor(max.z / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = `${cx},${cz}`;
        if (this.cells.has(key)) {
          this.cells.get(key).forEach((id) => result.add(id));
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Clear all data.
   */
  clear() {
    this.cells.clear();
    this.buildingToCells.clear();
  }

  /**
   * Get number of cells in use.
   *
   * @returns {number} Number of non-empty cells
   */
  getCellCount() {
    return this.cells.size;
  }

  /**
   * Get number of buildings tracked.
   *
   * @returns {number} Number of unique buildings
   */
  getBuildingCount() {
    return this.buildingToCells.size;
  }
}
