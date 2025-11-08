/**
 * Module 4 Building Classifier
 *
 * Classifies buildings by their role in the territory system.
 * This allows Module 4 to categorize buildings without defining them.
 * Building definitions remain in Module 2 (via config.js).
 */

import { BUILDING_TYPES } from '../../../shared/config';
import { BONUS_TYPES, NPC_ROLES } from '../types/index';

/**
 * Territory Control Buildings - Extend territory boundaries
 * Examples: Watchtower, Guard Post, Fortress, Castle
 */
export const TERRITORY_CONTROL_BUILDINGS = [
  BUILDING_TYPES.WATCHTOWER,
  BUILDING_TYPES.GUARD_POST,
  BUILDING_TYPES.FORTRESS,
  BUILDING_TYPES.CASTLE,
];

/**
 * NPC Assignable Buildings - Can have NPCs assigned to them
 * Examples: Barracks, Marketplace, Crafting Station
 */
export const NPC_ASSIGNABLE_BUILDINGS = [
  BUILDING_TYPES.BARRACKS,
  BUILDING_TYPES.MARKETPLACE,
  BUILDING_TYPES.CRAFTING_STATION,
  BUILDING_TYPES.GUARD_POST,
];

/**
 * Defensive Buildings - Contribute to town defense rating
 */
export const DEFENSIVE_BUILDINGS = [
  BUILDING_TYPES.WALL,
  BUILDING_TYPES.TOWER,
  BUILDING_TYPES.WATCHTOWER,
  BUILDING_TYPES.GUARD_POST,
  BUILDING_TYPES.FORTRESS,
  BUILDING_TYPES.CASTLE,
];

/**
 * Production Buildings - Contribute to resource production
 */
export const PRODUCTION_BUILDINGS = [
  BUILDING_TYPES.CRAFTING_STATION,
  BUILDING_TYPES.STORAGE_BUILDING,
  BUILDING_TYPES.MARKETPLACE,
];

/**
 * Capital Buildings - Serve as territory capitals
 * Only one can be primary per territory
 */
export const CAPITAL_BUILDINGS = [
  BUILDING_TYPES.FORTRESS,
  BUILDING_TYPES.CASTLE,
];

/**
 * Classify a building by its role in the territory system
 * @param {string} buildingType - The building type to classify
 * @returns {Object} Classification object with all applicable categories
 */
export function classifyBuilding(buildingType) {
  return {
    isTerritoryControl: TERRITORY_CONTROL_BUILDINGS.includes(buildingType),
    isNPCAssignable: NPC_ASSIGNABLE_BUILDINGS.includes(buildingType),
    isDefensive: DEFENSIVE_BUILDINGS.includes(buildingType),
    isProduction: PRODUCTION_BUILDINGS.includes(buildingType),
    isCapital: CAPITAL_BUILDINGS.includes(buildingType),
  };
}

/**
 * Get NPC roles suitable for a specific building type
 * @param {string} buildingType - The building type
 * @returns {string[]} Array of suitable NPC roles
 */
export function getSuitableNPCRoles(buildingType) {
  const roles = [];

  switch (buildingType) {
    case BUILDING_TYPES.BARRACKS:
      roles.push(NPC_ROLES.GUARD, NPC_ROLES.SCOUT);
      break;
    case BUILDING_TYPES.MARKETPLACE:
      roles.push(NPC_ROLES.TRADER);
      break;
    case BUILDING_TYPES.CRAFTING_STATION:
      roles.push(NPC_ROLES.CRAFTER);
      break;
    case BUILDING_TYPES.GUARD_POST:
      roles.push(NPC_ROLES.GUARD);
      break;
  }

  return roles;
}

/**
 * Get the NPC capacity for a building type
 * @param {string} buildingType - The building type
 * @returns {number} Maximum NPCs that can be assigned
 */
export function getNPCCapacity(buildingType) {
  const capacities = {
    [BUILDING_TYPES.BARRACKS]: 8,
    [BUILDING_TYPES.MARKETPLACE]: 4,
    [BUILDING_TYPES.CRAFTING_STATION]: 3,
    [BUILDING_TYPES.GUARD_POST]: 2,
  };

  return capacities[buildingType] || 0;
}

/**
 * Get territory bonuses provided by a building
 * Module 4 reads these bonuses but doesn't define them
 * @param {string} buildingType - The building type
 * @returns {Object[]} Array of bonus objects
 */
export function getTerritoryBonuses(buildingType) {
  const bonuses = {
    [BUILDING_TYPES.WATCHTOWER]: [
      {
        type: BONUS_TYPES.VISION_RANGE,
        magnitude: 10, // +10 cell vision range
        unit: 'flat',
      },
      {
        type: BONUS_TYPES.ENEMY_SPAWN_RATE,
        magnitude: -10, // -10% enemy spawn
        unit: 'percentage',
      },
    ],
    [BUILDING_TYPES.GUARD_POST]: [
      {
        type: BONUS_TYPES.DEFENSE_RATING,
        magnitude: 5, // +5% defense
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.ENEMY_SPAWN_RATE,
        magnitude: -5, // -5% enemy spawn
        unit: 'percentage',
      },
    ],
    [BUILDING_TYPES.FORTRESS]: [
      {
        type: BONUS_TYPES.DEFENSE_RATING,
        magnitude: 20, // +20% defense
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.ENEMY_SPAWN_RATE,
        magnitude: -20, // -20% enemy spawn
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.PROSPERITY,
        magnitude: 10, // +10% prosperity
        unit: 'percentage',
      },
    ],
    [BUILDING_TYPES.CASTLE]: [
      {
        type: BONUS_TYPES.DEFENSE_RATING,
        magnitude: 50, // +50% defense
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.ENEMY_SPAWN_RATE,
        magnitude: -50, // -50% enemy spawn
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.PROSPERITY,
        magnitude: 30, // +30% prosperity
        unit: 'percentage',
      },
      {
        type: BONUS_TYPES.NPC_HAPPINESS,
        magnitude: 15, // +15% happiness
        unit: 'percentage',
      },
    ],
  };

  return bonuses[buildingType] || [];
}

/**
 * Check if a building is a monument
 * Monuments are special aesthetic buildings that unlock progression
 * @param {string} buildingType - The building type
 * @returns {boolean} True if this is a monument
 */
export function isMonument(buildingType) {
  const monuments = [
    // Add monument types here as they are defined in Module 2
  ];
  return monuments.includes(buildingType);
}

/**
 * Get the contribution of a building to town aesthetics
 * @param {string} buildingType - The building type
 * @returns {number} Aesthetic value (0-100)
 */
export function getAestheticValue(buildingType) {
  const values = {
    [BUILDING_TYPES.CASTLE]: 100,
    [BUILDING_TYPES.FORTRESS]: 80,
    [BUILDING_TYPES.MARKETPLACE]: 70,
    [BUILDING_TYPES.CRAFTING_STATION]: 50,
    [BUILDING_TYPES.BARRACKS]: 40,
    [BUILDING_TYPES.GUARD_POST]: 30,
    [BUILDING_TYPES.WATCHTOWER]: 35,
    [BUILDING_TYPES.STORAGE_BUILDING]: 25,
    [BUILDING_TYPES.TOWER]: 20,
    [BUILDING_TYPES.WALL]: 10,
    [BUILDING_TYPES.DOOR]: 5,
    [BUILDING_TYPES.CHEST]: 5,
  };

  return values[buildingType] || 0;
}

/**
 * Count contribution of buildings to town population capacity
 * @param {string} buildingType - The building type
 * @returns {number} Population capacity provided
 */
export function getPopulationCapacity(buildingType) {
  const capacities = {
    [BUILDING_TYPES.BARRACKS]: 20,
    [BUILDING_TYPES.MARKETPLACE]: 15,
    [BUILDING_TYPES.CRAFTING_STATION]: 10,
    [BUILDING_TYPES.GUARD_POST]: 8,
    [BUILDING_TYPES.STORAGE_BUILDING]: 5,
  };

  return capacities[buildingType] || 0;
}
