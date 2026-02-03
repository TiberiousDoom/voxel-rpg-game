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
 *
 * WF6 Performance Optimizations:
 * - RequestAnimationFrame for smoother frame timing
 * - Performance.now() for high-precision timing
 * - Tick spiral prevention (max 3 ticks per frame)
 * - Automatic tick timer reset on lag spikes
 * - Paused state optimization (skip updates when paused)
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

    // Animation frame tracking (for proper cleanup)
    this.animationFrameId = null;

    // Events
    this.eventListeners = new Map();

    // Game state snapshots
    this.gameHistory = [];
    this.maxHistorySize = 100;

    // Performance Profiler (Issue #28)
    this.profiler = {
      enabled: options.enableProfiling !== false,
      samples: [],
      maxSamples: 120, // 2 seconds at 60 FPS
      systems: {
        tick: { total: 0, count: 0, max: 0, min: Infinity },
        npcMovement: { total: 0, count: 0, max: 0, min: Infinity },
        terrainWorker: { total: 0, count: 0, max: 0, min: Infinity },
        frameTotal: { total: 0, count: 0, max: 0, min: Infinity },
      },
      lastReport: 0,
      reportInterval: 5000, // Report every 5 seconds
    };
  }

  /**
   * Profile a system's execution time
   * @param {string} systemName - Name of the system being profiled
   * @param {Function} fn - Function to execute and time
   * @returns {*} Result of the function
   * @private
   */
  _profileSystem(systemName, fn) {
    if (!this.profiler.enabled) {
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;

    const stats = this.profiler.systems[systemName];
    if (stats) {
      stats.total += elapsed;
      stats.count++;
      stats.max = Math.max(stats.max, elapsed);
      stats.min = Math.min(stats.min, elapsed);
    }

    return result;
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

    // Cancel any pending animation frame to prevent memory leak
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

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
   * Main game loop (OPTIMIZED for WF6)
   * @private
   */
  _gameLoop() {
    if (!this.isRunning) return;

    const frameStart = performance.now();
    const deltaTime = frameStart - this.lastFrameTime;
    this.lastFrameTime = frameStart;

    // Skip frame if paused
    if (!this.isPaused) {
      // Update timers
      this.tickTimer += deltaTime;

      // Execute game ticks (limit to max 3 per frame to prevent spiral of death)
      let ticksThisFrame = 0;
      const maxTicksPerFrame = 3;

      while (this.tickTimer >= this.config.gameTick && ticksThisFrame < maxTicksPerFrame) {
        this._profileSystem('tick', () => this._executeTick());
        this.tickTimer -= this.config.gameTick;
        this.ticksElapsed++;
        ticksThisFrame++;

        // Check auto-save
        if (this.ticksElapsed % this.config.autoSaveInterval === 0) {
          this.emit('game:autosave', this.ticksElapsed);
        }
      }

      // If we're falling behind, reset timer to prevent spiral
      if (this.tickTimer > this.config.gameTick * 2) {
        console.warn('[GameEngine] Tick spiral detected, resetting timer');
        this.tickTimer = 0;
      }

      // Phase 4: Update terrain worker behavior (60 FPS for smooth NPC movement)
      if (this.orchestrator.terrainWorkerBehavior) {
        const deltaTimeSeconds = deltaTime / 1000;
        this._profileSystem('terrainWorker', () =>
          this.orchestrator.terrainWorkerBehavior.update(deltaTimeSeconds)
        );
      }

      // Update NPC movement (60 FPS for smooth movement)
      if (this.orchestrator.npcManager && this.orchestrator.npcManager.updateMovement) {
        const deltaTimeSeconds = deltaTime / 1000;
        this._profileSystem('npcMovement', () =>
          this.orchestrator.npcManager.updateMovement(deltaTimeSeconds)
        );
      }

      // Update frame metrics
      this._updateFrameMetrics(deltaTime);

      // Profile total frame time
      const frameTime = performance.now() - frameStart;
      this._recordFrameSample(frameTime);

      // Emit profiling report periodically
      if (this.profiler.enabled && frameStart - this.profiler.lastReport > this.profiler.reportInterval) {
        this.profiler.lastReport = frameStart;
        this.emit('profiler:report', this.getProfilingStats());
      }
    }

    // Schedule next frame using requestAnimationFrame for better performance
    // Store the ID so we can cancel it later (prevents memory leak)
    // Fallback to setTimeout if RAF not available
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
    } else {
      const targetFrameTime = 1000 / this.config.targetFPS;
      const elapsed = performance.now() - frameStart;
      const delay = Math.max(0, targetFrameTime - elapsed);
      setTimeout(() => this._gameLoop(), delay);
    }
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
   * Record a frame time sample for profiling
   * @param {number} frameTime - Frame execution time in ms
   * @private
   */
  _recordFrameSample(frameTime) {
    if (!this.profiler.enabled) return;

    this.profiler.samples.push(frameTime);
    if (this.profiler.samples.length > this.profiler.maxSamples) {
      this.profiler.samples.shift();
    }

    // Update frame total stats
    const stats = this.profiler.systems.frameTotal;
    stats.total += frameTime;
    stats.count++;
    stats.max = Math.max(stats.max, frameTime);
    stats.min = Math.min(stats.min, frameTime);
  }

  /**
   * Get profiling statistics
   * @returns {Object} Profiling data for all systems
   */
  getProfilingStats() {
    const result = {
      fps: this.fps,
      frameTime: this.frameTime,
      systems: {},
      samples: this.profiler.samples.slice(-60), // Last 60 samples
      warnings: [],
    };

    // Calculate stats for each system
    for (const [name, stats] of Object.entries(this.profiler.systems)) {
      if (stats.count > 0) {
        const avg = stats.total / stats.count;
        result.systems[name] = {
          avg: avg.toFixed(2),
          max: stats.max.toFixed(2),
          min: stats.min === Infinity ? '0.00' : stats.min.toFixed(2),
          count: stats.count,
          percentOfFrame: ((avg / 16.67) * 100).toFixed(1), // % of 60 FPS frame budget
        };

        // Warn if system is taking too long (>5ms)
        if (avg > 5) {
          result.warnings.push(`${name}: ${avg.toFixed(2)}ms avg (>5ms threshold)`);
        }
      }
    }

    // Check if we're hitting 60 FPS
    result.targetMet = this.fps >= 55;

    return result;
  }

  /**
   * Reset profiling statistics
   */
  resetProfilingStats() {
    for (const stats of Object.values(this.profiler.systems)) {
      stats.total = 0;
      stats.count = 0;
      stats.max = 0;
      stats.min = Infinity;
    }
    this.profiler.samples = [];
  }

  /**
   * Enable or disable profiling
   * @param {boolean} enabled - Whether to enable profiling
   */
  setProfilingEnabled(enabled) {
    this.profiler.enabled = enabled;
    if (!enabled) {
      this.resetProfilingStats();
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

export default GameEngine;
