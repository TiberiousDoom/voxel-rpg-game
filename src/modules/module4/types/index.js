/**
 * Module 4: Territory, Town Planning & Aesthetics - Type Definitions
 *
 * This file defines all TypeScript-like type structures for Module 4.
 * These types document the shape of data used throughout the territory system.
 */

/**
 * Territory Type Definition
 * Represents a claimed territory boundary and its properties
 *
 * @typedef {Object} Territory
 * @property {string} id - Unique territory identifier
 * @property {string} name - Territory display name
 * @property {Object} center - Territory center position { x, y, z }
 * @property {number} radius - Current territory radius (in grid cells)
 * @property {number} maxRadius - Maximum possible radius for this territory
 * @property {number} claimedAtTime - Timestamp when territory was first claimed
 * @property {Object} bonuses - Calculated bonuses from buildings
 * @property {string[]} buildingIds - Array of building IDs within territory
 * @property {boolean} active - Whether territory is currently active
 */

/**
 * Territory Bonus Type Definition
 * Represents a bonus applied to the territory
 *
 * @typedef {Object} TerritoryBonus
 * @property {string} id - Unique bonus identifier
 * @property {string} type - Bonus type (e.g., 'resource_production', 'enemy_spawn_rate', 'vision_range')
 * @property {string} sourceBuilding - Building type that provides this bonus
 * @property {number} magnitude - Bonus amount or percentage
 * @property {string} unit - Unit of measurement ('percentage', 'flat', 'multiplier')
 * @property {boolean} active - Whether bonus is currently applied
 */

/**
 * Town Type Definition
 * Represents the overall settlement and its management state
 *
 * @typedef {Object} Town
 * @property {string} id - Unique town identifier
 * @property {string} name - Town display name
 * @property {string} territoryId - Associated territory ID
 * @property {Object} statistics - Town statistical data
 * @property {Object} upgrades - Town upgrades status
 * @property {Object} aesthetics - Aesthetic improvements
 * @property {number} createdAt - Timestamp of town creation
 */

/**
 * Town Statistics Type Definition
 * Tracks aggregate town-level metrics
 *
 * @typedef {Object} TownStatistics
 * @property {number} population - Total NPC population
 * @property {number} happiness - Population happiness percentage (0-100)
 * @property {number} defense - Defense rating percentage (0-100)
 * @property {number} prosperity - Economic prosperity rating (0-100)
 * @property {number} productionRate - Resource generation multiplier
 * @property {number} totalBuildingCount - Total number of buildings
 * @property {Object} buildingCounts - Count of each building type
 */

/**
 * Town Upgrade Type Definition
 * Represents a town-level upgrade or improvement
 *
 * @typedef {Object} TownUpgrade
 * @property {string} id - Unique upgrade identifier
 * @property {string} name - Upgrade display name
 * @property {string} type - Upgrade type (cosmetic, functional, defensive)
 * @property {boolean} completed - Whether upgrade is completed
 * @property {number} tier - Upgrade tier level
 * @property {Object} requirements - Requirements to unlock this upgrade
 * @property {Object} effects - Effects this upgrade provides
 * @property {number} buildTime - Time required to build this upgrade
 */

/**
 * NPC Type Definition
 * Represents a non-player character within the town
 *
 * @typedef {Object} NPC
 * @property {string} id - Unique NPC identifier
 * @property {string} name - NPC display name
 * @property {string} role - NPC role (guard, trader, crafter, scout)
 * @property {string} assignedBuildingId - Building this NPC is assigned to
 * @property {string[]} patrolRoute - Array of building IDs for patrol
 * @property {Object} position - Current position { x, y, z }
 * @property {string} status - Current status (idle, working, patrolling, sleeping)
 * @property {number} morale - NPC morale level (0-100)
 * @property {number} productivity - Work productivity multiplier
 */

/**
 * Aesthetic Element Type Definition
 * Represents a decorative or aesthetic element
 *
 * @typedef {Object} AestheticElement
 * @property {string} id - Unique element identifier
 * @property {string} type - Element type (flag, monument, light, decoration)
 * @property {Object} position - Position in world { x, y, z }
 * @property {number} rotation - Rotation in degrees
 * @property {string} style - Visual style identifier
 * @property {Object} color - Color configuration { r, g, b, a }
 * @property {boolean} visible - Whether element is visible
 */

/**
 * Victory Condition Type Definition
 * Represents a win condition or progression goal
 *
 * @typedef {Object} VictoryCondition
 * @property {string} id - Unique condition identifier
 * @property {string} type - Condition type (territory_size, population, buildings, upgrades)
 * @property {string} description - Human-readable description
 * @property {Object} requirements - Requirements to meet this condition
 * @property {boolean} completed - Whether condition is met
 * @property {number} progress - Progress toward completion (0-100)
 * @property {string} reward - Reward for completing this condition
 */

/**
 * Progression State Type Definition
 * Tracks overall game progression and unlocks
 *
 * @typedef {Object} ProgressionState
 * @property {string[]} completedMilestones - Array of completed milestone IDs
 * @property {string[]} unlockedUpgrades - Array of unlocked upgrade IDs
 * @property {string[]} discoveredMonuments - Array of discovered monument IDs
 * @property {number} totalPlaytime - Total gameplay time in seconds
 * @property {Object} achievements - Achievement tracking
 */

export const MODULE_4_TYPES = {
  Territory: 'Territory',
  TerritoryBonus: 'TerritoryBonus',
  Town: 'Town',
  TownStatistics: 'TownStatistics',
  TownUpgrade: 'TownUpgrade',
  NPC: 'NPC',
  AestheticElement: 'AestheticElement',
  VictoryCondition: 'VictoryCondition',
  ProgressionState: 'ProgressionState',
};

export const NPC_ROLES = {
  GUARD: 'GUARD',
  TRADER: 'TRADER',
  CRAFTER: 'CRAFTER',
  SCOUT: 'SCOUT',
  FARMER: 'FARMER',
};

export const NPC_STATUSES = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  PATROLLING: 'PATROLLING',
  SLEEPING: 'SLEEPING',
  TRAVELING: 'TRAVELING',
};

export const TOWN_UPGRADE_TYPES = {
  COSMETIC: 'COSMETIC',
  FUNCTIONAL: 'FUNCTIONAL',
  DEFENSIVE: 'DEFENSIVE',
};

export const BONUS_TYPES = {
  RESOURCE_PRODUCTION: 'RESOURCE_PRODUCTION',
  ENEMY_SPAWN_RATE: 'ENEMY_SPAWN_RATE',
  VISION_RANGE: 'VISION_RANGE',
  NPC_HAPPINESS: 'NPC_HAPPINESS',
  DEFENSE_RATING: 'DEFENSE_RATING',
  PROSPERITY: 'PROSPERITY',
};

export const AESTHETIC_ELEMENT_TYPES = {
  FLAG: 'FLAG',
  MONUMENT: 'MONUMENT',
  LIGHT: 'LIGHT',
  DECORATION: 'DECORATION',
  STREET: 'STREET',
  GARDEN: 'GARDEN',
};

export const VICTORY_CONDITION_TYPES = {
  TERRITORY_SIZE: 'TERRITORY_SIZE',
  POPULATION: 'POPULATION',
  BUILDING_COUNT: 'BUILDING_COUNT',
  UPGRADES_COMPLETED: 'UPGRADES_COMPLETED',
  MONUMENT_BUILD: 'MONUMENT_BUILD',
  CASTLE_BUILD: 'CASTLE_BUILD',
};
