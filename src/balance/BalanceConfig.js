/**
 * BalanceConfig.js - Centralized Game Balance Configuration
 *
 * This file contains all tunable balance values for the game.
 * All values here can be adjusted based on playtesting feedback.
 *
 * Philosophy:
 * - Early game (SURVIVAL): Fast, forgiving, teaches mechanics
 * - Mid game (PERMANENT/TOWN): Moderate pace, strategic decisions matter
 * - Late game (CASTLE): Slow, challenging, rewards long-term planning
 *
 * Balance values are organized by system for easy tuning.
 */

import { BUILDING_TIERS, RESOURCE_TYPES } from '../shared/config.js';

/**
 * TIER PROGRESSION BALANCE
 *
 * Controls how quickly players advance through tiers.
 * These values balance accessibility vs. sense of achievement.
 */
export const TIER_PROGRESSION_BALANCE = {
  // Resources required to unlock next tier
  RESOURCE_REQUIREMENTS: {
    [BUILDING_TIERS.SURVIVAL]: {
      totalResourcesSpent: 80,      // Reduced from 100 (faster start)
      timeRequired: 240000,          // 4 minutes (reduced from 5)
    },
    [BUILDING_TIERS.PERMANENT]: {
      totalResourcesSpent: 450,      // Reduced from 500 (smoother mid-game)
      timeRequired: 1200000,         // 20 minutes (reduced from 30)
    },
    [BUILDING_TIERS.TOWN]: {
      totalResourcesSpent: 1800,     // Reduced from 2000 (less grind)
      timeRequired: 3600000,         // 60 minutes (reduced from 90)
    },
    [BUILDING_TIERS.CASTLE]: {
      totalResourcesSpent: 4500,     // Reduced from 5000 (slightly easier)
      timeRequired: 7200000,         // 120 minutes (reduced from 180)
    },
  },

  // Building count requirements (unchanged - feel appropriate)
  BUILDING_REQUIREMENTS: {
    [BUILDING_TIERS.SURVIVAL]: {
      WALL: 3,
      DOOR: 1,
    },
    [BUILDING_TIERS.PERMANENT]: {
      TOWER: 1,
      WALL: 5,
      CHEST: 2,
    },
    [BUILDING_TIERS.TOWN]: {
      CRAFTING_STATION: 1,
      STORAGE_BUILDING: 1,
      MARKETPLACE: 1,
      TOWER: 2,
      WALL: 10,
    },
    [BUILDING_TIERS.CASTLE]: {
      FORTRESS: 1,
      BARRACKS: 1,
      MARKETPLACE: 2,
      WATCHTOWER: 2,
    },
  },
};

/**
 * BUILDING COST BALANCE
 *
 * Adjustments to building costs to smooth progression curve.
 * Format: { buildingType: costMultiplier }
 */
export const BUILDING_COST_MULTIPLIERS = {
  // Early game buildings - slightly cheaper for faster start
  WALL: 0.9,           // 20 gold → 18 gold
  DOOR: 0.9,           // 25 gold → 22.5 gold (rounds to 23)
  CHEST: 0.85,         // 15 gold → 12.75 gold (rounds to 13)

  // Mid game buildings - balanced
  TOWER: 1.0,          // No change
  WATCHTOWER: 1.0,     // No change
  GUARD_POST: 1.0,     // No change

  // Late game buildings - balanced (already expensive enough)
  CRAFTING_STATION: 1.0,
  STORAGE_BUILDING: 1.0,
  BARRACKS: 1.0,
  MARKETPLACE: 1.0,
  FORTRESS: 1.0,
  CASTLE: 1.0,
};

/**
 * RESOURCE PRODUCTION BALANCE
 *
 * Base production rates for resources.
 * Note: Currently no production buildings are defined in config.
 * These values are for when production buildings are added.
 */
export const RESOURCE_PRODUCTION_RATES = {
  // Example production rates (resources per second per building)
  FARM: {
    [RESOURCE_TYPES.GOLD]: 0.5,    // 30 gold/minute
  },
  LUMBER_MILL: {
    [RESOURCE_TYPES.WOOD]: 0.33,   // ~20 wood/minute
  },
  QUARRY: {
    [RESOURCE_TYPES.STONE]: 0.25,  // 15 stone/minute
  },
  MINE: {
    [RESOURCE_TYPES.ESSENCE]: 0.1, // 6 essence/minute
    [RESOURCE_TYPES.CRYSTAL]: 0.05, // 3 crystal/minute
  },
};

/**
 * RESOURCE CONSUMPTION BALANCE
 *
 * How much resources NPCs/buildings consume.
 */
export const RESOURCE_CONSUMPTION_RATES = {
  // Per NPC consumption (resources per hour)
  NPC_BASE_CONSUMPTION: {
    [RESOURCE_TYPES.GOLD]: 5,      // 5 gold/hour per NPC
  },

  // Building maintenance costs (per hour)
  BUILDING_MAINTENANCE: {
    WALL: 0,                        // Walls don't require maintenance
    TOWER: 2,                       // 2 gold/hour
    BARRACKS: 5,                    // 5 gold/hour
    FORTRESS: 10,                   // 10 gold/hour
    CASTLE: 20,                     // 20 gold/hour
  },
};

/**
 * STORAGE CAPACITY BALANCE
 *
 * Multipliers for storage buildings.
 */
export const STORAGE_CAPACITY_MULTIPLIERS = {
  CHEST: 1.0,                       // 100 units (base)
  STORAGE_BUILDING: 1.2,            // 600 units (increased from 500)
};

/**
 * EVENT FREQUENCY BALANCE
 *
 * How often events trigger and their probabilities.
 */
export const EVENT_FREQUENCY_BALANCE = {
  // Check intervals (in ticks)
  RANDOM_EVENT_CHECK_INTERVAL: 1800,    // 30 minutes (reduced from 1 hour)
  SEASONAL_EVENT_CHECK_INTERVAL: 3600,  // 1 hour (unchanged)

  // Event probabilities (per check)
  EVENT_PROBABILITIES: {
    // Disaster events
    WILDFIRE: 0.03,             // 3% per check (increased from 2%)
    FLOOD: 0.03,                // 3% per check
    EARTHQUAKE: 0.025,          // 2.5% per check
    WINTER_FREEZE: 0.02,        // 2% per check

    // Positive events
    MERCHANT_VISIT: 0.08,       // 8% per check (increased from 5%)
    WANDERER_JOINS: 0.06,       // 6% per check
    GOOD_WEATHER: 0.10,         // 10% per check
    HARVEST_FESTIVAL: 0.05,     // 5% per check
    SPRING_BLOOM: 0.05,         // 5% per check
  },

  // Seasonal event intervals (in ticks)
  SEASONAL_INTERVALS: {
    SPRING_BLOOM: 10800,        // 3 hours
    HARVEST_FESTIVAL: 14400,    // 4 hours
    WINTER_FREEZE: 10800,       // 3 hours
  },
};

/**
 * ACHIEVEMENT REWARD BALANCE
 *
 * Multipliers for achievement rewards.
 * Applied on top of base achievement rewards.
 */
export const ACHIEVEMENT_REWARD_MULTIPLIERS = {
  // Building achievements - slightly reduced to prevent snowballing
  BUILDING: 0.9,                // 10% reduction

  // Resource achievements - balanced
  RESOURCE: 1.0,                // No change

  // NPC achievements - slightly increased to reward population management
  NPC: 1.1,                     // 10% increase

  // Tier achievements - balanced
  TIER: 1.0,                    // No change

  // Survival achievements - increased to reward skilled play
  SURVIVAL: 1.2,                // 20% increase
};

/**
 * NPC BALANCE
 *
 * NPC-related balance values.
 */
export const NPC_BALANCE = {
  // Happiness decay rate (points per hour)
  HAPPINESS_DECAY_RATE: 5,      // -5 happiness/hour if needs not met

  // Health regeneration rate (points per hour)
  HEALTH_REGEN_RATE: 10,        // +10 health/hour when fed and happy

  // Work efficiency multipliers
  WORK_EFFICIENCY: {
    HAPPY: 1.2,                 // +20% production when happiness > 75
    NEUTRAL: 1.0,               // Normal production (happiness 50-75)
    UNHAPPY: 0.7,               // -30% production when happiness < 50
  },
};

/**
 * DIFFICULTY MODIFIERS
 *
 * Base multipliers for different difficulty levels.
 * These are applied by DifficultyManager.
 */
export const DIFFICULTY_BASE_MODIFIERS = {
  EASY: {
    resourceCostMultiplier: 0.75,        // Buildings cost 25% less
    resourceProductionMultiplier: 1.5,   // Produce 50% more resources
    eventFrequencyMultiplier: 0.5,       // Events trigger 50% less often
    tierProgressionMultiplier: 0.75,     // Tiers unlock 25% faster
    npcHappinessMultiplier: 1.25,        // NPCs 25% happier
  },

  NORMAL: {
    resourceCostMultiplier: 1.0,         // Standard costs
    resourceProductionMultiplier: 1.0,   // Standard production
    eventFrequencyMultiplier: 1.0,       // Standard event frequency
    tierProgressionMultiplier: 1.0,      // Standard progression
    npcHappinessMultiplier: 1.0,         // Standard happiness
  },

  HARD: {
    resourceCostMultiplier: 1.25,        // Buildings cost 25% more
    resourceProductionMultiplier: 0.75,  // Produce 25% less resources
    eventFrequencyMultiplier: 1.5,       // Events trigger 50% more often
    tierProgressionMultiplier: 1.25,     // Tiers unlock 25% slower
    npcHappinessMultiplier: 0.8,         // NPCs 20% less happy
  },

  EXTREME: {
    resourceCostMultiplier: 1.5,         // Buildings cost 50% more
    resourceProductionMultiplier: 0.5,   // Produce 50% less resources
    eventFrequencyMultiplier: 2.0,       // Events trigger 100% more often
    tierProgressionMultiplier: 1.5,      // Tiers unlock 50% slower
    npcHappinessMultiplier: 0.6,         // NPCs 40% less happy
  },
};

/**
 * BALANCE CHANGELOG
 *
 * Track changes made to balance values over time.
 */
export const BALANCE_CHANGELOG = [
  {
    version: '1.0.0',
    date: '2025-11-15',
    changes: [
      'Initial balance configuration created',
      'Reduced tier progression time requirements (20-30% reduction)',
      'Reduced tier resource requirements (10% reduction)',
      'Increased event frequencies (50-60% increase for positive events)',
      'Adjusted building costs for early game (10-15% reduction)',
      'Increased storage capacity for STORAGE_BUILDING (20% increase)',
      'Added difficulty system with 4 difficulty levels',
      'Balanced achievement rewards with category-specific multipliers',
    ],
  },
];

/**
 * Helper function to get adjusted value based on balance config
 *
 * @param {string} category - Balance category (e.g., 'BUILDING_COST')
 * @param {string} key - Specific key within category
 * @param {number} baseValue - Base value to adjust
 * @returns {number} Adjusted value
 */
export function getBalancedValue(category, key, baseValue) {
  let multiplier = 1.0;

  switch (category) {
    case 'BUILDING_COST':
      multiplier = BUILDING_COST_MULTIPLIERS[key] || 1.0;
      break;
    case 'STORAGE_CAPACITY':
      multiplier = STORAGE_CAPACITY_MULTIPLIERS[key] || 1.0;
      break;
    case 'ACHIEVEMENT_REWARD':
      multiplier = ACHIEVEMENT_REWARD_MULTIPLIERS[key] || 1.0;
      break;
    default:
      multiplier = 1.0;
  }

  return Math.round(baseValue * multiplier);
}

/**
 * Export all balance configurations
 */
export default {
  TIER_PROGRESSION_BALANCE,
  BUILDING_COST_MULTIPLIERS,
  RESOURCE_PRODUCTION_RATES,
  RESOURCE_CONSUMPTION_RATES,
  STORAGE_CAPACITY_MULTIPLIERS,
  EVENT_FREQUENCY_BALANCE,
  ACHIEVEMENT_REWARD_MULTIPLIERS,
  NPC_BALANCE,
  DIFFICULTY_BASE_MODIFIERS,
  BALANCE_CHANGELOG,
  getBalancedValue,
};
