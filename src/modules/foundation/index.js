/**
 * Foundation Module - Index
 *
 * Central export point for the Foundation Module.
 * All Foundation functionality is exported from here.
 */

// ============================================================================
// STORES
// ============================================================================
export { useFoundationStore } from './stores/useFoundationStore';

// ============================================================================
// HOOKS
// ============================================================================
export { usePlacement } from './hooks/usePlacement';
export { useBuildingMode } from './hooks/useBuildingMode';
export { useFoundationPersistence } from './hooks/useFoundationPersistence';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  validatePlacement,
  validateGridBounds,
  validateGridSnap,
  validateRotation,
  validateHeight,
  validateNoCollisions,
  validateSpacing,
  validateCapacity,
  getBuildingCosts,
} from './utils/validator';

export {
  getPropertyForBuildingType,
  getBuildingTier,
  getBaseHP,
  getDimensions,
  getBuildTime,
  getBuildingCosts as getRegistryCosts,
  getColorForStatus,
  isValidBuildingType,
  getBuildingTypesForTier,
  getUnlockedBuildingTypes,
  calculateTotalCosts,
  getDisplayName,
  getDescription,
  isDefensiveBuilding,
  isProductionBuilding,
  getSummary,
} from './utils/buildingRegistry';

export {
  saveBuildings,
  loadBuildings,
  clearSavedBuildings,
  hasSavedBuildings,
  exportBuildingsToJSON,
  importBuildingsFromJSON,
  validateBuildingData,
  getBackupTimestamp,
} from './utils/persistence';

export { SpatialHash } from './utils/spatialHash';

// ============================================================================
// CONFIGURATION (Re-exported for convenience)
// ============================================================================
export {
  BUILDING_TYPES,
  BUILDING_TIERS,
  GRID,
  BUILDING_DIMENSIONS,
  BUILDING_STATUS,
  RESOURCE_TYPES,
  BUILDING_PROPERTIES,
  PLACEMENT_CONSTRAINTS,
  UI_CONSTANTS,
  PERFORMANCE,
  SAVE_VERSION,
} from '../../shared/config';
