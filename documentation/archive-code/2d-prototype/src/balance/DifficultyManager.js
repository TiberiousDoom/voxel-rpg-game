/**
 * DifficultyManager.js - Manages game difficulty settings
 *
 * Provides a centralized system for:
 * - Setting game difficulty (EASY, NORMAL, HARD, EXTREME)
 * - Applying difficulty modifiers to game systems
 * - Saving/loading difficulty settings
 * - Dynamic difficulty adjustments (optional)
 *
 * Usage:
 *   const difficultyManager = new DifficultyManager();
 *   difficultyManager.setDifficulty('NORMAL');
 *   const cost = difficultyManager.applyResourceCostModifier(100);
 */

import { DIFFICULTY_BASE_MODIFIERS } from './BalanceConfig.js';
import { DIFFICULTY_LEVELS } from '../difficulty/difficulties.js';

export default class DifficultyManager {
  constructor(initialDifficulty = 'NORMAL') {
    this.currentDifficulty = initialDifficulty;
    this.modifiers = this._getModifiers(initialDifficulty);

    // Statistics tracking (for dynamic difficulty)
    this.stats = {
      playerDeaths: 0,
      buildingsLost: 0,
      tiersUnlocked: 0,
      eventsTriggered: 0,
      eventsSurvived: 0,
      playTime: 0,
    };

    // Dynamic difficulty settings
    this.dynamicDifficultyEnabled = false;
    this.lastDifficultyAdjustment = 0;
  }

  /**
   * Set the game difficulty level
   *
   * @param {string} difficulty - Difficulty level ('EASY', 'NORMAL', 'HARD', 'EXTREME')
   * @returns {boolean} Success status
   */
  setDifficulty(difficulty) {
    if (!DIFFICULTY_LEVELS[difficulty]) {
      console.error(`Invalid difficulty level: ${difficulty}`);
      return false;
    }

    this.currentDifficulty = difficulty;
    this.modifiers = this._getModifiers(difficulty);

    console.log(`Difficulty set to: ${difficulty}`);
    console.log('Active modifiers:', this.modifiers);

    return true;
  }

  /**
   * Get the current difficulty level
   *
   * @returns {string} Current difficulty level
   */
  getDifficulty() {
    return this.currentDifficulty;
  }

  /**
   * Get current difficulty modifiers
   *
   * @returns {Object} Modifier values
   */
  getModifiers() {
    return { ...this.modifiers };
  }

  /**
   * Get difficulty information
   *
   * @param {string} difficulty - Difficulty level (optional, defaults to current)
   * @returns {Object} Difficulty level info
   */
  getDifficultyInfo(difficulty = null) {
    const level = difficulty || this.currentDifficulty;
    return DIFFICULTY_LEVELS[level] || null;
  }

  /**
   * Apply resource cost modifier
   *
   * @param {number} baseCost - Base resource cost
   * @returns {number} Modified cost (rounded)
   */
  applyResourceCostModifier(baseCost) {
    return Math.round(baseCost * this.modifiers.resourceCostMultiplier);
  }

  /**
   * Apply resource production modifier
   *
   * @param {number} baseProduction - Base production rate
   * @returns {number} Modified production rate
   */
  applyResourceProductionModifier(baseProduction) {
    return baseProduction * this.modifiers.resourceProductionMultiplier;
  }

  /**
   * Apply event frequency modifier
   *
   * @param {number} baseProbability - Base event probability
   * @returns {number} Modified probability
   */
  applyEventFrequencyModifier(baseProbability) {
    return baseProbability * this.modifiers.eventFrequencyMultiplier;
  }

  /**
   * Apply tier progression modifier
   *
   * @param {number} baseRequirement - Base tier requirement
   * @returns {number} Modified requirement (rounded)
   */
  applyTierProgressionModifier(baseRequirement) {
    return Math.round(baseRequirement * this.modifiers.tierProgressionMultiplier);
  }

  /**
   * Apply NPC happiness modifier
   *
   * @param {number} baseHappiness - Base happiness value
   * @returns {number} Modified happiness
   */
  applyNPCHappinessModifier(baseHappiness) {
    return baseHappiness * this.modifiers.npcHappinessMultiplier;
  }

  /**
   * Apply building cost modifiers to a cost object
   *
   * @param {Object} costs - Cost object { resource: amount }
   * @returns {Object} Modified costs
   */
  applyBuildingCostModifiers(costs) {
    const modifiedCosts = {};

    for (const [resource, amount] of Object.entries(costs)) {
      modifiedCosts[resource] = this.applyResourceCostModifier(amount);
    }

    return modifiedCosts;
  }

  /**
   * Check if difficulty can be changed mid-game
   *
   * @returns {boolean} True if difficulty change is allowed
   */
  canChangeDifficulty() {
    // Allow difficulty changes only in first 10 minutes of gameplay
    const TEN_MINUTES = 600000; // milliseconds
    return this.stats.playTime < TEN_MINUTES;
  }

  /**
   * Update statistics (for dynamic difficulty)
   *
   * @param {string} statName - Stat to update
   * @param {number} value - Value to add (default 1)
   */
  updateStat(statName, value = 1) {
    if (this.stats.hasOwnProperty(statName)) {
      this.stats[statName] += value;

      // Check if dynamic difficulty adjustment is needed
      if (this.dynamicDifficultyEnabled) {
        this._checkDynamicDifficultyAdjustment();
      }
    }
  }

  /**
   * Enable/disable dynamic difficulty
   *
   * @param {boolean} enabled - Enable dynamic difficulty
   */
  setDynamicDifficulty(enabled) {
    this.dynamicDifficultyEnabled = enabled;
    console.log(`Dynamic difficulty: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get difficulty statistics
   *
   * @returns {Object} Current stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      playerDeaths: 0,
      buildingsLost: 0,
      tiersUnlocked: 0,
      eventsTriggered: 0,
      eventsSurvived: 0,
      playTime: 0,
    };
  }

  /**
   * Serialize difficulty manager state
   *
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      currentDifficulty: this.currentDifficulty,
      stats: this.stats,
      dynamicDifficultyEnabled: this.dynamicDifficultyEnabled,
      lastDifficultyAdjustment: this.lastDifficultyAdjustment,
    };
  }

  /**
   * Deserialize difficulty manager state
   *
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    if (data.currentDifficulty) {
      this.setDifficulty(data.currentDifficulty);
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (typeof data.dynamicDifficultyEnabled === 'boolean') {
      this.dynamicDifficultyEnabled = data.dynamicDifficultyEnabled;
    }
    if (data.lastDifficultyAdjustment) {
      this.lastDifficultyAdjustment = data.lastDifficultyAdjustment;
    }
  }

  /**
   * Get modifiers for a difficulty level
   * @private
   */
  _getModifiers(difficulty) {
    const baseModifiers = DIFFICULTY_BASE_MODIFIERS[difficulty];

    if (!baseModifiers) {
      console.warn(`No modifiers found for difficulty: ${difficulty}, using NORMAL`);
      return DIFFICULTY_BASE_MODIFIERS.NORMAL;
    }

    return { ...baseModifiers };
  }

  /**
   * Check if dynamic difficulty adjustment is needed
   * @private
   */
  _checkDynamicDifficultyAdjustment() {
    const now = Date.now();
    const THIRTY_MINUTES = 1800000; // milliseconds

    // Only check every 30 minutes
    if (now - this.lastDifficultyAdjustment < THIRTY_MINUTES) {
      return;
    }

    // Calculate player performance score
    const score = this._calculatePerformanceScore();

    // Adjust difficulty based on score
    if (score < 30 && this.currentDifficulty !== 'EASY') {
      // Player struggling - make it easier
      this._suggestDifficultyChange('EASY');
    } else if (score > 70 && this.currentDifficulty !== 'HARD') {
      // Player doing well - make it harder
      this._suggestDifficultyChange('HARD');
    }

    this.lastDifficultyAdjustment = now;
  }

  /**
   * Calculate player performance score (0-100)
   * @private
   */
  _calculatePerformanceScore() {
    let score = 50; // Start at neutral

    // Negative factors
    if (this.stats.playerDeaths > 0) {
      score -= this.stats.playerDeaths * 10;
    }
    if (this.stats.buildingsLost > 5) {
      score -= (this.stats.buildingsLost - 5) * 5;
    }

    // Positive factors
    score += this.stats.tiersUnlocked * 15;
    score += this.stats.eventsSurvived * 3;

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Suggest a difficulty change to the player
   * @private
   */
  _suggestDifficultyChange(newDifficulty) {
    console.log(`[Dynamic Difficulty] Suggesting difficulty change to: ${newDifficulty}`);

    // In a real implementation, this would show a UI prompt to the player
    // For now, just log the suggestion
  }

  /**
   * Get all available difficulty levels
   *
   * @returns {Array<string>} Array of difficulty level names
   */
  static getAvailableDifficulties() {
    return Object.keys(DIFFICULTY_LEVELS);
  }

  /**
   * Get recommended difficulty for new players
   *
   * @returns {string} Recommended difficulty level
   */
  static getRecommendedDifficulty() {
    return 'NORMAL';
  }
}
