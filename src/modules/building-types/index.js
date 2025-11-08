/**
 * Module 2: Building Types & Progression System
 *
 * Complete export of all building type system functionality
 * This is the public API for other modules to interact with Module 2
 */

// Building Definitions & Catalog
export {
  BUILDING_CATALOG,
  TIER_DEFINITIONS,
  BUILDING_CATEGORIES,
  getAllBuildings,
  getBuildingById,
  getBuildingsByTier,
  getBuildingsByCategory,
} from './constants/buildings.js';

// State Management
export { useBuildingTypesStore } from './stores/useBuildingTypesStore.js';

// Tier Advancement Rules
export {
  TIER_ADVANCEMENT_CONDITIONS,
  isBuildingRequirementMet,
  areBuildingRequirementsMet,
  isResourceSpentRequirementMet,
  isTimeRequirementMet,
  checkTierUnlockConditions,
  getNextTierToUnlock,
  getTierAdvancementConditions,
  getTierRequirementsDescription,
} from './utils/tierAdvancementRules.js';

// Building Interconnection Rules
export {
  getRequiredNearbyBuildings,
  getForbiddenNearbyBuildings,
  getPotentialBonuses,
  worksBestInGroups,
  validatePlacementInterconnections,
  calculateEfficiencyBonus,
  getBuildingsThatBenefitFromNearby,
  getBuildingPairings,
  checkBuildingCompatibility,
} from './utils/interconnectionRules.js';

// Module Integration (Modules 3 & 4)
export {
  validateBuildingCostForTier,
  getAffordableBuildings,
  getTierProgressionResourceRequirement,
  validateBuildingPlacementByTier,
  getBuildingStructuralProperties,
  getOptimizableBuildingsForTerritory,
  validateTierUnlockCrossPlatform,
  getBuildingsInCategoryForTiers,
  getBuildingUIInfo,
} from './utils/moduleIntegration.js';
