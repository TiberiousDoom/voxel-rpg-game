/**
 * FloatingTextManager.js
 * Manages floating text animations (resource gains, damage numbers, etc.)
 *
 * Phase 3A: Interactive Props & Harvesting
 */

/**
 * Floating text instance
 */
class FloatingText {
  constructor(id, x, z, text, options = {}) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.text = text;
    this.startTime = performance.now();
    this.duration = options.duration || 2000; // 2 seconds default
    this.color = options.color || '#FFD700'; // Gold default
    this.fontSize = options.fontSize || 14;
    this.offsetX = options.offsetX || 0;
    this.offsetZ = options.offsetZ || 0;
  }

  /**
   * Get animation lifetime (0-1, where 1 is freshly created)
   */
  getLifetime(currentTime) {
    const elapsed = currentTime - this.startTime;
    return Math.max(0, 1 - (elapsed / this.duration));
  }

  /**
   * Check if animation is complete
   */
  isExpired(currentTime) {
    return this.getLifetime(currentTime) <= 0;
  }
}

/**
 * FloatingTextManager
 * Manages creation, updates, and rendering of floating text
 */
export class FloatingTextManager {
  constructor() {
    this.texts = new Map(); // id -> FloatingText
    this.nextId = 0;
  }

  /**
   * Add floating text
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {string} text - Text to display
   * @param {object} options - Options {color, duration, fontSize, offsetX, offsetZ}
   * @returns {string} Text ID
   */
  addText(x, z, text, options = {}) {
    const id = `text_${this.nextId++}`;
    const floatingText = new FloatingText(id, x, z, text, options);
    this.texts.set(id, floatingText);
    return id;
  }

  /**
   * Add resource gain text
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {string} resourceType - Resource type
   * @param {number} amount - Amount gained
   */
  addResourceGain(x, z, resourceType, amount) {
    const text = `+${amount} ${resourceType}`;
    return this.addText(x, z, text, {
      color: this.getResourceColor(resourceType),
      duration: 2000,
      fontSize: 14,
      offsetX: Math.random() * 10 - 5, // Small random offset
      offsetZ: Math.random() * 10 - 5,
    });
  }

  /**
   * Get color for resource type
   * @private
   */
  getResourceColor(resourceType) {
    const colors = {
      wood: '#8B4513',
      stone: '#708090',
      iron_ore: '#C0C0C0',
      gold_ore: '#FFD700',
      crystal: '#00CED1',
      berry: '#DC143C',
      herb: '#32CD32',
      mushroom: '#DDA0DD',
      seed: '#F0E68C',
    };

    return colors[resourceType] || '#FFD700';
  }

  /**
   * Update all floating texts (call each frame)
   * Removes expired texts
   */
  update() {
    const currentTime = performance.now();
    const expiredIds = [];

    for (const [id, text] of this.texts.entries()) {
      if (text.isExpired(currentTime)) {
        expiredIds.push(id);
      }
    }

    // Remove expired texts
    expiredIds.forEach(id => this.texts.delete(id));
  }

  /**
   * Get all active floating texts
   * @returns {Array} Array of {id, x, z, text, lifetime, color, fontSize, offsetX, offsetZ}
   */
  getActiveTexts() {
    const currentTime = performance.now();
    const activeTexts = [];

    for (const text of this.texts.values()) {
      activeTexts.push({
        id: text.id,
        x: text.x,
        z: text.z,
        text: text.text,
        lifetime: text.getLifetime(currentTime),
        color: text.color,
        fontSize: text.fontSize,
        offsetX: text.offsetX,
        offsetZ: text.offsetZ,
      });
    }

    return activeTexts;
  }

  /**
   * Remove a specific text
   * @param {string} id - Text ID
   */
  removeText(id) {
    this.texts.delete(id);
  }

  /**
   * Clear all floating texts
   */
  clear() {
    this.texts.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeTexts: this.texts.size,
    };
  }
}

export default FloatingTextManager;
