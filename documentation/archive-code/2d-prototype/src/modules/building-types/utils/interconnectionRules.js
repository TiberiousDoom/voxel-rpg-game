/**
 * Module 2: Building Types & Progression System
 *
 * Building Interconnection Rules
 * Defines logical constraints and relationships between buildings
 *
 * This system allows buildings to specify:
 * - Dependencies on other buildings
 * - Bonuses when placed near other buildings
 * - Efficiency multipliers based on interconnections
 * - Validation of proper building placement in relation to others
 */

import { BUILDING_CATALOG, getBuildingById } from '../constants/buildings.js';

/**
 * Check if a building requires other buildings nearby
 *
 * @param {string} buildingId - The building to check
 * @returns {Array} Array of required nearby buildings
 */
export function getRequiredNearbyBuildings(buildingId) {
  const building = getBuildingById(buildingId);
  if (!building?.interconnectionRules?.requiresNear) {
    return [];
  }
  return building.interconnectionRules.requiresNear;
}

/**
 * Check if a building cannot be placed near certain buildings
 *
 * @param {string} buildingId - The building to check
 * @returns {Array} Array of buildings to avoid
 */
export function getForbiddenNearbyBuildings(buildingId) {
  const building = getBuildingById(buildingId);
  if (!building?.interconnectionRules?.cannotBeNear) {
    return [];
  }
  return building.interconnectionRules.cannotBeNear;
}

/**
 * Get bonuses that apply to a building based on nearby buildings
 *
 * @param {string} buildingId - The building to check
 * @returns {Array} Array of bonus conditions
 */
export function getPotentialBonuses(buildingId) {
  const building = getBuildingById(buildingId);
  if (!building?.interconnectionRules?.bonusWhen) {
    return [];
  }
  return building.interconnectionRules.bonusWhen;
}

/**
 * Check if a building performs better in groups
 *
 * @param {string} buildingId - The building to check
 * @returns {boolean} True if building benefits from being near similar buildings
 */
export function worksBestInGroups(buildingId) {
  const building = getBuildingById(buildingId);
  return building?.interconnectionRules?.worksBestInGroups || false;
}

/**
 * Validate that a building placement meets interconnection requirements
 *
 * @param {string} buildingId - The building being placed
 * @param {Object} placementPosition - { x, y, z } coordinates
 * @param {Array} nearbyBuildings - Array of nearby building data from Foundation
 * @returns {Object} Validation result:
 *   - isValid: boolean
 *   - missingRequirements: Array of unmet requirement strings
 *   - forbiddenConflicts: Array of forbidden building proximity conflicts
 *   - warnings: Array of advisory messages (bonuses not achieved, etc)
 */
export function validatePlacementInterconnections(
  buildingId,
  placementPosition,
  nearbyBuildings
) {
  const building = getBuildingById(buildingId);
  if (!building) {
    return {
      isValid: false,
      missingRequirements: ['Building type does not exist'],
      forbiddenConflicts: [],
      warnings: [],
    };
  }

  const missingRequirements = [];
  const forbiddenConflicts = [];
  const warnings = [];

  // Check required nearby buildings
  const requiredBuildings = building.interconnectionRules.requiresNear;
  for (const requirement of requiredBuildings) {
    const nearbyOfType = nearbyBuildings.filter(
      b => b.type === requirement.building
    );

    if (nearbyOfType.length === 0) {
      missingRequirements.push(
        `Requires ${requirement.building} nearby (within ${requirement.maxDistance} cells)`
      );
    } else {
      // Check distance
      const withinDistance = nearbyOfType.some(b =>
        isWithinDistance(placementPosition, b.position, requirement.maxDistance)
      );
      if (!withinDistance) {
        missingRequirements.push(
          `Requires ${requirement.building} within ${requirement.maxDistance} cells (nearest is farther away)`
        );
      }
    }
  }

  // Check forbidden nearby buildings
  const forbiddenBuildings = building.interconnectionRules.cannotBeNear;
  for (const forbidden of forbiddenBuildings) {
    const nearbyOfType = nearbyBuildings.filter(b => b.type === forbidden.building);

    if (nearbyOfType.length > 0) {
      const tooClose = nearbyOfType.some(b =>
        isWithinDistance(placementPosition, b.position, forbidden.maxDistance)
      );

      if (tooClose) {
        forbiddenConflicts.push(
          `Cannot be placed within ${forbidden.maxDistance} cells of ${forbidden.building}`
        );
      }
    }
  }

  // Check bonus opportunities
  const potentialBonuses = building.interconnectionRules.bonusWhen;
  for (const bonus of potentialBonuses) {
    const nearbyOfType = nearbyBuildings.filter(b => b.type === bonus.building);
    if (nearbyOfType.length === 0) {
      warnings.push(
        `No ${bonus.building} nearby - missing ${bonus.effect} bonus (${Math.round((bonus.bonus - 1) * 100)}% increase)`
      );
    }
  }

  // Check group bonuses
  if (building.interconnectionRules.worksBestInGroups) {
    const similarNearby = nearbyBuildings.filter(b => b.type === buildingId);
    if (similarNearby.length < 2) {
      warnings.push(
        `This building performs better in groups (currently ${similarNearby.length + 1} total with this placement)`
      );
    }
  }

  const isValid = missingRequirements.length === 0 && forbiddenConflicts.length === 0;

  return {
    isValid,
    missingRequirements,
    forbiddenConflicts,
    warnings,
  };
}

/**
 * Calculate efficiency bonus for a building based on nearby buildings
 *
 * @param {string} buildingId - The building to calculate bonuses for
 * @param {Array} nearbyBuildings - Array of nearby building data
 * @returns {number} Total efficiency multiplier (1.0 = no bonus, 1.5 = 50% bonus)
 */
export function calculateEfficiencyBonus(buildingId, nearbyBuildings) {
  const building = getBuildingById(buildingId);
  if (!building) return 1.0;

  let multiplier = 1.0;

  // Check bonus conditions
  for (const bonus of building.interconnectionRules.bonusWhen) {
    const nearbyOfType = nearbyBuildings.filter(b => b.type === bonus.building);
    if (nearbyOfType.length > 0) {
      multiplier *= bonus.bonus;
    }
  }

  // Check group bonus
  if (building.interconnectionRules.worksBestInGroups) {
    const similarNearby = nearbyBuildings.filter(b => b.type === buildingId).length;
    // Bonus increases with more of the same building nearby
    const groupBonus = 1.0 + similarNearby * 0.1;  // 10% per nearby building
    multiplier *= Math.min(groupBonus, 1.5);  // Cap at 50% bonus
  }

  return multiplier;
}

/**
 * Get all buildings that would benefit from having the given building nearby
 *
 * @param {string} buildingId - The building to check
 * @returns {Array} Array of building IDs that benefit from this building
 */
export function getBuildingsThatBenefitFromNearby(buildingId) {
  const beneficiaries = [];

  for (const building of Object.values(BUILDING_CATALOG)) {
    const bonuses = building.interconnectionRules.bonusWhen;
    if (bonuses.some(b => b.building === buildingId)) {
      beneficiaries.push(building.id);
    }
  }

  return beneficiaries;
}

/**
 * Get building pairs that work well together
 * Returns buildings that provide bonuses to each other
 *
 * @returns {Array} Array of { building1, building2, bonus1, bonus2 }
 */
export function getBuildingPairings() {
  const pairings = [];

  for (const building1 of Object.values(BUILDING_CATALOG)) {
    for (const bonus of building1.interconnectionRules.bonusWhen) {
      const building2 = getBuildingById(bonus.building);
      if (building2) {
        // Check if it's mutual
        const mutual = building2.interconnectionRules.bonusWhen.some(
          b => b.building === building1.id
        );

        pairings.push({
          building1: building1.id,
          building2: building2.id,
          building1Bonus: bonus.bonus,
          building2Bonus: mutual ? bonus.bonus : 1.0,
          mutual,
          effect: bonus.effect,
        });
      }
    }
  }

  return pairings;
}

/**
 * Check if two buildings satisfy interconnection constraints
 *
 * @param {string} building1 - First building ID
 * @param {string} building2 - Second building ID
 * @returns {Object} Result:
 *   - canBePlacedTogether: boolean
 *   - reason: string explanation if they cannot be together
 *   - hasBonus: boolean
 *   - bonusAmount: number (multiplier)
 */
export function checkBuildingCompatibility(building1, building2) {
  const b1 = getBuildingById(building1);
  const b2 = getBuildingById(building2);

  if (!b1 || !b2) {
    return {
      canBePlacedTogether: false,
      reason: 'One or both buildings do not exist',
      hasBonus: false,
      bonusAmount: 1.0,
    };
  }

  // Check if building1 forbids building2
  const b1Forbids = b1.interconnectionRules.cannotBeNear.some(
    f => f.building === building2
  );
  if (b1Forbids) {
    return {
      canBePlacedTogether: false,
      reason: `${building1} cannot be placed near ${building2}`,
      hasBonus: false,
      bonusAmount: 1.0,
    };
  }

  // Check if building2 forbids building1
  const b2Forbids = b2.interconnectionRules.cannotBeNear.some(
    f => f.building === building1
  );
  if (b2Forbids) {
    return {
      canBePlacedTogether: false,
      reason: `${building2} cannot be placed near ${building1}`,
      hasBonus: false,
      bonusAmount: 1.0,
    };
  }

  // Check for bonuses
  const b1Bonus = b1.interconnectionRules.bonusWhen.find(
    b => b.building === building2
  );
  const b2Bonus = b2.interconnectionRules.bonusWhen.find(
    b => b.building === building1
  );

  const hasBonus = !!(b1Bonus || b2Bonus);
  const bonusAmount = Math.max(b1Bonus?.bonus || 1.0, b2Bonus?.bonus || 1.0);

  return {
    canBePlacedTogether: true,
    reason: '',
    hasBonus,
    bonusAmount,
  };
}

/**
 * Helper: Calculate distance between two positions
 * Using simple Manhattan distance on a grid
 *
 * @param {Object} pos1 - { x, y, z }
 * @param {Object} pos2 - { x, y, z }
 * @returns {number} Distance in grid cells
 */
function calculateDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) + Math.abs(pos1.z - pos2.z);
}

/**
 * Helper: Check if position is within distance
 *
 * @param {Object} pos1 - { x, y, z }
 * @param {Object} pos2 - { x, y, z }
 * @param {number} maxDistance - Maximum distance allowed
 * @returns {boolean}
 */
function isWithinDistance(pos1, pos2, maxDistance) {
  return calculateDistance(pos1, pos2) <= maxDistance;
}
