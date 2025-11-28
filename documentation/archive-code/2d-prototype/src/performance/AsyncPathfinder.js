/**
 * AsyncPathfinder.js - Async pathfinding with Web Worker
 *
 * Provides a clean Promise-based API for pathfinding that runs in a
 * Web Worker, preventing main thread blocking. Includes automatic
 * result caching and worker pool management.
 *
 * Performance Benefits:
 * - Non-blocking pathfinding (maintains 60 FPS)
 * - Automatic result caching
 * - Worker pool for concurrent requests
 * - Graceful degradation if workers unavailable
 *
 * Usage:
 * ```javascript
 * const pathfinder = new AsyncPathfinder(gridManager);
 * const path = await pathfinder.findPath(start, goal);
 * pathfinder.updateGrid(occupiedCells);
 * ```
 */

class AsyncPathfinder {
  /**
   * Initialize async pathfinder
   * @param {Object} gridManager - Grid manager for fallback sync pathfinding
   * @param {Object} options - Configuration options
   */
  constructor(gridManager, options = {}) {
    this.gridManager = gridManager;

    // Configuration
    this.config = {
      workerCount: options.workerCount || 2,
      enableWorkers: options.enableWorkers !== false,
      enableCache: options.enableCache !== false,
      cacheSize: options.cacheSize || 500,
      timeout: options.timeout || 5000, // 5 seconds
      fallbackToSync: options.fallbackToSync !== false,
      ...options
    };

    // Workers
    this.workers = [];
    this.workerIndex = 0;
    this.workersReady = false;

    // Request tracking
    this.pendingRequests = new Map(); // id -> { resolve, reject, timeout }
    this.requestId = 0;

    // Statistics
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      workerRequests: 0,
      syncFallbackRequests: 0,
      averageTimeMs: 0,
      totalTimeMs: 0
    };

    // Initialize workers
    if (this.config.enableWorkers && typeof Worker !== 'undefined') {
      this._initializeWorkers();
    } else {
      console.warn('[AsyncPathfinder] Web Workers not available, using sync fallback');
    }
  }

  /**
   * Initialize Web Workers
   * @private
   */
  _initializeWorkers() {
    try {
      for (let i = 0; i < this.config.workerCount; i++) {
        const worker = new Worker(
          new URL('../workers/pathfinding-worker.js', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e) => this._handleWorkerMessage(e.data);
        worker.onerror = (err) => this._handleWorkerError(err);

        this.workers.push(worker);
      }

      this.workersReady = true;
    } catch (err) {
      console.error('[AsyncPathfinder] Failed to initialize workers:', err);
      this.workersReady = false;
    }
  }

  /**
   * Get next available worker (round-robin)
   * @returns {Worker} Worker instance
   * @private
   */
  _getNextWorker() {
    if (this.workers.length === 0) return null;

    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * Handle worker message
   * @param {Object} data - Message data
   * @private
   */
  _handleWorkerMessage(data) {
    switch (data.type) {
      case 'ready':
        console.log('[AsyncPathfinder] Worker ready');
        break;

      case 'pathResult':
        this._handlePathResult(data);
        break;

      case 'error':
        this._handlePathError(data);
        break;

      case 'stats':
        // Worker statistics (for debugging)
        break;

      case 'cacheCleared':
      case 'gridUpdated':
        // Acknowledgment messages
        break;

      default:
        console.warn('[AsyncPathfinder] Unknown worker message:', data.type);
    }
  }

  /**
   * Handle path result from worker
   * @param {Object} data - Result data
   * @private
   */
  _handlePathResult(data) {
    const request = this.pendingRequests.get(data.id);
    if (!request) return;

    clearTimeout(request.timeout);
    this.pendingRequests.delete(data.id);

    const elapsed = performance.now() - request.startTime;

    // Update statistics
    this.stats.completedRequests++;
    this.stats.totalTimeMs += elapsed;
    this.stats.averageTimeMs = this.stats.totalTimeMs / this.stats.completedRequests;

    if (data.cached) {
      this.stats.cachedRequests++;
    } else {
      this.stats.workerRequests++;
    }

    // Resolve promise
    request.resolve({
      path: data.path,
      cached: data.cached,
      complete: data.complete !== false,
      partial: data.partial || false,
      stats: {
        ...data.stats,
        totalTimeMs: elapsed.toFixed(2)
      }
    });
  }

  /**
   * Handle path error from worker
   * @param {Object} data - Error data
   * @private
   */
  _handlePathError(data) {
    const request = this.pendingRequests.get(data.id);
    if (!request) return;

    clearTimeout(request.timeout);
    this.pendingRequests.delete(data.id);

    this.stats.failedRequests++;

    request.reject(new Error(data.error || 'Pathfinding failed'));
  }

  /**
   * Handle worker error
   * @param {Error} err - Error object
   * @private
   */
  _handleWorkerError(err) {
    console.error('[AsyncPathfinder] Worker error:', err);

    // Fail all pending requests
    for (const [id, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Worker error: ' + err.message));
      this.pendingRequests.delete(id);
      this.stats.failedRequests++;
    }
  }

  /**
   * Find path asynchronously
   * @param {Object} start - Start position {x, y, z}
   * @param {Object} goal - Goal position {x, y, z}
   * @param {Object} options - Pathfinding options
   * @returns {Promise<Object>} Path result
   */
  async findPath(start, goal, options = {}) {
    this.stats.totalRequests++;
    const startTime = performance.now();

    // Use worker if available
    if (this.workersReady && this.workers.length > 0) {
      return this._findPathWorker(start, goal, options, startTime);
    }

    // Fallback to sync pathfinding
    if (this.config.fallbackToSync) {
      return this._findPathSync(start, goal, options, startTime);
    }

    throw new Error('Pathfinding unavailable: Workers not initialized and sync fallback disabled');
  }

  /**
   * Find path using Web Worker
   * @param {Object} start - Start position
   * @param {Object} goal - Goal position
   * @param {Object} options - Options
   * @param {number} startTime - Start time
   * @returns {Promise<Object>} Path result
   * @private
   */
  _findPathWorker(start, goal, options, startTime) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const worker = this._getNextWorker();

      if (!worker) {
        reject(new Error('No workers available'));
        return;
      }

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.stats.failedRequests++;
        reject(new Error('Pathfinding timeout'));
      }, this.config.timeout);

      // Track request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout,
        startTime
      });

      // Send to worker
      worker.postMessage({
        id,
        type: 'findPath',
        start,
        goal,
        gridData: this._getGridData(),
        options: {
          ...options,
          useCache: this.config.enableCache
        }
      });
    });
  }

  /**
   * Find path synchronously (fallback)
   * @param {Object} start - Start position
   * @param {Object} goal - Goal position
   * @param {Object} options - Options
   * @param {number} startTime - Start time
   * @returns {Promise<Object>} Path result
   * @private
   */
  async _findPathSync(start, goal, options, startTime) {
    this.stats.syncFallbackRequests++;

    // Use the original PathfindingService from the grid manager
    const PathfindingService = (await import('../modules/npc-system/PathfindingService.js')).default;
    const pathfinder = new PathfindingService(this.gridManager);

    const path = pathfinder.findPath(start, goal, options);
    const elapsed = performance.now() - startTime;

    this.stats.completedRequests++;
    this.stats.totalTimeMs += elapsed;
    this.stats.averageTimeMs = this.stats.totalTimeMs / this.stats.completedRequests;

    return {
      path,
      cached: false,
      complete: path !== null,
      partial: false,
      stats: {
        timeMs: elapsed.toFixed(2),
        sync: true
      }
    };
  }

  /**
   * Get grid data for workers
   * @returns {Object} Grid data
   * @private
   */
  _getGridData() {
    // Convert occupied cells to array for transfer
    const occupiedCells = [];

    // This assumes gridManager has a method to get occupied cells
    // Adjust based on actual GridManager API
    if (this.gridManager && this.gridManager.getOccupiedCells) {
      const cells = this.gridManager.getOccupiedCells();
      for (const cell of cells) {
        occupiedCells.push(`${cell.x},${cell.y},${cell.z}`);
      }
    }

    return {
      occupiedCells,
      gridSize: this.gridManager.gridSize || 100,
      gridHeight: this.gridManager.gridHeight || 10
    };
  }

  /**
   * Update grid data in all workers
   * @param {Array} occupiedCells - Array of occupied cell strings "x,y,z"
   */
  updateGrid(occupiedCells = null) {
    if (!this.workersReady) return;

    const gridData = occupiedCells
      ? { occupiedCells }
      : this._getGridData();

    for (const worker of this.workers) {
      worker.postMessage({
        type: 'updateGrid',
        gridData
      });
    }
  }

  /**
   * Clear path cache in all workers
   */
  clearCache() {
    if (!this.workersReady) return;

    for (const worker of this.workers) {
      worker.postMessage({ type: 'clearCache' });
    }
  }

  /**
   * Get pathfinding statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? ((this.stats.completedRequests / this.stats.totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      pendingRequests: this.pendingRequests.size,
      workerCount: this.workers.length,
      workersReady: this.workersReady,
      successRate: `${successRate}%`,
      cacheHitRate: this.stats.completedRequests > 0
        ? `${((this.stats.cachedRequests / this.stats.completedRequests) * 100).toFixed(2)}%`
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      workerRequests: 0,
      syncFallbackRequests: 0,
      averageTimeMs: 0,
      totalTimeMs: 0
    };
  }

  /**
   * Destroy pathfinder and terminate workers
   */
  destroy() {
    // Cancel pending requests
    for (const [id, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('AsyncPathfinder destroyed'));
    }
    this.pendingRequests.clear();

    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.workersReady = false;
  }
}

export default AsyncPathfinder;
