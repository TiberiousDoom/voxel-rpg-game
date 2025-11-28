/**
 * ModeManager - Handles transitions between game modes
 * Ensures clean state preservation and restoration
 */
class ModeManager {
  constructor(unifiedState, gameEngine, orchestrator) {
    this.state = unifiedState;
    this.engine = gameEngine;
    this.orchestrator = orchestrator;

    // Mode-specific cleanup functions
    this.cleanupHandlers = new Map();

    // Mode-specific initialization functions
    this.initHandlers = new Map();

    // Transition locks
    this.isTransitioning = false;
    this.transitionQueue = [];
  }

  /**
   * Register cleanup handler for a mode
   * @param {string} mode - Mode name
   * @param {Function} handler - Cleanup function
   */
  registerCleanupHandler(mode, handler) {
    this.cleanupHandlers.set(mode, handler);
  }

  /**
   * Register initialization handler for a mode
   * @param {string} mode - Mode name
   * @param {Function} handler - Init function
   */
  registerInitHandler(mode, handler) {
    this.initHandlers.set(mode, handler);
  }

  /**
   * Switch to a different game mode
   * @param {string} targetMode - Target mode
   * @param {Object} context - Mode-specific context
   * @returns {Promise<Object>} Result { success, mode, error }
   */
  async switchMode(targetMode, context = {}) {
    // Prevent concurrent transitions
    if (this.isTransitioning) {
      return { success: false, error: 'Transition already in progress' };
    }

    // Validate target mode
    if (!['settlement', 'expedition', 'defense'].includes(targetMode)) {
      return { success: false, error: `Invalid mode: ${targetMode}` };
    }

    // Check if already in target mode
    if (this.state.getCurrentMode() === targetMode) {
      return { success: true, mode: targetMode };
    }

    this.isTransitioning = true;

    try {
      // Step 1: Validate transition
      const canTransition = this._validateTransition(targetMode, context);
      if (!canTransition.valid) {
        throw new Error(canTransition.reason);
      }

      // Step 2: Pause game engine
      this.engine.pause();

      // Step 3: Save current state
      const currentMode = this.state.getCurrentMode();
      await this._saveCurrentState(currentMode);

      // Step 4: Cleanup current mode
      await this._cleanupMode(currentMode);

      // Step 5: Switch mode
      this.state._setMode(targetMode);

      // Step 6: Initialize new mode
      await this._initializeMode(targetMode, context);

      // Step 7: Resume game engine
      this.engine.resume();

      this.isTransitioning = false;

      return { success: true, mode: targetMode };

    } catch (error) {
      // Rollback on failure
      this.isTransitioning = false;
      this.engine.resume();

      console.error('Mode transition failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate if transition is allowed
   * @private
   */
  _validateTransition(targetMode, context) {
    const currentMode = this.state.getCurrentMode();

    // Settlement → Expedition: Must be at Expedition Hall
    if (currentMode === 'settlement' && targetMode === 'expedition') {
      if (!context.expeditionHallId) {
        return { valid: false, reason: 'Must be at Expedition Hall' };
      }
      if (!context.party || context.party.length === 0) {
        return { valid: false, reason: 'Must have a party' };
      }
    }

    // Settlement → Defense: Automatic (raid triggered)
    if (currentMode === 'settlement' && targetMode === 'defense') {
      if (!context.raidId) {
        return { valid: false, reason: 'No active raid' };
      }
    }

    // Expedition → Settlement: Must complete or abandon expedition
    if (currentMode === 'expedition' && targetMode === 'settlement') {
      if (!context.completed && !context.abandoned) {
        return { valid: false, reason: 'Expedition not completed' };
      }
    }

    // Defense → Settlement: Must complete defense
    if (currentMode === 'defense' && targetMode === 'settlement') {
      if (!context.defenseComplete) {
        return { valid: false, reason: 'Defense not complete' };
      }
    }

    return { valid: true };
  }

  /**
   * Save current mode state
   * @private
   */
  async _saveCurrentState(mode) {
    switch (mode) {
      case 'settlement':
        this.state.settlementState = this.orchestrator.getGameState();
        break;
      case 'expedition':
        // Expedition state is already in unifiedState
        break;
      case 'defense':
        // Defense state is already in unifiedState
        break;
      default:
        // No action needed for unknown modes
        break;
    }
  }

  /**
   * Cleanup current mode
   * @private
   */
  async _cleanupMode(mode) {
    const handler = this.cleanupHandlers.get(mode);
    if (handler) {
      await handler();
    }
  }

  /**
   * Initialize new mode
   * @private
   */
  async _initializeMode(mode, context) {
    const handler = this.initHandlers.get(mode);
    if (handler) {
      await handler(context);
    }
  }

  /**
   * Get current mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.state.getCurrentMode();
  }

  /**
   * Check if transition is in progress
   * @returns {boolean}
   */
  isInTransition() {
    return this.isTransitioning;
  }
}

export default ModeManager;
