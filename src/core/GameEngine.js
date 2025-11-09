/**
 * GameEngine.js - Main game loop and engine
 *
 * Responsibilities:
 * - Main game loop (target 60 FPS)
 * - Tick coordination (5-second game ticks)
 * - Game state management
 * - Event system
 * - Performance monitoring
 *
 * Game Tick Cycle:
 * - Real-time: 60 FPS display updates
 * - Game Tick: 5-second intervals (12 ticks per minute)
 * - Production: Every game tick
 * - Consumption: Every game tick
 * - Morale: Every game tick
 * - Saves: Every 10 ticks (50 seconds)
 */

class GameEngine {
  /**
   * Initialize game engine
   * @param {ModuleOrchestrator} orchestrator - Central coordinator
   * @param {Object} options - Engine options
   */
  constructor(orchestrator, options = {}) {
    if (!orchestrator) {
      throw new Error('GameEngine requires ModuleOrchestrator');
    }

    this.orchestrator = orchestrator;

    // Configuration
    this.config = {
      targetFPS: options.targetFPS || 60,
      gameTick: options.gameTick || 5000, // 5 seconds in ms
      autoSaveInterval: options.autoSaveInterval || 50, // Every 50 ticks
      ...options
    };

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.frameCount = 0;
    this.ticksElapsed = 0;

    // Performance
    this.frameTime = 0;
    this.fps = 60;
    this.lastFrameTime = Date.now();
    this.frameTimestamps = [];

    // Timers
    this.tickTimer = 0;
    this.autoSaveTimer = 0;

    // Events
    this.eventListeners = new Map();

    // Game state snapshots
    this.gameHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Start the game engine
   * @returns {Promise} Resolves when engine starts
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = Date.now();

    this.emit('game:start');

    // Start main game loop
    this._gameLoop();

    return new Promise(resolve => {
      setTimeout(resolve, 100);
    });
  }

  /**
   * Stop the game engine
   */
  async stop() {
    this.isRunning = false;
    this.emit('game:stop');
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.isPaused) return;

    this.isPaused = true;
    this.orchestrator.pause();
    this.emit('game:paused');
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.orchestrator.resume();
    this.lastFrameTime = Date.now(); // Reset timer
    this.emit('game:resumed');
  }

  /**
   * Main game loop
   * @private
   */
  _gameLoop() {
    if (!this.isRunning) return;

    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update timers
    this.tickTimer += deltaTime;
    this.autoSaveTimer += deltaTime;

    // Execute game ticks
    while (this.tickTimer >= this.config.gameTick) {
      this._executeTick();
      this.tickTimer -= this.config.gameTick;
      this.ticksElapsed++;

      // Check auto-save
      if (this.ticksElapsed % this.config.autoSaveInterval === 0) {
        this.emit('game:autosave', this.ticksElapsed);
      }
    }

    // Update frame metrics
    this._updateFrameMetrics(deltaTime);

    // Schedule next frame
    const frameTime = 1000 / this.config.targetFPS;
    const delay = Math.max(0, frameTime - (Date.now() - now));

    setTimeout(() => this._gameLoop(), delay);
  }

  /**
   * Execute one game tick
   * @private
   */
  _executeTick() {
    const tickStart = Date.now();

    const result = this.orchestrator.executeTick();

    const tickTime = Date.now() - tickStart;

    // Store in history (limited size)
    this._addToHistory({
      tick: result.tick,
      production: result.production,
      consumption: result.consumption,
      morale: result.morale,
      tickTime: tickTime,
      state: this.orchestrator.getGameState()
    });

    // Emit events
    this.emit('tick:complete', result);

    if (result.production && Object.keys(result.production).length > 0) {
      this.emit('production:update', result.production);
    }

    if (result.consumption > 0) {
      this.emit('consumption:update', result.consumption);
    }

    if (result.starvationEvents) {
      this.emit('warning:starvation', result.starvationEvents);
    }

    if (result.overflow) {
      this.emit('warning:overflow', result.overflow);
    }

    if (result.errors && result.errors.length > 0) {
      this.emit('error:tick', result.errors);
    }
  }

  /**
   * Update frame metrics
   * @private
   */
  _updateFrameMetrics(deltaTime) {
    this.frameTime = deltaTime;
    this.frameCount++;

    // Track frame timestamps
    this.frameTimestamps.push(Date.now());
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }

    // Calculate FPS
    if (this.frameTimestamps.length >= 60) {
      const oldest = this.frameTimestamps[0];
      const newest = this.frameTimestamps[this.frameTimestamps.length - 1];
      const elapsed = (newest - oldest) / 1000;
      this.fps = Math.round(60 / elapsed);
    }
  }

  /**
   * Add state to history
   * @private
   */
  _addToHistory(snapshot) {
    this.gameHistory.push(snapshot);
    if (this.gameHistory.length > this.maxHistorySize) {
      this.gameHistory.shift();
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Unregister event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;

    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) return;

    const listeners = this.eventListeners.get(event);
    for (const callback of listeners) {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    }
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    return {
      running: this.isRunning,
      paused: this.isPaused,
      frameCount: this.frameCount,
      ticksElapsed: this.ticksElapsed,
      currentFPS: this.fps,
      frameTime: this.frameTime.toFixed(2),
      orchestratorStats: this.orchestrator.getStatistics()
    };
  }

  /**
   * Get game state snapshot
   */
  getGameSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      frameCount: this.frameCount,
      ticksElapsed: this.ticksElapsed,
      state: this.orchestrator.getGameState(),
      stats: this.orchestrator.getStatistics()
    };
  }

  /**
   * Get game history
   */
  getHistory() {
    return [...this.gameHistory];
  }

  /**
   * Load state from history (for replay)
   * @param {number} index - History index
   */
  loadFromHistory(index) {
    if (index < 0 || index >= this.gameHistory.length) {
      throw new Error('Invalid history index');
    }

    const snapshot = this.gameHistory[index];
    this.emit('history:loaded', snapshot);
    return snapshot;
  }
}

module.exports = GameEngine;
