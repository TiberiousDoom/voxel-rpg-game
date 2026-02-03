/**
 * NPCNeed.js - Individual NPC need definition
 *
 * Represents a single need that an NPC must satisfy (food, rest, social, shelter).
 * Needs have values 0-100, decay over time, and affect NPC happiness.
 */

/**
 * Need types
 */
export const NeedType = {
  FOOD: 'FOOD',       // Hunger - decreases 0.5/min (handled by ConsumptionSystem)
  REST: 'REST',       // Fatigue - decreases 1/min while working
  SOCIAL: 'SOCIAL',   // Loneliness - decreases 0.2/min
  SHELTER: 'SHELTER'  // Safety - decreases 0.1/min outside territory
};

/**
 * Need satisfaction levels
 */
export const NeedLevel = {
  CRITICAL: 20,    // Below 20: Critical (emergency)
  LOW: 40,         // Below 40: Low (needs attention)
  MODERATE: 60,    // Below 60: Moderate (satisfactory)
  HIGH: 80,        // Below 80: High (good)
  EXCELLENT: 100   // 80-100: Excellent (very satisfied)
};

/**
 * NPCNeed class
 */
export class NPCNeed {
  /**
   * Create an NPC need
   * @param {string} type - Need type (from NeedType)
   * @param {number} initialValue - Initial value 0-100 (default 50)
   */
  constructor(type, initialValue = 50) {
    this.type = type;
    this.value = Math.max(0, Math.min(100, initialValue));
    this.lastUpdateTime = Date.now();

    // Decay configuration
    this.decayRates = this._getDecayRates(type);

    // Statistics
    this.totalDecay = 0;
    this.totalRestored = 0;
    this.timesBecomeCritical = 0;
  }

  /**
   * Get decay rates for need type
   * @param {string} type - Need type
   * @returns {Object} Decay rates
   */
  _getDecayRates(type) {
    switch (type) {
      case NeedType.FOOD:
        return {
          idle: 0.1 / 60,      // 0.1 per minute = 0.00167 per second
          working: 0.5 / 60    // 0.5 per minute = 0.00833 per second
        };

      case NeedType.REST:
        return {
          idle: -2 / 60,       // Recovers 2 per minute when idle
          working: 1 / 60,     // Decreases 1 per minute when working
          resting: -4 / 60     // Recovers 4 per minute when resting
        };

      case NeedType.SOCIAL:
        return {
          idle: 0.2 / 60,      // 0.2 per minute
          working: 0.2 / 60,   // Same rate when working
          socializing: -10 / 60 // Recovers 10 per minute when socializing
        };

      case NeedType.SHELTER:
        return {
          insideTerritory: 0,         // No decay inside territory
          outsideTerritory: 0.1 / 60  // 0.1 per minute outside territory
        };

      default:
        return { idle: 0, working: 0 };
    }
  }

  /**
   * Update need value based on elapsed time and state
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {Object} state - NPC state (isWorking, isResting, etc.)
   */
  update(deltaTime, state = {}) {
    const deltaSeconds = deltaTime / 1000;
    const decayRate = this._getDecayRate(state);
    const decay = decayRate * deltaSeconds;

    const oldValue = this.value;
    this.value = Math.max(0, Math.min(100, this.value - decay));

    // Track statistics
    if (decay > 0) {
      this.totalDecay += decay;
    } else if (decay < 0) {
      this.totalRestored += Math.abs(decay);
    }

    // Track critical events
    if (oldValue >= NeedLevel.CRITICAL && this.value < NeedLevel.CRITICAL) {
      this.timesBecomeCritical++;
    }

    this.lastUpdateTime = Date.now();
  }

  /**
   * Get decay rate based on NPC state
   * @param {Object} state - NPC state
   * @returns {number} Decay rate per second
   */
  _getDecayRate(state) {
    switch (this.type) {
      case NeedType.FOOD:
        return state.isWorking ? this.decayRates.working : this.decayRates.idle;

      case NeedType.REST:
        if (state.isResting) return this.decayRates.resting;
        if (state.isWorking) return this.decayRates.working;
        return this.decayRates.idle;

      case NeedType.SOCIAL:
        if (state.isSocializing) return this.decayRates.socializing;
        return this.decayRates.idle;

      case NeedType.SHELTER:
        return state.isInsideTerritory ?
          this.decayRates.insideTerritory :
          this.decayRates.outsideTerritory;

      default:
        return 0;
    }
  }

  /**
   * Satisfy the need (add value)
   * @param {number} amount - Amount to add
   */
  satisfy(amount) {
    const oldValue = this.value;
    this.value = Math.min(100, this.value + amount);
    this.totalRestored += (this.value - oldValue);
  }

  /**
   * Get need satisfaction level
   * @returns {string} Satisfaction level
   */
  getLevel() {
    if (this.value < NeedLevel.CRITICAL) return 'CRITICAL';
    if (this.value < NeedLevel.LOW) return 'LOW';
    if (this.value < NeedLevel.MODERATE) return 'MODERATE';
    if (this.value < NeedLevel.HIGH) return 'HIGH';
    return 'EXCELLENT';
  }

  /**
   * Check if need is critical
   * @returns {boolean} True if critical
   */
  isCritical() {
    return this.value < NeedLevel.CRITICAL;
  }

  /**
   * Check if need is low
   * @returns {boolean} True if low
   */
  isLow() {
    return this.value < NeedLevel.LOW;
  }

  /**
   * Check if need is satisfied (above moderate)
   * @returns {boolean} True if satisfied
   */
  isSatisfied() {
    return this.value >= NeedLevel.MODERATE;
  }

  /**
   * Get happiness impact from this need
   * @returns {number} Happiness modifier per hour
   */
  getHappinessImpact() {
    if (this.value >= NeedLevel.MODERATE) {
      // All needs above 60: +5 happiness/hour
      return 5;
    } else if (this.value < NeedLevel.CRITICAL) {
      // Need below 20: -10 happiness/hour (critical)
      return -10;
    } else if (this.value < NeedLevel.LOW) {
      // Need below 40: -3 happiness/hour
      return -3;
    }

    return 0;
  }

  /**
   * Get need summary
   * @returns {Object} Need summary
   */
  getSummary() {
    return {
      type: this.type,
      value: Math.round(this.value * 10) / 10,
      level: this.getLevel(),
      isCritical: this.isCritical(),
      isLow: this.isLow(),
      isSatisfied: this.isSatisfied(),
      happinessImpact: this.getHappinessImpact(),
      statistics: {
        totalDecay: Math.round(this.totalDecay * 10) / 10,
        totalRestored: Math.round(this.totalRestored * 10) / 10,
        timesBecomeCritical: this.timesBecomeCritical
      }
    };
  }

  /**
   * Reset need to initial value
   * @param {number} value - Value to reset to (default 50)
   */
  reset(value = 50) {
    this.value = Math.max(0, Math.min(100, value));
    this.totalDecay = 0;
    this.totalRestored = 0;
    this.timesBecomeCritical = 0;
    this.lastUpdateTime = Date.now();
  }
}

export default NPCNeed;
