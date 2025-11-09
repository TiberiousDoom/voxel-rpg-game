/**
 * BuildingFactory
 *
 * Factory pattern for creating buildings from templates.
 * Handles:
 * - Building instantiation from config
 * - Default values and inheritance
 * - Validation of building properties
 * - Building cloning
 */

class BuildingFactory {
  /**
   * Initialize factory with building configs
   * @param {object} buildingConfigs - Map of building type configs
   */
  constructor(buildingConfigs = {}) {
    this.configs = buildingConfigs;
  }

  /**
   * Register a building type config
   * @param {string} type
   * @param {object} config
   */
  registerConfig(type, config) {
    this.configs[type] = config;
  }

  /**
   * Get a config by type
   * @param {string} type
   * @returns {object|null}
   */
  getConfig(type) {
    return this.configs[type] || null;
  }

  /**
   * Check if a building type is registered
   * @param {string} type
   * @returns {boolean}
   */
  hasConfig(type) {
    return type in this.configs;
  }

  /**
   * Create a building from template
   * @param {string} type - Building type
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} z - Position Z
   * @param {object} overrides - Override config values
   * @returns {object|null} Building object or null if invalid
   */
  createBuilding(type, x, y, z, overrides = {}) {
    const config = this.getConfig(type);
    if (!config) {
      console.error(`Building type '${type}' not registered`);
      return null;
    }

    // Deep clone config to avoid mutations
    const building = JSON.parse(JSON.stringify(config));

    // Set position
    building.position = { x, y, z };

    // Apply overrides
    Object.assign(building, overrides);

    // Initialize standard properties if not present
    if (!building.status) {
      building.status = 'BLUEPRINT';
    }
    if (!building.constructionProgress) {
      building.constructionProgress = 0;
    }
    if (!building.health) {
      building.health = config.maxHealth || 100;
    }
    if (!building.createdAt) {
      building.createdAt = Date.now();
    }

    return building;
  }

  /**
   * Create multiple buildings from template
   * @param {string} type - Building type
   * @param {Array<{x, y, z}>} positions - Array of positions
   * @param {object} overrides - Override config values
   * @returns {Array<object>} Array of building objects
   */
  createBuildings(type, positions, overrides = {}) {
    return positions
      .map(pos => this.createBuilding(type, pos.x, pos.y, pos.z, overrides))
      .filter(b => b !== null);
  }

  /**
   * Clone an existing building
   * @param {object} building - Building to clone
   * @param {number} x - New position X
   * @param {number} y - New position Y
   * @param {number} z - New position Z
   * @returns {object}
   */
  cloneBuilding(building, x, y, z) {
    const cloned = JSON.parse(JSON.stringify(building));
    cloned.position = { x, y, z };
    cloned.id = undefined; // Let grid manager assign ID
    return cloned;
  }

  /**
   * Validate a building object
   * @param {object} building
   * @returns {object} {valid: boolean, errors?: Array}
   */
  validateBuilding(building) {
    const errors = [];

    // Check required fields
    if (!building.type) {
      errors.push('Building missing type');
    }

    if (!building.position || building.position.x === undefined) {
      errors.push('Building missing position');
    }

    if (!building.dimensions) {
      errors.push('Building missing dimensions');
    }

    if (!building.status) {
      errors.push('Building missing status');
    }

    // Validate position values
    if (building.position) {
      const { x, y, z } = building.position;
      if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
        errors.push('Position coordinates must be integers');
      }
    }

    // Validate dimensions
    if (building.dimensions) {
      const { width, height, depth } = building.dimensions;
      if (width < 1 || height < 1 || depth < 1) {
        errors.push('Dimensions must be at least 1');
      }
    }

    // Validate status
    const validStatuses = ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'];
    if (!validStatuses.includes(building.status)) {
      errors.push(`Invalid status: ${building.status}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get all registered building types
   * @returns {Array<string>}
   */
  getRegisteredTypes() {
    return Object.keys(this.configs);
  }

  /**
   * Get all building configs
   * @returns {object}
   */
  getAllConfigs() {
    return JSON.parse(JSON.stringify(this.configs));
  }

  /**
   * Create a default configuration template
   * @param {string} type - Building type
   * @returns {object}
   */
  createDefaultConfig(type) {
    return {
      type,
      tier: 'SURVIVAL',
      cost: { gold: 100 },
      dimensions: { width: 1, height: 1, depth: 1 },
      maxHealth: 100,
      baseProductionRate: 0,
      productionType: null,
      workSlots: 0,
      description: `${type} building`,
      tier: 'SURVIVAL',
    };
  }
}

