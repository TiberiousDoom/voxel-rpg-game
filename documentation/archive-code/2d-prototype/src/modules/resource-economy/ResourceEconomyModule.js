/**
 * Resource Economy Module - Module 3
 *
 * This is the main module file for Module 3: Resource Economy & Crafting.
 * It provides a clean, unified API for all resource economy functionality.
 *
 * Module 3 Responsibilities:
 * - Building costs and requirements
 * - Construction time and build queues
 * - Crafting recipes and material requirements
 * - Resource storage and capacity management
 * - Production building functionality (structure only, not implementation)
 * - Economic calculations and validations
 *
 * Module 3 Does NOT Own:
 * - Building placement (Foundation/Module 1)
 * - Building definitions (Module 2)
 * - Territory bonuses (Module 4)
 * - NPC behavior and AI (Gameplay systems)
 * - Battle and combat (Separate combat system)
 *
 * Usage in other modules:
 * ```javascript
 * import { ResourceEconomyModule } from './modules/resource-economy/ResourceEconomyModule';
 *
 * // Check if can build
 * const canBuild = ResourceEconomyModule.canBuild(buildingType, inventory);
 *
 * // Get building costs
 * const costs = ResourceEconomyModule.getBuildingCosts(buildingType);
 *
 * // Start construction
 * ResourceEconomyModule.startConstruction(building, inventory, foundationStore);
 *
 * // Update construction progress
 * ResourceEconomyModule.updateConstructionProgress();
 *
 * // Check crafting
 * const canCraft = ResourceEconomyModule.canCraft(recipeId, inventory);
 * ```
 */

import { useResourceEconomyStore } from './stores/useResourceEconomyStore';
import {
  canBuildBuilding,
  canCraftItem,
  consumeBuildingCosts,
  refundBuildingCosts,
  calculateBuildingCosts,
  getAffordableBuildings,
  calculateInventoryValue,
  formatResourceAmount,
  getDepletedResources,
  checkStorageCapacity,
} from './utils/resourceCalculations';
import { getBuildingCosts, getBuildTime, getUnlockedBuildingTypes } from '../foundation/utils/buildingRegistry';
import {
  getProductionData,
  calculateTotalStorageCapacity,
  calculateTotalProduction,
  isStorageBuilding,
} from './config/productionBuildings';
import { BUILDING_STATUS } from '../../shared/config';

/**
 * Main API object for Resource Economy Module
 * All module interactions go through this interface
 */
export const ResourceEconomyModule = {
  // ========================================================================
  // BUILDING COST AND AFFORDABILITY CHECKS
  // ========================================================================

  /**
   * Check if player can build a specific building type.
   * @param {string} buildingType
   * @param {Object} inventory
   * @returns {Object} { canBuild, missingResources, costs }
   */
  canBuild: (buildingType, inventory) => canBuildBuilding(buildingType, inventory),

  /**
   * Get the resource costs for a building.
   * @param {string} buildingType
   * @returns {Object} { resource: amount }
   */
  getBuildingCosts: (buildingType) => getBuildingCosts(buildingType),

  /**
   * Get build time for a building in seconds.
   * @param {string} buildingType
   * @returns {number} Seconds
   */
  getBuildTime: (buildingType) => getBuildTime(buildingType),

  /**
   * Get all buildings player can currently afford.
   * @param {Object} inventory
   * @param {Array} buildingTypes - Types to filter by
   * @returns {Array} Affordable building types
   */
  getAffordableBuildings: (inventory, buildingTypes) =>
    getAffordableBuildings(inventory, buildingTypes),

  /**
   * Get building types unlocked for a specific tier.
   * @param {string} maxTierUnlocked
   * @returns {Array} Building types
   */
  getUnlockedBuildingTypes: (maxTierUnlocked) => getUnlockedBuildingTypes(maxTierUnlocked),

  // ========================================================================
  // CONSTRUCTION MANAGEMENT
  // ========================================================================

  /**
   * Start construction of a building.
   * Validates resources and adds to construction queue.
   *
   * @param {Object} building - Building object from Foundation
   * @param {Object} inventory - Current inventory
   * @param {Object} foundationStore - useFoundationStore instance
   * @returns {Object} { success, error?, updatedInventory? }
   */
  startConstruction: (building, inventory, foundationStore) => {
    const economyStore = useResourceEconomyStore.getState();

    // Check if can build
    const canBuildResult = canBuildBuilding(building.type, inventory);
    if (!canBuildResult.canBuild) {
      return {
        success: false,
        error: 'Insufficient resources',
        missingResources: canBuildResult.missingResources,
      };
    }

    // Transition building to BUILDING status in Foundation
    if (foundationStore && foundationStore.updateBuilding) {
      foundationStore.updateBuilding(building.id, {
        status: BUILDING_STATUS.BUILDING,
      });
    }

    // Start construction in economy store
    const result = economyStore.startConstruction(building, inventory);

    // Consume resources from inventory
    const updatedInventory = consumeBuildingCosts(building.type, inventory);

    return {
      success: true,
      buildingId: building.id,
      updatedInventory,
      buildTime: getBuildTime(building.type),
    };
  },

  /**
   * Update all ongoing construction.
   * Returns list of buildings that completed.
   *
   * @param {Object} foundationStore - useFoundationStore instance
   * @returns {Array} Building IDs that just completed
   */
  updateConstructionProgress: (foundationStore) => {
    const economyStore = useResourceEconomyStore.getState();
    const completed = economyStore.updateConstructionProgress();

    // Transition completed buildings to COMPLETE status in Foundation
    if (foundationStore && foundationStore.updateBuilding) {
      completed.forEach((buildingId) => {
        foundationStore.updateBuilding(buildingId, {
          status: BUILDING_STATUS.COMPLETE,
          buildProgress: 100,
        });
      });
    }

    return completed;
  },

  /**
   * Cancel construction and refund resources.
   *
   * @param {string} buildingId
   * @param {Object} inventory
   * @param {Object} foundationStore
   * @returns {Object} { success, updatedInventory }
   */
  cancelConstruction: (buildingId, inventory, foundationStore) => {
    const economyStore = useResourceEconomyStore.getState();
    const updatedInventory = economyStore.cancelConstruction(buildingId, inventory);

    // Revert building to BLUEPRINT in Foundation
    if (foundationStore && foundationStore.updateBuilding) {
      foundationStore.updateBuilding(buildingId, {
        status: BUILDING_STATUS.BLUEPRINT,
        buildProgress: 0,
      });
    }

    return {
      success: true,
      buildingId,
      updatedInventory,
    };
  },

  /**
   * Get construction progress for a building.
   * @param {string} buildingId
   * @returns {Object|null} Progress data
   */
  getConstructionProgress: (buildingId) => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getConstructionProgress(buildingId);
  },

  /**
   * Get all buildings currently under construction.
   * @returns {Array} Queue entries
   */
  getAllConstructing: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getAllConstructing();
  },

  /**
   * Get total time remaining for all construction.
   * @returns {number} Milliseconds
   */
  getTotalConstructionTime: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getTotalConstructionTime();
  },

  /**
   * Get number of buildings under construction.
   * @returns {number}
   */
  getConstructionQueueSize: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getConstructionQueueSize();
  },

  // ========================================================================
  // CRAFTING MANAGEMENT
  // ========================================================================

  /**
   * Check if player can craft an item.
   * @param {string} recipeId
   * @param {Object} inventory
   * @returns {Object} { canCraft, missingMaterials, recipe }
   */
  canCraft: (recipeId, inventory) => canCraftItem(recipeId, inventory),

  // ========================================================================
  // STORAGE MANAGEMENT
  // ========================================================================

  /**
   * Calculate total storage capacity.
   * @param {Array} storageBuildings - Storage buildings from Foundation
   * @returns {number} Total capacity
   */
  getTotalStorageCapacity: (storageBuildings) =>
    calculateTotalStorageCapacity(storageBuildings),

  /**
   * Update storage state in economy.
   * @param {Array} storageBuildings
   * @param {Object} currentInventory
   */
  updateStorageState: (storageBuildings, currentInventory) => {
    const economyStore = useResourceEconomyStore.getState();
    economyStore.updateStorageState(storageBuildings, currentInventory);
  },

  /**
   * Get storage utilization percentage.
   * @returns {number} 0-100
   */
  getStorageUtilization: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getStorageUtilization();
  },

  /**
   * Get available storage space.
   * @returns {number}
   */
  getAvailableStorage: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getAvailableStorage();
  },

  /**
   * Check if storage is full.
   * @returns {boolean}
   */
  isStorageFull: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.storageState.isFull;
  },

  // ========================================================================
  // PRODUCTION BUILDINGS
  // ========================================================================

  /**
   * Get production data for a building.
   * @param {string} buildingType
   * @returns {Object|null}
   */
  getProductionData: (buildingType) => getProductionData(buildingType),

  /**
   * Check if building is a storage building.
   * @param {string} buildingType
   * @returns {boolean}
   */
  isStorageBuilding: (buildingType) => isStorageBuilding(buildingType),

  /**
   * Calculate total production from buildings.
   * @param {Array} buildings
   * @returns {Object} { resource: ratePerSecond }
   */
  calculateTotalProduction: (buildings) => calculateTotalProduction(buildings),

  // ========================================================================
  // UTILITY AND DISPLAY FUNCTIONS
  // ========================================================================

  /**
   * Calculate total cost for multiple buildings.
   * @param {Array} buildings - Array of { type, count }
   * @returns {Object} Aggregated costs
   */
  calculateBuildingCosts: (buildings) => calculateBuildingCosts(buildings),

  /**
   * Get inventory value in gold equivalent.
   * @param {Object} inventory
   * @param {Object} customValues - Optional custom resource values
   * @returns {number}
   */
  getInventoryValue: (inventory, customValues) =>
    calculateInventoryValue(inventory, customValues),

  /**
   * Format resource amount for display.
   * @param {number} amount
   * @returns {string} Formatted string
   */
  formatAmount: (amount) => formatResourceAmount(amount),

  /**
   * Get resources that are depleted.
   * @param {Object} inventory
   * @returns {Array}
   */
  getDepletedResources: (inventory) => getDepletedResources(inventory),

  /**
   * Check storage capacity constraints.
   * @param {number} currentStorage
   * @param {number} maxCapacity
   * @param {Object} resourceToAdd
   * @returns {Object}
   */
  checkStorageCapacity: (currentStorage, maxCapacity, resourceToAdd) =>
    checkStorageCapacity(currentStorage, maxCapacity, resourceToAdd),

  // ========================================================================
  // ECONOMIC HISTORY AND DEBUGGING
  // ========================================================================

  /**
   * Get economic history.
   * @returns {Object}
   */
  getEconomicHistory: () => {
    const economyStore = useResourceEconomyStore.getState();
    return economyStore.getEconomicHistory();
  },

  /**
   * Reset economy state.
   * Call on game reset.
   */
  resetEconomy: () => {
    const economyStore = useResourceEconomyStore.getState();
    economyStore.resetEconomy();
  },

  // ========================================================================
  // INTERNAL: Access to stores for advanced usage
  // ========================================================================

  /**
   * Get the economy store directly.
   * Use with caution - prefer public API methods above.
   * @returns {Object} useResourceEconomyStore state
   */
  _getStore: () => useResourceEconomyStore.getState(),

  /**
   * Subscribe to economy store changes.
   * @param {Function} selector
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  _subscribe: (selector, listener) => useResourceEconomyStore.subscribe(selector, listener),
};

export default ResourceEconomyModule;
