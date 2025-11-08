/**
 * Module 2: Building Types & Progression System
 *
 * Module Integration Hooks
 * Defines integration points with Module 3 (Resource Economy) and Module 4 (Territory & Town Planning)
 *
 * This module is READ-ONLY in terms of other module's data.
 * It provides queries and hooks that other modules call to:
 * - Check if buildings are compatible with placement rules
 * - Validate tier-based constraints
 * - Query building progression requirements
 */

import { getBuildingById, BUILDING_CATALOG } from '../constants/buildings.js';
import { checkTierUnlockConditions } from './tierAdvancementRules.js';

/**
 * ============================================================
 * MODULE 3 INTEGRATION: Resource Economy
 * ============================================================
 *
 * Module 3 (Resource Economy) owns:
 * - Resource costs for buildings
 * - Resource types and availability
 * - Production chains and economics
 *
 * Module 2 queries Module 3 for:
 * - Building costs (for tier unlock validation)
 *
 * Module 3 queries Module 2 for:
 * - Building tier information
 * - Progression requirements
 */

/**
 * Validate that a building cost makes sense given the tier
 * Used when Module 3 defines costs - Module 2 validates tier alignment
 *
 * @param {string} buildingId - Building to validate
 * @param {Object} buildingCosts - Cost object from Module 3 { GOLD, WOOD, STONE, ESSENCE, CRYSTAL }
 * @param {Function} getResourceValue - Function to get standard value of resource (Module 3 provides)
 * @returns {Object} Validation result:
 *   - isValid: boolean
 *   - tier: string
 *   - expectedCostRange: { min, max }  // Estimated cost for this tier
 *   - actualCost: number
 *   - feedback: string
 */
export function validateBuildingCostForTier(buildingId, buildingCosts, getResourceValue) {
  const building = getBuildingById(buildingId);
  if (!building) {
    return {
      isValid: false,
      feedback: `Building ${buildingId} not found`,
    };
  }

  // Rough tier-based cost expectations
  const tierCostRanges = {
    SURVIVAL: { min: 0, max: 200 },
    PERMANENT: { min: 200, max: 800 },
    TOWN: { min: 800, max: 3000 },
    CASTLE: { min: 3000, max: 10000 },
  };

  const range = tierCostRanges[building.tier];

  // Calculate total cost by converting all resources to a standard value
  let totalCost = 0;
  for (const [resourceType, amount] of Object.entries(buildingCosts)) {
    totalCost += amount * (getResourceValue(resourceType) || 1);
  }

  const withinRange = totalCost >= range.min && totalCost <= range.max;

  return {
    isValid: withinRange,
    tier: building.tier,
    expectedCostRange: range,
    actualCost: totalCost,
    feedback: withinRange
      ? `Cost aligns with ${building.tier} tier expectations`
      : `Cost ${totalCost} outside expected range [${range.min}-${range.max}] for ${building.tier} tier`,
  };
}

/**
 * Get buildings available for a given resource level/budget
 * Used by Module 3 when querying what player can build
 *
 * @param {Array} unlockedTiers - Tiers that are unlocked
 * @param {number} availableBudget - Total budget player has (in standardized resource units)
 * @param {Object} costData - Map of buildingId -> cost from Module 3
 * @returns {Array} Array of buildable building IDs
 */
export function getAffordableBuildings(unlockedTiers, availableBudget, costData) {
  const affordable = [];

  for (const buildingId of Object.keys(BUILDING_CATALOG)) {
    const building = getBuildingById(buildingId);

    // Check if tier is unlocked
    if (!unlockedTiers.includes(building.tier)) {
      continue;
    }

    // Check if affordable
    const cost = costData[buildingId];
    if (cost && cost <= availableBudget) {
      affordable.push(buildingId);
    }
  }

  return affordable;
}

/**
 * Interface for Module 3 to check progression cost requirements
 * Returns what resources Module 3 should validate for tier progression
 *
 * @param {string} tier - The tier being progressed to
 * @returns {Object} Required resource spending:
 *   - requiredTotalSpent: number (in standardized units)
 *   - description: string
 */
export function getTierProgressionResourceRequirement(tier) {
  const tierResourceRequirements = {
    SURVIVAL: { requiredTotalSpent: 100, description: 'Minimal initial investment' },
    PERMANENT: { requiredTotalSpent: 500, description: 'Moderate settlement investment' },
    TOWN: { requiredTotalSpent: 2000, description: 'Substantial town development' },
    CASTLE: { requiredTotalSpent: 5000, description: 'Massive kingdom development' },
  };

  return tierResourceRequirements[tier] || { requiredTotalSpent: 0, description: 'Unknown tier' };
}

/**
 * ============================================================
 * MODULE 4 INTEGRATION: Territory & Town Planning
 * ============================================================
 *
 * Module 4 (Territory & Town Planning) owns:
 * - Territory system and territory expansion
 * - NPC placement and population
 * - Building placement within territory
 * - Town zoning and planning
 *
 * Module 2 queries Module 4 for:
 * - Current buildings placed (for progression checking)
 * - Territory information (for placement validation)
 *
 * Module 4 queries Module 2 for:
 * - Building placement rules
 * - Building interconnection constraints
 * - Tier-based building availability
 */

/**
 * Validate building placement against tier availability
 * Used by Module 4 before allowing placement
 *
 * @param {string} buildingId - Building to place
 * @param {Array} unlockedTiers - Tiers available to player
 * @returns {Object} Validation:
 *   - canPlace: boolean
 *   - buildingTier: string
 *   - reason: string (if cannot place)
 */
export function validateBuildingPlacementByTier(buildingId, unlockedTiers) {
  const building = getBuildingById(buildingId);

  if (!building) {
    return {
      canPlace: false,
      buildingTier: null,
      reason: `Building ${buildingId} does not exist`,
    };
  }

  const tierUnlocked = unlockedTiers.includes(building.tier);

  return {
    canPlace: tierUnlocked,
    buildingTier: building.tier,
    reason: tierUnlocked ? '' : `${building.tier} tier is not yet unlocked`,
  };
}

/**
 * Get structural requirements for a building
 * Used by Module 4 for placement validation
 *
 * @param {string} buildingId - Building ID
 * @returns {Object} Structural properties:
 *   - width, height, depth: dimensions
 *   - rotatable: whether building can rotate
 *   - blocksPlayer, blocksNpc: movement blocking
 *   - terrainRequirements: placement terrain rules
 */
export function getBuildingStructuralProperties(buildingId) {
  const building = getBuildingById(buildingId);
  if (!building) return null;

  return {
    width: building.width,
    height: building.height,
    depth: building.depth,
    rotatable: building.rotatable,
    canRotateOnPlace: building.canRotateOnPlace,
    blocksPlayerMovement: building.blocksPlayerMovement,
    blocksNpcMovement: building.blocksNpcMovement,
    terrainRequirements: building.terrainRequirements,
  };
}

/**
 * Get all buildings that can provide bonuses in a territory
 * Used by Module 4 for town planning optimization
 *
 * @param {Array} unlockedTiers - Available tiers
 * @returns {Array} Array of { building, category, bonusWhen }
 */
export function getOptimizableBuildingsForTerritory(unlockedTiers) {
  return Object.values(BUILDING_CATALOG)
    .filter(b => unlockedTiers.includes(b.tier) && b.interconnectionRules.bonusWhen.length > 0)
    .map(b => ({
      building: b.id,
      category: b.category,
      bonusWhen: b.interconnectionRules.bonusWhen,
      worksBestInGroups: b.interconnectionRules.worksBestInGroups,
    }));
}

/**
 * ============================================================
 * TIER PROGRESSION VALIDATION (Multi-Module)
 * ============================================================
 *
 * When player attempts to unlock a tier, this integrates data
 * from Foundation (buildings placed), Module 3 (resources spent),
 * and Module 2 (progression rules)
 */

/**
 * Complete tier unlock validation across all modules
 * Call this when checking if a tier can be unlocked
 *
 * @param {string} tier - Tier to unlock
 * @param {Object} integrationData - Data from other modules:
 *   - foundationStore: Foundation module with getPlacedBuildings()
 *   - resourceEconomyData: { totalResourcesSpent: number, currentTime: number }
 *   - currentTime: Current timestamp
 *   - gameStartTime: When game started (timestamp)
 * @returns {Object} Complete validation result from checkTierUnlockConditions
 */
export function validateTierUnlockCrossPlatform(tier, integrationData) {
  // Gather data from all modules
  const progressData = {
    placedBuildings: integrationData.foundationStore
      ? integrationData.foundationStore.getPlacedBuildings?.() || []
      : [],
    totalResourcesSpent: integrationData.resourceEconomyData?.totalResourcesSpent || 0,
    currentTime: integrationData.currentTime || Date.now(),
    gameStartTime: integrationData.gameStartTime || 0,
  };

  // Run Module 2's validation
  return checkTierUnlockConditions(tier, progressData);
}

/**
 * ============================================================
 * QUERY HELPERS
 * ============================================================
 */

/**
 * Get all buildings in a category that are available
 * Used for UI and building selection
 *
 * @param {string} category - Category ID
 * @param {Array} unlockedTiers - Available tiers
 * @returns {Array} Array of building IDs
 */
export function getBuildingsInCategoryForTiers(category, unlockedTiers) {
  return Object.values(BUILDING_CATALOG)
    .filter(b => b.category === category && unlockedTiers.includes(b.tier))
    .map(b => b.id);
}

/**
 * Get detailed building information for UI display
 * Combines building data with availability info
 *
 * @param {string} buildingId - Building ID
 * @param {Array} unlockedTiers - Available tiers
 * @returns {Object} Full building info with availability flag
 */
export function getBuildingUIInfo(buildingId, unlockedTiers) {
  const building = getBuildingById(buildingId);
  if (!building) return null;

  return {
    ...building,
    isAvailable: unlockedTiers.includes(building.tier),
    requirements: {
      structuralProperties: getBuildingStructuralProperties(buildingId),
      interconnections: building.interconnectionRules,
    },
  };
}
