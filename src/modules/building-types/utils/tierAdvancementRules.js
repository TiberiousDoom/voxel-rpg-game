/**
 * Module 2: Building Types & Progression System
 *
 * Tier Advancement Rules
 * Defines conditions for unlocking each building tier
 *
 * This module works with Foundation and Resource Economy modules to check
 * if conditions for tier advancement are met.
 */

import { TIER_DEFINITIONS } from '../constants/buildings.js';

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
export const TIER_ADVANCEMENT_CONDITIONS = {
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
      totalResourcesSpent: 100,  // Arbitrary game design decision
      timeRequired: 300000,  // 5 minutes of gameplay
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
      totalResourcesSpent: 500,
      timeRequired: 1800000,  // 30 minutes
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
      totalResourcesSpent: 2000,
      timeRequired: 5400000,  // 90 minutes
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
      totalResourcesSpent: 5000,
      timeRequired: 10800000,  // 3 hours
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
  const conditions = TIER_ADVANCEMENT_CONDITIONS[tier];
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
  const conditions = TIER_ADVANCEMENT_CONDITIONS[tier];
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
  const conditions = TIER_ADVANCEMENT_CONDITIONS[tier];
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
  const conditions = TIER_ADVANCEMENT_CONDITIONS[tier];

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
 * Get the next tier that can be unlocked
 *
 * @param {string} currentMaxTier - Current maximum tier unlocked
 * @returns {string|null} Next tier ID or null if at max
 */
export function getNextTierToUnlock(currentMaxTier) {
  const currentOrder = TIER_DEFINITIONS[currentMaxTier]?.order;
  if (currentOrder === undefined) return null;

  const nextTier = Object.values(TIER_DEFINITIONS).find(
    t => t.order === currentOrder + 1
  );
  return nextTier?.id || null;
}

/**
 * Get advancement conditions for a specific tier
 *
 * @param {string} tier - Tier ID
 * @returns {Object|null} Advancement conditions or null
 */
export function getTierAdvancementConditions(tier) {
  return TIER_ADVANCEMENT_CONDITIONS[tier] || null;
}

/**
 * Get description of what's required for a tier
 * Useful for UI display
 *
 * @param {string} tier - Tier ID
 * @returns {Object} Description object
 */
export function getTierRequirementsDescription(tier) {
  const conditions = TIER_ADVANCEMENT_CONDITIONS[tier];
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
