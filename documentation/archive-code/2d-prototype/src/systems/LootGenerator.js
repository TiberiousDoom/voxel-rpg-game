/**
 * LootGenerator.js - Procedural loot generation system
 *
 * Features:
 * - Rarity-based item generation
 * - Level-appropriate stat scaling
 * - Random property assignment
 * - Weighted template selection
 * - Item name generation
 */

import { Item } from '../entities/Item.js';
import RARITY_CONFIG from '../config/loot/rarity-config.json';
import ITEM_PROPERTIES from '../config/loot/item-properties.json';
import ITEM_TEMPLATES from '../config/loot/item-templates.json';

/**
 * LootGenerator - Generates procedural loot items
 */
export class LootGenerator {
  constructor() {
    // eslint-disable-next-line no-console
    console.log('🎲 LootGenerator: Initialized');
  }

  /**
   * Generate a random item
   * @param {string} itemType - Item type (WEAPON, ARMOR, etc.)
   * @param {number} level - Item level
   * @param {Object} options - Generation options
   * @param {number} options.rarityBonus - Bonus to rarity roll (0-1)
   * @param {string} options.forceRarity - Force specific rarity
   * @returns {Item}
   */
  generateItem(itemType, level, options = {}) {
    // Roll rarity
    const rarity = options.forceRarity || this.rollRarity(options.rarityBonus || 0);
    const rarityConfig = RARITY_CONFIG[rarity];

    // Select template
    const template = this.selectTemplate(itemType);
    if (!template) {
      console.warn(`⚠️ No template found for type: ${itemType}`);
      return null;
    }

    // Create item
    const item = new Item({
      name: template.name,
      type: itemType,
      rarity: rarity,
      level: level,
      stats: {},
      properties: [],
      iconPath: template.iconPath,
      sellValue: 0
    });

    // Calculate stats
    Object.keys(template.baseStats).forEach(stat => {
      const baseValue = template.baseStats[stat];
      const levelScaling = baseValue * (level * 0.1);
      const rarityScaling = rarityConfig.statMultiplier;
      item.stats[stat] = Math.floor((baseValue + levelScaling) * rarityScaling);
    });

    // Add properties
    const [minProps, maxProps] = rarityConfig.propertyCount;
    const targetPropCount = this.randomInt(minProps, maxProps);

    // Try to add unique properties, with retry limit
    let attempts = 0;
    const maxAttempts = targetPropCount * 3; // Allow multiple attempts per property

    while (item.properties.length < targetPropCount && attempts < maxAttempts) {
      const property = this.rollRandomProperty(itemType);
      if (property && !item.hasProperty(property.name)) {
        item.properties.push(property);
      }
      attempts++;
    }

    // Generate enhanced name
    item.name = this.generateItemName(item, template);

    // Calculate sell value
    item.sellValue = this.calculateSellValue(item, rarityConfig);

    return item;
  }

  /**
   * Roll item rarity based on drop chances
   * @param {number} rarityBonus - Bonus to rarity roll (0-1)
   * @returns {string} - Rarity name
   */
  rollRarity(rarityBonus = 0) {
    let roll = Math.random() - rarityBonus;
    roll = Math.max(0, Math.min(1, roll)); // Clamp to 0-1

    let cumulative = 0;
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

    for (const rarity of rarities) {
      cumulative += RARITY_CONFIG[rarity].dropChance;
      if (roll <= cumulative) {
        return rarity;
      }
    }

    return 'COMMON';
  }

  /**
   * Select a random template for item type
   * @param {string} itemType - Item type
   * @returns {Object} - Template object
   */
  selectTemplate(itemType) {
    const templates = ITEM_TEMPLATES[itemType];
    if (!templates) return null;

    const templateKeys = Object.keys(templates);
    if (templateKeys.length === 0) return null;

    const randomKey = templateKeys[Math.floor(Math.random() * templateKeys.length)];
    return templates[randomKey];
  }

  /**
   * Roll a random property for item type
   * @param {string} itemType - Item type
   * @returns {Object|null} - Property object or null
   */
  rollRandomProperty(itemType) {
    // Get applicable properties for this item type
    const applicableProps = Object.entries(ITEM_PROPERTIES)
      .filter(([key, prop]) => prop.applicableTo.includes(itemType))
      .map(([key, prop]) => ({ key, ...prop }));

    if (applicableProps.length === 0) return null;

    // Select random property
    const property = applicableProps[Math.floor(Math.random() * applicableProps.length)];

    // Roll value
    const [minValue, maxValue] = property.valueRange;
    const value = this.randomInt(minValue, maxValue);

    return {
      name: property.name,
      description: property.description,
      value: value,
      format: property.format
    };
  }

  /**
   * Generate enhanced item name
   * @param {Item} item - Item object
   * @param {Object} template - Item template
   * @returns {string} - Enhanced name
   */
  generateItemName(item, template) {
    const prefixes = {
      COMMON: [],
      UNCOMMON: ['Fine', 'Quality', 'Sturdy'],
      RARE: ['Superior', 'Exceptional', 'Masterwork'],
      EPIC: ['Grand', 'Exquisite', 'Legendary'],
      LEGENDARY: ['Ancient', 'Mythical', 'Divine', 'Eternal']
    };

    const suffixes = {
      WEAPON: ['of Power', 'of Slaying', 'of the Warrior'],
      ARMOR: ['of Protection', 'of the Guardian', 'of Fortitude'],
      HELMET: ['of Wisdom', 'of the Mind', 'of Insight'],
      BOOTS: ['of Swiftness', 'of the Wind', 'of Agility'],
      RING: ['of Strength', 'of Might', 'of the Champion'],
      AMULET: ['of Life', 'of the Ancients', 'of Eternity']
    };

    let name = template.name;

    // Add prefix for higher rarities
    const rarityPrefixes = prefixes[item.rarity];
    if (rarityPrefixes && rarityPrefixes.length > 0) {
      const prefix = rarityPrefixes[Math.floor(Math.random() * rarityPrefixes.length)];
      name = `${prefix} ${name}`;
    }

    // Add suffix for epic+ items
    if (item.rarity === 'EPIC' || item.rarity === 'LEGENDARY') {
      const typeSuffixes = suffixes[item.type];
      if (typeSuffixes && typeSuffixes.length > 0) {
        const suffix = typeSuffixes[Math.floor(Math.random() * typeSuffixes.length)];
        name = `${name} ${suffix}`;
      }
    }

    // Add level indicator
    if (item.level > 1) {
      name = `${name} (Lv${item.level})`;
    }

    return name;
  }

  /**
   * Calculate item sell value
   * @param {Item} item - Item object
   * @param {Object} rarityConfig - Rarity configuration
   * @returns {number} - Sell value in gold
   */
  calculateSellValue(item, rarityConfig) {
    // Base value from level
    let value = item.level * 10;

    // Multiply by rarity
    value *= rarityConfig.sellMultiplier;

    // Add value for stats
    const statValue = Object.values(item.stats).reduce((sum, v) => sum + v, 0);
    value += statValue * 2;

    // Add value for properties
    value += item.properties.length * 20;

    return Math.floor(value);
  }

  /**
   * Generate multiple items (for testing/debugging)
   * @param {string} itemType - Item type
   * @param {number} level - Item level
   * @param {number} count - Number of items
   * @returns {Array<Item>}
   */
  generateMultiple(itemType, level, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const item = this.generateItem(itemType, level);
      if (item) {
        items.push(item);
      }
    }
    return items;
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

export default LootGenerator;
