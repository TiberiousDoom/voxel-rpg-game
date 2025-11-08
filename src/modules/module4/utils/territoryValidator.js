/**
 * Territory Validator
 *
 * Validates territory-related operations and rules.
 * Enforces boundaries and constraints defined in Module 4 specifications.
 */

import { TERRITORY_CONTROL_BUILDINGS } from './buildingClassifier';

/**
 * Territory expansion rules
 * As territory grows, more resources/buildings are required
 */
const EXPANSION_RULES = {
  // Base territory radius (starting size)
  BASE_RADIUS: 25,

  // Radius increments per watchtower
  WATCHTOWER_RADIUS_BONUS: 5,

  // Radius increment per guard post
  GUARD_POST_RADIUS_BONUS: 2,

  // Radius increment per fortress
  FORTRESS_RADIUS_BONUS: 15,

  // Radius increment per castle
  CASTLE_RADIUS_BONUS: 25,

  // Maximum possible territory radius
  MAX_TERRITORY_RADIUS: 100,

  // Minimum distance between territory centers
  MIN_TERRITORY_SEPARATION: 50,
};

/**
 * Calculate the maximum territory radius based on buildings
 * @param {Object[]} buildings - Array of buildings in territory
 * @returns {number} Maximum radius achievable
 */
export function calculateMaxTerritoryRadius(buildings) {
  let radius = EXPANSION_RULES.BASE_RADIUS;

  for (const building of buildings) {
    if (building.type === 'WATCHTOWER' && building.status === 'COMPLETE') {
      radius += EXPANSION_RULES.WATCHTOWER_RADIUS_BONUS;
    } else if (building.type === 'GUARD_POST' && building.status === 'COMPLETE') {
      radius += EXPANSION_RULES.GUARD_POST_RADIUS_BONUS;
    } else if (building.type === 'FORTRESS' && building.status === 'COMPLETE') {
      radius += EXPANSION_RULES.FORTRESS_RADIUS_BONUS;
    } else if (building.type === 'CASTLE' && building.status === 'COMPLETE') {
      radius += EXPANSION_RULES.CASTLE_RADIUS_BONUS;
    }
  }

  // Cap at maximum
  return Math.min(radius, EXPANSION_RULES.MAX_TERRITORY_RADIUS);
}

/**
 * Check if a position is within territory bounds
 * @param {Object} position - Position to check { x, y, z }
 * @param {Object} center - Territory center { x, y, z }
 * @param {number} radius - Territory radius
 * @returns {boolean} True if position is within territory
 */
export function isPositionInTerritory(position, center, radius) {
  // Use 2D distance (x, z plane) for territory calculation
  const dx = position.x - center.x;
  const dz = position.z - center.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance <= radius;
}

/**
 * Check if a building is within territory
 * @param {Object} building - Building object with position
 * @param {Object} territory - Territory object with center and radius
 * @returns {boolean} True if building is within territory
 */
export function isBuildingInTerritory(building, territory) {
  return isPositionInTerritory(building.position, territory.center, territory.radius);
}

/**
 * Validate that a new territory doesn't overlap with existing ones
 * @param {Object} newTerritory - New territory to validate
 * @param {Object[]} existingTerritories - Existing territories
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateTerritoryPlacement(newTerritory, existingTerritories) {
  for (const territory of existingTerritories) {
    const dx = newTerritory.center.x - territory.center.x;
    const dz = newTerritory.center.z - territory.center.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if territories overlap
    const minDistance = newTerritory.radius + territory.radius;
    if (distance < minDistance) {
      return {
        valid: false,
        error: `Territory would overlap with existing territory "${territory.name}". Minimum separation required: ${EXPANSION_RULES.MIN_TERRITORY_SEPARATION} cells`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate that expansion is allowed
 * @param {Object} territory - Territory attempting to expand
 * @param {number} newRadius - Proposed new radius
 * @param {Object[]} buildings - Buildings in territory
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateExpansion(territory, newRadius, buildings) {
  // Get maximum allowed radius
  const maxRadius = calculateMaxTerritoryRadius(buildings);

  if (newRadius > maxRadius) {
    const watchtowerCount = buildings.filter((b) => b.type === 'WATCHTOWER').length;
    const guardPostCount = buildings.filter((b) => b.type === 'GUARD_POST').length;
    const fortressCount = buildings.filter((b) => b.type === 'FORTRESS').length;
    const castleCount = buildings.filter((b) => b.type === 'CASTLE').length;

    return {
      valid: false,
      error: `Cannot expand to radius ${newRadius}. Current max: ${maxRadius} cells. Need more watchtowers (${watchtowerCount}) or guard posts (${guardPostCount}) or fortresses (${fortressCount}) or castles (${castleCount}).`,
      currentMax: maxRadius,
      required: {
        watchtower: watchtowerCount,
        guardPost: guardPostCount,
        fortress: fortressCount,
        castle: castleCount,
      },
    };
  }

  return { valid: true };
}

/**
 * Get expansion requirements for reaching a target radius
 * @param {number} targetRadius - Target territory radius
 * @param {Object[]} currentBuildings - Current buildings
 * @returns {Object} Requirements { missing: { building: count }, possible: boolean }
 */
export function getExpansionRequirements(targetRadius, currentBuildings) {
  let radius = EXPANSION_RULES.BASE_RADIUS;
  let watchtowers = 0;
  let guardPosts = 0;
  let fortresses = 0;
  let castles = 0;

  // Count existing relevant buildings
  for (const building of currentBuildings) {
    if (building.status !== 'COMPLETE') continue;
    if (building.type === 'WATCHTOWER') watchtowers++;
    if (building.type === 'GUARD_POST') guardPosts++;
    if (building.type === 'FORTRESS') fortresses++;
    if (building.type === 'CASTLE') castles++;
  }

  // Calculate current radius
  radius += watchtowers * EXPANSION_RULES.WATCHTOWER_RADIUS_BONUS;
  radius += guardPosts * EXPANSION_RULES.GUARD_POST_RADIUS_BONUS;
  radius += fortresses * EXPANSION_RULES.FORTRESS_RADIUS_BONUS;
  radius += castles * EXPANSION_RULES.CASTLE_RADIUS_BONUS;

  if (radius >= targetRadius) {
    return {
      possible: true,
      missing: {},
    };
  }

  // Calculate what's needed
  let remainingRadius = targetRadius - radius;
  let missing = {};

  // Prefer castles, then fortresses, then watchtowers, then guard posts
  const castlesNeeded = Math.ceil(remainingRadius / EXPANSION_RULES.CASTLE_RADIUS_BONUS);
  if (castlesNeeded > 0) {
    missing.castle = castlesNeeded;
    remainingRadius -= castlesNeeded * EXPANSION_RULES.CASTLE_RADIUS_BONUS;
  }

  const fortressesNeeded = Math.ceil(remainingRadius / EXPANSION_RULES.FORTRESS_RADIUS_BONUS);
  if (fortressesNeeded > 0) {
    missing.fortress = fortressesNeeded;
    remainingRadius -= fortressesNeeded * EXPANSION_RULES.FORTRESS_RADIUS_BONUS;
  }

  const watchtowersNeeded = Math.ceil(remainingRadius / EXPANSION_RULES.WATCHTOWER_RADIUS_BONUS);
  if (watchtowersNeeded > 0) {
    missing.watchtower = watchtowersNeeded;
  }

  return {
    possible: true,
    missing,
  };
}

/**
 * Check if a building is a territory control building
 * @param {string} buildingType - The building type
 * @returns {boolean} True if building affects territory
 */
export function isTerritoryControlBuilding(buildingType) {
  return TERRITORY_CONTROL_BUILDINGS.includes(buildingType);
}

export const EXPANSION_RULES_EXPORT = EXPANSION_RULES;
