/**
 * PerformanceMonitor.js - Game performance tracking and analysis
 *
 * Monitors:
 * - Frame rate and frame timing
 * - Tick execution time
 * - Module-specific performance
 * - Memory usage patterns
 * - Identifies performance bottlenecks
 *
 * Provides:
 * - Real-time metrics
 * - Performance reports
 * - Bottleneck identification
 * - Performance alerts
 */

class PerformanceMonitor {
  /**
   * Performance thresholds for warnings/alerts
   */
  static THRESHOLDS = {
    MAX_FRAME_TIME_MS: 16.67, // 60 FPS = 16.67ms per frame
    MAX_TICK_TIME_MS: 5.0, // Should complete in <5ms
    MIN_TARGET_FPS: 30, // Warn if below 30 FPS
    MEMORY_WARNING_MB: 100, // Warn if memory > 100MB
    MEMORY_CRITICAL_MB: 200 // Critical if > 200MB
  };

  /**
   * Initialize performance monitor
   * @param {GameEngine} engine - Game engine to monitor
   * @param {ModuleOrchestrator} orchestrator - Orchestrator to monitor
   */
  constructor(engine, orchestrator) {
    this.engine = engine;
    this.orchestrator = orchestrator;

    this.isEnabled = false;
    this.metrics = {
      frameMetrics: {
        totalFrames: 0,
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: Infinity,
        currentFPS: 60,
        frameHistory: [] // Last 60 frames
      },
      tickMetrics: {
        totalTicks: 0,
        avgTickTime: 0,
        maxTickTime: 0,
        minTickTime: Infinity,
        tickHistory: [] // Last 60 ticks
      },
      moduleMetrics: {
        // Track time spent in each module during ticks
        production: { total: 0, count: 0 },
        consumption: { total: 0, count: 0 },
        morale: { total: 0, count: 0 },
        npc: { total: 0, count: 0 },
        overflow: { total: 0, count: 0 }
      },
      alerts: []
    };

    this.recordingSession = null;
  }

  /**
   * Enable performance monitoring
   */
  enable() {
    if (this.isEnabled) return;

    // Hook into engine events
    if (this.engine) {
      this.engine.on('tick:complete', (result) => {
        this._recordTickMetrics(result);
      });
    }

    this.isEnabled = true;
  }

  /**
   * Disable performance monitoring
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Start performance recording session
   * @param {string} name - Session name
   * @returns {Object} Recording session ID
   */
  startSession(name = 'performance-session') {
    this.recordingSession = {
      name,
      startTime: performance.now(),
      startTick: this.orchestrator?.tickCount || 0,
      metrics: {
        frameMetrics: { ...this.metrics.frameMetrics },
        tickMetrics: { ...this.metrics.tickMetrics },
        moduleMetrics: JSON.parse(JSON.stringify(this.metrics.moduleMetrics))
      }
    };

    return this.recordingSession;
  }

  /**
   * End performance recording session
   * @returns {Object} Performance report for session
   */
  endSession() {
    if (!this.recordingSession) {
      return { success: false, error: 'No active session' };
    }

    const sessionDuration = performance.now() - this.recordingSession.startTime;
    const ticksDone = (this.orchestrator?.tickCount || 0) - this.recordingSession.startTick;

    const report = {
      name: this.recordingSession.name,
      duration: sessionDuration,
      ticksExecuted: ticksDone,
      metrics: this._calculateSessionMetrics(),
      bottlenecks: this._identifyBottlenecks(),
      recommendations: this._generateRecommendations()
    };

    this.recordingSession = null;
    return report;
  }

  /**
   * Get current performance snapshot
   * @returns {Object} Current performance metrics
   */
  getSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      frameMetrics: { ...this.metrics.frameMetrics },
      tickMetrics: { ...this.metrics.tickMetrics },
      moduleMetrics: JSON.parse(JSON.stringify(this.metrics.moduleMetrics)),
      alerts: [...this.metrics.alerts]
    };
  }

  /**
   * Get performance report
   * @returns {Object} Comprehensive performance report
   */
  getReport() {
    return {
      summary: {
        avgFPS: this.metrics.frameMetrics.currentFPS.toFixed(1),
        avgFrameTime: this.metrics.frameMetrics.avgFrameTime.toFixed(2),
        avgTickTime: this.metrics.tickMetrics.avgTickTime.toFixed(2),
        totalFrames: this.metrics.frameMetrics.totalFrames,
        totalTicks: this.metrics.tickMetrics.totalTicks
      },
      frameMetrics: this.metrics.frameMetrics,
      tickMetrics: this.metrics.tickMetrics,
      moduleMetrics: this.metrics.moduleMetrics,
      bottlenecks: this._identifyBottlenecks(),
      alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
      recommendations: this._generateRecommendations()
    };
  }

  /**
   * Get FPS history for graphing
   * @returns {Array} FPS values over time
   */
  getFPSHistory() {
    return this.metrics.frameMetrics.frameHistory.map(f => {
      if (f.time === 0) return 60;
      return (1000 / f.time).toFixed(1);
    });
  }

  /**
   * Get tick time history for graphing
   * @returns {Array} Tick times over time
   */
  getTickTimeHistory() {
    return this.metrics.tickMetrics.tickHistory.map(t => t.time);
  }

  /**
   * Record tick metrics from engine
   * @private
   */
  _recordTickMetrics(tickResult) {
    if (!this.isEnabled || !tickResult) return;

    const tickTime = parseFloat(tickResult.tickTimeMs || 0);

    // Update tick metrics
    this.metrics.tickMetrics.totalTicks++;
    this.metrics.tickMetrics.tickHistory.push({ time: tickTime });

    // Keep rolling window of last 60 ticks
    if (this.metrics.tickMetrics.tickHistory.length > 60) {
      this.metrics.tickMetrics.tickHistory.shift();
    }

    // Update tick statistics
    const times = this.metrics.tickMetrics.tickHistory.map(t => t.time);
    this.metrics.tickMetrics.avgTickTime = times.reduce((a, b) => a + b, 0) / times.length;
    this.metrics.tickMetrics.maxTickTime = Math.max(...times);
    this.metrics.tickMetrics.minTickTime = Math.min(...times);

    // Check for tick time alerts
    if (tickTime > PerformanceMonitor.THRESHOLDS.MAX_TICK_TIME_MS) {
      this._addAlert(
        'TICK_SLOW',
        `Slow tick: ${tickTime.toFixed(2)}ms (target: <${PerformanceMonitor.THRESHOLDS.MAX_TICK_TIME_MS}ms)`
      );
    }
  }

  /**
   * Calculate metrics for current session
   * @private
   */
  _calculateSessionMetrics() {
    const frameHistory = this.metrics.frameMetrics.frameHistory;
    const tickHistory = this.metrics.tickMetrics.tickHistory;

    return {
      frames: {
        total: frameHistory.length,
        avgFPS: frameHistory.length > 0
          ? (frameHistory.length / (frameHistory.reduce((a, f) => a + f.time, 0) / 1000)).toFixed(1)
          : '0',
        avgTime: frameHistory.length > 0
          ? (frameHistory.reduce((a, f) => a + f.time, 0) / frameHistory.length).toFixed(2)
          : '0'
      },
      ticks: {
        total: tickHistory.length,
        avgTime: tickHistory.length > 0
          ? (tickHistory.reduce((a, t) => a + t.time, 0) / tickHistory.length).toFixed(2)
          : '0',
        maxTime: tickHistory.length > 0
          ? Math.max(...tickHistory.map(t => t.time)).toFixed(2)
          : '0'
      }
    };
  }

  /**
   * Identify performance bottlenecks
   * @private
   */
  _identifyBottlenecks() {
    const bottlenecks = [];
    const moduleMetrics = this.metrics.moduleMetrics;

    // Find slowest modules
    const slowest = Object.entries(moduleMetrics)
      .map(([name, data]) => ({
        name,
        avgTime: data.count > 0 ? data.total / data.count : 0
      }))
      .filter(m => m.avgTime > 0)
      .sort((a, b) => b.avgTime - a.avgTime);

    for (const module of slowest.slice(0, 3)) {
      if (module.avgTime > 1.0) {
        bottlenecks.push({
          module: module.name,
          avgTime: module.avgTime.toFixed(2),
          severity: module.avgTime > 2.0 ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    // Check FPS
    if (this.metrics.frameMetrics.currentFPS < PerformanceMonitor.THRESHOLDS.MIN_TARGET_FPS) {
      bottlenecks.push({
        module: 'frame-rate',
        avgFPS: this.metrics.frameMetrics.currentFPS.toFixed(1),
        severity: 'WARNING'
      });
    }

    // Check tick time
    if (this.metrics.tickMetrics.avgTickTime > PerformanceMonitor.THRESHOLDS.MAX_TICK_TIME_MS) {
      bottlenecks.push({
        module: 'tick-execution',
        avgTime: this.metrics.tickMetrics.avgTickTime.toFixed(2),
        severity: 'WARNING'
      });
    }

    return bottlenecks;
  }

  /**
   * Generate performance recommendations
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];
    const bottlenecks = this._identifyBottlenecks();

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.module) {
        case 'production':
          recommendations.push('Consider optimizing production calculation or reducing building count');
          break;
        case 'consumption':
          recommendations.push('NPC consumption is slow - consider batch processing');
          break;
        case 'morale':
          recommendations.push('Morale calculation can be optimized with caching');
          break;
        case 'npc':
          recommendations.push('NPC updates are slow - consider spatial partitioning');
          break;
        case 'tick-execution':
          recommendations.push('Reduce tick frequency or optimize module execution order');
          break;
        case 'frame-rate':
          recommendations.push('Frame rate is below target - reduce visual complexity or optimize rendering');
          break;
        default:
          recommendations.push(`Optimize ${bottleneck.module} module`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits');
    }

    return recommendations;
  }

  /**
   * Add performance alert
   * @private
   */
  _addAlert(type, message) {
    this.metrics.alerts.push({
      type,
      message,
      timestamp: new Date().toISOString()
    });

    // Keep last 100 alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts.shift();
    }
  }

  /**
   * Update module metrics
   * @param {string} moduleName - Module name
   * @param {number} timeMs - Time spent in module (ms)
   */
  recordModuleTime(moduleName, timeMs) {
    if (!this.metrics.moduleMetrics[moduleName]) {
      this.metrics.moduleMetrics[moduleName] = { total: 0, count: 0 };
    }

    this.metrics.moduleMetrics[moduleName].total += timeMs;
    this.metrics.moduleMetrics[moduleName].count++;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      frameMetrics: {
        totalFrames: 0,
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: Infinity,
        currentFPS: 60,
        frameHistory: []
      },
      tickMetrics: {
        totalTicks: 0,
        avgTickTime: 0,
        maxTickTime: 0,
        minTickTime: Infinity,
        tickHistory: []
      },
      moduleMetrics: {
        production: { total: 0, count: 0 },
        consumption: { total: 0, count: 0 },
        morale: { total: 0, count: 0 },
        npc: { total: 0, count: 0 },
        overflow: { total: 0, count: 0 }
      },
      alerts: []
    };
  }
}

export default PerformanceMonitor;
