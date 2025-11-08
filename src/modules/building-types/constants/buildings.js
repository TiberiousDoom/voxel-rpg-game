/**
 * Module 2: Building Types & Progression System
 *
 * Building Catalog - Complete definition of all building types
 * This is the "game designer's document in code form"
 *
 * Each building defines:
 * - Identity: Name, ID, category
 * - Tier Classification: What progression tier this belongs to
 * - Structural Properties: Size, rotation rules, terrain requirements
 * - Tier Progression: What this building upgrades to (if anything)
 * - Interconnection Rules: Dependencies on other buildings
 */

export const BUILDING_CATALOG = {
  // ============================================================
  // SURVIVAL TIER - Early game, basic survival structures
  // ============================================================

  WALL: {
    id: 'WALL',
    name: 'Wall',
    description: 'Basic defensive structure. Blocks movement and provides protection.',
    tier: 'SURVIVAL',
    category: 'DEFENSIVE',

    // Structural Properties
    width: 1,
    height: 1,
    depth: 2,
    rotatable: true,
    canRotateOnPlace: true,

    // Placement Requirements
    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 1,
    },

    // Collision & Movement
    blocksPlayerMovement: true,
    blocksNpcMovement: true,

    // Progression
    upgradesTo: null,  // Walls don't upgrade
    replacedBy: null,
    children: [],

    // Interconnection Rules
    interconnectionRules: {
      requiresNear: [],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  DOOR: {
    id: 'DOOR',
    name: 'Door',
    description: 'Entryway for the player and NPCs. Can be opened and closed.',
    tier: 'SURVIVAL',
    category: 'STRUCTURE',

    width: 1,
    height: 2,
    depth: 1,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: false,  // Can pass through
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  CHEST: {
    id: 'CHEST',
    name: 'Chest',
    description: 'Storage container for resources. Extends storage capacity.',
    tier: 'SURVIVAL',
    category: 'STORAGE',

    width: 1,
    height: 1,
    depth: 1,
    rotatable: false,
    canRotateOnPlace: false,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: false,
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: true,  // Multiple chests provide more storage
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  // ============================================================
  // PERMANENT TIER - Mid game, established structures
  // ============================================================

  TOWER: {
    id: 'TOWER',
    name: 'Tower',
    description: 'Defensive structure with extended line of sight. Detects threats from distance.',
    tier: 'PERMANENT',
    category: 'DEFENSIVE',

    width: 2,
    height: 2,
    depth: 3,
    rotatable: false,
    canRotateOnPlace: false,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 2,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: true,

    upgradesTo: null,
    replacedBy: 'WATCHTOWER',  // Can be replaced with watchtower
    children: [],

    interconnectionRules: {
      requiresNear: [],
      cannotBeNear: [],
      bonusWhen: [
        { building: 'WALL', effect: 'coverage', bonus: 1.2 }
      ],
      worksBestInGroups: true,  // Multiple towers improve coverage
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  WATCHTOWER: {
    id: 'WATCHTOWER',
    name: 'Watchtower',
    description: 'Advanced defensive tower. Better vision and faster threat response.',
    tier: 'PERMANENT',
    category: 'DEFENSIVE',

    width: 2,
    height: 2,
    depth: 4,
    rotatable: false,
    canRotateOnPlace: false,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 2,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: true,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [{ building: 'WALL', maxDistance: 5 }],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: true,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  GUARD_POST: {
    id: 'GUARD_POST',
    name: 'Guard Post',
    description: 'Housing and training area for guards. Increases NPC patrol presence.',
    tier: 'PERMANENT',
    category: 'DEFENSIVE',

    width: 2,
    height: 1,
    depth: 2,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 1,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: false,  // NPCs can move through

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [{ building: 'TOWER', maxDistance: 3 }],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  // ============================================================
  // TOWN TIER - Late game, economic/social structures
  // ============================================================

  CRAFTING_STATION: {
    id: 'CRAFTING_STATION',
    name: 'Crafting Station',
    description: 'Allows resource transformation and item crafting. Requires workers.',
    tier: 'TOWN',
    category: 'PRODUCTION',

    width: 2,
    height: 1,
    depth: 2,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: false,
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [{ building: 'STORAGE_BUILDING', maxDistance: 4 }],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  STORAGE_BUILDING: {
    id: 'STORAGE_BUILDING',
    name: 'Warehouse',
    description: 'Large-scale resource storage. Significantly increases storage capacity.',
    tier: 'TOWN',
    category: 'STORAGE',

    width: 3,
    height: 2,
    depth: 3,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: true,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  BARRACKS: {
    id: 'BARRACKS',
    name: 'Barracks',
    description: 'Training facility for military units. Enables troop training and management.',
    tier: 'TOWN',
    category: 'MILITARY',

    width: 3,
    height: 2,
    depth: 3,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [
        { building: 'GUARD_POST', maxDistance: 5 },
        { building: 'TOWER', maxDistance: 8 }
      ],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  MARKETPLACE: {
    id: 'MARKETPLACE',
    name: 'Marketplace',
    description: 'Economic hub for trade. Enables NPC commerce and resource trading.',
    tier: 'TOWN',
    category: 'ECONOMIC',

    width: 4,
    height: 2,
    depth: 4,
    rotatable: true,
    canRotateOnPlace: true,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: 0,
      maxHeightDifference: 0,
    },

    blocksPlayerMovement: false,
    blocksNpcMovement: false,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [{ building: 'STORAGE_BUILDING', maxDistance: 6 }],
      cannotBeNear: [],
      bonusWhen: [
        { building: 'CRAFTING_STATION', effect: 'efficiency', bonus: 1.15 }
      ],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  // ============================================================
  // CASTLE TIER - End game, powerful/prestigious structures
  // ============================================================

  FORTRESS: {
    id: 'FORTRESS',
    name: 'Fortress',
    description: 'Massive defensive structure. Central defensive hub for castle territory.',
    tier: 'CASTLE',
    category: 'DEFENSIVE',

    width: 4,
    height: 3,
    depth: 4,
    rotatable: false,
    canRotateOnPlace: false,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: -1,
      maxHeightDifference: 2,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: true,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [
        { building: 'WALL', maxDistance: 8 },
        { building: 'WATCHTOWER', maxDistance: 10 }
      ],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },

  CASTLE: {
    id: 'CASTLE',
    name: 'Castle',
    description: 'Ultimate structure. Seat of power and primary defensive stronghold.',
    tier: 'CASTLE',
    category: 'DEFENSIVE',

    width: 5,
    height: 4,
    depth: 5,
    rotatable: false,
    canRotateOnPlace: false,

    terrainRequirements: {
      canPlaceOn: ['grass', 'dirt', 'stone'],
      cannotPlaceOn: ['water'],
      minHeightDifference: -2,
      maxHeightDifference: 3,
    },

    blocksPlayerMovement: true,
    blocksNpcMovement: true,

    upgradesTo: null,
    replacedBy: null,
    children: [],

    interconnectionRules: {
      requiresNear: [
        { building: 'FORTRESS', maxDistance: 15 },
        { building: 'WALL', maxDistance: 12 }
      ],
      cannotBeNear: [],
      bonusWhen: [],
      worksBestInGroups: false,
    },

    // Note: HP and buildTime are defined in shared/config.js BUILDING_PROPERTIES
  },
};

/**
 * Tier definitions are imported from shared config to maintain single source of truth
 * Import from: ../../shared/config.js -> BUILDING_TIERS
 */

/**
 * Building categories for grouping and filtering
 */
export const BUILDING_CATEGORIES = {
  DEFENSIVE: {
    id: 'DEFENSIVE',
    name: 'Defensive',
    description: 'Protective structures that defend against threats',
  },
  STRUCTURE: {
    id: 'STRUCTURE',
    name: 'Structure',
    description: 'General purpose structures',
  },
  STORAGE: {
    id: 'STORAGE',
    name: 'Storage',
    description: 'Buildings that increase storage capacity',
  },
  PRODUCTION: {
    id: 'PRODUCTION',
    name: 'Production',
    description: 'Buildings that produce or transform resources',
  },
  MILITARY: {
    id: 'MILITARY',
    name: 'Military',
    description: 'Military training and command structures',
  },
  ECONOMIC: {
    id: 'ECONOMIC',
    name: 'Economic',
    description: 'Trade and commerce buildings',
  },
};

/**
 * Get all buildings in the catalog
 */
export function getAllBuildings() {
  return Object.values(BUILDING_CATALOG);
}

/**
 * Get a specific building by ID
 */
export function getBuildingById(buildingId) {
  return BUILDING_CATALOG[buildingId] || null;
}

/**
 * Get all buildings of a specific tier
 */
export function getBuildingsByTier(tier) {
  return Object.values(BUILDING_CATALOG).filter(b => b.tier === tier);
}

/**
 * Get all buildings of a specific category
 */
export function getBuildingsByCategory(category) {
  return Object.values(BUILDING_CATALOG).filter(b => b.category === category);
}
