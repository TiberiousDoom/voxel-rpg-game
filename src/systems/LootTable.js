/**
 * LootTable.js - Monster loot drop system
 *
 * Features:
 * - Monster-specific loot tables
 * - Gold rewards
 * - Weighted item type selection
 * - Rarity bonuses for higher-level monsters
 * - Elite/Boss modifier support
 */

import { LootGenerator } from './LootGenerator.js';
import LOOT_TABLES from '../config/loot/monster-loot-tables.json';

/**
 * LootTable - Manages loot drops from monsters
 */
export class LootTable {
  constructor() {
    this.lootGenerator = new LootGenerator();
    console.log('💎 LootTable: Initialized');
  }

  /**
   * Generate loot drops for a dead monster
   * @param {Object} monster - Monster that died
   * @returns {Object} - { gold: number, items: Array<Item> }
   */
  generateLoot(monster) {
    const lootTable = LOOT_TABLES[monster.type];
    if (!lootTable) {
      console.warn(`⚠️ No loot table for monster type: ${monster.type}`);
      return { gold: 0, items: [] };
    }

    // Apply elite/boss modifiers
    let modifiedTable = { ...lootTable };
    if (monster.modifier === 'ELITE' && LOOT_TABLES.ELITE) {
      modifiedTable = this.applyModifier(modifiedTable, LOOT_TABLES.ELITE);
    } else if (monster.isBoss && LOOT_TABLES.BOSS) {
      modifiedTable = this.applyModifier(modifiedTable, LOOT_TABLES.BOSS);
    }

    // Generate gold
    const gold = this.generateGold(modifiedTable, monster.level);

    // Generate items
    const items = this.generateItems(modifiedTable, monster.level);

    return { gold, items };
  }

  /**
   * Apply modifier to loot table
   * @param {Object} baseTable - Base loot table
   * @param {Object} modifier - Modifier configuration
   * @returns {Object} - Modified loot table
   */
  applyModifier(baseTable, modifier) {
    return {
      ...baseTable,
      goldReward: baseTable.goldReward ? [
        Math.floor(baseTable.goldReward[0] * (modifier.goldMultiplier || 1)),
        Math.floor(baseTable.goldReward[1] * (modifier.goldMultiplier || 1))
      ] : baseTable.goldReward,
      lootChance: Math.min(1.0, (baseTable.lootChance || 0) * 1.5),
      rarityBonus: (baseTable.rarityBonus || 0) + (modifier.rarityBonus || 0),
      guaranteedDrops: modifier.guaranteedDrops || 0
    };
  }

  /**
   * Generate gold reward
   * @param {Object} lootTable - Loot table configuration
   * @param {number} level - Monster level
   * @returns {number} - Gold amount
   */
  generateGold(lootTable, level) {
    if (!lootTable.goldReward) return 0;

    const [min, max] = lootTable.goldReward;
    const baseGold = this.randomInt(min, max);

    // Scale with level
    const levelBonus = Math.floor(baseGold * (level * 0.1));

    return baseGold + levelBonus;
  }

  /**
   * Generate item drops
   * @param {Object} lootTable - Loot table configuration
   * @param {number} level - Monster level
   * @returns {Array<Item>} - Dropped items
   */
  generateItems(lootTable, level) {
    const items = [];

    // Guaranteed drops
    const guaranteedDrops = lootTable.guaranteedDrops || 0;
    for (let i = 0; i < guaranteedDrops; i++) {
      const item = this.generateSingleItem(lootTable, level);
      if (item) {
        items.push(item);
      }
    }

    // Random drops
    if (Math.random() < (lootTable.lootChance || 0)) {
      const item = this.generateSingleItem(lootTable, level);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Generate a single item from loot table
   * @param {Object} lootTable - Loot table configuration
   * @param {number} level - Monster level
   * @returns {Item|null} - Generated item
   */
  generateSingleItem(lootTable, level) {
    if (!lootTable.itemTypes || lootTable.itemTypes.length === 0) {
      return null;
    }

    // Select item type using weighted random
    const selectedType = this.selectItemType(lootTable.itemTypes);
    if (!selectedType) return null;

    // Calculate total rarity bonus
    const rarityBonus = (lootTable.rarityBonus || 0) + (selectedType.rarityBonus || 0);

    // Generate item
    return this.lootGenerator.generateItem(selectedType.type, level, { rarityBonus });
  }

  /**
   * Select item type using weighted random
   * @param {Array} itemTypes - Array of item type configurations
   * @returns {Object|null} - Selected item type
   */
  selectItemType(itemTypes) {
    if (itemTypes.length === 0) return null;

    const totalWeight = itemTypes.reduce((sum, type) => sum + type.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const itemType of itemTypes) {
      roll -= itemType.weight;
      if (roll <= 0) {
        return itemType;
      }
    }

    return itemTypes[0]; // Fallback
  }

  /**
   * Get random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export default LootTable;
