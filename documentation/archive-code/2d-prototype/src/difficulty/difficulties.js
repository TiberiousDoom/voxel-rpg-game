/**
 * difficulties.js - Difficulty level definitions
 *
 * Defines the 4 difficulty levels available in the game:
 * - EASY: For new players or casual gameplay
 * - NORMAL: Balanced default experience
 * - HARD: For experienced players seeking challenge
 * - EXTREME: For veterans seeking maximum difficulty
 *
 * Each difficulty level includes:
 * - Display information (name, description, icon)
 * - Modifier values (imported from BalanceConfig)
 * - Unlock conditions (if any)
 * - Achievements/rewards specific to that difficulty
 */

import { DIFFICULTY_BASE_MODIFIERS } from '../balance/BalanceConfig.js';

/**
 * Difficulty level definitions
 */
export const DIFFICULTY_LEVELS = {
  /**
   * EASY - Recommended for new players
   *
   * Features:
   * - Buildings cost 25% less resources
   * - Resources produce 50% faster
   * - Events trigger 50% less often
   * - Tier progression 25% faster
   * - NPCs 25% happier
   */
  EASY: {
    id: 'EASY',
    name: 'Easy',
    displayName: 'Peaceful Builder',
    description: 'Recommended for new players. Focus on learning and building without pressure.',
    icon: '🌱',
    color: '#4CAF50', // Green

    // Detailed feature list
    features: [
      'Buildings cost 25% less',
      'Resource production +50%',
      'Fewer random events',
      'Faster tier progression',
      'Happier NPCs',
      'Great for learning',
    ],

    // Modifiers (from BalanceConfig)
    modifiers: DIFFICULTY_BASE_MODIFIERS.EASY,

    // Unlock conditions
    unlocked: true, // Always available

    // Achievement suffix
    achievementSuffix: 'EASY',

    // Recommended for
    recommendedFor: 'New players, casual gaming sessions, learning the game mechanics',

    // Warning message (if any)
    warning: null,
  },

  /**
   * NORMAL - Default balanced experience
   *
   * Features:
   * - Standard resource costs
   * - Standard production rates
   * - Standard event frequency
   * - Standard tier progression
   * - Balanced gameplay
   */
  NORMAL: {
    id: 'NORMAL',
    name: 'Normal',
    displayName: 'Balanced Kingdom',
    description: 'The intended gameplay experience. Balanced challenge and progression.',
    icon: '⚖️',
    color: '#2196F3', // Blue

    features: [
      'Balanced resource costs',
      'Standard production rates',
      'Normal event frequency',
      'Standard tier progression',
      'Intended game balance',
      'Recommended for most players',
    ],

    modifiers: DIFFICULTY_BASE_MODIFIERS.NORMAL,

    unlocked: true, // Always available

    achievementSuffix: 'NORMAL',

    recommendedFor: 'All players, standard gameplay experience, designed game balance',

    warning: null,
  },

  /**
   * HARD - For experienced players
   *
   * Features:
   * - Buildings cost 25% more resources
   * - Resources produce 25% slower
   * - Events trigger 50% more often
   * - Tier progression 25% slower
   * - NPCs 20% less happy
   */
  HARD: {
    id: 'HARD',
    name: 'Hard',
    displayName: 'Harsh Realm',
    description: 'For experienced players. Strategic planning and resource management critical.',
    icon: '⚔️',
    color: '#FF9800', // Orange

    features: [
      'Buildings cost 25% more',
      'Resource production -25%',
      'More frequent events',
      'Slower tier progression',
      'NPCs harder to keep happy',
      'Requires strategic planning',
    ],

    modifiers: DIFFICULTY_BASE_MODIFIERS.HARD,

    unlocked: true, // Always available

    achievementSuffix: 'HARD',

    recommendedFor: 'Experienced players, those seeking challenge, strategic gameplay',

    warning: 'This difficulty requires careful resource management and planning.',
  },

  /**
   * EXTREME - Maximum difficulty
   *
   * Features:
   * - Buildings cost 50% more resources
   * - Resources produce 50% slower
   * - Events trigger 100% more often
   * - Tier progression 50% slower
   * - NPCs 40% less happy
   */
  EXTREME: {
    id: 'EXTREME',
    name: 'Extreme',
    displayName: 'Survival Challenge',
    description: 'Maximum difficulty. Only for veterans. Every decision matters.',
    icon: '💀',
    color: '#F44336', // Red

    features: [
      'Buildings cost 50% more',
      'Resource production -50%',
      'Double event frequency',
      'Much slower progression',
      'NPCs very unhappy',
      'Extreme challenge',
    ],

    modifiers: DIFFICULTY_BASE_MODIFIERS.EXTREME,

    unlocked: true, // Can be locked behind achievement

    achievementSuffix: 'EXTREME',

    recommendedFor: 'Veterans only, maximum challenge, bragging rights',

    warning: '⚠️ WARNING: This difficulty is extremely challenging. Not recommended for first playthrough.',
  },
};

/**
 * Get difficulty level by ID
 *
 * @param {string} difficultyId - Difficulty ID
 * @returns {Object|null} Difficulty level data or null
 */
export function getDifficultyLevel(difficultyId) {
  return DIFFICULTY_LEVELS[difficultyId] || null;
}

/**
 * Get all unlocked difficulty levels
 *
 * @param {Object} playerProgress - Player progress data (for unlock conditions)
 * @returns {Array<Object>} Array of unlocked difficulty levels
 */
export function getUnlockedDifficulties(playerProgress = {}) {
  return Object.values(DIFFICULTY_LEVELS).filter(difficulty => {
    // Check if difficulty is unlocked
    if (difficulty.unlocked) {
      return true;
    }

    // Check unlock conditions (if implemented)
    // Example: EXTREME requires beating HARD difficulty
    if (difficulty.id === 'EXTREME') {
      return playerProgress.hardModeCompleted === true;
    }

    return false;
  });
}

/**
 * Get difficulty comparison data for UI display
 *
 * @returns {Array<Object>} Comparison data for all difficulties
 */
export function getDifficultyComparison() {
  return Object.values(DIFFICULTY_LEVELS).map(difficulty => ({
    id: difficulty.id,
    name: difficulty.displayName,
    icon: difficulty.icon,
    color: difficulty.color,
    resourceCost: difficulty.modifiers.resourceCostMultiplier,
    production: difficulty.modifiers.resourceProductionMultiplier,
    eventFrequency: difficulty.modifiers.eventFrequencyMultiplier,
    progression: difficulty.modifiers.tierProgressionMultiplier,
  }));
}

/**
 * Calculate effective value with difficulty modifier
 *
 * @param {string} difficultyId - Difficulty ID
 * @param {string} modifierType - Modifier type (e.g., 'resourceCostMultiplier')
 * @param {number} baseValue - Base value to modify
 * @returns {number} Modified value
 */
export function calculateDifficultyModifiedValue(difficultyId, modifierType, baseValue) {
  const difficulty = getDifficultyLevel(difficultyId);

  if (!difficulty || !difficulty.modifiers[modifierType]) {
    return baseValue;
  }

  return Math.round(baseValue * difficulty.modifiers[modifierType]);
}

/**
 * Get recommended difficulty based on player experience
 *
 * @param {Object} playerStats - Player statistics
 * @returns {string} Recommended difficulty ID
 */
export function getRecommendedDifficulty(playerStats = {}) {
  // New player
  if (!playerStats.gamesPlayed || playerStats.gamesPlayed === 0) {
    return 'EASY';
  }

  // Played 1-3 games
  if (playerStats.gamesPlayed < 3) {
    return 'NORMAL';
  }

  // Experienced player (completed TOWN tier or higher)
  if (playerStats.highestTierReached === 'CASTLE') {
    return 'HARD';
  }

  // Default to NORMAL
  return 'NORMAL';
}

/**
 * Difficulty selection tips for players
 */
export const DIFFICULTY_SELECTION_TIPS = {
  EASY: [
    'Perfect for learning game mechanics',
    'Build your kingdom at your own pace',
    'Focus on creativity without stress',
  ],

  NORMAL: [
    'The way the game was designed to be played',
    'Balanced challenge and progression',
    'Suitable for most play styles',
  ],

  HARD: [
    'Every resource decision matters',
    'Plan ahead to survive events',
    'Rewards strategic thinking',
  ],

  EXTREME: [
    'Only for experienced players',
    'Requires perfect resource management',
    'One mistake can set you back significantly',
  ],
};

/**
 * Export default
 */
export default {
  DIFFICULTY_LEVELS,
  getDifficultyLevel,
  getUnlockedDifficulties,
  getDifficultyComparison,
  calculateDifficultyModifiedValue,
  getRecommendedDifficulty,
  DIFFICULTY_SELECTION_TIPS,
};
