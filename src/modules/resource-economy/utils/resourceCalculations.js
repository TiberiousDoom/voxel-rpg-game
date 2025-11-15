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

// ============================================================================
// TIER PROGRESSION REQUIREMENTS (Moved from Module 2)
// ============================================================================
// These define the conditions required for players to progress through building tiers.
// This is part of Module 3 because tier progression is fundamentally about resource/economy
// milestones, even though tiers themselves are defined in Module 2.
//
// By centralizing progression requirements in Module 3, we ensure that:
// 1. Resource requirements are co-located with resource calculations
// 2. Module 2 focuses on building definitions, not progression rules
// 3. Module 3 orchestrates all economy-related progression mechanics

/**
 * Tier advancement conditions
 * Defines what a player must achieve to unlock the next tier
 *
 * Each tier has:
 * - buildingsRequired: Must have built certain buildings
 * - buildingsPlaced: Minimum number of each building type
 * - totalResourcesSpent: Total resources that must be invested
 * - timeRequired: Real time that must pass
 * - customCondition: Optional validation function
 */
export const TIER_PROGRESSION_REQUIREMENTS = {
  SURVIVAL: {
    description: 'Starting tier - available from the beginning',
    achievedAt: 0,
    nextTier: 'PERMANENT',
    conditions: {
      buildingsRequired: [
        { building: 'WALL', minCount: 3 },
        { building: 'DOOR', minCount: 1 },
      ],
      buildingsPlaced: {
        WALL: 3,
        DOOR: 1,
      },
      totalResourcesSpent: 80,  // Reduced from 100 (WF8: faster early game)
      timeRequired: 240000,  // 4 minutes (reduced from 5 minutes, WF8 balance)
      customCondition: null,
    },
  },

  PERMANENT: {
    description: 'Established settlements with permanent structures',
    achievedAt: null,  // Unlocked on condition met
    nextTier: 'TOWN',
    conditions: {
      buildingsRequired: [
        { building: 'TOWER', minCount: 1 },
        { building: 'WALL', minCount: 5 },
        { building: 'CHEST', minCount: 2 },
      ],
      buildingsPlaced: {
        TOWER: 1,
        WALL: 5,
        CHEST: 2,
      },
      totalResourcesSpent: 450,  // Reduced from 500 (WF8: smoother progression)
      timeRequired: 1200000,  // 20 minutes (reduced from 30 minutes, WF8 balance)
      customCondition: null,
    },
  },

  TOWN: {
    description: 'Growing towns with economic and production buildings',
    achievedAt: null,
    nextTier: 'CASTLE',
    conditions: {
      buildingsRequired: [
        { building: 'CRAFTING_STATION', minCount: 1 },
        { building: 'STORAGE_BUILDING', minCount: 1 },
        { building: 'MARKETPLACE', minCount: 1 },
        { building: 'TOWER', minCount: 2 },
        { building: 'WALL', minCount: 10 },
      ],
      buildingsPlaced: {
        CRAFTING_STATION: 1,
        STORAGE_BUILDING: 1,
        MARKETPLACE: 1,
        TOWER: 2,
        WALL: 10,
      },
      totalResourcesSpent: 1800,  // Reduced from 2000 (WF8: less grind)
      timeRequired: 3600000,  // 60 minutes (reduced from 90 minutes, WF8 balance)
      customCondition: null,
    },
  },

  CASTLE: {
    description: 'Powerful kingdoms with grand structures',
    achievedAt: null,
    nextTier: null,  // Final tier
    conditions: {
      buildingsRequired: [
        { building: 'FORTRESS', minCount: 1 },
        { building: 'BARRACKS', minCount: 1 },
        { building: 'MARKETPLACE', minCount: 2 },
        { building: 'WATCHTOWER', minCount: 2 },
      ],
      buildingsPlaced: {
        FORTRESS: 1,
        BARRACKS: 1,
        MARKETPLACE: 2,
        WATCHTOWER: 2,
      },
      totalResourcesSpent: 4500,  // Reduced from 5000 (WF8: slightly easier)
      timeRequired: 7200000,  // 120 minutes (reduced from 180 minutes, WF8 balance)
      customCondition: null,
    },
  },
};

/**
 * Check if a specific building requirement is met
 *
 * @param {Object} requirement - Building requirement { building, minCount }
 * @param {Array} placedBuildings - Array of placed building data from Foundation
 * @returns {boolean} True if requirement is met
 */
export function isBuildingRequirementMet(requirement, placedBuildings) {
  const count = placedBuildings.filter(b => b.type === requirement.building).length;
  return count >= requirement.minCount;
}

/**
 * Check if all building requirements are met for a tier
 *
 * @param {string} tier - The tier to check
 * @param {Array} placedBuildings - Array of placed building data from Foundation
 * @returns {boolean} True if all building requirements are met
 */
export function areBuildingRequirementsMet(tier, placedBuildings) {
  const conditions = TIER_PROGRESSION_REQUIREMENTS[tier];
  if (!conditions) return false;

  return conditions.conditions.buildingsRequired.every(requirement =>
    isBuildingRequirementMet(requirement, placedBuildings)
  );
}

/**
 * Check if total resources spent requirement is met
 *
 * This needs to be calculated by Resource Economy module
 * Module 2 provides the threshold, Module 3 provides the actual value
 *
 * @param {string} tier - The tier to check
 * @param {number} totalSpent - Total resources spent (from Module 3)
 * @returns {boolean} True if requirement is met
 */
export function isResourceSpentRequirementMet(tier, totalSpent) {
  const conditions = TIER_PROGRESSION_REQUIREMENTS[tier];
  if (!conditions) return false;
  return totalSpent >= conditions.conditions.totalResourcesSpent;
}

/**
 * Check if time requirement is met
 *
 * @param {string} tier - The tier to check
 * @param {number} elapsedTime - Elapsed time in milliseconds
 * @returns {boolean} True if requirement is met
 */
export function isTimeRequirementMet(tier, elapsedTime) {
  const conditions = TIER_PROGRESSION_REQUIREMENTS[tier];
  if (!conditions) return false;
  return elapsedTime >= conditions.conditions.timeRequired;
}

/**
 * Check ALL conditions for unlocking a tier
 *
 * @param {string} tier - The tier to check
 * @param {Object} progressData - Object containing:
 *   - placedBuildings: Array from Foundation
 *   - totalResourcesSpent: Number from Module 3
 *   - gameStartTime: Timestamp
 * @returns {Object} Result object with:
 *   - canUnlock: boolean
 *   - progress: {
 *       buildings: { met: number, required: number, percentage: number },
 *       resources: { current: number, required: number, percentage: number },
 *       time: { current: number, required: number, percentage: number }
 *     }
 *   - details: Array of unfulfilled requirements
 */
export function checkTierUnlockConditions(tier, progressData) {
  const conditions = TIER_PROGRESSION_REQUIREMENTS[tier];

  if (!conditions) {
    return {
      canUnlock: false,
      progress: {},
      details: ['Tier does not exist'],
    };
  }

  // Check building requirements
  const buildingsRequired = conditions.conditions.buildingsRequired;
  const buildingsMet = buildingsRequired.filter(req =>
    isBuildingRequirementMet(req, progressData.placedBuildings)
  ).length;
  const buildingsProgress = {
    met: buildingsMet,
    required: buildingsRequired.length,
    percentage: Math.round((buildingsMet / buildingsRequired.length) * 100),
  };

  // Check resource spending requirement
  const totalSpent = progressData.totalResourcesSpent || 0;
  const resourceRequired = conditions.conditions.totalResourcesSpent;
  const resourceProgress = {
    current: totalSpent,
    required: resourceRequired,
    percentage: Math.round((totalSpent / resourceRequired) * 100),
  };

  // Check time requirement
  const elapsedTime = (progressData.currentTime || Date.now()) - (progressData.gameStartTime || 0);
  const timeRequired = conditions.conditions.timeRequired;
  const timeProgress = {
    current: elapsedTime,
    required: timeRequired,
    percentage: Math.round((elapsedTime / timeRequired) * 100),
  };

  // Determine if all conditions are met
  const buildingsMet_ = buildingsProgress.met === buildingsProgress.required;
  const resourcesMet = resourceProgress.percentage >= 100;
  const timeMet = timeProgress.percentage >= 100;
  const canUnlock = buildingsMet_ && resourcesMet && timeMet;

  // Compile details of unfulfilled requirements
  const details = [];
  if (!buildingsMet_) {
    const unfulfilled = buildingsRequired
      .filter(req => !isBuildingRequirementMet(req, progressData.placedBuildings))
      .map(req => `${req.minCount}x ${req.building}`);
    details.push(`Buildings: ${unfulfilled.join(', ')}`);
  }
  if (!resourcesMet) {
    const remaining = resourceRequired - totalSpent;
    details.push(`Resources: ${remaining} more resources needed`);
  }
  if (!timeMet) {
    const remaining = timeRequired - elapsedTime;
    details.push(`Time: ${Math.ceil(remaining / 60000)} more minutes needed`);
  }

  return {
    canUnlock,
    progress: {
      buildings: buildingsProgress,
      resources: resourceProgress,
      time: timeProgress,
    },
    details,
  };
}

/**
 * Get advancement conditions for a specific tier
 *
 * @param {string} tier - Tier ID
 * @returns {Object|null} Advancement conditions or null
 */
export function getTierProgressionRequirements(tier) {
  return TIER_PROGRESSION_REQUIREMENTS[tier] || null;
}

/**
 * Get description of what's required for a tier
 * Useful for UI display
 *
 * @param {string} tier - Tier ID
 * @returns {Object} Description object
 */
export function getTierRequirementsDescription(tier) {
  const conditions = TIER_PROGRESSION_REQUIREMENTS[tier];
  if (!conditions) return null;

  const reqs = conditions.conditions;
  const buildingReqs = reqs.buildingsRequired
    .map(b => `${b.minCount}x ${b.building}`)
    .join(', ');

  return {
    tier,
    description: conditions.description,
    buildingRequirements: buildingReqs,
    resourceSpent: reqs.totalResourcesSpent,
    timeRequired: reqs.timeRequired,
    timeRequiredMinutes: Math.round(reqs.timeRequired / 60000),
  };
}
