/**
 * Module 3: Resource Economy - Integration Tests
 *
 * These tests verify that Module 3 works correctly with Foundation and GameStore.
 * They test the core functionality:
 * - Building cost validation
 * - Construction queue management
 * - Crafting system
 * - Storage capacity tracking
 * - Production building data
 *
 * To run these tests:
 * npm test -- Module3Integration.test.js
 */

import ResourceEconomyModule from '../ResourceEconomyModule';
import { useResourceEconomyStore } from '../stores/useResourceEconomyStore';
import { buildQueueManager } from '../managers/BuildQueueManager';
import {
  canBuildBuilding,
  canCraftItem,
  getAffordableBuildings,
  calculateInventoryValue,
  formatResourceAmount,
} from '../utils/resourceCalculations';
import { BUILDING_TYPES, RESOURCE_TYPES } from '../../../shared/config';
import { CRAFTING_RECIPES } from '../../../data/craftingRecipes';
import { getProductionData, calculateTotalStorageCapacity } from '../config/productionBuildings';

describe('Module 3: Resource Economy', () => {
  // ========================================================================
  // BUILDING COSTS AND AFFORDABILITY
  // ========================================================================

  describe('Building Cost System', () => {
    it('should return correct costs for WALL', () => {
      const costs = ResourceEconomyModule.getBuildingCosts(BUILDING_TYPES.WALL);
      expect(costs).toEqual({ [RESOURCE_TYPES.GOLD]: 20 });
    });

    it('should return correct costs for CASTLE', () => {
      const costs = ResourceEconomyModule.getBuildingCosts(BUILDING_TYPES.CASTLE);
      expect(costs).toEqual({
        [RESOURCE_TYPES.GOLD]: 500,
        [RESOURCE_TYPES.ESSENCE]: 100,
        [RESOURCE_TYPES.STONE]: 200,
        [RESOURCE_TYPES.CRYSTAL]: 50,
      });
    });

    it('should return correct build time for WALL', () => {
      const buildTime = ResourceEconomyModule.getBuildTime(BUILDING_TYPES.WALL);
      expect(buildTime).toBe(5); // seconds
    });

    it('should return correct build time for CASTLE', () => {
      const buildTime = ResourceEconomyModule.getBuildTime(BUILDING_TYPES.CASTLE);
      expect(buildTime).toBe(180); // seconds
    });
  });

  describe('Affordability Checks', () => {
    const inventory = {
      [RESOURCE_TYPES.GOLD]: 100,
      [RESOURCE_TYPES.WOOD]: 50,
      [RESOURCE_TYPES.STONE]: 50,
      [RESOURCE_TYPES.ESSENCE]: 10,
      [RESOURCE_TYPES.CRYSTAL]: 5,
      materials: {},
    };

    it('should allow building WALL with sufficient resources', () => {
      const result = ResourceEconomyModule.canBuild(BUILDING_TYPES.WALL, inventory);
      expect(result.canBuild).toBe(true);
      expect(result.missingResources).toEqual({});
    });

    it('should deny building CASTLE with insufficient resources', () => {
      const result = ResourceEconomyModule.canBuild(BUILDING_TYPES.CASTLE, inventory);
      expect(result.canBuild).toBe(false);
      expect(result.missingResources).toHaveProperty(RESOURCE_TYPES.GOLD);
      expect(result.missingResources[RESOURCE_TYPES.GOLD]).toBeGreaterThan(0);
    });

    it('should identify affordable buildings from a list', () => {
      const buildingTypes = [
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.DOOR,
        BUILDING_TYPES.CASTLE,
      ];
      const affordable = ResourceEconomyModule.getAffordableBuildings(
        inventory,
        buildingTypes
      );
      expect(affordable).toContain(BUILDING_TYPES.WALL);
      expect(affordable).not.toContain(BUILDING_TYPES.CASTLE);
    });
  });

  // ========================================================================
  // BUILD QUEUE MANAGEMENT
  // ========================================================================

  describe('Build Queue Manager', () => {
    let mockBuilding;

    beforeEach(() => {
      // Clear queue before each test
      buildQueueManager.clear();

      // Create mock building
      mockBuilding = {
        id: 'building_test_1',
        type: BUILDING_TYPES.WALL,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        status: 'BLUEPRINT',
      };
    });

    it('should add building to queue', () => {
      const added = buildQueueManager.addToQueue(mockBuilding);
      expect(added).toBe(true);
      expect(buildQueueManager.isInQueue(mockBuilding.id)).toBe(true);
    });

    it('should track queue size', () => {
      buildQueueManager.addToQueue(mockBuilding);
      expect(buildQueueManager.getQueueSize()).toBe(1);
    });

    it('should update progress', () => {
      buildQueueManager.addToQueue(mockBuilding);
      const completed = buildQueueManager.updateProgress();
      expect(Array.isArray(completed)).toBe(true);
    });

    it('should remove building from queue', () => {
      buildQueueManager.addToQueue(mockBuilding);
      const removed = buildQueueManager.removeFromQueue(mockBuilding.id);
      expect(removed).toBe(true);
      expect(buildQueueManager.isInQueue(mockBuilding.id)).toBe(false);
    });

    it('should get progress for building', () => {
      buildQueueManager.addToQueue(mockBuilding);
      const progress = buildQueueManager.getProgress(mockBuilding.id);
      expect(progress).toBeDefined();
      expect(progress.buildingId).toBe(mockBuilding.id);
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });
  });

  // ========================================================================
  // CRAFTING SYSTEM
  // ========================================================================

  describe('Crafting System', () => {
    const inventory = {
      materials: {
        iron: 20,
        wood: 5,
        crystal: 3,
        essence: 2,
      },
    };

    it('should allow crafting iron sword with sufficient materials', () => {
      const result = ResourceEconomyModule.canCraft('ironSword', inventory);
      expect(result.canCraft).toBe(true);
      expect(result.missingMaterials).toEqual({});
    });

    it('should deny crafting steel sword with insufficient materials', () => {
      const lowInventory = {
        materials: {
          iron: 5,
          crystal: 1,
          wood: 1,
        },
      };
      const result = ResourceEconomyModule.canCraft('steelSword', lowInventory);
      expect(result.canCraft).toBe(false);
      expect(result.missingMaterials).toHaveProperty('iron');
    });

    it('should return recipe when crafting is possible', () => {
      const result = ResourceEconomyModule.canCraft('ironSword', inventory);
      expect(result.recipe).toBeDefined();
      expect(result.recipe.id).toBe('ironSword');
      expect(result.recipe.name).toBe('Iron Sword');
    });
  });

  // ========================================================================
  // STORAGE MANAGEMENT
  // ========================================================================

  describe('Storage System', () => {
    it('should calculate storage capacity from buildings', () => {
      const storageBuildings = [
        { type: BUILDING_TYPES.STORAGE_BUILDING },
        { type: BUILDING_TYPES.STORAGE_BUILDING },
      ];
      const capacity = ResourceEconomyModule.getTotalStorageCapacity(
        storageBuildings
      );
      expect(capacity).toBe(1000); // 500 per building
    });

    it('should handle zero storage buildings', () => {
      const capacity = ResourceEconomyModule.getTotalStorageCapacity([]);
      expect(capacity).toBe(0);
    });

    it('should include chest storage', () => {
      const storageBuildings = [
        { type: BUILDING_TYPES.CHEST },
        { type: BUILDING_TYPES.STORAGE_BUILDING },
      ];
      const capacity = ResourceEconomyModule.getTotalStorageCapacity(
        storageBuildings
      );
      expect(capacity).toBe(600); // 100 + 500
    });
  });

  // ========================================================================
  // PRODUCTION BUILDINGS
  // ========================================================================

  describe('Production Buildings', () => {
    it('should return production data for production buildings', () => {
      const data = ResourceEconomyModule.getProductionData(
        BUILDING_TYPES.STORAGE_BUILDING
      );
      expect(data).toBeDefined();
      expect(data.storageCapacity).toBe(500);
    });

    it('should identify storage buildings', () => {
      const isStorage = ResourceEconomyModule.isStorageBuilding(
        BUILDING_TYPES.STORAGE_BUILDING
      );
      expect(isStorage).toBe(true);
    });

    it('should not identify defensive buildings as storage', () => {
      const isStorage = ResourceEconomyModule.isStorageBuilding(
        BUILDING_TYPES.WALL
      );
      expect(isStorage).toBe(false);
    });

    it('should calculate total production from buildings', () => {
      // Most buildings don't produce, so this should return empty
      const buildings = [
        { type: BUILDING_TYPES.WALL },
        { type: BUILDING_TYPES.TOWER },
      ];
      const production = ResourceEconomyModule.calculateTotalProduction(buildings);
      expect(typeof production).toBe('object');
    });
  });

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  describe('Utility Functions', () => {
    it('should format resource amounts', () => {
      expect(ResourceEconomyModule.formatAmount(50)).toBe('50');
      expect(ResourceEconomyModule.formatAmount(1000)).toBe('1.0K');
      expect(ResourceEconomyModule.formatAmount(1500000)).toBe('1.5M');
    });

    it('should calculate inventory value', () => {
      const inventory = {
        [RESOURCE_TYPES.GOLD]: 100,
        [RESOURCE_TYPES.WOOD]: 50,
        materials: { iron: 10 },
      };
      const value = ResourceEconomyModule.getInventoryValue(inventory);
      expect(value).toBeGreaterThan(0);
    });

    it('should identify depleted resources', () => {
      const inventory = {
        [RESOURCE_TYPES.GOLD]: 0,
        [RESOURCE_TYPES.WOOD]: 50,
      };
      const depleted = ResourceEconomyModule.getDepletedResources(inventory);
      expect(depleted).toContain(RESOURCE_TYPES.GOLD);
      expect(depleted).not.toContain(RESOURCE_TYPES.WOOD);
    });

    it('should check storage capacity', () => {
      const result = ResourceEconomyModule.checkStorageCapacity(
        50,   // currentUsage
        100,  // maxCapacity
        { GOLD: 30, WOOD: 10 }  // resourceToAdd
      );
      expect(result.hasCapacity).toBe(true);
      expect(result.overflowAmount).toBe(0);
    });

    it('should detect storage overflow', () => {
      const result = ResourceEconomyModule.checkStorageCapacity(
        80,   // currentUsage
        100,  // maxCapacity
        { GOLD: 50 }  // resourceToAdd
      );
      expect(result.hasCapacity).toBe(false);
      expect(result.overflowAmount).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // RESOURCE ECONOMY STORE
  // ========================================================================

  describe('Resource Economy Store', () => {
    beforeEach(() => {
      // Reset store before each test
      const store = useResourceEconomyStore.getState();
      store.resetEconomy();
    });

    it('should have initial state', () => {
      const store = useResourceEconomyStore.getState();
      expect(store.storageState).toBeDefined();
      expect(store.economicHistory).toBeDefined();
      expect(store.pendingConstructions).toBeDefined();
    });

    it('should update storage state', () => {
      const store = useResourceEconomyStore.getState();
      const inventory = {
        [RESOURCE_TYPES.GOLD]: 50,
        [RESOURCE_TYPES.WOOD]: 30,
      };
      store.updateStorageState([], inventory);
      expect(store.storageState.currentUsage).toBeDefined();
    });

    it('should calculate storage utilization', () => {
      const store = useResourceEconomyStore.getState();
      const inventory = {
        [RESOURCE_TYPES.GOLD]: 250,
        [RESOURCE_TYPES.WOOD]: 250,
      };
      const storageBuildings = [{ type: BUILDING_TYPES.STORAGE_BUILDING }];
      store.updateStorageState(storageBuildings, inventory);
      const utilization = store.getStorageUtilization();
      expect(utilization).toBeGreaterThanOrEqual(0);
      expect(utilization).toBeLessThanOrEqual(100);
    });

    it('should get available storage', () => {
      const store = useResourceEconomyStore.getState();
      const inventory = { [RESOURCE_TYPES.GOLD]: 100 };
      const storageBuildings = [{ type: BUILDING_TYPES.STORAGE_BUILDING }];
      store.updateStorageState(storageBuildings, inventory);
      const available = store.getAvailableStorage();
      expect(available).toBeLessThanOrEqual(500); // Storage capacity
    });

    it('should reset economy state', () => {
      const store = useResourceEconomyStore.getState();
      store.resetEconomy();
      expect(store.pendingConstructions.size).toBe(0);
      expect(store.economicHistory.buildingsCompleted).toBe(0);
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty inventory', () => {
      const result = ResourceEconomyModule.canBuild(BUILDING_TYPES.WALL, {});
      expect(result.canBuild).toBe(false);
    });

    it('should handle invalid building type', () => {
      const costs = ResourceEconomyModule.getBuildingCosts('INVALID_TYPE');
      expect(costs).toEqual({});
    });

    it('should handle invalid recipe', () => {
      const result = ResourceEconomyModule.canCraft('invalid_recipe', {
        materials: {},
      });
      expect(result.canCraft).toBe(false);
    });

    it('should handle null/undefined buildings in production calculation', () => {
      const production = ResourceEconomyModule.calculateTotalProduction([
        null,
        undefined,
      ]);
      expect(production).toEqual({});
    });
  });
});

/**
 * Integration Test Summary
 *
 * These tests verify:
 * ✓ Building costs are correctly defined and accessible
 * ✓ Affordability checks work with various inventory states
 * ✓ Build queue manager tracks construction progress
 * ✓ Crafting system validates recipes against inventory
 * ✓ Storage capacity is calculated from storage buildings
 * ✓ Production buildings return correct data
 * ✓ Utility functions format and calculate correctly
 * ✓ Resource Economy Store maintains proper state
 * ✓ Edge cases are handled gracefully
 *
 * If all tests pass, Module 3 is properly integrated with:
 * - Foundation (building placement)
 * - Config (building properties)
 * - Game Store (inventory management)
 * - Crafting Recipes (item creation)
 */
