/**
 * Progression System Store - useProgressionSystem
 *
 * Manages game progression, victory conditions, and achievements.
 * Tracks player progress toward various win conditions and milestones.
 *
 * Key Responsibilities:
 * 1. Track victory condition progress
 * 2. Unlock upgrades and buildings as conditions are met
 * 3. Manage achievements and milestones
 * 4. Coordinate progression across modules
 * 5. Determine game ending conditions
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { VICTORY_CONDITION_TYPES } from '../types/index';

// Default victory conditions
const DEFAULT_VICTORY_CONDITIONS = {
  basic_settlement: {
    id: 'basic_settlement',
    type: VICTORY_CONDITION_TYPES.BUILDING_COUNT,
    description: 'Build 10 structures',
    requirements: { buildingCount: 10 },
    completed: false,
    progress: 0,
    reward: 'unlock_town_upgrades',
  },
  growing_population: {
    id: 'growing_population',
    type: VICTORY_CONDITION_TYPES.POPULATION,
    description: 'Reach 50 NPCs',
    requirements: { population: 50 },
    completed: false,
    progress: 0,
    reward: 'population_milestone_1',
  },
  expanded_territory: {
    id: 'expanded_territory',
    type: VICTORY_CONDITION_TYPES.TERRITORY_SIZE,
    description: 'Expand territory to 50 cells radius',
    requirements: { territoryRadius: 50 },
    completed: false,
    progress: 0,
    reward: 'unlock_fortress',
  },
  fortress_standing: {
    id: 'fortress_standing',
    type: VICTORY_CONDITION_TYPES.BUILDING_COUNT,
    description: 'Build a Fortress',
    requirements: { buildingType: 'FORTRESS' },
    completed: false,
    progress: 0,
    reward: 'unlock_castle',
  },
  prosperous_town: {
    id: 'prosperous_town',
    type: VICTORY_CONDITION_TYPES.UPGRADES_COMPLETED,
    description: 'Complete 5 town upgrades',
    requirements: { upgradesCompleted: 5 },
    completed: false,
    progress: 0,
    reward: 'prosperity_milestone',
  },
  mighty_castle: {
    id: 'mighty_castle',
    type: VICTORY_CONDITION_TYPES.CASTLE_BUILD,
    description: 'Build a Castle',
    requirements: { buildingType: 'CASTLE' },
    completed: false,
    progress: 100,
    reward: 'victory_condition_met',
  },
};

const DEFAULT_UNLOCKED_UPGRADES = ['city_wall', 'better_marketplace'];
const DEFAULT_ACHIEVEMENTS = {};

/**
 * Progression System Store
 */
export const useProgressionSystem = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Map of victory condition ID -> condition object
    victoryConditions: new Map(Object.entries(DEFAULT_VICTORY_CONDITIONS)),

    // Set of unlocked upgrade IDs
    unlockedUpgrades: new Set(DEFAULT_UNLOCKED_UPGRADES),

    // Map of achievement ID -> achievement object
    achievements: new Map(Object.entries(DEFAULT_ACHIEVEMENTS)),

    // Current game state (playing, won, lost)
    gameState: 'playing', // 'playing', 'won', 'lost'

    // Total playtime in seconds
    totalPlaytime: 0,

    // Last progression check time
    lastProgressionCheck: 0,

    // ========================================================================
    // VICTORY CONDITION TRACKING
    // ========================================================================

    /**
     * Get all victory conditions
     * @returns {Object[]} Array of victory condition objects
     */
    getVictoryConditions: () => {
      return Array.from(get().victoryConditions.values());
    },

    /**
     * Get a specific victory condition
     * @param {string} conditionId - Condition ID
     * @returns {Object|null} Victory condition or null
     */
    getVictoryCondition: (conditionId) => {
      return get().victoryConditions.get(conditionId) || null;
    },

    /**
     * Update progress for a victory condition
     * @param {string} conditionId - Condition ID
     * @param {number} progress - Progress value (0-100)
     */
    updateConditionProgress: (conditionId, progress) => {
      set((state) => {
        const condition = state.victoryConditions.get(conditionId);
        if (condition) {
          condition.progress = Math.min(100, Math.max(0, progress));
          // Auto-complete if progress reaches 100
          if (condition.progress >= 100 && !condition.completed) {
            condition.completed = true;
            // Unlock any rewards
            if (condition.reward) {
              get().applyReward(condition.reward);
            }
          }
        }
        return state;
      });
    },

    /**
     * Mark a victory condition as completed
     * @param {string} conditionId - Condition ID
     */
    completeVictoryCondition: (conditionId) => {
      set((state) => {
        const condition = state.victoryConditions.get(conditionId);
        if (condition) {
          condition.completed = true;
          condition.progress = 100;
          // Apply reward
          if (condition.reward) {
            get().applyReward(condition.reward);
          }
        }
        state.lastProgressionCheck = Date.now();
        return state;
      });
    },

    /**
     * Check and update all victory conditions
     * Called when game state changes
     * @param {Object} gameData - Current game state
     */
    checkVictoryConditions: (gameData) => {
      const {
        buildings = [],
        npcs = [],
        territoryRadius = 0,
        upgrades = [],
      } = gameData;

      set((state) => {
        // Check basic settlement (10 buildings)
        if (buildings.length >= 10) {
          const condition = state.victoryConditions.get('basic_settlement');
          if (condition && !condition.completed) {
            condition.completed = true;
            condition.progress = 100;
            get().applyReward(condition.reward);
          }
        }

        // Check growing population (50 NPCs)
        const populationProgress = Math.min(100, (npcs.length / 50) * 100);
        const popCondition = state.victoryConditions.get('growing_population');
        if (popCondition) {
          popCondition.progress = populationProgress;
          if (npcs.length >= 50 && !popCondition.completed) {
            popCondition.completed = true;
            get().applyReward(popCondition.reward);
          }
        }

        // Check expanded territory (50 cell radius)
        const territoryProgress = Math.min(100, (territoryRadius / 50) * 100);
        const terrCondition = state.victoryConditions.get('expanded_territory');
        if (terrCondition) {
          terrCondition.progress = territoryProgress;
          if (territoryRadius >= 50 && !terrCondition.completed) {
            terrCondition.completed = true;
            get().applyReward(terrCondition.reward);
          }
        }

        // Check fortress standing
        const hasFortress = buildings.some((b) => b.type === 'FORTRESS' && b.status === 'COMPLETE');
        if (hasFortress) {
          const fortressCondition = state.victoryConditions.get('fortress_standing');
          if (fortressCondition && !fortressCondition.completed) {
            fortressCondition.completed = true;
            fortressCondition.progress = 100;
            get().applyReward(fortressCondition.reward);
          }
        }

        // Check castle (ultimate victory)
        const hasCastle = buildings.some((b) => b.type === 'CASTLE' && b.status === 'COMPLETE');
        if (hasCastle) {
          const castleCondition = state.victoryConditions.get('mighty_castle');
          if (castleCondition && !castleCondition.completed) {
            castleCondition.completed = true;
            castleCondition.progress = 100;
            state.gameState = 'won';
            get().applyReward(castleCondition.reward);
          }
        }

        state.lastProgressionCheck = Date.now();
        return state;
      });
    },

    /**
     * Get completion percentage of all victory conditions
     * @returns {number} Percentage (0-100)
     */
    getOverallProgress: () => {
      const conditions = get().getVictoryConditions();
      if (conditions.length === 0) return 0;
      const totalProgress = conditions.reduce((sum, c) => sum + c.progress, 0);
      return Math.round(totalProgress / conditions.length);
    },

    /**
     * Get completed victory conditions
     * @returns {Object[]} Array of completed conditions
     */
    getCompletedConditions: () => {
      return get()
        .getVictoryConditions()
        .filter((c) => c.completed);
    },

    // ========================================================================
    // UNLOCKS AND REWARDS
    // ========================================================================

    /**
     * Unlock an upgrade
     * @param {string} upgradeId - Upgrade ID to unlock
     */
    unlockUpgrade: (upgradeId) => {
      set((state) => {
        state.unlockedUpgrades.add(upgradeId);
        return state;
      });
    },

    /**
     * Check if an upgrade is unlocked
     * @param {string} upgradeId - Upgrade ID
     * @returns {boolean} True if unlocked
     */
    isUpgradeUnlocked: (upgradeId) => {
      return get().unlockedUpgrades.has(upgradeId);
    },

    /**
     * Get all unlocked upgrades
     * @returns {string[]} Array of upgrade IDs
     */
    getUnlockedUpgrades: () => {
      return Array.from(get().unlockedUpgrades);
    },

    /**
     * Apply a reward from a victory condition
     * @param {string} rewardId - Reward identifier
     */
    applyReward: (rewardId) => {
      set((state) => {
        // Map reward IDs to unlock actions
        const rewards = {
          unlock_town_upgrades: () => {
            get().unlockUpgrade('fortified_defense');
            get().unlockUpgrade('prosperity_initiative');
          },
          unlock_fortress: () => {
            // Fortress is usually available earlier
          },
          unlock_castle: () => {
            get().unlockUpgrade('mighty_castle');
          },
          population_milestone_1: () => {
            // Award achievement or bonus
          },
          prosperity_milestone: () => {
            // Award achievement or bonus
          },
          victory_condition_met: () => {
            state.gameState = 'won';
          },
        };

        if (rewards[rewardId]) {
          rewards[rewardId]();
        }

        return state;
      });
    },

    // ========================================================================
    // ACHIEVEMENTS
    // ========================================================================

    /**
     * Award an achievement
     * @param {string} achievementId - Achievement ID
     * @param {string} name - Achievement name
     * @param {string} description - Achievement description
     */
    awardAchievement: (achievementId, name, description) => {
      set((state) => {
        if (!state.achievements.has(achievementId)) {
          state.achievements.set(achievementId, {
            id: achievementId,
            name,
            description,
            unlockedAt: Date.now(),
          });
        }
        return state;
      });
    },

    /**
     * Get all achievements
     * @returns {Object[]} Array of achievements
     */
    getAchievements: () => {
      return Array.from(get().achievements.values());
    },

    /**
     * Check if achievement is unlocked
     * @param {string} achievementId - Achievement ID
     * @returns {boolean} True if unlocked
     */
    hasAchievement: (achievementId) => {
      return get().achievements.has(achievementId);
    },

    // ========================================================================
    // GAME STATE
    // ========================================================================

    /**
     * Get current game state
     * @returns {string} Game state (playing, won, lost)
     */
    getGameState: () => {
      return get().gameState;
    },

    /**
     * Check if player has won
     * @returns {boolean} True if game is won
     */
    hasWon: () => {
      return get().gameState === 'won';
    },

    /**
     * End game as win
     */
    winGame: () => {
      set((state) => {
        state.gameState = 'won';
        return state;
      });
    },

    /**
     * Update total playtime
     * @param {number} seconds - Seconds to add
     */
    updatePlaytime: (seconds) => {
      set((state) => {
        state.totalPlaytime += seconds;
        return state;
      });
    },

    /**
     * Get total playtime
     * @returns {number} Playtime in seconds
     */
    getPlaytime: () => {
      return get().totalPlaytime;
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
        victoryConditions: Array.from(state.victoryConditions.values()),
        unlockedUpgrades: Array.from(state.unlockedUpgrades),
        achievements: Array.from(state.achievements.values()),
        gameState: state.gameState,
        totalPlaytime: state.totalPlaytime,
      };
    },

    /**
     * Load state from saved data
     * @param {Object} savedState - Saved state object
     */
    loadState: (savedState) => {
      set((state) => {
        state.victoryConditions = new Map(
          savedState.victoryConditions.map((c) => [c.id, c])
        );
        state.unlockedUpgrades = new Set(savedState.unlockedUpgrades);
        state.achievements = new Map(
          savedState.achievements.map((a) => [a.id, a])
        );
        state.gameState = savedState.gameState;
        state.totalPlaytime = savedState.totalPlaytime;
        return state;
      });
    },

    /**
     * Reset progression
     */
    reset: () => {
      set((state) => {
        state.victoryConditions = new Map(Object.entries(DEFAULT_VICTORY_CONDITIONS));
        state.unlockedUpgrades = new Set(DEFAULT_UNLOCKED_UPGRADES);
        state.achievements = new Map();
        state.gameState = 'playing';
        state.totalPlaytime = 0;
        state.lastProgressionCheck = 0;
        return state;
      });
    },
  }))
);
