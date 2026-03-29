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
 *
 * NOTE: Town upgrade definitions are now imported from shared/config.js
 * to maintain a single source of truth across all modules.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { calculateTownStatistics, calculateTownLevel } from '../utils/bonusCalculator';
import { TOWN_UPGRADES } from '../../../shared/config';

/**
 * Initialize town upgrades with completion status
 * Adds 'completed' flag to upgrades from shared config
 */
function initializeUpgrades() {
  const upgrades = {};
  for (const [key, upgrade] of Object.entries(TOWN_UPGRADES)) {
    upgrades[key] = {
      ...upgrade,
      completed: false,  // Track completion status per town
    };
  }
  return upgrades;
}

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
          upgrades: initializeUpgrades(),
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
     * Start an upgrade (deduct costs handled by caller)
     * @param {string} townId - Town ID
     * @param {string} upgradeId - Upgrade ID to start
     * @param {Object[]} buildings - Current buildings for requirement check
     * @returns {Object} Result { success, error?, costs? }
     */
    startUpgrade: (townId, upgradeId, buildings) => {
      const town = get().towns.get(townId);
      if (!town) return { success: false, error: 'Town not found' };

      const upgrade = town.upgrades[upgradeId];
      if (!upgrade) return { success: false, error: 'Upgrade not found' };
      if (upgrade.completed) return { success: false, error: 'Already completed' };
      if (upgrade.inProgress) return { success: false, error: 'Already in progress' };

      // Check requirements
      const availability = get().isUpgradeAvailable(townId, upgradeId, buildings);
      if (!availability.available) {
        return { success: false, error: availability.missing.join(', ') };
      }

      set((state) => {
        const t = state.towns.get(townId);
        if (t) {
          t.upgrades[upgradeId].inProgress = true;
          t.upgrades[upgradeId].startedAt = Date.now();
          t.updatedAt = Date.now();
        }
        return state;
      });

      return { success: true, costs: upgrade.costs };
    },

    /**
     * Update upgrade progress (call each game tick)
     * @param {string} townId - Town ID
     * @param {number} deltaTime - Seconds elapsed since last tick
     * @returns {string[]} Array of upgrade IDs that completed this tick
     */
    updateUpgradeProgress: (townId, deltaTime) => {
      const town = get().towns.get(townId);
      if (!town) return [];

      const completed = [];
      const now = Date.now();

      for (const [upgradeId, upgrade] of Object.entries(town.upgrades)) {
        if (!upgrade.inProgress || upgrade.completed) continue;

        const elapsed = (now - upgrade.startedAt) / 1000;
        if (elapsed >= upgrade.buildTime) {
          get().completeUpgrade(townId, upgradeId);
          completed.push(upgradeId);
        }
      }

      return completed;
    },

    /**
     * Get progress of an in-progress upgrade (0 to 1)
     * @param {string} townId - Town ID
     * @param {string} upgradeId - Upgrade ID
     * @returns {number} Progress 0-1, or 1 if completed, 0 if not started
     */
    getUpgradeProgress: (townId, upgradeId) => {
      const town = get().towns.get(townId);
      if (!town) return 0;

      const upgrade = town.upgrades[upgradeId];
      if (!upgrade) return 0;
      if (upgrade.completed) return 1;
      if (!upgrade.inProgress) return 0;

      const elapsed = (Date.now() - upgrade.startedAt) / 1000;
      return Math.min(1, elapsed / upgrade.buildTime);
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
