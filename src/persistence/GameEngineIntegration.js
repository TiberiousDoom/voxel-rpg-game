/**
 * GameEngineIntegration.js - Integration layer between GameEngine and SaveManager
 *
 * Connects:
 * - GameEngine events to SaveManager auto-save
 * - Orchestrator state to persistence layer
 * - Error handling and recovery
 */

class GameEngineIntegration {
  /**
   * Initialize game engine persistence integration
   * @param {GameEngine} engine - Game engine instance
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator
   * @param {SaveManager} saveManager - Save manager instance
   */
  constructor(engine, orchestrator, saveManager) {
    if (!engine) throw new Error('GameEngineIntegration requires GameEngine');
    if (!orchestrator) throw new Error('GameEngineIntegration requires ModuleOrchestrator');
    if (!saveManager) throw new Error('GameEngineIntegration requires SaveManager');

    this.engine = engine;
    this.orchestrator = orchestrator;
    this.saveManager = saveManager;

    this.isEnabled = false;
    this.autoSaveInterval = null;
    this.lastAutoSaveTime = 0;
    this.autoSaveFrequency = 300; // 5 minutes default
  }

  /**
   * Enable persistence integration
   * Hooks into engine events and starts auto-save
   */
  enable() {
    if (this.isEnabled) return;

    // Hook into engine auto-save events
    this.engine.on('game:autosave', (tickNumber) => {
      this._onAutoSaveEvent(tickNumber);
    });

    // Hook into game start
    this.engine.on('game:start', () => {
      this._onGameStart();
    });

    // Hook into game stop
    this.engine.on('game:stop', () => {
      this._onGameStop();
    });

    this.isEnabled = true;
  }

  /**
   * Disable persistence integration
   */
  disable() {
    if (!this.isEnabled) return;

    // Remove event listeners
    this.engine.off('game:autosave', this._onAutoSaveEvent);
    this.engine.off('game:start', this._onGameStart);
    this.engine.off('game:stop', this._onGameStop);

    this.isEnabled = false;
  }

  /**
   * Perform manual save
   * @param {string} slotName - Save slot name
   * @param {string} description - Save description
   * @returns {Object} Save result
   */
  quickSave(slotName = 'quicksave', description = 'Quick save') {
    return this.saveManager.saveGame(
      this.orchestrator,
      this.engine,
      slotName,
      description
    );
  }

  /**
   * Load a saved game
   * @param {string} slotName - Save slot to load
   * @returns {Object} Load result
   */
  quickLoad(slotName = 'quicksave') {
    return this.saveManager.loadGame(
      slotName,
      this.orchestrator,
      this.engine
    );
  }

  /**
   * Auto-save to numbered slots
   * Creates rolling auto-saves (slot 1, 2, 3, ... cycling)
   */
  enableRollingAutoSave(maxSlots = 3) {
    this.rollingAutoSaveSlots = maxSlots;
    this.currentAutoSaveSlot = 0;
  }

  /**
   * Get auto-save information
   * @returns {Object} Auto-save status and info
   */
  getAutoSaveInfo() {
    return {
      enabled: this.isEnabled,
      lastSaveTime: this.lastAutoSaveTime,
      currentSlot: this.saveManager.getCurrentSave(),
      availableSaves: this.saveManager.listSaves().length
    };
  }

  // ============================================
  // PRIVATE EVENT HANDLERS
  // ============================================

  /**
   * Handle auto-save event from engine
   * @private
   */
  _onAutoSaveEvent(tickNumber) {
    const now = Date.now();

    // Only save if enough time has passed (throttling)
    if (now - this.lastAutoSaveTime < this.autoSaveFrequency * 1000) {
      return;
    }

    try {
      let slotName = 'autosave';

      // Use rolling slots if enabled
      if (this.rollingAutoSaveSlots) {
        slotName = `autosave-slot-${this.currentAutoSaveSlot + 1}`;
        this.currentAutoSaveSlot = (this.currentAutoSaveSlot + 1) % this.rollingAutoSaveSlots;
      }

      const result = this.saveManager.saveGame(
        this.orchestrator,
        this.engine,
        slotName,
        `Auto-save at tick ${tickNumber}`
      );

      if (result.success) {
        this.lastAutoSaveTime = now;
      }
    } catch (err) {
      // Log but don't crash on auto-save failure
      console.error('Auto-save failed:', err.message);
    }
  }

  /**
   * Handle game start event
   * @private
   */
  _onGameStart() {
    // Could add any persistence-related startup logic here
  }

  /**
   * Handle game stop event
   * @private
   */
  _onGameStop() {
    // Perform final save on shutdown
    try {
      this.saveManager.saveGame(
        this.orchestrator,
        this.engine,
        'last-session',
        'Final save before shutdown'
      );
    } catch (err) {
      console.error('Final save on shutdown failed:', err.message);
    }
  }
}

module.exports = GameEngineIntegration;
