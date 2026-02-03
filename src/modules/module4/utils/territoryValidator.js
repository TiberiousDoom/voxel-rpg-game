/**
 * Territory Validator
 *
 * Validates territory-related operations and rules.
 * Enforces boundaries and constraints defined in Module 4 specifications.
 *
 * NOTE: Territory expansion rules are now imported from shared/config.js
 * to maintain a single source of truth across all modules.
 */

import { TERRITORY_CONFIG, BUILDING_TYPES } from '../../../shared/config';
import { TERRITORY_CONTROL_BUILDINGS } from './buildingClassifier';

/**
 * Calculate the maximum territory radius based on buildings
 * @param {Object[]} buildings - Array of buildings in territory
 * @returns {number} Maximum radius achievable
 */
export function calculateMaxTerritoryRadius(buildings) {
  let radius = TERRITORY_CONFIG.BASE_RADIUS;

  for (const building of buildings) {
    if (building.status === 'COMPLETE') {
      const bonus = TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[building.type] || 0;
      radius += bonus;
    }
  }

  // Cap at maximum
  return Math.min(radius, TERRITORY_CONFIG.MAX_TERRITORY_RADIUS);
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
        error: `Territory would overlap with existing territory "${territory.name}". Minimum separation required: ${TERRITORY_CONFIG.MIN_TERRITORY_SEPARATION} cells`,
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
  let radius = TERRITORY_CONFIG.BASE_RADIUS;

  // Count completed territory control buildings and add their bonuses
  for (const building of currentBuildings) {
    if (building.status === 'COMPLETE') {
      const bonus = TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[building.type] || 0;
      radius += bonus;
    }
  }

  if (radius >= targetRadius) {
    return {
      possible: true,
      missing: {},
    };
  }

  // Calculate what's needed
  // Strategy: Use the most efficient buildings first (highest bonus)
  let remainingRadius = targetRadius - radius;
  let missing = {};

  // Bonuses sorted by effectiveness (highest first)
  const bonuses = [
    { type: BUILDING_TYPES.CASTLE, bonus: TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[BUILDING_TYPES.CASTLE] },
    { type: BUILDING_TYPES.FORTRESS, bonus: TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[BUILDING_TYPES.FORTRESS] },
    { type: BUILDING_TYPES.WATCHTOWER, bonus: TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[BUILDING_TYPES.WATCHTOWER] },
    { type: BUILDING_TYPES.GUARD_POST, bonus: TERRITORY_CONFIG.BUILDING_RADIUS_BONUSES[BUILDING_TYPES.GUARD_POST] },
  ];

  for (const { type, bonus } of bonuses) {
    if (remainingRadius <= 0) break;

    const needed = Math.ceil(remainingRadius / bonus);
    if (needed > 0) {
      missing[type.toLowerCase()] = needed;
      remainingRadius -= needed * bonus;
    }
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

/**
 * Get territory configuration
 * @returns {Object} TERRITORY_CONFIG from shared/config.js
 */
export const getTerritoryConfig = () => TERRITORY_CONFIG;
