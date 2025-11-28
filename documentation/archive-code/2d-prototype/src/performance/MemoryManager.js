/**
 * MemoryManager.js - Memory optimization and leak detection
 *
 * Provides memory management utilities including weak references,
 * memory monitoring, leak detection, and garbage collection hints.
 * Helps maintain stable memory usage over long game sessions.
 *
 * Performance Benefits:
 * - Automatic cleanup of unused references
 * - Memory leak detection and warnings
 * - GC pressure monitoring
 * - Cache management with size limits
 *
 * Usage:
 * ```javascript
 * const memManager = new MemoryManager();
 * memManager.trackObject('player', playerObject);
 * const cache = memManager.createCache('textures', { maxSize: 100 });
 * const report = memManager.getMemoryReport();
 * ```
 */

class MemoryManager {
  /**
   * Initialize memory manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.config = {
      enableTracking: options.enableTracking !== false,
      enableLeakDetection: options.enableLeakDetection !== false,
      leakDetectionInterval: options.leakDetectionInterval || 60000, // 1 minute
      memoryWarningThreshold: options.memoryWarningThreshold || 100 * 1024 * 1024, // 100MB
      memoryCriticalThreshold: options.memoryCriticalThreshold || 200 * 1024 * 1024, // 200MB
      enableAutoCleanup: options.enableAutoCleanup !== false,
      ...options
    };

    // Weak references for tracked objects
    this.weakRefs = new Map(); // name -> WeakRef
    this.trackedObjects = new Map(); // name -> { createdAt, type, size }

    // Caches
    this.caches = new Map(); // name -> Cache instance

    // Memory statistics
    this.stats = {
      objectsTracked: 0,
      objectsCollected: 0,
      cachesCreated: 0,
      totalCacheSize: 0,
      memoryWarnings: 0,
      lastGCHint: null,
      leaksDetected: 0
    };

    // Memory snapshots for leak detection
    this.memorySnapshots = [];
    this.maxSnapshots = 10;

    // Start monitoring if enabled
    if (this.config.enableLeakDetection) {
      this._startLeakDetection();
    }

    // Performance memory API check
    this.hasPerformanceMemory = typeof performance !== 'undefined' &&
                                 performance.memory !== undefined;
  }

  /**
   * Track an object with a weak reference
   * @param {string} name - Object identifier
   * @param {Object} obj - Object to track
   * @param {Object} metadata - Optional metadata
   */
  trackObject(name, obj, metadata = {}) {
    if (!this.config.enableTracking) return;

    if (!obj || typeof obj !== 'object') {
      console.warn('[MemoryManager] Can only track objects');
      return;
    }

    // Create weak reference
    const weakRef = new WeakRef(obj);
    this.weakRefs.set(name, weakRef);

    // Store metadata
    this.trackedObjects.set(name, {
      createdAt: Date.now(),
      type: metadata.type || 'unknown',
      size: metadata.size || 0,
      ...metadata
    });

    this.stats.objectsTracked++;
  }

  /**
   * Get a tracked object (may return undefined if collected)
   * @param {string} name - Object identifier
   * @returns {Object|undefined} Tracked object or undefined if collected
   */
  getTrackedObject(name) {
    const weakRef = this.weakRefs.get(name);
    if (!weakRef) return undefined;

    const obj = weakRef.deref();

    // Object was garbage collected
    if (obj === undefined) {
      this._handleCollectedObject(name);
    }

    return obj;
  }

  /**
   * Handle object collection
   * @param {string} name - Object name
   * @private
   */
  _handleCollectedObject(name) {
    this.weakRefs.delete(name);
    this.trackedObjects.delete(name);
    this.stats.objectsCollected++;
  }

  /**
   * Check if tracked object still exists
   * @param {string} name - Object identifier
   * @returns {boolean} True if object exists
   */
  hasObject(name) {
    return this.getTrackedObject(name) !== undefined;
  }

  /**
   * Untrack an object
   * @param {string} name - Object identifier
   */
  untrack(name) {
    this.weakRefs.delete(name);
    this.trackedObjects.delete(name);
  }

  /**
   * Create a managed cache
   * @param {string} name - Cache name
   * @param {Object} options - Cache options
   * @returns {ManagedCache} Cache instance
   */
  createCache(name, options = {}) {
    if (this.caches.has(name)) {
      console.warn(`[MemoryManager] Cache "${name}" already exists`);
      return this.caches.get(name);
    }

    const cache = new ManagedCache(name, options);
    this.caches.set(name, cache);
    this.stats.cachesCreated++;

    return cache;
  }

  /**
   * Get a cache by name
   * @param {string} name - Cache name
   * @returns {ManagedCache|null} Cache or null
   */
  getCache(name) {
    return this.caches.get(name) || null;
  }

  /**
   * Delete a cache
   * @param {string} name - Cache name
   * @returns {boolean} True if deleted
   */
  deleteCache(name) {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
      this.caches.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get current memory usage (if available)
   * @returns {Object|null} Memory info or null
   */
  getMemoryUsage() {
    if (!this.hasPerformanceMemory) {
      return null;
    }

    const memory = performance.memory;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalMB: (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
      limitMB: (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
      utilizationPercent: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
    };
  }

  /**
   * Take a memory snapshot
   * @private
   */
  _takeSnapshot() {
    const memory = this.getMemoryUsage();
    if (!memory) return;

    const snapshot = {
      timestamp: Date.now(),
      memory,
      trackedObjects: this.trackedObjects.size,
      cacheSize: this._getTotalCacheSize()
    };

    this.memorySnapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get total cache size
   * @returns {number} Total size
   * @private
   */
  _getTotalCacheSize() {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.getSize();
    }
    return total;
  }

  /**
   * Start leak detection monitoring
   * @private
   */
  _startLeakDetection() {
    this.leakDetectionInterval = setInterval(() => {
      this._detectLeaks();
    }, this.config.leakDetectionInterval);
  }

  /**
   * Detect potential memory leaks
   * @private
   */
  _detectLeaks() {
    const snapshot = this._takeSnapshot();
    if (!snapshot) return;

    // Check memory growth trend
    if (this.memorySnapshots.length >= 3) {
      const recent = this.memorySnapshots.slice(-3);
      const growthRate = this._calculateGrowthRate(recent);

      if (growthRate > 10) { // 10% growth
        console.warn(`[MemoryManager] Potential memory leak detected. Growth rate: ${growthRate.toFixed(2)}%`);
        this.stats.leaksDetected++;
      }
    }

    // Check absolute memory usage
    const usage = snapshot.memory.usedJSHeapSize;

    if (usage > this.config.memoryCriticalThreshold) {
      console.error(`[MemoryManager] CRITICAL: Memory usage (${snapshot.memory.usedMB}MB) exceeds threshold`);
      this.stats.memoryWarnings++;

      if (this.config.enableAutoCleanup) {
        this.cleanup();
      }
    } else if (usage > this.config.memoryWarningThreshold) {
      console.warn(`[MemoryManager] WARNING: High memory usage (${snapshot.memory.usedMB}MB)`);
      this.stats.memoryWarnings++;
    }
  }

  /**
   * Calculate memory growth rate
   * @param {Array} snapshots - Memory snapshots
   * @returns {number} Growth rate percentage
   * @private
   */
  _calculateGrowthRate(snapshots) {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0].memory.usedJSHeapSize;
    const last = snapshots[snapshots.length - 1].memory.usedJSHeapSize;

    return ((last - first) / first) * 100;
  }

  /**
   * Cleanup unused objects and caches
   */
  cleanup() {
    // Clean up collected weak references
    const toRemove = [];
    for (const [name, weakRef] of this.weakRefs.entries()) {
      if (weakRef.deref() === undefined) {
        toRemove.push(name);
      }
    }

    for (const name of toRemove) {
      this._handleCollectedObject(name);
    }

    // Trim caches
    for (const cache of this.caches.values()) {
      cache.trim();
    }

    // Hint garbage collector (if possible)
    this.hintGC();

    return {
      objectsRemoved: toRemove.length,
      cachesCleared: this.caches.size
    };
  }

  /**
   * Hint garbage collector to run (best effort)
   */
  hintGC() {
    // Note: This is a "hint" only. GC is automatic in JavaScript.
    // Some environments (like Node.js with --expose-gc) support manual GC
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc();
        this.stats.lastGCHint = Date.now();
      } catch (e) {
        // Silently fail if GC not available
      }
    }
  }

  /**
   * Get memory report
   * @returns {Object} Comprehensive memory report
   */
  getMemoryReport() {
    const currentMemory = this.getMemoryUsage();
    const cacheStats = {};

    for (const [name, cache] of this.caches.entries()) {
      cacheStats[name] = cache.getStats();
    }

    return {
      timestamp: Date.now(),
      memory: currentMemory,
      tracking: {
        objectsTracked: this.trackedObjects.size,
        objectsCollected: this.stats.objectsCollected,
        activeWeakRefs: this.weakRefs.size
      },
      caches: cacheStats,
      totalCacheSize: this._getTotalCacheSize(),
      stats: { ...this.stats },
      snapshots: this.memorySnapshots.length
    };
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Destroy memory manager
   */
  destroy() {
    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
    }

    this.weakRefs.clear();
    this.trackedObjects.clear();

    for (const cache of this.caches.values()) {
      cache.clear();
    }
    this.caches.clear();

    this.memorySnapshots = [];
  }
}

/**
 * Managed cache with size limits and LRU eviction
 */
class ManagedCache {
  constructor(name, options = {}) {
    this.name = name;
    this.config = {
      maxSize: options.maxSize || 100,
      maxMemory: options.maxMemory || 10 * 1024 * 1024, // 10MB
      ttl: options.ttl || null, // Time to live in ms
      onEvict: options.onEvict || null
    };

    this.cache = new Map();
    this.accessOrder = new Map(); // key -> timestamp
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {*} value - Cache value
   * @param {Object} metadata - Optional metadata
   */
  set(key, value, metadata = {}) {
    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      size: metadata.size || 0,
      ...metadata
    });

    this.accessOrder.set(key, Date.now());
    this.stats.sets++;
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (this.config.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > this.config.ttl) {
        this.delete(key);
        this.stats.misses++;
        return undefined;
      }
    }

    // Update access time
    this.accessOrder.set(key, Date.now());
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean} True if exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const entry = this.cache.get(key);

    if (entry && this.config.onEvict) {
      this.config.onEvict(key, entry.value);
    }

    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    if (this.config.onEvict) {
      for (const [key, entry] of this.cache.entries()) {
        this.config.onEvict(key, entry.value);
      }
    }

    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Evict least recently used entry
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Trim expired entries
   */
  trim() {
    if (!this.config.ttl) return;

    const now = Date.now();
    const toDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.config.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }

    return toDelete.length;
  }

  /**
   * Get cache size
   * @returns {number} Number of entries
   */
  getSize() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: `${hitRate}%`
    };
  }
}

export default MemoryManager;
export { ManagedCache };
