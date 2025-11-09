/**
 * Morale Calculator
 *
 * Calculates town morale based on composite factors.
 *
 * Based on FORMULAS.md section 3: MORALE CALCULATION
 *
 * Formula:
 * townMorale = (happiness × 0.40) + (housing × 0.30) + (food × 0.20) + (expansion × 0.10)
 * Range: -100 to +100
 */

class MoraleCalculator {
  constructor() {
    this.townMorale = 0;
  }

  /**
   * Calculate average NPC happiness factor (-50 to +50)
   */
  calculateHappinessFactor(npcs) {
    if (npcs.length === 0) return 0;

    const totalHappiness = npcs.reduce((sum, npc) => sum + npc.happiness, 0);
    const avgHappiness = totalHappiness / npcs.length;

    // Convert 0-100 happiness to -50 to +50 factor
    return (avgHappiness / 100.0) * 100.0 - 50.0;
  }

  /**
   * Calculate housing utilization factor (-50 to +50)
   * Ideal: 70-85% occupied
   */
  calculateHousingFactor(npcCount, housingCapacity) {
    if (housingCapacity === 0) return -50;

    const occupancy = (npcCount / housingCapacity) * 100.0;

    if (occupancy < 50) {
      return -50; // Too empty
    } else if (occupancy >= 50 && occupancy <= 85) {
      // Linear interpolation from -50 to +50
      return ((occupancy - 50) * (100.0 / 35.0)) - 50;
    } else if (occupancy > 85) {
      // Linear down from +50 to -100
      const overOccupancy = occupancy - 85;
      return 50 - (overOccupancy * (150.0 / 15.0));
    }
  }

  /**
   * Calculate food reserves factor (-50 to +50)
   * Ideal: 3+ days of food
   */
  calculateFoodFactor(foodAvailable, dailyConsumption) {
    if (dailyConsumption === 0) return 50;

    const foodDays = foodAvailable / dailyConsumption;

    if (foodDays < 0.5) {
      return -50; // Starvation imminent
    } else if (foodDays >= 0.5 && foodDays <= 7) {
      // Linear from -50 to +50
      return ((foodDays - 0.5) / 6.5) * 100.0 - 50;
    } else {
      return 50; // Plenty of food
    }
  }

  /**
   * Calculate territory expansion progress factor (0 to +50)
   * Each expansion = +10 morale (capped at +50)
   */
  calculateExpansionFactor(expansionCount) {
    return Math.min(expansionCount * 10.0, 50.0);
  }

  /**
   * Calculate overall town morale
   * Called once per production tick
   */
  calculateTownMorale(npcs, foodAvailable, housingCapacity, expansionCount = 0, npcConsumptionPerMinute = 0.5) {
    if (npcs.length === 0) {
      this.townMorale = 0;
      return 0;
    }

    // Factor 1: Happiness (40% weight)
    const happinessFactor = this.calculateHappinessFactor(npcs);

    // Factor 2: Housing (30% weight)
    const housingFactor = this.calculateHousingFactor(npcs.length, housingCapacity);

    // Factor 3: Food reserves (20% weight)
    const dailyConsumption = npcs.length * npcConsumptionPerMinute * 1440; // minutes per day
    const foodFactor = this.calculateFoodFactor(foodAvailable, dailyConsumption);

    // Factor 4: Expansion progress (10% weight)
    const expansionFactor = this.calculateExpansionFactor(expansionCount);

    // Composite
    const composite = (happinessFactor * 0.40) + (housingFactor * 0.30) + (foodFactor * 0.20) + (expansionFactor * 0.10);

    // Clamp to -100 to +100
    this.townMorale = Math.max(Math.min(composite, 100), -100);

    return this.townMorale;
  }

  /**
   * Get morale multiplier for production (0.9x to 1.1x)
   */
  getMoraleMultiplier() {
    // Morale -100 to +100 = production 0.9x to 1.1x
    return 1.0 + (this.townMorale / 1000.0);
  }

  /**
   * Get current morale state
   */
  getMoraleState() {
    return {
      townMorale: Math.round(this.townMorale),
      productionMultiplier: this.getMoraleMultiplier().toFixed(4),
      state: this.getMoraleDescription()
    };
  }

  /**
   * Describe morale state in words
   */
  getMoraleDescription() {
    if (this.townMorale > 50) return 'Excellent';
    if (this.townMorale > 25) return 'Very Good';
    if (this.townMorale > 0) return 'Good';
    if (this.townMorale > -25) return 'Fair';
    if (this.townMorale > -50) return 'Poor';
    return 'Terrible';
  }
}

module.exports = MoraleCalculator;
