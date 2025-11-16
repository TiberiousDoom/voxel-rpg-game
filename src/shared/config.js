/**
 * Shared Configuration File
 *
 * This is the single source of truth for all base-building system constants.
 * All four modules (Foundation, Building Types, Resource Economy, Territory & Town Planning)
 * import from this file to ensure consistent terminology and values across the entire system.
 *
 * When making changes to these constants, remember:
 * - Changes here propagate to ALL modules
 * - Coordinate with other teams before modifying grid dimensions or building types
 * - Add detailed comments explaining WHY constants have their current values
 */

// ============================================================================
// BUILDING TYPE CONSTANTS
// ============================================================================
// Each building type is uniquely identified by a constant. This prevents
// typos like "house" vs "HOUSE" vs "building_house" across different modules.
export const BUILDING_TYPES = {
  // Survival Tier: Basic structures for survival
  WALL: 'WALL',
  DOOR: 'DOOR',
  CHEST: 'CHEST',

  // Permanent Tier: More durable structures
  TOWER: 'TOWER',
  WATCHTOWER: 'WATCHTOWER',
  GUARD_POST: 'GUARD_POST',

  // Town Tier: Civilization structures
  CRAFTING_STATION: 'CRAFTING_STATION',
  STORAGE_BUILDING: 'STORAGE_BUILDING',
  BARRACKS: 'BARRACKS',
  MARKETPLACE: 'MARKETPLACE',

  // Castle Tier: Late-game structures
  FORTRESS: 'FORTRESS',
  CASTLE: 'CASTLE',
};

// ============================================================================
// PROGRESSION TIER DEFINITIONS
// ============================================================================
// Buildings are organized into tiers representing progression stages.
// These tiers unlock as the player progresses through the game.
export const BUILDING_TIERS = {
  SURVIVAL: 'SURVIVAL',      // First buildings, minimal resources
  PERMANENT: 'PERMANENT',    // More investment, better durability
  TOWN: 'TOWN',              // Civilization phase, complex builds
  CASTLE: 'CASTLE',          // End-game, maximum investment
};

// ============================================================================
// GRID AND COORDINATE SYSTEM CONSTANTS
// ============================================================================
// These define the spatial foundation for all building placement.
// The grid is square-based with configurable cell size.

// Grid dimensions: The playable building area is a square grid.
// 50x50 grid provides ample space for player movement and base building.
// This ensures buildings placed in the world appear correctly in the viewport.
export const GRID = {
  CELL_SIZE: 1,              // Size of each grid cell in world units
  GRID_WIDTH: 50,            // Grid cells wide (matches GameViewport GRID_WIDTH)
  GRID_HEIGHT: 50,           // Grid cells tall (matches GameViewport GRID_HEIGHT)
  GRID_ORIGIN: { x: -25, z: -25 }, // World position of grid origin (bottom-left)

  // Rotation rules: Buildings can snap to cardinal directions
  ALLOWED_ROTATIONS: [0, 90, 180, 270], // Degrees
  ROTATION_SNAP: 90,                    // Snap rotations to this many degrees

  // Diagonal movement: Prevents buildings from being placed diagonally
  ALLOW_DIAGONAL_PLACEMENT: false,

  // Height constraints: How far above/below terrain can buildings be placed
  MIN_PLACEMENT_HEIGHT: -10,
  MAX_PLACEMENT_HEIGHT: 50,
};

// ============================================================================
// BUILDING SIZE AND DIMENSION CONSTANTS
// ============================================================================
// Each building type has specific physical dimensions.
// These are used for collision detection and visual rendering.

export const BUILDING_DIMENSIONS = {
  [BUILDING_TYPES.WALL]: { width: 1, height: 2, depth: 0.2 },
  [BUILDING_TYPES.DOOR]: { width: 1, height: 2.5, depth: 0.2 },
  [BUILDING_TYPES.CHEST]: { width: 0.5, height: 0.8, depth: 0.5 },
  [BUILDING_TYPES.TOWER]: { width: 2, height: 3, depth: 2 },
  [BUILDING_TYPES.WATCHTOWER]: { width: 2, height: 4, depth: 2 },
  [BUILDING_TYPES.GUARD_POST]: { width: 3, height: 2, depth: 3 },
  [BUILDING_TYPES.CRAFTING_STATION]: { width: 2, height: 1.5, depth: 2 },
  [BUILDING_TYPES.STORAGE_BUILDING]: { width: 3, height: 2.5, depth: 3 },
  [BUILDING_TYPES.BARRACKS]: { width: 4, height: 3, depth: 4 },
  [BUILDING_TYPES.MARKETPLACE]: { width: 5, height: 2.5, depth: 5 },
  [BUILDING_TYPES.FORTRESS]: { width: 6, height: 4, depth: 6 },
  [BUILDING_TYPES.CASTLE]: { width: 8, height: 5, depth: 8 },
};

// ============================================================================
// BUILDING STATUS/STATE CONSTANTS
// ============================================================================
// Buildings transition through these states as they are constructed
// and potentially damaged during gameplay.

export const BUILDING_STATUS = {
  BLUEPRINT: 'BLUEPRINT',    // Placed but not started construction
  BUILDING: 'BUILDING',      // Under construction (progress 0-99%)
  COMPLETE: 'COMPLETE',      // Fully constructed and operational
  DAMAGED: 'DAMAGED',        // Took damage, can be repaired
  DESTROYED: 'DESTROYED',    // Completely destroyed, cannot be repaired
};

// ============================================================================
// RESOURCE TYPE CONSTANTS
// ============================================================================
// These are the fundamental resources in the economy.
// The Resource Economy module references these when calculating costs.

export const RESOURCE_TYPES = {
  GOLD: 'GOLD',
  WOOD: 'WOOD',
  STONE: 'STONE',
  ESSENCE: 'ESSENCE',        // Magical resource
  CRYSTAL: 'CRYSTAL',        // Rare material
};

// ============================================================================
// BUILDING PROPERTIES AND COSTS
// ============================================================================
// Each building has immutable base properties defined here.
// The Resource Economy module uses these to calculate requirements.

export const BUILDING_PROPERTIES = {
  [BUILDING_TYPES.WALL]: {
    tier: BUILDING_TIERS.SURVIVAL,
    visualId: 'wall_stone',      // Reference to visual asset/sprite
    hp: 50,
    buildTime: 5,              // seconds
    costs: { [RESOURCE_TYPES.GOLD]: 20 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0xcccccc,      // Light gray for placement preview
      building: 0x888888,     // Medium gray while building
      complete: 0x606060,     // Dark gray when complete
    },
  },
  [BUILDING_TYPES.DOOR]: {
    tier: BUILDING_TIERS.SURVIVAL,
    visualId: 'door_wooden',
    hp: 40,
    buildTime: 10,
    costs: { [RESOURCE_TYPES.GOLD]: 25, [RESOURCE_TYPES.WOOD]: 10 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0xd4a574,
      building: 0xb8860b,
      complete: 0x8b4513,
    },
  },
  [BUILDING_TYPES.CHEST]: {
    tier: BUILDING_TIERS.SURVIVAL,
    visualId: 'chest_wooden',
    hp: 30,
    buildTime: 8,
    costs: { [RESOURCE_TYPES.GOLD]: 15, [RESOURCE_TYPES.WOOD]: 20 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0xc0a080,
      building: 0xb8860b,
      complete: 0x8b4513,
    },
  },
  [BUILDING_TYPES.TOWER]: {
    tier: BUILDING_TIERS.PERMANENT,
    visualId: 'tower_stone',
    hp: 100,
    buildTime: 20,
    costs: { [RESOURCE_TYPES.GOLD]: 50, [RESOURCE_TYPES.ESSENCE]: 5 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0x666666,
      building: 0x4a4a4a,
      complete: 0x2a2a2a,
    },
  },
  [BUILDING_TYPES.WATCHTOWER]: {
    tier: BUILDING_TIERS.PERMANENT,
    visualId: 'watchtower_tall',
    hp: 120,
    buildTime: 30,
    costs: { [RESOURCE_TYPES.GOLD]: 75, [RESOURCE_TYPES.ESSENCE]: 10, [RESOURCE_TYPES.STONE]: 20 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0x556b2f,
      building: 0x444444,
      complete: 0x2a2a2a,
    },
  },
  [BUILDING_TYPES.GUARD_POST]: {
    tier: BUILDING_TIERS.PERMANENT,
    visualId: 'guardpost_wooden',
    hp: 90,
    buildTime: 25,
    costs: { [RESOURCE_TYPES.GOLD]: 60, [RESOURCE_TYPES.ESSENCE]: 8 },
    npcCapacity: 2,             // Can assign up to 2 NPCs (guards)
    populationCapacity: 8,      // Houses 8 population units
    colors: {
      preview: 0x8b5a3c,
      building: 0x654321,
      complete: 0x4a3728,
    },
  },
  [BUILDING_TYPES.CRAFTING_STATION]: {
    tier: BUILDING_TIERS.TOWN,
    visualId: 'craftingstation_workshop',
    hp: 100,
    buildTime: 35,
    costs: { [RESOURCE_TYPES.GOLD]: 75, [RESOURCE_TYPES.ESSENCE]: 10, [RESOURCE_TYPES.CRYSTAL]: 5 },
    npcCapacity: 3,             // Can assign up to 3 crafters
    populationCapacity: 10,     // Houses 10 population units
    colors: {
      preview: 0xcd853f,
      building: 0xb8860b,
      complete: 0x8b4513,
    },
  },
  [BUILDING_TYPES.STORAGE_BUILDING]: {
    tier: BUILDING_TIERS.TOWN,
    visualId: 'storage_warehouse',
    hp: 110,
    buildTime: 40,
    costs: { [RESOURCE_TYPES.GOLD]: 100, [RESOURCE_TYPES.ESSENCE]: 15, [RESOURCE_TYPES.STONE]: 30 },
    npcCapacity: 0,             // Cannot assign NPCs (no workers)
    populationCapacity: 5,      // Houses 5 population units
    colors: {
      preview: 0xa0522d,
      building: 0x8b4513,
      complete: 0x654321,
    },
  },
  [BUILDING_TYPES.BARRACKS]: {
    tier: BUILDING_TIERS.TOWN,
    visualId: 'barracks_military',
    hp: 120,
    buildTime: 45,
    costs: { [RESOURCE_TYPES.GOLD]: 120, [RESOURCE_TYPES.ESSENCE]: 20, [RESOURCE_TYPES.STONE]: 40 },
    npcCapacity: 8,             // Can assign up to 8 guards/soldiers
    populationCapacity: 20,     // Houses 20 population units
    colors: {
      preview: 0x556b2f,
      building: 0x4a4a4a,
      complete: 0x2a2a2a,
    },
  },
  [BUILDING_TYPES.MARKETPLACE]: {
    tier: BUILDING_TIERS.TOWN,
    visualId: 'marketplace_trade',
    hp: 100,
    buildTime: 50,
    costs: { [RESOURCE_TYPES.GOLD]: 150, [RESOURCE_TYPES.ESSENCE]: 25, [RESOURCE_TYPES.CRYSTAL]: 10 },
    npcCapacity: 4,             // Can assign up to 4 traders
    populationCapacity: 15,     // Houses 15 population units
    colors: {
      preview: 0xd4af37,
      building: 0xffd700,
      complete: 0xdaa520,
    },
  },
  [BUILDING_TYPES.FORTRESS]: {
    tier: BUILDING_TIERS.CASTLE,
    visualId: 'fortress_fortified',
    hp: 200,
    buildTime: 120,
    costs: { [RESOURCE_TYPES.GOLD]: 300, [RESOURCE_TYPES.ESSENCE]: 50, [RESOURCE_TYPES.STONE]: 100, [RESOURCE_TYPES.CRYSTAL]: 20 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing
    colors: {
      preview: 0x4a4a4a,
      building: 0x2a2a2a,
      complete: 0x1a1a1a,
    },
  },
  [BUILDING_TYPES.CASTLE]: {
    tier: BUILDING_TIERS.CASTLE,
    visualId: 'castle_royal',
    hp: 250,
    buildTime: 180,
    costs: { [RESOURCE_TYPES.GOLD]: 500, [RESOURCE_TYPES.ESSENCE]: 100, [RESOURCE_TYPES.STONE]: 200, [RESOURCE_TYPES.CRYSTAL]: 50 },
    npcCapacity: 0,             // Cannot assign NPCs
    populationCapacity: 0,      // No population housing (seat of power)
    colors: {
      preview: 0x2a2a2a,
      building: 0x1a1a1a,
      complete: 0x0a0a0a,
    },
  },
};

// ============================================================================
// PLACEMENT CONSTRAINTS
// ============================================================================
// These define the rules for where buildings can be placed.

export const PLACEMENT_CONSTRAINTS = {
  // Minimum distance between buildings of certain types
  MINIMUM_SPACING: 0.5,       // Grid cells between buildings

  // Can buildings overlap with player's current position?
  ALLOW_OVERLAP_WITH_PLAYER: false,

  // Can buildings be placed outside the main grid?
  ENFORCE_GRID_BOUNDS: true,

  // Maximum buildings allowed in the game world
  // This prevents memory and performance issues
  MAX_BUILDINGS_PER_WORLD: 1000,

  // Buildings that require specific distance from other buildings
  // E.g., guard posts should be spaced out
  SPACING_REQUIREMENTS: {
    [BUILDING_TYPES.GUARD_POST]: 3,    // Min 3 cells from other guard posts
    [BUILDING_TYPES.WATCHTOWER]: 2,    // Min 2 cells from other watchtowers
  },
};

// ============================================================================
// VISUAL AND UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  // Placement preview settings
  PREVIEW_OPACITY: 0.6,
  PREVIEW_GRID_VISIBLE: true,
  PREVIEW_COLLISION_COLOR: 0xff0000,  // Red for invalid placement
  PREVIEW_VALID_COLOR: 0x00ff00,      // Green for valid placement

  // Building selection and highlighting
  SELECTION_COLOR: 0xffff00,          // Yellow highlight
  SELECTION_OUTLINE_WIDTH: 2,
};

// ============================================================================
// PERFORMANCE OPTIMIZATION CONSTANTS
// ============================================================================
// These affect how the system performs under load.

export const PERFORMANCE = {
  // Spatial hash grid cell size for collision detection
  // Larger = fewer cells to check, but less precise
  SPATIAL_HASH_CELL_SIZE: 5,

  // How often to check for building collisions (in frames)
  // 1 = every frame, 2 = every other frame, etc.
  COLLISION_CHECK_FREQUENCY: 1,

  // Number of buildings to pool at startup
  // Reduces memory allocation during gameplay
  INITIAL_OBJECT_POOL_SIZE: 100,

  // Maximum buildings to render at once
  // Beyond this, use LOD (level of detail) or culling
  MAX_BUILDINGS_RENDER_DISTANCE: 50,
};

// ============================================================================
// BUILDING CLASSIFICATIONS BY ROLE
// ============================================================================
// These classify buildings into categories based on their function.
// Used by Module 4 (Territory & Town) to determine bonuses, NPC placement, etc.
// Centralized here to prevent duplication across modules.

export const BUILDING_CLASSIFICATIONS = {
  // Defensive buildings - Provide defense/protection bonuses
  DEFENSIVE_BUILDINGS: [
    BUILDING_TYPES.WALL,
    BUILDING_TYPES.TOWER,
    BUILDING_TYPES.WATCHTOWER,
    BUILDING_TYPES.GUARD_POST,
    BUILDING_TYPES.FORTRESS,
    BUILDING_TYPES.CASTLE,
  ],

  // Production buildings - Generate resources or allow crafting
  PRODUCTION_BUILDINGS: [
    BUILDING_TYPES.CRAFTING_STATION,
    BUILDING_TYPES.STORAGE_BUILDING,
    BUILDING_TYPES.BARRACKS,
    BUILDING_TYPES.MARKETPLACE,
  ],

  // Buildings that can have NPCs assigned
  NPC_ASSIGNABLE_BUILDINGS: [
    BUILDING_TYPES.BARRACKS,
    BUILDING_TYPES.CRAFTING_STATION,
    BUILDING_TYPES.MARKETPLACE,
    BUILDING_TYPES.GUARD_POST,
  ],

  // Territory control buildings - Expand territory when placed
  TERRITORY_CONTROL_BUILDINGS: [
    BUILDING_TYPES.WATCHTOWER,
    BUILDING_TYPES.GUARD_POST,
    BUILDING_TYPES.FORTRESS,
    BUILDING_TYPES.CASTLE,
  ],

  // Capital buildings - Can serve as town center/capital
  CAPITAL_BUILDINGS: [
    BUILDING_TYPES.FORTRESS,
    BUILDING_TYPES.CASTLE,
  ],
};

// ============================================================================
// TERRITORY AND TOWN CONFIGURATION
// ============================================================================
// Rules for territory expansion and town growth
// These constants define how territory expands based on defensive buildings

export const TERRITORY_CONFIG = {
  // Base territory radius in grid cells (starting size)
  BASE_RADIUS: 25,

  // Radius expansion per specific control building
  BUILDING_RADIUS_BONUSES: {
    [BUILDING_TYPES.WATCHTOWER]: 5,      // Watchtower adds 5 cells to radius
    [BUILDING_TYPES.GUARD_POST]: 2,      // Guard post adds 2 cells to radius
    [BUILDING_TYPES.FORTRESS]: 15,       // Fortress adds 15 cells to radius
    [BUILDING_TYPES.CASTLE]: 25,         // Castle adds 25 cells to radius
  },

  // Maximum territory radius achievable
  MAX_TERRITORY_RADIUS: 100,

  // Minimum distance required between territory centers to prevent overlap
  MIN_TERRITORY_SEPARATION: 50,

  // Territory expansion cost in resources (optional, for future implementation)
  TERRITORY_EXPANSION_COST: {
    [RESOURCE_TYPES.GOLD]: 100,
    [RESOURCE_TYPES.STONE]: 50,
  },

  // How often to recalculate territory metrics (frames)
  RECALCULATION_FREQUENCY: 60,
};

// ============================================================================
// TOWN UPGRADE DEFINITIONS
// ============================================================================
// Town upgrades that increase capability and unlock new features

export const TOWN_UPGRADES = {
  city_wall: {
    id: 'city_wall',
    name: 'City Wall',
    description: 'Defensive perimeter around town',
    type: 'DEFENSIVE',
    buildTime: 60,      // seconds
    costs: { [RESOURCE_TYPES.GOLD]: 200 },
    requirements: { buildingCount: 5 },
    effects: { defense: 10 },
  },
  better_marketplace: {
    id: 'better_marketplace',
    name: 'Better Marketplace',
    description: 'Expanded marketplace for increased trade',
    type: 'FUNCTIONAL',
    buildTime: 90,
    costs: { [RESOURCE_TYPES.GOLD]: 300, [RESOURCE_TYPES.ESSENCE]: 20 },
    requirements: { buildingCount: 10, buildingType: 'MARKETPLACE' },
    effects: { prosperity: 15 },
  },
  monument_construction: {
    id: 'monument_construction',
    name: 'Monument Construction',
    description: 'Aesthetic monument for town pride',
    type: 'COSMETIC',
    buildTime: 120,
    costs: { [RESOURCE_TYPES.GOLD]: 250, [RESOURCE_TYPES.STONE]: 30 },
    requirements: { buildingCount: 15 },
    effects: { happiness: 10 },
  },
  fortified_defense: {
    id: 'fortified_defense',
    name: 'Fortified Defense',
    description: 'Advanced defensive structures and garrison',
    type: 'DEFENSIVE',
    buildTime: 150,
    costs: { [RESOURCE_TYPES.GOLD]: 500, [RESOURCE_TYPES.STONE]: 100 },
    requirements: { buildingCount: 20, defensiveBuildings: 5 },
    effects: { defense: 20 },
  },
  prosperity_initiative: {
    id: 'prosperity_initiative',
    name: 'Prosperity Initiative',
    description: 'Town-wide prosperity and happiness program',
    type: 'FUNCTIONAL',
    buildTime: 180,
    costs: { [RESOURCE_TYPES.GOLD]: 400, [RESOURCE_TYPES.ESSENCE]: 40 },
    requirements: { buildingCount: 25, prosperity: 50 },
    effects: { prosperity: 25, happiness: 5 },
  },
};

// ============================================================================
// SAVE/LOAD SCHEMA VERSION
// ============================================================================
// Increment this when the building save format changes.
// Prevents loading incompatible save files.

export const SAVE_VERSION = 1;
