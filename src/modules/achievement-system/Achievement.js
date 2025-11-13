/**
 * Achievement.js - Base achievement definition
 *
 * Represents a single achievement with:
 * - Unique identification
 * - Unlock conditions
 * - Rewards
 * - Progress tracking
 * - Display properties
 */

export const AchievementCategory = {
  BUILDING: 'building',
  RESOURCE: 'resource',
  NPC: 'npc',
  TIER: 'tier',
  SURVIVAL: 'survival'
};

export const RewardType = {
  MULTIPLIER: 'multiplier',      // Production multiplier bonus
  UNLOCK: 'unlock',               // Unlock new content
  COSMETIC: 'cosmetic'           // Visual rewards
};

export const ConditionType = {
  // Building conditions
  BUILDING_COUNT: 'building_count',           // Total buildings placed
  BUILDING_TYPE_COUNT: 'building_type_count', // Specific building type count
  BUILDING_TYPES_UNIQUE: 'building_types_unique', // Unique building types

  // Resource conditions
  RESOURCE_TOTAL: 'resource_total',           // Total resource collected
  RESOURCE_CURRENT: 'resource_current',       // Current resource amount
  STORAGE_FULL: 'storage_full',               // Storage at 100%

  // NPC conditions
  NPC_COUNT: 'npc_count',                     // Total NPCs alive
  NPC_HAPPINESS_ALL: 'npc_happiness_all',     // All NPCs above threshold
  NPC_NO_DEATHS: 'npc_no_deaths',             // No deaths by specific point
  NPC_SPAWNED_TOTAL: 'npc_spawned_total',     // Total NPCs spawned

  // Tier conditions
  TIER_REACHED: 'tier_reached',               // Reached specific tier
  TIER_SPEED: 'tier_speed',                   // Reached tier before time limit

  // Survival conditions
  EVENT_SURVIVED: 'event_survived',           // Survived specific event
  EVENT_ALL_TYPES: 'event_all_types',         // Survived all event types
  NO_STARVATION: 'no_starvation'             // No starvation deaths
};

class Achievement {
  /**
   * Create an achievement
   * @param {Object} config - Achievement configuration
   */
  constructor(config) {
    // Validation
    if (!config.id || !config.name || !config.description) {
      throw new Error('Achievement requires id, name, and description');
    }
    if (!config.category || !Object.values(AchievementCategory).includes(config.category)) {
      throw new Error('Achievement requires valid category');
    }
    if (!config.condition || !config.condition.type) {
      throw new Error('Achievement requires condition with type');
    }

    // Identity
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.icon = config.icon || '🏆';
    this.category = config.category;

    // Condition
    this.condition = {
      type: config.condition.type,
      target: config.condition.target,
      current: 0,
      params: config.condition.params || {} // Additional parameters
    };

    // Reward
    this.reward = config.reward || { type: RewardType.COSMETIC, value: null };

    // State
    this.isUnlocked = false;
    this.unlockedAt = null;
    this.progress = 0; // 0-100 percentage

    // Metadata
    this.createdAt = new Date().toISOString();
  }

  /**
   * Update current progress value
   * @param {*} currentValue - Current value from game state
   * @returns {boolean} - True if achievement was just unlocked
   */
  updateProgress(currentValue) {
    if (this.isUnlocked) {
      return false; // Already unlocked
    }

    // Store current value
    this.condition.current = currentValue;

    // Calculate progress percentage
    if (this.condition.target !== undefined && this.condition.target !== null && this.condition.target > 0) {
      this.progress = Math.min(100, (currentValue / this.condition.target) * 100);
    } else if (this.condition.target === 0) {
      // Edge case: target is 0, consider complete if current is 0
      this.progress = currentValue === 0 ? 100 : 0;
    } else {
      // Boolean conditions (target is implicit true)
      this.progress = currentValue ? 100 : 0;
    }

    // Check if unlock condition met
    const justUnlocked = this.checkUnlockCondition();

    // If just unlocked, set timestamp
    if (justUnlocked) {
      this.unlock();
      return true;
    }

    return false;
  }

  /**
   * Check if unlock condition is met
   * @returns {boolean} - True if condition met
   */
  checkUnlockCondition() {
    if (this.isUnlocked) {
      return false;
    }

    const { type, target, current } = this.condition;

    switch (type) {
      case ConditionType.BUILDING_COUNT:
      case ConditionType.BUILDING_TYPE_COUNT:
      case ConditionType.RESOURCE_TOTAL:
      case ConditionType.RESOURCE_CURRENT:
      case ConditionType.NPC_COUNT:
      case ConditionType.NPC_SPAWNED_TOTAL:
        return current >= target;

      case ConditionType.BUILDING_TYPES_UNIQUE:
        return current >= target;

      case ConditionType.STORAGE_FULL:
      case ConditionType.NPC_HAPPINESS_ALL:
      case ConditionType.NPC_NO_DEATHS:
      case ConditionType.NO_STARVATION:
        return current === true || current >= target;

      case ConditionType.TIER_REACHED:
        return current === target;

      case ConditionType.TIER_SPEED:
        // current is time taken, target is time limit
        return current <= target && current > 0;

      case ConditionType.EVENT_SURVIVED:
        return current >= target;

      case ConditionType.EVENT_ALL_TYPES:
        // current is array of survived event types
        return Array.isArray(current) && current.length >= target;

      default:
        console.warn(`Unknown achievement condition type: ${type}`);
        return false;
    }
  }

  /**
   * Unlock the achievement
   */
  unlock() {
    if (this.isUnlocked) {
      return;
    }

    this.isUnlocked = true;
    this.unlockedAt = new Date().toISOString();
    this.progress = 100;

    // eslint-disable-next-line no-console
    console.log(`🏆 Achievement Unlocked: ${this.name}`);
  }

  /**
   * Get progress description
   * @returns {string} - Human-readable progress
   */
  getProgressDescription() {
    if (this.isUnlocked) {
      return 'Unlocked!';
    }

    const { type, target, current } = this.condition;

    switch (type) {
      case ConditionType.BUILDING_COUNT:
        return `${current}/${target} buildings placed`;

      case ConditionType.BUILDING_TYPE_COUNT:
        return `${current}/${target} ${this.condition.params.buildingType} buildings`;

      case ConditionType.BUILDING_TYPES_UNIQUE:
        return `${current}/${target} unique building types`;

      case ConditionType.RESOURCE_TOTAL:
      case ConditionType.RESOURCE_CURRENT:
        return `${Math.floor(current)}/${target} ${this.condition.params.resourceType}`;

      case ConditionType.NPC_COUNT:
        return `${current}/${target} NPCs alive`;

      case ConditionType.NPC_SPAWNED_TOTAL:
        return `${current}/${target} total NPCs spawned`;

      case ConditionType.STORAGE_FULL:
        return current ? 'Storage filled once' : 'Fill storage to 100%';

      case ConditionType.NPC_HAPPINESS_ALL:
        return current ? 'All NPCs happy' : `All NPCs need ${target}+ happiness`;

      case ConditionType.TIER_REACHED:
        return `Reach ${target} tier`;

      case ConditionType.TIER_SPEED:
        return current > 0 ? `Reached in ${Math.floor(current / 60)}min (limit: ${Math.floor(target / 60)}min)` : `Reach tier in under ${Math.floor(target / 60)} minutes`;

      case ConditionType.EVENT_SURVIVED:
        return `${current}/${target} events survived`;

      case ConditionType.EVENT_ALL_TYPES:
        return `${Array.isArray(current) ? current.length : 0}/${target} event types survived`;

      default:
        return `${Math.floor(this.progress)}% complete`;
    }
  }

  /**
   * Serialize achievement state for saving
   * @returns {Object} - Serialized state
   */
  serialize() {
    return {
      id: this.id,
      condition: {
        current: this.condition.current
      },
      isUnlocked: this.isUnlocked,
      unlockedAt: this.unlockedAt,
      progress: this.progress
    };
  }

  /**
   * Restore achievement state from save
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (data.condition) {
      this.condition.current = data.condition.current;
    }
    this.isUnlocked = data.isUnlocked || false;
    this.unlockedAt = data.unlockedAt || null;
    this.progress = data.progress || 0;
  }
}

export default Achievement;
