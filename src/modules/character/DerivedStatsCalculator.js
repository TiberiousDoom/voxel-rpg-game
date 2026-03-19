/**
 * DerivedStatsCalculator.js - Calculates derived stats from character attributes
 *
 * Formulas documented in AttributeIntegration.test.js (TDD).
 * Each attribute contributes to specific derived stats:
 *   - exploration: movementSpeed, gatherSpeed, rareResourceChance, critChance
 *   - combat: physicalDamage, critChance, attackSpeed
 *   - magic: maxMana, manaRegen
 *   - endurance: maxStamina, healthRegen, damageResistance
 */

const BASE_STATS = {
  maxHealth: 100,
  maxMana: 100,
  maxStamina: 100,
  movementSpeed: 5.0,
  critChance: 5,         // percent
  attackSpeed: 1.0,
  physicalDamage: 0,
  healthRegen: 0.5,
  manaRegen: 1.0,
  damageResistance: 0,
};

class DerivedStatsCalculator {
  /**
   * Apply diminishing returns for attribute values above thresholds.
   * 0-50: 100% effective
   * 51-100: 75% effective
   * 101+: 50% effective
   */
  static applyDiminishingReturns(_type, value) {
    if (value <= 0) return 0;

    let effective = 0;
    if (value <= 50) {
      effective = value;
    } else if (value <= 100) {
      effective = 50 + (value - 50) * 0.75;
    } else {
      effective = 50 + 50 * 0.75 + (value - 100) * 0.50;
    }
    return effective;
  }

  /**
   * Calculate all derived stats from raw attributes.
   */
  static calculate(attributes = {}) {
    const attrs = {};
    for (const key of ['leadership', 'construction', 'exploration', 'combat', 'magic', 'endurance']) {
      attrs[key] = Math.max(0, attributes[key] || 0);
    }

    return {
      // Endurance contributions
      maxHealth: BASE_STATS.maxHealth + attrs.endurance * 15,
      maxStamina: BASE_STATS.maxStamina + attrs.endurance * 5,
      healthRegen: BASE_STATS.healthRegen + attrs.endurance * 0.3,
      damageResistance: attrs.endurance * 0.005,

      // Magic contributions
      maxMana: BASE_STATS.maxMana + attrs.magic * 8,
      manaRegen: BASE_STATS.manaRegen + attrs.magic * 0.5,

      // Exploration contributions
      movementSpeed: BASE_STATS.movementSpeed + attrs.exploration * 0.01,

      // Combat contributions
      physicalDamage: attrs.combat * 1.5,
      critChance: BASE_STATS.critChance + attrs.combat * 0.2 + (attrs.exploration > 10 ? attrs.exploration * 0.1 : 0),
      attackSpeed: BASE_STATS.attackSpeed + attrs.combat * 0.01,
    };
  }

  /**
   * Calculate gathering speed from attributes.
   * Base: 1.0, exploration adds 2% per point.
   */
  static calculateGatherSpeed(attributes = {}) {
    const exploration = Math.max(0, attributes.exploration || 0);
    return 1.0 + exploration * 0.02;
  }

  /**
   * Calculate rare resource find chance from attributes.
   * Base: 0%, exploration adds 1% per point.
   */
  static calculateRareResourceChance(attributes = {}) {
    const exploration = Math.max(0, attributes.exploration || 0);
    return exploration * 0.01;
  }
}

export { DerivedStatsCalculator };
export default DerivedStatsCalculator;
