/**
 * SandboxMode.js
 * Unlimited resources, no enemies, all unlocks - creative/free play mode
 */

class SandboxMode {
  constructor() {
    this.active = false;
    this.options = {
      unlimitedResources: true,
      disableEnemies: true,
      allBuildingsUnlocked: true,
      allRecipesUnlocked: true,
      bonusSkillPoints: 100,
      disableHunger: true,
      disableNPCNeeds: true,
      godMode: false,
    };
  }

  /**
   * Activate sandbox mode with optional toggles
   * @param {Object} overrides - Override default sandbox options
   */
  activate(overrides = {}) {
    this.active = true;
    this.options = { ...this.options, ...overrides };
  }

  /**
   * Check if sandbox is active
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }

  /**
   * Get resource override - returns Infinity for unlimited, null for normal
   * @param {string} resourceType
   * @returns {number|null}
   */
  getResourceOverride(resourceType) {
    if (!this.active || !this.options.unlimitedResources) return null;
    return 999999;
  }

  /**
   * Check if resource cost should be skipped
   * @returns {boolean}
   */
  shouldSkipCosts() {
    return this.active && this.options.unlimitedResources;
  }

  /**
   * Check if enemies should be spawned
   * @returns {boolean}
   */
  shouldSpawnEnemies() {
    if (!this.active) return true;
    return !this.options.disableEnemies;
  }

  /**
   * Check if a building tier is unlocked regardless of progression
   * @returns {boolean}
   */
  allBuildingsUnlocked() {
    return this.active && this.options.allBuildingsUnlocked;
  }

  /**
   * Check if all recipes should be available
   * @returns {boolean}
   */
  allRecipesUnlocked() {
    return this.active && this.options.allRecipesUnlocked;
  }

  /**
   * Get bonus skill points for sandbox
   * @returns {number}
   */
  getBonusSkillPoints() {
    if (!this.active) return 0;
    return this.options.bonusSkillPoints;
  }

  /**
   * Check if hunger system should be disabled
   * @returns {boolean}
   */
  isHungerDisabled() {
    return this.active && this.options.disableHunger;
  }

  /**
   * Check if NPC needs (hunger, rest, morale) should be disabled
   * @returns {boolean}
   */
  areNPCNeedsDisabled() {
    return this.active && this.options.disableNPCNeeds;
  }

  /**
   * Check if player has god mode (invincible)
   * @returns {boolean}
   */
  isGodMode() {
    return this.active && this.options.godMode;
  }

  /**
   * Toggle a specific sandbox option
   * @param {string} option - Option key
   * @param {boolean} value - New value
   */
  setOption(option, value) {
    if (option in this.options) {
      this.options[option] = value;
    }
  }

  /**
   * Get current sandbox configuration
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Deactivate sandbox mode
   */
  deactivate() {
    this.active = false;
  }

  /**
   * Reset
   */
  reset() {
    this.active = false;
    this.options = {
      unlimitedResources: true,
      disableEnemies: true,
      allBuildingsUnlocked: true,
      allRecipesUnlocked: true,
      bonusSkillPoints: 100,
      disableHunger: true,
      disableNPCNeeds: true,
      godMode: false,
    };
  }
}

export default SandboxMode;
