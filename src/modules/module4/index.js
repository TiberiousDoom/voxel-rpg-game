/**
 * Module 4: Territory, Town Planning & Aesthetics
 *
 * Main entry point for Module 4 exports.
 * This module manages territory systems, town management, NPC placement,
 * aesthetic systems, and victory conditions.
 *
 * Module 4 integrates with:
 * - Foundation Module: For building queries and placement data
 * - Module 2: For building type classifications
 * - Module 3: For economic calculations
 */

// ============================================================================
// STORES
// ============================================================================

export { useTerritory } from './stores/useTerritory';
export { useTownManagement } from './stores/useTownManagement';
export { useNPCSystem } from './stores/useNPCSystem';
export { useProgressionSystem } from './stores/useProgressionSystem';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export {
  MODULE_4_TYPES,
  NPC_ROLES,
  NPC_STATUSES,
  TOWN_UPGRADE_TYPES,
  BONUS_TYPES,
  AESTHETIC_ELEMENT_TYPES,
  VICTORY_CONDITION_TYPES,
} from './types/index';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  // Building Classification
  classifyBuilding,
  getSuitableNPCRoles,
  getNPCCapacity,
  getTerritoryBonuses,
  isMonument,
  getAestheticValue,
  getPopulationCapacity,
  TERRITORY_CONTROL_BUILDINGS,
  NPC_ASSIGNABLE_BUILDINGS,
  DEFENSIVE_BUILDINGS,
  PRODUCTION_BUILDINGS,
  CAPITAL_BUILDINGS,
} from './utils/buildingClassifier';

export {
  // Territory Validation
  calculateMaxTerritoryRadius,
  isPositionInTerritory,
  isBuildingInTerritory,
  validateTerritoryPlacement,
  validateExpansion,
  getExpansionRequirements,
  isTerritoryControlBuilding,
  EXPANSION_RULES_EXPORT,
} from './utils/territoryValidator';

export {
  // Bonus Calculation
  calculateTerritoryBonuses,
  calculateTownStatistics,
  calculateNPCMorale,
  applyProductionMultipliers,
  applyDefenseMultipliers,
  applySpawnRateModifiers,
  applyVisionRangeBonus,
  calculateTownLevel,
  calculateAestheticRating,
} from './utils/bonusCalculator';

// ============================================================================
// COMPONENTS
// ============================================================================

// Components will be exported here as they are created
// export { TerritoryUI } from './components/TerritoryUI';
// export { TownManagementUI } from './components/TownManagementUI';
// export { NPCManagementUI } from './components/NPCManagementUI';

// ============================================================================
// MODULE INFO
// ============================================================================

export const MODULE_4_INFO = {
  name: 'Module 4: Territory, Town Planning & Aesthetics',
  version: '1.0.0',
  description: 'Manages town management systems and territory control',
  systems: [
    'Territory Management (boundaries, expansion, bonuses)',
    'Town Management (upgrades, statistics, improvements)',
    'NPC System (placement, assignment, management)',
    'Aesthetic System (decorations, visual polish)',
    'Victory/Progression System (win conditions, milestones)',
  ],
  dependencies: ['Foundation Module', 'Module 2 (Building Types)', 'Module 3 (Resource Economy)'],
};

/**
 * Initialize Module 4
 * Should be called when the game starts
 * @param {Object} config - Configuration object
 */
export function initializeModule4(config = {}) {
  const { useTerritory, useTownManagement, useNPCSystem, useProgressionSystem } = require('./index');

  // Initialize default state
  const territoryStore = useTerritory.getState();
  const townStore = useTownManagement.getState();
  const npcStore = useNPCSystem.getState();
  const progressionStore = useProgressionSystem.getState();

  console.log('Module 4 initialized:', MODULE_4_INFO);

  return {
    territories: territoryStore,
    towns: townStore,
    npcs: npcStore,
    progression: progressionStore,
  };
}
