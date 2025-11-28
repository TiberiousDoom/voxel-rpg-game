/**
 * LootTableSystem.js
 * Manages loot generation from loot tables
 *
 * Phase 3D: Structure Generation
 */

/**
 * Loot tables define what items can spawn and their probabilities
 */
const LOOT_TABLES = {
  ruins_common: {
    items: [
      { type: 'wood', min: 2, max: 5, chance: 0.8 },
      { type: 'stone', min: 1, max: 3, chance: 0.7 },
      { type: 'iron_ore', min: 1, max: 2, chance: 0.3 },
      { type: 'gold', min: 5, max: 15, chance: 0.5 },
    ],
  },

  ruins_rare: {
    items: [
      { type: 'iron_ore', min: 3, max: 6, chance: 0.8 },
      { type: 'gold_ore', min: 1, max: 3, chance: 0.6 },
      { type: 'crystal', min: 1, max: 2, chance: 0.4 },
      { type: 'gold', min: 20, max: 50, chance: 0.9 },
      { type: 'ancient_coin', min: 1, max: 3, chance: 0.3 },
    ],
  },

  dwelling_common: {
    items: [
      { type: 'wood', min: 1, max: 3, chance: 0.6 },
      { type: 'bread', min: 1, max: 2, chance: 0.5 },
      { type: 'gold', min: 1, max: 10, chance: 0.7 },
      { type: 'cloth', min: 1, max: 2, chance: 0.4 },
    ],
  },

  tower_rare: {
    items: [
      { type: 'scroll', min: 1, max: 2, chance: 0.6 },
      { type: 'potion', min: 1, max: 3, chance: 0.7 },
      { type: 'crystal', min: 1, max: 3, chance: 0.5 },
      { type: 'gold', min: 30, max: 70, chance: 0.9 },
      { type: 'magic_artifact', min: 1, max: 1, chance: 0.2 },
    ],
  },

  monument_rare: {
    items: [
      { type: 'crystal', min: 2, max: 5, chance: 0.9 },
      { type: 'ancient_relic', min: 1, max: 1, chance: 0.6 },
      { type: 'gold', min: 50, max: 100, chance: 0.8 },
      { type: 'magic_artifact', min: 1, max: 1, chance: 0.3 },
    ],
  },

  camp_supplies: {
    items: [
      { type: 'wood', min: 5, max: 15, chance: 0.9 },
      { type: 'stone', min: 3, max: 10, chance: 0.8 },
      { type: 'rope', min: 1, max: 3, chance: 0.6 },
      { type: 'bread', min: 1, max: 3, chance: 0.7 },
      { type: 'gold', min: 5, max: 20, chance: 0.5 },
    ],
  },

  camp_tools: {
    items: [
      { type: 'pickaxe', min: 1, max: 1, chance: 0.5 },
      { type: 'axe', min: 1, max: 1, chance: 0.5 },
      { type: 'hammer', min: 1, max: 1, chance: 0.4 },
      { type: 'iron_ore', min: 2, max: 5, chance: 0.7 },
    ],
  },
};

/**
 * LootTableSystem - Generates random loot from tables
 */
export class LootTableSystem {
  constructor() {
    this.lootTables = LOOT_TABLES;
  }

  /**
   * Generate loot from a table
   * @param {string} tableName - Name of loot table
   * @returns {Array} Array of {type, amount} items
   */
  generateLoot(tableName) {
    const table = this.lootTables[tableName];

    if (!table) {
      console.warn(`Loot table '${tableName}' not found`);
      return [];
    }

    const loot = [];

    for (const entry of table.items) {
      // Check if item drops (chance-based)
      if (Math.random() > entry.chance) {
        continue;
      }

      // Generate random amount
      const amount = entry.min === entry.max
        ? entry.min
        : entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));

      if (amount > 0) {
        loot.push({
          type: entry.type,
          amount,
        });
      }
    }

    return loot;
  }

  /**
   * Add or update a loot table
   * @param {string} tableName - Table name
   * @param {object} table - Table data {items: [...]}
   */
  setLootTable(tableName, table) {
    this.lootTables[tableName] = table;
  }

  /**
   * Get loot table by name
   * @param {string} tableName - Table name
   * @returns {object|null}
   */
  getLootTable(tableName) {
    return this.lootTables[tableName] || null;
  }

  /**
   * Get all loot table names
   * @returns {Array<string>}
   */
  getTableNames() {
    return Object.keys(this.lootTables);
  }
}

export default LootTableSystem;
