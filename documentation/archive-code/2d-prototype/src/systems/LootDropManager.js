/**
 * LootDropManager.js - Manages loot drops on the ground
 *
 * Features:
 * - Create loot drops at monster death position
 * - Handle gold and item drops
 * - Pickup radius detection
 * - Auto-pickup after delay
 * - Cleanup old drops
 */

import { LootTable } from './LootTable.js';

/**
 * LootDrop class - Represents an item or gold on the ground
 */
export class LootDrop {
  constructor(config) {
    this.id = config.id || crypto.randomUUID();
    this.type = config.type; // 'GOLD' or 'ITEM'
    this.position = config.position; // { x, z }
    this.item = config.item || null; // Item instance
    this.gold = config.gold || 0;
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + (config.lifetime !== undefined ? config.lifetime : 60000); // 60 seconds default
    this.pickupRadius = config.pickupRadius !== undefined ? config.pickupRadius : 2; // tiles
    this.autoPickupDelay = config.autoPickupDelay !== undefined ? config.autoPickupDelay : 1000; // 1 second
    this.canPickup = false;

    // Set canPickup after delay
    setTimeout(() => {
      this.canPickup = true;
    }, this.autoPickupDelay);
  }

  /**
   * Check if drop is expired
   * @returns {boolean}
   */
  isExpired() {
    return Date.now() > this.expiresAt;
  }

  /**
   * Check if player is in pickup range
   * @param {Object} playerPos - Player position { x, z }
   * @returns {boolean}
   */
  isInPickupRange(playerPos) {
    if (!this.canPickup) return false;

    const dx = this.position.x - playerPos.x;
    const dz = this.position.z - playerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return distance <= this.pickupRadius;
  }

  /**
   * Get visual representation data
   * @returns {Object}
   */
  getVisualData() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rarity: this.item ? this.item.rarity : 'COMMON',
      name: this.item ? this.item.name : 'Gold',
      amount: this.gold,
      canPickup: this.canPickup
    };
  }
}

/**
 * LootDropManager - Manages all loot drops in the game
 */
export class LootDropManager {
  constructor() {
    this.lootTable = new LootTable();
    this.drops = [];
    this.pickupRadius = 2; // Default pickup radius in tiles
    // eslint-disable-next-line no-console
    console.log('💰 LootDropManager: Initialized');
  }

  /**
   * Create loot drops from monster death
   * @param {Object} monster - Dead monster
   * @returns {Array<LootDrop>} - Created drops
   */
  createMonsterLoot(monster) {
    const loot = this.lootTable.generateLoot(monster);
    const drops = [];

    // Create gold drop
    if (loot.gold > 0) {
      const goldDrop = new LootDrop({
        type: 'GOLD',
        position: { x: monster.position.x, z: monster.position.z },
        gold: loot.gold
      });
      drops.push(goldDrop);
      this.drops.push(goldDrop);
    }

    // Create item drops (with slight position offset for each)
    loot.items.forEach((item, index) => {
      const offset = this.getDropOffset(index, loot.items.length);
      const itemDrop = new LootDrop({
        type: 'ITEM',
        position: {
          x: monster.position.x + offset.x,
          z: monster.position.z + offset.z
        },
        item: item
      });
      drops.push(itemDrop);
      this.drops.push(itemDrop);
    });

    if (drops.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`💎 ${monster.name} dropped ${loot.gold} gold and ${loot.items.length} items`);
    }

    return drops;
  }

  /**
   * Get position offset for multiple drops
   * @param {number} index - Drop index
   * @param {number} total - Total number of drops
   * @returns {Object} - { x, z } offset
   */
  getDropOffset(index, total) {
    if (total === 1) return { x: 0, z: 0 };

    // Arrange drops in a circle
    const angle = (Math.PI * 2 * index) / total;
    const radius = 1.5;

    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    };
  }

  /**
   * Update all drops (check for pickup, cleanup expired)
   * @param {Object} playerPos - Player position { x, z }
   * @param {Function} onPickup - Callback for successful pickup (drop) => void
   * @returns {Array<LootDrop>} - Picked up drops
   */
  update(playerPos, onPickup) {
    const pickedUp = [];
    // eslint-disable-next-line no-unused-vars
    const now = Date.now();

    // Check for pickups and cleanup
    this.drops = this.drops.filter(drop => {
      // Remove expired drops
      if (drop.isExpired()) {
        // eslint-disable-next-line no-console
        console.log(`⏰ Loot expired: ${drop.type} at (${drop.position.x}, ${drop.position.z})`);
        return false;
      }

      // Check for pickup
      if (drop.isInPickupRange(playerPos)) {
        pickedUp.push(drop);
        if (onPickup) {
          onPickup(drop);
        }
        return false; // Remove from list
      }

      return true; // Keep in list
    });

    return pickedUp;
  }

  /**
   * Get all drops near a position
   * @param {Object} position - Position { x, z }
   * @param {number} radius - Search radius
   * @returns {Array<LootDrop>}
   */
  getDropsNear(position, radius) {
    return this.drops.filter(drop => {
      const dx = drop.position.x - position.x;
      const dz = drop.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance <= radius;
    });
  }

  /**
   * Get all active drops
   * @returns {Array<LootDrop>}
   */
  getAllDrops() {
    return this.drops;
  }

  /**
   * Get visual data for all drops
   * @returns {Array<Object>}
   */
  getAllVisualData() {
    return this.drops.map(drop => drop.getVisualData());
  }

  /**
   * Remove a specific drop
   * @param {string} dropId - Drop ID
   * @returns {boolean} - True if removed
   */
  removeDrop(dropId) {
    const initialLength = this.drops.length;
    this.drops = this.drops.filter(drop => drop.id !== dropId);
    return this.drops.length < initialLength;
  }

  /**
   * Clear all drops
   */
  clearAll() {
    this.drops = [];
    // eslint-disable-next-line no-console
    console.log('🧹 Cleared all loot drops');
  }

  /**
   * Get drop statistics
   * @returns {Object}
   */
  getStats() {
    const totalDrops = this.drops.length;
    const goldDrops = this.drops.filter(d => d.type === 'GOLD').length;
    const itemDrops = this.drops.filter(d => d.type === 'ITEM').length;
    const expiredSoon = this.drops.filter(d => d.expiresAt - Date.now() < 10000).length;

    return {
      total: totalDrops,
      gold: goldDrops,
      items: itemDrops,
      expiringSoon: expiredSoon
    };
  }
}

export default LootDropManager;
