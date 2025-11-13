/**
 * ContextHelp - Context-sensitive help system
 *
 * Provides help tooltips based on player actions and game state
 * - Triggers on specific game events
 * - Shows relevant tips once (doesn't spam)
 * - Can be dismissed by player
 */

class ContextHelp {
  /**
   * @param {Array<Object>} helpDefinitions - Array of help tip definitions
   */
  constructor(helpDefinitions = []) {
    this.helpDefinitions = new Map();
    this.triggeredTips = new Set(); // Track which tips have been shown
    this.dismissedTips = new Set(); // Track which tips user dismissed
    this.enabled = true;
    this.maxTipsPerSession = 50; // Prevent spam
    this.tipsShownCount = 0;

    // Event listeners
    this.tipTriggeredListeners = [];

    // Load help definitions
    this._loadHelpDefinitions(helpDefinitions);
  }

  /**
   * Load help definitions
   * @param {Array<Object>} definitions - Help definitions
   */
  _loadHelpDefinitions(definitions) {
    definitions.forEach(def => {
      this.helpDefinitions.set(def.id, {
        id: def.id,
        title: def.title,
        message: def.message,
        triggerType: def.triggerType,
        triggerCondition: def.triggerCondition,
        priority: def.priority || 'normal', // low, normal, high
        showOnce: def.showOnce !== undefined ? def.showOnce : true,
        category: def.category || 'general'
      });
    });
  }

  /**
   * Check if a help tip should trigger based on game state
   * @param {Object} gameState - Current game state
   * @returns {Array<Object>} Array of triggered tips
   */
  checkTriggers(gameState) {
    if (!this.enabled) return [];
    if (this.tipsShownCount >= this.maxTipsPerSession) return [];

    const triggeredTips = [];

    for (const [id, helpDef] of this.helpDefinitions) {
      // Skip if already shown and showOnce is true
      if (helpDef.showOnce && this.triggeredTips.has(id)) {
        continue;
      }

      // Skip if dismissed by user
      if (this.dismissedTips.has(id)) {
        continue;
      }

      // Check trigger condition
      if (this._checkTriggerCondition(helpDef, gameState)) {
        triggeredTips.push(helpDef);
        this.triggeredTips.add(id);
        this.tipsShownCount++;
      }
    }

    // Sort by priority
    triggeredTips.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Notify listeners
    triggeredTips.forEach(tip => {
      this._notifyTipTriggered(tip);
    });

    return triggeredTips;
  }

  /**
   * Check if a specific trigger condition is met
   * @param {Object} helpDef - Help definition
   * @param {Object} gameState - Current game state
   * @returns {boolean}
   */
  _checkTriggerCondition(helpDef, gameState) {
    const { triggerType, triggerCondition } = helpDef;

    switch (triggerType) {
      case 'building_placement_failed':
        return gameState.buildingPlacementFailed === true;

      case 'npc_spawn_no_houses':
        return gameState.npcSpawnAttempted && gameState.housingCapacity <= 0;

      case 'food_depleted':
        return gameState.food !== undefined && gameState.food <= 0;

      case 'storage_full':
        return gameState.storagePercentage >= 100;

      case 'tier_gate_failed':
        return gameState.tierGateCheckFailed === true;

      case 'building_damaged':
        return gameState.buildingDamaged === true;

      case 'npc_died':
        return gameState.npcDied === true;

      case 'morale_low':
        return gameState.morale !== undefined && gameState.morale < -50;

      case 'territory_expansion_attempted':
        return gameState.territoryExpansionAttempted === true;

      case 'achievement_unlocked':
        return gameState.achievementUnlocked === true;

      case 'disaster_occurred':
        return gameState.disasterOccurred === true;

      case 'resource_threshold':
        return this._checkResourceThreshold(gameState, triggerCondition);

      case 'custom':
        if (typeof triggerCondition === 'function') {
          return triggerCondition(gameState);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Check resource threshold conditions
   * @param {Object} gameState - Current game state
   * @param {Object} condition - Trigger condition
   * @returns {boolean}
   */
  _checkResourceThreshold(gameState, condition) {
    const { resource, operator, value } = condition;
    const currentValue = gameState[resource];

    if (currentValue === undefined) return false;

    switch (operator) {
      case '<':
        return currentValue < value;
      case '<=':
        return currentValue <= value;
      case '>':
        return currentValue > value;
      case '>=':
        return currentValue >= value;
      case '===':
        return currentValue === value;
      default:
        return false;
    }
  }

  /**
   * Manually trigger a help tip by ID
   * @param {string} tipId - Help tip ID
   * @returns {Object|null} The triggered tip or null
   */
  triggerTip(tipId) {
    const helpDef = this.helpDefinitions.get(tipId);
    if (!helpDef) return null;

    // Check if already shown/dismissed
    if (helpDef.showOnce && this.triggeredTips.has(tipId)) {
      return null;
    }
    if (this.dismissedTips.has(tipId)) {
      return null;
    }

    this.triggeredTips.add(tipId);
    this.tipsShownCount++;
    this._notifyTipTriggered(helpDef);

    return helpDef;
  }

  /**
   * Dismiss a help tip (user clicked 'don't show again')
   * @param {string} tipId - Help tip ID
   */
  dismissTip(tipId) {
    this.dismissedTips.add(tipId);
  }

  /**
   * Reset triggered tips (for testing or new session)
   */
  resetTriggered() {
    this.triggeredTips.clear();
    this.tipsShownCount = 0;
  }

  /**
   * Reset dismissed tips
   */
  resetDismissed() {
    this.dismissedTips.clear();
  }

  /**
   * Enable context help
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable context help
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Add listener for tip triggered events
   * @param {Function} listener - Callback function
   */
  onTipTriggered(listener) {
    this.tipTriggeredListeners.push(listener);
  }

  /**
   * Remove tip triggered listener
   * @param {Function} listener - Callback to remove
   */
  removeTipTriggeredListener(listener) {
    const index = this.tipTriggeredListeners.indexOf(listener);
    if (index !== -1) {
      this.tipTriggeredListeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of triggered tip
   * @param {Object} tip - Triggered tip
   */
  _notifyTipTriggered(tip) {
    this.tipTriggeredListeners.forEach(listener => {
      try {
        listener(tip);
      } catch (error) {
        console.error('Error in tip triggered listener:', error);
      }
    });
  }

  /**
   * Serialize context help state
   * @returns {Object}
   */
  serialize() {
    return {
      enabled: this.enabled,
      triggeredTips: Array.from(this.triggeredTips),
      dismissedTips: Array.from(this.dismissedTips),
      tipsShownCount: this.tipsShownCount
    };
  }

  /**
   * Deserialize context help state
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (!data) return;

    this.enabled = data.enabled !== undefined ? data.enabled : true;
    this.triggeredTips = new Set(data.triggeredTips || []);
    this.dismissedTips = new Set(data.dismissedTips || []);
    this.tipsShownCount = data.tipsShownCount || 0;
  }

  /**
   * Get help tip by ID
   * @param {string} tipId - Help tip ID
   * @returns {Object|null}
   */
  getHelpTip(tipId) {
    return this.helpDefinitions.get(tipId) || null;
  }

  /**
   * Get all help tips in a category
   * @param {string} category - Category name
   * @returns {Array<Object>}
   */
  getHelpTipsByCategory(category) {
    const tips = [];
    for (const helpDef of this.helpDefinitions.values()) {
      if (helpDef.category === category) {
        tips.push(helpDef);
      }
    }
    return tips;
  }
}

export default ContextHelp;
