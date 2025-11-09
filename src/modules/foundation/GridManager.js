/**
 * GridManager
 *
 * Core grid management system for building placement.
 * Handles:
 * - Building placement validation
 * - Collision detection
 * - Grid boundary checking
 * - Building tracking and retrieval
 * - Grid state management
 */

class GridManager {
  /**
   * Initialize the grid manager
   * @param {number} gridSize - Size of the grid (default 100)
   * @param {number} gridHeight - Height of the grid (default 50)
   */
  constructor(gridSize = 100, gridHeight = 50) {
    this.gridSize = gridSize;
    this.gridHeight = gridHeight;

    // Building storage: Map<buildingId, building>
    this.buildings = new Map();

    // Occupancy tracking: Set<"x,y,z">
    this.occupiedCells = new Set();

    // ID counter for auto-generating building IDs
    this.buildingIdCounter = 0;

    // Building index by position for quick lookups
    this.positionIndex = new Map(); // "x,y,z" -> buildingId

    // Statistics
    this.stats = {
      totalBuildings: 0,
      totalOccupiedCells: 0,
    };
  }

  /**
   * Generate a unique building ID
   * @returns {string}
   */
  generateBuildingId() {
    return `building_${this.buildingIdCounter++}`;
  }

  /**
   * Convert position to position key for indexing
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {string}
   */
  positionKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  /**
   * Validate position is within grid bounds
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {object} {valid: boolean, error?: string}
   */
  validateBounds(x, y, z) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return { valid: false, error: 'Position must be integers' };
    }

    if (x < 0 || x >= this.gridSize) {
      return { valid: false, error: `X position ${x} out of bounds [0, ${this.gridSize - 1}]` };
    }

    if (y < 0 || y >= this.gridHeight) {
      return { valid: false, error: `Y position ${y} out of bounds [0, ${this.gridHeight - 1}]` };
    }

    if (z < 0 || z >= this.gridSize) {
      return { valid: false, error: `Z position ${z} out of bounds [0, ${this.gridSize - 1}]` };
    }

    return { valid: true };
  }

  /**
   * Check if a single cell is occupied
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  isCellOccupied(x, y, z) {
    const key = this.positionKey(x, y, z);
    return this.occupiedCells.has(key);
  }

  /**
   * Check if a rectangular region is free
   * @param {number} startX
   * @param {number} startY
   * @param {number} startZ
   * @param {number} width
   * @param {number} height - vertical height
   * @param {number} depth
   * @returns {object} {free: boolean, occupiedCells?: Array}
   */
  isRegionFree(startX, startY, startZ, width, height, depth) {
    const occupiedCells = [];

    for (let x = startX; x < startX + width; x++) {
      for (let y = startY; y < startY + height; y++) {
        for (let z = startZ; z < startZ + depth; z++) {
          // Check bounds
          const boundsCheck = this.validateBounds(x, y, z);
          if (!boundsCheck.valid) {
            occupiedCells.push({ x, y, z, reason: boundsCheck.error });
            continue;
          }

          // Check occupancy
          if (this.isCellOccupied(x, y, z)) {
            occupiedCells.push({ x, y, z, reason: 'Cell occupied' });
          }
        }
      }
    }

    return {
      free: occupiedCells.length === 0,
      occupiedCells: occupiedCells.length > 0 ? occupiedCells : undefined,
    };
  }

  /**
   * Place a building at a position
   * @param {object} building - Building object with id, type, dimensions, position
   * @returns {object} {success: boolean, error?: string, buildingId?: string}
   */
  placeBuilding(building) {
    // Validate building has required fields
    if (!building.position || building.position.x === undefined) {
      return { success: false, error: 'Building missing position' };
    }

    const { x, y, z } = building.position;
    const { width = 1, height = 1, depth = 1 } = building.dimensions || {};

    // Validate bounds
    const boundsCheck = this.validateBounds(x, y, z);
    if (!boundsCheck.valid) {
      return { success: false, error: boundsCheck.error };
    }

    // Validate region is free
    const regionCheck = this.isRegionFree(x, y, z, width, height, depth);
    if (!regionCheck.free) {
      return { success: false, error: 'Region not free for placement' };
    }

    // Generate ID if not provided
    const buildingId = building.id || this.generateBuildingId();

    // Mark cells as occupied
    for (let bx = x; bx < x + width; bx++) {
      for (let by = y; by < y + height; by++) {
        for (let bz = z; bz < z + depth; bz++) {
          const key = this.positionKey(bx, by, bz);
          this.occupiedCells.add(key);
          this.positionIndex.set(key, buildingId);
        }
      }
    }

    // Store building
    building.id = buildingId;
    this.buildings.set(buildingId, building);

    // Update statistics
    this.stats.totalBuildings = this.buildings.size;
    this.stats.totalOccupiedCells = this.occupiedCells.size;

    return { success: true, buildingId };
  }

  /**
   * Remove a building from the grid
   * @param {string} buildingId
   * @returns {object} {success: boolean, error?: string}
   */
  removeBuilding(buildingId) {
    const building = this.buildings.get(buildingId);

    if (!building) {
      return { success: false, error: `Building ${buildingId} not found` };
    }

    const { x, y, z } = building.position;
    const { width = 1, height = 1, depth = 1 } = building.dimensions || {};

    // Free cells
    for (let bx = x; bx < x + width; bx++) {
      for (let by = y; by < y + height; by++) {
        for (let bz = z; bz < z + depth; bz++) {
          const key = this.positionKey(bx, by, bz);
          this.occupiedCells.delete(key);
          this.positionIndex.delete(key);
        }
      }
    }

    // Remove building
    this.buildings.delete(buildingId);

    // Update statistics
    this.stats.totalBuildings = this.buildings.size;
    this.stats.totalOccupiedCells = this.occupiedCells.size;

    return { success: true };
  }

  /**
   * Get building by ID
   * @param {string} buildingId
   * @returns {object|null}
   */
  getBuilding(buildingId) {
    return this.buildings.get(buildingId) || null;
  }

  /**
   * Get all buildings
   * @returns {Array<object>}
   */
  getAllBuildings() {
    return Array.from(this.buildings.values());
  }

  /**
   * Get building at a specific position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {object|null}
   */
  getBuildingAt(x, y, z) {
    const key = this.positionKey(x, y, z);
    const buildingId = this.positionIndex.get(key);
    return buildingId ? this.buildings.get(buildingId) : null;
  }

  /**
   * Get grid statistics
   * @returns {object}
   */
  getStatistics() {
    return {
      gridSize: this.gridSize,
      gridHeight: this.gridHeight,
      totalCells: this.gridSize * this.gridSize * this.gridHeight,
      totalBuildings: this.stats.totalBuildings,
      occupiedCells: this.stats.totalOccupiedCells,
      percentageOccupied: ((this.stats.totalOccupiedCells / (this.gridSize * this.gridSize * this.gridHeight)) * 100).toFixed(2),
    };
  }

  /**
   * Clear all buildings from grid
   */
  clear() {
    this.buildings.clear();
    this.occupiedCells.clear();
    this.positionIndex.clear();
    this.stats.totalBuildings = 0;
    this.stats.totalOccupiedCells = 0;
  }

  /**
   * Validate grid integrity (for debugging)
   * @returns {object} {valid: boolean, errors?: Array}
   */
  validateIntegrity() {
    const errors = [];

    // Check consistency between data structures
    for (const [buildingId, building] of this.buildings.entries()) {
      const { x, y, z } = building.position;
      const { width = 1, height = 1, depth = 1 } = building.dimensions || {};

      // Verify all cells are marked occupied
      for (let bx = x; bx < x + width; bx++) {
        for (let by = y; by < y + height; by++) {
          for (let bz = z; bz < z + depth; bz++) {
            const key = this.positionKey(bx, by, bz);
            if (!this.occupiedCells.has(key)) {
              errors.push(`Building ${buildingId} cell ${key} not marked occupied`);
            }
            if (this.positionIndex.get(key) !== buildingId) {
              errors.push(`Building ${buildingId} cell ${key} index mismatch`);
            }
          }
        }
      }
    }

    // Verify no orphaned occupied cells
    for (const key of this.occupiedCells) {
      const buildingId = this.positionIndex.get(key);
      if (!buildingId || !this.buildings.has(buildingId)) {
        errors.push(`Orphaned occupied cell: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export default GridManager;
