/**
 * AutoSaveManager.js - Automatic game save system
 *
 * Features:
 * - Configurable auto-save interval (default: 60s)
 * - Save success/failure tracking
 * - Last save timestamp
 * - Enable/disable auto-save
 * - Manual save trigger
 * - Save state callbacks for UI updates
 *
 * Usage:
 * const autoSave = new AutoSaveManager(gameManager, options);
 * autoSave.start();
 */

/**
 * AutoSaveManager - Manages automatic game saves
 */
export class AutoSaveManager {
  /**
   * Create an AutoSaveManager instance
   * @param {Object} gameManager - GameManager instance with saveGame method
   * @param {Object} options - Configuration options
   * @param {number} options.interval - Auto-save interval in milliseconds (default: 60000)
   * @param {Function} options.onSaveStart - Callback when save starts
   * @param {Function} options.onSaveSuccess - Callback when save succeeds (receives save data)
   * @param {Function} options.onSaveError - Callback when save fails (receives error)
   * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
   * @param {string} options.slotName - Save slot name (default: 'autosave')
   */
  constructor(gameManager, options = {}) {
    if (!gameManager) {
      throw new Error('AutoSaveManager requires a GameManager instance');
    }

    this.gameManager = gameManager;
    this.options = {
      interval: options.interval || 60000, // 60 seconds default
      onSaveStart: options.onSaveStart || (() => {}),
      onSaveSuccess: options.onSaveSuccess || (() => {}),
      onSaveError: options.onSaveError || (() => {}),
      enabled: options.enabled !== false, // Default to enabled
      slotName: options.slotName || 'autosave'
    };

    this.intervalId = null;
    this.lastSaveTime = null;
    this.lastSaveStatus = null; // 'success' | 'error' | null
    this.lastError = null;
    this.saveCount = 0;
    this.isRunning = false;
    this.isSaving = false;
  }

  /**
   * Start auto-save timer
   * @returns {boolean} True if started successfully
   */
  start() {
    if (this.isRunning) {
      console.warn('[AutoSaveManager] Already running');
      return false;
    }

    if (!this.options.enabled) {
      console.log('[AutoSaveManager] Auto-save is disabled');
      return false;
    }

    console.log(`[AutoSaveManager] Starting with ${this.options.interval}ms interval`);

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.performSave();
    }, this.options.interval);

    return true;
  }

  /**
   * Stop auto-save timer
   * @returns {boolean} True if stopped successfully
   */
  stop() {
    if (!this.isRunning) {
      console.warn('[AutoSaveManager] Not running');
      return false;
    }

    console.log('[AutoSaveManager] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    return true;
  }

  /**
   * Perform an auto-save
   * @returns {Promise<Object>} Save result
   */
  async performSave() {
    if (this.isSaving) {
      console.log('[AutoSaveManager] Save already in progress, skipping');
      return { success: false, message: 'Save already in progress' };
    }

    this.isSaving = true;
    this.options.onSaveStart();

    try {
      console.log('[AutoSaveManager] Starting auto-save...');

      const result = await this.gameManager.saveGame(
        this.options.slotName,
        `Auto-save at ${new Date().toLocaleString()}`
      );

      if (result.success) {
        this.lastSaveTime = Date.now();
        this.lastSaveStatus = 'success';
        this.lastError = null;
        this.saveCount++;

        console.log(`[AutoSaveManager] Auto-save #${this.saveCount} successful`);
        this.options.onSaveSuccess(result);
      } else {
        this.lastSaveStatus = 'error';
        this.lastError = result.message || 'Unknown error';

        console.error('[AutoSaveManager] Auto-save failed:', this.lastError);
        this.options.onSaveError(new Error(this.lastError));
      }

      this.isSaving = false;
      return result;
    } catch (error) {
      this.lastSaveStatus = 'error';
      this.lastError = error.message;
      this.isSaving = false;

      console.error('[AutoSaveManager] Auto-save error:', error);
      this.options.onSaveError(error);

      return { success: false, message: error.message };
    }
  }

  /**
   * Trigger a manual save (doesn't reset the timer)
   * @returns {Promise<Object>} Save result
   */
  async manualSave() {
    console.log('[AutoSaveManager] Manual save triggered');
    return await this.performSave();
  }

  /**
   * Enable auto-save
   */
  enable() {
    this.options.enabled = true;
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Disable auto-save
   */
  disable() {
    this.options.enabled = false;
    if (this.isRunning) {
      this.stop();
    }
  }

  /**
   * Update auto-save interval
   * @param {number} intervalMs - New interval in milliseconds
   */
  setInterval(intervalMs) {
    if (intervalMs < 10000) {
      console.warn('[AutoSaveManager] Interval too short, minimum is 10 seconds');
      intervalMs = 10000;
    }

    this.options.interval = intervalMs;

    // Restart timer with new interval if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get time since last save in milliseconds
   * @returns {number|null} Milliseconds since last save, or null if never saved
   */
  getTimeSinceLastSave() {
    if (!this.lastSaveTime) return null;
    return Date.now() - this.lastSaveTime;
  }

  /**
   * Get time until next auto-save in milliseconds
   * @returns {number|null} Milliseconds until next save, or null if not running
   */
  getTimeUntilNextSave() {
    if (!this.isRunning || !this.lastSaveTime) return null;

    const timeSinceLastSave = this.getTimeSinceLastSave();
    const timeUntilNext = this.options.interval - timeSinceLastSave;

    return Math.max(0, timeUntilNext);
  }

  /**
   * Get auto-save status information
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isSaving: this.isSaving,
      enabled: this.options.enabled,
      interval: this.options.interval,
      lastSaveTime: this.lastSaveTime,
      lastSaveStatus: this.lastSaveStatus,
      lastError: this.lastError,
      saveCount: this.saveCount,
      timeSinceLastSave: this.getTimeSinceLastSave(),
      timeUntilNextSave: this.getTimeUntilNextSave()
    };
  }

  /**
   * Reset auto-save statistics
   */
  resetStats() {
    this.lastSaveTime = null;
    this.lastSaveStatus = null;
    this.lastError = null;
    this.saveCount = 0;
  }

  /**
   * Cleanup and destroy the auto-save manager
   */
  destroy() {
    this.stop();
    this.gameManager = null;
    this.resetStats();
  }
}

export default AutoSaveManager;
