/**
 * FeatureUnlock - Progressive feature unlock system
 *
 * Gradually reveals UI features to avoid overwhelming new players
 * Features unlock based on:
 * - Tutorial step completion
 * - Tier progression
 * - Achievement unlocks
 */

class FeatureUnlock {
  constructor() {
    // Feature registry
    this.features = new Map();

    // Unlocked features
    this.unlockedFeatures = new Set();

    // Enable/disable progressive unlock
    this.enabled = true;

    // Event listeners
    this.featureUnlockListeners = [];

    // Initialize default features
    this._initializeFeatures();
  }

  /**
   * Initialize default feature definitions
   */
  _initializeFeatures() {
    // Tutorial phase features
    this.registerFeature({
      id: 'building-campfire',
      name: 'Campfire Building',
      description: 'Unlock campfire in build menu',
      unlockCondition: {
        type: 'tutorial_start'
      }
    });

    this.registerFeature({
      id: 'building-farm',
      name: 'Farm Building',
      description: 'Unlock farm in build menu',
      unlockCondition: {
        type: 'tutorial_step',
        stepId: 'place-campfire'
      }
    });

    this.registerFeature({
      id: 'npc-spawn-button',
      name: 'Spawn NPC Button',
      description: 'Show spawn NPC button',
      unlockCondition: {
        type: 'tutorial_step',
        stepId: 'place-farm'
      }
    });

    this.registerFeature({
      id: 'building-house',
      name: 'House Building',
      description: 'Unlock house in build menu',
      unlockCondition: {
        type: 'tutorial_step',
        stepId: 'spawn-npc'
      }
    });

    this.registerFeature({
      id: 'territory-expansion-button',
      name: 'Territory Expansion',
      description: 'Show territory expansion button',
      unlockCondition: {
        type: 'tutorial_step',
        stepId: 'place-house'
      }
    });

    this.registerFeature({
      id: 'tier-panel',
      name: 'Tier Panel',
      description: 'Show tier progression panel',
      unlockCondition: {
        type: 'tutorial_step',
        stepId: 'expand-territory'
      }
    });

    // Tier-based unlocks
    this.registerFeature({
      id: 'survival-buildings',
      name: 'All SURVIVAL Tier Buildings',
      description: 'Unlock all survival tier buildings',
      unlockCondition: {
        type: 'tutorial_complete'
      }
    });

    this.registerFeature({
      id: 'permanent-buildings',
      name: 'PERMANENT Tier Buildings',
      description: 'Unlock permanent tier buildings',
      unlockCondition: {
        type: 'tier',
        tier: 'PERMANENT'
      }
    });

    this.registerFeature({
      id: 'advanced-build-menu',
      name: 'Advanced Build Options',
      description: 'Show advanced building options in menu',
      unlockCondition: {
        type: 'tier',
        tier: 'PERMANENT'
      }
    });

    this.registerFeature({
      id: 'town-buildings',
      name: 'TOWN Tier Buildings',
      description: 'Unlock town tier buildings',
      unlockCondition: {
        type: 'tier',
        tier: 'TOWN'
      }
    });

    this.registerFeature({
      id: 'npc-management-panel',
      name: 'NPC Management Panel',
      description: 'Show advanced NPC management panel',
      unlockCondition: {
        type: 'tier',
        tier: 'TOWN'
      }
    });

    this.registerFeature({
      id: 'castle-buildings',
      name: 'CASTLE Tier Buildings',
      description: 'Unlock castle tier buildings',
      unlockCondition: {
        type: 'tier',
        tier: 'CASTLE'
      }
    });

    this.registerFeature({
      id: 'all-features',
      name: 'All Features',
      description: 'Unlock all advanced features',
      unlockCondition: {
        type: 'tier',
        tier: 'CASTLE'
      }
    });

    // Additional features
    this.registerFeature({
      id: 'statistics-panel',
      name: 'Statistics Panel',
      description: 'Show detailed statistics panel',
      unlockCondition: {
        type: 'custom',
        checkFn: (gameState) => gameState.buildingsPlaced >= 3
      }
    });

    this.registerFeature({
      id: 'achievement-panel',
      name: 'Achievement Panel',
      description: 'Show achievement panel',
      unlockCondition: {
        type: 'achievement',
        achievementId: 'first-steps'
      }
    });
  }

  /**
   * Register a new feature
   * @param {Object} feature - Feature definition
   */
  registerFeature(feature) {
    this.features.set(feature.id, {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      unlockCondition: feature.unlockCondition,
      isUnlocked: false
    });
  }

  /**
   * Check and update feature unlocks based on game state
   * @param {Object} gameState - Current game state
   * @returns {Array<string>} Newly unlocked feature IDs
   */
  checkUnlocks(gameState) {
    if (!this.enabled) {
      // If disabled, unlock all features
      this._unlockAllFeatures();
      return [];
    }

    const newlyUnlocked = [];

    for (const [featureId, feature] of this.features) {
      // Skip already unlocked
      if (this.unlockedFeatures.has(featureId)) {
        continue;
      }

      // Check unlock condition
      if (this._checkUnlockCondition(feature.unlockCondition, gameState)) {
        this.unlockFeature(featureId);
        newlyUnlocked.push(featureId);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check if an unlock condition is met
   * @param {Object} condition - Unlock condition
   * @param {Object} gameState - Current game state
   * @returns {boolean}
   */
  _checkUnlockCondition(condition, gameState) {
    switch (condition.type) {
      case 'tutorial_start':
        return gameState.tutorialStarted === true;

      case 'tutorial_step':
        return gameState.tutorialStepCompleted === condition.stepId;

      case 'tutorial_complete':
        return gameState.tutorialCompleted === true;

      case 'tier':
        return gameState.currentTier === condition.tier ||
               this._isTierHigherOrEqual(gameState.currentTier, condition.tier);

      case 'achievement':
        return gameState.achievementUnlocked === condition.achievementId;

      case 'custom':
        if (typeof condition.checkFn === 'function') {
          return condition.checkFn(gameState);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if tier is higher or equal to target tier
   * @param {string} currentTier - Current tier
   * @param {string} targetTier - Target tier
   * @returns {boolean}
   */
  _isTierHigherOrEqual(currentTier, targetTier) {
    const tierOrder = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    if (currentIndex === -1 || targetIndex === -1) return false;

    return currentIndex >= targetIndex;
  }

  /**
   * Manually unlock a feature
   * @param {string} featureId - Feature ID to unlock
   * @returns {boolean} True if unlocked, false if already unlocked or not found
   */
  unlockFeature(featureId) {
    const feature = this.features.get(featureId);
    if (!feature) {
      console.warn(`Feature not found: ${featureId}`);
      return false;
    }

    if (this.unlockedFeatures.has(featureId)) {
      return false; // Already unlocked
    }

    this.unlockedFeatures.add(featureId);
    feature.isUnlocked = true;

    // Notify listeners
    this._notifyFeatureUnlock(feature);

    return true;
  }

  /**
   * Check if a feature is unlocked
   * @param {string} featureId - Feature ID
   * @returns {boolean}
   */
  isFeatureUnlocked(featureId) {
    if (!this.enabled) return true; // All features unlocked if system disabled

    return this.unlockedFeatures.has(featureId);
  }

  /**
   * Get all unlocked features
   * @returns {Array<Object>}
   */
  getUnlockedFeatures() {
    const unlocked = [];
    for (const featureId of this.unlockedFeatures) {
      const feature = this.features.get(featureId);
      if (feature) {
        unlocked.push(feature);
      }
    }
    return unlocked;
  }

  /**
   * Get all locked features
   * @returns {Array<Object>}
   */
  getLockedFeatures() {
    const locked = [];
    for (const [featureId, feature] of this.features) {
      if (!this.unlockedFeatures.has(featureId)) {
        locked.push(feature);
      }
    }
    return locked;
  }

  /**
   * Unlock all features (when system is disabled)
   */
  _unlockAllFeatures() {
    for (const featureId of this.features.keys()) {
      this.unlockedFeatures.add(featureId);
    }
  }

  /**
   * Enable progressive unlock system
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable progressive unlock (unlock all features)
   */
  disable() {
    this.enabled = false;
    this._unlockAllFeatures();
  }

  /**
   * Reset all unlocks
   */
  reset() {
    this.unlockedFeatures.clear();
    for (const feature of this.features.values()) {
      feature.isUnlocked = false;
    }
  }

  /**
   * Add listener for feature unlock events
   * @param {Function} listener - Callback function
   */
  onFeatureUnlock(listener) {
    this.featureUnlockListeners.push(listener);
  }

  /**
   * Remove feature unlock listener
   * @param {Function} listener - Callback to remove
   */
  removeFeatureUnlockListener(listener) {
    const index = this.featureUnlockListeners.indexOf(listener);
    if (index !== -1) {
      this.featureUnlockListeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of feature unlock
   * @param {Object} feature - Unlocked feature
   */
  _notifyFeatureUnlock(feature) {
    this.featureUnlockListeners.forEach(listener => {
      try {
        listener(feature);
      } catch (error) {
        console.error('Error in feature unlock listener:', error);
      }
    });
  }

  /**
   * Serialize feature unlock state
   * @returns {Object}
   */
  serialize() {
    return {
      enabled: this.enabled,
      unlockedFeatures: Array.from(this.unlockedFeatures)
    };
  }

  /**
   * Deserialize feature unlock state
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (!data) return;

    this.enabled = data.enabled !== undefined ? data.enabled : true;
    this.unlockedFeatures = new Set(data.unlockedFeatures || []);

    // Update feature unlock status
    for (const [featureId, feature] of this.features) {
      feature.isUnlocked = this.unlockedFeatures.has(featureId);
    }
  }
}

export default FeatureUnlock;
