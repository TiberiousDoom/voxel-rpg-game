/**
 * SeededRandom.js - Deterministic random number generator
 *
 * Uses Mulberry32 algorithm for reproducible random sequences.
 * Same seed always produces same sequence of random numbers.
 */

class SeededRandom {
  /**
   * Create a seeded random number generator
   * @param {number} seed - Initial seed value
   */
  constructor(seed) {
    this.initialSeed = seed;
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   * @returns {number} Random float [0, 1)
   */
  next() {
    // Mulberry32 algorithm
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in range [min, max] (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range [min, max)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random float
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean
   * @param {number} probability - Probability of true (0-1), default 0.5
   * @returns {boolean}
   */
  nextBool(probability = 0.5) {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   * @param {Array} array - Array to pick from
   * @returns {*} Random element or undefined if empty
   */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Same array, shuffled
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate random point in 2D area
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   * @returns {Object} {x, y}
   */
  nextPoint(minX, maxX, minY, maxY) {
    return {
      x: this.nextFloat(minX, maxX),
      y: this.nextFloat(minY, maxY)
    };
  }

  /**
   * Generate random integer point in 2D grid
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   * @returns {Object} {x, y}
   */
  nextGridPoint(minX, maxX, minY, maxY) {
    return {
      x: this.nextInt(minX, maxX),
      y: this.nextInt(minY, maxY)
    };
  }

  /**
   * Reset to initial seed
   */
  reset() {
    this.seed = this.initialSeed;
  }

  /**
   * Set new seed
   * @param {number} seed
   */
  setSeed(seed) {
    this.initialSeed = seed;
    this.seed = seed;
  }

  /**
   * Get current state for saving
   * @returns {Object}
   */
  getState() {
    return {
      initialSeed: this.initialSeed,
      seed: this.seed
    };
  }

  /**
   * Restore state
   * @param {Object} state
   */
  setState(state) {
    this.initialSeed = state.initialSeed;
    this.seed = state.seed;
  }
}

export default SeededRandom;
export { SeededRandom };
