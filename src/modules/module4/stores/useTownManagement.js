/**
 * Town Management Store - useTownManagement
 *
 * Manages town-level state including upgrades, statistics, and improvements.
 * A town is built within a territory and has upgrades that enhance functionality.
 *
 * Key Responsibilities:
 * 1. Maintain town statistics (population, happiness, defense)
 * 2. Track town upgrades and their status
 * 3. Manage aesthetic improvements
 * 4. Coordinate with other modules for compound effects
 * 5. Provide aggregated town data for UI and gameplay
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { calculateTownStatistics, calculateTownLevel } from '../utils/bonusCalculator';
import { TOWN_UPGRADE_TYPES } from '../types/index';

// Default available upgrades for towns
const DEFAULT_UPGRADES = {
  city_wall: {
    id: 'city_wall',
    name: 'City Wall',
    type: TOWN_UPGRADE_TYPES.DEFENSIVE,
    completed: false,
    tier: 1,
    requirements: { buildingCount: 5 },
    effects: { defense: 10 },
    buildTime: 60,
  },
  better_marketplace: {
    id: 'better_marketplace',
    name: 'Better Marketplace',
    type: TOWN_UPGRADE_TYPES.FUNCTIONAL,
    completed: false,
    tier: 2,
    requirements: { buildingCount: 10, buildingType: 'MARKETPLACE' },
    effects: { prosperity: 15 },
    buildTime: 90,
  },
  monument_construction: {
    id: 'monument_construction',
    name: 'Monument Construction',
    type: TOWN_UPGRADE_TYPES.COSMETIC,
    completed: false,
    tier: 2,
    requirements: { buildingCount: 15 },
    effects: { happiness: 10 },
    buildTime: 120,
  },
  fortified_defense: {
    id: 'fortified_defense',
    name: 'Fortified Defense',
    type: TOWN_UPGRADE_TYPES.DEFENSIVE,
    completed: false,
    tier: 3,
    requirements: { buildingCount: 20, defensiveBuildings: 5 },
    effects: { defense: 20 },
    buildTime: 150,
  },
  prosperity_initiative: {
    id: 'prosperity_initiative',
    name: 'Prosperity Initiative',
    type: TOWN_UPGRADE_TYPES.FUNCTIONAL,
    completed: false,
    tier: 3,
    requirements: { buildingCount: 25, prosperity: 50 },
    effects: { prosperity: 25, happiness: 5 },
    buildTime: 180,
  },
};

/**
 * Town Management Store
 */
export const useTownManagement = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Map of town ID -> town object
    towns: new Map(),

    // Current active town ID
    activeTownId: null,

    // Counter for unique town IDs
    nextTownId: 1,

    // Last statistics update time
    lastStatsUpdate: 0,

    // ========================================================================
    // TOWN CREATION AND MANAGEMENT
    // ========================================================================

    /**
     * Create a new town in a territory
     * @param {string} name - Town display name
     * @param {string} territoryId - Associated territory ID
     * @returns {Object} The created town
     */
    createTown: (name, territoryId) => {
      set((state) => {
        const townId = `town_${state.nextTownId}`;
        state.nextTownId += 1;

        const town = {
          id: townId,
          name,
          territoryId,
          statistics: {
            population: 0,
            happiness: 50,
            defense: 50,
            prosperity: 0,
            productionRate: 1,
            totalBuildingCount: 0,
            buildingCounts: {},
            populationCapacity: 0,
          },
          upgrades: { ...DEFAULT_UPGRADES },
          aesthetics: {
            elementCount: 0,
            aestheticRating: 0,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          level: 1,
          needsStatsUpdate: true,
        };

        state.towns.set(townId, town);

        // Set as active if first town
        if (state.activeTownId === null) {
          state.activeTownId = townId;
        }

        return state;
      });

      return get().getTown(get().nextTownId - 1);
    },

    /**
     * Get a specific town
     * @param {string|number} id - Town ID or numeric index
     * @returns {Object|null} Town object or null
     */
    getTown: (id) => {
      const state = get();
      if (typeof id === 'number') {
        return Array.from(state.towns.values())[id] || null;
      }
      return state.towns.get(id) || null;
    },

    /**
     * Get all towns
     * @returns {Object[]} Array of all towns
     */
    getAllTowns: () => {
      return Array.from(get().towns.values());
    },

    /**
     * Get the active town
     * @returns {Object|null} Active town or null
     */
    getActiveTown: () => {
      const state = get();
      if (!state.activeTownId) return null;
      return state.towns.get(state.activeTownId) || null;
    },

    /**
     * Set the active town
     * @param {string} townId - Town ID to activate
     */
    setActiveTown: (townId) => {
      set((state) => {
        if (state.towns.has(townId)) {
          state.activeTownId = townId;
        }
        return state;
      });
    },

    /**
     * Delete a town
     * @param {string} townId - Town to delete
     */
    deleteTown: (townId) => {
      set((state) => {
        state.towns.delete(townId);
        if (state.activeTownId === townId) {
          state.activeTownId = state.towns.size > 0
            ? Array.from(state.towns.keys())[0]
            : null;
        }
        return state;
      });
    },

    // ========================================================================
    // TOWN STATISTICS
    // ========================================================================

    /**
     * Update town statistics based on buildings and NPCs
     * @param {string} townId - Town to update
     * @param {Object[]} buildings - Buildings in town
     * @param {Object[]} npcs - NPCs in town
     */
    updateTownStatistics: (townId, buildings, npcs) => {
      set((state) => {
        const town = state.towns.get(townId);
        if (!town) return state;

        const stats = calculateTownStatistics(buildings, npcs, town.upgrades);
        town.statistics = stats;
        town.level = calculateTownLevel(stats);
        town.needsStatsUpdate = false;
        town.updatedAt = Date.now();
        state.lastStatsUpdate = Date.now();

        return state;
      });
    },

    /**
     * Get town statistics
     * @param {string} townId - Town to query
     * @returns {Object} Town statistics
     */
    getTownStatistics: (townId) => {
      const town = get().towns.get(townId);
      return town ? town.statistics : null;
    },

    /**
     * Get town level
     * @param {string} townId - Town to query
     * @returns {number} Town level (1-10)
     */
    getTownLevel: (townId) => {
      const town = get().towns.get(townId);
      return town ? town.level : 1;
    },

    /**
     * Mark that statistics need updating
     * @param {string} townId - Town to mark
     */
    markStatsForUpdate: (townId) => {
      set((state) => {
        const town = state.towns.get(townId);
        if (town) {
          town.needsStatsUpdate = true;
        }
        return state;
      });
    },

    // ========================================================================
    // TOWN UPGRADES
    // ========================================================================

    /**
     * Get all available upgrades for a town
     * @param {string} townId - Town to query
     * @returns {Object} Upgrades map
     */
    getTownUpgrades: (townId) => {
      const town = get().towns.get(townId);
      return town ? town.upgrades : {};
    },

    /**
     * Get a specific upgrade
     * @param {string} townId - Town ID
     * @param {string} upgradeId - Upgrade ID
     * @returns {Object|null} Upgrade object or null
     */
    getUpgrade: (townId, upgradeId) => {
      const town = get().towns.get(townId);
      return town && town.upgrades[upgradeId] ? town.upgrades[upgradeId] : null;
    },

    /**
     * Complete an upgrade
     * @param {string} townId - Town ID
     * @param {string} upgradeId - Upgrade ID to complete
     * @returns {Object} Result { success: boolean, error?: string }
     */
    completeUpgrade: (townId, upgradeId) => {
      const town = get().towns.get(townId);
      if (!town) {
        return { success: false, error: 'Town not found' };
      }

      const upgrade = town.upgrades[upgradeId];
      if (!upgrade) {
        return { success: false, error: 'Upgrade not found' };
      }

      if (upgrade.completed) {
        return { success: false, error: 'Upgrade already completed' };
      }

      set((state) => {
        const t = state.towns.get(townId);
        if (t) {
          t.upgrades[upgradeId].completed = true;
          t.updatedAt = Date.now();
          t.needsStatsUpdate = true;
        }
        return state;
      });

      return { success: true };
    },

    /**
     * Check if an upgrade is available (requirements met)
     * @param {string} townId - Town ID
     * @param {string} upgradeId - Upgrade ID
     * @param {Object[]} buildings - Current buildings
     * @returns {Object} { available: boolean, missing?: string[] }
     */
    isUpgradeAvailable: (townId, upgradeId, buildings) => {
      const town = get().towns.get(townId);
      if (!town) return { available: false, missing: ['Town not found'] };

      const upgrade = town.upgrades[upgradeId];
      if (!upgrade) return { available: false, missing: ['Upgrade not found'] };

      if (upgrade.completed) {
        return { available: false, missing: ['Already completed'] };
      }

      const missing = [];
      const { buildingCount, buildingType, defensiveBuildings } = upgrade.requirements;

      if (buildingCount && buildings.length < buildingCount) {
        missing.push(`Need ${buildingCount} buildings (have ${buildings.length})`);
      }

      if (buildingType) {
        const count = buildings.filter((b) => b.type === buildingType).length;
        if (count === 0) {
          missing.push(`Need ${buildingType}`);
        }
      }

      if (defensiveBuildings) {
        const defensive = ['WALL', 'TOWER', 'WATCHTOWER', 'GUARD_POST', 'FORTRESS', 'CASTLE'];
        const count = buildings.filter((b) => defensive.includes(b.type)).length;
        if (count < defensiveBuildings) {
          missing.push(`Need ${defensiveBuildings} defensive buildings (have ${count})`);
        }
      }

      return {
        available: missing.length === 0,
        missing: missing.length > 0 ? missing : undefined,
      };
    },

    /**
     * Get all completed upgrades
     * @param {string} townId - Town ID
     * @returns {Object[]} Array of completed upgrades
     */
    getCompletedUpgrades: (townId) => {
      const town = get().towns.get(townId);
      if (!town) return [];

      return Object.values(town.upgrades).filter((u) => u.completed);
    },

    // ========================================================================
    // AESTHETICS
    // ========================================================================

    /**
     * Update aesthetic rating for town
     * @param {string} townId - Town to update
     * @param {number} rating - New aesthetic rating (0-100)
     */
    updateAestheticRating: (townId, rating) => {
      set((state) => {
        const town = state.towns.get(townId);
        if (town) {
          town.aesthetics.aestheticRating = Math.min(100, Math.max(0, rating));
        }
        return state;
      });
    },

    /**
     * Add an aesthetic element
     * @param {string} townId - Town ID
     * @param {string} elementId - Element ID
     */
    addAestheticElement: (townId, elementId) => {
      set((state) => {
        const town = state.towns.get(townId);
        if (town) {
          town.aesthetics.elementCount += 1;
        }
        return state;
      });
    },

    /**
     * Remove an aesthetic element
     * @param {string} townId - Town ID
     * @param {string} elementId - Element ID
     */
    removeAestheticElement: (townId, elementId) => {
      set((state) => {
        const town = state.towns.get(townId);
        if (town && town.aesthetics.elementCount > 0) {
          town.aesthetics.elementCount -= 1;
        }
        return state;
      });
    },

    /**
     * Get aesthetic info
     * @param {string} townId - Town ID
     * @returns {Object} Aesthetic data
     */
    getAestheticInfo: (townId) => {
      const town = get().towns.get(townId);
      return town ? town.aesthetics : null;
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
        towns: Array.from(state.towns.values()),
        activeTownId: state.activeTownId,
        nextTownId: state.nextTownId,
      };
    },

    /**
     * Load state from saved data
     * @param {Object} savedState - Saved state object
     */
    loadState: (savedState) => {
      set((state) => {
        state.towns = new Map(
          savedState.towns.map((t) => [t.id, t])
        );
        state.activeTownId = savedState.activeTownId;
        state.nextTownId = savedState.nextTownId;
        return state;
      });
    },

    /**
     * Clear all towns
     */
    reset: () => {
      set((state) => {
        state.towns = new Map();
        state.activeTownId = null;
        state.nextTownId = 1;
        state.lastStatsUpdate = 0;
        return state;
      });
    },
  }))
);
