/**
 * LootIntegration.js - Integration layer between loot systems and game
 *
 * Provides high-level functions to:
 * - Create loot drops when monsters die
 * - Handle loot pickup
 * - Manage equipment with stat aggregation
 * - Update player stats based on equipment
 */

import { LootDropManager } from './LootDropManager';
import { EquipmentManager } from './EquipmentManager';

/**
 * Global loot drop manager instance
 * Manages all loot drops in the game world
 */
export const globalLootDropManager = new LootDropManager();

/**
 * Global equipment manager instance
 * Manages equipment slots and stat aggregation
 */
export const globalEquipmentManager = new EquipmentManager();

/**
 * Create loot drops when a monster dies
 * @param {Monster} monster - The dead monster
 * @param {Function} addLootDropCallback - Callback to add loot to game store
 * @returns {Array<LootDrop>} - Created loot drops
 *
 * @example
 * // In combat system when monster dies:
 * const drops = handleMonsterDeath(deadMonster, (drop) => {
 *   useGameStore.getState().addLootDrop(drop.getVisualData());
 * });
 */
export function handleMonsterDeath(monster, addLootDropCallback) {
  if (!monster || monster.alive) {
    console.warn('handleMonsterDeath called with alive or null monster');
    return [];
  }

  // Create loot drops at monster position
  const drops = globalLootDropManager.createMonsterLoot(monster);

  // Add drops to game store for rendering
  if (addLootDropCallback) {
    drops.forEach(drop => {
      addLootDropCallback(drop.getVisualData());
    });
  }

  console.log(`💎 Created ${drops.length} loot drops for ${monster.name}`);
  return drops;
}

/**
 * Update loot drops and handle pickup
 * Call this in game loop with player position
 * @param {Object} playerPos - Player position {x, z}
 * @param {Function} onPickupCallback - Called when loot is picked up
 * @returns {Array} - Picked up loot
 *
 * @example
 * // In game update loop:
 * updateLootDrops(playerPos, (drop) => {
 *   if (drop.type === 'GOLD') {
 *     useGameStore.getState().addGold(drop.gold);
 *   } else if (drop.type === 'ITEM') {
 *     handleItemPickup(drop.item);
 *   }
 * });
 */
export function updateLootDrops(playerPos, onPickupCallback) {
  return globalLootDropManager.update(playerPos, onPickupCallback);
}

/**
 * Handle item pickup and auto-equip if it's an upgrade
 * @param {Item} item - The picked up item
 * @param {Object} currentEquipment - Current equipment from store
 * @param {Function} equipCallback - Callback to equip item
 * @param {Function} addToInventoryCallback - Callback to add to inventory
 * @returns {Object} - { equipped: boolean, wasUpgrade: boolean, slot: string }
 *
 * @example
 * handleItemPickup(newItem, equipment,
 *   (slot, item) => useGameStore.getState().equipItem(slot, item),
 *   (item) => useGameStore.getState().addItem(item)
 * );
 */
export function handleItemPickup(
  item,
  currentEquipment,
  equipCallback,
  addToInventoryCallback
) {
  // Determine which slot this item goes in
  const slot = globalEquipmentManager.getSlotForItem(item, currentEquipment);
  const currentItem = currentEquipment[slot];

  // Check if it's an upgrade
  const upgradeCheck = globalEquipmentManager.isUpgrade(
    item,
    currentItem,
    currentEquipment
  );

  // Auto-equip if it's an upgrade or slot is empty
  if (upgradeCheck.isUpgrade) {
    // Unequip current item and add to inventory
    if (currentItem) {
      addToInventoryCallback(currentItem);
    }

    // Equip new item
    equipCallback(slot, item);

    console.log(
      `⚔️ Equipped ${item.name} in ${slot} (${upgradeCheck.isUpgrade ? 'UPGRADE' : 'empty slot'})`
    );

    return {
      equipped: true,
      wasUpgrade: !!currentItem,
      slot,
      statDiff: upgradeCheck.statDiff
    };
  } else {
    // Add to inventory instead
    addToInventoryCallback(item);

    console.log(
      `🎒 Added ${item.name} to inventory (not an upgrade)`
    );

    return {
      equipped: false,
      wasUpgrade: false,
      slot: null
    };
  }
}

/**
 * Calculate total stats from all equipped items
 * @param {Object} equipment - Equipment from store
 * @returns {Object} - Aggregated stats
 *
 * @example
 * const totalStats = calculateEquipmentStats(equipment);
 * // Returns: { damage: 50, armor: 30, health: 100, ... }
 */
export function calculateEquipmentStats(equipment) {
  return globalEquipmentManager.aggregateStats(equipment);
}

/**
 * Get all aggregated properties from equipment
 * @param {Object} equipment - Equipment from store
 * @returns {Array<{name: string, value: number}>} - Aggregated properties
 *
 * @example
 * const properties = getEquipmentProperties(equipment);
 * // Returns: [{ name: 'Lifesteal', value: 15 }, ...]
 */
export function getEquipmentProperties(equipment) {
  return globalEquipmentManager.aggregateProperties(equipment);
}

/**
 * Get equipment power level (sum of all stats)
 * @param {Object} equipment - Equipment from store
 * @returns {number} - Total power level
 *
 * @example
 * const powerLevel = getEquipmentPowerLevel(equipment);
 * // Returns: 500
 */
export function getEquipmentPowerLevel(equipment) {
  return globalEquipmentManager.calculatePowerLevel(equipment);
}

/**
 * Get all active loot drops for rendering
 * @returns {Array} - Visual data for all drops
 *
 * @example
 * const drops = getActiveLootDrops();
 * // Render each drop in the game world
 */
export function getActiveLootDrops() {
  return globalLootDropManager.getAllVisualData();
}

/**
 * Get loot drop statistics
 * @returns {Object} - Stats about loot drops
 *
 * @example
 * const stats = getLootDropStats();
 * // Returns: { total: 5, gold: 2, items: 3, expiring: 1 }
 */
export function getLootDropStats() {
  return globalLootDropManager.getStatistics();
}

/**
 * Clear all loot drops (useful for scene transitions)
 *
 * @example
 * clearAllLootDrops(); // When changing zones/levels
 */
export function clearAllLootDrops() {
  globalLootDropManager.clearAll();
}

/**
 * Enhanced equipment functions for game store integration
 */
export const LootStoreHelpers = {
  /**
   * Equip an item and update player stats
   * @param {Object} store - Zustand store instance (get/set)
   * @param {string} slot - Equipment slot
   * @param {Item} item - Item to equip
   */
  equipItemWithStats(store, slot, item) {
    const { equipment, player } = store;

    // Equip the item
    const newEquipment = { ...equipment, [slot]: item };

    // Calculate new stats
    const equipStats = calculateEquipmentStats(newEquipment);

    // Update player stats with equipment bonuses
    const basePlayer = {
      ...player,
      // Add equipment stats to base stats
      damage: 10 + equipStats.damage, // 10 = base damage
      armor: equipStats.armor,
      health: Math.min(player.health, player.maxHealth + equipStats.health),
      maxHealth: 100 + equipStats.health, // 100 = base maxHealth
      critChance: 5 + equipStats.critChance, // 5 = base critChance
      critDamage: 150 + equipStats.critDamage, // 150 = base critDamage
      speed: 5 + (equipStats.speed || 0), // 5 = base speed
    };

    return {
      equipment: newEquipment,
      player: basePlayer
    };
  },

  /**
   * Unequip an item and recalculate stats
   * @param {Object} store - Zustand store instance
   * @param {string} slot - Equipment slot to clear
   */
  unequipItemWithStats(store, slot) {
    const { equipment, player } = store;

    // Unequip the item
    const newEquipment = { ...equipment, [slot]: null };

    // Recalculate stats without this item
    const equipStats = calculateEquipmentStats(newEquipment);

    // Update player stats
    const basePlayer = {
      ...player,
      damage: 10 + equipStats.damage,
      armor: equipStats.armor,
      maxHealth: 100 + equipStats.health,
      health: Math.min(player.health, 100 + equipStats.health),
      critChance: 5 + equipStats.critChance,
      critDamage: 150 + equipStats.critDamage,
      speed: 5 + (equipStats.speed || 0),
    };

    return {
      equipment: newEquipment,
      player: basePlayer
    };
  }
};

// Export singleton instances for direct access if needed
export { globalLootDropManager as lootDropManager };
export { globalEquipmentManager as equipmentManager };
