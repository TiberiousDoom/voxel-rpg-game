/**
 * Item.js - Represents equipment and loot items
 *
 * Item types:
 * - WEAPON: Swords, axes, bows
 * - ARMOR: Chest armor
 * - HELMET: Head armor
 * - BOOTS: Foot armor
 * - RING: Accessory (2 slots)
 * - AMULET: Accessory
 *
 * Rarities:
 * - COMMON: White
 * - UNCOMMON: Green
 * - RARE: Blue
 * - EPIC: Purple
 * - LEGENDARY: Orange
 */

/**
 * Item class - Represents a piece of equipment or loot
 */
export class Item {
  /**
   * Create an item
   * @param {Object} config - Item configuration
   * @param {string} config.name - Item name
   * @param {string} config.type - Item type (WEAPON, ARMOR, etc.)
   * @param {string} config.rarity - Item rarity (COMMON, UNCOMMON, etc.)
   * @param {number} config.level - Item level
   * @param {Object} config.stats - Item stats (damage, armor, etc.)
   * @param {Array} config.properties - Special properties
   * @param {string} config.iconPath - Path to icon asset
   * @param {number} config.sellValue - Vendor sell value
   */
  constructor(config = {}) {
    this.id = config.id || crypto.randomUUID();
    this.name = config.name || 'Unknown Item';
    this.type = config.type || 'WEAPON';
    this.rarity = config.rarity || 'COMMON';
    this.level = config.level || 1;
    this.stats = config.stats || {};
    this.properties = config.properties || [];
    this.iconPath = config.iconPath || null;
    this.sellValue = config.sellValue || 0;

    // Metadata
    this.createdAt = config.createdAt || Date.now();
  }

  /**
   * Get primary stat for this item type
   * @returns {number} - Primary stat value
   */
  getPrimaryStat() {
    switch (this.type) {
      case 'WEAPON':
        return this.stats.damage || 0;
      case 'ARMOR':
      case 'HELMET':
      case 'BOOTS':
        return this.stats.armor || 0;
      case 'RING':
      case 'AMULET':
        return this.stats.health || 0;
      default:
        return 0;
    }
  }

  /**
   * Get all stats as an array
   * @returns {Array<{stat: string, value: number}>}
   */
  getAllStats() {
    return Object.entries(this.stats).map(([stat, value]) => ({
      stat,
      value
    }));
  }

  /**
   * Check if item has a specific property
   * @param {string} propertyName - Property name to check
   * @returns {boolean}
   */
  hasProperty(propertyName) {
    return this.properties.some(prop => prop.name === propertyName);
  }

  /**
   * Get property value by name
   * @param {string} propertyName - Property name
   * @returns {number|null} - Property value or null
   */
  getPropertyValue(propertyName) {
    const property = this.properties.find(prop => prop.name === propertyName);
    return property ? property.value : null;
  }

  /**
   * Compare this item with another for upgrade decision
   * @param {Item} otherItem - Item to compare with
   * @returns {number} - Positive if this is better, negative if other is better
   */
  compareWith(otherItem) {
    if (!otherItem) return 1; // Always better than nothing

    // Different types can't be compared
    if (this.type !== otherItem.type) return 0;

    // Compare primary stats
    const thisPrimary = this.getPrimaryStat();
    const otherPrimary = otherItem.getPrimaryStat();

    return thisPrimary - otherPrimary;
  }

  /**
   * Serialize item to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      rarity: this.rarity,
      level: this.level,
      stats: { ...this.stats },
      properties: [...this.properties],
      iconPath: this.iconPath,
      sellValue: this.sellValue,
      createdAt: this.createdAt
    };
  }

  /**
   * Create item from JSON
   * @param {Object} json - JSON object
   * @returns {Item}
   */
  static fromJSON(json) {
    return new Item(json);
  }

  /**
   * Get rarity color code
   * @returns {string} - Hex color code
   */
  getRarityColor() {
    const colors = {
      COMMON: '#ffffff',
      UNCOMMON: '#00ff00',
      RARE: '#0088ff',
      EPIC: '#aa00ff',
      LEGENDARY: '#ff8800'
    };
    return colors[this.rarity] || colors.COMMON;
  }

  /**
   * Get item description for tooltip
   * @returns {string}
   */
  getDescription() {
    const lines = [];

    // Name and level
    lines.push(`${this.name} (Level ${this.level})`);
    lines.push(`${this.rarity} ${this.type}`);
    lines.push('');

    // Stats
    if (Object.keys(this.stats).length > 0) {
      Object.entries(this.stats).forEach(([stat, value]) => {
        lines.push(`+${value} ${stat}`);
      });
      lines.push('');
    }

    // Properties
    if (this.properties.length > 0) {
      this.properties.forEach(prop => {
        const desc = prop.description.replace('{value}', prop.value);
        lines.push(desc);
      });
      lines.push('');
    }

    // Sell value
    lines.push(`Sell Value: ${this.sellValue} gold`);

    return lines.join('\n');
  }
}

export default Item;
