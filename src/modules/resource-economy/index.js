/**
 * Resource Economy Module - Public API
 *
 * This is the main entry point for Module 3.
 * All imports from this module should use this index file.
 *
 * Usage:
 * import ResourceEconomyModule from './modules/resource-economy';
 * import { useResourceEconomyStore } from './modules/resource-economy';
 */

// Main module API
export { default as ResourceEconomyModule } from './ResourceEconomyModule';

// Store
export { useResourceEconomyStore } from './stores/useResourceEconomyStore';

// Managers
export { buildQueueManager } from './managers/BuildQueueManager';

// Utilities
export {
  canBuildBuilding,
  canCraftItem,
  consumeBuildingCosts,
  consumeCraftingMaterials,
  refundBuildingCosts,
  calculateBuildingCosts,
  getAffordableBuildings,
  estimateTierCost,
  getDepletedResources,
  formatResourceAmount,
  calculateInventoryValue,
  checkStorageCapacity,
} from './utils/resourceCalculations';

// Configuration
export {
  getProductionData,
  isStorageBuilding,
  calculateTotalStorageCapacity,
  calculateTotalProduction,
  PRODUCTION_BUILDINGS,
} from './config/productionBuildings';
