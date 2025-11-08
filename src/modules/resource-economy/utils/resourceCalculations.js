/**
 * Resource Calculations - Module 3: Resource Economy
 *
 * Utility functions for economic calculations.
 * These are pure functions used by the Resource Economy module to:
 * - Validate if player has enough resources
 * - Calculate costs for buildings and crafting
 * - Aggregate resource information
 * - Check storage constraints
 */

import { getBuildingCosts, calculateTotalCosts } from '../../foundation/utils/buildingRegistry';
import { CRAFTING_RECIPES, canCraft, consumeMaterials } from '../../../data/craftingRecipes';
import { calculateTotalStorageCapacity, getProductionData } from '../config/productionBuildings';
import { RESOURCE_TYPES } from '../../../shared/config';

/**
 * Check if player has enough resources to build a building
 *
 * @param {string} buildingType - Type of building to build
 * @param {Object} inventory - Current inventory { gold, wood, stone, essence, crystal, materials }
 * @returns {Object} { canBuild: boolean, missingResources: { resource: amountNeeded } }
 */
export const canBuildBuilding = (buildingType, inventory) => {
  const costs = getBuildingCosts(buildingType);
  const missingResources = {};
  let canBuild = true;

  // Check each required resource
  Object.entries(costs).forEach(([resource, needed]) => {
    const available = inventory[resource] || 0;
    if (available < needed) {
      missingResources[resource] = needed - available;
      canBuild = false;
    }
  });

  return {
    canBuild,
    missingResources,
    costs,
  };
};

/**
 * Check if player has enough resources to craft an item
 * Uses the crafting recipes system
 *
 * @param {string} recipeId - ID of the recipe to craft
 * @param {Object} inventory - Current inventory
 * @returns {Object} { canCraft: boolean, missingMaterials: { material: amountNeeded } }
 */
export const canCraftItem = (recipeId, inventory) => {
  const recipe = CRAFTING_RECIPES[recipeId];
  if (!recipe) {
    return { canCraft: false, missingMaterials: {}, error: 'Recipe not found' };
  }

  const missingMaterials = {};
  let canMake = canCraft(recipe, inventory);

  // Calculate what's missing
  if (!canMake && recipe.requirements) {
    Object.entries(recipe.requirements).forEach(([material, needed]) => {
      const available = inventory.materials?.[material] || 0;
      if (available < needed) {
        missingMaterials[material] = needed - available;
      }
    });
  }

  return {
    canCraft: canMake,
    missingMaterials,
    recipe,
  };
};

/**
 * Consume resources from inventory for building
 * This should only be called after canBuildBuilding returns true
 *
 * @param {string} buildingType - Type of building to build
 * @param {Object} inventory - Current inventory
 * @returns {Object} New inventory with resources consumed
 */
export const consumeBuildingCosts = (buildingType, inventory) => {
  const costs = getBuildingCosts(buildingType);
  const newInventory = { ...inventory };

  Object.entries(costs).forEach(([resource, amount]) => {
    newInventory[resource] = (newInventory[resource] || 0) - amount;
  });

  return newInventory;
};

/**
 * Consume materials from inventory for crafting
 * This should only be called after canCraftItem returns true
 *
 * @param {string} recipeId - ID of the recipe to craft
 * @param {Object} inventory - Current inventory
 * @returns {Object} New inventory with materials consumed
 */
export const consumeCraftingMaterials = (recipeId, inventory) => {
  const recipe = CRAFTING_RECIPES[recipeId];
  if (!recipe) return inventory;

  const newMaterials = consumeMaterials(recipe, inventory);
  return {
    ...inventory,
    materials: newMaterials,
  };
};

/**
 * Calculate total build cost for multiple buildings
 * Useful for planning or batch operations
 *
 * @param {Array} buildings - Array of { type, count? } objects
 * @returns {Object} Aggregated { resource: totalAmount } map
 */
export const calculateBuildingCosts = (buildings) => {
  return calculateTotalCosts(buildings);
};

/**
 * Check if player has enough storage capacity
 *
 * @param {number} currentStorage - Current amount stored
 * @param {number} maxCapacity - Maximum storage capacity
 * @param {Object} resourceToAdd - Resources to add { resource: amount }
 * @returns {Object} { hasCapacity: boolean, overflowAmount: totalExcess }
 */
export const checkStorageCapacity = (currentStorage, maxCapacity, resourceToAdd) => {
  const totalResourcesAfter = currentStorage + Object.values(resourceToAdd).reduce((a, b) => a + b, 0);
  const hasCapacity = totalResourcesAfter <= maxCapacity;
  const overflowAmount = Math.max(0, totalResourcesAfter - maxCapacity);

  return {
    hasCapacity,
    overflowAmount,
    totalResourcesAfter,
    availableSpace: maxCapacity - currentStorage,
  };
};

/**
 * Calculate resource efficiency ratio
 * Shows how much resource value vs time investment
 *
 * @param {string} buildingType - Type of building
 * @returns {Object} { costPerSecond, priorityValue: 1-10 }
 */
export const calculateBuildingEfficiency = (buildingType) => {
  const costs = getBuildingCosts(buildingType);
  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

  // Normalized cost per second
  // Rough estimate: average resource value is 1 unit per second production
  const costPerSecond = totalCost / 30; // Average build time ~30 seconds

  return {
    totalResourceCost: totalCost,
    costPerSecond,
    buildingType,
  };
};

/**
 * Get all affordable buildings given current resources
 * Useful for showing which buildings player can build
 *
 * @param {Object} inventory - Current inventory
 * @param {Array} buildingTypes - Array of building types to check
 * @returns {Array} Array of buildable building types
 */
export const getAffordableBuildings = (inventory, buildingTypes) => {
  return buildingTypes.filter((type) => {
    const result = canBuildBuilding(type, inventory);
    return result.canBuild;
  });
};

/**
 * Estimate resource requirement to unlock a tier
 * Shows progression cost for players
 *
 * @param {string} tier - The tier to estimate for
 * @param {Array} buildingsInTier - Buildings that belong to this tier
 * @returns {Object} Estimated total cost to build all buildings in tier
 */
export const estimateTierCost = (tier, buildingsInTier) => {
  const tierCosts = buildingsInTier.map((type) => ({
    type,
    ...getBuildingCosts(type),
  }));

  const aggregated = {};
  tierCosts.forEach((item) => {
    Object.entries(item).forEach(([resource, amount]) => {
      if (resource !== 'type') {
        aggregated[resource] = (aggregated[resource] || 0) + amount;
      }
    });
  });

  return aggregated;
};

/**
 * Check if any resource is depleted (0 or negative)
 * Used to prevent player from going bankrupt
 *
 * @param {Object} inventory - Current inventory
 * @returns {Array} Array of resources that are depleted
 */
export const getDepletedResources = (inventory) => {
  const depleted = [];

  Object.entries(inventory).forEach(([resource, amount]) => {
    if (resource !== 'items' && amount <= 0) {
      depleted.push(resource);
    }
  });

  return depleted;
};

/**
 * Format resource amount for display
 * Converts large numbers to readable format (e.g., 1000 -> 1K)
 *
 * @param {number} amount - The amount to format
 * @returns {string} Formatted string like "1.2K", "50", "1M"
 */
export const formatResourceAmount = (amount) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toString();
};

/**
 * Calculate the "value" of player's inventory
 * Useful for net worth display or comparison
 *
 * @param {Object} inventory - Current inventory
 * @param {Object} resourceValues - Optional custom values { resource: value }
 * @returns {number} Total inventory value in gold equivalent
 */
export const calculateInventoryValue = (inventory, resourceValues = {}) => {
  // Default values if not specified
  const values = {
    gold: 1,
    wood: 0.5,
    stone: 0.75,
    essence: 2,
    crystal: 5,
    ...resourceValues,
  };

  let total = 0;
  Object.entries(inventory).forEach(([resource, amount]) => {
    if (values[resource] && resource !== 'items' && resource !== 'materials') {
      total += (amount || 0) * values[resource];
    }
  });

  // Add material value
  if (inventory.materials) {
    Object.entries(inventory.materials).forEach(([material, amount]) => {
      total += (amount || 0) * (values[material] || 0.5);
    });
  }

  return total;
};

/**
 * Refund resources when player cancels construction
 * Returns the resources they spent back to inventory
 *
 * @param {string} buildingType - Type of building being refunded
 * @param {Object} inventory - Current inventory
 * @returns {Object} Updated inventory with refunded resources
 */
export const refundBuildingCosts = (buildingType, inventory) => {
  const costs = getBuildingCosts(buildingType);
  const newInventory = { ...inventory };

  Object.entries(costs).forEach(([resource, amount]) => {
    newInventory[resource] = (newInventory[resource] || 0) + amount;
  });

  return newInventory;
};
