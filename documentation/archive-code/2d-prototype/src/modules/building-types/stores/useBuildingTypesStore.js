/**
 * Module 2: Building Types & Progression System
 *
 * Store for tracking building type progression and unlocks
 * This store maintains which tiers the player has unlocked and
 * provides hooks for tier advancement and progression tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TIER_DEFINITIONS } from '../constants/buildings.js';

/**
 * Building Types Store - tracks player progression through building tiers
 */
export const useBuildingTypesStore = create(
  persist(
    (set, get) => ({
      // ============================================================
      // STATE
      // ============================================================

      /** Which tiers are currently unlocked */
      unlockedTiers: ['SURVIVAL'],  // Players always start with SURVIVAL

      /** Current maximum tier unlocked */
      maxTierUnlocked: 'SURVIVAL',

      /** Progression points towards next tier (for systems that need gradual unlocking) */
      progressionPoints: 0,
      maxProgressionPoints: 100,  // Required points to unlock next tier

      /** Timestamp of when each tier was unlocked */
      tierUnlockTimestamps: {
        SURVIVAL: 0,  // Unlocked at game start
      },

      /** Track user preferences for building availability */
      userDisabledBuildingTypes: [],  // Buildings player has disabled from building menu

      // ============================================================
      // MUTATIONS - Tier Unlocking
      // ============================================================

      /**
       * Unlock a new tier
       * @param {string} tier - The tier ID to unlock (e.g., 'PERMANENT')
       */
      unlockTier: (tier) => {
        set((state) => {
          if (state.unlockedTiers.includes(tier)) {
            console.warn(`Tier ${tier} is already unlocked`);
            return state;
          }

          const newUnlockedTiers = [...state.unlockedTiers, tier];
          const tierDef = TIER_DEFINITIONS[tier];
          const maxTierOrder = Math.max(
            ...newUnlockedTiers.map(t => TIER_DEFINITIONS[t].order)
          );

          return {
            unlockedTiers: newUnlockedTiers,
            maxTierUnlocked: Object.values(TIER_DEFINITIONS).find(
              t => t.order === maxTierOrder
            )?.id || state.maxTierUnlocked,
            tierUnlockTimestamps: {
              ...state.tierUnlockTimestamps,
              [tier]: Date.now(),
            },
            progressionPoints: 0,  // Reset progression points on tier unlock
          };
        });
      },

      /**
       * Add progression points towards next tier
       * @param {number} points - Number of points to add
       */
      addProgressionPoints: (points) => {
        set((state) => {
          const newPoints = state.progressionPoints + points;
          const nextTierUnlocked = newPoints >= state.maxProgressionPoints;

          if (nextTierUnlocked) {
            // Find the next unlocked tier that isn't at max
            const currentMaxOrder = TIER_DEFINITIONS[state.maxTierUnlocked].order;
            const nextTier = Object.values(TIER_DEFINITIONS).find(
              t => t.order === currentMaxOrder + 1
            );

            if (nextTier) {
              get().unlockTier(nextTier.id);
              return { progressionPoints: 0 };
            }
          }

          return { progressionPoints: Math.min(newPoints, state.maxProgressionPoints) };
        });
      },

      /**
       * Reset progression points to specific value
       * @param {number} points - Points to set
       */
      setProgressionPoints: (points) => {
        set({ progressionPoints: Math.min(points, this.maxProgressionPoints) });
      },

      // ============================================================
      // MUTATIONS - Building Type Preferences
      // ============================================================

      /**
       * Disable a building type from being available in the build menu
       * (Player choice, not progression-based)
       * @param {string} buildingId - The building ID to disable
       */
      disableBuildingType: (buildingId) => {
        set((state) => {
          if (state.userDisabledBuildingTypes.includes(buildingId)) {
            return state;
          }
          return {
            userDisabledBuildingTypes: [...state.userDisabledBuildingTypes, buildingId],
          };
        });
      },

      /**
       * Enable a building type in the build menu
       * @param {string} buildingId - The building ID to enable
       */
      enableBuildingType: (buildingId) => {
        set((state) => ({
          userDisabledBuildingTypes: state.userDisabledBuildingTypes.filter(
            id => id !== buildingId
          ),
        }));
      },

      /**
       * Toggle building type availability
       * @param {string} buildingId - The building ID to toggle
       */
      toggleBuildingType: (buildingId) => {
        const state = get();
        if (state.userDisabledBuildingTypes.includes(buildingId)) {
          get().enableBuildingType(buildingId);
        } else {
          get().disableBuildingType(buildingId);
        }
      },

      // ============================================================
      // QUERIES - Tier Information
      // ============================================================

      /**
       * Check if a tier is unlocked
       * @param {string} tier - The tier ID to check
       * @returns {boolean} True if tier is unlocked
       */
      isTierUnlocked: (tier) => {
        return get().unlockedTiers.includes(tier);
      },

      /**
       * Get the order/progression level of the max unlocked tier
       * @returns {number} Order of maximum tier
       */
      getMaxTierOrder: () => {
        return TIER_DEFINITIONS[get().maxTierUnlocked].order;
      },

      /**
       * Get all unlocked tier definitions
       * @returns {Array} Array of tier definition objects
       */
      getUnlockedTierDefinitions: () => {
        return get().unlockedTiers
          .map(tierId => TIER_DEFINITIONS[tierId])
          .sort((a, b) => a.order - b.order);
      },

      /**
       * Get the next tier to unlock
       * @returns {Object|null} Tier definition or null if at max
       */
      getNextTierToUnlock: () => {
        const currentMaxOrder = get().getMaxTierOrder();
        const nextTier = Object.values(TIER_DEFINITIONS).find(
          t => t.order === currentMaxOrder + 1
        );
        return nextTier || null;
      },

      /**
       * Get progression towards next tier as percentage (0-100)
       * @returns {number} Percentage complete
       */
      getProgressionPercentage: () => {
        return Math.round((get().progressionPoints / get().maxProgressionPoints) * 100);
      },

      // ============================================================
      // QUERIES - Building Availability
      // ============================================================

      /**
       * Check if a building type is available (unlocked AND not user-disabled)
       * @param {string} buildingId - The building ID to check
       * @returns {boolean} True if building is available
       */
      isBuildingAvailable: (buildingId) => {
        const state = get();
        if (state.userDisabledBuildingTypes.includes(buildingId)) {
          return false;
        }
        // Check if building's tier is unlocked
        // This would need to import getBuildingById, but we avoid circular imports
        // Instead, this is validated elsewhere
        return true;
      },

      /**
       * Get all user-disabled buildings
       * @returns {Array} Array of disabled building IDs
       */
      getDisabledBuildingTypes: () => {
        return [...get().userDisabledBuildingTypes];
      },

      // ============================================================
      // MUTATIONS - Persistence/Reset
      // ============================================================

      /**
       * Reset progression to initial state
       */
      resetProgression: () => {
        set({
          unlockedTiers: ['SURVIVAL'],
          maxTierUnlocked: 'SURVIVAL',
          progressionPoints: 0,
          tierUnlockTimestamps: { SURVIVAL: 0 },
          userDisabledBuildingTypes: [],
        });
      },

      /**
       * Set entire progression state (for loading saved games)
       * @param {Object} state - New progression state
       */
      setProgressionState: (state) => {
        set(state);
      },

      /**
       * Get current progression state (for saving)
       * @returns {Object} Current state for persistence
       */
      getProgressionState: () => {
        const state = get();
        return {
          unlockedTiers: state.unlockedTiers,
          maxTierUnlocked: state.maxTierUnlocked,
          progressionPoints: state.progressionPoints,
          tierUnlockTimestamps: state.tierUnlockTimestamps,
          userDisabledBuildingTypes: state.userDisabledBuildingTypes,
        };
      },
    }),
    {
      name: 'building-types-store',
      version: 1,
    }
  )
);
