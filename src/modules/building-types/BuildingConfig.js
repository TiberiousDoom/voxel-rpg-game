/**
 * BuildingConfig.js - Centralized building type definitions
 *
 * This module provides all building type configurations including:
 * - Tier progression requirements
 * - Production/consumption rates
 * - Cost and resource management
 * - Work slots and NPC assignments
 * - Building effects (aura, zones)
 * - Status transitions
 *
 * All values derived from ECONOMY_BALANCE.md and FORMULAS.md
 */

class BuildingConfig {
  /**
   * Initialize BuildingConfig with all building type definitions
   *
   * @throws {Error} If configuration validation fails
   */
  constructor() {
    this.buildingTypes = this._initializeBuildings();
    this._validateAll();
  }

  /**
   * Initialize all building type definitions
   * @private
   * @returns {Object} Building types map
   */
  _initializeBuildings() {
    return {
      // ============================================
      // SURVIVAL TIER BUILDINGS
      // ============================================

      CAMPFIRE: {
        type: 'CAMPFIRE',
        tier: 'SURVIVAL',
        displayName: 'Campfire',
        description: 'Provides warmth and morale boost to nearby NPCs',
        dimensions: { width: 1, height: 1, depth: 1 },

        // Tier progression requirements (AND-gate logic)
        tierRequirements: {
          SURVIVAL: { required: true, unlocked: true },
          PERMANENT: { buildingsRequired: 0, resourcesRequired: {} }
        },

        // Cost to place (initial construction)
        cost: {
          wood: 0,
          food: 0,
          stone: 0
        },

        // Production rates per 5-second tick
        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        // Consumption rates per 5-second tick
        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        // Storage capacity
        storage: {
          wood: 50,
          food: 0,
          stone: 0
        },

        // NPC work assignment
        workSlots: 1,
        workType: 'production',

        // Status progression
        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 30, // 5-second ticks

        // Building effects
        effects: {
          aura: null,
          zoneBonus: null,
          multipliers: {},
          moraleBonus: 5  // Provides +5 morale to all NPCs
        },

        // Health and durability
        health: 100,
        maxHealth: 100,
        decayRate: 0 // No decay in SURVIVAL
      },

      FARM: {
        type: 'FARM',
        tier: 'SURVIVAL',
        displayName: 'Farm',
        description: 'Basic food production facility',
        dimensions: { width: 2, height: 1, depth: 2 },

        tierRequirements: {
          SURVIVAL: { required: true, unlocked: true },
          PERMANENT: { buildingsRequired: 0, resourcesRequired: {} }
        },

        cost: {
          wood: 10,
          food: 0,
          stone: 0
        },

        production: {
          wood: 0,
          food: 1.0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 0,
          food: 100,
          stone: 0
        },

        workSlots: 1,
        workType: 'production',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 40,

        effects: {
          aura: null,
          zoneBonus: null,
          multipliers: {}
        },

        health: 100,
        maxHealth: 100,
        decayRate: 0
      },

      // ============================================
      // PERMANENT TIER BUILDINGS
      // ============================================

      HOUSE: {
        type: 'HOUSE',
        tier: 'SURVIVAL',
        displayName: 'House',
        description: 'Housing for NPCs',
        dimensions: { width: 1, height: 1, depth: 1 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { buildingsRequired: 1, resourcesRequired: { wood: 20 } }
        },

        cost: {
          wood: 20,
          food: 5,
          stone: 0
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 0,
          food: 0,
          stone: 0
        },

        workSlots: 0,
        workType: 'housing',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 50,

        // Housing effect: Supports up to 2 NPCs
        effects: {
          aura: null,
          zoneBonus: null,
          multipliers: {},
          housingCapacity: 2
        },

        health: 120,
        maxHealth: 120,
        decayRate: 0.1
      },

      WAREHOUSE: {
        type: 'WAREHOUSE',
        tier: 'PERMANENT',
        displayName: 'Warehouse',
        description: 'Extended storage facility',
        dimensions: { width: 2, height: 1, depth: 2 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { buildingsRequired: 1, resourcesRequired: { wood: 30 } }
        },

        cost: {
          wood: 30,
          food: 10,
          stone: 5
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 200,
          food: 200,
          stone: 100
        },

        workSlots: 1,
        workType: 'management',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 60,

        effects: {
          aura: null,
          zoneBonus: null,
          multipliers: {}
        },

        health: 150,
        maxHealth: 150,
        decayRate: 0.05
      },

      // ============================================
      // TOWN TIER BUILDINGS
      // ============================================

      TOWN_CENTER: {
        type: 'TOWN_CENTER',
        tier: 'TOWN',
        displayName: 'Town Center',
        description: 'Central hub with production aura',
        dimensions: { width: 3, height: 2, depth: 3 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { required: false, unlocked: true },
          TOWN: { buildingsRequired: 2, resourcesRequired: { wood: 100, food: 50, stone: 100 } }
        },

        cost: {
          wood: 100,
          food: 50,
          stone: 100
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 300,
          food: 300,
          stone: 200
        },

        workSlots: 2,
        workType: 'management',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 120,

        // Aura effect: +5% production within 50-cell radius
        effects: {
          aura: {
            type: 'production',
            radius: 50,
            multiplier: 1.05
          },
          zoneBonus: null,
          multipliers: {}
        },

        health: 200,
        maxHealth: 200,
        decayRate: 0.1
      },

      MARKET: {
        type: 'MARKET',
        tier: 'TOWN',
        displayName: 'Market',
        description: 'Trading and commerce hub',
        dimensions: { width: 2, height: 1, depth: 2 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { required: false, unlocked: true },
          TOWN: { buildingsRequired: 1, resourcesRequired: { wood: 50, food: 0, stone: 50 } }
        },

        cost: {
          wood: 50,
          food: 20,
          stone: 50
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 150,
          food: 150,
          stone: 150
        },

        workSlots: 1,
        workType: 'trade',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 80,

        // Zone bonus: +10% trading efficiency in nearby zone
        effects: {
          aura: null,
          zoneBonus: {
            type: 'trade',
            radius: 30,
            multiplier: 1.10
          },
          multipliers: {}
        },

        health: 140,
        maxHealth: 140,
        decayRate: 0.08
      },

      WATCHTOWER: {
        type: 'WATCHTOWER',
        tier: 'TOWN',
        displayName: 'Watchtower',
        description: 'Defense structure',
        dimensions: { width: 1, height: 2, depth: 1 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { required: false, unlocked: true },
          TOWN: { buildingsRequired: 1, resourcesRequired: { wood: 30, food: 0, stone: 80 } }
        },

        cost: {
          wood: 30,
          food: 10,
          stone: 80
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 0,
          food: 0,
          stone: 0
        },

        workSlots: 2,
        workType: 'defense',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 90,

        // Defense zone: Protects buildings within 40-cell radius
        effects: {
          aura: null,
          zoneBonus: {
            type: 'defense',
            radius: 40,
            multiplier: 1.20 // 20% damage reduction
          },
          multipliers: {}
        },

        health: 180,
        maxHealth: 180,
        decayRate: 0.12
      },

      // ============================================
      // CASTLE TIER BUILDINGS
      // ============================================

      CASTLE: {
        type: 'CASTLE',
        tier: 'CASTLE',
        displayName: 'Castle',
        description: 'Ultimate fortress structure',
        dimensions: { width: 5, height: 3, depth: 5 },

        tierRequirements: {
          SURVIVAL: { required: false, unlocked: true },
          PERMANENT: { required: false, unlocked: true },
          TOWN: { required: false, unlocked: true },
          CASTLE: { buildingsRequired: 3, resourcesRequired: { wood: 500, food: 300, stone: 1000 } }
        },

        cost: {
          wood: 500,
          food: 300,
          stone: 1000
        },

        production: {
          wood: 0,
          food: 0,
          stone: 0
        },

        consumption: {
          wood: 0,
          food: 0,
          stone: 0
        },

        storage: {
          wood: 1000,
          food: 1000,
          stone: 1000
        },

        workSlots: 5,
        workType: 'management',

        statuses: ['BLUEPRINT', 'UNDER_CONSTRUCTION', 'COMPLETED', 'DAMAGED'],
        constructionTime: 300,

        // Large aura + defense zone combined
        effects: {
          aura: {
            type: 'production',
            radius: 80,
            multiplier: 1.10
          },
          zoneBonus: {
            type: 'defense',
            radius: 60,
            multiplier: 1.30 // 30% damage reduction
          },
          multipliers: {}
        },

        health: 500,
        maxHealth: 500,
        decayRate: 0.15
      }
    };
  }

  /**
   * Validate all building configurations
   * @private
   * @throws {Error} If any configuration is invalid
   */
  _validateAll() {
    for (const [type, config] of Object.entries(this.buildingTypes)) {
      this._validateConfig(type, config);
    }
  }

  /**
   * Validate a single building configuration
   * @private
   * @param {string} type - Building type
   * @param {Object} config - Building configuration
   * @throws {Error} If configuration is invalid
   */
  _validateConfig(type, config) {
    // Check required fields
    const required = ['type', 'tier', 'displayName', 'dimensions', 'cost', 'production', 'storage', 'workSlots', 'health', 'maxHealth'];
    for (const field of required) {
      if (!(field in config)) {
        throw new Error(`Building ${type} missing required field: ${field}`);
      }
    }

    // Validate dimensions are positive
    const { width, height, depth } = config.dimensions;
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new Error(`Building ${type} has invalid dimensions: ${width}×${height}×${depth}`);
    }

    // Validate production/consumption/storage are objects with wood, food, stone
    const resources = ['wood', 'food', 'stone'];
    for (const field of ['cost', 'production', 'consumption', 'storage']) {
      for (const resource of resources) {
        if (!(resource in config[field])) {
          throw new Error(`Building ${type} missing ${resource} in ${field}`);
        }
        if (config[field][resource] < 0) {
          throw new Error(`Building ${type} has negative ${resource} in ${field}`);
        }
      }
    }

    // Validate health
    if (config.health <= 0 || config.maxHealth <= 0) {
      throw new Error(`Building ${type} has invalid health: ${config.health}/${config.maxHealth}`);
    }

    // Validate work slots
    if (config.workSlots < 0) {
      throw new Error(`Building ${type} has negative work slots: ${config.workSlots}`);
    }

    // Validate tier
    const validTiers = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
    if (!validTiers.includes(config.tier)) {
      throw new Error(`Building ${type} has invalid tier: ${config.tier}`);
    }
  }

  /**
   * Get configuration for a building type
   * @param {string} type - Building type
   * @returns {Object} Building configuration (deep copy)
   * @throws {Error} If building type not found
   */
  getConfig(type) {
    if (!(type in this.buildingTypes)) {
      throw new Error(`Building type not found: ${type}`);
    }
    // Return deep copy to prevent mutations
    return JSON.parse(JSON.stringify(this.buildingTypes[type]));
  }

  /**
   * Get all building types for a specific tier
   * @param {string} tier - Tier level (SURVIVAL, PERMANENT, TOWN, CASTLE)
   * @returns {Array<string>} Building types in tier
   */
  getTypesByTier(tier) {
    return Object.keys(this.buildingTypes).filter(
      type => this.buildingTypes[type].tier === tier
    );
  }

  /**
   * Get all registered building types
   * @returns {Array<string>} All building type names
   */
  getAllTypes() {
    return Object.keys(this.buildingTypes);
  }

  /**
   * Check if building type exists
   * @param {string} type - Building type
   * @returns {boolean} True if type exists
   */
  typeExists(type) {
    return type in this.buildingTypes;
  }

  /**
   * Get total cost to build a building
   * @param {string} type - Building type
   * @returns {Object} Cost object {wood, food, stone}
   */
  getBuildingCost(type) {
    return this.getConfig(type).cost;
  }

  /**
   * Get building dimensions
   * @param {string} type - Building type
   * @returns {Object} Dimensions {width, height, depth}
   */
  getBuildingDimensions(type) {
    return this.getConfig(type).dimensions;
  }

  /**
   * Get tier requirements for building type
   * @param {string} type - Building type
   * @returns {Object} Tier requirements
   */
  getTierRequirements(type) {
    return this.getConfig(type).tierRequirements;
  }

  /**
   * Get storage capacity for building
   * @param {string} type - Building type
   * @returns {Object} Storage {wood, food, stone}
   */
  getStorageCapacity(type) {
    return this.getConfig(type).storage;
  }

  /**
   * Get production rates for building
   * @param {string} type - Building type
   * @returns {Object} Production {wood, food, stone} per tick
   */
  getProductionRates(type) {
    return this.getConfig(type).production;
  }

  /**
   * Get work slots available in building
   * @param {string} type - Building type
   * @returns {number} Number of work slots
   */
  getWorkSlots(type) {
    return this.getConfig(type).workSlots;
  }

  /**
   * Get building effects (aura, zones)
   * @param {string} type - Building type
   * @returns {Object} Effects configuration
   */
  getEffects(type) {
    return this.getConfig(type).effects;
  }

  /**
   * Check if building has aura effect
   * @param {string} type - Building type
   * @returns {boolean} True if building provides aura
   */
  hasAura(type) {
    const effects = this.getEffects(type);
    return effects.aura !== null && effects.aura !== undefined;
  }

  /**
   * Check if building has zone bonus
   * @param {string} type - Building type
   * @returns {boolean} True if building provides zone bonus
   */
  hasZoneBonus(type) {
    const effects = this.getEffects(type);
    return effects.zoneBonus !== null && effects.zoneBonus !== undefined;
  }

  /**
   * Get repair cost for a building
   * Repair cost is 50% of the original construction cost
   * @param {string} type - Building type
   * @returns {Object} Repair cost {wood, food, stone, gold}
   */
  getRepairCost(type) {
    const constructionCost = this.getCost(type);
    const repairCost = {};

    // Repair costs 50% of construction cost
    for (const [resource, amount] of Object.entries(constructionCost)) {
      repairCost[resource] = Math.ceil(amount * 0.5);
    }

    return repairCost;
  }

  /**
   * Get repair amount (health restored per repair action)
   * Default is 25 HP per repair
   * @param {string} type - Building type
   * @returns {number} Health restored
   */
  getRepairAmount(type) {
    // Default repair amount is 25 HP
    // Could be customized per building type in future
    return 25;
  }

  /**
   * Get building health and durability info
   * @param {string} type - Building type
   * @returns {Object} {health, maxHealth, decayRate}
   */
  getHealthConfig(type) {
    const config = this.getConfig(type);
    return {
      health: config.health || 100,
      maxHealth: config.maxHealth || 100,
      decayRate: config.decayRate || 0
    };
  }
}

export default BuildingConfig;
