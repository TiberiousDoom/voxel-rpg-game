/**
 * NewGamePlus.js
 * Handles New Game+ carry-over and difficulty scaling
 */

class NewGamePlus {
  constructor() {
    this.cycle = 0;
    this.carryOver = null;
  }

  /**
   * Calculate what carries over from the current game into NG+
   * @param {Object} gameData - Current game state
   * @returns {Object} Carry-over data for the next cycle
   */
  calculateCarryOver(gameData) {
    const {
      skillPoints = 0,
      totalSkillPointsSpent = 0,
      gold = 0,
      unlockedRecipes = [],
      completedAchievements = [],
      level = 1,
    } = gameData;

    return {
      skillPoints: Math.floor(totalSkillPointsSpent * 0.5) + skillPoints,
      gold: Math.floor(gold * 0.25),
      unlockedRecipes: [...unlockedRecipes],
      completedAchievements: completedAchievements.map((a) => ({
        ...a,
        ngPlusBadge: true,
      })),
      previousLevel: level,
      cycle: this.cycle + 1,
    };
  }

  /**
   * Start a New Game+ cycle
   * @param {Object} gameData - Current game state to carry over from
   * @returns {Object} NG+ configuration
   */
  startNewCycle(gameData) {
    this.cycle++;
    this.carryOver = this.calculateCarryOver(gameData);

    return {
      cycle: this.cycle,
      carryOver: this.carryOver,
      difficultyModifiers: this.getDifficultyModifiers(),
    };
  }

  /**
   * Get difficulty scaling for current NG+ cycle
   * @returns {Object}
   */
  getDifficultyModifiers() {
    const cycle = this.cycle;
    return {
      enemyHealthMultiplier: Math.min(5, 1 + cycle * 0.5),
      enemyDamageMultiplier: Math.min(4, 1 + cycle * 0.3),
      resourceCostMultiplier: Math.min(2, 1 + cycle * 0.25),
      raidFrequencyMultiplier: Math.min(3, 1 + cycle * 0.2),
      xpMultiplier: 1 + cycle * 0.25,
      lootQualityBonus: cycle * 0.1,
    };
  }

  /**
   * Apply carry-over data to a fresh game state
   * @param {Object} freshState - Default starting game state
   * @returns {Object} Modified state with carry-overs applied
   */
  applyCarryOver(freshState) {
    if (!this.carryOver) return freshState;

    return {
      ...freshState,
      player: {
        ...freshState.player,
        skillPoints: this.carryOver.skillPoints,
      },
      inventory: {
        ...freshState.inventory,
        gold: this.carryOver.gold,
      },
      unlockedRecipes: this.carryOver.unlockedRecipes,
      completedAchievements: this.carryOver.completedAchievements,
      ngPlusCycle: this.cycle,
    };
  }

  /**
   * Check if NG+ is available (player has won at least once)
   * @param {Object} gameData - Current game state
   * @returns {boolean}
   */
  static isAvailable(gameData) {
    return gameData.hasWon === true || gameData.victoriesCount > 0;
  }

  /**
   * Get display info for current cycle
   */
  getCycleInfo() {
    return {
      cycle: this.cycle,
      label: this.cycle > 0 ? `NG+${this.cycle}` : 'Normal',
      modifiers: this.getDifficultyModifiers(),
      carryOver: this.carryOver,
    };
  }

  /**
   * Reset NG+ state
   */
  reset() {
    this.cycle = 0;
    this.carryOver = null;
  }
}

export default NewGamePlus;
