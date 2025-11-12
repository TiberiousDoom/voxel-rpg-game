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
   * @param {number} gridSize - Size of the grid (default 10)
   * @param {number} gridHeight - Height of the grid (default 50)
   */
  constructor(gridSize = 10, gridHeight = 50) {
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

    // Initialize health properties if not set
    if (!building.health || !building.maxHealth) {
      building.health = building.maxHealth || 100;
      building.maxHealth = building.maxHealth || 100;
    }

    // Initialize state if not set
    if (!building.state) {
      building.state = 'BLUEPRINT';
    }

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

    console.log(`[BuildingHealth] Building ${buildingId} placed with health ${building.health}/${building.maxHealth}`);

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

  /**
   * Damage a building by a specified amount
   * @param {string} buildingId - Building ID
   * @param {number} damage - Amount of damage to apply
   * @returns {object} {success: boolean, newHealth?: number, destroyed?: boolean, error?: string}
   */
  damageBuilding(buildingId, damage) {
    const building = this.buildings.get(buildingId);

    if (!building) {
      console.error(`[BuildingHealth] Building ${buildingId} not found`);
      return { success: false, error: 'BUILDING_NOT_FOUND' };
    }

    // Validate damage amount
    if (typeof damage !== 'number' || damage < 0) {
      console.error(`[BuildingHealth] Invalid damage amount: ${damage}`);
      return { success: false, error: 'INVALID_DAMAGE_AMOUNT' };
    }

    // Apply damage
    const oldHealth = building.health;
    building.health = Math.max(0, building.health - damage);

    // Update building state based on health
    let destroyed = false;
    if (building.health === 0) {
      building.state = 'DESTROYED';
      destroyed = true;
      console.warn(`[BuildingHealth] Building ${buildingId} destroyed! (${oldHealth} → 0)`);
    } else if (building.health < building.maxHealth * 0.5 && building.state === 'COMPLETE') {
      building.state = 'DAMAGED';
      console.log(`[BuildingHealth] Building ${buildingId} damaged! (${oldHealth} → ${building.health})`);
    }

    return {
      success: true,
      newHealth: building.health,
      destroyed,
      state: building.state
    };
  }

  /**
   * Repair a building using resources
   * @param {string} buildingId - Building ID
   * @param {number} repairAmount - Amount of health to restore
   * @param {object} resources - Available resources {wood, stone, gold, etc.}
   * @param {object} repairCost - Cost per health point {wood: 0.5, stone: 0.2, etc.}
   * @returns {object} {success: boolean, newHealth?: number, resourcesUsed?: object, error?: string}
   */
  repairBuilding(buildingId, repairAmount, resources, repairCost) {
    const building = this.buildings.get(buildingId);

    if (!building) {
      console.error(`[BuildingHealth] Building ${buildingId} not found`);
      return { success: false, error: 'BUILDING_NOT_FOUND' };
    }

    // Cannot repair destroyed buildings
    if (building.state === 'DESTROYED') {
      console.warn(`[BuildingHealth] Cannot repair destroyed building ${buildingId}`);
      return { success: false, error: 'BUILDING_DESTROYED' };
    }

    // Calculate how much health can be repaired
    const maxRepair = building.maxHealth - building.health;
    const actualRepair = Math.min(repairAmount, maxRepair);

    if (actualRepair <= 0) {
      console.log(`[BuildingHealth] Building ${buildingId} already at full health`);
      return { success: false, error: 'ALREADY_FULL_HEALTH' };
    }

    // Calculate total resource cost
    const resourcesNeeded = {};
    const resourcesUsed = {};

    for (const [resource, costPerPoint] of Object.entries(repairCost)) {
      resourcesNeeded[resource] = Math.ceil(actualRepair * costPerPoint);
    }

    // Validate resources are available
    for (const [resource, needed] of Object.entries(resourcesNeeded)) {
      const available = resources[resource] || 0;
      if (available < needed) {
        console.warn(`[BuildingHealth] Insufficient ${resource} for repair (need ${needed}, have ${available})`);
        return {
          success: false,
          error: 'INSUFFICIENT_RESOURCES',
          resourcesNeeded,
          resourcesAvailable: resources
        };
      }
    }

    // Apply repair
    const oldHealth = building.health;
    building.health = Math.min(building.maxHealth, building.health + actualRepair);

    // Update building state
    if (building.health === building.maxHealth) {
      building.state = 'COMPLETE';
    }

    // Track resources used
    for (const [resource, needed] of Object.entries(resourcesNeeded)) {
      resourcesUsed[resource] = needed;
    }

    console.log(`[BuildingHealth] Building ${buildingId} repaired! (${oldHealth} → ${building.health})`);
    console.log(`[BuildingHealth] Resources used:`, resourcesUsed);

    return {
      success: true,
      newHealth: building.health,
      healthRestored: actualRepair,
      resourcesUsed,
      state: building.state
    };
  }
}

export default GridManager;
