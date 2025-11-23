/**
 * EquipmentManager.js - Equipment and stat aggregation system
 *
 * Features:
 * - Equipment slot management (6 slots + 2 rings)
 * - Stat aggregation from all equipment
 * - Item comparison and upgrade recommendations
 * - Equipment validation
 * - Property effect aggregation
 */

import { Item } from '../entities/Item.js';

/**
 * Equipment slot types
 */
export const EQUIPMENT_SLOTS = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  HELMET: 'helmet',
  BOOTS: 'boots',
  RING1: 'ring1',
  RING2: 'ring2',
  AMULET: 'amulet'
};

/**
 * Get slot name for item type
 */
export function getSlotForItemType(itemType) {
  const mapping = {
    'WEAPON': 'weapon',
    'ARMOR': 'armor',
    'HELMET': 'helmet',
    'BOOTS': 'boots',
    'RING': 'ring1', // Will try ring2 if ring1 occupied
    'AMULET': 'amulet'
  };
  return mapping[itemType] || null;
}

/**
 * EquipmentManager - Manages player equipment and stats
 */
export class EquipmentManager {
  constructor() {
    console.log('⚔️ EquipmentManager: Initialized');
  }

  /**
   * Aggregate stats from all equipment
   * @param {Object} equipment - Equipment object { weapon, armor, etc. }
   * @returns {Object} - Aggregated stats
   */
  aggregateStats(equipment) {
    const stats = {
      damage: 0,
      armor: 0,
      health: 0,
      mana: 0,
      speed: 0,
      critChance: 0,
      critDamage: 0,
      attackSpeed: 0,
      armorPenetration: 0,
      damageReduction: 0,
      healthRegen: 0
    };

    // Aggregate stats from each equipment slot
    Object.values(equipment).forEach(item => {
      if (!item) return;

      // Add base stats
      Object.keys(item.stats || {}).forEach(stat => {
        if (stats.hasOwnProperty(stat)) {
          stats[stat] += item.stats[stat];
        }
      });

      // Add property bonuses
      (item.properties || []).forEach(prop => {
        const statBonus = this.getStatBonusFromProperty(prop);
        if (statBonus) {
          Object.keys(statBonus).forEach(stat => {
            if (stats.hasOwnProperty(stat)) {
              stats[stat] += statBonus[stat];
            }
          });
        }
      });
    });

    return stats;
  }

  /**
   * Get stat bonus from a property
   * @param {Object} property - Item property
   * @returns {Object|null} - Stat bonuses
   */
  getStatBonusFromProperty(property) {
    const bonuses = {};

    switch (property.name) {
      case 'Vitality':
        bonuses.health = property.value;
        break;
      case 'Wisdom':
        bonuses.mana = property.value;
        break;
      case 'Swiftness':
        // Speed is a percentage bonus
        bonuses.speed = property.value;
        break;
      case 'Haste':
        bonuses.attackSpeed = property.value;
        break;
      case 'Critical Strike':
        bonuses.critChance = property.value;
        break;
      case 'Critical Power':
        bonuses.critDamage = property.value;
        break;
      case 'Penetration':
        bonuses.armorPenetration = property.value;
        break;
      case 'Fortitude':
        bonuses.damageReduction = property.value;
        break;
      case 'Regeneration':
        bonuses.healthRegen = property.value;
        break;
      // Properties like Lifesteal, Thorns, Gold Find are handled in combat/loot systems
      default:
        return null;
    }

    return Object.keys(bonuses).length > 0 ? bonuses : null;
  }

  /**
   * Get all special properties from equipment
   * @param {Object} equipment - Equipment object
   * @returns {Array} - All properties with their values
   */
  getSpecialProperties(equipment) {
    const properties = {};

    Object.values(equipment).forEach(item => {
      if (!item) return;

      (item.properties || []).forEach(prop => {
        if (!properties[prop.name]) {
          properties[prop.name] = 0;
        }
        properties[prop.name] += prop.value;
      });
    });

    return Object.entries(properties).map(([name, value]) => ({
      name,
      value
    }));
  }

  /**
   * Check if item is an upgrade for a slot
   * @param {Item} newItem - New item
   * @param {Item|null} currentItem - Currently equipped item
   * @param {Object} equipment - All current equipment
   * @returns {Object} - { isUpgrade: boolean, statDiff: Object }
   */
  isUpgrade(newItem, currentItem, equipment) {
    if (!newItem) return { isUpgrade: false, statDiff: {} };
    if (!currentItem) return { isUpgrade: true, statDiff: this.getItemStats(newItem) };

    // Calculate current total stats
    const currentStats = this.aggregateStats(equipment);

    // Calculate stats with new item
    const slot = this.getSlotForItem(newItem, equipment);
    const newEquipment = { ...equipment, [slot]: newItem };
    const newStats = this.aggregateStats(newEquipment);

    // Calculate difference
    const statDiff = {};
    Object.keys(newStats).forEach(stat => {
      const diff = newStats[stat] - currentStats[stat];
      if (diff !== 0) {
        statDiff[stat] = diff;
      }
    });

    // Determine if it's an upgrade (sum of positive changes > sum of negative changes)
    const positiveSum = Object.values(statDiff).filter(v => v > 0).reduce((sum, v) => sum + v, 0);
    const negativeSum = Math.abs(Object.values(statDiff).filter(v => v < 0).reduce((sum, v) => sum + v, 0));
    const isUpgrade = positiveSum > negativeSum ||
                     (positiveSum === negativeSum && newItem.rarity > currentItem.rarity);

    return { isUpgrade, statDiff };
  }

  /**
   * Get slot for an item
   * @param {Item} item - Item to equip
   * @param {Object} equipment - Current equipment
   * @returns {string|null} - Slot name
   */
  getSlotForItem(item, equipment) {
    if (!item) return null;

    // Special handling for rings
    if (item.type === 'RING') {
      // Try ring1 first, then ring2
      if (!equipment.ring1) return 'ring1';
      if (!equipment.ring2) return 'ring2';
      // Both occupied, default to ring1
      return 'ring1';
    }

    return getSlotForItemType(item.type);
  }

  /**
   * Get all stats from a single item (including properties)
   * @param {Item} item - Item
   * @returns {Object} - Stats object
   */
  getItemStats(item) {
    const stats = { ...item.stats };

    (item.properties || []).forEach(prop => {
      const statBonus = this.getStatBonusFromProperty(prop);
      if (statBonus) {
        Object.keys(statBonus).forEach(stat => {
          if (!stats[stat]) stats[stat] = 0;
          stats[stat] += statBonus[stat];
        });
      }
    });

    return stats;
  }

  /**
   * Validate equipment configuration
   * @param {Object} equipment - Equipment object
   * @returns {Array<string>} - Array of validation errors (empty if valid)
   */
  validateEquipment(equipment) {
    const errors = [];

    Object.entries(equipment).forEach(([slot, item]) => {
      if (!item) return;

      // Check if item is in correct slot
      if (slot.startsWith('ring')) {
        if (item.type !== 'RING') {
          errors.push(`Invalid item type ${item.type} in ${slot}`);
        }
      } else {
        const expectedSlot = getSlotForItemType(item.type);
        if (expectedSlot !== slot) {
          errors.push(`Item type ${item.type} should be in ${expectedSlot}, not ${slot}`);
        }
      }
    });

    return errors;
  }

  /**
   * Get power level (sum of all stat values)
   * @param {Object} equipment - Equipment object
   * @returns {number} - Total power level
   */
  getPowerLevel(equipment) {
    const stats = this.aggregateStats(equipment);
    return Object.values(stats).reduce((sum, value) => sum + value, 0);
  }

  /**
   * Get equipment summary
   * @param {Object} equipment - Equipment object
   * @returns {Object} - Summary with counts and totals
   */
  getSummary(equipment) {
    const equippedCount = Object.values(equipment).filter(item => item !== null).length;
    const totalSlots = Object.keys(equipment).length;
    const stats = this.aggregateStats(equipment);
    const powerLevel = this.getPowerLevel(equipment);
    const specialProps = this.getSpecialProperties(equipment);

    return {
      equippedCount,
      totalSlots,
      emptySlots: totalSlots - equippedCount,
      stats,
      powerLevel,
      specialProperties: specialProps
    };
  }
}

export default EquipmentManager;
