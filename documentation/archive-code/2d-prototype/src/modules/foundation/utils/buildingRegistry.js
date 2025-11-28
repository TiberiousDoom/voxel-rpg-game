/**
 * Building Registry - Foundation Module
 *
 * Central registry of all building properties.
 * This provides a convenient interface for other modules to look up
 * building metadata without needing to import the config directly.
 *
 * This serves as an abstraction layer - if building properties ever need
 * to be computed or looked up from a database instead of static config,
 * this is the place to make that change.
 */

import {
  BUILDING_PROPERTIES,
  BUILDING_DIMENSIONS,
  BUILDING_TYPES,
  BUILDING_TIERS,
  BUILDING_STATUS,
  RESOURCE_TYPES,
} from '../../../shared/config';

/**
 * Get all properties for a building type.
 *
 * @param {string} buildingType - The building type
 * @returns {Object} Complete property object, or null if type unknown
 */
export const getPropertyForBuildingType = (buildingType) => {
  return BUILDING_PROPERTIES[buildingType] || null;
};

/**
 * Get the tier of a building.
 *
 * @param {string} buildingType - The building type
 * @returns {string} The building tier, or null if unknown
 */
export const getBuildingTier = (buildingType) => {
  const props = getPropertyForBuildingType(buildingType);
  return props ? props.tier : null;
};

/**
 * Get the base HP of a building.
 *
 * @param {string} buildingType - The building type
 * @returns {number} Base HP, or 100 if unknown
 */
export const getBaseHP = (buildingType) => {
  const props = getPropertyForBuildingType(buildingType);
  return props ? props.hp : 100;
};

/**
 * Get the dimensions of a building.
 *
 * @param {string} buildingType - The building type
 * @returns {Object} { width, height, depth }, or null if unknown
 */
export const getDimensions = (buildingType) => {
  return BUILDING_DIMENSIONS[buildingType] || null;
};

/**
 * Get the build time for a building.
 *
 * @param {string} buildingType - The building type
 * @returns {number} Build time in seconds, or 0 if unknown
 */
export const getBuildTime = (buildingType) => {
  const props = getPropertyForBuildingType(buildingType);
  return props ? props.buildTime : 0;
};

/**
 * Get the resource costs to build this building.
 *
 * @param {string} buildingType - The building type
 * @returns {Object} Map of resource type -> amount, or empty if unknown
 */
export const getBuildingCosts = (buildingType) => {
  const props = getPropertyForBuildingType(buildingType);
  return props ? { ...props.costs } : {};
};

/**
 * Get color for a building in a specific state.
 *
 * @param {string} buildingType - The building type
 * @param {string} status - Building status (preview, building, complete)
 * @returns {number} Color as hex value, or default gray if unknown
 */
export const getColorForStatus = (buildingType, status) => {
  const props = getPropertyForBuildingType(buildingType);
  if (!props || !props.colors) return 0x888888; // Default gray

  // Map status to color key
  let colorKey = 'complete';
  if (status === 'BLUEPRINT') colorKey = 'preview';
  if (status === 'BUILDING') colorKey = 'building';

  return props.colors[colorKey] || props.colors.complete || 0x888888;
};

/**
 * Check if a building type is valid.
 *
 * @param {string} buildingType - The type to check
 * @returns {boolean} True if type is recognized
 */
export const isValidBuildingType = (buildingType) => {
  return Object.values(BUILDING_TYPES).includes(buildingType);
};

/**
 * Get all building types in a specific tier.
 *
 * @param {string} tier - The tier to filter by
 * @returns {Array<string>} Array of building types in that tier
 */
export const getBuildingTypesForTier = (tier) => {
  return Object.entries(BUILDING_PROPERTIES)
    .filter(([_, props]) => props.tier === tier)
    .map(([type]) => type);
};

/**
 * Get all unlocked building types based on tier progression.
 *
 * @param {string} maxTierUnlocked - Highest tier player has unlocked
 * @returns {Array<string>} All building types up to and including that tier
 */
export const getUnlockedBuildingTypes = (maxTierUnlocked) => {
  const tiers = [
    BUILDING_TIERS.SURVIVAL,
    BUILDING_TIERS.PERMANENT,
    BUILDING_TIERS.TOWN,
    BUILDING_TIERS.CASTLE,
  ];

  const maxIndex = tiers.indexOf(maxTierUnlocked);
  if (maxIndex === -1) return [];

  const unlockedTiers = tiers.slice(0, maxIndex + 1);
  const unlockedTypes = [];

  unlockedTiers.forEach((tier) => {
    unlockedTypes.push(...getBuildingTypesForTier(tier));
  });

  return unlockedTypes;
};

/**
 * Calculate total resource cost for building multiple buildings.
 *
 * @param {Array} buildings - Array of {type, count} objects
 * @returns {Object} Aggregated resource costs
 */
export const calculateTotalCosts = (buildings) => {
  const totalCosts = {};

  buildings.forEach(({ type, count = 1 }) => {
    const costs = getBuildingCosts(type);
    Object.entries(costs).forEach(([resource, amount]) => {
      totalCosts[resource] = (totalCosts[resource] || 0) + amount * count;
    });
  });

  return totalCosts;
};

/**
 * Get human-readable name for building type.
 *
 * @param {string} buildingType - The building type
 * @returns {string} Display name
 */
export const getDisplayName = (buildingType) => {
  // Convert BUILDING_TYPE to "Building Type"
  return buildingType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get human-readable description for building type.
 *
 * @param {string} buildingType - The building type
 * @returns {string} Description
 */
export const getDescription = (buildingType) => {
  // Return placeholder descriptions - can be expanded later
  const descriptions = {
    WALL: 'Basic defensive structure. Blocks movement.',
    DOOR: 'Controllable passage. Can open/close.',
    CHEST: 'Storage for items. Occupies little space.',
    TOWER: 'Defensive structure. Provides ranged protection.',
    WATCHTOWER: 'Tall tower. Extends vision range.',
    GUARD_POST: 'Defensive garrison. Trains soldiers.',
    CRAFTING_STATION: 'Workshop. Produces items.',
    STORAGE_BUILDING: 'Large storage. Holds many resources.',
    BARRACKS: 'Military building. Trains troops.',
    MARKETPLACE: 'Trading hub. Buys and sells goods.',
    FORTRESS: 'Large defensive structure.',
    CASTLE: 'Ultimate fortress. Seat of power.',
  };

  return descriptions[buildingType] || 'Unknown building';
};

/**
 * Check if a building is defensive (tower, watchtower, etc).
 *
 * @param {string} buildingType - The building type
 * @returns {boolean} True if defensive
 */
export const isDefensiveBuilding = (buildingType) => {
  const defensive = [
    BUILDING_TYPES.WALL,
    BUILDING_TYPES.TOWER,
    BUILDING_TYPES.WATCHTOWER,
    BUILDING_TYPES.GUARD_POST,
    BUILDING_TYPES.FORTRESS,
    BUILDING_TYPES.CASTLE,
  ];
  return defensive.includes(buildingType);
};

/**
 * Check if a building is production (crafting, storage, etc).
 *
 * @param {string} buildingType - The building type
 * @returns {boolean} True if production
 */
export const isProductionBuilding = (buildingType) => {
  const production = [
    BUILDING_TYPES.CRAFTING_STATION,
    BUILDING_TYPES.STORAGE_BUILDING,
    BUILDING_TYPES.MARKETPLACE,
  ];
  return production.includes(buildingType);
};

/**
 * Get a summary of building properties for UI display.
 *
 * @param {string} buildingType - The building type
 * @returns {Object} Summary information
 */
export const getSummary = (buildingType) => {
  const props = getPropertyForBuildingType(buildingType);
  if (!props) return null;

  return {
    name: getDisplayName(buildingType),
    description: getDescription(buildingType),
    tier: props.tier,
    hp: props.hp,
    buildTime: props.buildTime,
    costs: props.costs,
    width: BUILDING_DIMENSIONS[buildingType]?.width,
    depth: BUILDING_DIMENSIONS[buildingType]?.depth,
    isDefensive: isDefensiveBuilding(buildingType),
    isProduction: isProductionBuilding(buildingType),
  };
};
