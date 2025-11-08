/**
 * Territory Store - useTerritory
 *
 * Manages all territory-related state and operations.
 * A territory represents a claimed region that the town controls.
 * Territory expands based on watchtowers, guard posts, fortresses, and castles.
 *
 * Key Responsibilities:
 * 1. Maintain territory boundaries and expansion state
 * 2. Track buildings within each territory
 * 3. Calculate and cache territory bonuses
 * 4. Manage territory center and radius
 * 5. Coordinate with Foundation Module for building queries
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  calculateMaxTerritoryRadius,
  validateExpansion,
  getExpansionRequirements,
} from '../utils/territoryValidator';
import { calculateTerritoryBonuses } from '../utils/bonusCalculator';

/**
 * Territory Store
 */
export const useTerritory = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Map of territory ID -> territory object
    territories: new Map(),

    // Current active territory ID
    activeTerritoryId: null,

    // Counter for unique IDs
    nextTerritoryId: 1,

    // Last calculation time (for cache invalidation)
    lastBonusCalculation: 0,

    // ========================================================================
    // TERRITORY CREATION AND MANAGEMENT
    // ========================================================================

    /**
     * Create a new territory
     * @param {string} name - Territory display name
     * @param {Object} center - Center position { x, y, z }
     * @returns {Object} The created territory
     */
    createTerritory: (name, center) => {
      set((state) => {
        const territoryId = `territory_${state.nextTerritoryId}`;
        state.nextTerritoryId += 1;

        const territory = {
          id: territoryId,
          name,
          center: { ...center },
          radius: 25, // Base radius
          maxRadius: 25,
          claimedAtTime: Date.now(),
          bonuses: {},
          buildingIds: [],
          active: true,
          needsRecalculation: true,
        };

        state.territories.set(territoryId, territory);

        // Set as active if first territory
        if (state.activeTerritoryId === null) {
          state.activeTerritoryId = territoryId;
        }

        return state;
      });

      return get().getTerritory(get().nextTerritoryId - 1);
    },

    /**
     * Get a specific territory
     * @param {string|number} id - Territory ID or numeric index
     * @returns {Object|null} Territory object or null
     */
    getTerritory: (id) => {
      const state = get();
      if (typeof id === 'number') {
        return Array.from(state.territories.values())[id] || null;
      }
      return state.territories.get(id) || null;
    },

    /**
     * Get all territories
     * @returns {Object[]} Array of all territories
     */
    getAllTerritories: () => {
      return Array.from(get().territories.values());
    },

    /**
     * Get the active territory
     * @returns {Object|null} Active territory or null
     */
    getActiveTerritory: () => {
      const state = get();
      if (!state.activeTerritoryId) return null;
      return state.territories.get(state.activeTerritoryId) || null;
    },

    /**
     * Set the active territory
     * @param {string} territoryId - Territory ID to activate
     */
    setActiveTerritory: (territoryId) => {
      set((state) => {
        if (state.territories.has(territoryId)) {
          state.activeTerritoryId = territoryId;
        }
        return state;
      });
    },

    /**
     * Delete a territory
     * @param {string} territoryId - Territory to delete
     */
    deleteTerritory: (territoryId) => {
      set((state) => {
        state.territories.delete(territoryId);
        if (state.activeTerritoryId === territoryId) {
          state.activeTerritoryId = state.territories.size > 0
            ? Array.from(state.territories.keys())[0]
            : null;
        }
        return state;
      });
    },

    // ========================================================================
    // TERRITORY EXPANSION
    // ========================================================================

    /**
     * Update territory bounds based on buildings
     * Called when buildings are added, completed, or destroyed
     * @param {string} territoryId - Territory to update
     * @param {Object[]} buildings - Buildings in this territory
     */
    updateTerritoryBounds: (territoryId, buildings) => {
      set((state) => {
        const territory = state.territories.get(territoryId);
        if (!territory) return state;

        // Calculate new max radius based on buildings
        const maxRadius = calculateMaxTerritoryRadius(buildings);
        territory.maxRadius = maxRadius;

        // Current radius can't exceed max
        if (territory.radius > maxRadius) {
          territory.radius = maxRadius;
        }

        territory.needsRecalculation = true;
        return state;
      });
    },

    /**
     * Attempt to expand territory radius
     * @param {string} territoryId - Territory to expand
     * @param {number} newRadius - Desired new radius
     * @param {Object[]} buildings - Buildings in territory
     * @returns {Object} Result { success: boolean, error?: string }
     */
    expandTerritory: (territoryId, newRadius, buildings) => {
      const territory = get().territories.get(territoryId);
      if (!territory) {
        return { success: false, error: 'Territory not found' };
      }

      // Validate expansion
      const validation = validateExpansion(territory, newRadius, buildings);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      set((state) => {
        const terr = state.territories.get(territoryId);
        if (terr) {
          terr.radius = newRadius;
          terr.needsRecalculation = true;
        }
        return state;
      });

      return { success: true };
    },

    /**
     * Get expansion requirements for a target radius
     * @param {string} territoryId - Territory to check
     * @param {number} targetRadius - Target radius
     * @param {Object[]} currentBuildings - Current buildings
     * @returns {Object} Requirements and recommendations
     */
    getExpansionPath: (territoryId, targetRadius, currentBuildings) => {
      const territory = get().territories.get(territoryId);
      if (!territory) return null;

      return getExpansionRequirements(targetRadius, currentBuildings);
    },

    // ========================================================================
    // BUILDING MANAGEMENT WITHIN TERRITORY
    // ========================================================================

    /**
     * Add a building to a territory
     * @param {string} territoryId - Territory to add building to
     * @param {string} buildingId - Building ID to add
     */
    addBuildingToTerritory: (territoryId, buildingId) => {
      set((state) => {
        const territory = state.territories.get(territoryId);
        if (territory && !territory.buildingIds.includes(buildingId)) {
          territory.buildingIds.push(buildingId);
          territory.needsRecalculation = true;
        }
        return state;
      });
    },

    /**
     * Remove a building from a territory
     * @param {string} territoryId - Territory to remove from
     * @param {string} buildingId - Building ID to remove
     */
    removeBuildingFromTerritory: (territoryId, buildingId) => {
      set((state) => {
        const territory = state.territories.get(territoryId);
        if (territory) {
          territory.buildingIds = territory.buildingIds.filter((id) => id !== buildingId);
          territory.needsRecalculation = true;
        }
        return state;
      });
    },

    /**
     * Get all building IDs in a territory
     * @param {string} territoryId - Territory to query
     * @returns {string[]} Array of building IDs
     */
    getTerritoryBuildingIds: (territoryId) => {
      const territory = get().territories.get(territoryId);
      return territory ? territory.buildingIds : [];
    },

    // ========================================================================
    // BONUS MANAGEMENT
    // ========================================================================

    /**
     * Recalculate bonuses for a territory
     * Called when buildings change or are completed
     * @param {string} territoryId - Territory to recalculate
     * @param {Object[]} buildings - Buildings in territory
     */
    recalculateBonuses: (territoryId, buildings) => {
      set((state) => {
        const territory = state.territories.get(territoryId);
        if (!territory) return state;

        // Only recalculate if needed
        const territoryBuildings = buildings.filter((b) => territory.buildingIds.includes(b.id));
        territory.bonuses = calculateTerritoryBonuses(territoryBuildings);
        territory.needsRecalculation = false;
        state.lastBonusCalculation = Date.now();

        return state;
      });
    },

    /**
     * Get bonuses for a territory
     * @param {string} territoryId - Territory to query
     * @returns {Object} Territory bonuses
     */
    getTerritoryBonuses: (territoryId) => {
      const territory = get().territories.get(territoryId);
      return territory ? territory.bonuses : {};
    },

    /**
     * Get a specific bonus value
     * @param {string} territoryId - Territory to query
     * @param {string} bonusType - Type of bonus to get
     * @returns {number} Bonus value
     */
    getBonusValue: (territoryId, bonusType) => {
      const bonuses = get().getTerritoryBonuses(territoryId);
      return bonuses[bonusType] || 0;
    },

    // ========================================================================
    // TERRITORY STATISTICS
    // ========================================================================

    /**
     * Get territory info for UI display
     * @param {string} territoryId - Territory to query
     * @returns {Object} Territory info object
     */
    getTerritoryInfo: (territoryId) => {
      const territory = get().territories.get(territoryId);
      if (!territory) return null;

      return {
        id: territory.id,
        name: territory.name,
        radius: territory.radius,
        maxRadius: territory.maxRadius,
        radiusPercentage: Math.round((territory.radius / territory.maxRadius) * 100),
        center: territory.center,
        buildingCount: territory.buildingIds.length,
        bonusCount: Object.keys(territory.bonuses).length,
        needsRecalculation: territory.needsRecalculation,
      };
    },

    /**
     * Check if territory needs bonus recalculation
     * @param {string} territoryId - Territory to check
     * @returns {boolean} True if recalculation needed
     */
    needsRecalculation: (territoryId) => {
      const territory = get().territories.get(territoryId);
      return territory ? territory.needsRecalculation : false;
    },

    // ========================================================================
    // PERSISTENCE
    // ========================================================================

    /**
     * Get state for saving
     * @returns {Object} Serializable state
     */
    getState: () => {
      const state = get();
      return {
        territories: Array.from(state.territories.values()),
        activeTerritoryId: state.activeTerritoryId,
        nextTerritoryId: state.nextTerritoryId,
      };
    },

    /**
     * Load state from saved data
     * @param {Object} savedState - Saved state object
     */
    loadState: (savedState) => {
      set((state) => {
        state.territories = new Map(
          savedState.territories.map((t) => [t.id, t])
        );
        state.activeTerritoryId = savedState.activeTerritoryId;
        state.nextTerritoryId = savedState.nextTerritoryId;
        return state;
      });
    },

    /**
     * Clear all territories
     */
    reset: () => {
      set((state) => {
        state.territories = new Map();
        state.activeTerritoryId = null;
        state.nextTerritoryId = 1;
        state.lastBonusCalculation = 0;
        return state;
      });
    },

    /**
     * Clean up all references to a deleted building in territories.
     * Called when Foundation removes a building to prevent orphaned references.
     *
     * @param {string} buildingId - The building ID being deleted
     */
    cleanupDeletedBuilding: (buildingId) => {
      set((state) => {
        // Remove building from all territories
        Array.from(state.territories.values()).forEach((territory) => {
          if (territory.buildingIds && territory.buildingIds.includes(buildingId)) {
            territory.buildingIds = territory.buildingIds.filter(id => id !== buildingId);
          }

          // Recalculate territory bonuses after building removal
          state.lastBonusCalculation = 0; // Trigger recalculation
        });

        return state;
      });
    },
  }))
);
