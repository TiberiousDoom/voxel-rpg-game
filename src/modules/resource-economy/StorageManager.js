/**
 * StorageManager.js - Inventory and storage management system
 *
 * Manages:
 * - Resource inventory (food, wood, stone, gold, essence, crystal)
 * - Storage capacity limits
 * - Overflow handling (dumps least valuable resources)
 * - Storage efficiency tracking
 *
 * Based on FORMULAS.md section 6: STORAGE MANAGEMENT
 */

class StorageManager {
  /**
   * Initialize storage manager
   * @param {number} initialCapacity - Total storage capacity (default 1000)
   */
  constructor(initialCapacity = 1000) {
    // Resource inventory
    this.storage = {
      food: 0,
      wood: 0,
      stone: 0,
      gold: 0,
      essence: 0,
      crystal: 0
    };

    // Storage configuration
    this.capacity = initialCapacity;

    // Resource priority for dumping (lowest value first)
    this.dumpPriority = ['wood', 'stone', 'gold', 'essence', 'crystal', 'food'];

    // Statistics
    this.totalProduced = { ...this.storage };
    this.totalConsumed = { ...this.storage };
    this.overflowEvents = [];
  }

  /**
   * Add a resource to storage
   * @param {string} resourceType - Resource name (food, wood, etc)
   * @param {number} amount - Amount to add
   * @throws {Error} If resource type invalid
   */
  addResource(resourceType, amount) {
    if (!(resourceType in this.storage)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    if (amount < 0) {
      throw new Error(`Cannot add negative amount: ${amount}`);
    }

    this.storage[resourceType] += amount;
    this.totalProduced[resourceType] = (this.totalProduced[resourceType] || 0) + amount;
  }

  /**
   * Remove a resource from storage
   * @param {string} resourceType - Resource name
   * @param {number} amount - Amount to remove
   * @returns {number} Amount actually removed (may be less if insufficient)
   */
  removeResource(resourceType, amount) {
    if (!(resourceType in this.storage)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    if (amount < 0) {
      throw new Error(`Cannot remove negative amount: ${amount}`);
    }

    const available = this.storage[resourceType];
    const removed = Math.min(amount, available);
    this.storage[resourceType] -= removed;
    this.totalConsumed[resourceType] = (this.totalConsumed[resourceType] || 0) + removed;

    return removed;
  }

  /**
   * Get current amount of a resource
   * @param {string} resourceType - Resource name
   * @returns {number} Current amount
   */
  getResource(resourceType) {
    if (!(resourceType in this.storage)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }
    return this.storage[resourceType];
  }

  /**
   * Get total storage usage (sum of all resources)
   * @returns {number} Total used space
   */
  getTotalUsage() {
    return Object.values(this.storage).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Check if storage is at capacity
   * @returns {boolean} True if at or over capacity
   */
  isAtCapacity() {
    return this.getTotalUsage() >= this.capacity;
  }

  /**
   * Get available storage space
   * @returns {number} Remaining capacity
   */
  getAvailableSpace() {
    const used = this.getTotalUsage();
    return Math.max(0, this.capacity - used);
  }

  /**
   * Check for overflow and dump excess resources
   * Dumps least valuable resources first to prevent overflow
   * @returns {Object} Overflow info
   */
  checkAndHandleOverflow() {
    const totalUsage = this.getTotalUsage();

    if (totalUsage <= this.capacity) {
      return { overflowed: false };
    }

    const overflow = totalUsage - this.capacity;
    const overflowEvent = {
      timestamp: new Date().toISOString(),
      overflowAmount: overflow,
      capacityExceeded: totalUsage - this.capacity,
      resourcesDumped: {}
    };

    let remaining = overflow;

    // Dump least valuable resources first
    for (const resourceType of this.dumpPriority) {
      if (remaining <= 0) break;

      const current = this.storage[resourceType];
      if (current > 0) {
        const toDump = Math.min(current, remaining);
        this.storage[resourceType] -= toDump;
        overflowEvent.resourcesDumped[resourceType] = toDump;
        remaining -= toDump;
      }
    }

    overflowEvent.amountDumped = overflow - remaining;
    overflowEvent.remainingOverflow = remaining;
    overflowEvent.overflowed = true;

    this.overflowEvents.push(overflowEvent);

    return overflowEvent;
  }

  /**
   * Set storage capacity
   * @param {number} newCapacity - New capacity limit
   */
  setCapacity(newCapacity) {
    if (newCapacity < 0) {
      throw new Error('Capacity cannot be negative');
    }
    this.capacity = newCapacity;
  }

  /**
   * Increase capacity (for upgrades)
   * @param {number} amount - Amount to increase by
   */
  increaseCapacity(amount) {
    this.setCapacity(this.capacity + amount);
  }

  /**
   * Get all resources as object
   * @returns {Object} Copy of storage object
   */
  getStorage() {
    return { ...this.storage };
  }

  /**
   * Get storage status report
   * @returns {Object} Status with capacity and utilization
   */
  getStatus() {
    const usage = this.getTotalUsage();
    return {
      storage: { ...this.storage },
      capacity: this.capacity,
      usage: usage,
      available: Math.max(0, this.capacity - usage),
      percentUsed: ((usage / this.capacity) * 100).toFixed(1),
      isFull: usage >= this.capacity
    };
  }

  /**
   * Get capacity
   * @returns {number} Capacity
   */
  getCapacity() {
    return this.capacity;
  }

  /**
   * Get utilization percentage
   * @returns {number} Percentage 0-100
   */
  getUtilizationPercent() {
    return ((this.getTotalUsage() / this.capacity) * 100).toFixed(1);
  }

  /**
   * Get lifetime statistics
   * @returns {Object} Production, consumption, overflow stats
   */
  getStatistics() {
    const totalProduced = Object.values(this.totalProduced).reduce((sum, val) => sum + val, 0);
    const totalConsumed = Object.values(this.totalConsumed).reduce((sum, val) => sum + val, 0);
    const totalDumped = this.overflowEvents.reduce((sum, e) => sum + (e.amountDumped || 0), 0);

    return {
      totalProduced: totalProduced.toFixed(2),
      totalConsumed: totalConsumed.toFixed(2),
      totalDumped: totalDumped.toFixed(2),
      overflowEvents: this.overflowEvents.length,
      currentUsage: this.getTotalUsage().toFixed(2),
      capacity: this.capacity,
      utilizationPercent: this.getUtilizationPercent()
    };
  }

  /**
   * Check if can take a specific amount of a resource
   * @param {string} resourceType - Resource name
   * @param {number} amount - Amount to take
   * @returns {boolean} True if sufficient resources available
   */
  canTake(resourceType, amount) {
    return this.getResource(resourceType) >= amount;
  }

  /**
   * Take a resource (consume it)
   * @param {string} resourceType - Resource name
   * @param {number} amount - Amount to take
   * @returns {number} Amount actually taken
   */
  take(resourceType, amount) {
    return this.removeResource(resourceType, amount);
  }

  /**
   * Get resource breakdown as percentage
   * @returns {Object} Each resource as percentage of total
   */
  getResourceBreakdown() {
    const total = this.getTotalUsage();
    const breakdown = {};

    for (const [resource, amount] of Object.entries(this.storage)) {
      breakdown[resource] = {
        amount: amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
      };
    }

    return breakdown;
  }

  /**
   * Reset all resources (for testing)
   */
  reset() {
    this.storage = {
      food: 0,
      wood: 0,
      stone: 0,
      gold: 0,
      essence: 0,
      crystal: 0
    };
  }

  /**
   * Set resources manually (for testing/initialization)
   * @param {Object} resources - Resource object
   */
  setResources(resources) {
    for (const [type, amount] of Object.entries(resources)) {
      if (type in this.storage && amount >= 0) {
        this.storage[type] = amount;
      }
    }
  }
}

export default StorageManager;
