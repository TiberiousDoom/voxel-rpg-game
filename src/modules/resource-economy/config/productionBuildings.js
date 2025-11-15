/**
 * Production Buildings Configuration - Module 3: Resource Economy
 *
 * Defines which buildings produce resources and at what rate.
 * These are base production rates. Territory bonuses (Module 4) modify these.
 *
 * Production buildings are identified by buildingRegistry.isProductionBuilding()
 * This file provides the WHAT and HOW MUCH they produce.
 *
 * Format:
 * {
 *   buildingType: {
 *     produces: { resource: ratePerSecond },
 *     storageCapacity: maxUnitsThisBuilding,
 *     description: "What it does",
 *   }
 * }
 *
 * Note: Storage buildings don't produce resources, they STORE them.
 * The storage capacity here is per-building. Territory storage (Module 4) aggregates all.
 */

import { BUILDING_TYPES, RESOURCE_TYPES } from '../../../shared/config';

/**
 * Production buildings and their resource generation
 * Only buildings that produce resources are listed here
 * Others are defensive or utility buildings
 */
export const PRODUCTION_BUILDINGS = {
  // ========================================================================
  // CRAFTING STATION - Produces refined goods
  // Note: This is for passive resource generation if we add auto-crafting
  // Currently, crafting is manual via CraftingUI
  // ========================================================================
  [BUILDING_TYPES.CRAFTING_STATION]: {
    // Crafting stations don't produce raw resources, they craft items
    // This is handled by CraftingUI, not the economy system
    produces: {
      // No passive production
    },
    // Crafting stations don't store resources
    storageCapacity: 0,
    description: 'Workshop for crafting items',
    productionType: 'crafting', // Special type: manual crafting station
  },

  // ========================================================================
  // STORAGE BUILDING - Stores resources without producing them
  // This is the primary storage for the territory
  // ========================================================================
  [BUILDING_TYPES.STORAGE_BUILDING]: {
    // Storage buildings don't produce resources
    produces: {
      // No production
    },
    // Each storage building adds 600 units of capacity per resource type (WF8: increased from 500, +20%)
    storageCapacity: 600,
    description: 'Large warehouse for storing resources',
    productionType: 'storage', // Special type: storage facility
  },

  // ========================================================================
  // MARKETPLACE - Trading hub
  // Note: Marketplace doesn't produce or store in base system
  // It's a trading location handled separately
  // ========================================================================
  [BUILDING_TYPES.MARKETPLACE]: {
    produces: {
      // Marketplace doesn't produce resources in base system
      // Trading is a separate system (not yet implemented)
    },
    storageCapacity: 0,
    description: 'Trading hub for buying and selling goods',
    productionType: 'trading', // Special type: trading facility
  },

  // ========================================================================
  // DEFENSIVE BUILDINGS - Don't produce resources
  // Listed here for completeness
  // ========================================================================
  [BUILDING_TYPES.WALL]: {
    produces: {},
    storageCapacity: 0,
    description: 'Defensive structure',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.DOOR]: {
    produces: {},
    storageCapacity: 0,
    description: 'Controllable passage',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.CHEST]: {
    // Chests provide small storage (personal inventory)
    produces: {},
    storageCapacity: 100,
    description: 'Small personal storage',
    productionType: 'storage',
  },
  [BUILDING_TYPES.TOWER]: {
    produces: {},
    storageCapacity: 0,
    description: 'Defensive tower',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.WATCHTOWER]: {
    produces: {},
    storageCapacity: 0,
    description: 'Tall observation tower',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.GUARD_POST]: {
    produces: {},
    storageCapacity: 0,
    description: 'Military garrison',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.BARRACKS]: {
    produces: {},
    storageCapacity: 0,
    description: 'Military barracks',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.FORTRESS]: {
    produces: {},
    storageCapacity: 0,
    description: 'Large defensive fortress',
    productionType: 'defensive',
  },
  [BUILDING_TYPES.CASTLE]: {
    produces: {},
    storageCapacity: 0,
    description: 'Ultimate fortress',
    productionType: 'defensive',
  },
};

/**
 * Get production data for a building type
 * Returns null if building doesn't produce anything
 *
 * @param {string} buildingType - The building type
 * @returns {Object|null} Production data or null
 */
export const getProductionData = (buildingType) => {
  return PRODUCTION_BUILDINGS[buildingType] || null;
};

/**
 * Check if a building is a storage building
 * These buildings store resources without producing them
 *
 * @param {string} buildingType - The building type
 * @returns {boolean} True if storage building
 */
export const isStorageBuilding = (buildingType) => {
  const data = getProductionData(buildingType);
  return data && data.productionType === 'storage';
};

/**
 * Get total storage capacity from all storage buildings
 * Aggregates storage from all storage buildings on the map
 *
 * @param {Array} storageBuildings - Array of storage building objects from Foundation
 * @returns {number} Total storage capacity in units
 */
export const calculateTotalStorageCapacity = (storageBuildings) => {
  return storageBuildings.reduce((total, building) => {
    const data = getProductionData(building.type);
    return total + (data?.storageCapacity || 0);
  }, 0);
};

/**
 * Get resource production rates from production buildings
 * This aggregates production from all buildings of a specific type
 *
 * @param {Array} buildings - Array of building objects from Foundation
 * @returns {Object} { resourceType: totalRatePerSecond }
 */
export const calculateTotalProduction = (buildings) => {
  const totalProduction = {};

  buildings.forEach((building) => {
    // Skip null/undefined buildings
    if (!building || !building.type) {
      return;
    }

    const data = getProductionData(building.type);
    if (data && data.produces) {
      Object.entries(data.produces).forEach(([resource, rate]) => {
        totalProduction[resource] = (totalProduction[resource] || 0) + rate;
      });
    }
  });

  return totalProduction;
};

/**
 * Export for future expansion
 * When Module 4 (Territory & Town Planning) is added,
 * it will layer territory bonuses on top of these base rates
 */
export const FUTURE_TERRITORY_BONUSES = {
  // Example: { terrain: 'forest', buildingType: 'farm', bonusMultiplier: 1.25 }
  // This would multiply production by 1.25 in forest biomes
  // Implemented in Module 4
};
