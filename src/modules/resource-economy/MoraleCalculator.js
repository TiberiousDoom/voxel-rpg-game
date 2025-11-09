/**
 * MoraleCalculator.js - Town morale calculation system
 *
 * Calculates composite town morale from four factors:
 * - Happiness (40% weight) - average NPC happiness
 * - Housing (30% weight) - housing utilization ratio
 * - Food reserves (20% weight) - days of food in storage
 * - Expansion (10% weight) - territory expansion progress
 *
 * Morale range: -100 to +100
 * Morale multiplier for production: 0.9x to 1.1x
 *
 * Based on FORMULAS.md section 3: MORALE CALCULATION
 */

class MoraleCalculator {
  /**
   * Initialize morale calculator
   */
  constructor() {
    this.townMorale = 0;
    this.moraleHistory = [];
  }

  /**
   * Calculate average happiness factor
   * Converts 0-100 happiness to -50 to +50 factor
   *
   * @param {Array<Object>} npcs - Array of NPC objects with .happiness property
   * @returns {number} Happiness factor (-50 to +50)
   */
  calculateHappinessFactor(npcs) {
    if (npcs.length === 0) {
      return 0;
    }

    const totalHappiness = npcs.reduce((sum, npc) => sum + (npc.happiness || 50), 0);
    const avgHappiness = totalHappiness / npcs.length;

    // Convert 0-100 to -50 to +50
    return (avgHappiness / 100.0) * 100.0 - 50.0;
  }

  /**
   * Calculate housing utilization factor
   * Ideal: 70-85% occupied
   * Range: -50 to +50
   *
   * @param {number} npcCount - Number of alive NPCs
   * @param {number} housingCapacity - Total housing slots
   * @returns {number} Housing factor (-50 to +50)
   */
  calculateHousingFactor(npcCount, housingCapacity) {
    if (housingCapacity === 0) {
      return -50; // No housing = bad
    }

    const occupancy = (npcCount / housingCapacity) * 100.0;

    if (occupancy < 50) {
      return -50; // Too empty
    } else if (occupancy >= 50 && occupancy <= 85) {
      // Linear interpolation: at 50% = -50, at 85% = +50
      // slope = 100 / 35 = 2.857
      return ((occupancy - 50) * (100.0 / 35.0)) - 50.0;
    } else if (occupancy > 85) {
      // Overcrowded: linear down from +50
      // at 85% = +50, at 100% = -25 (too crowded is bad)
      const overOccupancy = occupancy - 85;
      return 50.0 - (overOccupancy * (75.0 / 15.0));
    }
  }

  /**
   * Calculate food reserves factor
   * Ideal: 3+ days of food
   * Range: -50 to +50
   *
   * @param {number} foodAvailable - Current food in storage
   * @param {number} npcCount - Number of NPCs
   * @param {number} dailyConsumptionPerNPC - Food/min per NPC
   * @returns {number} Food factor (-50 to +50)
   */
  calculateFoodFactor(foodAvailable, npcCount, dailyConsumptionPerNPC = 0.5) {
    if (npcCount === 0) {
      return 50; // No NPCs = no consumption = fine
    }

    // Convert to daily consumption
    // 0.5 food/min × 1440 min/day = 720 food/day per NPC
    const dailyConsumption = npcCount * dailyConsumptionPerNPC * 1440;

    if (dailyConsumption === 0) {
      return 50;
    }

    const foodDays = foodAvailable / dailyConsumption;

    if (foodDays < 0.5) {
      return -50; // Starvation imminent
    } else if (foodDays >= 0.5 && foodDays <= 7) {
      // Linear: at 0.5 days = -50, at 7 days = +50
      // slope = 100 / 6.5 = 15.38
      return ((foodDays - 0.5) / 6.5) * 100.0 - 50.0;
    } else {
      return 50; // Plenty of food (3+ days)
    }
  }

  /**
   * Calculate territory expansion factor
   * Each expansion = +10 morale (capped at +50)
   * Range: 0 to +50
   *
   * @param {number} expansionCount - Number of territory expansions
   * @returns {number} Expansion factor (0 to +50)
   */
  calculateExpansionFactor(expansionCount = 0) {
    return Math.min(expansionCount * 10.0, 50.0);
  }

  /**
   * Calculate overall town morale
   *
   * Formula:
   * morale = (happiness × 0.40) + (housing × 0.30) + (food × 0.20) + (expansion × 0.10)
   * Clamped to -100 to +100
   *
   * @param {Object} params - {npcs, foodAvailable, housingCapacity, expansionCount}
   * @returns {number} Town morale (-100 to +100)
   */
  calculateTownMorale(params) {
    const {
      npcs = [],
      foodAvailable = 0,
      housingCapacity = 0,
      expansionCount = 0,
      dailyConsumptionPerNPC = 0.5
    } = params;

    if (npcs.length === 0) {
      this.townMorale = 0;
      return 0;
    }

    // Calculate each factor
    const happinessFactor = this.calculateHappinessFactor(npcs);
    const housingFactor = this.calculateHousingFactor(npcs.length, housingCapacity);
    const foodFactor = this.calculateFoodFactor(foodAvailable, npcs.length, dailyConsumptionPerNPC);
    const expansionFactor = this.calculateExpansionFactor(expansionCount);

    // Composite: weighted average
    const composite =
      (happinessFactor * 0.40) +
      (housingFactor * 0.30) +
      (foodFactor * 0.20) +
      (expansionFactor * 0.10);

    // Clamp to -100 to +100
    this.townMorale = Math.max(Math.min(composite, 100), -100);

    // Track history
    this.moraleHistory.push({
      timestamp: new Date().toISOString(),
      morale: this.townMorale,
      factors: {
        happiness: happinessFactor.toFixed(1),
        housing: housingFactor.toFixed(1),
        food: foodFactor.toFixed(1),
        expansion: expansionFactor.toFixed(1)
      }
    });

    return this.townMorale;
  }

  /**
   * Get morale multiplier for production
   * Range: 0.9x to 1.1x
   *
   * -100 morale = 0.9x production
   * 0 morale = 1.0x production
   * +100 morale = 1.1x production
   *
   * @returns {number} Production multiplier
   */
  getMoraleMultiplier() {
    // Morale -100 to +100 maps to multiplier 0.9 to 1.1
    // Formula: 1.0 + (townMorale / 1000.0)
    // -100: 1.0 - 0.1 = 0.9
    // 0: 1.0
    // +100: 1.0 + 0.1 = 1.1
    return 1.0 + (this.townMorale / 1000.0);
  }

  /**
   * Get current morale state
   * @returns {Object} Morale details
   */
  getMoraleState() {
    return {
      townMorale: Math.round(this.townMorale),
      productionMultiplier: this.getMoraleMultiplier().toFixed(4),
      description: this.getMoraleDescription()
    };
  }

  /**
   * Get human-readable morale description
   * @returns {string} Morale state description
   */
  getMoraleDescription() {
    if (this.townMorale > 50) return 'Excellent';
    if (this.townMorale > 25) return 'Very Good';
    if (this.townMorale > 0) return 'Good';
    if (this.townMorale > -25) return 'Fair';
    if (this.townMorale > -50) return 'Poor';
    return 'Terrible';
  }

  /**
   * Get current morale
   * @returns {number} Current town morale
   */
  getCurrentMorale() {
    return this.townMorale;
  }

  /**
   * Get morale history
   * @returns {Array<Object>} History of morale calculations
   */
  getMoraleHistory() {
    return [...this.moraleHistory];
  }

  /**
   * Get morale statistics
   * @returns {Object} Min, max, average morale
   */
  getStatistics() {
    if (this.moraleHistory.length === 0) {
      return {
        current: this.townMorale,
        average: 0,
        min: 0,
        max: 0,
        samples: 0
      };
    }

    const values = this.moraleHistory.map(h => h.morale);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      current: this.townMorale,
      average: (sum / values.length).toFixed(1),
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      samples: values.length
    };
  }

  /**
   * Reset morale calculator
   */
  reset() {
    this.townMorale = 0;
    this.moraleHistory = [];
  }
}

export default MoraleCalculator;
