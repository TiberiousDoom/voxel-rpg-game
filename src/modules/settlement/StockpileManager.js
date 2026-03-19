/**
 * StockpileManager.js - Physical resource storage zones
 *
 * Stockpiles are zones where NPCs deliver mined/gathered resources.
 * Each stockpile has a grid of slots, each holding one resource type
 * up to a stack limit. Slots can be reserved to prevent double-booking.
 *
 * Integrates with ResourceEconomyModule for global resource tracking.
 */

import {
  STOCKPILE_STACK_LIMIT,
  STOCKPILE_RESERVATION_TIMEOUT,
} from '../../data/tuning.js';
import { ZONE_TYPES } from './ZoneManager.js';

class StockpileManager {
  /**
   * @param {Object} deps
   * @param {Object} deps.zoneManager - ZoneManager instance
   * @param {Object} deps.storage - StorageManager from resource economy
   * @param {Object} deps.settlementModule - Parent SettlementModule for events
   */
  constructor(deps = {}) {
    this.zoneManager = deps.zoneManager || null;
    this.storage = deps.storage || null;
    this.settlementModule = deps.settlementModule || null;

    /** @type {Map<string, Object>} zoneId → stockpile data */
    this.stockpiles = new Map();
  }

  /**
   * Called when a stockpile zone is created.
   * @param {Object} zone
   */
  onZoneCreated(zone) {
    if (zone.type !== ZONE_TYPES.STOCKPILE) return;
    this._initializeStockpile(zone);
  }

  /**
   * Called when a stockpile zone is deleted.
   * @param {Object} zone
   */
  onZoneDeleted(zone) {
    if (zone.type !== ZONE_TYPES.STOCKPILE) return;
    this.stockpiles.delete(zone.id);
  }

  /**
   * Initialize stockpile slots for a zone.
   */
  _initializeStockpile(zone) {
    const { min, max } = zone.bounds;

    // Slots are on the ground plane
    const slots = [];
    const y = Math.floor(min.y);

    for (let x = Math.floor(min.x); x < Math.ceil(max.x); x++) {
      for (let z = Math.floor(min.z); z < Math.ceil(max.z); z++) {
        slots.push({
          position: { x, y, z },
          resourceType: null,
          quantity: 0,
          reserved: false,
          reservedBy: null,
          reservedAt: 0,
        });
      }
    }

    this.stockpiles.set(zone.id, {
      zoneId: zone.id,
      slots,
      filter: null, // null = accept all; string = only that resource type
      totalCapacity: slots.length * STOCKPILE_STACK_LIMIT,
    });
  }

  // ── Deposit / Withdraw ─────────────────────────────────────

  /**
   * Deposit a resource into a stockpile.
   * Finds a matching slot (same resource with space) or an empty slot.
   *
   * @param {string} stockpileId - Zone ID of the stockpile
   * @param {string} resourceType - Resource type to deposit
   * @param {number} quantity - Amount to deposit
   * @returns {{ success: boolean, deposited?: number, slotIndex?: number, error?: string }}
   */
  deposit(stockpileId, resourceType, quantity) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return { success: false, error: 'Stockpile not found' };

    // Check filter
    if (stockpile.filter && stockpile.filter !== resourceType) {
      return { success: false, error: `Stockpile only accepts ${stockpile.filter}` };
    }

    if (quantity <= 0) return { success: false, error: 'Invalid quantity' };

    let remaining = quantity;
    let totalDeposited = 0;
    let lastSlotIndex = -1;

    // First pass: fill existing slots of same type
    for (let i = 0; i < stockpile.slots.length && remaining > 0; i++) {
      const slot = stockpile.slots[i];
      if (slot.reserved) continue;
      if (slot.resourceType === resourceType && slot.quantity < STOCKPILE_STACK_LIMIT) {
        const space = STOCKPILE_STACK_LIMIT - slot.quantity;
        const toAdd = Math.min(remaining, space);
        slot.quantity += toAdd;
        remaining -= toAdd;
        totalDeposited += toAdd;
        lastSlotIndex = i;
      }
    }

    // Second pass: use empty slots
    for (let i = 0; i < stockpile.slots.length && remaining > 0; i++) {
      const slot = stockpile.slots[i];
      if (slot.reserved) continue;
      if (slot.resourceType === null) {
        const toAdd = Math.min(remaining, STOCKPILE_STACK_LIMIT);
        slot.resourceType = resourceType;
        slot.quantity = toAdd;
        remaining -= toAdd;
        totalDeposited += toAdd;
        lastSlotIndex = i;
      }
    }

    if (totalDeposited === 0) {
      return { success: false, error: 'Stockpile is full' };
    }

    // Sync with global storage
    if (this.storage && typeof this.storage.addResource === 'function') {
      try {
        this.storage.addResource(resourceType, totalDeposited);
      } catch {
        // Resource type may not exist in global storage — that's fine
      }
    }

    if (this.settlementModule) {
      this.settlementModule.emit('stockpile:deposit', {
        stockpileId,
        resourceType,
        quantity: totalDeposited,
      });
    }

    return { success: true, deposited: totalDeposited, slotIndex: lastSlotIndex };
  }

  /**
   * Withdraw a resource from a stockpile.
   *
   * @param {string} stockpileId - Zone ID of the stockpile
   * @param {string} resourceType - Resource type to withdraw
   * @param {number} quantity - Amount to withdraw
   * @returns {{ success: boolean, withdrawn?: number, error?: string }}
   */
  withdraw(stockpileId, resourceType, quantity) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return { success: false, error: 'Stockpile not found' };

    if (quantity <= 0) return { success: false, error: 'Invalid quantity' };

    let remaining = quantity;
    let totalWithdrawn = 0;

    // Withdraw from slots with this resource (drain smallest stacks first)
    const matchingSlots = stockpile.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.resourceType === resourceType && slot.quantity > 0 && !slot.reserved)
      .sort((a, b) => a.slot.quantity - b.slot.quantity);

    for (const { slot } of matchingSlots) {
      if (remaining <= 0) break;
      const toRemove = Math.min(remaining, slot.quantity);
      slot.quantity -= toRemove;
      remaining -= toRemove;
      totalWithdrawn += toRemove;

      // Clear empty slots
      if (slot.quantity <= 0) {
        slot.resourceType = null;
        slot.quantity = 0;
      }
    }

    if (totalWithdrawn === 0) {
      return { success: false, error: `No ${resourceType} available` };
    }

    // Sync with global storage
    if (this.storage && typeof this.storage.removeResource === 'function') {
      try {
        this.storage.removeResource(resourceType, totalWithdrawn);
      } catch {
        // Resource type may not exist in global storage
      }
    }

    if (this.settlementModule) {
      this.settlementModule.emit('stockpile:withdraw', {
        stockpileId,
        resourceType,
        quantity: totalWithdrawn,
      });
    }

    return { success: true, withdrawn: totalWithdrawn };
  }

  // ── Reservation ────────────────────────────────────────────

  /**
   * Reserve a slot in a stockpile (prevents double-booking during hauling).
   *
   * @param {string} stockpileId
   * @param {number} slotIndex
   * @param {string} reservedBy - NPC ID or task ID
   * @returns {{ success: boolean, error?: string }}
   */
  reserve(stockpileId, slotIndex, reservedBy) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return { success: false, error: 'Stockpile not found' };
    if (slotIndex < 0 || slotIndex >= stockpile.slots.length) {
      return { success: false, error: 'Invalid slot index' };
    }

    const slot = stockpile.slots[slotIndex];
    if (slot.reserved) return { success: false, error: 'Slot already reserved' };

    slot.reserved = true;
    slot.reservedBy = reservedBy;
    slot.reservedAt = Date.now();

    return { success: true };
  }

  /**
   * Release a reservation.
   * @param {string} stockpileId
   * @param {number} slotIndex
   */
  release(stockpileId, slotIndex) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return;
    if (slotIndex < 0 || slotIndex >= stockpile.slots.length) return;

    const slot = stockpile.slots[slotIndex];
    slot.reserved = false;
    slot.reservedBy = null;
    slot.reservedAt = 0;
  }

  // ── Queries ────────────────────────────────────────────────

  /**
   * Get total quantity of a resource across all stockpiles.
   * @param {string} resourceType
   * @returns {number}
   */
  getTotalResource(resourceType) {
    let total = 0;
    for (const stockpile of this.stockpiles.values()) {
      for (const slot of stockpile.slots) {
        if (slot.resourceType === resourceType) {
          total += slot.quantity;
        }
      }
    }
    return total;
  }

  /**
   * Find the nearest stockpile with space for a resource type.
   * @param {Object} position - { x, y, z }
   * @param {string} resourceType
   * @returns {{ stockpileId: string, distance: number } | null}
   */
  findNearestWithSpace(position, resourceType) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const [stockpileId, stockpile] of this.stockpiles) {
      // Check filter
      if (stockpile.filter && stockpile.filter !== resourceType) continue;

      // Check if has space
      const hasSpace = stockpile.slots.some(slot =>
        (!slot.reserved) && (
          (slot.resourceType === resourceType && slot.quantity < STOCKPILE_STACK_LIMIT) ||
          slot.resourceType === null
        )
      );
      if (!hasSpace) continue;

      // Get zone center for distance calculation
      if (!this.zoneManager) continue;
      const zone = this.zoneManager.getZone(stockpileId);
      if (!zone || !zone.active) continue;

      const center = {
        x: (zone.bounds.min.x + zone.bounds.max.x) / 2,
        z: (zone.bounds.min.z + zone.bounds.max.z) / 2,
      };

      const dx = position.x - center.x;
      const dz = position.z - center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { stockpileId, distance: dist };
      }
    }

    return nearest;
  }

  /**
   * Find the nearest stockpile containing a specific resource.
   * @param {Object} position - { x, y, z }
   * @param {string} resourceType
   * @param {number} minQuantity - Minimum quantity needed
   * @returns {{ stockpileId: string, distance: number } | null}
   */
  findNearestWithResource(position, resourceType, minQuantity = 1) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const [stockpileId, stockpile] of this.stockpiles) {
      const available = stockpile.slots
        .filter(s => s.resourceType === resourceType && !s.reserved)
        .reduce((sum, s) => sum + s.quantity, 0);
      if (available < minQuantity) continue;

      if (!this.zoneManager) continue;
      const zone = this.zoneManager.getZone(stockpileId);
      if (!zone || !zone.active) continue;

      const center = {
        x: (zone.bounds.min.x + zone.bounds.max.x) / 2,
        z: (zone.bounds.min.z + zone.bounds.max.z) / 2,
      };

      const dx = position.x - center.x;
      const dz = position.z - center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { stockpileId, distance: dist };
      }
    }

    return nearest;
  }

  /**
   * Get stockpile contents for UI display.
   * @param {string} stockpileId
   * @returns {Object|null}
   */
  getStockpileContents(stockpileId) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return null;

    const contents = {};
    let usedSlots = 0;

    for (const slot of stockpile.slots) {
      if (slot.resourceType) {
        if (!contents[slot.resourceType]) {
          contents[slot.resourceType] = 0;
        }
        contents[slot.resourceType] += slot.quantity;
        usedSlots++;
      }
    }

    return {
      zoneId: stockpileId,
      contents,
      totalSlots: stockpile.slots.length,
      usedSlots,
      filter: stockpile.filter,
    };
  }

  /**
   * Get all stockpile summaries for the settlement store.
   * @returns {Object} stockpileId → contents summary
   */
  getAllContents() {
    const result = {};
    for (const stockpileId of this.stockpiles.keys()) {
      result[stockpileId] = this.getStockpileContents(stockpileId);
    }
    return result;
  }

  /**
   * Set resource filter for a stockpile.
   * @param {string} stockpileId
   * @param {string|null} resourceType - null to accept all
   * @returns {{ success: boolean, error?: string }}
   */
  setFilter(stockpileId, resourceType) {
    const stockpile = this.stockpiles.get(stockpileId);
    if (!stockpile) return { success: false, error: 'Stockpile not found' };
    stockpile.filter = resourceType;
    return { success: true };
  }

  // ── Tick ──────────────────────────────────────────────────

  /**
   * Per-tick update. Cleans up expired reservations.
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    const now = Date.now();
    const timeoutMs = STOCKPILE_RESERVATION_TIMEOUT * 1000;

    for (const stockpile of this.stockpiles.values()) {
      for (const slot of stockpile.slots) {
        if (slot.reserved && (now - slot.reservedAt) > timeoutMs) {
          slot.reserved = false;
          slot.reservedBy = null;
          slot.reservedAt = 0;
        }
      }
    }

    return {
      totalStockpiles: this.stockpiles.size,
    };
  }

  // ── Serialization ────────────────────────────────────────

  serialize() {
    const stockpiles = {};
    for (const [id, stockpile] of this.stockpiles) {
      stockpiles[id] = {
        zoneId: stockpile.zoneId,
        filter: stockpile.filter,
        slots: stockpile.slots.map(slot => ({
          position: slot.position,
          resourceType: slot.resourceType,
          quantity: slot.quantity,
          // Don't persist reservations — they're transient
        })),
      };
    }
    return { stockpiles };
  }

  deserialize(state) {
    if (!state || !state.stockpiles) return;

    this.stockpiles.clear();
    for (const [id, data] of Object.entries(state.stockpiles)) {
      this.stockpiles.set(id, {
        zoneId: data.zoneId,
        filter: data.filter,
        totalCapacity: data.slots.length * STOCKPILE_STACK_LIMIT,
        slots: data.slots.map(slot => ({
          position: slot.position,
          resourceType: slot.resourceType,
          quantity: slot.quantity,
          reserved: false,
          reservedBy: null,
          reservedAt: 0,
        })),
      });
    }
  }
}

export default StockpileManager;
