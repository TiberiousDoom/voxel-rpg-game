/**
 * StockpileManager.js - Manages all stockpile zones in the game
 *
 * Provides a centralized interface for stockpile operations including:
 * - Creating and removing stockpiles
 * - Finding the best stockpile for deposit/pickup
 * - Managing resource reservations
 * - Tracking total resources across all stockpiles
 *
 * Part of Phase 3: Stockpile Zone System
 *
 * Usage:
 *   const manager = new StockpileManager();
 *   const stockpile = manager.createStockpile({ x: 10, y: 10, z: 0, width: 5, depth: 5 });
 *   const slot = manager.findNearestResourceSlot(npcPosition, 'wood');
 */

import { Stockpile, ResourceCategory, RESOURCE_CATEGORIES } from './Stockpile.js';

export class StockpileManager {
  /**
   * Create a stockpile manager
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = {
      reservationTimeout: options.reservationTimeout || 60000,  // 60 seconds
      cleanupInterval: options.cleanupInterval || 10000,        // 10 seconds
      ...options
    };

    // Stockpile storage
    this.stockpiles = new Map();  // Map<id, Stockpile>

    // Spatial index for fast lookups by position
    this.spatialIndex = new Map();  // Map<chunkKey, Set<stockpileId>>

    // Reservation cleanup timer
    this.cleanupTimer = null;

    // Statistics
    this.stats = {
      totalStockpiles: 0,
      totalDeposits: 0,
      totalWithdrawals: 0
    };
  }

  /**
   * Initialize the manager (start cleanup timer)
   */
  initialize() {
    this._startCleanupTimer();
  }

  /**
   * Shutdown the manager (stop cleanup timer)
   */
  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Start the reservation cleanup timer
   * @private
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.clearExpiredReservations();
    }, this.config.cleanupInterval);
  }

  /**
   * Get chunk key for spatial indexing
   * @private
   */
  _getChunkKey(x, y) {
    const chunkX = Math.floor(x / 32);
    const chunkY = Math.floor(y / 32);
    return `${chunkX},${chunkY}`;
  }

  /**
   * Add stockpile to spatial index
   * @private
   */
  _addToSpatialIndex(stockpile) {
    // Index all chunks the stockpile touches
    const minChunkX = Math.floor(stockpile.bounds.x / 32);
    const maxChunkX = Math.floor((stockpile.bounds.x + stockpile.bounds.width) / 32);
    const minChunkY = Math.floor(stockpile.bounds.y / 32);
    const maxChunkY = Math.floor((stockpile.bounds.y + stockpile.bounds.depth) / 32);

    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        const key = `${cx},${cy}`;
        if (!this.spatialIndex.has(key)) {
          this.spatialIndex.set(key, new Set());
        }
        this.spatialIndex.get(key).add(stockpile.id);
      }
    }
  }

  /**
   * Remove stockpile from spatial index
   * @private
   */
  _removeFromSpatialIndex(stockpile) {
    for (const [key, ids] of this.spatialIndex) {
      ids.delete(stockpile.id);
      if (ids.size === 0) {
        this.spatialIndex.delete(key);
      }
    }
  }

  /**
   * Create a new stockpile
   * @param {object} config - Stockpile configuration
   * @returns {Stockpile}
   */
  createStockpile(config) {
    const stockpile = new Stockpile(config);

    this.stockpiles.set(stockpile.id, stockpile);
    this._addToSpatialIndex(stockpile);
    this.stats.totalStockpiles++;

    return stockpile;
  }

  /**
   * Remove a stockpile
   * @param {string} stockpileId - Stockpile ID
   * @returns {boolean} True if removed
   */
  removeStockpile(stockpileId) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return false;

    this._removeFromSpatialIndex(stockpile);
    this.stockpiles.delete(stockpileId);
    this.stats.totalStockpiles--;

    return true;
  }

  /**
   * Get a stockpile by ID
   * @param {string} stockpileId - Stockpile ID
   * @returns {Stockpile | null}
   */
  getStockpile(stockpileId) {
    return this.stockpiles.get(stockpileId) || null;
  }

  /**
   * Get all stockpiles
   * @returns {Array<Stockpile>}
   */
  getAllStockpiles() {
    return Array.from(this.stockpiles.values());
  }

  /**
   * Get stockpiles near a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Search radius in tiles
   * @returns {Array<Stockpile>}
   */
  getStockpilesNear(x, y, radius = 50) {
    const nearby = [];
    const radiusSquared = radius * radius;

    for (const stockpile of this.stockpiles.values()) {
      const dx = stockpile.getCenter().x - x;
      const dy = stockpile.getCenter().y - y;
      if (dx * dx + dy * dy <= radiusSquared) {
        nearby.push(stockpile);
      }
    }

    return nearby;
  }

  /**
   * Get stockpile at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z-level
   * @returns {Stockpile | null}
   */
  getStockpileAt(x, y, z) {
    for (const stockpile of this.stockpiles.values()) {
      if (stockpile.bounds.z === z && stockpile.containsPosition(x, y)) {
        return stockpile;
      }
    }
    return null;
  }

  /**
   * Find the best stockpile for depositing a resource
   * Considers: distance, priority, available space
   *
   * @param {object} position - {x, y} NPC position
   * @param {string} resourceType - Resource type to deposit
   * @returns {{stockpile: Stockpile, slot: StockpileSlot, distance: number} | null}
   */
  findBestDepositStockpile(position, resourceType) {
    let bestResult = null;
    let bestScore = -Infinity;

    for (const stockpile of this.stockpiles.values()) {
      if (!stockpile.enabled) continue;
      if (!stockpile.acceptsResource(resourceType)) continue;

      const slot = stockpile.findEmptySlot(resourceType);
      if (!slot) continue;

      const distance = stockpile.distanceFrom(position.x, position.y);

      // Score: higher priority, shorter distance = better
      // Priority is weighted more than distance
      const score = stockpile.priority * 10 - distance;

      if (score > bestScore) {
        bestScore = score;
        bestResult = { stockpile, slot, distance };
      }
    }

    return bestResult;
  }

  /**
   * Find the nearest stockpile with a specific resource
   *
   * @param {object} position - {x, y} NPC position
   * @param {string} resourceType - Resource type to find
   * @param {number} minQuantity - Minimum quantity needed
   * @returns {{stockpile: Stockpile, slot: StockpileSlot, distance: number} | null}
   */
  findNearestResourceSlot(position, resourceType, minQuantity = 1) {
    let nearestResult = null;
    let nearestDistance = Infinity;

    for (const stockpile of this.stockpiles.values()) {
      if (!stockpile.enabled) continue;

      const slot = stockpile.findResourceSlot(resourceType, minQuantity);
      if (!slot) continue;

      const distance = stockpile.distanceFrom(position.x, position.y);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestResult = { stockpile, slot, distance };
      }
    }

    return nearestResult;
  }

  /**
   * Reserve resources for pickup
   *
   * @param {object} position - {x, y} NPC position
   * @param {string} resourceType - Resource type
   * @param {string} npcId - NPC ID
   * @param {number} quantity - Desired quantity
   * @returns {{stockpile: Stockpile, slot: StockpileSlot, quantity: number} | null}
   */
  reserveForPickup(position, resourceType, npcId, quantity = 1) {
    const result = this.findNearestResourceSlot(position, resourceType, quantity);
    if (!result) return null;

    const reservation = result.stockpile.reserveForPickup(resourceType, npcId, quantity);
    if (!reservation) return null;

    return {
      stockpile: result.stockpile,
      slot: reservation.slot,
      quantity: reservation.quantity
    };
  }

  /**
   * Reserve a slot for deposit
   *
   * @param {object} position - {x, y} NPC position
   * @param {string} resourceType - Resource type
   * @param {string} npcId - NPC ID
   * @param {number} quantity - Quantity to deposit
   * @returns {{stockpile: Stockpile, slot: StockpileSlot, quantity: number} | null}
   */
  reserveForDeposit(position, resourceType, npcId, quantity = 1) {
    const result = this.findBestDepositStockpile(position, resourceType);
    if (!result) return null;

    const reservation = result.stockpile.reserveForDeposit(resourceType, npcId, quantity);
    if (!reservation) return null;

    return {
      stockpile: result.stockpile,
      slot: reservation.slot,
      quantity: reservation.quantity
    };
  }

  /**
   * Deposit resources into a stockpile
   *
   * @param {string} stockpileId - Stockpile ID
   * @param {number} x - Slot X
   * @param {number} y - Slot Y
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity
   * @param {string} npcId - NPC ID (optional)
   * @returns {number} Amount deposited
   */
  deposit(stockpileId, x, y, resourceType, quantity, npcId = null) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return 0;

    const deposited = stockpile.deposit(x, y, resourceType, quantity, npcId);
    if (deposited > 0) {
      this.stats.totalDeposits += deposited;
    }

    return deposited;
  }

  /**
   * Withdraw resources from a stockpile
   *
   * @param {string} stockpileId - Stockpile ID
   * @param {number} x - Slot X
   * @param {number} y - Slot Y
   * @param {number} quantity - Quantity
   * @param {string} npcId - NPC ID (optional)
   * @returns {{resource: string, quantity: number} | null}
   */
  withdraw(stockpileId, x, y, quantity, npcId = null) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return null;

    const result = stockpile.withdraw(x, y, quantity, npcId);
    if (result) {
      this.stats.totalWithdrawals += result.quantity;
    }

    return result;
  }

  /**
   * Release all reservations for an NPC
   * @param {string} npcId - NPC ID
   * @returns {number} Total reservations released
   */
  releaseAllNpcReservations(npcId) {
    let released = 0;
    for (const stockpile of this.stockpiles.values()) {
      released += stockpile.releaseAllReservations(npcId);
    }
    return released;
  }

  /**
   * Clear all expired reservations
   * @returns {number} Total reservations cleared
   */
  clearExpiredReservations() {
    let cleared = 0;
    for (const stockpile of this.stockpiles.values()) {
      cleared += stockpile.clearExpiredReservations(this.config.reservationTimeout);
    }
    return cleared;
  }

  /**
   * Get total quantity of a resource across all stockpiles
   * @param {string} resourceType - Resource type
   * @returns {number}
   */
  getTotalResourceQuantity(resourceType) {
    let total = 0;
    for (const stockpile of this.stockpiles.values()) {
      total += stockpile.getResourceQuantity(resourceType);
    }
    return total;
  }

  /**
   * Get all resources and quantities across all stockpiles
   * @returns {Map<string, number>}
   */
  getAllResources() {
    const totals = new Map();

    for (const stockpile of this.stockpiles.values()) {
      const resources = stockpile.getAllResources();
      for (const [resource, quantity] of resources) {
        const current = totals.get(resource) || 0;
        totals.set(resource, current + quantity);
      }
    }

    return totals;
  }

  /**
   * Get total available space for a resource
   * @param {string} resourceType - Resource type
   * @returns {number}
   */
  getTotalAvailableSpace(resourceType) {
    let total = 0;
    for (const stockpile of this.stockpiles.values()) {
      total += stockpile.getAvailableSpace(resourceType);
    }
    return total;
  }

  /**
   * Check if there's any stockpile that accepts a resource type
   * @param {string} resourceType - Resource type
   * @returns {boolean}
   */
  hasStockpileFor(resourceType) {
    for (const stockpile of this.stockpiles.values()) {
      if (stockpile.acceptsResource(resourceType) && stockpile.getAvailableSpace(resourceType) > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    let totalSlots = 0;
    let usedSlots = 0;
    let totalQuantity = 0;

    for (const stockpile of this.stockpiles.values()) {
      const stats = stockpile.getStats();
      totalSlots += stats.totalSlots;
      usedSlots += stats.usedSlots;
      totalQuantity += stats.totalQuantity;
    }

    return {
      ...this.stats,
      totalSlots,
      usedSlots,
      emptySlots: totalSlots - usedSlots,
      totalQuantity,
      resources: Object.fromEntries(this.getAllResources())
    };
  }

  /**
   * Export manager data
   * @returns {object}
   */
  toJSON() {
    const stockpiles = {};
    for (const [id, stockpile] of this.stockpiles) {
      stockpiles[id] = stockpile.toJSON();
    }

    return {
      config: this.config,
      stockpiles,
      stats: this.stats
    };
  }

  /**
   * Import manager data
   * @param {object} data
   * @returns {StockpileManager}
   */
  static fromJSON(data) {
    const manager = new StockpileManager(data.config);

    if (data.stockpiles) {
      for (const [id, stockpileData] of Object.entries(data.stockpiles)) {
        const stockpile = Stockpile.fromJSON(stockpileData);
        manager.stockpiles.set(id, stockpile);
        manager._addToSpatialIndex(stockpile);
      }
    }

    if (data.stats) {
      manager.stats = { ...manager.stats, ...data.stats };
    }

    return manager;
  }
}
