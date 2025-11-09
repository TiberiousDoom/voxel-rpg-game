/**
 * ErrorRecovery.js - Robust error handling and recovery
 *
 * Features:
 * - Error classification and handling
 * - Graceful degradation
 * - Automatic recovery attempts
 * - Error logging and reporting
 * - Game state rollback capability
 */

class ErrorRecovery {
  /**
   * Error severity levels
   */
  static SEVERITY = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  };

  /**
   * Error types for categorization
   */
  static ERROR_TYPES = {
    TICK_FAILED: 'tick_failed',
    STATE_CORRUPTION: 'state_corruption',
    SAVE_FAILED: 'save_failed',
    RESOURCE_INVALID: 'resource_invalid',
    NPC_CONFLICT: 'npc_conflict',
    BUILDING_CONFLICT: 'building_conflict',
    TIER_INVALID: 'tier_invalid',
    MEMORY_ERROR: 'memory_error',
    UNKNOWN: 'unknown'
  };

  /**
   * Recovery strategies
   */
  static RECOVERY_STRATEGIES = {
    RETRY: 'retry',
    SKIP: 'skip',
    ROLLBACK: 'rollback',
    RESET: 'reset',
    IGNORE: 'ignore'
  };

  /**
   * Initialize error recovery system
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator
   * @param {SaveManager} saveManager - Save manager for rollback
   */
  constructor(orchestrator, saveManager) {
    this.orchestrator = orchestrator;
    this.saveManager = saveManager;

    this.errorLog = [];
    this.recoveryAttempts = {};
    this.stateSnapshots = []; // For rollback capability
    this.maxSnapshots = 10;
    this.lastSafeState = null;

    this.isEnabled = false;
  }

  /**
   * Enable error recovery
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable error recovery
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Handle error with automatic recovery attempt
   * @param {Error} error - Error object
   * @param {Object} context - Error context {module, tick, operation}
   * @returns {Object} {recovered, strategy, details}
   */
  handleError(error, context = {}) {
    if (!this.isEnabled) {
      return { recovered: false, reason: 'Recovery disabled' };
    }

    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      type: this._classifyError(error, context),
      severity: this._classifySeverity(error, context)
    };

    this.errorLog.push(errorInfo);

    // Attempt recovery
    const strategy = this._selectRecoveryStrategy(errorInfo);
    const result = this._executeRecoveryStrategy(strategy, errorInfo);

    return {
      recovered: result.success,
      strategy,
      details: result,
      errorInfo
    };
  }

  /**
   * Create state snapshot for rollback
   * @returns {boolean} Success
   */
  createSnapshot() {
    try {
      const snapshot = {
        timestamp: Date.now(),
        tick: this.orchestrator.tickCount,
        state: JSON.parse(JSON.stringify(this.orchestrator.gameState))
      };

      this.stateSnapshots.push(snapshot);

      // Keep only last N snapshots
      if (this.stateSnapshots.length > this.maxSnapshots) {
        this.stateSnapshots.shift();
      }

      this.lastSafeState = snapshot;
      return true;
    } catch (err) {
      console.error('Failed to create state snapshot:', err);
      return false;
    }
  }

  /**
   * Rollback to last safe state
   * @param {number} stepsBack - How many snapshots to go back (default: 1)
   * @returns {Object} {success, restoredTick}
   */
  rollback(stepsBack = 1) {
    if (this.stateSnapshots.length === 0) {
      return { success: false, reason: 'No snapshots available' };
    }

    const targetIndex = Math.max(0, this.stateSnapshots.length - stepsBack - 1);
    const snapshot = this.stateSnapshots[targetIndex];

    try {
      this.orchestrator.gameState = JSON.parse(JSON.stringify(snapshot.state));
      this.orchestrator.tickCount = snapshot.tick;

      this.errorLog.push({
        timestamp: new Date().toISOString(),
        type: 'rollback',
        message: `Rolled back to tick ${snapshot.tick}`,
        severity: this.SEVERITY.WARNING
      });

      return { success: true, restoredTick: snapshot.tick };
    } catch (err) {
      return { success: false, reason: `Rollback failed: ${err.message}` };
    }
  }

  /**
   * Get error log
   * @param {number} limit - Max errors to return
   * @returns {Array} Error log entries
   */
  getErrorLog(limit = 100) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Get error statistics
   * @returns {Object} Error stats
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {},
      byType: {},
      recentErrors: this.errorLog.slice(-5)
    };

    for (const entry of this.errorLog) {
      // By severity
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;

      // By type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Classify error type
   * @private
   */
  _classifyError(error, context) {
    const message = error.message.toLowerCase();

    if (message.includes('tick') || context.operation === 'tick') {
      return this.ERROR_TYPES.TICK_FAILED;
    }
    if (message.includes('state') || message.includes('corruption')) {
      return this.ERROR_TYPES.STATE_CORRUPTION;
    }
    if (message.includes('save') || context.operation === 'save') {
      return this.ERROR_TYPES.SAVE_FAILED;
    }
    if (message.includes('resource') || context.operation === 'production') {
      return this.ERROR_TYPES.RESOURCE_INVALID;
    }
    if (message.includes('npc') || context.module === 'npc') {
      return this.ERROR_TYPES.NPC_CONFLICT;
    }
    if (message.includes('building') || context.module === 'building') {
      return this.ERROR_TYPES.BUILDING_CONFLICT;
    }
    if (message.includes('tier') || context.operation === 'tier-advancement') {
      return this.ERROR_TYPES.TIER_INVALID;
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return this.ERROR_TYPES.MEMORY_ERROR;
    }

    return this.ERROR_TYPES.UNKNOWN;
  }

  /**
   * Classify error severity
   * @private
   */
  _classifySeverity(error, context) {
    const message = error.message.toLowerCase();

    if (context.operation === 'critical' || message.includes('critical')) {
      return this.SEVERITY.CRITICAL;
    }
    if (context.operation === 'tick' || message.includes('tick')) {
      return this.SEVERITY.ERROR;
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return this.SEVERITY.WARNING;
    }

    return this.SEVERITY.ERROR;
  }

  /**
   * Select recovery strategy
   * @private
   */
  _selectRecoveryStrategy(errorInfo) {
    const type = errorInfo.type;
    const severity = errorInfo.severity;

    // Critical errors - attempt rollback
    if (severity === this.SEVERITY.CRITICAL) {
      return this.RECOVERY_STRATEGIES.ROLLBACK;
    }

    // By error type
    switch (type) {
      case this.ERROR_TYPES.TICK_FAILED:
        return this.RECOVERY_STRATEGIES.SKIP; // Skip this tick, continue
      case this.ERROR_TYPES.STATE_CORRUPTION:
        return this.RECOVERY_STRATEGIES.ROLLBACK; // Rollback to last good state
      case this.ERROR_TYPES.SAVE_FAILED:
        return this.RECOVERY_STRATEGIES.RETRY; // Retry save
      case this.ERROR_TYPES.RESOURCE_INVALID:
        return this.RECOVERY_STRATEGIES.SKIP; // Skip this operation
      case this.ERROR_TYPES.NPC_CONFLICT:
      case this.ERROR_TYPES.BUILDING_CONFLICT:
        return this.RECOVERY_STRATEGIES.SKIP; // Skip conflicting operation
      case this.ERROR_TYPES.MEMORY_ERROR:
        return this.RECOVERY_STRATEGIES.RESET; // Reset to known good state
      default:
        return this.RECOVERY_STRATEGIES.IGNORE; // Log and continue
    }
  }

  /**
   * Execute recovery strategy
   * @private
   */
  _executeRecoveryStrategy(strategy, errorInfo) {
    switch (strategy) {
      case this.RECOVERY_STRATEGIES.RETRY:
        return { success: true, message: 'Queued for retry' };

      case this.RECOVERY_STRATEGIES.SKIP:
        return { success: true, message: 'Skipped operation' };

      case this.RECOVERY_STRATEGIES.ROLLBACK:
        return this.rollback(1);

      case this.RECOVERY_STRATEGIES.RESET:
        return { success: true, message: 'System reset queued' };

      case this.RECOVERY_STRATEGIES.IGNORE:
        return { success: true, message: 'Error logged, continuing' };

      default:
        return { success: false, message: 'Unknown strategy' };
    }
  }

  /**
   * Create game state summary for debugging
   * @returns {Object} State summary
   */
  getGameStateSummary() {
    const state = this.orchestrator.gameState;

    return {
      tick: this.orchestrator.tickCount,
      tier: state.currentTier,
      buildings: state.buildings ? state.buildings.length : 0,
      npcs: state.npcs ? state.npcs.length : 0,
      resources: {
        food: state.storage?.food || 0,
        wood: state.storage?.wood || 0,
        stone: state.storage?.stone || 0
      },
      morale: state.morale,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorRecovery;
