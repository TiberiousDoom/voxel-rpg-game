/**
 * Stockpile.js - Designated storage zone for resources
 *
 * A stockpile is a designated area where NPCs can store and retrieve resources.
 * Resources are physically placed on the ground within the stockpile bounds.
 *
 * Part of Phase 3: Stockpile Zone System
 *
 * Features:
 * - Rectangular zone definition with Z-level
 * - Resource type filtering (what can be stored)
 * - Slot-based storage with position tracking
 * - Reservation system to prevent conflicts
 * - Priority for deposit/withdrawal preference
 *
 * Usage:
 *   const stockpile = new Stockpile({
 *     x: 10, y: 10, z: 0,
 *     width: 5, depth: 5,
 *     allowedResources: ['wood', 'stone']
 *   });
 *   stockpile.depositResource(12, 12, 'wood', 10);
 */

/**
 * Resource types that can be stored in stockpiles
 */
export const ResourceType = {
  // Basic resources
  WOOD: 'wood',
  STONE: 'stone',
  DIRT: 'dirt',
  SAND: 'sand',
  CLAY: 'clay',

  // Refined materials
  PLANK: 'plank',
  BRICK: 'brick',
  THATCH: 'thatch',
  COBBLESTONE: 'cobblestone',

  // Ores and metals
  COAL: 'coal',
  IRON_ORE: 'iron_ore',
  IRON_INGOT: 'iron_ingot',
  GOLD_ORE: 'gold_ore',
  GOLD_INGOT: 'gold_ingot',

  // Special resources
  CRYSTAL: 'crystal',
  ESSENCE: 'essence',

  // Food
  FOOD: 'food',
  WHEAT: 'wheat',
  VEGETABLES: 'vegetables',

  // Misc
  FIBER: 'fiber',
  LEATHER: 'leather',
  CLOTH: 'cloth'
};

/**
 * Resource categories for stockpile filtering
 */
export const ResourceCategory = {
  RAW_MATERIALS: 'raw_materials',      // Wood, stone, etc.
  REFINED_MATERIALS: 'refined',        // Planks, bricks, etc.
  ORES: 'ores',                        // Coal, iron ore, etc.
  METALS: 'metals',                    // Iron ingots, gold ingots
  FOOD: 'food',                        // All food items
  SPECIAL: 'special',                  // Crystal, essence
  ALL: 'all'                           // Accept everything
};

/**
 * Map resource types to categories
 */
export const RESOURCE_CATEGORIES = {
  [ResourceType.WOOD]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.STONE]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.DIRT]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.SAND]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.CLAY]: ResourceCategory.RAW_MATERIALS,

  [ResourceType.PLANK]: ResourceCategory.REFINED_MATERIALS,
  [ResourceType.BRICK]: ResourceCategory.REFINED_MATERIALS,
  [ResourceType.THATCH]: ResourceCategory.REFINED_MATERIALS,
  [ResourceType.COBBLESTONE]: ResourceCategory.REFINED_MATERIALS,

  [ResourceType.COAL]: ResourceCategory.ORES,
  [ResourceType.IRON_ORE]: ResourceCategory.ORES,
  [ResourceType.GOLD_ORE]: ResourceCategory.ORES,

  [ResourceType.IRON_INGOT]: ResourceCategory.METALS,
  [ResourceType.GOLD_INGOT]: ResourceCategory.METALS,

  [ResourceType.CRYSTAL]: ResourceCategory.SPECIAL,
  [ResourceType.ESSENCE]: ResourceCategory.SPECIAL,

  [ResourceType.FOOD]: ResourceCategory.FOOD,
  [ResourceType.WHEAT]: ResourceCategory.FOOD,
  [ResourceType.VEGETABLES]: ResourceCategory.FOOD,

  [ResourceType.FIBER]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.LEATHER]: ResourceCategory.RAW_MATERIALS,
  [ResourceType.CLOTH]: ResourceCategory.REFINED_MATERIALS
};

/**
 * Stockpile slot - represents a single storage position
 */
export class StockpileSlot {
  /**
   * Create a stockpile slot
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   * @param {number} z - Z-level
   */
  constructor(x, y, z) {
    this.position = { x, y, z };
    this.resource = null;           // ResourceType or null
    this.quantity = 0;
    this.maxQuantity = 100;         // Max items per slot
    this.reservedBy = null;         // NPC ID that reserved this slot
    this.reservationType = null;    // 'pickup' or 'deposit'
    this.reservedAt = null;         // Timestamp of reservation
  }

  /**
   * Check if slot is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.resource === null || this.quantity === 0;
  }

  /**
   * Check if slot is full
   * @returns {boolean}
   */
  isFull() {
    return this.quantity >= this.maxQuantity;
  }

  /**
   * Check if slot is reserved
   * @returns {boolean}
   */
  isReserved() {
    return this.reservedBy !== null;
  }

  /**
   * Check if slot can accept more of a resource type
   * @param {string} resourceType - Resource type to check
   * @returns {boolean}
   */
  canAccept(resourceType) {
    if (this.isEmpty()) return true;
    return this.resource === resourceType && !this.isFull();
  }

  /**
   * Get available space for a resource type
   * @param {string} resourceType - Resource type
   * @returns {number}
   */
  getAvailableSpace(resourceType) {
    if (this.isEmpty()) return this.maxQuantity;
    if (this.resource !== resourceType) return 0;
    return this.maxQuantity - this.quantity;
  }

  /**
   * Reserve slot for pickup/deposit
   * @param {string} npcId - NPC ID
   * @param {string} type - 'pickup' or 'deposit'
   * @returns {boolean}
   */
  reserve(npcId, type) {
    if (this.isReserved()) return false;

    this.reservedBy = npcId;
    this.reservationType = type;
    this.reservedAt = Date.now();
    return true;
  }

  /**
   * Release reservation
   * @param {string} npcId - NPC ID (optional, validates ownership)
   * @returns {boolean}
   */
  release(npcId = null) {
    if (npcId !== null && this.reservedBy !== npcId) {
      return false;
    }

    this.reservedBy = null;
    this.reservationType = null;
    this.reservedAt = null;
    return true;
  }

  /**
   * Add resources to slot
   * @param {string} resourceType - Resource type
   * @param {number} amount - Amount to add
   * @returns {number} Amount actually added
   */
  add(resourceType, amount) {
    if (this.isEmpty()) {
      this.resource = resourceType;
    } else if (this.resource !== resourceType) {
      return 0;  // Can't mix resource types
    }

    const spaceAvailable = this.maxQuantity - this.quantity;
    const toAdd = Math.min(amount, spaceAvailable);

    this.quantity += toAdd;
    return toAdd;
  }

  /**
   * Remove resources from slot
   * @param {number} amount - Amount to remove
   * @returns {number} Amount actually removed
   */
  remove(amount) {
    const toRemove = Math.min(amount, this.quantity);
    this.quantity -= toRemove;

    if (this.quantity === 0) {
      this.resource = null;
    }

    return toRemove;
  }

  /**
   * Export slot data
   * @returns {object}
   */
  toJSON() {
    return {
      position: this.position,
      resource: this.resource,
      quantity: this.quantity,
      maxQuantity: this.maxQuantity
      // Don't save reservations - they're transient
    };
  }

  /**
   * Import slot data
   * @param {object} data
   * @returns {StockpileSlot}
   */
  static fromJSON(data) {
    const slot = new StockpileSlot(data.position.x, data.position.y, data.position.z);
    slot.resource = data.resource;
    slot.quantity = data.quantity;
    slot.maxQuantity = data.maxQuantity || 100;
    return slot;
  }
}

/**
 * Stockpile - A designated storage zone
 */
export class Stockpile {
  static nextId = 1;

  /**
   * Create a stockpile
   * @param {object} config - Stockpile configuration
   */
  constructor(config = {}) {
    this.id = config.id || `stockpile_${Stockpile.nextId++}`;
    this.name = config.name || 'Stockpile';

    // Bounds definition
    this.bounds = {
      x: config.x || 0,
      y: config.y || 0,
      z: config.z || 0,
      width: config.width || 3,
      depth: config.depth || 3
    };

    // Resource filtering
    this.allowedResources = new Set(config.allowedResources || []);
    this.allowedCategories = new Set(config.allowedCategories || [ResourceCategory.ALL]);

    // Priority (higher = preferred for deposits)
    this.priority = config.priority || 50;

    // Enabled state
    this.enabled = config.enabled !== false;

    // Storage slots - one per tile in the zone
    this.slots = new Map();  // Key: "x,y" -> StockpileSlot
    this._initializeSlots();

    // Statistics
    this.stats = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Initialize storage slots for all tiles in bounds
   * @private
   */
  _initializeSlots() {
    for (let y = this.bounds.y; y < this.bounds.y + this.bounds.depth; y++) {
      for (let x = this.bounds.x; x < this.bounds.x + this.bounds.width; x++) {
        const key = `${x},${y}`;
        this.slots.set(key, new StockpileSlot(x, y, this.bounds.z));
      }
    }
  }

  /**
   * Get slot key from coordinates
   * @private
   */
  _getSlotKey(x, y) {
    return `${x},${y}`;
  }

  /**
   * Check if a position is within bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean}
   */
  containsPosition(x, y) {
    return x >= this.bounds.x &&
           x < this.bounds.x + this.bounds.width &&
           y >= this.bounds.y &&
           y < this.bounds.y + this.bounds.depth;
  }

  /**
   * Check if a resource type is allowed in this stockpile
   * @param {string} resourceType - Resource type to check
   * @returns {boolean}
   */
  acceptsResource(resourceType) {
    if (!this.enabled) return false;

    // Check if all resources are allowed
    if (this.allowedCategories.has(ResourceCategory.ALL)) {
      return true;
    }

    // Check specific resource types
    if (this.allowedResources.has(resourceType)) {
      return true;
    }

    // Check categories
    const category = RESOURCE_CATEGORIES[resourceType];
    if (category && this.allowedCategories.has(category)) {
      return true;
    }

    return false;
  }

  /**
   * Get slot at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {StockpileSlot | null}
   */
  getSlot(x, y) {
    const key = this._getSlotKey(x, y);
    return this.slots.get(key) || null;
  }

  /**
   * Find an empty slot for depositing a resource
   * @param {string} resourceType - Resource type
   * @param {string} excludeReservedBy - Exclude slots reserved by others (NPC ID)
   * @returns {StockpileSlot | null}
   */
  findEmptySlot(resourceType, excludeReservedBy = null) {
    if (!this.acceptsResource(resourceType)) return null;

    // First, try to find a slot with the same resource that has space
    for (const slot of this.slots.values()) {
      if (slot.canAccept(resourceType) && !slot.isEmpty()) {
        if (!slot.isReserved() || slot.reservedBy === excludeReservedBy) {
          return slot;
        }
      }
    }

    // Then, try to find a completely empty slot
    for (const slot of this.slots.values()) {
      if (slot.isEmpty()) {
        if (!slot.isReserved() || slot.reservedBy === excludeReservedBy) {
          return slot;
        }
      }
    }

    return null;
  }

  /**
   * Find a slot containing a specific resource for pickup
   * @param {string} resourceType - Resource type to find
   * @param {number} minQuantity - Minimum quantity needed (default 1)
   * @param {string} excludeReservedBy - Exclude slots reserved by others
   * @returns {StockpileSlot | null}
   */
  findResourceSlot(resourceType, minQuantity = 1, excludeReservedBy = null) {
    for (const slot of this.slots.values()) {
      if (slot.resource === resourceType && slot.quantity >= minQuantity) {
        if (!slot.isReserved() || slot.reservedBy === excludeReservedBy) {
          return slot;
        }
      }
    }
    return null;
  }

  /**
   * Get total quantity of a resource in the stockpile
   * @param {string} resourceType - Resource type
   * @returns {number}
   */
  getResourceQuantity(resourceType) {
    let total = 0;
    for (const slot of this.slots.values()) {
      if (slot.resource === resourceType) {
        total += slot.quantity;
      }
    }
    return total;
  }

  /**
   * Get all resources and their quantities
   * @returns {Map<string, number>}
   */
  getAllResources() {
    const resources = new Map();
    for (const slot of this.slots.values()) {
      if (slot.resource) {
        const current = resources.get(slot.resource) || 0;
        resources.set(slot.resource, current + slot.quantity);
      }
    }
    return resources;
  }

  /**
   * Get total available space for a resource
   * @param {string} resourceType - Resource type
   * @returns {number}
   */
  getAvailableSpace(resourceType) {
    if (!this.acceptsResource(resourceType)) return 0;

    let space = 0;
    for (const slot of this.slots.values()) {
      space += slot.getAvailableSpace(resourceType);
    }
    return space;
  }

  /**
   * Reserve a slot for pickup
   * @param {string} resourceType - Resource type to pickup
   * @param {string} npcId - NPC ID making reservation
   * @param {number} quantity - Desired quantity
   * @returns {{slot: StockpileSlot, quantity: number} | null}
   */
  reserveForPickup(resourceType, npcId, quantity = 1) {
    const slot = this.findResourceSlot(resourceType, quantity, npcId);
    if (!slot) return null;

    if (slot.reserve(npcId, 'pickup')) {
      return {
        slot,
        quantity: Math.min(quantity, slot.quantity)
      };
    }

    return null;
  }

  /**
   * Reserve a slot for deposit
   * @param {string} resourceType - Resource type to deposit
   * @param {string} npcId - NPC ID making reservation
   * @param {number} quantity - Quantity to deposit
   * @returns {{slot: StockpileSlot, quantity: number} | null}
   */
  reserveForDeposit(resourceType, npcId, quantity = 1) {
    const slot = this.findEmptySlot(resourceType, npcId);
    if (!slot) return null;

    if (slot.reserve(npcId, 'deposit')) {
      return {
        slot,
        quantity: Math.min(quantity, slot.getAvailableSpace(resourceType))
      };
    }

    return null;
  }

  /**
   * Deposit resources into a slot
   * @param {number} x - Slot X coordinate
   * @param {number} y - Slot Y coordinate
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to deposit
   * @param {string} npcId - NPC ID (for releasing reservation)
   * @returns {number} Amount deposited
   */
  deposit(x, y, resourceType, quantity, npcId = null) {
    const slot = this.getSlot(x, y);
    if (!slot) return 0;

    if (!this.acceptsResource(resourceType)) return 0;

    const deposited = slot.add(resourceType, quantity);

    if (deposited > 0) {
      this.stats.totalDeposits += deposited;
      if (npcId) slot.release(npcId);
    }

    return deposited;
  }

  /**
   * Withdraw resources from a slot
   * @param {number} x - Slot X coordinate
   * @param {number} y - Slot Y coordinate
   * @param {number} quantity - Quantity to withdraw
   * @param {string} npcId - NPC ID (for releasing reservation)
   * @returns {{resource: string, quantity: number} | null}
   */
  withdraw(x, y, quantity, npcId = null) {
    const slot = this.getSlot(x, y);
    if (!slot || slot.isEmpty()) return null;

    const resource = slot.resource;
    const withdrawn = slot.remove(quantity);

    if (withdrawn > 0) {
      this.stats.totalWithdrawals += withdrawn;
      if (npcId) slot.release(npcId);
      return { resource, quantity: withdrawn };
    }

    return null;
  }

  /**
   * Release all reservations for an NPC
   * @param {string} npcId - NPC ID
   * @returns {number} Number of reservations released
   */
  releaseAllReservations(npcId) {
    let released = 0;
    for (const slot of this.slots.values()) {
      if (slot.reservedBy === npcId) {
        slot.release(npcId);
        released++;
      }
    }
    return released;
  }

  /**
   * Clear expired reservations (older than timeout)
   * @param {number} timeoutMs - Reservation timeout in milliseconds
   * @returns {number} Number of reservations cleared
   */
  clearExpiredReservations(timeoutMs = 60000) {
    let cleared = 0;
    const now = Date.now();

    for (const slot of this.slots.values()) {
      if (slot.isReserved() && (now - slot.reservedAt) > timeoutMs) {
        slot.release();
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get stockpile statistics
   * @returns {object}
   */
  getStats() {
    let usedSlots = 0;
    let totalQuantity = 0;
    let reservedSlots = 0;

    for (const slot of this.slots.values()) {
      if (!slot.isEmpty()) {
        usedSlots++;
        totalQuantity += slot.quantity;
      }
      if (slot.isReserved()) {
        reservedSlots++;
      }
    }

    return {
      ...this.stats,
      totalSlots: this.slots.size,
      usedSlots,
      emptySlots: this.slots.size - usedSlots,
      reservedSlots,
      totalQuantity,
      resources: Object.fromEntries(this.getAllResources())
    };
  }

  /**
   * Get center position of stockpile
   * @returns {{x: number, y: number, z: number}}
   */
  getCenter() {
    return {
      x: this.bounds.x + this.bounds.width / 2,
      y: this.bounds.y + this.bounds.depth / 2,
      z: this.bounds.z
    };
  }

  /**
   * Calculate distance from a position to stockpile center
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number}
   */
  distanceFrom(x, y) {
    const center = this.getCenter();
    return Math.sqrt(
      Math.pow(x - center.x, 2) +
      Math.pow(y - center.y, 2)
    );
  }

  /**
   * Export stockpile data
   * @returns {object}
   */
  toJSON() {
    const slotsData = {};
    for (const [key, slot] of this.slots) {
      if (!slot.isEmpty()) {
        slotsData[key] = slot.toJSON();
      }
    }

    return {
      id: this.id,
      name: this.name,
      bounds: this.bounds,
      allowedResources: Array.from(this.allowedResources),
      allowedCategories: Array.from(this.allowedCategories),
      priority: this.priority,
      enabled: this.enabled,
      slots: slotsData,
      stats: this.stats
    };
  }

  /**
   * Import stockpile data
   * @param {object} data
   * @returns {Stockpile}
   */
  static fromJSON(data) {
    const stockpile = new Stockpile({
      id: data.id,
      name: data.name,
      ...data.bounds,
      allowedResources: data.allowedResources,
      allowedCategories: data.allowedCategories,
      priority: data.priority,
      enabled: data.enabled
    });

    // Restore slot data
    if (data.slots) {
      for (const [key, slotData] of Object.entries(data.slots)) {
        const slot = StockpileSlot.fromJSON(slotData);
        stockpile.slots.set(key, slot);
      }
    }

    // Restore stats
    if (data.stats) {
      stockpile.stats = { ...stockpile.stats, ...data.stats };
    }

    return stockpile;
  }
}
