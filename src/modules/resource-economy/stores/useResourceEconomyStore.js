/**
 * Resource Economy Store - useResourceEconomyStore
 *
 * Zustand store for managing the Resource Economy module state.
 * This is separate from the general game state (useGameStore) to keep
 * concerns separated and allow Module 3 to exist independently.
 *
 * Responsibilities:
 * - Track building construction progress and build queues
 * - Manage resource allocations and constraints
 * - Store production building information
 * - Track storage usage and capacity
 * - Provide aggregated economic data
 *
 * Relationship with other modules:
 * - Queries useFoundationStore for building information
 * - Queries useGameStore for inventory
 * - Updates buildQueueManager when buildings start/finish construction
 * - Does NOT directly modify Foundation buildings (uses updateBuilding)
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { buildQueueManager } from '../managers/BuildQueueManager';
import {
  canBuildBuilding,
  canCraftItem,
  consumeBuildingCosts,
  refundBuildingCosts,
} from '../utils/resourceCalculations';
import { calculateTotalStorageCapacity } from '../config/productionBuildings';
import { BUILDING_STATUS } from '../../../shared/config';

/**
 * Resource Economy Store
 * Manages all economic simulation data
 */
export const useResourceEconomyStore = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Build queue manager (separate singleton)
    buildQueue: buildQueueManager,

    // Track which buildings are pending resource cost consumption
    // Used when player initiates build but resources consumed on completion
    pendingConstructions: new Map(), // buildingId -> { buildingType, resourcesCost }

    // Storage tracking for the entire territory
    // Aggregated from all storage buildings
    storageState: {
      currentUsage: {}, // { resource: amountStored }
      maxCapacity: 0,   // Total capacity from all storage buildings
      isFull: false,
    },

    // Economic history for debugging or future trading system
    economicHistory: {
      buildingsCompleted: 0,
      itemsCrafted: 0,
      totalResourcesSpent: 0,
      buildingStartedAt: Date.now(),
    },

    // ========================================================================
    // BUILD QUEUE MANAGEMENT
    // ========================================================================

    /**
     * Start constructing a building.
     * Validates resources and transitions building to BUILDING status.
     * Resources are consumed immediately (Module 3 responsibility).
     *
     * @param {Object} building - Building from Foundation
     * @param {Object} inventory - Current player inventory
     * @returns {Object} { success: boolean, error?: string }
     */
    startConstruction: (building, inventory) => {
      set((state) => {
        // Validate building
        if (!building || !building.id) {
          return state; // No state change
        }

        // Check if player has resources
        const costCheck = canBuildBuilding(building.type, inventory);
        if (!costCheck.canBuild) {
          return state; // No state change
        }

        // Add to queue
        const added = state.buildQueue.addToQueue(building);
        if (!added) {
          return state;
        }

        // Track pending construction
        state.pendingConstructions.set(building.id, {
          buildingType: building.type,
          resourcesCost: costCheck.costs,
        });

        return state;
      });

      return { success: true };
    },

    /**
     * Complete a building's construction.
     * Transitions from BUILDING to COMPLETE status.
     * Called by buildQueue.updateProgress() or manually.
     *
     * @param {string} buildingId - The building that completed
     * @returns {Object} { success: boolean, building?: Object }
     */
    completeConstruction: (buildingId) => {
      set((state) => {
        // Remove from queue
        state.buildQueue.removeFromQueue(buildingId);

        // Remove from pending
        state.pendingConstructions.delete(buildingId);

        // Update history
        state.economicHistory.buildingsCompleted += 1;

        return state;
      });

      return { success: true };
    },

    /**
     * Cancel construction and refund resources.
     *
     * @param {string} buildingId - Building to cancel
     * @param {Object} inventory - Current inventory
     * @returns {Object} Updated inventory with refunded resources
     */
    cancelConstruction: (buildingId, inventory) => {
      const pending = get().pendingConstructions.get(buildingId);
      if (!pending) return inventory;

      // Remove from queue
      get().buildQueue.removeFromQueue(buildingId);

      set((state) => {
        state.pendingConstructions.delete(buildingId);
      });

      // Refund resources
      return refundBuildingCosts(pending.buildingType, inventory);
    },

    /**
     * Get construction progress for a building.
     *
     * @param {string} buildingId - The building to query
     * @returns {Object|null} Progress data or null if not under construction
     */
    getConstructionProgress: (buildingId) => {
      return get().buildQueue.getProgress(buildingId);
    },

    /**
     * Get all buildings currently under construction.
     *
     * @returns {Array} Array of queue entries
     */
    getAllConstructing: () => {
      return get().buildQueue.getAllInQueue();
    },

    /**
     * Update all construction progress.
     * Call this regularly (e.g., every game frame).
     *
     * @returns {Array} Building IDs that just completed
     */
    updateConstructionProgress: () => {
      const completed = get().buildQueue.updateProgress();

      // Mark completed buildings
      set((state) => {
        completed.forEach((buildingId) => {
          state.economicHistory.buildingsCompleted += 1;
          state.pendingConstructions.delete(buildingId);
        });
      });

      return completed;
    },

    // ========================================================================
    // RESOURCE AND COST VALIDATION
    // ========================================================================

    /**
     * Check if player can build a building.
     *
     * @param {string} buildingType - Type of building
     * @param {Object} inventory - Current inventory
     * @returns {Object} { canBuild, missingResources, costs }
     */
    canAffordBuilding: (buildingType, inventory) => {
      return canBuildBuilding(buildingType, inventory);
    },

    /**
     * Check if player can craft an item.
     *
     * @param {string} recipeId - Recipe ID to craft
     * @param {Object} inventory - Current inventory
     * @returns {Object} { canCraft, missingMaterials, recipe }
     */
    canAffordCrafting: (recipeId, inventory) => {
      return canCraftItem(recipeId, inventory);
    },

    /**
     * Get resource costs for building without checking inventory.
     * Useful for UI display.
     *
     * @param {string} buildingType - Type of building
     * @returns {Object} { resource: cost }
     */
    getBuildingCosts: (buildingType) => {
      const result = canBuildBuilding(buildingType, {});
      return result.costs;
    },

    // ========================================================================
    // STORAGE MANAGEMENT
    // ========================================================================

    /**
     * Update storage state based on current buildings and inventory.
     * Call when storage buildings are added/removed.
     *
     * @param {Array} storageBuildings - Storage buildings from Foundation
     * @param {Object} currentInventory - Current resource inventory
     */
    updateStorageState: (storageBuildings, currentInventory) => {
      set((state) => {
        const maxCapacity = calculateTotalStorageCapacity(storageBuildings);

        // Calculate current usage
        const usage = {};
        Object.entries(currentInventory).forEach(([resource, amount]) => {
          if (resource !== 'items' && resource !== 'materials') {
            usage[resource] = amount || 0;
          }
        });

        // Calculate if full
        const totalUsed = Object.values(usage).reduce((a, b) => a + b, 0);
        const isFull = totalUsed >= maxCapacity;

        state.storageState = {
          currentUsage: usage,
          maxCapacity,
          isFull,
        };

        return state;
      });
    },

    /**
     * Get storage utilization percentage.
     *
     * @returns {number} Percentage (0-100)
     */
    getStorageUtilization: () => {
      const state = get();
      if (state.storageState.maxCapacity === 0) return 0;
      const totalUsed = Object.values(state.storageState.currentUsage).reduce((a, b) => a + b, 0);
      return (totalUsed / state.storageState.maxCapacity) * 100;
    },

    /**
     * Get available storage space.
     *
     * @returns {number} Units of space available
     */
    getAvailableStorage: () => {
      const state = get();
      const totalUsed = Object.values(state.storageState.currentUsage).reduce((a, b) => a + b, 0);
      return Math.max(0, state.storageState.maxCapacity - totalUsed);
    },

    // ========================================================================
    // ECONOMIC QUERIES
    // ========================================================================

    /**
     * Get total construction time remaining.
     *
     * @returns {number} Time in milliseconds
     */
    getTotalConstructionTime: () => {
      return get().buildQueue.getTotalTimeRemaining();
    },

    /**
     * Get number of buildings under construction.
     *
     * @returns {number} Queue size
     */
    getConstructionQueueSize: () => {
      return get().buildQueue.getQueueSize();
    },

    /**
     * Get economic history.
     *
     * @returns {Object} History data
     */
    getEconomicHistory: () => {
      return { ...get().economicHistory };
    },

    // ========================================================================
    // RESET AND CLEANUP
    // ========================================================================

    /**
     * Clear all economic state.
     * Use on game reset.
     */
    resetEconomy: () => {
      set((state) => {
        state.buildQueue.clear();
        state.pendingConstructions.clear();
        state.storageState = {
          currentUsage: {},
          maxCapacity: 0,
          isFull: false,
        };
        state.economicHistory = {
          buildingsCompleted: 0,
          itemsCrafted: 0,
          totalResourcesSpent: 0,
          buildingStartedAt: Date.now(),
        };
        return state;
      });
    },
  }))
);
